---
title: DeepAgent Auto-Answers Grounded Product Questions
status: ready-for-agent
labels:
  - ready-for-agent
type: AFK
created: 2026-06-06
---

# DeepAgent Auto-Answers Grounded Product Questions

## Parent

Shopee Live Producer MVP PRD: `docs/prd/shopee-live-producer.md`

## What to build

Implement the first Stream Producer DeepAgent path: when a buyer asks a high-confidence product question about a linked product, the backend produces a grounded buyer-facing answer and auto-posts it into chat as an AI assistant message. The answer must use only linked product facts and confirmed session memory, with no invented details.

## Acceptance criteria

- [ ] A backend AI worker or equivalent backend process receives new buyer comments for processing.
- [ ] A Stream Producer DeepAgent or agent-compatible abstraction can classify a straightforward linked-product question.
- [ ] The product context lookup only exposes products linked to the active stream lineup.
- [ ] High-confidence answerable questions produce a structured AI action.
- [ ] The buyer chat shows the answer as an AI assistant message, not as a host-authored message.
- [ ] The host dashboard shows that an AI answer was posted.
- [ ] Unit tests cover product grounding and confidence gating for high-confidence product questions.

## Blocked by

- `.scratch/shopee-live-producer/001-bootstrap-stream-room-setup.md`
- `.scratch/shopee-live-producer/002-buyer-to-host-realtime-comment-loop.md`
