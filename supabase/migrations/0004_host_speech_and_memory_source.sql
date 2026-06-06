-- Issue 007 + host-microphone feature.
--
-- host_speech: a log of transcribed host/seller speech segments. Each segment
-- is classified by the Stream Producer DeepAgent into one of:
--   context     -> useful product context; promoted to session memory
--   false_claim -> contradicts linked catalog facts; flagged + corrected
--   chatter     -> no action (greetings, filler)
-- This keeps an auditable record of what the mic captured and what the AI did.

create table if not exists public.host_speech (
  id              uuid primary key default gen_random_uuid(),
  room_id         uuid not null references public.rooms(id) on delete cascade,
  transcript      text not null,
  classification  text not null default 'pending', -- pending | context | false_claim | chatter
  product_id      uuid references public.catalog_products(id),
  note            text,                              -- compact rationale (no chain-of-thought)
  created_at      timestamptz not null default now()
);

create index if not exists host_speech_room_id_created_at_idx
  on public.host_speech (room_id, created_at);

-- session_memories already exists (migration 0001). Record where a memory came
-- from so the live memory panel can label it (host_answer | host_speech).
-- source_event is already a column; no change needed, just documented here.

alter publication supabase_realtime add table public.host_speech;

alter table public.host_speech enable row level security;

create policy host_speech_read on public.host_speech
  for select using (true);
