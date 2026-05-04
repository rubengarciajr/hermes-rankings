import { NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";
import {
  submitRequestSchema,
  type SubmitResponse,
  type AchievementCatalogEntry,
} from "@hermesranker/schema";
import { db, schema } from "@/lib/db";
import { authenticateBearer, hashIp, readClientIp } from "@/lib/auth";
import { limiters } from "@/lib/ratelimit";
import { validateSubmission } from "@/lib/validate";
import { computeScore } from "@/lib/ranking";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const ip = readClientIp(req);
  const ipLimit = await limiters.submitByIp.limit(ip);
  if (!ipLimit.success) {
    return NextResponse.json(
      { error: "rate_limited", retry_after: ipLimit.reset },
      { status: 429 },
    );
  }

  const agent = await authenticateBearer(req.headers.get("authorization"));
  if (!agent) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const keyLimit = await limiters.submitByKey.limit(agent.id);
  if (!keyLimit.success) {
    return NextResponse.json(
      { error: "rate_limited", retry_after: keyLimit.reset },
      { status: 429 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    await logRejected(agent.id, ip, req, null, null, "invalid_json", null);
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const parsed = submitRequestSchema.safeParse(body);
  if (!parsed.success) {
    await logRejected(agent.id, ip, req, null, null, "invalid_payload", null);
    return NextResponse.json(
      { error: "invalid_payload", issues: parsed.error.issues },
      { status: 400 },
    );
  }
  const { state, scan, cli_version } = parsed.data;

  const validation = await validateSubmission(state, scan);
  if (!validation.ok) {
    await logRejected(
      agent.id,
      ip,
      req,
      state,
      scan,
      validation.reason,
      cli_version,
    );
    return NextResponse.json(
      {
        error: "payload_validation_failed",
        reason: validation.reason,
        detail: validation.detail,
      },
      { status: 400 },
    );
  }

  // Compute the new score.
  const catalogRows = await db
    .select()
    .from(schema.achievementCatalog);
  const catalogById = new Map<string, AchievementCatalogEntry>(
    catalogRows.map((r) => [
      r.id,
      {
        id: r.id,
        name: r.name,
        description: r.description,
        tier: r.tier,
        category: r.category,
        is_secret: r.isSecret,
        progress: null,
        unlocked: false,
      },
    ]),
  );

  const computed = computeScore({
    state,
    scan,
    catalogById,
    githubVerified: agent.githubVerified,
  });

  // Diff against existing achievements_state to find new unlocks.
  const previousRows = await db
    .select({ id: schema.achievementsState.achievementId })
    .from(schema.achievementsState)
    .where(eq(schema.achievementsState.agentId, agent.id));
  const previousIds = new Set(previousRows.map((r) => r.id));
  const newUnlocks = state.unlocked.filter((u) => !previousIds.has(u.id));

  // Get the old score for delta calc.
  const previousScore = await db.query.leaderboardScores.findFirst({
    where: eq(schema.leaderboardScores.agentId, agent.id),
  });
  const previousTotal = previousScore?.totalScore ?? 0;

  // Persist the submission first (so we have a record even if state writes fail).
  await db.insert(schema.submissions).values({
    agentId: agent.id,
    rawStateJson: state,
    rawScanJson: scan,
    clientVersion: cli_version,
    sourceIpHash: hashIp(ip),
    userAgent: req.headers.get("user-agent") ?? null,
    accepted: true,
  });

  // Upsert achievements_state. Strategy: delete all rows for this agent and
  // re-insert. Simpler than per-row upsert and submissions are infrequent.
  await db
    .delete(schema.achievementsState)
    .where(eq(schema.achievementsState.agentId, agent.id));

  if (state.unlocked.length > 0) {
    await db.insert(schema.achievementsState).values(
      state.unlocked.map((u) => {
        const cat = catalogById.get(u.id);
        return {
          agentId: agent.id,
          achievementId: u.id,
          tier: u.tier,
          category: cat?.category ?? "UNKNOWN",
          unlockedAt: new Date(u.unlocked_at),
          progressNum: u.progress_num ?? null,
          progressDen: u.progress_den ?? null,
          isSecret: cat?.is_secret ?? false,
        };
      }),
    );
  }

  // Upsert leaderboard_scores for this agent.
  await db
    .insert(schema.leaderboardScores)
    .values({
      agentId: agent.id,
      totalScore: computed.totalScore,
      tierCounts: computed.tierCounts,
      categoryCount: computed.categoryCount,
      earliestUnlockAt: computed.earliestUnlockAt,
    })
    .onConflictDoUpdate({
      target: schema.leaderboardScores.agentId,
      set: {
        totalScore: computed.totalScore,
        tierCounts: computed.tierCounts,
        categoryCount: computed.categoryCount,
        earliestUnlockAt: computed.earliestUnlockAt,
        computedAt: sql`now()`,
      },
    });

  // Touch the agent's lastSubmittedAt.
  await db
    .update(schema.agents)
    .set({ lastSubmittedAt: sql`now()` })
    .where(eq(schema.agents.id, agent.id));

  // Compute current rank lazily — count agents with strictly higher score.
  const higher = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(schema.leaderboardScores)
    .where(sql`${schema.leaderboardScores.totalScore} > ${computed.totalScore}`);
  const rank = (higher[0]?.c ?? 0) + 1;

  const response: SubmitResponse = {
    rank_overall: rank,
    score: computed.totalScore,
    delta_score: computed.totalScore - previousTotal,
    new_unlocks: newUnlocks.map((u) => ({
      id: u.id,
      name: catalogById.get(u.id)?.name ?? u.id,
      tier: u.tier,
    })),
  };
  return NextResponse.json(response, { status: 200 });
}

async function logRejected(
  agentId: string,
  ip: string,
  req: Request,
  state: unknown,
  scan: unknown,
  reason: string,
  cliVersion: string | null,
) {
  try {
    await db.insert(schema.submissions).values({
      agentId,
      rawStateJson: state ?? {},
      rawScanJson: scan ?? {},
      clientVersion: cliVersion ?? "unknown",
      sourceIpHash: hashIp(ip),
      userAgent: req.headers.get("user-agent") ?? null,
      accepted: false,
      rejectReason: reason,
    });
  } catch {
    // best-effort; don't surface logging failures
  }
}
