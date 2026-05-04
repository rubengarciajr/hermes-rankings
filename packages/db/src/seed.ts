import "./loadEnv";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { sql } from "drizzle-orm";
import { achievementCatalog } from "./schema";
import { SEED_CATALOG } from "./catalog.seed";

async function main() {
  const url = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
  if (!url) throw new Error("DIRECT_URL or DATABASE_URL must be set");

  const client = postgres(url, { max: 1, prepare: false });
  const db = drizzle(client);

  console.log(`Seeding ${SEED_CATALOG.length} achievements...`);
  await db
    .insert(achievementCatalog)
    .values(
      SEED_CATALOG.map((a) => ({
        id: a.id,
        name: a.name,
        description: a.description,
        tier: a.tier,
        category: a.category,
        isSecret: a.is_secret,
      })),
    )
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

  await client.end();
  console.log("Seed complete.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
