import { NextResponse } from "next/server";
import { getAgentProfile } from "@/lib/agent";

export const runtime = "nodejs";
export const revalidate = 30;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ handle: string }> },
) {
  const { handle } = await params;
  const profile = await getAgentProfile(handle);
  if (!profile) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  return NextResponse.json(
    {
      handle: profile.handle,
      display_name: profile.displayName,
      bio: profile.bio,
      avatar_url: profile.avatarUrl,
      github_login: profile.githubLogin,
      github_verified: profile.githubVerified,
      created_at: profile.createdAt.toISOString(),
      last_submitted_at: profile.lastSubmittedAt?.toISOString() ?? null,
      score: {
        total: profile.totalScore,
        rank_overall: profile.rankOverall,
        live_rank: profile.liveRank,
        tier_counts: profile.tierCounts,
        category_count: profile.categoryCount,
        earliest_unlock_at: profile.earliestUnlockAt?.toISOString() ?? null,
      },
      badges: profile.badges.map((b) => ({
        id: b.id,
        name: b.name,
        description: b.description,
        tier: b.tier,
        category: b.category,
        is_secret: b.isSecret,
        unlocked_at: b.unlockedAt.toISOString(),
        progress_num: b.progressNum,
        progress_den: b.progressDen,
        rarity_pct: b.rarityPct,
      })),
    },
    {
      status: 200,
      headers: {
        "cache-control": "public, s-maxage=30, stale-while-revalidate=120",
      },
    },
  );
}
