import "server-only";

const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export type TurnstileResult =
  | { ok: true; hostname: string }
  | { ok: false; reason: string };

/**
 * Verify a Turnstile token against Cloudflare. Returns a discriminated union.
 * Falls back to "ok" on the public test secret (`1x0000000000000000000000000000000AA`)
 * which always returns success — useful for local dev without real keys.
 */
export async function verifyTurnstile(
  token: string,
  remoteIp?: string,
): Promise<TurnstileResult> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    return { ok: false, reason: "turnstile_not_configured" };
  }

  const body = new URLSearchParams({ secret, response: token });
  if (remoteIp) body.set("remoteip", remoteIp);

  const res = await fetch(VERIFY_URL, {
    method: "POST",
    body,
    cache: "no-store",
  });
  if (!res.ok) {
    return { ok: false, reason: `siteverify_http_${res.status}` };
  }
  const json = (await res.json()) as {
    success: boolean;
    hostname?: string;
    "error-codes"?: string[];
  };
  if (!json.success) {
    return {
      ok: false,
      reason:
        json["error-codes"]?.join(",") ?? "siteverify_unknown_error",
    };
  }
  return { ok: true, hostname: json.hostname ?? "unknown" };
}
