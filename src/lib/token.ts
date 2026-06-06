import { randomBytes } from "crypto";

// Opaque, URL-safe token used in buyer links. ~12 chars of base62-ish entropy.
export function generateBuyerToken(): string {
  return randomBytes(9).toString("base64url");
}
