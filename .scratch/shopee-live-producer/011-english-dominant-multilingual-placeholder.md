---
title: English-Dominant Multilingual Placeholder
status: ready-for-agent
labels:
  - ready-for-agent
type: AFK
created: 2026-06-06
---

# English-Dominant Multilingual Placeholder

## Parent

Shopee Live Producer MVP PRD: `docs/prd/shopee-live-producer.md`

## What to build

Keep the MVP English-dominant while leaving a visible path for multilingual support. The system may label comments that appear non-English or show a placeholder translation state, but buyer-facing AI replies should remain English unless full multilingual generation is explicitly added later.

## Acceptance criteria

- [ ] English comments continue through the normal AI routing flow.
- [ ] Non-English-looking comments can be labeled or marked as translation pending when detected.
- [ ] The host dashboard can display the language/translation placeholder without breaking the AI action flow.
- [ ] Buyer-facing replies remain English for MVP.
- [ ] The multilingual placeholder is visually secondary and does not distract from the main demo.
- [ ] Tests or verification cover English comments and at least one non-English placeholder case.

## Blocked by

- `.scratch/shopee-live-producer/002-buyer-to-host-realtime-comment-loop.md`
- `.scratch/shopee-live-producer/004-deepagent-auto-answers-grounded-product-questions.md`
