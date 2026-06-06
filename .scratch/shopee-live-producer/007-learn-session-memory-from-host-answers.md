---
title: Learn Session Memory From Host Answers
status: ready-for-agent
labels:
  - ready-for-agent
type: AFK
created: 2026-06-06
---

# Learn Session Memory From Host Answers

## Parent

Shopee Live Producer MVP PRD: `docs/prd/shopee-live-producer.md`

## What to build

Let host answers to escalated questions become current-stream session memory. Later similar buyer questions should be eligible for higher-confidence auto-answering using that confirmed live context, while the official seeded catalog remains unchanged.

## Acceptance criteria

- [ ] A host can answer a product escalation in the host dashboard.
- [ ] The host answer can be stored as a session-scoped memory.
- [ ] Session memory is visible in a simple live memory panel.
- [ ] Later similar questions can use active session memory as grounding for an AI assistant reply.
- [ ] Session memory does not mutate the seeded catalog product facts.
- [ ] A memory can be dismissed or marked inactive if the UI scope allows.
- [ ] Tests cover memory creation, retrieval, stream scoping, and repeated-question answering from memory.

## Blocked by

- `.scratch/shopee-live-producer/006-escalate-missing-product-facts-to-host.md`
