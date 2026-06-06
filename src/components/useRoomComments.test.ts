import { describe, expect, it } from "vitest";

import {
  appendRoomComments,
  createOptimisticComment,
  removeRoomComment,
  replaceRoomComment,
} from "@/components/useRoomComments";
import type { Comment } from "@/lib/types";

const now = "2026-06-06T05:00:00.000Z";

function comment(overrides: Partial<Comment>): Comment {
  return {
    id: "comment-1",
    room_id: "room-1",
    sender_role: "buyer",
    buyer_display_name: "Buyer",
    body: "Hello",
    language_label: "en",
    moderation_status: "visible",
    created_at: now,
    ...overrides,
  };
}

describe("room comment optimistic updates", () => {
  it("creates a visible local comment immediately from a draft", () => {
    const optimistic = createOptimisticComment({
      id: "optimistic-1",
      roomId: "room-1",
      role: "buyer",
      displayName: "Judge",
      body: "How much is this?",
      createdAt: now,
    });

    expect(optimistic).toEqual({
      id: "optimistic-1",
      room_id: "room-1",
      sender_role: "buyer",
      buyer_display_name: "Judge",
      body: "How much is this?",
      language_label: "en",
      moderation_status: "visible",
      created_at: now,
    });
  });

  it("replaces an optimistic comment with the server-confirmed row", () => {
    const optimistic = comment({
      id: "optimistic-1",
      body: "How much is this?",
    });
    const confirmed = comment({
      id: "server-1",
      body: "How much is this?",
      created_at: "2026-06-06T05:00:01.000Z",
    });

    expect(replaceRoomComment([optimistic], optimistic.id, confirmed)).toEqual([
      confirmed,
    ]);
  });

  it("does not duplicate confirmed realtime echoes", () => {
    const confirmed = comment({ id: "server-1" });

    expect(appendRoomComments([confirmed], [confirmed])).toEqual([confirmed]);
  });

  it("removes a rejected optimistic comment", () => {
    const optimistic = comment({ id: "optimistic-1" });

    expect(removeRoomComment([optimistic], optimistic.id)).toEqual([]);
  });
});
