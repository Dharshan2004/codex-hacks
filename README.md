# Shopee Live Producer

> An AI backstage producer that watches buyer chat, answers grounded product questions, escalates uncertainty to the host, flags policy risks, and coaches the seller — all in real time.

**Sea × Codex Hackathon 2026**

---

## The Problem

Shopee Live hosts sell, answer questions, keep energy high, and stay policy-safe — all at once. In a busy live chat, hosts miss product questions, repeat the same answers, forget to push promos, and occasionally make unsupported claims. A chatbot that auto-replies to everything makes it worse.

## The Solution

A two-sided live room where an AI **live producer** works _backstage_:

- Buyers type questions in chat — the AI answers grounded, high-confidence ones instantly
- Uncertain questions get escalated to the host with context, not guessed at
- Host answers become **session memory** — repeated questions answer themselves
- Policy-risky comments (medical claims, unsupported guarantees) get flagged before they go public
- A sales coach watches for buyer intent signals and nudges the host on talking points, promos, and spotlight-worthy moments

**The key insight:** the AI is a _producer_, not a _chatbot_. It decides what to say, what to escalate, what to ignore, and what to warn — and it shows its work.

---

## Live Demo

Open two windows and try this script:

| Window | Action |
|--------|--------|
| **Buyer** | `"Does the XM6 support LDAC?"` |
| **Host** | Watch the AI auto-answer with grounded spec facts |
| **Buyer** | `"hello hello hello"` |
| **Host** | No reply fires — spam is silently filtered |
| **Buyer** | `"Do you still have the blue one in stock?"` |
| **Host** | Escalation card appears with the matched product and a reason |
| **Host** | Type an answer → card resolves, fact enters session memory |
| **Buyer** | Ask the stock question again |
| **Host** | AI answers from memory — no host input needed |
| **Buyer** | `"Does the XM6 cure hearing issues?"` |
| **Host** | Policy warning fires — medical claim blocked before it reaches buyers |

---

## What's Built

| Slice | Feature |
|-------|---------|
| 001 | Seller setup — browse seeded catalog, build a stream lineup, get host + buyer links |
| 002 | Real-time comment loop — buyer comments appear in host console live via Supabase Realtime |
| 003 | Host console — live camera preview, chat, lineup, spotlight control |
| 004 | DeepAgent auto-answer — grounded product Q&A posted as labeled AI messages |
| 005 | Spam filter — social chatter and unlinked product questions receive no action |
| 006 | Escalation path — uncertain questions routed to host with product match + reason |
| 007 | Session memory — host answers captured, surfaced for future identical questions |
| 008 | Policy warnings — medical, legal, unsupported-guarantee comments escalated before reply |
| 009 | Sales coach — timer + buyer signal triggered prompts: benefits, promos, FAQs |
| 010 | Activity log — every AI decision logged with a compact rationale |

---

## Architecture

```
Browser (Host Console)          Browser (Buyer View)
        │                               │
        │  POST /api/comments           │
        └───────────────────────────────┤
                                        ▼
                              Next.js API Route
                                        │
                              after() background task
                                        │
                                        ▼
                         Stream Producer DeepAgent
                         ┌──────────────────────────┐
                         │  Comment Triage           │
                         │  Product Context Lookup   │
                         │  Confidence Gate (≥0.8)   │
                         │  Policy Guard             │
                         │  Answer Composer          │
                         │  Session Memory           │
                         │  Sales Coach Engine       │
                         └──────────────────────────┘
                                        │
                              Supabase (Postgres)
                              ┌──────────────────┐
                              │ ai_actions        │
                              │ escalations       │
                              │ session_memories  │
                              │ sales_coach_prompts│
                              └──────────────────┘
                                        │
                           Supabase Realtime (WS)
                                   ╱       ╲
                           Host Console   Buyer View
                           (live update)  (live update)
```

**Key design decisions:**

- **One DeepAgent per stream room** — room state, lineup, session memory, and recent comments all live in a single context so decisions are coherent
- **Grounding gate, not prompt-level guardrails** — `applyGroundingAndConfidenceGate` validates `supportingFactIds` against real database rows before any auto-reply commits
- **Four action classes, not free-form replies** — `auto_reply`, `escalate`, `warn`, `no_action`; the frontend renders each differently so the host always knows the system's intent
- **Session memory is additive, not mutative** — host answers extend the context for a stream but never overwrite the seeded product catalog
- **AI worker runs server-side** — model keys never reach the browser; the browser only subscribes to outcomes via Realtime

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15, App Router, TypeScript, Tailwind v4 |
| Realtime | Supabase Realtime (Postgres-backed WebSocket subscriptions) |
| Database | Supabase Postgres (RLS: buyers can comment; AI writes use the secret key) |
| AI Agent | LangChain DeepAgent, `streamProducerDecisionSchema` structured output |
| Model | OpenAI (configurable via `STREAM_PRODUCER_MODEL`) |
| Tests | Vitest (unit: triage, grounding, memory, sales coach) |

---

## Quick Start

```bash
# 1. Install
npm install

# 2. Configure
cp .env.local.example .env.local
# Fill in NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
# SUPABASE_SECRET_KEY, SUPABASE_DB_URL, OPENAI_API_KEY

# 3. Push schema + seed
npm run db:push

# 4. Run
npm run dev   # http://localhost:3010
```

### Environment variables

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Browser client key (`sb_publishable_…`) |
| `SUPABASE_SECRET_KEY` | Server key — bypasses RLS for AI writes |
| `SUPABASE_DB_URL` | Session pooler URI for migrations (`db:push` only) |
| `OPENAI_API_KEY` | Powers the Stream Producer DeepAgent |
| `STREAM_PRODUCER_MODEL` | Optional override; defaults to `openai:gpt-5.4` |

> Use the **Session pooler** connection string for `SUPABASE_DB_URL` (host like `aws-1-<region>.pooler.supabase.com`). The direct host is IPv6-only on newer projects and won't resolve from IPv4-only networks.

---

## Seeded Catalog

| Product | Price | Key facts |
|---------|-------|-----------|
| Sony WH-1000XM6 | S$559 | LDAC/LC3, 30h ANC / 40h ANC-off, BT 5.3, carrying case |
| Logitech MX Master 3S | S$189 | 8K DPI, glass tracking (≥4mm), MagSpeed scroll, quiet clicks |

Both products include variants, FAQs, shipping notes, promo fields, and a `restricted_claims` list — enough for the agent to answer, escalate, and warn on realistic questions.

---

## Project Structure

```
src/
  app/
    page.tsx                        # Seller setup: catalog → lineup → room
    host/[roomId]/page.tsx          # Host console
    buyer/[token]/page.tsx          # Buyer view
    api/
      rooms/route.ts                # Create room + link lineup
      rooms/[roomId]/spotlight/     # Set/clear spotlight
      comments/route.ts             # Ingest comment → trigger DeepAgent
      escalations/[id]/route.ts     # Host resolves escalation → session memory
  components/
    HostConsole.tsx                 # Main host dashboard
    EscalationsPanel.tsx            # Escalation queue + resolve UI
    SessionMemoryPanel.tsx          # Live memory viewer
    SalesCoachPanel.tsx             # Coach prompt feed
    ActivityLog.tsx                 # AI decision log
    BuyerView.tsx                   # Buyer chat + spotlight
  lib/
    streamProducerAgent.ts          # DeepAgent: classify → decide → emit
    streamProducerProcessor.ts      # Persist AI action / reply / escalation
    salesCoachEngine.ts             # Timer + signal → coach prompt
    hostSpeechAgent.ts              # Host mic transcription (slice 007)
    supabase/{browser,server}.ts    # Supabase clients
    types.ts                        # Shared domain types
supabase/
  migrations/*.sql                  # Schema, RLS, Realtime publication
  seed.sql                          # Catalog seed
```

---

## Tests

```bash
npm test        # Unit tests: agent routing, grounding gate, sales coach, memory
npm run build   # Type-check all routes
```

---

## What Makes This Different From a Chatbot

| Chatbot | Shopee Live Producer |
|---------|---------------------|
| Replies to everything | Classifies first — auto-reply, escalate, warn, or stay silent |
| Invents answers | Grounding gate rejects answers with no supporting fact IDs |
| Forgets between messages | Session memory carries host-confirmed facts forward |
| No host awareness | Escalation queue, policy warnings, and coach prompts go to the host |
| Static knowledge | Learns new facts mid-stream from host answers |
