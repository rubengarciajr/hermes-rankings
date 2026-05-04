import { NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { authenticateBearer, generateNonce } from "@/lib/auth";
import {
  buildAuthorizeUrl,
  isGithubConfigured,
} from "@/lib/githubOauth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NONCE_TTL_MIN = 10;

export async function POST(req: Request) {
  if (!isGithubConfigured()) {
    return NextResponse.json(
      {
        error: "github_not_configured",
        message:
          "GitHub linking is not enabled on this server. Add AUTH_GITHUB_ID and AUTH_GITHUB_SECRET env vars.",
      },
      { status: 503 },
    );
  }

  const agent = await authenticateBearer(req.headers.get("authorization"));
  if (!agent) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const nonce = generateNonce();
  const expiresAt = new Date(Date.now() + NONCE_TTL_MIN * 60_000);
  await db.insert(schema.githubLinkNonces).values({
    nonce,
    agentId: agent.id,
    expiresAt,
  });

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://hermes-rankings.com";
  const authorizeUrl = buildAuthorizeUrl({ state: nonce, siteUrl });

  return NextResponse.json(
    {
      authorize_url: authorizeUrl,
      nonce,
      poll_after_ms: 2_000,
      expires_in_sec: NONCE_TTL_MIN * 60,
    },
    { status: 200 },
  );
}
