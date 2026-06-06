# Shopee Live Producer

AI live-producer demo for Shopee Live, built for the Sea X Codex Hackathon.
A seller links products into a stream lineup, then a **host console** and a
**buyer view** share one live room in real time.

Slices implemented so far:

- **001 — Bootstrap stream room setup with seeded catalog**: browse a seeded
  catalog (Sony WH-1000XM6, Logitech MX Master 3S, SGD pricing), select a
  lineup, create a room, and get host + buyer links.
- **002 — Buyer→host realtime comment loop**: buyers post comments that appear
  in both the buyer transcript and the host console live, scoped per room.
- **003 — Host producer console with camera fallback**: real local camera
  preview that degrades cleanly, live chat, product lineup with spotlight
  control, a buyer-side livestream-style video placeholder, and reserved space
  for the AI work surface (actions / escalations / coach / log / memory) that
  later slices fill in.
- **004 — DeepAgent auto-answers grounded product questions**: a LangChain
  Stream Producer DeepAgent classifies new buyer comments and auto-posts a
  transparent AI assistant reply only when a linked-product answer clears the
  confidence + grounding gate. Needs `OPENAI_API_KEY`.
- **006 — Escalate missing product facts to host**: appropriate product
  questions the agent can't answer from linked facts or session memory become
  host escalations (no invented buyer answer) that the host can answer/resolve
  from the console.

## Tech stack

- **Next.js 15** (App Router, TypeScript, Tailwind v4)
- **Supabase** — Postgres for persistence, Supabase Realtime for live updates
- **Vitest** for unit tests

Architecture: server routes use the Supabase **secret key** (bypasses RLS) for
privileged writes (create room, set spotlight). The browser uses the
**publishable key** for reads + realtime subscriptions, and may insert buyer
comments (allowed by RLS). This keeps destructive writes server-side.

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

Copy the example and fill in your hosted Supabase credentials:

```bash
cp .env.local.example .env.local
```

| Variable | Where to find it | Used by |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Project Settings → API | browser + server |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Project Settings → API Keys (`sb_publishable_…`) | browser |
| `SUPABASE_SECRET_KEY` | Project Settings → API Keys (`sb_secret_…`) | server routes |
| `OPENAI_API_KEY` | OpenAI platform API key | Stream Producer DeepAgent |
| `STREAM_PRODUCER_MODEL` | Optional LangChain model string, defaults to `openai:gpt-5.4` | Stream Producer DeepAgent |
| `SUPABASE_DB_URL` | Project Settings → Database → **Session pooler** URI | `npm run db:push` only |

> Use the **Session pooler** connection string (host like
> `aws-1-<region>.pooler.supabase.com`, user `postgres.<project-ref>`). The
> direct `db.<ref>.supabase.co` host is IPv6-only on newer projects and won't
> resolve from IPv4-only networks.

> Legacy JWT keys also work: `NEXT_PUBLIC_SUPABASE_ANON_KEY` and
> `SUPABASE_SERVICE_ROLE_KEY` are accepted as fallbacks.

### 3. Apply the schema + seed

```bash
npm run db:push
```

This runs `supabase/migrations/*.sql` (tables, indexes, RLS, realtime
publication) then `supabase/seed.sql` (the two seed products). It's
re-runnable. If you prefer the Supabase SQL editor, paste those files in order.

### 4. Run the app

```bash
npm run dev      # http://localhost:3010
```

## Verification (acceptance criteria)

### 001 — Setup
1. Open `http://localhost:3010`. You should see the seeded catalog (Sony
   WH-1000XM6 and Logitech MX Master 3S with S$ prices).
2. Click one or more products to add them to the lineup; set a title.
3. Click **Create stream room** → you get a **host console** link and a
   **buyer view** link.
4. Open the buyer link: it shows only the products you linked.

### 002 — Realtime comment loop
1. Open the host console and the buyer view side by side (two windows/tabs).
2. In the buyer view, choose a name (or 🎲 random) and submit a comment.
3. The comment appears in the buyer transcript **and** in the host console
   live chat **without refreshing**.
4. Type a host reply in the console — it appears in the buyer view live.
5. Open a *different* room's buyer link: comments do not leak across rooms.

### 003 — Host console + camera fallback
1. In the host console, click **Enable camera** → a real local preview shows.
   Deny permission (or use a browser without a camera) → the UI shows a clean
   fallback and chat/products keep working.
2. The console reserves labelled space for AI actions, escalations, sales
   coach, activity log, and session memory.
3. Spotlight a product in the lineup → the buyer view's livestream-style video
   area updates the featured product live.
4. The buyer view shows a livestream-style video placeholder (fallback for the
   buyer-visible WebRTC upgrade in slice 013).

### 006 — Escalate missing product facts
1. With `OPENAI_API_KEY` set, open the host console and a buyer view side by
   side.
2. As the buyer, ask a product question whose answer isn't in the seed facts —
   e.g. *"Do you still have the blue one in stock?"* (stock by colour isn't a
   linked fact).
3. The buyer chat receives **no** AI answer. In the host console, an
   **Escalations** card appears with the buyer's comment, the matched product,
   and a compact reason.
4. Type an answer in the card and click **Mark answered** → the card flips to
   *Resolved* and shows your answer (and would persist for the stream).
5. A clearly answerable question (e.g. *"Does the XM6 support LDAC?"*) still
   auto-answers instead of escalating.

### Tests

```bash
npm test        # unit tests for pricing, stock, demo names, buyer tokens
npm run build   # type-checks every route + builds
```

## Project structure

```
src/
  app/
    page.tsx                       # 001 setup page
    host/[roomId]/page.tsx         # 003 host console
    buyer/[token]/page.tsx         # 002/003 buyer view
    api/
      rooms/route.ts               # create room + link lineup
      rooms/[roomId]/spotlight/    # set/clear spotlight product
      comments/route.ts            # post a comment (triggers the DeepAgent)
      escalations/[id]/route.ts    # host answers/resolves an escalation (006)
  components/                      # UI + realtime hooks
  lib/
    streamProducerAgent.ts         # 004/006 DeepAgent: classify + decide
    streamProducerProcessor.ts     # persist AI action / assistant reply / escalation
    supabase/{browser,server}.ts   # Supabase clients (publishable / secret)
    rooms.ts                       # server-side room data access
    types.ts                       # shared domain types
supabase/
  migrations/*.sql                 # schema + RLS + realtime publication
  seed.sql                         # seeded catalog
scripts/db-push.mjs                # apply migrations + seed to hosted Supabase
```
