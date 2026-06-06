import { describe, expect, it } from "vitest";

import { formatPrice, generateDemoName, totalStock } from "@/lib/utils";

describe("formatPrice", () => {
  it("formats SGD with the S$ symbol and two decimals", () => {
    expect(formatPrice(559, "SGD")).toBe("S$559.00");
    expect(formatPrice(189.5, "SGD")).toBe("S$189.50");
  });

  it("formats USD with the US$ symbol", () => {
    expect(formatPrice(399.99, "USD")).toBe("US$399.99");
  });

  it("omits a symbol for unknown currencies", () => {
    expect(formatPrice(10, "JPY")).toBe("10.00");
  });
});

describe("totalStock", () => {
  it("sums stock across variants", () => {
    expect(totalStock({ Black: 24, Silver: 11, Blue: 0 })).toBe(35);
  });

  it("returns 0 for an empty stock map", () => {
    expect(totalStock({})).toBe(0);
  });

  it("treats missing/NaN counts as 0", () => {
    expect(totalStock({ A: 5, B: undefined as unknown as number })).toBe(5);
  });
});

describe("generateDemoName", () => {
  it("produces an Adjective+Noun+2-digit-number name", () => {
    for (let i = 0; i < 50; i++) {
      const name = generateDemoName();
      expect(name).toMatch(/^[A-Z][a-z]+[A-Z][a-z]+\d{2}$/);
    }
  });
});
