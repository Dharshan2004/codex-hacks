---
title: Bootstrap Stream Room Setup With Seeded Catalog
status: ready-for-agent
labels:
  - ready-for-agent
type: HITL
created: 2026-06-06
---

# Bootstrap Stream Room Setup With Seeded Catalog

## Parent

Shopee Live Producer MVP PRD: `docs/prd/shopee-live-producer.md`

## What to build

Create the first end-to-end setup path for a seller to select seeded products from a catalog, create a stream room, and receive host and buyer links for that room. The seed catalog should include Sony WH-1000XM6 headphones and Logitech MX Master 3S mouse with SGD pricing, official-spec-inspired facts, and demo seller fields such as stock, vouchers, shipping notes, return notes, FAQs, and restricted claims.

This slice is HITL because the team must confirm the app framework, Supabase project, environment variables, and deployment assumptions before agents can safely build on it.

## Acceptance criteria

- [ ] A seller can open the setup experience and see the seeded catalog.
- [ ] A seller can select one or more catalog products into a stream lineup.
- [ ] Creating a stream produces a room with a host link and buyer link.
- [ ] The buyer view for the room shows only the linked stream lineup products.
- [ ] Room, catalog product, and stream product state is persisted in the chosen Supabase-backed data model or a documented local fallback.
- [ ] Basic tests or verification steps prove a room can be created and loaded by both host and buyer views.

## Blocked by

None - can start immediately.
