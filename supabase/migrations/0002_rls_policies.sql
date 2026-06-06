-- Row Level Security for the demo.
--
-- Model: the browser (anon key) may READ all room-scoped data and INSERT
-- buyer comments. All privileged writes (creating rooms, linking products,
-- posting host/assistant messages, AI outcomes) go through Next.js server
-- routes using the service_role key, which bypasses RLS entirely.
--
-- This keeps the buyer/host pages able to subscribe via Realtime (which
-- requires a SELECT policy) without exposing destructive writes to the client.

alter table public.catalog_products   enable row level security;
alter table public.rooms               enable row level security;
alter table public.stream_products     enable row level security;
alter table public.comments            enable row level security;
alter table public.ai_actions          enable row level security;
alter table public.escalations         enable row level security;
alter table public.session_memories    enable row level security;
alter table public.sales_coach_prompts enable row level security;

-- Public read access for all demo tables (anon + authenticated).
do $$
declare
  t text;
begin
  foreach t in array array[
    'catalog_products', 'rooms', 'stream_products', 'comments',
    'ai_actions', 'escalations', 'session_memories', 'sales_coach_prompts'
  ]
  loop
    execute format(
      'create policy %I on public.%I for select using (true);',
      t || '_read', t
    );
  end loop;
end $$;

-- The only client-side write we allow: buyers posting comments.
create policy comments_insert_buyer on public.comments
  for insert
  with check (sender_role = 'buyer');
