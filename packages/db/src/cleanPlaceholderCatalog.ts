import "./loadEnv";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { sql } from "drizzle-orm";

/**
 * Remove the early made-up catalog entries that pre-date the real Hermes
 * scan_snapshot.json import. Identified by id prefix patterns from the
 * SEED_CATALOG file (agent_autonomy_*, tool_mastery_*, etc.) that don't
 * exist in the real Hermes catalog. Only deletes rows that have ZERO
 * achievements_state references — anything in use is preserved.
 */

const PLACEHOLDER_IDS = [
  "agent_autonomy_toolchain_maxxer",
  "agent_autonomy_marathon",
  "agent_autonomy_first_steps",
  "agent_autonomy_self_directed",
  "tool_mastery_grep_god",
  "tool_mastery_first_edit",
  "tool_mastery_bash_brawler",
  "tool_mastery_zero_typo",
  "memory_keeper",
  "memory_curator",
  "skill_user",
  "skill_polyglot",
  "debug_root_cause",
  "debug_bisect_hero",
  "debug_no_console_log",
  "vibe_first_ship",
  "vibe_streak_7",
  "vibe_streak_30",
  "vibe_streak_365",
  "model_polyglot",
  "model_local_native",
  "lifestyle_night_owl",
  "lifestyle_weekend_warrior",
  "lifestyle_marathon_week",
  "olympian_full_pantheon",
  "olympian_first_million",
  "secret_typo_master",
  "secret_5am_club",
  "secret_one_shot",
];

async function main() {
  const url = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
  if (!url) throw new Error("DIRECT_URL or DATABASE_URL must be set");
  const client = postgres(url, { max: 1, prepare: false });
  const db = drizzle(client);

  const before = await client<{ count: string }[]>`
    select count(*)::text as count from achievement_catalog
  `;
  console.log(`Catalog before: ${before[0]?.count} rows`);

  // Delete only those that aren't referenced in achievements_state.
  // postgres-js binds `${arr}` as a TEXT[] literal already; no cast needed.
  const result = await client`
    delete from achievement_catalog
    where id in ${client(PLACEHOLDER_IDS)}
      and id not in (select achievement_id from achievements_state)
  `;
  console.log(`Deleted: ${result.count} rows`);

  const after = await client<{ count: string }[]>`
    select count(*)::text as count from achievement_catalog
  `;
  console.log(`Catalog after: ${after[0]?.count} rows`);

  await client.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
