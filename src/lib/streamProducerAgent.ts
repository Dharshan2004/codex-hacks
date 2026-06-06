import { z } from "zod";

import type { Comment, LineupItem, Room, SessionMemory } from "@/lib/types";

const AUTO_REPLY_CONFIDENCE_THRESHOLD = 0.8;
const DEFAULT_STREAM_PRODUCER_MODEL = "openai:gpt-5.4";

const actionTypeSchema = z.enum(["auto_reply", "ignore", "escalate", "warn"]);

export const streamProducerDecisionSchema = z.object({
  actionType: actionTypeSchema,
  productId: z.string().nullable(),
  confidence: z.number().min(0).max(1),
  buyerMessage: z.string().nullable(),
  hostSummary: z.string(),
  rationaleLabel: z.string(),
  supportingFactIds: z.array(z.string()).default([]),
});

const streamProducerDecisionJsonSchema = {
  type: "object" as const,
  properties: {
    actionType: {
      type: "string",
      enum: ["auto_reply", "ignore", "escalate", "warn"],
    },
    productId: {
      anyOf: [{ type: "string" }, { type: "null" }],
    },
    confidence: {
      type: "number",
      minimum: 0,
      maximum: 1,
    },
    buyerMessage: {
      anyOf: [{ type: "string" }, { type: "null" }],
    },
    hostSummary: {
      type: "string",
    },
    rationaleLabel: {
      type: "string",
    },
    supportingFactIds: {
      type: "array",
      items: { type: "string" },
    },
  },
  required: [
    "actionType",
    "productId",
    "confidence",
    "buyerMessage",
    "hostSummary",
    "rationaleLabel",
    "supportingFactIds",
  ],
  additionalProperties: false,
};

export type StreamProducerDecision = z.infer<
  typeof streamProducerDecisionSchema
>;
export type StreamProducerActionType = z.infer<typeof actionTypeSchema>;

export interface LinkedProductFact {
  id: string;
  label: string;
  text: string;
  source:
    | "price"
    | "official_spec"
    | "faq"
    | "seller_note"
    | "shipping"
    | "return"
    | "voucher"
    | "promotion"
    | "stock"
    | "variant"
    | "session_memory";
}

export interface LinkedProductContextProduct {
  id: string;
  slug: string;
  name: string;
  brand: string | null;
  category: string | null;
  facts: LinkedProductFact[];
  restrictedClaims: string[];
}

export interface LinkedProductContext {
  roomId: string;
  spotlightProductId: string | null;
  products: LinkedProductContextProduct[];
}

export interface StreamProducerAgentInput {
  room: Room;
  comment: Comment;
  lineup: LineupItem[];
  sessionMemories: SessionMemory[];
}

export interface DeepAgentRunRequest {
  comment: Comment;
  context: LinkedProductContext;
}

export type DeepAgentInvoker = (
  request: DeepAgentRunRequest,
) => Promise<unknown>;

export async function runStreamProducerAgent(
  input: StreamProducerAgentInput,
  options: { invokeDeepAgent?: DeepAgentInvoker } = {},
): Promise<StreamProducerDecision> {
  if (input.comment.sender_role !== "buyer") {
    return ignoredDecision("non_buyer_comment", "Only buyer comments are processed.");
  }

  const context = buildLinkedProductContext(input);
  const rawDecision = await (options.invokeDeepAgent ?? invokeDeepAgents)({
    comment: input.comment,
    context,
  });

  return applyGroundingAndConfidenceGate(rawDecision, context);
}

export function buildLinkedProductContext({
  room,
  lineup,
  sessionMemories,
}: Pick<
  StreamProducerAgentInput,
  "room" | "lineup" | "sessionMemories"
>): LinkedProductContext {
  return {
    roomId: room.id,
    spotlightProductId: room.spotlight_product_id,
    products: lineup.map((item) => {
      const product = item.product;
      return {
        id: product.id,
        slug: product.slug,
        name: product.name,
        brand: product.brand,
        category: product.category,
        facts: [
          priceFact(product),
          ...product.official_specs.map((spec, index) =>
            fact(product.id, "official_spec", index, spec.label, spec.value),
          ),
          ...product.faqs.map((faq, index) =>
            fact(product.id, "faq", index, faq.q, faq.a),
          ),
          ...product.variants.map((variant, index) =>
            fact(
              product.id,
              "variant",
              index,
              `${variant.name} variants`,
              variant.options.join(", "),
            ),
          ),
          stockFact(product.id, product.stock),
          textFact(product.id, "seller_note", "Seller note", product.seller_notes),
          textFact(product.id, "shipping", "Shipping", product.shipping_notes),
          textFact(product.id, "return", "Returns", product.return_notes),
          ...product.vouchers.map((voucher, index) =>
            fact(product.id, "voucher", index, voucher.code, voucher.description),
          ),
          ...product.promotions.map((promotion, index) =>
            fact(
              product.id,
              "promotion",
              index,
              promotion.label,
              promotion.description,
            ),
          ),
          ...sessionMemories
            .filter((memory) => memory.status === "active")
            .map((memory, index) =>
              fact(
                product.id,
                "session_memory",
                index,
                "Confirmed live memory",
                memory.memory_text,
              ),
            ),
        ].filter((item): item is LinkedProductFact => item !== null),
        restrictedClaims: product.restricted_claims,
      };
    }),
  };
}

function applyGroundingAndConfidenceGate(
  rawDecision: unknown,
  context: LinkedProductContext,
): StreamProducerDecision {
  const parsed = streamProducerDecisionSchema.safeParse(rawDecision);
  if (!parsed.success) {
    return ignoredDecision(
      "invalid_agent_output",
      "The Stream Producer DeepAgent did not return a valid structured action.",
    );
  }

  const decision = parsed.data;
  const linkedProductIds = new Set(context.products.map((product) => product.id));
  const linkedFactIds = new Set(
    context.products.flatMap((product) => product.facts.map((fact) => fact.id)),
  );

  if (decision.productId && !linkedProductIds.has(decision.productId)) {
    return ignoredDecision(
      "unlinked_product",
      "The matched product is not linked to this stream lineup.",
    );
  }

  // Escalations must never carry a buyer-facing message: the host answers, and
  // the buyer sees no invented AI answer (issue 006, acceptance criterion 4).
  if (decision.actionType === "escalate") {
    return {
      ...decision,
      productId: decision.productId ?? null,
      buyerMessage: null,
      hostSummary:
        decision.hostSummary.trim() ||
        "Buyer asked a product question that is not covered by linked facts.",
      confidence: clampConfidence(decision.confidence),
    };
  }

  // Policy-risk warnings must never carry a buyer-facing message.
  if (decision.actionType === "warn") {
    return {
      ...decision,
      productId: decision.productId ?? null,
      buyerMessage: null,
      hostSummary:
        decision.hostSummary.trim() ||
        "Buyer comment contains a policy-risk claim.",
      confidence: clampConfidence(decision.confidence),
    };
  }

  if (decision.actionType !== "auto_reply") {
    return {
      ...decision,
      productId: decision.productId ?? null,
      buyerMessage: decision.buyerMessage?.trim() || null,
      confidence: clampConfidence(decision.confidence),
    };
  }

  const supportingFactIds = decision.supportingFactIds.filter((id) =>
    linkedFactIds.has(id),
  );
  if (
    decision.confidence < AUTO_REPLY_CONFIDENCE_THRESHOLD ||
    !decision.productId ||
    !decision.buyerMessage?.trim() ||
    supportingFactIds.length === 0
  ) {
    return ignoredDecision(
      "below_auto_reply_gate",
      "Auto-reply requires a linked product, supporting linked facts, a buyer message, and confidence of at least 0.8.",
    );
  }

  return {
    ...decision,
    buyerMessage: decision.buyerMessage.trim(),
    confidence: clampConfidence(decision.confidence),
    supportingFactIds,
  };
}

async function invokeDeepAgents({
  comment,
  context,
}: DeepAgentRunRequest): Promise<unknown> {
  const [{ createDeepAgent }, { tool, toolStrategy }, { ChatOpenAI }] =
    await Promise.all([
      import("deepagents"),
      import("langchain"),
      import("@langchain/openai"),
    ]);

  const modelName = (
    process.env.STREAM_PRODUCER_MODEL || DEFAULT_STREAM_PRODUCER_MODEL
  ).replace(/^openai:/, "");
  const model = new ChatOpenAI({
    model: modelName,
  });

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
    responseFormat: toolStrategy(streamProducerDecisionJsonSchema),
    systemPrompt: [
      "You are the Shopee Live Stream Producer DeepAgent.",
      "Classify buyer comments and produce one structured action.",
      "Before answering any product question, call lookup_linked_product_context.",
      "Auto-reply only for straightforward questions about one linked product when the answer is directly supported by returned fact ids or confirmed session memory.",
      "Never use facts outside the linked product context. Never invent prices, stock, warranty, compatibility, medical, legal, or guaranteed-result claims.",
      "Escalate when the buyer asks a genuine, appropriate question about a linked product (for example stock, variant, warranty, refund, delivery, or promotion) but the answer is not present in the linked facts or confirmed session memory. For an escalation, set the matched productId when known, give a compact hostSummary naming the missing detail, and set buyerMessage to null. Do not guess the answer.",
      "Warn when the buyer asks for or implies medical, hearing-health, legal, financial, guaranteed-result, fake-discount, refund overpromise, warranty overpromise, or safety claims that the product cannot support. Set actionType to 'warn', rationaleLabel to 'policy_risk:<category>' where category is one of: medical, hearing_health, legal, financial, guaranteed_result, fake_discount, refund_warranty, or safety. Set buyerMessage to null. Set hostSummary to a 1-sentence description of the risk and a suggested safe response for the host.",
      "Ignore spam, social chatter, and questions about products that are not in the linked lineup.",
      "Buyer messages should be concise, friendly, and transparent that the answer is from the AI assistant.",
    ].join(" "),
  });

  const result = await agent.invoke(
    {
      messages: [
        {
          role: "user",
          content: [
            `Room id: ${context.roomId}`,
            `Buyer comment id: ${comment.id}`,
            `Buyer comment: ${comment.body}`,
            "Return only the structured action.",
          ].join("\n"),
        },
      ],
    },
    {
      recursionLimit: 12,
      configurable: {
        thread_id: `stream-producer:${context.roomId}:${comment.id}`,
      },
    },
  );

  return (result as { structuredResponse?: unknown }).structuredResponse;
}

function fact(
  productId: string,
  source: LinkedProductFact["source"],
  index: number,
  label: string,
  text: string,
): LinkedProductFact {
  return {
    id: `${productId}:${source}:${index}`,
    label,
    text,
    source,
  };
}

function textFact(
  productId: string,
  source: LinkedProductFact["source"],
  label: string,
  text: string | null,
): LinkedProductFact | null {
  if (!text?.trim()) return null;
  return {
    id: `${productId}:${source}`,
    label,
    text: text.trim(),
    source,
  };
}

function priceFact(product: {
  id: string;
  currency: string;
  price: number;
  original_price: number | null;
}): LinkedProductFact {
  const symbol =
    product.currency === "SGD"
      ? "S$"
      : product.currency === "USD"
        ? "US$"
        : `${product.currency} `;
  const current = `${symbol}${product.price.toFixed(2)}`;
  const text =
    product.original_price && product.original_price > product.price
      ? `${current} (usual price ${symbol}${product.original_price.toFixed(2)})`
      : current;
  return {
    id: `${product.id}:price`,
    label: "Price",
    text,
    source: "price",
  };
}

function stockFact(
  productId: string,
  stock: Record<string, number>,
): LinkedProductFact | null {
  const entries = Object.entries(stock).filter(([, count]) => Number.isFinite(count));
  if (entries.length === 0) return null;
  return {
    id: `${productId}:stock`,
    label: "Stock",
    text: entries.map(([variant, count]) => `${variant}: ${count}`).join(", "),
    source: "stock",
  };
}

function ignoredDecision(
  rationaleLabel: string,
  hostSummary: string,
): StreamProducerDecision {
  return {
    actionType: "ignore",
    productId: null,
    confidence: 0,
    buyerMessage: null,
    hostSummary,
    rationaleLabel,
    supportingFactIds: [],
  };
}

function clampConfidence(confidence: number): number {
  return Math.max(0, Math.min(1, confidence));
}
