import "server-only";
import { eq, sql, desc, and } from "drizzle-orm";
import type { Tier } from "@hermesranker/schema";
import { db, schema } from "./db";

export type AgentBadge = {
  id: string;
  name: string;
  description: string;
  tier: Tier;
  category: string;
  isSecret: boolean;
  unlockedAt: Date;
  progressNum: number | null;
  progressDen: number | null;
  rarityPct: number;
};

export type AgentProfile = {
  handle: string;
  displayName: string | null;
  bio: string | null;
  avatarUrl: string | null;
  githubLogin: string | null;
  githubVerified: boolean;
  createdAt: Date;
  lastSubmittedAt: Date | null;
  totalScore: number;
  rankOverall: number | null;
  liveRank: number;
  tierCounts: Record<Tier, number>;
  categoryCount: number;
  earliestUnlockAt: Date | null;
  badges: AgentBadge[];
};

/**
 * Fetch a public agent profile by handle. Returns null if not found or
 * status != 'active'. Computes liveRank on the fly so a fresh submission
 * is reflected immediately, even before the cron materializes rank_overall.
 */
export async function getAgentProfile(
  handle: string,
): Promise<AgentProfile | null> {
  const agent = await db.query.agents.findFirst({
    where: and(
      eq(schema.agents.handle, handle),
      eq(schema.agents.status, "active"),
    ),
  });
  if (!agent) return null;

  const score = await db.query.leaderboardScores.findFirst({
    where: eq(schema.leaderboardScores.agentId, agent.id),
  });

  const tierCounts: Record<Tier, number> =
    (score?.tierCounts as Record<Tier, number> | undefined) ?? {
      copper: 0,
      silver: 0,
      gold: 0,
      diamond: 0,
      olympian: 0,
    };

  // Live rank: count active agents with strictly higher score.
  let liveRank = 1;
  if (score) {
    const higher = await db.execute<{ c: number }>(sql`
      select count(*)::int as c
      from leaderboard_scores ls
      join agents a on a.id = ls.agent_id
      where a.status = 'active'
        and (
          ls.total_score > ${score.totalScore}
          or (ls.total_score = ${score.totalScore}
              and a.handle < ${agent.handle})
        )
    `);
    liveRank = (higher[0]?.c ?? 0) + 1;
  }

  const badgeRows = await db.execute<{
    id: string;
    name: string;
    description: string;
    tier: Tier;
    category: string;
    is_secret: boolean;
    unlocked_at: Date;
    progress_num: number | null;
    progress_den: number | null;
    rarity_pct: string;
  }>(sql`
    select
      ach.id,
      ach.name,
      ach.description,
      st.tier,
      st.category,
      st.is_secret,
      st.unlocked_at,
      st.progress_num,
      st.progress_den,
      ach.rarity_pct
    from achievements_state st
    join achievement_catalog ach on ach.id = st.achievement_id
    where st.agent_id = ${agent.id}
    order by
      case st.tier
        when 'olympian' then 0
        when 'diamond' then 1
        when 'gold' then 2
        when 'silver' then 3
        when 'copper' then 4
      end,
      st.unlocked_at desc
  `);

  return {
    handle: agent.handle,
    displayName: agent.displayName,
    bio: agent.bio,
    avatarUrl: agent.avatarUrl,
    githubLogin: agent.githubLogin,
    githubVerified: agent.githubVerified,
    createdAt: new Date(agent.createdAt),
    lastSubmittedAt: agent.lastSubmittedAt
      ? new Date(agent.lastSubmittedAt)
      : null,
    totalScore: score?.totalScore ?? 0,
    rankOverall: score?.rankOverall ?? null,
    liveRank,
    tierCounts,
    categoryCount: score?.categoryCount ?? 0,
    earliestUnlockAt: score?.earliestUnlockAt
      ? new Date(score.earliestUnlockAt)
      : null,
    badges: badgeRows.map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description,
      tier: r.tier,
      category: r.category,
      isSecret: r.is_secret,
      unlockedAt: new Date(r.unlocked_at),
      progressNum: r.progress_num,
      progressDen: r.progress_den,
      rarityPct: parseFloat(r.rarity_pct),
    })),
  };
}

export async function getAllHandles(limit = 1000): Promise<string[]> {
  const rows = await db
    .select({ handle: schema.agents.handle })
    .from(schema.agents)
    .where(eq(schema.agents.status, "active"))
    .orderBy(desc(schema.agents.lastSubmittedAt))
    .limit(limit);
  return rows.map((r) => r.handle);
}
