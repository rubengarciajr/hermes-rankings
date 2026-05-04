import { NextResponse } from "next/server";
import {
  detectAnomalies,
  recomputeRanks,
  recomputeRarities,
} from "@/lib/anomaly";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Periodic recompute job. Vercel Cron hits this daily at 5am UTC (config in
 * apps/web/vercel.json — Hobby plan caps at 1/day; Pro can crank to 5min).
 * Vercel auto-injects an Authorization: Bearer <CRON_SECRET> header.
 *
 * Three jobs:
 *   1. recomputeRanks    — materialize rank_overall on leaderboard_scores
 *   2. recomputeRarities — refresh achievement_catalog.rarity_pct
 *   3. detectAnomalies   — flag suspicious agents (shared IP, fast Olympian, dupe payload)
 */
export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const started = Date.now();
  const ranksMs = await time(recomputeRanks);
  const rarityMs = await time(recomputeRarities);
  const anomalies = await detectAnomalies();
  const elapsedMs = Date.now() - started;

  return NextResponse.json({
    ok: true,
    elapsed_ms: elapsedMs,
    timings: {
      ranks_ms: ranksMs,
      rarity_ms: rarityMs,
    },
    anomalies: {
      flagged: anomalies.flagged,
      reasons: anomalies.reasons.slice(0, 20),
    },
  });
}

async function time(fn: () => Promise<unknown>): Promise<number> {
  const t0 = Date.now();
  await fn();
  return Date.now() - t0;
}
