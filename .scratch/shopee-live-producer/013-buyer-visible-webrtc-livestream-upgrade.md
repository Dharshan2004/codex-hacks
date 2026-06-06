---
title: Buyer-Visible WebRTC Livestream Upgrade
status: ready-for-agent
labels:
  - ready-for-agent
type: AFK
priority: stretch
created: 2026-06-06
---

# Buyer-Visible WebRTC Livestream Upgrade

## Parent

Shopee Live Producer MVP PRD: `docs/prd/shopee-live-producer.md`

## What to build

Upgrade the fallback video experience so buyers can see the host camera stream through a buyer-visible WebRTC livestream in the same room. This is a stretch slice and must not destabilize the core AI demo; the host-only camera preview and buyer placeholder remain the fallback.

## Acceptance criteria

- [ ] The host can start a buyer-visible livestream for a room.
- [ ] A buyer in the same room can see the host video stream.
- [ ] If WebRTC setup fails, both views fall back cleanly to the existing camera preview and buyer placeholder.
- [ ] Chat, AI replies, escalations, and sales coach prompts continue working while video is active.
- [ ] The UI makes the active video mode clear to the host.
- [ ] Manual verification covers at least one host and one buyer browser session.

## Blocked by

- `.scratch/shopee-live-producer/003-host-producer-console-with-camera-fallback.md`
