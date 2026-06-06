---
title: Escalate Missing Product Facts To Host
status: ready-for-agent
labels:
  - ready-for-agent
type: AFK
created: 2026-06-06
---

# Escalate Missing Product Facts To Host

## Parent

Shopee Live Producer MVP PRD: `docs/prd/shopee-live-producer.md`

## What to build

Add the low-confidence product question path. When a buyer asks an appropriate product question that cannot be answered from linked product facts or current session memory, the system should create a host escalation instead of auto-posting a guessed answer.

## Acceptance criteria

- [ ] Missing stock, variant, warranty, refund, delivery, or promotion details are not auto-answered unless present in product facts or session memory.
- [ ] A missing-detail product question creates an escalation visible in the host dashboard.
- [ ] The escalation includes the source comment, matched product when available, and a compact reason.
- [ ] The buyer chat does not receive an invented AI answer for escalated questions.
- [ ] The host can mark an escalation as answered or resolved through a simple interaction.
- [ ] Tests cover missing fact escalation and ensure no buyer-facing hallucinated answer is emitted.

## Blocked by

- `.scratch/shopee-live-producer/003-host-producer-console-with-camera-fallback.md`
- `.scratch/shopee-live-producer/004-deepagent-auto-answers-grounded-product-questions.md`
