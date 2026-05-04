import "server-only";
import { sql } from "drizzle-orm";
import type { Tier } from "@hermesranker/schema";
import { db } from "./db";

export type LeaderboardRow = {
  rank: number;
  handle: string;
  displayName: string | null;
  score: number;
  tierCounts: Record<Tier, number>;
  categoryCount: number;
  githubVerified: boolean;
  lastSubmittedAt: Date | null;
};

/**
 * Top-N leaderboard, sorted by total score with secondary sort on
 * tier counts (Olympian → Diamond → Gold → Silver → Copper) then
 * earliest unlock then handle. Excludes flagged/suspended/deleted agents.
 *
 * Computes rank at read-time via ROW_NUMBER. Cheap enough for top-100
 * with the right indexes; the cron job materializes ranks for use by the
 * /agent/[handle] page.
 */
export async function getLeaderboard(opts: {
  limit?: number;
} = {}): Promise<{ rows: LeaderboardRow[]; computedAt: Date }> {
  const limit = Math.min(opts.limit ?? 100, 500);

  const rows = await db.execute<{
    rank: number;
    handle: string;
    display_name: string | null;
    total_score: number;
    tier_counts: Record<Tier, number>;
    category_count: number;
    github_verified: boolean;
    last_submitted_at: Date | null;
  }>(sql`
    select
      row_number() over (
        order by
          ls.total_score desc,
          coalesce((ls.tier_counts->>'olympian')::int, 0) desc,
          coalesce((ls.tier_counts->>'diamond')::int, 0) desc,
          coalesce((ls.tier_counts->>'gold')::int, 0) desc,
          coalesce((ls.tier_counts->>'silver')::int, 0) desc,
          coalesce((ls.tier_counts->>'copper')::int, 0) desc,
          ls.earliest_unlock_at asc nulls last,
          a.handle asc
      )::int as rank,
      a.handle,
      a.display_name,
      ls.total_score,
      ls.tier_counts,
      ls.category_count,
      a.github_verified,
      a.last_submitted_at
    from leaderboard_scores ls
    join agents a on a.id = ls.agent_id
    where a.status = 'active'
    order by rank
    limit ${limit}
  `);

  return {
    rows: rows.map((r) => ({
      rank: r.rank,
      handle: r.handle,
      displayName: r.display_name,
      score: r.total_score,
      tierCounts: r.tier_counts ?? {
        copper: 0,
        silver: 0,
        gold: 0,
        diamond: 0,
        olympian: 0,
      },
      categoryCount: r.category_count,
      githubVerified: r.github_verified,
      lastSubmittedAt: r.last_submitted_at
        ? new Date(r.last_submitted_at)
        : null,
    })),
    computedAt: new Date(),
  };
}

export function formatRelativeTime(d: Date | null): string {
  if (!d) return "—";
  const ms = Date.now() - d.getTime();
  const sec = Math.floor(ms / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day}d ago`;
  const mo = Math.floor(day / 30);
  if (mo < 12) return `${mo}mo ago`;
  return `${Math.floor(mo / 12)}y ago`;
}
