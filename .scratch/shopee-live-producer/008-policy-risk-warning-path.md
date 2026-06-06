---
title: Policy-Risk Warning Path
status: ready-for-agent
labels:
  - ready-for-agent
type: AFK
created: 2026-06-06
---

# Policy-Risk Warning Path

## Parent

Shopee Live Producer MVP PRD: `docs/prd/shopee-live-producer.md`

## What to build

Add a policy guard path for risky or unsupported claims. When a buyer asks for medical, hearing-health, legal, financial, guaranteed-result, fake-discount, refund, warranty, or safety claims that should not be auto-answered, the host dashboard should show a warning and safe handling guidance instead of posting an AI answer to buyers.

## Acceptance criteria

- [ ] Risky comments are detected before any buyer-facing auto-answer is posted.
- [ ] A policy-risk comment creates a host-visible warning.
- [ ] The warning includes the source comment, risk category, and a compact safe-response suggestion when appropriate.
- [ ] Buyer chat does not receive unsupported risky claims.
- [ ] Tests cover hearing-health claims, guaranteed-result claims, refund or warranty overpromises, and fake discount claims.
- [ ] The judge demo can show a risky claim warning branch.

## Blocked by

- `.scratch/shopee-live-producer/003-host-producer-console-with-camera-fallback.md`
- `.scratch/shopee-live-producer/004-deepagent-auto-answers-grounded-product-questions.md`
