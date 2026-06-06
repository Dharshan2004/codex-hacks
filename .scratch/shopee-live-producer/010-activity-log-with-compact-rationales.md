---
title: Activity Log With Compact Rationales
status: ready-for-agent
labels:
  - ready-for-agent
type: AFK
created: 2026-06-06
---

# Activity Log With Compact Rationales

## Parent

Shopee Live Producer MVP PRD: `docs/prd/shopee-live-producer.md`

## What to build

Add a secondary host activity log showing what the AI did for each relevant comment: auto-posted, escalated, ignored, warned, learned memory, or produced a sales coach prompt. The log should contain short rationale labels and timestamps, not verbose model reasoning.

## Acceptance criteria

- [ ] Auto-posted AI replies create activity log entries.
- [ ] Ignored/no-action comments can create low-priority log entries without cluttering the main queue.
- [ ] Escalations and policy warnings create activity log entries.
- [ ] Sales coach prompts create activity log entries.
- [ ] Memory creation creates activity log entries.
- [ ] Log entries include timestamp, action type, source comment when relevant, and compact rationale.
- [ ] Logs do not expose chain-of-thought or verbose hidden reasoning.
- [ ] Tests or UI verification cover log entries for each major action type.

## Blocked by

- `.scratch/shopee-live-producer/004-deepagent-auto-answers-grounded-product-questions.md`
- `.scratch/shopee-live-producer/005-ignore-spam-chatter-and-unlinked-product-comments.md`
- `.scratch/shopee-live-producer/006-escalate-missing-product-facts-to-host.md`
- `.scratch/shopee-live-producer/008-policy-risk-warning-path.md`
- `.scratch/shopee-live-producer/009-sales-coach-prompt-path.md`
