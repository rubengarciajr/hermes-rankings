import { NextResponse } from "next/server";
import { eq, and, isNull, gt } from "drizzle-orm";
import {
  registerCompleteRequestSchema,
  stateJsonSchema,
  scanSnapshotSchema,
} from "@hermesranker/schema";
import { db, schema } from "@/lib/db";
import {
  generateApiKey,
  hashApiKey,
  hashIp,
  readClientIp,
} from "@/lib/auth";
import { verifyTurnstile } from "@/lib/turnstile";
import { normalizeHandle } from "@/lib/validate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Called from the browser /cli/verify page once the user clears Turnstile.
 * The nonce already has the state/scan attached from /start — this only
 * needs to verify the human is real, then create the agent + key.
 */
export async function POST(req: Request) {
  const ip = readClientIp(req);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = registerCompleteRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_payload", issues: parsed.error.issues },
      { status: 400 },
    );
  }
  const { nonce, turnstile_token } = parsed.data;

  const nonceRow = await db.query.registrationNonces.findFirst({
    where: and(
      eq(schema.registrationNonces.nonce, nonce),
      isNull(schema.registrationNonces.completedAgentId),
      gt(schema.registrationNonces.expiresAt, new Date()),
    ),
  });
  if (!nonceRow) {
    return NextResponse.json(
      { error: "nonce_invalid_or_expired" },
      { status: 410 },
    );
  }

  const turnstile = await verifyTurnstile(turnstile_token, ip);
  if (!turnstile.ok) {
    return NextResponse.json(
      { error: "turnstile_failed", reason: turnstile.reason },
      { status: 403 },
    );
  }

  // Re-validate the stored payload as a defensive measure.
  const stateParsed = stateJsonSchema.safeParse(nonceRow.pendingStateJson);
  const scanParsed = scanSnapshotSchema.safeParse(nonceRow.pendingScanJson);
  if (!stateParsed.success || !scanParsed.success) {
    return NextResponse.json(
      { error: "stored_payload_corrupt" },
      { status: 500 },
    );
  }
  const first_state = stateParsed.data;
  const first_scan = scanParsed.data;

  // Pick a unique handle.
  const baseHandle = normalizeHandle(nonceRow.handleSuggest);
  let finalHandle = baseHandle;
  for (let i = 0; i < 5; i++) {
    const exists = await db.query.agents.findFirst({
      where: eq(schema.agents.handle, finalHandle),
    });
    if (!exists) break;
    finalHandle = `${baseHandle}-${Math.random().toString(36).slice(2, 6)}`.slice(
      0,
      40,
    );
  }

  const fpExisting = await db.query.agents.findFirst({
    where: eq(schema.agents.fingerprint, nonceRow.fingerprint),
  });
  if (fpExisting) {
    return NextResponse.json(
      { error: "fingerprint_already_registered" },
      { status: 409 },
    );
  }

  const apiKey = generateApiKey();
  const apiKeyHash = hashApiKey(apiKey);

  const [agent] = await db
    .insert(schema.agents)
    .values({
      handle: finalHandle,
      fingerprint: nonceRow.fingerprint,
      apiKeyHash,
    })
    .returning({
      id: schema.agents.id,
      handle: schema.agents.handle,
    });
  if (!agent) {
    return NextResponse.json({ error: "agent_create_failed" }, { status: 500 });
  }

  await db.insert(schema.submissions).values({
    agentId: agent.id,
    rawStateJson: first_state,
    rawScanJson: first_scan,
    clientVersion: nonceRow.cliVersion,
    sourceIpHash: hashIp(ip),
    userAgent: req.headers.get("user-agent") ?? null,
    accepted: true,
  });

  await db
    .update(schema.registrationNonces)
    .set({
      completedAgentId: agent.id,
      completedApiKey: apiKey,
    })
    .where(eq(schema.registrationNonces.nonce, nonce));

  return NextResponse.json(
    { ok: true, handle: agent.handle, agent_id: agent.id },
    { status: 200 },
  );
}
