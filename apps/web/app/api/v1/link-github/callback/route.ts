import { NextResponse } from "next/server";
import { eq, and, isNull, gt, sql } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import {
  exchangeCodeForToken,
  fetchGithubUser,
  isGithubConfigured,
} from "@/lib/githubOauth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GitHub redirects here after the user clicks "Authorize". We exchange the
 * temporary code for an access token, fetch the user's public login, attach
 * it to the agent referenced by the state nonce, then redirect to the
 * success page so the CLI's poll picks up the result.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const nonce = url.searchParams.get("state");
  const ghError = url.searchParams.get("error");

  if (ghError || !code || !nonce) {
    return redirectToFailure(`github_oauth_error:${ghError ?? "missing_params"}`);
  }
  if (!isGithubConfigured()) {
    return redirectToFailure("github_not_configured");
  }

  const nonceRow = await db.query.githubLinkNonces.findFirst({
    where: and(
      eq(schema.githubLinkNonces.nonce, nonce),
      isNull(schema.githubLinkNonces.completedAt),
      gt(schema.githubLinkNonces.expiresAt, new Date()),
    ),
  });
  if (!nonceRow) {
    return redirectToFailure("nonce_invalid_or_expired");
  }

  const tok = await exchangeCodeForToken(code);
  if (!tok.ok) {
    await markFailed(nonce, tok.reason);
    return redirectToFailure(tok.reason);
  }

  const user = await fetchGithubUser(tok.access_token);
  if (!user.ok) {
    await markFailed(nonce, user.reason);
    return redirectToFailure(user.reason);
  }

  // Refuse to link the same GitHub login to a second agent.
  const taken = await db.query.agents.findFirst({
    where: eq(schema.agents.githubLogin, user.login),
  });
  if (taken && taken.id !== nonceRow.agentId) {
    await markFailed(nonce, "github_login_already_linked");
    return redirectToFailure("github_login_already_linked");
  }

  await db
    .update(schema.agents)
    .set({
      githubLogin: user.login,
      githubVerified: true,
      avatarUrl: user.avatar_url,
    })
    .where(eq(schema.agents.id, nonceRow.agentId));

  // Recompute leaderboard score since the +10 verified bonus now applies.
  // Cheapest: bump total_score by 10 if not already verified-counted. The
  // canonical recompute happens on next /submit or the daily cron.
  await db.execute(sql`
    update leaderboard_scores
    set total_score = total_score + 10
    where agent_id = ${nonceRow.agentId}
  `);

  await db
    .update(schema.githubLinkNonces)
    .set({
      completedGithubLogin: user.login,
      completedAt: new Date(),
    })
    .where(eq(schema.githubLinkNonces.nonce, nonce));

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://hermes-rankings.com";
  return NextResponse.redirect(
    `${siteUrl}/link/success?login=${encodeURIComponent(user.login)}`,
  );
}

async function markFailed(nonce: string, reason: string) {
  await db
    .update(schema.githubLinkNonces)
    .set({ error: reason, completedAt: new Date() })
    .where(eq(schema.githubLinkNonces.nonce, nonce));
}

function redirectToFailure(reason: string) {
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://hermes-rankings.com";
  return NextResponse.redirect(
    `${siteUrl}/link/failed?reason=${encodeURIComponent(reason)}`,
  );
}
