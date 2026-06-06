import { NextResponse } from "next/server";

import { getServiceSupabase } from "@/lib/supabase/server";
import { generateBuyerToken } from "@/lib/token";
import type { Room } from "@/lib/types";

// POST /api/rooms
// Body: { title?: string, sellerName?: string, productIds: string[] }
// Creates a room and links the selected catalog products as the stream lineup.
// Returns the room plus host/buyer relative paths.
export async function POST(request: Request) {
  let body: { title?: string; sellerName?: string; productIds?: string[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const productIds = Array.isArray(body.productIds) ? body.productIds : [];
  if (productIds.length === 0) {
    return NextResponse.json(
      { error: "Select at least one product for the stream lineup." },
      { status: 400 },
    );
  }

  const supabase = getServiceSupabase();

  // Validate the product ids against the catalog so we don't link junk.
  const { data: products, error: productError } = await supabase
    .from("catalog_products")
    .select("id")
    .in("id", productIds);
  if (productError) {
    return NextResponse.json({ error: productError.message }, { status: 500 });
  }
  const validIds = new Set((products ?? []).map((p) => p.id as string));
  const linkedIds = productIds.filter((id) => validIds.has(id));
  if (linkedIds.length === 0) {
    return NextResponse.json(
      { error: "None of the selected products exist in the catalog." },
      { status: 400 },
    );
  }

  const title = (body.title || "").trim() || "Shopee Live — Tech Drop";
  const sellerName = (body.sellerName || "").trim() || "Demo Seller";

  const { data: roomRow, error: roomError } = await supabase
    .from("rooms")
    .insert({
      title,
      seller_name: sellerName,
      buyer_token: generateBuyerToken(),
      status: "live",
      video_mode: "camera_fallback",
    })
    .select("*")
    .single();
  if (roomError || !roomRow) {
    return NextResponse.json(
      { error: roomError?.message ?? "Failed to create room." },
      { status: 500 },
    );
  }
  const room = roomRow as Room;

  // Link products into the lineup, preserving selection order.
  const lineupRows = linkedIds.map((productId, index) => ({
    room_id: room.id,
    product_id: productId,
    display_order: index,
  }));
  const { error: lineupError } = await supabase
    .from("stream_products")
    .insert(lineupRows);
  if (lineupError) {
    // Roll back the room so we don't leave an empty room behind.
    await supabase.from("rooms").delete().eq("id", room.id);
    return NextResponse.json({ error: lineupError.message }, { status: 500 });
  }

  return NextResponse.json(
    {
      room,
      hostPath: `/host/${room.id}`,
      buyerPath: `/buyer/${room.buyer_token}`,
    },
    { status: 201 },
  );
}
