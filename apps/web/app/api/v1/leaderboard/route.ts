import { NextResponse } from "next/server";
import { getLeaderboard } from "@/lib/leaderboard";
import type { LeaderboardResponse } from "@hermesranker/schema";

export const runtime = "nodejs";
export const revalidate = 60;

export async function GET(req: Request) {
  const url = new URL(req.url);
  const limitRaw = url.searchParams.get("limit");
  const limit = limitRaw ? Math.min(Math.max(parseInt(limitRaw, 10) || 100, 1), 500) : 100;

  const { rows, computedAt } = await getLeaderboard({ limit });

  const body: LeaderboardResponse = {
    entries: rows.map((r) => ({
      rank: r.rank,
      handle: r.handle,
      display_name: r.displayName,
      score: r.score,
      tier_counts: r.tierCounts,
      category_count: r.categoryCount,
      github_verified: r.githubVerified,
      last_seen: r.lastSubmittedAt
        ? r.lastSubmittedAt.toISOString()
        : null,
    })),
    next_cursor: null,
    computed_at: computedAt.toISOString(),
  };

  return NextResponse.json(body, {
    status: 200,
    headers: {
      "cache-control": "public, s-maxage=60, stale-while-revalidate=300",
    },
  });
}
