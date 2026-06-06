import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Comment, Room } from "@/lib/types";

vi.mock("server-only", () => ({}));

const mocks = vi.hoisted(() => ({
  getLineup: vi.fn(),
  getRoomById: vi.fn(),
  getServiceSupabase: vi.fn(),
  runStreamProducerAgent: vi.fn(),
}));

vi.mock("@/lib/rooms", () => ({
  getLineup: mocks.getLineup,
  getRoomById: mocks.getRoomById,
}));

vi.mock("@/lib/supabase/server", () => ({
  getServiceSupabase: mocks.getServiceSupabase,
}));

vi.mock("@/lib/streamProducerAgent", () => ({
  runStreamProducerAgent: mocks.runStreamProducerAgent,
}));

const now = "2026-06-06T05:00:00.000Z";

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

const buyerComment: Comment = {
  id: "comment-1",
  room_id: room.id,
  sender_role: "buyer",
  buyer_display_name: "Judge",
  body: "Does the XM6 support LDAC?",
  language_label: "en",
  moderation_status: "visible",
  created_at: now,
};

type Rows = Record<string, Record<string, unknown>[]>;

function createFakeSupabase(initialRows: Rows) {
  const rows: Rows = {
    ai_actions: [],
    comments: [],
    session_memories: [],
    ...initialRows,
  };
  const inserts: Rows = {
    ai_actions: [],
    comments: [],
    session_memories: [],
  };

  const supabase = {
    from: vi.fn((table: string) => {
      const filters: Array<[string, unknown]> = [];
      let insertPayload: Record<string, unknown> | null = null;

      const builder = {
        select: vi.fn(() => builder),
        eq: vi.fn((column: string, value: unknown) => {
          filters.push([column, value]);
          return builder;
        }),
        order: vi.fn(() => builder),
        insert: vi.fn((payload: Record<string, unknown>) => {
          insertPayload = payload;
          return builder;
        }),
        maybeSingle: vi.fn(async () => ({
          data: filterRows(rows[table] ?? [], filters)[0] ?? null,
          error: null,
        })),
        single: vi.fn(async () => {
          if (!insertPayload) {
            return { data: null, error: { message: "Missing insert payload." } };
          }
          const row = {
            id: `${table}-${rows[table]?.length ?? 0}`,
            ...insertPayload,
            created_at: now,
          };
          rows[table] = [...(rows[table] ?? []), row];
          inserts[table] = [...(inserts[table] ?? []), row];
          return { data: row, error: null };
        }),
      };

      return builder;
    }),
  };

  return { supabase, rows, inserts };
}

function filterRows(
  rows: Record<string, unknown>[],
  filters: Array<[string, unknown]>,
) {
  return rows.filter((row) =>
    filters.every(([column, value]) => row[column] === value),
  );
}

describe("processNewBuyerComment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getRoomById.mockResolvedValue(room);
    mocks.getLineup.mockResolvedValue([]);
  });

  it("persists an AI action and posts an assistant chat message for an auto-reply decision", async () => {
    const { processNewBuyerComment } = await import(
      "@/lib/streamProducerProcessor"
    );
    const fake = createFakeSupabase({
      comments: [buyerComment],
      session_memories: [
        {
          id: "memory-1",
          room_id: room.id,
          memory_text: "Host confirmed the blue XM6 is out of stock.",
          source_event: "host_answer",
          confidence: 0.9,
          status: "active",
          created_at: now,
        },
      ],
    });
    mocks.getServiceSupabase.mockReturnValue(fake.supabase);
    mocks.runStreamProducerAgent.mockResolvedValue({
      actionType: "auto_reply",
      productId: "sony",
      confidence: 0.92,
      buyerMessage:
        "AI assistant: Yes, the WH-1000XM6 supports LDAC, along with SBC, AAC, and LC3.",
      hostSummary: "Posted an AI answer about XM6 LDAC support.",
      rationaleLabel: "grounded_product_fact",
      supportingFactIds: ["sony:official_spec:0"],
    });

    const result = await processNewBuyerComment(buyerComment.id);

    expect(result?.decisionActionType).toBe("auto_reply");
    expect(fake.inserts.ai_actions).toEqual([
      expect.objectContaining({
        room_id: room.id,
        source_comment_id: buyerComment.id,
        action_type: "auto_reply",
        product_id: "sony",
        confidence: 0.92,
        rationale_label: "grounded_product_fact",
      }),
    ]);
    expect(fake.inserts.comments).toEqual([
      expect.objectContaining({
        room_id: room.id,
        sender_role: "assistant",
        buyer_display_name: null,
        body: expect.stringContaining("LDAC"),
      }),
    ]);
    expect(result?.assistantComment?.sender_role).toBe("assistant");
  });

  it("does not call the agent again when the source comment already has an AI action", async () => {
    const { processNewBuyerComment } = await import(
      "@/lib/streamProducerProcessor"
    );
    const fake = createFakeSupabase({
      ai_actions: [{ id: "existing-action", source_comment_id: buyerComment.id }],
      comments: [buyerComment],
    });
    mocks.getServiceSupabase.mockReturnValue(fake.supabase);

    const result = await processNewBuyerComment(buyerComment.id);

    expect(result).toBeNull();
    expect(mocks.runStreamProducerAgent).not.toHaveBeenCalled();
    expect(fake.inserts.comments).toEqual([]);
  });

  it("does not persist or post anything when the agent gates the comment", async () => {
    const { processNewBuyerComment } = await import(
      "@/lib/streamProducerProcessor"
    );
    const fake = createFakeSupabase({
      comments: [buyerComment],
    });
    mocks.getServiceSupabase.mockReturnValue(fake.supabase);
    mocks.runStreamProducerAgent.mockResolvedValue({
      actionType: "ignore",
      productId: null,
      confidence: 0,
      buyerMessage: null,
      hostSummary: "Question was not answerable from linked facts.",
      rationaleLabel: "below_auto_reply_gate",
      supportingFactIds: [],
    });

    const result = await processNewBuyerComment(buyerComment.id);

    expect(result).toEqual({
      decisionActionType: "ignore",
      aiAction: null,
      assistantComment: null,
    });
    expect(fake.inserts.ai_actions).toEqual([]);
    expect(fake.inserts.comments).toEqual([]);
  });
});
