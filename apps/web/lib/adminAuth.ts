import "server-only";
import { cookies } from "next/headers";

const COOKIE_NAME = "hr_admin";

export function isAdminConfigured(): boolean {
  return Boolean(process.env.ADMIN_TOKEN && process.env.ADMIN_TOKEN.length >= 16);
}

/**
 * The cookie value IS the admin token. If the cookie matches the env, the
 * request is authorized. The cookie is HttpOnly + Secure + SameSite=Lax
 * so JS can't exfiltrate it. No DB session, no signing — keep it simple.
 */
export async function isAdmin(): Promise<boolean> {
  if (!isAdminConfigured()) return false;
  const c = await cookies();
  const token = c.get(COOKIE_NAME)?.value;
  if (!token) return false;
  return constantTimeEqual(token, process.env.ADMIN_TOKEN!);
}

export async function setAdminCookie(token: string): Promise<boolean> {
  if (!isAdminConfigured()) return false;
  if (!constantTimeEqual(token, process.env.ADMIN_TOKEN!)) return false;
  const c = await cookies();
  c.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12, // 12h
  });
  return true;
}

export async function clearAdminCookie(): Promise<void> {
  const c = await cookies();
  c.delete(COOKIE_NAME);
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}
