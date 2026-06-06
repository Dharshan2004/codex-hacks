---
title: Judge Demo Script And E2E Verification
status: ready-for-agent
labels:
  - ready-for-agent
type: AFK
created: 2026-06-06
---

# Judge Demo Script And E2E Verification

## Parent

Shopee Live Producer MVP PRD: `docs/prd/shopee-live-producer.md`

## What to build

Create the final demo script and verification path for the hackathon. A teammate or judge should be able to run through setup, buyer comments, auto-answering, ignored spam, escalation, session memory, policy warning, and sales coach prompt in a short, reliable sequence.

## Acceptance criteria

- [ ] A documented demo script covers setup, normal auto-answer, spam ignore, missing-detail escalation, host answer memory, repeated question auto-answer, policy warning, and sales coach prompt.
- [ ] Seed data includes or supports the comments needed for the demo script.
- [ ] An end-to-end test or scripted verification covers the main demo path.
- [ ] The demo can be reset to a clean room state.
- [ ] The product facts and promo values shown in the demo are internally consistent.
- [ ] The team can run the demo without relying on external product pages during judging.

## Blocked by

- `.scratch/shopee-live-producer/005-ignore-spam-chatter-and-unlinked-product-comments.md`
- `.scratch/shopee-live-producer/007-learn-session-memory-from-host-answers.md`
- `.scratch/shopee-live-producer/008-policy-risk-warning-path.md`
- `.scratch/shopee-live-producer/009-sales-coach-prompt-path.md`
- `.scratch/shopee-live-producer/010-activity-log-with-compact-rationales.md`
