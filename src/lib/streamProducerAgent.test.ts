import { describe, expect, it, vi } from "vitest";

import {
  buildLinkedProductContext,
  classifyBodyModeration,
  classifyCommentVisibility,
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
    created_at: now,
  };
}

describe("runStreamProducerAgent", () => {
  it("ignores obvious spam before invoking the DeepAgent", async () => {
    const invokeDeepAgent = vi.fn();

    const decision = await runStreamProducerAgent(
      {
        room,
        comment: buyerComment("CLICK http://spam.example now!!! free followers"),
        lineup: [lineupItem(catalogProduct({ id: "sony" }))],
        sessionMemories: [],
      },
      { invokeDeepAgent },
    );

    expect(decision.actionType).toBe("ignore");
    expect(decision.rationaleLabel).toBe("spam");
    expect(invokeDeepAgent).not.toHaveBeenCalled();
  });

  it("ignores social chatter before invoking the DeepAgent", async () => {
    const invokeDeepAgent = vi.fn();

    const decision = await runStreamProducerAgent(
      {
        room,
        comment: buyerComment("hello nice stream"),
        lineup: [lineupItem(catalogProduct({ id: "sony" }))],
        sessionMemories: [],
      },
      { invokeDeepAgent },
    );

    expect(decision.actionType).toBe("ignore");
    expect(decision.rationaleLabel).toBe("social_chatter");
    expect(invokeDeepAgent).not.toHaveBeenCalled();
  });

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

  it("ignores obvious questions about products outside the active lineup before invoking the DeepAgent", async () => {
    const invokeDeepAgent = vi.fn();
    const sony = catalogProduct({
      id: "sony",
      name: "Sony WH-1000XM6 Wireless Noise Cancelling Headphones",
      brand: "Sony",
      category: "Headphones",
    });

    const decision = await runStreamProducerAgent(
      {
        room,
        comment: buyerComment("Does the iPhone 16 case work with MagSafe?"),
        lineup: [lineupItem(sony)],
        sessionMemories: [],
      },
      { invokeDeepAgent },
    );

    expect(decision.actionType).toBe("ignore");
    expect(decision.rationaleLabel).toBe("unlinked_product");
    expect(invokeDeepAgent).not.toHaveBeenCalled();
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

  it("ignores a non-buyer comment before invoking the DeepAgent", async () => {
    const invokeDeepAgent = vi.fn();

    const decision = await runStreamProducerAgent(
      {
        room,
        comment: {
          ...buyerComment("hello"),
          sender_role: "host",
        },
        lineup: [lineupItem(catalogProduct({}))],
        sessionMemories: [],
      },
      { invokeDeepAgent },
    );

    expect(decision.actionType).toBe("ignore");
    expect(decision.rationaleLabel).toBe("non_buyer_comment");
    expect(invokeDeepAgent).not.toHaveBeenCalled();
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

describe("classifyCommentVisibility", () => {
  const sony = catalogProduct({
    id: "sony",
    name: "Sony WH-1000XM6 Wireless Noise Cancelling Headphones",
    brand: "Sony",
    category: "Headphones",
  });

  it("returns 'hidden' for spam regardless of lineup", () => {
    const context = buildLinkedProductContext({ room, lineup: [], sessionMemories: [] });
    expect(classifyCommentVisibility("free followers", context)).toBe("hidden");
  });

  it("returns 'hidden' for a question about a product outside the lineup", () => {
    const context = buildLinkedProductContext({
      room,
      lineup: [lineupItem(sony)],
      sessionMemories: [],
    });
    expect(classifyCommentVisibility("Does the iPhone work with MagSafe?", context)).toBe("hidden");
  });

  it("returns null for a question about a product in the lineup", () => {
    const context = buildLinkedProductContext({
      room,
      lineup: [lineupItem(sony)],
      sessionMemories: [],
    });
    expect(classifyCommentVisibility("Does the Sony support LDAC?", context)).toBeNull();
  });

  it("returns null when the lineup is empty and the comment has no outside product terms", () => {
    const context = buildLinkedProductContext({ room, lineup: [], sessionMemories: [] });
    expect(classifyCommentVisibility("What is the price?", context)).toBeNull();
  });

  it("returns 'hidden' for a question about shoes when the lineup only has a mouse", () => {
    const logitech = catalogProduct({
      id: "logitech",
      name: "Logitech MX Master 3S Wireless Performance Mouse",
      brand: "Logitech",
      category: "Mouse",
    });
    const context = buildLinkedProductContext({
      room,
      lineup: [lineupItem(logitech)],
      sessionMemories: [],
    });
    expect(classifyCommentVisibility("how much is the shoe i want shoe", context)).toBe("hidden");
  });

  it("returns null for a general availability question with no product noun", () => {
    const logitech = catalogProduct({
      id: "logitech",
      name: "Logitech MX Master 3S Wireless Performance Mouse",
      brand: "Logitech",
      category: "Mouse",
    });
    const context = buildLinkedProductContext({
      room,
      lineup: [lineupItem(logitech)],
      sessionMemories: [],
    });
    expect(classifyCommentVisibility("how many are available?", context)).toBeNull();
  });
});

describe("classifyBodyModeration", () => {
  it("returns 'hidden' for abusive language", () => {
    expect(classifyBodyModeration("fuck you")).toBe("hidden");
  });

  it("returns 'hidden' for a comment containing a URL", () => {
    expect(classifyBodyModeration("CLICK http://spam.example now!!!")).toBe("hidden");
  });

  it("returns 'hidden' for a known spam keyword phrase", () => {
    expect(classifyBodyModeration("free followers dm me")).toBe("hidden");
  });

  it("returns 'hidden' for short social chatter with no question signal", () => {
    expect(classifyBodyModeration("hello nice stream")).toBe("hidden");
  });

  it("returns null for a legitimate product question", () => {
    expect(classifyBodyModeration("Does this support LDAC?")).toBeNull();
  });

  it("returns null for a price question", () => {
    expect(classifyBodyModeration("what is the price?")).toBeNull();
  });
});
