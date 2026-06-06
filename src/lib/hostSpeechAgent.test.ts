import { describe, expect, it } from "vitest";

import {
  applyHostSpeechGate,
  runHostSpeechAgent,
} from "@/lib/hostSpeechAgent";
import type { LinkedProductContext } from "@/lib/streamProducerAgent";
import type {
  CatalogProduct,
  LineupItem,
  Room,
  StreamProduct,
} from "@/lib/types";

const now = "2026-06-06T05:00:00.000Z";

const context: LinkedProductContext = {
  roomId: "room-1",
  spotlightProductId: null,
  products: [
    {
      id: "sony",
      slug: "sony-wh-1000xm6",
      name: "Sony WH-1000XM6",
      brand: "Sony",
      category: "Headphones",
      facts: [
        {
          id: "sony:official_spec:0",
          label: "Battery",
          text: "Up to 30 hours with noise cancelling on",
          source: "official_spec",
        },
      ],
      restrictedClaims: [],
    },
  ],
};

describe("applyHostSpeechGate", () => {
  it("keeps a context classification with a memory to store", () => {
    const decision = applyHostSpeechGate(
      {
        classification: "context",
        productId: "sony",
        memoryText: "The host is bundling a free pouch with the XM6 today.",
        correction: null,
        note: "Captured promo context.",
      },
      context,
    );
    expect(decision.classification).toBe("context");
    expect(decision.memoryText).toContain("pouch");
    expect(decision.correction).toBeNull();
  });

  it("downgrades context to chatter when there is no memory text", () => {
    const decision = applyHostSpeechGate(
      {
        classification: "context",
        productId: "sony",
        memoryText: "   ",
        correction: null,
        note: "Nothing concrete.",
      },
      context,
    );
    expect(decision.classification).toBe("chatter");
    expect(decision.memoryText).toBeNull();
  });

  it("keeps a false_claim with a buyer-facing correction", () => {
    const decision = applyHostSpeechGate(
      {
        classification: "false_claim",
        productId: "sony",
        memoryText: null,
        correction:
          "Quick note: per the official specs, battery is up to 30 hours with noise cancelling on.",
        note: "Host overstated battery life.",
      },
      context,
    );
    expect(decision.classification).toBe("false_claim");
    expect(decision.correction).toContain("30 hours");
  });

  it("downgrades a false_claim with no correction to chatter (nothing buyer-facing)", () => {
    const decision = applyHostSpeechGate(
      {
        classification: "false_claim",
        productId: "sony",
        memoryText: null,
        correction: "",
        note: "Unverifiable.",
      },
      context,
    );
    expect(decision.classification).toBe("chatter");
    expect(decision.correction).toBeNull();
  });

  it("drops references to products not in the linked lineup", () => {
    const decision = applyHostSpeechGate(
      {
        classification: "context",
        productId: "logitech", // not linked
        memoryText: "Some mouse fact",
        correction: null,
        note: "x",
      },
      context,
    );
    expect(decision.productId).toBeNull();
  });

  it("falls back to chatter on invalid agent output", () => {
    const decision = applyHostSpeechGate({ nonsense: true }, context);
    expect(decision.classification).toBe("chatter");
  });
});

describe("runHostSpeechAgent", () => {
  function lineupItem(): LineupItem {
    const product: CatalogProduct = {
      id: "sony",
      slug: "sony-wh-1000xm6",
      name: "Sony WH-1000XM6",
      brand: "Sony",
      category: "Headphones",
      currency: "SGD",
      price: 559,
      original_price: null,
      image_emoji: null,
      official_specs: [{ label: "Battery", value: "Up to 30 hours" }],
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
    };
    const link: StreamProduct = {
      id: "lineup-sony",
      room_id: "room-1",
      product_id: "sony",
      display_order: 0,
      pinned: false,
      created_at: now,
    };
    return { ...link, product };
  }

  const room: Room = {
    id: "room-1",
    title: "Live",
    seller_name: "Demo Seller",
    status: "live",
    buyer_token: "t",
    video_mode: "camera_fallback",
    spotlight_product_id: null,
    created_at: now,
  };

  it("routes the agent output through the gate", async () => {
    const decision = await runHostSpeechAgent(
      {
        room,
        transcript: "These headphones get like a hundred hours of battery!",
        lineup: [lineupItem()],
        sessionMemories: [],
      },
      {
        invokeAgent: async () => ({
          classification: "false_claim",
          productId: "sony",
          memoryText: null,
          correction:
            "Quick note: per the official specs, battery is up to 30 hours with noise cancelling on.",
          note: "Host overstated battery life vs linked spec.",
        }),
      },
    );
    expect(decision.classification).toBe("false_claim");
    expect(decision.correction).toContain("30 hours");
    expect(decision.productId).toBe("sony");
  });
});
