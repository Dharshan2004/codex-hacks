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
  ai_status: "processing",
  reply_to_comment_id: null,
  created_at: now,
};

type Rows = Record<string, Record<string, unknown>[]>;

function createFakeSupabase(initialRows: Rows) {
  const rows: Rows = {
    ai_actions: [],
    comments: [],
    session_memories: [],
    escalations: [],
    ...initialRows,
  };
  const inserts: Rows = {
    ai_actions: [],
    comments: [],
    session_memories: [],
    escalations: [],
  };
  const updates: Rows = {
    ai_actions: [],
    comments: [],
    session_memories: [],
    escalations: [],
  };

  const supabase = {
    from: vi.fn((table: string) => {
      const filters: Array<[string, unknown]> = [];
      let insertPayload: Record<string, unknown> | null = null;
      let updatePayload: Record<string, unknown> | null = null;

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
        update: vi.fn((payload: Record<string, unknown>) => {
          updatePayload = payload;
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
        // An `update(...).eq(...)` chain is awaited directly (no .single()), so
        // the builder is thenable: applying the update on await.
        then: (
          resolve: (value: { data: null; error: null }) => unknown,
        ) => {
          if (updatePayload) {
            const matched = filterRows(rows[table] ?? [], filters);
            for (const row of matched) Object.assign(row, updatePayload);
            updates[table] = [...(updates[table] ?? []), updatePayload];
          }
          return Promise.resolve({ data: null, error: null }).then(resolve);
        },
      };

      return builder;
    }),
  };

  return { supabase, rows, inserts, updates };
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
        // The AI reply is linked to the buyer question it answers.
        reply_to_comment_id: buyerComment.id,
      }),
    ]);
    expect(result?.assistantComment?.sender_role).toBe("assistant");
    // The source buyer comment is flipped out of "processing".
    expect(fake.updates.comments).toEqual([
      expect.objectContaining({ ai_status: "done" }),
    ]);
  });

  it("persists an escalation and posts no buyer-facing answer for an escalate decision", async () => {
    const { processNewBuyerComment } = await import(
      "@/lib/streamProducerProcessor"
    );
    const fake = createFakeSupabase({
      comments: [buyerComment],
    });
    mocks.getServiceSupabase.mockReturnValue(fake.supabase);
    mocks.runStreamProducerAgent.mockResolvedValue({
      actionType: "escalate",
      productId: "sony",
      confidence: 0.4,
      buyerMessage: null,
      hostSummary: "Buyer asked about blue XM6 stock, not in linked facts.",
      rationaleLabel: "missing_product_fact",
      supportingFactIds: [],
    });

    const result = await processNewBuyerComment(buyerComment.id);

    expect(result?.decisionActionType).toBe("escalate");
    // An AI action of type escalate is recorded.
    expect(fake.inserts.ai_actions).toEqual([
      expect.objectContaining({
        room_id: room.id,
        source_comment_id: buyerComment.id,
        action_type: "escalate",
        product_id: "sony",
        buyer_message: null,
        rationale_label: "missing_product_fact",
      }),
    ]);
    // An escalation row is created with the source comment, product, and reason.
    expect(fake.inserts.escalations).toEqual([
      expect.objectContaining({
        room_id: room.id,
        source_comment_id: buyerComment.id,
        product_id: "sony",
        reason: expect.stringContaining("stock"),
        status: "open",
      }),
    ]);
    expect(result?.escalation?.status).toBe("open");
    // Critically: no hallucinated buyer-facing assistant message is posted.
    expect(fake.inserts.comments).toEqual([]);
    expect(result?.assistantComment).toBeNull();
  });

  it("persists a warn AI action and posts no buyer-facing answer for a warn decision", async () => {
    const { processNewBuyerComment } = await import(
      "@/lib/streamProducerProcessor"
    );
    const fake = createFakeSupabase({
      comments: [buyerComment],
    });
    mocks.getServiceSupabase.mockReturnValue(fake.supabase);
    mocks.runStreamProducerAgent.mockResolvedValue({
      actionType: "warn",
      productId: "sony",
      confidence: 0.9,
      buyerMessage: null,
      hostSummary:
        "Buyer asked about tinnitus relief — avoid medical claims; redirect to noise-cancelling specs instead.",
      rationaleLabel: "policy_risk:hearing_health",
      supportingFactIds: [],
    });

    const result = await processNewBuyerComment(buyerComment.id);

    expect(result?.decisionActionType).toBe("warn");
    expect(fake.inserts.ai_actions).toEqual([
      expect.objectContaining({
        room_id: room.id,
        source_comment_id: buyerComment.id,
        action_type: "warn",
        product_id: "sony",
        buyer_message: null,
        rationale_label: "policy_risk:hearing_health",
      }),
    ]);
    // Critically: no buyer-facing assistant message is posted.
    expect(fake.inserts.comments).toEqual([]);
    expect(result?.assistantComment).toBeNull();
    expect(result?.escalation).toBeNull();
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

  it("records a low-priority ignore action but posts nothing buyer-facing when the agent gates the comment", async () => {
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

    expect(result?.decisionActionType).toBe("ignore");
    // An ignore action is logged (for the activity log, issue 010)...
    expect(fake.inserts.ai_actions).toEqual([
      expect.objectContaining({
        room_id: room.id,
        source_comment_id: buyerComment.id,
        action_type: "ignore",
        buyer_message: null,
        rationale_label: "below_auto_reply_gate",
      }),
    ]);
    // ...but nothing buyer-facing is posted, and no escalation is created.
    expect(result?.assistantComment).toBeNull();
    expect(result?.escalation).toBeNull();
    expect(fake.inserts.comments).toEqual([]);
    expect(fake.inserts.escalations).toEqual([]);
  });
});
