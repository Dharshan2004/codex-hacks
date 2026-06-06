import type {
  Comment,
  LineupItem,
  Room,
  SalesCoachPrompt,
  SalesCoachTriggerType,
} from "@/lib/types";
import { formatPrice } from "@/lib/utils";

export const SALES_COACH_TIMER_INTERVAL_MS = 60_000;
export const SALES_COACH_COMMENT_COOLDOWN_MS = 25_000;
export const SALES_COACH_SPOTLIGHT_COOLDOWN_MS = 20_000;

type SalesCoachEvent =
  | { type: "comment"; comment: Comment }
  | { type: "timer" }
  | { type: "spotlight"; productId: string | null };

export interface SalesCoachPromptDraft {
  room_id: string;
  trigger_type: SalesCoachTriggerType;
  product_id: string | null;
  prompt_text: string;
}

export interface SalesCoachEngineInput {
  room: Room;
  lineup: LineupItem[];
  recentBuyerComments?: Comment[];
  recentPrompts?: SalesCoachPrompt[];
  event: SalesCoachEvent;
  now?: Date;
  timerIntervalMs?: number;
}

type Concern = {
  key: string;
  label: string;
  terms: string[];
};

const CONCERNS: Concern[] = [
  {
    key: "battery",
    label: "battery life",
    terms: ["battery", "charge", "charging", "hours", "last"],
  },
  {
    key: "voucher",
    label: "vouchers and live discounts",
    terms: ["voucher", "code", "discount", "promo", "deal", "off"],
  },
  {
    key: "stock",
    label: "stock and variants",
    terms: [
      "stock",
      "available",
      "variant",
      "variants",
      "option",
      "options",
      "colour",
      "color",
      "black",
      "silver",
      "blue",
      "how many",
    ],
  },
  {
    key: "shipping",
    label: "shipping timing",
    terms: ["ship", "shipping", "delivery", "deliver", "arrive"],
  },
  {
    key: "returns",
    label: "returns",
    terms: ["return", "refund", "exchange"],
  },
  {
    key: "compatibility",
    label: "compatibility and support",
    terms: ["support", "compatible", "work", "works", "mac", "windows", "phone"],
  },
  {
    key: "noise",
    label: "noise cancelling",
    terms: ["noise", "anc", "cancel", "cancelling"],
  },
  {
    key: "value",
    label: "price and value",
    terms: ["expensive", "pricey", "worth", "cheaper", "value"],
  },
];

const PURCHASE_INTENT_PATTERNS = [
  /\bbuy\b/i,
  /\border\b/i,
  /\bpurchase\b/i,
  /\bcheckout\b/i,
  /\bcheck out\b/i,
  /\bcart\b/i,
  /\bvoucher\b/i,
  /\bpromo\b/i,
  /\bdiscount\b/i,
  /\bdeal\b/i,
  /\bhow much\b/i,
  /\bi want\b/i,
  /\bwant\s+\d+\b/i,
  /\bneed\s+\d+\b/i,
  /\bget one\b/i,
];

const OBJECTION_PATTERNS = [
  /\btoo expensive\b/i,
  /\bpricey\b/i,
  /\bworth it\b/i,
  /\bcheaper\b/i,
  /\bnot sure\b/i,
  /\bworried\b/i,
  /\bconcerned\b/i,
  /\bfree\b/i,
  /\btomorrow\b/i,
  /\bnext day\b/i,
];

const COACH_REQUEST_PATTERNS = [
  /\bsales coach\b/i,
  /\bcoach\b.*\b(help|do|say|something)\b/i,
  /\bi need\b.*\bcoach\b/i,
];

export function buildSalesCoachPrompt({
  room,
  lineup,
  recentBuyerComments = [],
  recentPrompts = [],
  event,
  now = new Date(),
  timerIntervalMs = SALES_COACH_TIMER_INTERVAL_MS,
}: SalesCoachEngineInput): SalesCoachPromptDraft | null {
  if (room.status !== "live") return null;

  if (event.type === "timer") {
    if (hasRecentPrompt(recentPrompts, "timer", now, timerIntervalMs)) {
      return null;
    }

    const product = findProductFromChat({ room, lineup, comments: recentBuyerComments });
    return draftPrompt(
      room.id,
      "timer",
      product?.id ?? null,
      liveTimerPrompt(product, recentBuyerComments),
    );
  }

  if (event.type === "spotlight") {
    if (!event.productId) return null;
    const product = lineup.find((item) => item.product.id === event.productId)?.product;
    if (!product) return null;

    if (
      hasRecentPrompt(
        recentPrompts,
        "spotlight",
        now,
        SALES_COACH_SPOTLIGHT_COOLDOWN_MS,
        product.id,
      )
    ) {
      return null;
    }

    return draftPrompt(
      room.id,
      "spotlight",
      product.id,
      liveSpotlightPrompt(product),
    );
  }

  const comment = event.comment;
  if (comment.sender_role !== "buyer" || comment.moderation_status !== "visible") {
    return null;
  }

  if (
    hasAnyRecentPrompt(
      recentPrompts,
      ["intent", "repeated", "chat"],
      now,
      SALES_COACH_COMMENT_COOLDOWN_MS,
    )
  ) {
    return null;
  }

  const product = findProductFromChat({
    room,
    lineup,
    comments: [comment, ...recentBuyerComments],
  });

  if (hasCoachRequest(comment.body)) {
    return draftPrompt(
      room.id,
      "chat",
      product?.id ?? null,
      liveChatPrompt(product, [comment, ...recentBuyerComments]),
    );
  }

  const objectionConcern = findObjectionConcern(comment.body);
  if (objectionConcern) {
    return draftPrompt(
      room.id,
      "chat",
      product?.id ?? null,
      liveConcernPrompt(objectionConcern, product, comment),
    );
  }

  if (hasPurchaseIntent(comment.body)) {
    return draftPrompt(
      room.id,
      "intent",
      product?.id ?? null,
      livePurchaseIntentPrompt(product, comment),
    );
  }

  const repeatedConcern = findRepeatedConcern(comment, recentBuyerComments);
  if (repeatedConcern) {
    return draftPrompt(
      room.id,
      "repeated",
      product?.id ?? null,
      repeatedConcernPrompt(repeatedConcern, product),
    );
  }

  return null;
}

function draftPrompt(
  roomId: string,
  triggerType: SalesCoachTriggerType,
  productId: string | null,
  promptText: string,
): SalesCoachPromptDraft {
  return {
    room_id: roomId,
    trigger_type: triggerType,
    product_id: productId,
    prompt_text: promptText,
  };
}

function hasPurchaseIntent(text: string): boolean {
  return PURCHASE_INTENT_PATTERNS.some((pattern) => pattern.test(text));
}

function hasCoachRequest(text: string): boolean {
  return COACH_REQUEST_PATTERNS.some((pattern) => pattern.test(text));
}

function findRepeatedConcern(
  comment: Comment,
  recentBuyerComments: Comment[],
): Concern | null {
  const currentConcern = findConcern(comment.body);
  if (!currentConcern) return null;

  const matchingComments = recentBuyerComments.filter(
    (candidate) =>
      candidate.sender_role === "buyer" &&
      candidate.moderation_status === "visible" &&
      findConcern(candidate.body)?.key === currentConcern.key,
  );

  return matchingComments.length >= 2 ? currentConcern : null;
}

function findObjectionConcern(text: string): Concern | null {
  if (!OBJECTION_PATTERNS.some((pattern) => pattern.test(text))) return null;
  const normalized = normalize(text);
  if (normalized.includes("tomorrow") || normalized.includes("next day")) {
    return CONCERNS.find((concern) => concern.key === "shipping") ?? null;
  }
  return CONCERNS.find((concern) => concern.key === "value") ?? null;
}

function findConcern(text: string): Concern | null {
  const normalized = normalize(text);
  return (
    CONCERNS.find((concern) =>
      concern.terms.some((term) => normalized.includes(term)),
    ) ?? null
  );
}

function findLatestConcern(
  comments: Comment[],
  product?: LineupItem["product"] | null,
): Concern | null {
  for (const comment of comments) {
    if (comment.sender_role !== "buyer" || comment.moderation_status !== "visible") {
      continue;
    }

    const concern =
      findObjectionConcern(comment.body) ??
      productSpecificConcern(product, comment.body) ??
      findConcern(comment.body);

    if (concern) return concern;
  }

  return null;
}

function productSpecificConcern(
  product: LineupItem["product"] | null | undefined,
  text: string,
): Concern | null {
  if (!product) return null;

  const normalized = normalize(text);
  const stockConcern = CONCERNS.find((concern) => concern.key === "stock") ?? null;
  const voucherConcern =
    CONCERNS.find((concern) => concern.key === "voucher") ?? null;

  const optionTerms = [
    ...Object.keys(product.stock),
    ...product.variants.flatMap((variant) => [variant.name, ...variant.options]),
  ].map(normalize);

  if (
    stockConcern &&
    optionTerms.some((term) => term.length >= 3 && normalized.includes(term))
  ) {
    return stockConcern;
  }

  const commerceTerms = [
    ...product.vouchers.map((voucher) => voucher.code),
    ...product.promotions.map((promotion) => promotion.label),
  ].map(normalize);

  if (
    voucherConcern &&
    commerceTerms.some((term) => term.length >= 3 && normalized.includes(term))
  ) {
    return voucherConcern;
  }

  return null;
}

function hasRecentPrompt(
  prompts: SalesCoachPrompt[],
  triggerType: SalesCoachTriggerType,
  now: Date,
  cooldownMs: number,
  productId?: string | null,
): boolean {
  return prompts.some((prompt) => {
    if (prompt.trigger_type !== triggerType) return false;
    if (productId !== undefined && prompt.product_id !== productId) return false;
    return isWithinCooldown(prompt.created_at, now, cooldownMs);
  });
}

function hasAnyRecentPrompt(
  prompts: SalesCoachPrompt[],
  triggerTypes: SalesCoachTriggerType[],
  now: Date,
  cooldownMs: number,
): boolean {
  return prompts.some(
    (prompt) =>
      triggerTypes.includes(prompt.trigger_type) &&
      isWithinCooldown(prompt.created_at, now, cooldownMs),
  );
}

function isWithinCooldown(createdAt: string, now: Date, cooldownMs: number): boolean {
  const created = new Date(createdAt).getTime();
  if (!Number.isFinite(created)) return false;
  return now.getTime() - created < cooldownMs;
}

function findProduct({
  room,
  lineup,
  text,
}: {
  room: Room;
  lineup: LineupItem[];
  text?: string;
}) {
  if (text) {
    const scored = lineup
      .map((item) => ({
        item,
        score: productMentionScore(text, item),
      }))
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score)[0];
    if (scored) return scored.item.product;
  }

  return (
    lineup.find((item) => item.product.id === room.spotlight_product_id)?.product ??
    lineup[0]?.product ??
    null
  );
}

function findProductFromChat({
  room,
  lineup,
  comments,
}: {
  room: Room;
  lineup: LineupItem[];
  comments: Comment[];
}) {
  const scored = lineup
    .map((item) => ({
      item,
      score: comments.reduce(
        (total, comment) => total + productMentionScore(comment.body, item),
        0,
      ),
    }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)[0];

  return scored?.item.product ?? findProduct({ room, lineup });
}

function productMentionScore(text: string, item: LineupItem): number {
  const product = item.product;
  const productText = normalize(
    [
      product.name,
      product.slug,
      product.brand,
      product.category,
      product.seller_notes,
      product.official_specs.map((spec) => `${spec.label} ${spec.value}`).join(" "),
      product.variants
        .map((variant) => `${variant.name} ${variant.options.join(" ")}`)
        .join(" "),
      Object.keys(product.stock).join(" "),
      product.vouchers
        .map((voucher) => `${voucher.code} ${voucher.description}`)
        .join(" "),
      product.promotions
        .map((promotion) => `${promotion.label} ${promotion.description}`)
        .join(" "),
      product.faqs.map((faq) => `${faq.q} ${faq.a}`).join(" "),
    ]
      .filter(Boolean)
      .join(" "),
  );
  const tokens = uniqueTokens(normalize(text));
  return tokens.reduce((score, token) => {
    if (token.length < 3) return score;
    return productText.includes(token) ? score + 1 : score;
  }, 0);
}

function liveChatPrompt(
  product: LineupItem["product"] | null,
  comments: Comment[],
) {
  const latestSignal = latestRelevantComment(comments);
  const concern = findLatestConcern(comments, product);
  if (!product) {
    return coachLines([
      ["🎯", "Chat pulse", latestSignal ?? "Chat is asking for host guidance."],
      ["🎙️", "Say", "I see your questions. I’ll recap the offer quickly."],
      ["💬", "Ask", "Chat, what should I compare live: deal, colour, or delivery timing?"],
    ]);
  }

  return coachLines([
    ["🎯", "Chat pulse", latestSignal ?? "Chat is asking for guidance."],
    ["🎙️", "Say", talkingPoint(product, concern)],
    ["🎟️", "Close", commerceCue(product)],
    ["💬", "Ask", conversationQuestion(concern)],
  ]);
}

function liveConcernPrompt(
  concern: Concern,
  product: LineupItem["product"] | null,
  comment: Comment,
) {
  const quote = shortQuote(comment.body);
  if (!product) {
    return coachLines([
      ["🎯", "Chat pulse", quote],
      ["🎙️", "Say", `Chat is asking about ${concern.label}. Answer it before moving on.`],
      ["💬", "Ask", "Who else has the same concern?"],
    ]);
  }

  if (concern.key === "shipping") {
    return coachLines([
      ["🚚", "Concern", quote],
      ["🎙️", "Say", talkingPoint(product, concern)],
      ["💬", "Ask", conversationQuestion(concern)],
    ]);
  }

  return coachLines([
    ["🎯", "Concern", quote],
    ["🎙️", "Say", talkingPoint(product, concern)],
    ["🎟️", "Close", commerceCue(product)],
    ["💬", "Ask", conversationQuestion(concern)],
  ]);
}

function livePurchaseIntentPrompt(
  product: LineupItem["product"] | null,
  comment: Comment,
) {
  const quote = shortQuote(comment.body);
  const concern = findLatestConcern([comment], product);
  if (!product) {
    return coachLines([
      ["🛒", "Intent", quote],
      ["🎙️", "Say", "Tap the pinned product to check out."],
      ["💬", "Ask", "Who is close to checking out, and which option are you choosing?"],
    ]);
  }

  return coachLines([
    ["🛒", "Intent", quote],
    ["🎟️", "Deal", commerceCue(product)],
    ["✅", "Why now", talkingPoint(product, concern)],
    ["💬", "Ask", conversationQuestion(concern)],
  ]);
}

function liveTimerPrompt(
  product: LineupItem["product"] | null,
  recentBuyerComments: Comment[],
) {
  const concern = findLatestConcern(recentBuyerComments, product);
  const pulse = summarizeChatPulse(recentBuyerComments, product);
  if (pulse) {
    if (!product) {
      return coachLines([
        ["⏱️", "Pulse", pulse],
        ["🎙️", "Say", "I’ll recap the offer and answer the hottest question."],
        ["💬", "Ask", "Which decision blocker should I clear first: price, stock, or delivery?"],
      ]);
    }

    return coachLines([
      ["⏱️", "Pulse", pulse],
      ["🎙️", "Say", talkingPoint(product, concern)],
      ["🎟️", "Close", commerceCue(product)],
      ["💬", "Ask", conversationQuestion(concern)],
    ]);
  }

  if (!product) {
    return coachLines([
      ["⏱️", "Reset", "Give a 20-second room recap."],
      ["🎟️", "Deal", "Call out the live-only offer."],
      ["💬", "Ask", "What would help you decide: deal, demo, or delivery?"],
    ]);
  }

  return coachLines([
    ["⏱️", "Reset", "Refresh this product for new viewers."],
    ["✅", "Say", talkingPoint(product)],
    ["🎟️", "Deal", commerceCue(product)],
    ["💬", "Ask", "What would help you decide: deal, demo, or delivery?"],
  ]);
}

function liveSpotlightPrompt(product: LineupItem["product"]) {
  return coachLines([
    ["📌", "Pinned", "This is the product to tap now."],
    ["✅", "Say", talkingPoint(product)],
    ["🎟️", "Deal", commerceCue(product)],
  ]);
}

function repeatedConcernPrompt(concern: Concern, product: LineupItem["product"] | null) {
  if (!product) {
    return coachLines([
      ["🔁", "Focus", `Chat keeps asking about ${concern.label}.`],
      ["🎙️", "Say", "Answer it clearly before moving on."],
      ["💬", "Ask", "Who wants one quick follow-up?"],
    ]);
  }

  return coachLines([
    ["🔁", "Focus", `Chat keeps asking about ${concern.label}.`],
    ["🎙️", "Say", talkingPoint(product, concern)],
    ["🎟️", "Close", commerceCue(product)],
  ]);
}

function purchaseIntentPrompt(product: LineupItem["product"] | null) {
  if (!product) {
    return coachLines([
      ["🛒", "Intent", "Buy signals are showing in chat."],
      ["🎙️", "Say", "Tap the pinned product to check out."],
      ["💬", "Ask", "Who is close to checking out, and which option are you choosing?"],
    ]);
  }

  return coachLines([
    ["🛒", "Intent", "Buy signals are showing."],
    ["🎟️", "Deal", commerceCue(product)],
    ["✅", "Why now", talkingPoint(product)],
    ["💬", "Ask", "Who is close to checking out, and which option are you choosing?"],
  ]);
}

function timerPrompt(product: LineupItem["product"] | null) {
  if (!product) {
    return coachLines([
      ["⏱️", "Reset", "Give a 20-second room recap."],
      ["🎟️", "Deal", "Call out the live-only offer."],
      ["💬", "Ask", "What would help you decide: deal, demo, or delivery?"],
    ]);
  }

  return coachLines([
    ["⏱️", "Reset", "Refresh this product for new viewers."],
    ["✅", "Say", talkingPoint(product)],
    ["🎟️", "Deal", commerceCue(product)],
    ["💬", "Ask", "What would help you decide: deal, demo, or delivery?"],
  ]);
}

function spotlightPrompt(product: LineupItem["product"]) {
  return coachLines([
    ["📌", "Pinned", "This is the product to tap now."],
    ["✅", "Say", talkingPoint(product)],
    ["🎟️", "Deal", commerceCue(product)],
  ]);
}

function talkingPoint(
  product: LineupItem["product"],
  concern?: Concern | null,
): string {
  const concernFact = concern ? concernTalkingPoint(product, concern) : null;
  if (concernFact) return concernFact;

  const spec = product.official_specs[0];
  if (spec) return `${spec.label}: ${spec.value}`;

  const stock = stockFact(product);
  if (stock) return stock;

  const commerce = commerceFact(product);
  if (commerce) return commerce;

  if (product.shipping_notes) return `Shipping: ${product.shipping_notes}`;

  if (product.seller_notes) return product.seller_notes;

  return `${product.name} is live at ${formatPrice(product.price, product.currency)}`;
}

function concernTalkingPoint(
  product: LineupItem["product"],
  concern: Concern,
): string | null {
  if (concern.key === "stock") {
    return stockFact(product) ?? specFact(product, concern);
  }

  if (concern.key === "voucher" || concern.key === "value") {
    return commerceFact(product) ?? specFact(product, concern);
  }

  if (concern.key === "shipping") {
    return product.shipping_notes
      ? `Shipping: ${product.shipping_notes}`
      : specFact(product, concern);
  }

  if (concern.key === "returns") {
    return product.return_notes
      ? `Returns: ${product.return_notes}`
      : specFact(product, concern);
  }

  return specFact(product, concern);
}

function stockFact(product: LineupItem["product"]): string | null {
  const stockEntries = Object.entries(product.stock).filter(([, count]) =>
    Number.isFinite(count),
  );

  if (stockEntries.length > 0) {
    return `Stock by option: ${stockEntries
      .map(([option, count]) => `${option} ${count}`)
      .join(", ")}.`;
  }

  const variant = product.variants[0];
  if (!variant) return null;

  return `${variant.name} options: ${variant.options.join(", ")}.`;
}

function commerceFact(product: LineupItem["product"]): string | null {
  const voucher = product.vouchers[0];
  if (voucher) return `Live voucher: ${voucher.code} - ${voucher.description}.`;

  const promotion = product.promotions[0];
  if (promotion) {
    return `Live promo: ${promotion.label} - ${promotion.description}.`;
  }

  if (product.original_price && product.original_price > product.price) {
    return `Live price: ${formatPrice(product.price, product.currency)} was ${formatPrice(
      product.original_price,
      product.currency,
    )}.`;
  }

  return null;
}

function specFact(
  product: LineupItem["product"],
  concern: Concern,
): string | null {
  const spec = product.official_specs.find((candidate) => {
    const text = normalize(`${candidate.label} ${candidate.value}`);
    return concern.terms.some((term) => text.includes(term));
  });

  return spec ? `${spec.label}: ${spec.value}` : null;
}

function conversationQuestion(concern?: Concern | null): string {
  if (concern?.key === "stock") {
    return "Which stock decision blocker should I clear first: safest colour, scarce option, or giftable pick?";
  }

  if (concern?.key === "shipping") {
    return "Which delivery decision blocker should I clear first: urgent use, a gift date, or a setup upgrade?";
  }

  if (concern?.key === "voucher" || concern?.key === "value") {
    return "What should I compare live so this becomes an easy yes: lowest price, bundle value, or daily-use proof?";
  }

  if (concern?.key === "returns") {
    return "What would make checkout feel safer: returns, delivery timing, or seeing the product closer?";
  }

  if (concern?.key === "battery" || concern?.key === "noise") {
    return "What real-life moment should I test next: commute, calls, focus work, or travel?";
  }

  return "Who is close to checking out, and which option are you choosing? What should I prove next: setup, comfort, or value?";
}

function commerceCue(product: LineupItem["product"]): string {
  const voucher = product.vouchers[0];
  if (voucher) return `${voucher.code} (${voucher.description})`;

  const promotion = product.promotions[0];
  if (promotion) return `${promotion.label} (${promotion.description})`;

  if (product.original_price && product.original_price > product.price) {
    return `the live price ${formatPrice(product.price, product.currency)}, down from ${formatPrice(
      product.original_price,
      product.currency,
    )}`;
  }

  return `the live price ${formatPrice(product.price, product.currency)}`;
}

function summarizeChatPulse(
  comments: Comment[],
  product?: LineupItem["product"] | null,
): string | null {
  const recent = comments
    .filter((comment) => comment.sender_role === "buyer")
    .slice(0, 8);
  if (recent.length === 0) return null;

  for (const comment of recent) {
    if (hasCoachRequest(comment.body)) {
      return `Chat asked for sales help: “${shortQuote(comment.body)}”`;
    }

    if (findObjectionConcern(comment.body)?.key === "shipping") {
      return `Delivery urgency is coming up: “${shortQuote(comment.body)}”`;
    }

    if (hasPurchaseIntent(comment.body)) {
      return `Buyer intent is active: “${shortQuote(comment.body)}”`;
    }

    const concern =
      productSpecificConcern(product, comment.body) ?? findConcern(comment.body);
    if (concern) return `Chat is circling ${concern.label}.`;
  }

  return null;
}

function latestRelevantComment(comments: Comment[]): string | null {
  const relevant = comments.find((comment) => {
    const text = comment.body;
    return (
      hasCoachRequest(text) ||
      hasPurchaseIntent(text) ||
      findObjectionConcern(text) !== null ||
      findConcern(text) !== null
    );
  });

  return relevant ? shortQuote(relevant.body) : null;
}

function shortQuote(text: string): string {
  const compact = text.trim().replace(/\s+/g, " ");
  if (compact.length <= 70) return compact;
  return `${compact.slice(0, 67)}...`;
}

function shippingCue(product: LineupItem["product"]): string {
  if (product.shipping_notes) {
    return `${product.shipping_notes} Don’t promise next-day delivery unless the seller confirms it.`;
  }
  return "Call out the listed shipping terms, then ask the buyer where they need it delivered.";
}

function valueCue(product: LineupItem["product"]): string {
  const voucher = product.vouchers[0];
  if (voucher) return `If they want a deal, lead with ${voucher.code}: ${voucher.description}.`;

  const promotion = product.promotions[0];
  if (promotion) return `If they want extra value, lead with ${promotion.label}: ${promotion.description}.`;

  return `Anchor the value at ${formatPrice(product.price, product.currency)} and mention the strongest product benefit.`;
}

function normalize(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function uniqueTokens(text: string): string[] {
  return Array.from(new Set(text.split(/\s+/).filter(Boolean)));
}

function coachLines(lines: Array<[string, string, string]>): string {
  return lines
    .map(([emoji, label, text]) => `${emoji} **${label}:** ${text}`)
    .join("\n");
}
