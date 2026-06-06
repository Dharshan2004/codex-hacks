import { NextResponse } from "next/server";

import { getServiceSupabase } from "@/lib/supabase/server";
import type { Room } from "@/lib/types";

// PATCH /api/rooms/:roomId/spotlight
// Body: { productId: string | null }
// Sets (or clears) the room's spotlight product. The product must be linked to
// the room's lineup. Realtime on `rooms` delivers the change to all views.
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ roomId: string }> },
) {
  const { roomId } = await params;

  let body: { productId?: string | null };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const productId = body.productId ?? null;
  const supabase = getServiceSupabase();

  // If setting a product, ensure it's actually in this room's lineup.
  if (productId) {
    const { data: link, error: linkError } = await supabase
      .from("stream_products")
      .select("id")
      .eq("room_id", roomId)
      .eq("product_id", productId)
      .maybeSingle();
    if (linkError) {
      return NextResponse.json({ error: linkError.message }, { status: 500 });
    }
    if (!link) {
      return NextResponse.json(
        { error: "Product is not part of this room's lineup." },
        { status: 400 },
      );
    }
  }

  const { data: room, error } = await supabase
    .from("rooms")
    .update({ spotlight_product_id: productId })
    .eq("id", roomId)
    .select("*")
    .maybeSingle();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!room) {
    return NextResponse.json({ error: "Room not found." }, { status: 404 });
  }

  return NextResponse.json({ room: room as Room });
}
