// Shared domain types for the Shopee Live Producer demo.
// These mirror the Supabase schema in supabase/migrations/0001_initial_schema.sql.

export type SpecItem = { label: string; value: string };
export type VariantGroup = { name: string; options: string[] };
export type Voucher = { code: string; description: string };
export type Promotion = { label: string; description: string };
export type Faq = { q: string; a: string };

export interface CatalogProduct {
  id: string;
  slug: string;
  name: string;
  brand: string | null;
  category: string | null;
  currency: string;
  price: number;
  original_price: number | null;
  image_emoji: string | null;
  official_specs: SpecItem[];
  variants: VariantGroup[];
  stock: Record<string, number>;
  seller_notes: string | null;
  shipping_notes: string | null;
  return_notes: string | null;
  vouchers: Voucher[];
  promotions: Promotion[];
  faqs: Faq[];
  restricted_claims: string[];
  created_at: string;
}

export type VideoMode = "camera_fallback" | "webrtc";
export type RoomStatus = "live" | "ended";

export interface Room {
  id: string;
  title: string;
  seller_name: string;
  status: RoomStatus;
  buyer_token: string;
  video_mode: VideoMode;
  spotlight_product_id: string | null;
  created_at: string;
}

export interface StreamProduct {
  id: string;
  room_id: string;
  product_id: string;
  display_order: number;
  pinned: boolean;
  created_at: string;
}

export type SenderRole = "buyer" | "host" | "assistant" | "system";
export type ModerationStatus = "visible" | "hidden";

export interface Comment {
  id: string;
  room_id: string;
  sender_role: SenderRole;
  buyer_display_name: string | null;
  body: string;
  language_label: string | null;
  moderation_status: ModerationStatus;
  created_at: string;
}

// A stream_products row joined with its catalog product — what views render.
export interface LineupItem extends StreamProduct {
  product: CatalogProduct;
}

// Full room snapshot returned by the room-state API and rendered by host/buyer.
export interface RoomState {
  room: Room;
  lineup: LineupItem[];
}
