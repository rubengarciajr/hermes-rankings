import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import { db, schema } from "./db";

/**
 * API key management.
 *
 * The CLI receives a 32-byte URL-safe random string at registration. We never
 * store the raw key — only its SHA-256 digest. Lookup is by digest, so
 * comparison is constant-time on the fixed-length hash. SHA-256 (not bcrypt)
 * is fine here because the input is high-entropy random bytes, not a
 * low-entropy password.
 */

export function generateApiKey(): string {
  // 32 bytes → 43 chars base64url. Zero ambiguity, no padding.
  return randomBytes(32).toString("base64url");
}

export function hashApiKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

export function generateNonce(): string {
  // 24 bytes → 32 chars base64url. Used for the CLI verification handshake.
  return randomBytes(24).toString("base64url");
}

export function generateFingerprint(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

/** Hash an IP for storage so we can rate-limit without keeping raw IPs. */
export function hashIp(ip: string): string {
  return createHash("sha256")
    .update((process.env.AUTH_SECRET ?? "hr-default-salt") + ip)
    .digest("hex")
    .slice(0, 32);
}

export type AuthedAgent = typeof schema.agents.$inferSelect;

/**
 * Look up the agent owning a Bearer token. Returns null if not found, status
 * != 'active', or token shape is wrong.
 */
export async function authenticateBearer(
  authHeader: string | null,
): Promise<AuthedAgent | null> {
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7).trim();
  if (token.length < 32 || token.length > 128) return null;

  const digest = hashApiKey(token);
  const row = await db.query.agents.findFirst({
    where: eq(schema.agents.apiKeyHash, digest),
  });
  if (!row || row.status !== "active") return null;
  return row;
}

/** Read x-forwarded-for / x-real-ip the same way Next.js / Vercel set them. */
export function readClientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim();
  const xri = req.headers.get("x-real-ip");
  if (xri) return xri.trim();
  return "0.0.0.0";
}
