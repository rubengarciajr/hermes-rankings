import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Periodic recompute job. Vercel Cron hits this every 5 minutes (config in
 * apps/web/vercel.json). Vercel auto-injects an Authorization: Bearer
 * <CRON_SECRET> header for protection.
 *
 * Two jobs:
 *   1. Materialize rank_overall on leaderboard_scores so /agent/[handle]
 *      can read it without recomputing.
 *   2. Refresh achievement_catalog.rarity_pct (% of active agents who have
 *      unlocked each badge).
 */
export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const started = Date.now();

  // 1. Materialize ranks.
  await db.execute(sql`
    update leaderboard_scores ls
    set
      rank_overall = ranked.rk,
      computed_at = now()
    from (
      select
        ls2.agent_id,
        row_number() over (
          order by
            ls2.total_score desc,
            coalesce((ls2.tier_counts->>'olympian')::int, 0) desc,
            coalesce((ls2.tier_counts->>'diamond')::int, 0) desc,
            coalesce((ls2.tier_counts->>'gold')::int, 0) desc,
            coalesce((ls2.tier_counts->>'silver')::int, 0) desc,
            coalesce((ls2.tier_counts->>'copper')::int, 0) desc,
            ls2.earliest_unlock_at asc nulls last,
            a.handle asc
        )::int as rk
      from leaderboard_scores ls2
      join agents a on a.id = ls2.agent_id
      where a.status = 'active'
    ) ranked
    where ls.agent_id = ranked.agent_id
  `);

  // 2. Refresh rarity_pct on the catalog.
  await db.execute(sql`
    with active_agents as (
      select count(*)::numeric as n
      from agents
      where status = 'active'
    ),
    counts as (
      select ach.achievement_id, count(distinct ach.agent_id)::numeric as c
      from achievements_state ach
      join agents a on a.id = ach.agent_id and a.status = 'active'
      group by ach.achievement_id
    )
    update achievement_catalog ac
    set rarity_pct = case
      when (select n from active_agents) = 0 then 0
      else round(100 * c.c / (select n from active_agents), 3)
    end
    from counts c
    where ac.id = c.achievement_id
  `);

  const elapsedMs = Date.now() - started;
  return NextResponse.json({
    ok: true,
    elapsed_ms: elapsedMs,
  });
}
