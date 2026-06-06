---
title: Shopee Live Producer MVP
status: ready-for-agent
labels:
  - ready-for-agent
created: 2026-06-06
context: Sea X Codex Hackathon
---

# Shopee Live Producer MVP PRD

## Problem Statement

Shopee Live hosts and affiliates need to sell, answer buyer questions, keep energy high, and avoid risky claims while a livestream is happening. In a busy live chat, hosts can miss important product questions, repeat the same answers, forget to mention vouchers or product benefits, and accidentally make claims that are unsupported by product information or marketplace policy.

For the Sea X Codex Hackathon, the team needs a focused fragment of this product that can be demoed convincingly without full Shopee platform integration. The fragment must prove the core idea: when a seller links products before going live, an AI live producer can use that product context to answer buyers faster, escalate uncertain questions, ignore spam, remember confirmed live context, and coach the host in real time.

## Solution

Build a two-sided live room demo called Shopee Live Producer.

Before the stream, the seller selects products from a seeded seller catalog into a stream lineup. The initial seeded catalog uses Sony WH-1000XM6 headphones and Logitech MX Master 3S mouse with Singapore pricing and official product specs, plus demo seller fields such as stock, vouchers, shipping, and stream-specific promos.

During the stream, a buyer view lets judges or teammates submit live comments into the room. A host view shows a real camera preview, live chat, AI actions, escalations, product lineup, live memory, sales coach prompts, and an activity log.

The backend receives comments through Supabase Realtime, runs a Stream Producer DeepAgent, and writes AI outcomes back to Supabase. High-confidence, product-grounded answers are auto-posted as transparent AI assistant messages in buyer chat. Low-confidence but appropriate product questions are escalated to the host. Spam, random chatter, and unlinked product questions receive no action. Risky or unsupported claims are escalated with warnings. Host answers can be captured as session memory so repeated questions can be answered with higher confidence later in the same stream.

The demo should optimize for a working, pitch-ready web app. The DeepAgents architecture should be visible through behavior, logs, and an architecture explanation, but the judged experience should feel like a real live producer console.

## User Stories

1. As a seller, I want to select products from a seeded catalog before starting a stream, so that the AI assistant only answers using products I am actually selling live.
2. As a seller, I want to see Sony WH-1000XM6 headphones in the catalog, so that I can use a familiar premium electronics product in the demo.
3. As a seller, I want to see Logitech MX Master 3S in the catalog, so that I can demonstrate product Q&A across more than one electronics category.
4. As a seller, I want the catalog to include Singapore prices, so that the demo feels locally relevant to Sea and Shopee.
5. As a seller, I want catalog products to include variants, stock, shipping notes, vouchers, and FAQs, so that the AI has enough grounded context to answer buyer questions.
6. As a seller, I want to create a stream room from my selected lineup, so that buyers can join the same live session.
7. As a seller, I want a buyer link for the stream room, so that a judge or teammate can join as a buyer during the demo.
8. As a buyer, I want to open the buyer link, so that I can watch the demo stream and submit live comments.
9. As a buyer, I want to see the linked stream products, so that I know what the host is selling.
10. As a buyer, I want to ask a product question in chat, so that I can get help without waiting for the host to manually respond.
11. As a buyer, I want high-confidence AI answers to appear quickly in chat, so that the live shopping experience feels responsive.
12. As a buyer, I want AI answers to be labeled as AI assistant messages, so that I understand the answer was AI-assisted.
13. As a buyer, I want answers to be concise and shopping-oriented, so that I can make a faster purchase decision.
14. As a buyer, I want the assistant to answer questions about compatibility, features, stock, variants, and promos, so that I can evaluate the product.
15. As a buyer, I want the assistant not to answer unsupported questions, so that I do not receive invented product details.
16. As a buyer, I want spam or random comments not to trigger noisy AI replies, so that chat remains useful.
17. As a buyer, I want questions about products not in the stream lineup to receive no action for MVP, so that the demo stays scoped to linked products.
18. As a host, I want to see a real camera preview in the host dashboard, so that the dashboard feels like a real live stream control surface.
19. As a host, I want the buyer view to support a livestream-like video area, so that the buyer experience resembles Shopee Live.
20. As a host, I want buyer-visible WebRTC livestreaming if time allows, so that the demo feels fully live.
21. As a host, I want a fallback buyer placeholder if WebRTC is risky, so that the demo remains reliable.
22. As a host, I want live chat visible in the dashboard, so that I can monitor buyer activity.
23. As a host, I want AI actions visible in a central queue, so that I can focus on what needs attention.
24. As a host, I want auto-posted AI answers visible in the dashboard, so that I know what the assistant told buyers.
25. As a host, I want escalated questions separated from normal chat, so that I can respond to questions that need human confirmation.
26. As a host, I want policy-risk comments to be highlighted with warnings, so that I can avoid unsafe or unsupported claims.
27. As a host, I want a compact activity log, so that I can see whether the AI auto-posted, escalated, ignored, or warned.
28. As a host, I want the activity log to include short rationales, so that I can trust the AI action without reading verbose reasoning.
29. As a host, I want the product lineup visible during the stream, so that I can keep the current products in mind.
30. As a host, I want to spotlight a product, so that sales coaching and product matching can prioritize the product currently being discussed.
31. As a host, I want the assistant to escalate missing product facts, so that I can answer once and teach the system for the session.
32. As a host, I want my answer to an escalated question to become session memory, so that repeated questions can be auto-answered later.
33. As a host, I want live memory to be visible, so that I can understand what the assistant has learned during the stream.
34. As a host, I want to dismiss or mark an incorrect memory as wrong if time allows, so that the assistant does not build on bad context.
35. As a host, I want the assistant to remember repeated concerns, so that I can address common buyer objections proactively.
36. As a host, I want the sales coach to suggest talking points, so that I can keep the stream moving.
37. As a host, I want the sales coach to mention vouchers and promos, so that buyers hear timely purchase incentives.
38. As a host, I want the sales coach to react to repeated questions, so that I can address what buyers actually care about.
39. As a host, I want the sales coach to trigger on a timer, so that I get periodic prompts even when chat is quiet.
40. As a host, I want the sales coach to react when I spotlight a product, so that I get relevant benefit and FAQ prompts.
41. As a host, I want sales coach prompts not to appear on every comment, so that the dashboard does not become noisy.
42. As a host, I want the AI to ignore social chatter and spam, so that I am not distracted by low-value comments.
43. As a host, I want the AI to escalate warranty, refund, stock, or promotion details when not present in the catalog, so that the assistant does not overpromise.
44. As a host, I want the AI to avoid medical, legal, financial, hearing-health, or guaranteed-result claims, so that the stream stays policy-safe.
45. As a host, I want the AI to answer only from linked product facts and confirmed session memory, so that buyer-facing answers remain grounded.
46. As a host, I want the AI to use official product specs as seed context, so that demo answers are realistic.
47. As a host, I want marketplace price and promo fields to be demo seller fields, so that I can control the live-selling story.
48. As a host, I want Shopee listing prices to be checked shortly before demo time if possible, so that the seeded prices feel current.
49. As a hackathon judge, I want to type a buyer question myself, so that I can see the system respond live rather than watching a canned script.
50. As a hackathon judge, I want to see one product question auto-answered, so that I understand the fast Q&A value.
51. As a hackathon judge, I want to see one spam comment ignored, so that I understand the assistant is not blindly replying.
52. As a hackathon judge, I want to see one missing-detail question escalated, so that I understand the guardrail around uncertainty.
53. As a hackathon judge, I want to see a host answer become memory, so that I understand the live learning behavior.
54. As a hackathon judge, I want to see a repeated question answered from memory, so that I understand why session memory matters.
55. As a hackathon judge, I want to see one risky claim warning, so that I understand the policy protection story.
56. As a hackathon judge, I want to see a sales coach prompt, so that I understand the assistant is a live producer, not just a chatbot.
57. As a developer, I want one Stream Producer DeepAgent per stream, so that buyer replies, escalations, memory, and sales coaching share live context.
58. As a developer, I want specialized subagents or tools inside the Stream Producer DeepAgent, so that each responsibility can be tested and explained.
59. As a developer, I want a product grounding module, so that answers can be constrained to linked product data.
60. As a developer, I want a comment classification module, so that comments can be routed to auto-answer, escalate, ignore, or warn.
61. As a developer, I want a confidence gate, so that auto-posting only happens when the system has enough evidence.
62. As a developer, I want a policy guard module, so that sensitive questions are consistently escalated.
63. As a developer, I want a sales coach scheduler, so that prompts can be triggered by comments, timers, and product spotlight changes.
64. As a developer, I want a session memory module, so that host-confirmed facts can improve future answers during the same room.
65. As a developer, I want Supabase tables for rooms, products, comments, actions, escalations, and memories, so that frontend views can sync through a simple shared state layer.
66. As a developer, I want Supabase Realtime subscriptions, so that host and buyer views update live without building a separate socket server first.
67. As a developer, I want an AI worker to process new comments, so that the browser does not expose model API keys.
68. As a developer, I want structured agent outputs, so that frontend UI can render actions reliably.
69. As a developer, I want deterministic seeded demo data, so that the demo works even if external product pages change.
70. As a developer, I want activity logs to avoid chain-of-thought, so that logs are safe and concise.
71. As a developer, I want English-dominant behavior for MVP, so that multilingual support does not block the core demo.
72. As a developer, I want language detection or translation labels to be optional polish, so that the product can claim a multilingual direction without relying on it in the demo.
73. As a developer, I want feature flags for WebRTC versus buyer placeholder, so that the demo can fall back safely.
74. As a developer, I want a short judge demo script encoded in seed data, so that the team can reliably demonstrate all important branches.
75. As a developer, I want tests around the routing decisions, so that the most important behavior can be trusted during the hackathon.

## Implementation Decisions

- Build a single web app with role-based routes for setup, host, and buyer experiences.
- The seller setup flow creates a stream room by selecting products from a seeded seller catalog into a stream lineup.
- The buyer view shows only products linked to the active stream lineup.
- The first seeded products are Sony WH-1000XM6 headphones and Logitech MX Master 3S mouse.
- Use Singapore dollars as the default catalog currency.
- Use official product specs as the basis for product data, but treat stock, vouchers, shipping, bundle pricing, and stream promos as demo seller fields.
- Current official-source seed facts gathered on 2026-06-06:
  - Sony WH-1000XM6: Sony Singapore search result shows S$559 discounted price; Sony US page shows US$399.99 sale price and US$459.99 original price; official specs include up to 30 hours music playback with noise cancelling on, up to 40 hours with noise cancelling off, Bluetooth 5.3, SBC/AAC/LDAC/LC3 audio formats, over-ear wearing style, carrying case, connection cable, USB cable, warranty card, and reference guide.
  - Logitech MX Master 3S: Logitech Singapore page shows S$189; official product page highlights 8K DPI tracking, glass tracking with minimum 4 mm glass thickness, quiet clicks with 90% less click noise compared with MX Master 3, MagSpeed scrolling up to 1,000 lines per second, Logi Options+ support on Windows and macOS, and Graphite color on the Singapore page.
- Check Shopee marketplace listings later as a pre-demo calibration step because marketplace prices, vouchers, and stock change frequently.
- Use Supabase as the persistence and realtime layer.
- Use Supabase Realtime as the websocket-backed mechanism for comments, AI actions, escalations, memory updates, and room state updates.
- Keep backend AI execution outside the browser to protect model API keys and centralize behavior.
- Use LangChain DeepAgents as the agentic architecture for the core producer behavior.
- Run one Stream Producer DeepAgent per stream room, backed by room state, linked products, session memory, and recent comments.
- Model the Stream Producer DeepAgent as a coordinator that delegates to specialist tools or subagents.
- Specialist responsibilities include comment triage, product grounding, policy guarding, answer writing, sales coaching, session memory, and activity logging.
- Comments are routed into four core classes: product question, purchase intent or sales support, policy-risk or sensitive claim, and noise or spam.
- High-confidence product questions are auto-posted as AI assistant messages in buyer chat.
- Low-confidence but appropriate product questions are escalated to the host.
- Spam, random chatter, and unlinked product questions receive no action in MVP.
- Policy-risk comments are escalated with a warning rather than auto-answered.
- Buyer-facing answers must be grounded only in linked product facts and confirmed session memory.
- The LLM may rewrite, summarize, and choose tone, but must not invent missing product facts.
- The confidence gate should require a single clear linked product match or active spotlight product, available supporting facts, no policy sensitivity, no missing seller terms, and a model confidence score around 0.8 or higher.
- Auto-posted answers appear as AI assistant messages, not as if the host personally typed them.
- Keep host override and retraction as lower-priority stretch functionality.
- Host answers to escalated questions can become session memory for the current stream.
- Session memory should not silently mutate the seeded catalog or official product truth.
- Show live memory in the host dashboard at a simple level.
- Editing live memory is stretch; dismissal or marking wrong is enough if implemented.
- Sales Coach should be part of the DeepAgents system, not a separate disconnected prompt.
- Sales Coach triggers should include repeated questions, objections, purchase intent, timer intervals around 60 to 90 seconds, and product spotlight changes.
- Sales Coach should avoid triggering on every comment.
- The host dashboard should emphasize the live video/feed area and AI action queue, with live chat and product context nearby.
- The host dashboard should include a real camera preview for MVP.
- The buyer view should support buyer-visible livestreaming through WebRTC as the best-case option.
- The reliable fallback is host-only real camera preview with a livestream-style buyer placeholder.
- The MVP is English-dominant.
- Multilingual detection, translation labels, or translated summaries are optional polish rather than core demo dependencies.
- Activity logs should show timestamped outcomes and compact rationales, but never verbose chain-of-thought.
- The demo should include a scripted flow: setup, normal auto-answer, spam ignore, missing-detail escalation, host answer memory, repeated question auto-answer, policy warning, and sales coach prompt.

### Deep Modules

- Stream Producer Agent: accepts stream state and an incoming event, then emits structured actions such as auto-reply, escalation, warning, memory update, sales coach prompt, or no action.
- Product Context Repository: exposes linked product facts and stream lineup data through a small lookup interface.
- Comment Action Router: maps comments to action categories using product matches, policy sensitivity, and confidence signals.
- Policy Guard: evaluates whether a comment or proposed answer risks unsupported claims, sensitive claims, or unsafe promises.
- Answer Composer: creates buyer-facing AI assistant replies from explicit product facts and session memory.
- Session Memory Store: records host-confirmed facts, repeated topics, and resolved escalations for the current stream.
- Sales Coach Engine: produces host prompts from timer events, repeated buyer concerns, active product spotlight, and promotion context.
- Realtime Room Service: owns room creation, comment ingest, AI action broadcast, and role-specific subscriptions.

### Data Model

- Rooms: stream identity, host identity or demo seller identity, stream status, buyer link token, created timestamp, active product spotlight, and video mode.
- Catalog products: product identity, name, category, official specs, price, variants, stock, seller notes, FAQs, shipping notes, return notes, promotions, and restricted claims.
- Stream products: mapping from room to selected catalog products, display order, pinned status, and spotlight state.
- Comments: room, sender role, buyer display name, raw text, detected language label, timestamp, and moderation status.
- AI actions: room, source comment, action type, product match, confidence, buyer-facing message, host-facing summary, rationale label, and timestamp.
- Escalations: room, source comment, product, reason, status, host answer, and resolution timestamp.
- Session memories: room, memory text, source event, confidence, active or dismissed status, created timestamp, and optional expiry at stream end.
- Sales coach prompts: room, trigger type, related product, prompt text, status, and timestamp.

### API And Event Contracts

- Create room from selected product ids.
- Fetch active room state for host and buyer.
- Submit buyer comment to a room.
- Subscribe to room comments.
- Subscribe to room AI actions.
- Subscribe to room escalations.
- Subscribe to room sales coach prompts.
- Submit host answer for an escalation.
- Promote host answer into session memory.
- Update active product spotlight.
- Start or stop host camera preview.
- Enable WebRTC room video if best-case video mode is implemented.

## Testing Decisions

- Good tests should verify externally observable behavior: what action is emitted, what message is posted, what is escalated, what is ignored, and what memory is stored.
- Tests should not assert hidden prompt wording, intermediate reasoning, or internal agent chain-of-thought.
- The Comment Action Router should have unit tests for product questions, purchase intent, policy-risk comments, spam, social chatter, and unlinked product questions.
- The confidence gate should have unit tests proving that auto-posting requires clear product match, grounded facts, no policy sensitivity, and sufficient confidence.
- The Product Context Repository should have tests ensuring only linked stream products are available for answer grounding.
- The Policy Guard should have tests for unsupported guarantees, hearing-health or medical-style claims, warranty overpromises, refund overpromises, and fake discount claims.
- The Answer Composer should have tests confirming answers only use provided product facts and session memory.
- The Session Memory Store should have tests for promoting host answers, retrieving relevant memories, ignoring dismissed memories, and keeping memory scoped to a stream.
- The Sales Coach Engine should have tests for timer prompts, repeated-question prompts, purchase-intent prompts, and spotlight-product prompts.
- The Realtime Room Service should have integration tests for buyer comment submission, host subscription updates, buyer chat updates, and AI action persistence.
- The AI worker should have integration tests with mocked model outputs to verify that incoming comments produce the correct stored actions.
- End-to-end tests should cover the full judge script: create room, link products, submit buyer question, auto-post answer, ignore spam, escalate missing detail, store host answer as memory, answer repeated question from memory, and show policy warning.
- UI tests should verify that host and buyer views render role-appropriate state from the same room.
- WebRTC tests are stretch; fallback video mode should be tested by verifying host camera preview and buyer placeholder render without blocking chat or AI flows.
- There is no prior test suite in the current empty repo, so the first implementation should establish conventions around unit tests for deep modules and one or two end-to-end happy-path tests.

## Out of Scope

- Full Shopee production integration.
- Shopee seller authentication.
- Shopee product URL import.
- Shopee order, cart, checkout, payment, voucher redemption, or inventory sync.
- Official Shopee policy engine integration.
- Production-grade live video broadcasting at scale.
- Buyer-visible WebRTC livestreaming as a hard MVP requirement.
- Host speech transcription.
- Automatic reply retraction or correction flow.
- Full multilingual buyer replies.
- Persistent product catalog mutation based on live host answers.
- Vector database or broad RAG over arbitrary product documents.
- Answering questions about unlinked products.
- Production moderation tooling for abusive chat.
- Long-term analytics dashboards.
- Mobile app packaging.

## Further Notes

- The strongest demo should be interactive, not canned. A judge should type comments in the buyer view and see the host dashboard update live.
- The demo should make the difference between a chatbot and a live producer obvious: buyer auto-answering is only one part; the larger story is escalation, memory, policy safety, and sales coaching.
- A compact architecture explanation should show Supabase Realtime, backend AI worker, Stream Producer DeepAgent, specialist subagents or tools, and the two role-based views.
- Suggested demo comments:
  - "Does the XM6 support LDAC?"
  - "Can the MX Master 3S work on glass?"
  - "hello hello hello"
  - "Does the XM6 cure hearing issues?"
  - "Do you still have the blue one in stock?"
  - Repeat the same stock question after the host answers it to show live memory.
- Product source references used while writing this PRD:
  - Sony WH-1000XM6 product page: https://electronics.sony.com/audio/headphones/headband/p/wh1000xm6-p
  - Sony WH-1000XM6 specifications: https://www.sony.com/electronics/support/wireless-headphones-bluetooth-headphones/wh-1000xm6/specifications
  - Logitech Singapore MX Master 3S page: https://www.logitech.com/en-sg/shop/p/mx-master-3s.910-006561
