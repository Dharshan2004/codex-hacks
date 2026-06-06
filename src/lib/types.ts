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

// Lifecycle of AI processing for a comment.
//  none       -> not AI-processed (host/system/assistant messages)
//  processing -> a buyer comment the DeepAgent is currently working on
//  done       -> processing finished (replied, ignored, or escalated)
export type AiStatus = "none" | "processing" | "done";

export interface Comment {
  id: string;
  room_id: string;
  sender_role: SenderRole;
  buyer_display_name: string | null;
  body: string;
  language_label: string | null;
  moderation_status: ModerationStatus;
  ai_status: AiStatus;
  // For an assistant reply, the buyer comment it answers (null otherwise).
  reply_to_comment_id: string | null;
  created_at: string;
}

export type AiActionType =
  | "auto_reply"
  | "escalate"
  | "warn"
  | "ignore"
  | "coach"
  | "memory";

export interface AiAction {
  id: string;
  room_id: string;
  source_comment_id: string | null;
  action_type: AiActionType;
  product_id: string | null;
  confidence: number | null;
  buyer_message: string | null;
  host_summary: string | null;
  rationale_label: string | null;
  created_at: string;
}

export type EscalationStatus = "open" | "answered";

export interface Escalation {
  id: string;
  room_id: string;
  source_comment_id: string | null;
  product_id: string | null;
  reason: string | null;
  status: EscalationStatus;
  host_answer: string | null;
  resolved_at: string | null;
  created_at: string;
}

export type SalesCoachTriggerType =
  | "timer"
  | "repeated"
  | "intent"
  | "spotlight"
  | "chat";
export type SalesCoachPromptStatus = "new" | "used" | "dismissed";

export interface SalesCoachPrompt {
  id: string;
  room_id: string;
  trigger_type: SalesCoachTriggerType;
  product_id: string | null;
  prompt_text: string;
  status: SalesCoachPromptStatus;
  created_at: string;
}

export type SessionMemoryStatus = "active" | "dismissed";

export interface SessionMemory {
  id: string;
  room_id: string;
  memory_text: string;
  source_event: string | null;
  confidence: number | null;
  status: SessionMemoryStatus;
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
