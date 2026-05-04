import "./loadEnv";
import postgres from "postgres";

async function main() {
  const url = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
  if (!url) throw new Error("DIRECT_URL or DATABASE_URL must be set");
  const sql = postgres(url, { max: 1, prepare: false });

  const tables = await sql<{ table_name: string }[]>`
    select table_name from information_schema.tables
    where table_schema = 'public'
    order by table_name
  `;
  console.log(`Tables (${tables.length}):`);
  for (const t of tables) console.log(`  · ${t.table_name}`);

  const rows = await sql<
    { tier: string; count: string }[]
  >`select tier, count(*)::text as count from achievement_catalog group by tier order by tier`;
  console.log(`\nachievement_catalog by tier:`);
  for (const r of rows) console.log(`  · ${r.tier.padEnd(10)} ${r.count}`);

  const total = await sql<
    { count: string }[]
  >`select count(*)::text as count from achievement_catalog`;
  console.log(`\nTotal seeded: ${total[0]?.count}`);

  await sql.end();
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
