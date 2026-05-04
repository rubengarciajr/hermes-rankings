import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import type { RegisterPollResponse } from "@hermesranker/schema";
import { db, schema } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Long-pollable endpoint the CLI hits after kicking off /register/start.
 * Returns 'ready' once the user has cleared Turnstile in the browser.
 * The api_key is one-shot — wiped from the nonce row on first successful read.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const nonce = url.searchParams.get("nonce");
  if (!nonce) {
    return NextResponse.json({ error: "nonce_required" }, { status: 400 });
  }

  const row = await db.query.registrationNonces.findFirst({
    where: eq(schema.registrationNonces.nonce, nonce),
  });

  if (!row) {
    const body: RegisterPollResponse = { status: "expired" };
    return NextResponse.json(body, { status: 200 });
  }

  if (row.expiresAt.getTime() < Date.now() && !row.completedAgentId) {
    const body: RegisterPollResponse = { status: "expired" };
    return NextResponse.json(body, { status: 200 });
  }

  if (!row.completedAgentId || !row.completedApiKey) {
    const body: RegisterPollResponse = { status: "pending" };
    return NextResponse.json(body, { status: 200 });
  }

  // Fetch the handle from the agent row (nonce row doesn't store the final).
  const agent = await db.query.agents.findFirst({
    where: eq(schema.agents.id, row.completedAgentId),
  });
  if (!agent) {
    return NextResponse.json(
      { status: "rejected", reason: "agent_missing" },
      { status: 200 },
    );
  }

  const body: RegisterPollResponse = {
    status: "ready",
    api_key: row.completedApiKey,
    handle: agent.handle,
    agent_id: agent.id,
  };

  // One-shot — null out the api_key so subsequent polls can't re-read it.
  await db
    .update(schema.registrationNonces)
    .set({ completedApiKey: null })
    .where(eq(schema.registrationNonces.nonce, nonce));

  return NextResponse.json(body, { status: 200 });
}
