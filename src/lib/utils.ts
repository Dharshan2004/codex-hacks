import clsx, { type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs);
}

// Format a price for display, e.g. formatPrice(559, "SGD") => "S$559.00".
export function formatPrice(amount: number, currency: string): string {
  const symbol = currency === "SGD" ? "S$" : currency === "USD" ? "US$" : "";
  return `${symbol}${amount.toFixed(2)}`;
}

const ADJECTIVES = [
  "Happy", "Lucky", "Sunny", "Clever", "Swift", "Cosy", "Brave", "Jolly",
  "Mellow", "Witty", "Zesty", "Breezy",
];
const NOUNS = [
  "Panda", "Otter", "Koala", "Falcon", "Tiger", "Dolphin", "Sparrow",
  "Lynx", "Heron", "Bunny", "Gecko", "Marmot",
];

// Generate a friendly demo buyer name like "SwiftPanda42".
export function generateDemoName(): string {
  const a = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const n = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  const num = Math.floor(Math.random() * 90) + 10;
  return `${a}${n}${num}`;
}

// Total stock across all variants of a product.
export function totalStock(stock: Record<string, number>): number {
  return Object.values(stock).reduce((sum, n) => sum + (n || 0), 0);
}
