import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import {
  registerStartRequestSchema,
  type RegisterStartResponse,
} from "@hermesranker/schema";
import { db, schema } from "@/lib/db";
import { generateNonce, hashIp, readClientIp } from "@/lib/auth";
import { limiters } from "@/lib/ratelimit";
import { normalizeHandle, validateSubmission } from "@/lib/validate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NONCE_TTL_MIN = 10;

export async function POST(req: Request) {
  const ip = readClientIp(req);

  const ipLimit = await limiters.registerStartByIp.limit(ip);
  if (!ipLimit.success) {
    return NextResponse.json(
      { error: "rate_limited", retry_after: ipLimit.reset },
      { status: 429 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = registerStartRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_payload", issues: parsed.error.issues },
      { status: 400 },
    );
  }
  const { fingerprint, handle_suggest, cli_version, first_state, first_scan } =
    parsed.data;

  // Pre-validate the payload now so we don't waste a Turnstile gesture on
  // a payload that will never be accepted.
  const validation = await validateSubmission(first_state, first_scan);
  if (!validation.ok) {
    return NextResponse.json(
      {
        error: "payload_validation_failed",
        reason: validation.reason,
        detail: validation.detail,
      },
      { status: 400 },
    );
  }

  const fpLimit = await limiters.registerStartByFingerprint.limit(fingerprint);
  if (!fpLimit.success) {
    const existing = await db.query.agents.findFirst({
      where: eq(schema.agents.fingerprint, fingerprint),
    });
    if (existing) {
      return NextResponse.json(
        {
          error: "already_registered",
          handle: existing.handle,
          message:
            "This machine has already registered. If you've lost your API key, run `hermes-rank reset` and try again.",
        },
        { status: 409 },
      );
    }
    return NextResponse.json(
      { error: "rate_limited", retry_after: fpLimit.reset },
      { status: 429 },
    );
  }

  const nonce = generateNonce();
  const expiresAt = new Date(Date.now() + NONCE_TTL_MIN * 60_000);

  await db.insert(schema.registrationNonces).values({
    nonce,
    fingerprint,
    handleSuggest: normalizeHandle(handle_suggest),
    cliVersion: cli_version,
    pendingStateJson: first_state,
    pendingScanJson: first_scan,
    sourceIpHash: hashIp(ip),
    expiresAt,
  });

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://hermes-rankings.com";
  const verifyUrl = `${siteUrl}/cli/verify?nonce=${encodeURIComponent(nonce)}`;

  const response: RegisterStartResponse = {
    nonce,
    verify_url: verifyUrl,
    poll_after_ms: 2_000,
  };
  return NextResponse.json(response, { status: 200 });
}
