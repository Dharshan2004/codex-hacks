---
title: Sales Coach Prompt Path
status: completed
labels:
  - ready-for-agent
type: AFK
created: 2026-06-06
---

# Sales Coach Prompt Path

## Parent

Shopee Live Producer MVP PRD: `docs/prd/shopee-live-producer.md`

## What to build

Add host-side Sales Coach prompts as part of the Stream Producer agent system. Prompts should be generated from repeated questions, buyer objections, purchase intent, timer intervals, and active product spotlight changes, then shown to the host without flooding the dashboard.

## Acceptance criteria

- [x] The host can see sales coach prompts in the producer console.
- [x] Repeated buyer questions or concerns can trigger a relevant prompt.
- [x] Purchase-intent comments can trigger a relevant prompt.
- [x] A timer-based trigger can create a prompt every configured interval during an active stream.
- [x] Changing the spotlight product can trigger product-specific talking points.
- [x] Sales coach prompts do not fire on every comment.
- [x] Tests cover repeated-question, purchase-intent, timer, and spotlight triggers.

## Blocked by

- `.scratch/shopee-live-producer/003-host-producer-console-with-camera-fallback.md`
- `.scratch/shopee-live-producer/004-deepagent-auto-answers-grounded-product-questions.md`
