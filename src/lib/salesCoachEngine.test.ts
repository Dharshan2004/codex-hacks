import { describe, expect, it } from "vitest";

import {
  buildSalesCoachPrompt,
  SALES_COACH_TIMER_INTERVAL_MS,
} from "@/lib/salesCoachEngine";
import type {
  CatalogProduct,
  Comment,
  LineupItem,
  Room,
  SalesCoachPrompt,
  StreamProduct,
} from "@/lib/types";

const now = "2026-06-06T05:00:00.000Z";
const room: Room = {
  id: "room-1",
  title: "Shopee Live - Tech Drop",
  seller_name: "Demo Seller",
  status: "live",
  buyer_token: "buyer-token",
  video_mode: "camera_fallback",
  spotlight_product_id: "sony",
  created_at: now,
};

function catalogProduct(overrides: Partial<CatalogProduct>): CatalogProduct {
  return {
    id: "sony",
    slug: "sony-wh-1000xm6",
    name: "Sony WH-1000XM6 Wireless Noise Cancelling Headphones",
    brand: "Sony",
    category: "Headphones",
    currency: "SGD",
    price: 559,
    original_price: 649,
    image_emoji: null,
    official_specs: [
      { label: "Audio formats", value: "SBC, AAC, LDAC, LC3" },
    ],
    variants: [],
    stock: { Black: 24 },
    seller_notes: "Flagship ANC headphones.",
    shipping_notes: "Ships in 1-2 business days.",
    return_notes: "7-day returns if unopened.",
    vouchers: [
      {
        code: "XM6LIVE40",
        description: "S$40 off when you check out during the live stream",
      },
    ],
    promotions: [
      {
        label: "Live bundle",
        description: "Free carry pouch with every live-stream order today",
      },
    ],
    faqs: [
      {
        q: "Does it support LDAC?",
        a: "Yes, the WH-1000XM6 supports LDAC alongside SBC, AAC, and LC3.",
      },
    ],
    restricted_claims: [],
    created_at: now,
    ...overrides,
  };
}

function lineupItem(product: CatalogProduct): LineupItem {
  const link: StreamProduct = {
    id: `lineup-${product.id}`,
    room_id: room.id,
    product_id: product.id,
    display_order: 0,
    pinned: false,
    created_at: now,
  };
  return { ...link, product };
}

function buyerComment(id: string, body: string, createdAt = now): Comment {
  return {
    id,
    room_id: room.id,
    sender_role: "buyer",
    buyer_display_name: "Judge",
    body,
    language_label: "en",
    moderation_status: "visible",
    ai_status: "processing",
    reply_to_comment_id: null,
    created_at: createdAt,
  };
}

function prompt(
  triggerType: SalesCoachPrompt["trigger_type"],
  createdAt: string,
): SalesCoachPrompt {
  return {
    id: `prompt-${triggerType}`,
    room_id: room.id,
    trigger_type: triggerType,
    product_id: "sony",
    prompt_text: "Existing prompt",
    status: "new",
    created_at: createdAt,
  };
}

describe("buildSalesCoachPrompt", () => {
  const sony = catalogProduct({});
  const lineup = [lineupItem(sony)];

  it("creates a repeated-question prompt from repeated buyer concerns", () => {
    const current = buyerComment("comment-2", "Does the XM6 support LDAC?");

    const draft = buildSalesCoachPrompt({
      room,
      lineup,
      recentBuyerComments: [
        current,
        buyerComment("comment-1", "Can the XM6 support LDAC too?"),
      ],
      recentPrompts: [],
      event: { type: "comment", comment: current },
      now: new Date(now),
    });

    expect(draft).toEqual(
      expect.objectContaining({
        room_id: room.id,
        trigger_type: "repeated",
        product_id: "sony",
      }),
    );
    expect(draft?.prompt_text).toContain("compatibility");
    expect(draft?.prompt_text).toContain("LDAC");
  });

  it("creates a purchase-intent prompt with live voucher context", () => {
    const current = buyerComment(
      "comment-3",
      "How much is 1? I want 1 graphite",
    );

    const draft = buildSalesCoachPrompt({
      room,
      lineup,
      recentBuyerComments: [current],
      recentPrompts: [],
      event: { type: "comment", comment: current },
      now: new Date(now),
    });

    expect(draft?.trigger_type).toBe("intent");
    expect(draft?.product_id).toBe("sony");
    expect(draft?.prompt_text).toContain("XM6LIVE40");
    expect(draft?.prompt_text).toContain("I want 1 graphite");
    expect(draft?.prompt_text).toContain("which option are you choosing?");
  });

  it("creates a live chat cue when buyers directly ask for sales coaching", () => {
    const current = buyerComment(
      "comment-coach",
      "sales coach can u do something",
    );

    const draft = buildSalesCoachPrompt({
      room,
      lineup,
      recentBuyerComments: [
        current,
        buyerComment("comment-discount", "any discounts?"),
      ],
      recentPrompts: [],
      event: { type: "comment", comment: current },
      now: new Date(now),
    });

    expect(draft?.trigger_type).toBe("chat");
    expect(draft?.prompt_text).toContain("sales coach can u do something");
    expect(draft?.prompt_text).toContain("compare live");
  });

  it("creates a timer prompt when no timer prompt exists inside the interval", () => {
    const draft = buildSalesCoachPrompt({
      room,
      lineup,
      recentPrompts: [],
      event: { type: "timer" },
      now: new Date(now),
    });

    expect(draft?.trigger_type).toBe("timer");
    expect(draft?.product_id).toBe("sony");
    expect(draft?.prompt_text).toContain("Refresh this product");
  });

  it("changes timer prompts based on recent live chat", () => {
    const draft = buildSalesCoachPrompt({
      room,
      lineup,
      recentBuyerComments: [
        buyerComment("comment-delivery", "i want it tomorrow"),
        buyerComment("comment-discount", "any discounts?"),
      ],
      recentPrompts: [],
      event: { type: "timer" },
      now: new Date(now),
    });

    expect(draft?.trigger_type).toBe("timer");
    expect(draft?.prompt_text).toContain("Delivery urgency");
    expect(draft?.prompt_text).toContain("tomorrow");
    expect(draft?.prompt_text).toContain("decision blocker");
  });

  it("uses newer buyer comments when choosing the timer chat pulse", () => {
    const draft = buildSalesCoachPrompt({
      room,
      lineup,
      recentBuyerComments: [
        buyerComment("newer-delivery", "can you deliver tomorrow?"),
        buyerComment("older-coach", "sales coach can u do something"),
        buyerComment("older-discount", "any discounts?"),
      ],
      recentPrompts: [],
      event: { type: "timer" },
      now: new Date(now),
    });

    expect(draft?.prompt_text).toContain("Delivery urgency");
    expect(draft?.prompt_text).toContain("deliver tomorrow");
    expect(draft?.prompt_text).not.toContain("sales coach can u do something");
  });

  it("matches the timer talking point to the newest stock and variant concern", () => {
    const logitech = catalogProduct({
      id: "logitech",
      slug: "logitech-mx-master-3s",
      name: "Logitech MX Master 3S Wireless Performance Mouse",
      brand: "Logitech",
      category: "Mouse",
      price: 189,
      original_price: null,
      official_specs: [
        { label: "Battery", value: "Up to 70 days on a full charge" },
      ],
      variants: [{ name: "Colour", options: ["Graphite", "Pale Grey"] }],
      stock: { Graphite: 37, "Pale Grey": 6 },
      vouchers: [
        {
          code: "MX3SLIVE15",
          description: "S$15 off during the live stream only",
        },
      ],
    });

    const draft = buildSalesCoachPrompt({
      room: { ...room, spotlight_product_id: "logitech" },
      lineup: [lineupItem(logitech)],
      recentBuyerComments: [
        buyerComment("newer-stock", "how many graphite are available?"),
        buyerComment("older-battery", "how long does the battery last?"),
      ],
      recentPrompts: [],
      event: { type: "timer" },
      now: new Date(now),
    });

    expect(draft?.trigger_type).toBe("timer");
    expect(draft?.product_id).toBe("logitech");
    expect(draft?.prompt_text).toContain("stock and variants");
    expect(draft?.prompt_text).toContain("Stock by option");
    expect(draft?.prompt_text).toContain("Graphite 37");
    expect(draft?.prompt_text).not.toContain("Battery: Up to 70 days");
  });

  it("suppresses timer prompts until the configured interval has passed", () => {
    const recentTimer = prompt("timer", "2026-06-06T04:59:30.000Z");
    const oldTimer = prompt(
      "timer",
      new Date(
        new Date(now).getTime() - SALES_COACH_TIMER_INTERVAL_MS - 1_000,
      ).toISOString(),
    );

    expect(
      buildSalesCoachPrompt({
        room,
        lineup,
        recentPrompts: [recentTimer],
        event: { type: "timer" },
        now: new Date(now),
      }),
    ).toBeNull();

    expect(
      buildSalesCoachPrompt({
        room,
        lineup,
        recentPrompts: [oldTimer],
        event: { type: "timer" },
        now: new Date(now),
      })?.trigger_type,
    ).toBe("timer");
  });

  it("creates product-specific talking points for spotlight changes", () => {
    const draft = buildSalesCoachPrompt({
      room,
      lineup,
      recentPrompts: [],
      event: { type: "spotlight", productId: "sony" },
      now: new Date(now),
    });

    expect(draft).toEqual(
      expect.objectContaining({
        trigger_type: "spotlight",
        product_id: "sony",
      }),
    );
    expect(draft?.prompt_text).toContain("LDAC");
    expect(draft?.prompt_text).toContain("product to tap now");
  });

  it("does not create prompts for ordinary comments or recent comment prompts", () => {
    const ordinary = buyerComment("comment-4", "hello everyone");
    const purchase = buyerComment("comment-5", "Can I buy this now?");

    expect(
      buildSalesCoachPrompt({
        room,
        lineup,
        recentBuyerComments: [ordinary],
        recentPrompts: [],
        event: { type: "comment", comment: ordinary },
        now: new Date(now),
      }),
    ).toBeNull();

    expect(
      buildSalesCoachPrompt({
        room,
        lineup,
        recentBuyerComments: [purchase],
        recentPrompts: [prompt("intent", "2026-06-06T04:59:45.000Z")],
        event: { type: "comment", comment: purchase },
        now: new Date(now),
      }),
    ).toBeNull();
  });
});
