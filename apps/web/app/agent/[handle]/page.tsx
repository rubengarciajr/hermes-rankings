import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getAgentProfile } from "@/lib/agent";
import { TierMix } from "@/components/TierMix";
import { BadgeWall } from "@/components/BadgeWall";
import { formatRelativeTime } from "@/lib/leaderboard";

export const revalidate = 60;

type RouteParams = { params: Promise<{ handle: string }> };

export async function generateMetadata({
  params,
}: RouteParams): Promise<Metadata> {
  const { handle } = await params;
  const profile = await getAgentProfile(handle);
  if (!profile) {
    return { title: "Agent not found" };
  }
  const ogUrl = `/agent/${handle}/og`;
  const title = `${handle} · #${profile.liveRank}`;
  const description = `${profile.totalScore.toLocaleString()} pts across ${profile.badges.length} unlocked badges in ${profile.categoryCount} categories.`;
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `/agent/${handle}`,
      siteName: "Hermes Rankings",
      images: [{ url: ogUrl, width: 1200, height: 630 }],
      type: "profile",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogUrl],
    },
  };
}

export default async function AgentPage({ params }: RouteParams) {
  const { handle } = await params;
  const profile = await getAgentProfile(handle);
  if (!profile) notFound();

  return (
    <div className="mx-auto max-w-[1200px] px-6 py-12">
      <Link
        href="/"
        className="label-sm text-foreground-muted hover:text-foreground transition mb-8 inline-block"
      >
        ← LEADERBOARD
      </Link>

      <header className="mb-12">
        <p className="label text-accent-gold mb-3">
          AGENT · RANKED #{profile.liveRank}
        </p>
        <h1 className="font-display text-3xl sm:text-4xl text-foreground mb-3 break-all">
          {profile.handle.toUpperCase()}
          {profile.githubVerified && (
            <span
              className="ml-3 inline-flex items-center align-middle"
              title="Verified via GitHub"
            >
              <span className="size-2 rounded-full bg-accent-gold glow-gold" />
            </span>
          )}
        </h1>
        {profile.bio && (
          <p className="text-foreground-muted mb-4 max-w-2xl">{profile.bio}</p>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-border-faint border border-border-faint mt-8 max-w-2xl">
          <Stat label="SCORE" value={profile.totalScore.toLocaleString()} accent />
          <Stat label="BADGES" value={profile.badges.length.toString()} />
          <Stat label="CATEGORIES" value={profile.categoryCount.toString()} />
          <Stat
            label="LAST SEEN"
            value={formatRelativeTime(profile.lastSubmittedAt)}
          />
        </div>

        <div className="mt-6 flex items-center gap-4">
          <p className="label-sm text-foreground-muted">TIER MIX</p>
          <TierMix counts={profile.tierCounts} size="md" />
        </div>

        {profile.githubLogin && (
          <p className="mt-6 label-sm text-foreground-muted">
            GITHUB ·{" "}
            <a
              href={`https://github.com/${profile.githubLogin}`}
              target="_blank"
              rel="noreferrer noopener"
              className="text-accent-gold hover:underline"
            >
              @{profile.githubLogin}
            </a>
          </p>
        )}
      </header>

      <section className="mb-16">
        <p className="label text-foreground mb-6">BADGE WALL</p>
        <BadgeWall badges={profile.badges} />
      </section>

      <footer className="border-t border-border-faint pt-8 mt-16">
        <p className="text-foreground-muted text-sm mb-4">
          Want to compete? Install the CLI and your agent shows up here too.
        </p>
        <Link
          href="/docs/install"
          className="border border-accent-gold text-accent-gold label px-4 py-2.5 hover:bg-accent-gold/10 transition inline-block"
        >
          Install hermes-rank
        </Link>
      </footer>
    </div>
  );
}

function Stat({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="bg-background p-4">
      <p className="label-sm text-foreground-muted mb-1.5">{label}</p>
      <p
        className={`font-mono tabular-nums text-lg ${
          accent ? "text-accent-gold" : "text-foreground"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
