import "server-only";
import { sql, eq, and, gt, ne } from "drizzle-orm";
import { db, schema } from "./db";

export type AnomalyResult = {
  flagged: number;
  reasons: { handle: string; reason: string }[];
};

/**
 * Cheap pattern checks that mark suspicious agents as `status='flagged'`
 * and write a public audit_log entry. Designed to run from the daily cron.
 *
 * Detection rules — kept conservative to minimise false positives:
 *   1. `shared_ip_fingerprints`  — one source IP hash backing 5+ distinct fingerprints
 *   2. `impossibly_fast_olympian` — Olympian unlocked < 72h after registration
 *   3. `duplicate_payload`        — two agents submitting byte-identical state JSON
 *
 * Already-flagged agents are skipped on subsequent runs.
 */
export async function detectAnomalies(): Promise<AnomalyResult> {
  const reasons: { handle: string; reason: string }[] = [];

  // 1. Shared-IP fingerprint clusters.
  const ipClusters = await db.execute<{
    source_ip_hash: string;
    fingerprints: number;
  }>(sql`
    select s.source_ip_hash, count(distinct a.fingerprint)::int as fingerprints
    from submissions s
    join agents a on a.id = s.agent_id
    where a.status = 'active'
    group by s.source_ip_hash
    having count(distinct a.fingerprint) >= 5
  `);
  for (const cluster of ipClusters) {
    const agents = await db.execute<{
      id: string;
      handle: string;
    }>(sql`
      select distinct a.id, a.handle
      from submissions s
      join agents a on a.id = s.agent_id
      where s.source_ip_hash = ${cluster.source_ip_hash}
        and a.status = 'active'
    `);
    for (const ag of agents) {
      await flag(
        ag.id,
        "shared_ip_fingerprints",
        `Source IP backs ${cluster.fingerprints} fingerprints (≥5 threshold)`,
      );
      reasons.push({ handle: ag.handle, reason: "shared_ip_fingerprints" });
    }
  }

  // 2. Impossibly fast Olympian unlocks (< 72h after agent created).
  const fastOlympian = await db.execute<{
    id: string;
    handle: string;
    hours: number;
  }>(sql`
    select a.id, a.handle,
           extract(epoch from (st.unlocked_at - a.created_at)) / 3600 as hours
    from achievements_state st
    join agents a on a.id = st.agent_id
    where st.tier = 'olympian'
      and a.status = 'active'
      and st.unlocked_at - a.created_at < interval '72 hours'
  `);
  for (const row of fastOlympian) {
    await flag(
      row.id,
      "impossibly_fast_olympian",
      `Olympian unlocked ${Math.round(row.hours)}h after registration (< 72h threshold)`,
    );
    reasons.push({
      handle: row.handle,
      reason: "impossibly_fast_olympian",
    });
  }

  // 3. Duplicate state payloads across agents (byte-identical raw_state_json).
  // Use md5 over the canonical jsonb as the dedup key. Real prod could use a
  // generated column for performance; for v1 it's fine inline.
  const dupes = await db.execute<{
    digest: string;
    handles: string[];
    ids: string[];
  }>(sql`
    select md5(s.raw_state_json::text) as digest,
           array_agg(distinct a.handle) as handles,
           array_agg(distinct a.id::text) as ids
    from submissions s
    join agents a on a.id = s.agent_id
    where s.accepted = true
      and a.status = 'active'
      and s.received_at > now() - interval '7 days'
    group by md5(s.raw_state_json::text)
    having count(distinct a.id) >= 2
  `);
  for (const dupe of dupes) {
    for (let i = 0; i < dupe.ids.length; i++) {
      const id = dupe.ids[i];
      const handle = dupe.handles[i];
      if (!id || !handle) continue;
      await flag(
        id,
        "duplicate_payload",
        `Submitted byte-identical state.json shared with ${dupe.handles.length - 1} other agent(s)`,
      );
      reasons.push({ handle, reason: "duplicate_payload" });
    }
  }

  return { flagged: reasons.length, reasons };
}

/**
 * Flag an agent + write a public audit_log entry. No-op if already flagged
 * for the same reason.
 */
async function flag(agentId: string, reason: string, detail: string) {
  // Skip if already in this exact state.
  const existing = await db.query.auditLog.findFirst({
    where: and(
      eq(schema.auditLog.targetAgent, agentId),
      eq(schema.auditLog.action, "flag"),
      eq(schema.auditLog.reason, reason),
    ),
  });
  if (existing) return;

  await db
    .update(schema.agents)
    .set({ status: "flagged" })
    .where(
      and(eq(schema.agents.id, agentId), ne(schema.agents.status, "suspended")),
    );

  await db.insert(schema.auditLog).values({
    actor: "system:anomaly",
    action: "flag",
    targetAgent: agentId,
    reason,
    evidence: { detail },
    public: true,
  });
}

/** Refresh `rarity_pct` based on currently active+unlocked badges. */
export async function recomputeRarities(): Promise<void> {
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
}

/** Materialize rank_overall for fast per-agent rank reads. */
export async function recomputeRanks(): Promise<void> {
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
}
