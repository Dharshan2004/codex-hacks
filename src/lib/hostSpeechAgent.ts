import { z } from "zod";

import {
  buildLinkedProductContext,
  type LinkedProductContext,
} from "@/lib/streamProducerAgent";
import type { LineupItem, Room, SessionMemory } from "@/lib/types";

const DEFAULT_STREAM_PRODUCER_MODEL = "openai:gpt-5.4";

// Classification of a transcribed host-speech segment against linked products.
//   context     -> a useful, plausibly-true product fact worth remembering
//   false_claim -> directly contradicts a linked catalog fact
//   chatter     -> greeting / filler / not a product claim
const classificationSchema = z.enum(["context", "false_claim", "chatter"]);

export const hostSpeechDecisionSchema = z.object({
  classification: classificationSchema,
  productId: z.string().nullable(),
  // For "context": a concise fact to store as session memory.
  memoryText: z.string().nullable(),
  // For "false_claim": a polite, grounded correction for buyer chat.
  correction: z.string().nullable(),
  // Compact host-facing note (no chain-of-thought).
  note: z.string(),
});

export type HostSpeechDecision = z.infer<typeof hostSpeechDecisionSchema>;

const hostSpeechDecisionJsonSchema = {
  type: "object" as const,
  properties: {
    classification: {
      type: "string",
      enum: ["context", "false_claim", "chatter"],
    },
    productId: { anyOf: [{ type: "string" }, { type: "null" }] },
    memoryText: { anyOf: [{ type: "string" }, { type: "null" }] },
    correction: { anyOf: [{ type: "string" }, { type: "null" }] },
    note: { type: "string" },
  },
  required: ["classification", "productId", "memoryText", "correction", "note"],
  additionalProperties: false,
};

export interface HostSpeechAgentInput {
  room: Room;
  transcript: string;
  lineup: LineupItem[];
  sessionMemories: SessionMemory[];
}

export type HostSpeechInvoker = (request: {
  transcript: string;
  context: LinkedProductContext;
}) => Promise<unknown>;

export async function runHostSpeechAgent(
  input: HostSpeechAgentInput,
  options: { invokeAgent?: HostSpeechInvoker } = {},
): Promise<HostSpeechDecision> {
  const context = buildLinkedProductContext(input);
  const raw = await (options.invokeAgent ?? invokeHostSpeechAgent)({
    transcript: input.transcript,
    context,
  });
  return applyHostSpeechGate(raw, context);
}

// Validate the model output and enforce invariants: a false_claim must carry a
// correction; only linked products may be referenced; context must carry a
// memory text or it degrades to chatter (nothing to remember).
export function applyHostSpeechGate(
  raw: unknown,
  context: LinkedProductContext,
): HostSpeechDecision {
  const parsed = hostSpeechDecisionSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      classification: "chatter",
      productId: null,
      memoryText: null,
      correction: null,
      note: "Could not classify host speech.",
    };
  }

  const decision = parsed.data;
  const linkedIds = new Set(context.products.map((p) => p.id));
  const productId =
    decision.productId && linkedIds.has(decision.productId)
      ? decision.productId
      : null;

  if (decision.classification === "false_claim") {
    const correction = decision.correction?.trim();
    if (!correction) {
      // No correction to show -> don't post anything buyer-facing.
      return {
        classification: "chatter",
        productId,
        memoryText: null,
        correction: null,
        note: decision.note.trim() || "Unverifiable host claim.",
      };
    }
    return {
      classification: "false_claim",
      productId,
      memoryText: null,
      correction,
      note: decision.note.trim() || "Host claim contradicts linked facts.",
    };
  }

  if (decision.classification === "context") {
    const memoryText = decision.memoryText?.trim();
    if (!memoryText) {
      return {
        classification: "chatter",
        productId,
        memoryText: null,
        correction: null,
        note: "No concrete fact to remember.",
      };
    }
    return {
      classification: "context",
      productId,
      memoryText,
      correction: null,
      note: decision.note.trim() || "Captured host product context.",
    };
  }

  return {
    classification: "chatter",
    productId: null,
    memoryText: null,
    correction: null,
    note: decision.note.trim() || "Host chatter — no action.",
  };
}

async function invokeHostSpeechAgent({
  transcript,
  context,
}: {
  transcript: string;
  context: LinkedProductContext;
}): Promise<unknown> {
  const [{ createDeepAgent }, { tool, toolStrategy }, { ChatOpenAI }] =
    await Promise.all([
      import("deepagents"),
      import("langchain"),
      import("@langchain/openai"),
    ]);

  const modelName = (
    process.env.STREAM_PRODUCER_MODEL || DEFAULT_STREAM_PRODUCER_MODEL
  ).replace(/^openai:/, "");
  const model = new ChatOpenAI({ model: modelName });

  const lookupLinkedProductContext = tool(
    async () => JSON.stringify(context),
    {
      name: "lookup_linked_product_context",
      description:
        "Return only the products linked to the active stream lineup, with their allowed grounding facts and confirmed session memory.",
      schema: z.object({}),
    },
  );

  const agent = createDeepAgent({
    model,
    tools: [lookupLinkedProductContext],
    responseFormat: toolStrategy(hostSpeechDecisionJsonSchema),
    systemPrompt: [
      "You are the Shopee Live Stream Producer DeepAgent listening to the seller's live speech.",
      "Call lookup_linked_product_context first.",
      "Classify the seller's spoken segment as exactly one of: context, false_claim, or chatter.",
      "context: the seller states a plausible product detail or selling point that is consistent with (or not contradicted by) the linked facts. Set memoryText to a single concise sentence to remember for the rest of the stream.",
      "false_claim: the seller states something that directly contradicts a linked product fact (for example a wrong battery life, wrong price, wrong compatibility, or an unsupported medical/guarantee claim). Set correction to a short, polite, buyer-facing clarification grounded ONLY in linked facts (for example: 'Quick note: per the official specs, battery is up to 30 hours with noise cancelling on.').",
      "chatter: greetings, filler, or anything with no product claim. No memory, no correction.",
      "Set productId to the matched linked product when relevant, else null. Never reference unlinked products.",
      "note must be a short rationale with no chain-of-thought.",
      "Be conservative: only mark false_claim when it clearly contradicts a linked fact, not when the fact is simply absent.",
    ].join(" "),
  });

  const result = await agent.invoke(
    {
      messages: [
        {
          role: "user",
          content: [
            `Room id: ${context.roomId}`,
            `Seller said: ${transcript}`,
            "Return only the structured classification.",
          ].join("\n"),
        },
      ],
    },
    {
      recursionLimit: 12,
      configurable: { thread_id: `host-speech:${context.roomId}` },
    },
  );

  return (result as { structuredResponse?: unknown }).structuredResponse;
}
