import { describe, expect, it } from "vitest";

import { generateBuyerToken } from "@/lib/token";

describe("generateBuyerToken", () => {
  it("returns a non-empty URL-safe token", () => {
    const token = generateBuyerToken();
    expect(token.length).toBeGreaterThan(8);
    // base64url alphabet only: A-Z a-z 0-9 - _
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it("is unique across many calls", () => {
    const tokens = new Set(
      Array.from({ length: 1000 }, () => generateBuyerToken()),
    );
    expect(tokens.size).toBe(1000);
  });
});
