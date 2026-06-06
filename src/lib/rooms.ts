import "server-only";

import { getServiceSupabase } from "@/lib/supabase/server";
import type {
  CatalogProduct,
  LineupItem,
  Room,
  RoomState,
  StreamProduct,
} from "@/lib/types";

// Server-side data access for rooms. Centralizes the joins so API routes and
// server components stay thin.

export async function getCatalog(): Promise<CatalogProduct[]> {
  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from("catalog_products")
    .select("*")
    .order("price", { ascending: false });
  if (error) throw new Error(`Failed to load catalog: ${error.message}`);
  return (data ?? []) as CatalogProduct[];
}

export async function getRoomById(roomId: string): Promise<Room | null> {
  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from("rooms")
    .select("*")
    .eq("id", roomId)
    .maybeSingle();
  if (error) throw new Error(`Failed to load room: ${error.message}`);
  return (data as Room) ?? null;
}

export async function getRoomByBuyerToken(token: string): Promise<Room | null> {
  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from("rooms")
    .select("*")
    .eq("buyer_token", token)
    .maybeSingle();
  if (error) throw new Error(`Failed to load room: ${error.message}`);
  return (data as Room) ?? null;
}

// Fetch a room's lineup joined with the underlying catalog products.
export async function getLineup(roomId: string): Promise<LineupItem[]> {
  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from("stream_products")
    .select("*, product:catalog_products(*)")
    .eq("room_id", roomId)
    .order("display_order", { ascending: true });
  if (error) throw new Error(`Failed to load lineup: ${error.message}`);

  return (data ?? []).map((row) => {
    const { product, ...sp } = row as StreamProduct & { product: CatalogProduct };
    return { ...sp, product } as LineupItem;
  });
}

export async function getRoomState(roomId: string): Promise<RoomState | null> {
  const room = await getRoomById(roomId);
  if (!room) return null;
  const lineup = await getLineup(roomId);
  return { room, lineup };
}

export async function getRoomStateByToken(
  token: string,
): Promise<RoomState | null> {
  const room = await getRoomByBuyerToken(token);
  if (!room) return null;
  const lineup = await getLineup(room.id);
  return { room, lineup };
}
