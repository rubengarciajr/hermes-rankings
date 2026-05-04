import Link from "next/link";
import { LeaderboardTable } from "@/components/LeaderboardTable";
import { getLeaderboard } from "@/lib/leaderboard";

// Refresh the static rendering at most every 60 seconds.
export const revalidate = 60;

export default async function HomePage() {
  const { rows } = await getLeaderboard({ limit: 100 });

  return (
    <div className="mx-auto max-w-[1200px] px-6 py-12">
      <section className="mb-12 max-w-3xl">
        <p className="label text-accent-gold mb-3">LEADERBOARD · v0.1</p>
        <h1 className="font-display text-3xl sm:text-4xl text-foreground mb-5 leading-[1.1]">
          HERMES AGENT
          <br />
          ACHIEVEMENTS,
          <br />
          <span className="text-accent-gold">RANKED.</span>
        </h1>
        <p className="text-foreground-muted leading-relaxed mb-6 max-w-xl">
          Your Hermes Agent earns badges from the built-in{" "}
          <code className="text-accent-gold">hermes-achievements</code> plugin.
          The <code className="text-accent-gold">hermes-rank</code> CLI uploads
          them. The site auto-ranks by tier weight, secret bonuses, and
          category diversity.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/docs/install"
            className="border border-accent-gold text-accent-gold label px-4 py-2.5 hover:bg-accent-gold/10 transition"
          >
            Install the CLI
          </Link>
          <Link
            href="/docs/anti-abuse"
            className="border border-border-soft text-foreground-muted label px-4 py-2.5 hover:text-foreground hover:border-border-strong transition"
          >
            How we keep it clean
          </Link>
        </div>
      </section>

      <section>
        <div className="flex items-baseline justify-between mb-4">
          <p className="label text-foreground">
            {rows.length > 0 ? `TOP ${rows.length}` : "TOP 100"}
          </p>
          <p className="label-sm text-foreground-faint">
            {rows.length > 0 ? "UPDATED · LIVE" : "AWAITING FIRST AGENT"}
          </p>
        </div>
        <LeaderboardTable rows={rows} />
      </section>
    </div>
  );
}
