-- Shopee Live Producer — initial schema
-- Covers issues 001 (catalog/rooms/stream_products), 002 (comments + realtime),
-- and 003 (room video_mode / spotlight). Tables for slices 004+ (ai_actions,
-- escalations, session_memories, sales_coach_prompts) are created now so the
-- realtime contracts are stable; they stay empty until those slices land.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Catalog products: the seller's seeded inventory.
-- Official specs are seed truth; price/stock/vouchers/etc. are demo seller fields.
-- ---------------------------------------------------------------------------
create table if not exists public.catalog_products (
  id              uuid primary key default gen_random_uuid(),
  slug            text unique not null,
  name            text not null,
  brand           text,
  category        text,
  currency        text not null default 'SGD',
  price           numeric(10, 2) not null,
  original_price  numeric(10, 2),
  image_emoji     text,                       -- lightweight stand-in for product imagery
  official_specs  jsonb not null default '[]'::jsonb,  -- [{label, value}]
  variants        jsonb not null default '[]'::jsonb,  -- [{name, options[]}]
  stock           jsonb not null default '{}'::jsonb,  -- {variant: count}
  seller_notes    text,
  shipping_notes  text,
  return_notes    text,
  vouchers        jsonb not null default '[]'::jsonb,  -- [{code, description}]
  promotions      jsonb not null default '[]'::jsonb,  -- [{label, description}]
  faqs            jsonb not null default '[]'::jsonb,  -- [{q, a}]
  restricted_claims jsonb not null default '[]'::jsonb, -- [string] claims AI must never make
  created_at      timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Rooms: one live stream session.
-- ---------------------------------------------------------------------------
create table if not exists public.rooms (
  id            uuid primary key default gen_random_uuid(),
  title         text not null,
  seller_name   text not null default 'Demo Seller',
  status        text not null default 'live',   -- live | ended
  buyer_token   text unique not null,           -- opaque token used in the buyer URL
  video_mode    text not null default 'camera_fallback', -- camera_fallback | webrtc
  spotlight_product_id uuid references public.catalog_products(id),
  created_at    timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Stream products: which catalog products are linked into a room's lineup.
-- ---------------------------------------------------------------------------
create table if not exists public.stream_products (
  id              uuid primary key default gen_random_uuid(),
  room_id         uuid not null references public.rooms(id) on delete cascade,
  product_id      uuid not null references public.catalog_products(id),
  display_order   integer not null default 0,
  pinned          boolean not null default false,
  created_at      timestamptz not null default now(),
  unique (room_id, product_id)
);

-- ---------------------------------------------------------------------------
-- Comments: buyer/host/assistant chat messages, scoped to a room.
-- ---------------------------------------------------------------------------
create table if not exists public.comments (
  id                uuid primary key default gen_random_uuid(),
  room_id           uuid not null references public.rooms(id) on delete cascade,
  sender_role       text not null default 'buyer',   -- buyer | host | assistant | system
  buyer_display_name text,
  body              text not null,
  language_label    text default 'en',
  moderation_status text not null default 'visible',  -- visible | hidden
  created_at        timestamptz not null default now()
);

create index if not exists comments_room_id_created_at_idx
  on public.comments (room_id, created_at);

-- ---------------------------------------------------------------------------
-- Tables for later AI slices (004+). Created now for stable contracts.
-- ---------------------------------------------------------------------------
create table if not exists public.ai_actions (
  id                uuid primary key default gen_random_uuid(),
  room_id           uuid not null references public.rooms(id) on delete cascade,
  source_comment_id uuid references public.comments(id),
  action_type       text not null,        -- auto_reply | escalate | warn | ignore | coach | memory
  product_id        uuid references public.catalog_products(id),
  confidence        numeric(4, 3),
  buyer_message     text,
  host_summary      text,
  rationale_label   text,
  created_at        timestamptz not null default now()
);
create index if not exists ai_actions_room_id_created_at_idx
  on public.ai_actions (room_id, created_at);

create table if not exists public.escalations (
  id                uuid primary key default gen_random_uuid(),
  room_id           uuid not null references public.rooms(id) on delete cascade,
  source_comment_id uuid references public.comments(id),
  product_id        uuid references public.catalog_products(id),
  reason            text,
  status            text not null default 'open',  -- open | answered
  host_answer       text,
  resolved_at       timestamptz,
  created_at        timestamptz not null default now()
);
create index if not exists escalations_room_id_created_at_idx
  on public.escalations (room_id, created_at);

create table if not exists public.session_memories (
  id            uuid primary key default gen_random_uuid(),
  room_id       uuid not null references public.rooms(id) on delete cascade,
  memory_text   text not null,
  source_event  text,
  confidence    numeric(4, 3),
  status        text not null default 'active',  -- active | dismissed
  created_at    timestamptz not null default now()
);
create index if not exists session_memories_room_id_idx
  on public.session_memories (room_id);

create table if not exists public.sales_coach_prompts (
  id            uuid primary key default gen_random_uuid(),
  room_id       uuid not null references public.rooms(id) on delete cascade,
  trigger_type  text not null,         -- timer | repeated | intent | spotlight
  product_id    uuid references public.catalog_products(id),
  prompt_text   text not null,
  status        text not null default 'new',  -- new | used | dismissed
  created_at    timestamptz not null default now()
);
create index if not exists sales_coach_prompts_room_id_created_at_idx
  on public.sales_coach_prompts (room_id, created_at);

-- ---------------------------------------------------------------------------
-- Realtime: broadcast row changes for the live-updating tables.
-- ---------------------------------------------------------------------------
alter publication supabase_realtime add table public.comments;
alter publication supabase_realtime add table public.rooms;
alter publication supabase_realtime add table public.stream_products;
alter publication supabase_realtime add table public.ai_actions;
alter publication supabase_realtime add table public.escalations;
alter publication supabase_realtime add table public.session_memories;
alter publication supabase_realtime add table public.sales_coach_prompts;
