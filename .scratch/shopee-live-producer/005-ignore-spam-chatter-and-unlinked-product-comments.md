---
title: Ignore Spam, Chatter, And Unlinked Product Comments
status: ready-for-agent
labels:
  - ready-for-agent
type: AFK
created: 2026-06-06
---

# Ignore Spam, Chatter, And Unlinked Product Comments

## Parent

Shopee Live Producer MVP PRD: `docs/prd/shopee-live-producer.md`

## What to build

Extend the comment router so the Stream Producer does not reply to every message. Random chatter, obvious spam, and questions about products outside the stream lineup should receive no buyer-facing AI reply in MVP while still being represented internally as ignored/no-action events when useful for debugging.

## Acceptance criteria

- [ ] Spam and random social chatter do not create buyer-facing AI replies.
- [ ] Questions about unlinked products do not create buyer-facing AI replies in MVP.
- [ ] Ignored comments do not appear in the host AI action queue as urgent work.
- [ ] Optional no-action events can be recorded for logs without cluttering the main host workflow.
- [ ] Tests cover spam, social chatter, and unlinked-product inputs.
- [ ] The judge demo can show a spam comment being ignored while normal product questions still work.

## Blocked by

- `.scratch/shopee-live-producer/004-deepagent-auto-answers-grounded-product-questions.md`
