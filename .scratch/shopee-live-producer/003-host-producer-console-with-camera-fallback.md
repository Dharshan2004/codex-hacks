---
title: Host Producer Console With Camera Fallback
status: ready-for-agent
labels:
  - ready-for-agent
type: AFK
created: 2026-06-06
---

# Host Producer Console With Camera Fallback

## Parent

Shopee Live Producer MVP PRD: `docs/prd/shopee-live-producer.md`

## What to build

Build the host-facing producer console around the live room. The console should show the host camera preview, live chat, active AI action area, linked product lineup, and a livestream-style fallback state for buyer-visible video. This slice establishes the host work surface before advanced agent outputs are wired in.

## Acceptance criteria

- [ ] The host dashboard loads a room and displays its linked products.
- [ ] The host dashboard shows the live chat stream from the room.
- [ ] The host can enable a real local camera preview in the dashboard.
- [ ] If camera access is unavailable or denied, the UI degrades cleanly without blocking chat or product controls.
- [ ] The dashboard reserves visible space for AI actions, escalations, sales coach prompts, and activity log outputs.
- [ ] The buyer view has a livestream-style video area that works as the fallback when buyer-visible livestreaming is not implemented.
- [ ] UI verification covers the host dashboard and buyer fallback video state.

## Blocked by

- `.scratch/shopee-live-producer/001-bootstrap-stream-room-setup.md`
- `.scratch/shopee-live-producer/002-buyer-to-host-realtime-comment-loop.md`
