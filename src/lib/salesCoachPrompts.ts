import "server-only";

import { buildSalesCoachPrompt } from "@/lib/salesCoachEngine";
import { getLineup, getRoomById } from "@/lib/rooms";
import { getServiceSupabase } from "@/lib/supabase/server";
import type {
  Comment,
  LineupItem,
  Room,
  SalesCoachPrompt,
} from "@/lib/types";

export async function maybeCreateSalesCoachPromptForComment({
  room,
  comment,
  lineup,
}: {
  room: Room;
  comment: Comment;
  lineup: LineupItem[];
}): Promise<SalesCoachPrompt | null> {
  const supabase = getServiceSupabase();
  const [recentBuyerComments, recentPrompts] = await Promise.all([
    loadRecentBuyerComments(supabase, room.id),
    loadRecentPrompts(supabase, room.id),
  ]);

  const draft = buildSalesCoachPrompt({
    room,
    lineup,
    recentBuyerComments,
    recentPrompts,
    event: { type: "comment", comment },
  });

  return draft ? insertSalesCoachPrompt(supabase, draft) : null;
}

export async function maybeCreateSalesCoachPromptForTimer(
  roomId: string,
): Promise<SalesCoachPrompt | null> {
  const room = await getRoomById(roomId);
  if (!room) return null;

  const supabase = getServiceSupabase();
  const [lineup, recentBuyerComments, recentPrompts] = await Promise.all([
    getLineup(room.id),
    loadRecentBuyerComments(supabase, room.id),
    loadRecentPrompts(supabase, room.id),
  ]);

  const draft = buildSalesCoachPrompt({
    room,
    lineup,
    recentBuyerComments,
    recentPrompts,
    event: { type: "timer" },
  });

  return draft ? insertSalesCoachPrompt(supabase, draft) : null;
}

export async function maybeCreateSalesCoachPromptForSpotlight({
  room,
  productId,
}: {
  room: Room;
  productId: string | null;
}): Promise<SalesCoachPrompt | null> {
  if (!productId) return null;

  const supabase = getServiceSupabase();
  const [lineup, recentPrompts] = await Promise.all([
    getLineup(room.id),
    loadRecentPrompts(supabase, room.id),
  ]);

  const draft = buildSalesCoachPrompt({
    room,
    lineup,
    recentPrompts,
    event: { type: "spotlight", productId },
  });

  return draft ? insertSalesCoachPrompt(supabase, draft) : null;
}

async function loadRecentBuyerComments(
  supabase: ReturnType<typeof getServiceSupabase>,
  roomId: string,
): Promise<Comment[]> {
  const { data, error } = await supabase
    .from("comments")
    .select("*")
    .eq("room_id", roomId)
    .eq("sender_role", "buyer")
    .eq("moderation_status", "visible")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to load recent buyer comments: ${error.message}`);
  }

  return (data ?? []) as Comment[];
}

async function loadRecentPrompts(
  supabase: ReturnType<typeof getServiceSupabase>,
  roomId: string,
): Promise<SalesCoachPrompt[]> {
  const { data, error } = await supabase
    .from("sales_coach_prompts")
    .select("*")
    .eq("room_id", roomId)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    throw new Error(`Failed to load recent sales coach prompts: ${error.message}`);
  }

  return (data ?? []) as SalesCoachPrompt[];
}

async function insertSalesCoachPrompt(
  supabase: ReturnType<typeof getServiceSupabase>,
  draft: ReturnType<typeof buildSalesCoachPrompt>,
): Promise<SalesCoachPrompt> {
  if (!draft) {
    throw new Error("Cannot insert an empty sales coach prompt draft.");
  }

  const { data, error } = await supabase
    .from("sales_coach_prompts")
    .insert({
      ...draft,
      status: "new",
    })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(
      `Failed to store sales coach prompt: ${error?.message ?? "missing row"}`,
    );
  }

  return data as SalesCoachPrompt;
}
