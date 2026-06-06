import { describe, expect, it } from "vitest";

import {
  buildLinkedProductContext,
  runStreamProducerAgent,
} from "@/lib/streamProducerAgent";
import type {
  CatalogProduct,
  Comment,
  LineupItem,
  Room,
  StreamProduct,
} from "@/lib/types";

const now = "2026-06-06T05:00:00.000Z";

function catalogProduct(overrides: Partial<CatalogProduct>): CatalogProduct {
  return {
    id: "product-1",
    slug: "sony-wh-1000xm6",
    name: "Sony WH-1000XM6 Wireless Noise Cancelling Headphones",
    brand: "Sony",
    category: "Headphones",
    currency: "SGD",
    price: 559,
    original_price: 649,
    image_emoji: null,
    official_specs: [],
    variants: [],
    stock: {},
    seller_notes: null,
    shipping_notes: null,
    return_notes: null,
    vouchers: [],
    promotions: [],
    faqs: [],
    restricted_claims: [],
    created_at: now,
    ...overrides,
  };
}

function lineupItem(product: CatalogProduct): LineupItem {
  const link: StreamProduct = {
    id: `lineup-${product.id}`,
    room_id: "room-1",
    product_id: product.id,
    display_order: 0,
    pinned: false,
    created_at: now,
  };
  return { ...link, product };
}

const room: Room = {
  id: "room-1",
  title: "Shopee Live - Tech Drop",
  seller_name: "Demo Seller",
  status: "live",
  buyer_token: "buyer-token",
  video_mode: "camera_fallback",
  spotlight_product_id: null,
  created_at: now,
};

function buyerComment(body: string): Comment {
  return {
    id: "comment-1",
    room_id: room.id,
    sender_role: "buyer",
    buyer_display_name: "Judge",
    body,
    language_label: "en",
    moderation_status: "visible",
    ai_status: "processing",
    reply_to_comment_id: null,
    created_at: now,
  };
}

describe("runStreamProducerAgent", () => {
  it("auto-answers a high-confidence linked product question using grounded product facts", async () => {
    const sony = catalogProduct({
      id: "sony",
      official_specs: [
        { label: "Audio formats", value: "SBC, AAC, LDAC, LC3" },
      ],
      faqs: [
        {
          q: "Does it support LDAC?",
          a: "Yes, the WH-1000XM6 supports LDAC alongside SBC, AAC, and LC3.",
        },
      ],
    });

    const decision = await runStreamProducerAgent(
      {
        room,
        comment: buyerComment("Does the XM6 support LDAC?"),
        lineup: [lineupItem(sony)],
        sessionMemories: [],
      },
      {
        invokeDeepAgent: async () => ({
          actionType: "auto_reply",
          productId: "sony",
          confidence: 0.92,
          buyerMessage:
            "AI assistant: Yes, the WH-1000XM6 supports LDAC, along with SBC, AAC, and LC3.",
          hostSummary: "Posted an AI answer about XM6 LDAC support.",
          rationaleLabel: "grounded_product_fact",
          supportingFactIds: ["sony:official_spec:0"],
        }),
      },
    );

    expect(decision.actionType).toBe("auto_reply");
    expect(decision.productId).toBe("sony");
    expect(decision.confidence).toBeGreaterThanOrEqual(0.8);
    expect(decision.buyerMessage).toContain("WH-1000XM6");
    expect(decision.buyerMessage).toContain("LDAC");
    expect(decision.buyerMessage).not.toContain("aptX");
  });

  it("does not auto-answer when the DeepAgent confidence is below the auto-reply gate", async () => {
    const sony = catalogProduct({
      id: "sony",
      official_specs: [
        { label: "Audio formats", value: "SBC, AAC, LDAC, LC3" },
      ],
    });

    const decision = await runStreamProducerAgent(
      {
        room,
        comment: buyerComment("Does the XM6 support LDAC?"),
        lineup: [lineupItem(sony)],
        sessionMemories: [],
      },
      {
        invokeDeepAgent: async () => ({
          actionType: "auto_reply",
          productId: "sony",
          confidence: 0.79,
          buyerMessage: "AI assistant: Yes, the WH-1000XM6 supports LDAC.",
          hostSummary: "Candidate answer was below the confidence gate.",
          rationaleLabel: "grounded_product_fact",
          supportingFactIds: ["sony:official_spec:0"],
        }),
      },
    );

    expect(decision.actionType).toBe("ignore");
    expect(decision.buyerMessage).toBeNull();
    expect(decision.rationaleLabel).toBe("below_auto_reply_gate");
  });

  it("does not auto-answer when the DeepAgent points at an unlinked product", async () => {
    const sony = catalogProduct({
      id: "sony",
      official_specs: [
        { label: "Audio formats", value: "SBC, AAC, LDAC, LC3" },
      ],
    });

    const decision = await runStreamProducerAgent(
      {
        room,
        comment: buyerComment("Does the XM6 support LDAC?"),
        lineup: [lineupItem(sony)],
        sessionMemories: [],
      },
      {
        invokeDeepAgent: async () => ({
          actionType: "auto_reply",
          productId: "logitech",
          confidence: 0.95,
          buyerMessage: "AI assistant: Yes, it works on glass.",
          hostSummary: "Tried to answer with an unlinked product.",
          rationaleLabel: "grounded_product_fact",
          supportingFactIds: ["logitech:official_spec:0"],
        }),
      },
    );

    expect(decision.actionType).toBe("ignore");
    expect(decision.buyerMessage).toBeNull();
    expect(decision.rationaleLabel).toBe("unlinked_product");
  });

  it("does not auto-answer without supporting linked fact ids", async () => {
    const sony = catalogProduct({
      id: "sony",
      official_specs: [
        { label: "Audio formats", value: "SBC, AAC, LDAC, LC3" },
      ],
    });

    const decision = await runStreamProducerAgent(
      {
        room,
        comment: buyerComment("Does the XM6 support LDAC?"),
        lineup: [lineupItem(sony)],
        sessionMemories: [],
      },
      {
        invokeDeepAgent: async () => ({
          actionType: "auto_reply",
          productId: "sony",
          confidence: 0.95,
          buyerMessage: "AI assistant: Yes, the WH-1000XM6 supports LDAC.",
          hostSummary: "Candidate answer omitted supporting facts.",
          rationaleLabel: "grounded_product_fact",
          supportingFactIds: [],
        }),
      },
    );

    expect(decision.actionType).toBe("ignore");
    expect(decision.buyerMessage).toBeNull();
    expect(decision.rationaleLabel).toBe("below_auto_reply_gate");
  });

  it("escalates a missing-detail linked product question without a buyer-facing answer", async () => {
    const sony = catalogProduct({
      id: "sony",
      // No stock facts -> "do you have the blue one?" is not answerable.
      stock: {},
    });

    const decision = await runStreamProducerAgent(
      {
        room,
        comment: buyerComment("Do you still have the blue one in stock?"),
        lineup: [lineupItem(sony)],
        sessionMemories: [],
      },
      {
        invokeDeepAgent: async () => ({
          actionType: "escalate",
          productId: "sony",
          confidence: 0.4,
          // Even if the model returns a buyer message, the gate must drop it.
          buyerMessage: "AI assistant: Yes, the blue one is in stock.",
          hostSummary: "Buyer asked about blue XM6 stock, not in linked facts.",
          rationaleLabel: "missing_product_fact",
          supportingFactIds: [],
        }),
      },
    );

    expect(decision.actionType).toBe("escalate");
    expect(decision.productId).toBe("sony");
    expect(decision.buyerMessage).toBeNull();
    expect(decision.hostSummary).toContain("stock");
  });

  it("flags a hearing-health claim as a policy-risk warning without posting to buyers", async () => {
    const sony = catalogProduct({
      id: "sony",
      restricted_claims: ["hearing health improvement"],
    });

    const decision = await runStreamProducerAgent(
      {
        room,
        comment: buyerComment("Will these headphones help reduce my tinnitus?"),
        lineup: [lineupItem(sony)],
        sessionMemories: [],
      },
      {
        invokeDeepAgent: async () => ({
          actionType: "warn",
          productId: "sony",
          confidence: 0.9,
          buyerMessage: null,
          hostSummary:
            "Buyer asked about tinnitus relief — avoid medical claims; redirect to noise-cancelling specs instead.",
          rationaleLabel: "policy_risk:hearing_health",
          supportingFactIds: [],
        }),
      },
    );

    expect(decision.actionType).toBe("warn");
    expect(decision.buyerMessage).toBeNull();
    expect(decision.rationaleLabel).toBe("policy_risk:hearing_health");
    expect(decision.hostSummary).toBeTruthy();
  });

  it("flags a guaranteed-result claim as a policy-risk warning without posting to buyers", async () => {
    const sony = catalogProduct({ id: "sony" });

    const decision = await runStreamProducerAgent(
      {
        room,
        comment: buyerComment("Guaranteed this will block all noise 100%?"),
        lineup: [lineupItem(sony)],
        sessionMemories: [],
      },
      {
        invokeDeepAgent: async () => ({
          actionType: "warn",
          productId: "sony",
          confidence: 0.88,
          buyerMessage: null,
          hostSummary:
            "Buyer asked for a 100% noise-blocking guarantee — avoid guaranteed-result claims; cite the official ANC specs instead.",
          rationaleLabel: "policy_risk:guaranteed_result",
          supportingFactIds: [],
        }),
      },
    );

    expect(decision.actionType).toBe("warn");
    expect(decision.buyerMessage).toBeNull();
    expect(decision.rationaleLabel).toBe("policy_risk:guaranteed_result");
  });

  it("flags a refund or warranty overpromise as a policy-risk warning without posting to buyers", async () => {
    const sony = catalogProduct({ id: "sony" });

    const decision = await runStreamProducerAgent(
      {
        room,
        comment: buyerComment(
          "If I don't like it can I return it anytime, no questions asked?",
        ),
        lineup: [lineupItem(sony)],
        sessionMemories: [],
      },
      {
        invokeDeepAgent: async () => ({
          actionType: "warn",
          productId: "sony",
          confidence: 0.85,
          buyerMessage: null,
          hostSummary:
            "Buyer asked for an unconditional return policy — avoid warranty overpromises; direct them to the listed return policy instead.",
          rationaleLabel: "policy_risk:refund_warranty",
          supportingFactIds: [],
        }),
      },
    );

    expect(decision.actionType).toBe("warn");
    expect(decision.buyerMessage).toBeNull();
    expect(decision.rationaleLabel).toBe("policy_risk:refund_warranty");
  });

  it("flags a fake-discount claim as a policy-risk warning without posting to buyers", async () => {
    const sony = catalogProduct({ id: "sony" });

    const decision = await runStreamProducerAgent(
      {
        room,
        comment: buyerComment(
          "Is the original price really SGD 649 or is that made up?",
        ),
        lineup: [lineupItem(sony)],
        sessionMemories: [],
      },
      {
        invokeDeepAgent: async () => ({
          actionType: "warn",
          productId: "sony",
          confidence: 0.87,
          buyerMessage: null,
          hostSummary:
            "Buyer questioned whether the original price is inflated — avoid fake-discount claims; confirm the price is from the official RRP.",
          rationaleLabel: "policy_risk:fake_discount",
          supportingFactIds: [],
        }),
      },
    );

    expect(decision.actionType).toBe("warn");
    expect(decision.buyerMessage).toBeNull();
    expect(decision.rationaleLabel).toBe("policy_risk:fake_discount");
  });

  it("clears buyerMessage on a warn decision even when the agent includes one", async () => {
    const sony = catalogProduct({ id: "sony" });

    const decision = await runStreamProducerAgent(
      {
        room,
        comment: buyerComment("Will this cure my hearing loss?"),
        lineup: [lineupItem(sony)],
        sessionMemories: [],
      },
      {
        invokeDeepAgent: async () => ({
          actionType: "warn",
          productId: "sony",
          confidence: 0.9,
          buyerMessage:
            "AI assistant: Yes, these headphones will improve your hearing!",
          hostSummary:
            "Buyer asked about hearing improvement — avoid medical claims.",
          rationaleLabel: "policy_risk:medical",
          supportingFactIds: [],
        }),
      },
    );

    expect(decision.actionType).toBe("warn");
    expect(decision.buyerMessage).toBeNull();
  });

  it("only exposes products linked to the active stream lineup as grounding context", () => {
    const sony = catalogProduct({
      id: "sony",
      slug: "sony-wh-1000xm6",
      name: "Sony WH-1000XM6 Wireless Noise Cancelling Headphones",
      official_specs: [
        { label: "Audio formats", value: "SBC, AAC, LDAC, LC3" },
      ],
    });
    const logitech = catalogProduct({
      id: "logitech",
      slug: "logitech-mx-master-3s",
      name: "Logitech MX Master 3S Wireless Performance Mouse",
      official_specs: [
        { label: "Glass tracking", value: "Works on glass at least 4 mm thick" },
      ],
    });

    const context = buildLinkedProductContext({
      room,
      lineup: [lineupItem(sony)],
      sessionMemories: [],
    });

    expect(context.products.map((product) => product.id)).toEqual(["sony"]);
    expect(JSON.stringify(context)).toContain("LDAC");
    expect(JSON.stringify(context)).not.toContain(logitech.name);
    expect(JSON.stringify(context)).not.toContain("glass");
  });
});
