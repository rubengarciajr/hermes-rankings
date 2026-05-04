import "./loadEnv";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { sql } from "drizzle-orm";
import { z } from "zod";
import { achievementCatalog } from "./schema";

/**
 * Replace the achievement_catalog with entries derived from a real
 * Hermes scan_snapshot.json file. Run once with a path to a freshly
 * generated snapshot:
 *
 *   tsx packages/db/src/seedFromScan.ts ~/.hermes/plugins/hermes-achievements/scan_snapshot.json
 */

const RAW_TIERS = ["Copper", "Silver", "Gold", "Diamond", "Olympian"] as const;
const TIER_LOWER = {
  Copper: "copper",
  Silver: "silver",
  Gold: "gold",
  Diamond: "diamond",
  Olympian: "olympian",
} as const;

const rawAchievementSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    description: z.string(),
    category: z.string(),
    tier: z.enum(RAW_TIERS).nullable().optional(),
    secret: z.boolean().optional(),
    state: z.enum(["unlocked", "discovered", "secret"]),
    tiers: z
      .array(z.object({ name: z.enum(RAW_TIERS) }))
      .optional(),
  })
  .passthrough();

const rawScanSnapshotSchema = z
  .object({
    achievements: z.array(rawAchievementSchema),
  })
  .passthrough();

async function main() {
  const path = process.argv[2];
  if (!path) {
    console.error(
      "Usage: tsx packages/db/src/seedFromScan.ts <scan_snapshot.json>",
    );
    process.exit(1);
  }

  const raw = JSON.parse(readFileSync(resolve(path), "utf8"));
  const parsed = rawScanSnapshotSchema.safeParse(raw);
  if (!parsed.success) {
    console.error("scan_snapshot.json shape unexpected:");
    console.error(JSON.stringify(parsed.error.issues.slice(0, 5), null, 2));
    process.exit(1);
  }
  const { achievements } = parsed.data;
  console.log(`Found ${achievements.length} achievements in catalog.`);

  const url = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
  if (!url) throw new Error("DIRECT_URL or DATABASE_URL must be set");
  const client = postgres(url, { max: 1, prepare: false });
  const db = drizzle(client);

  const values = achievements.map((a) => {
    // Default tier: lowest tier in `tiers` array, or whatever `tier` says,
    // or copper if neither is set (rare). Catalog tier is the *lowest*
    // tier that exists for the badge — what we use to weight unlocks at
    // their actual earned tier later.
    const tierRaw =
      a.tier ??
      a.tiers?.[0]?.name ??
      "Copper";
    const isSecret = a.secret === true || a.state === "secret";
    return {
      id: a.id,
      name: isSecret ? a.name : a.name, // keep as-is; "???" for secret is intentional
      description: a.description,
      tier: TIER_LOWER[tierRaw],
      category: a.category,
      isSecret,
    };
  });

  // Replace strategy: insert all, on conflict update everything except
  // created_at. Existing rows get refreshed; new rows get added.
  await db
    .insert(achievementCatalog)
    .values(values)
    .onConflictDoUpdate({
      target: achievementCatalog.id,
      set: {
        name: sql`excluded.name`,
        description: sql`excluded.description`,
        tier: sql`excluded.tier`,
        category: sql`excluded.category`,
        isSecret: sql`excluded.is_secret`,
      },
    });

  const counts = await client<{ tier: string; count: string }[]>`
    select tier, count(*)::text as count from achievement_catalog
    group by tier order by tier
  `;
  console.log("\nCatalog now contains:");
  for (const r of counts) console.log(`  ${r.tier.padEnd(10)} ${r.count}`);

  await client.end();
  console.log("\nDone.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
