---
title: Buyer-To-Host Realtime Comment Loop
status: ready-for-agent
labels:
  - ready-for-agent
type: AFK
created: 2026-06-06
---

# Buyer-To-Host Realtime Comment Loop

## Parent

Shopee Live Producer MVP PRD: `docs/prd/shopee-live-producer.md`

## What to build

Add the first live interaction loop: a buyer submits a comment from the buyer view, the comment is stored for the active room, and the host dashboard receives it in real time. This should prove the shared room model and live update mechanism before AI behavior is added.

## Acceptance criteria

- [ ] A buyer can enter a display name or use a generated demo name.
- [ ] A buyer can submit a text comment into a room.
- [ ] The submitted comment appears in the buyer chat transcript.
- [ ] The same comment appears in the host dashboard without a manual refresh.
- [ ] Comments are scoped to the correct room and do not leak into other rooms.
- [ ] Tests or a documented verification flow cover comment submission and host/buyer synchronization.

## Blocked by

- `.scratch/shopee-live-producer/001-bootstrap-stream-room-setup.md`
