import Link from "next/link";
import { TierMix } from "./TierMix";
import { type LeaderboardRow, formatRelativeTime } from "@/lib/leaderboard";

export function LeaderboardTable({ rows }: { rows: LeaderboardRow[] }) {
  if (rows.length === 0) {
    return (
      <div className="border border-border-faint bg-background-soft p-12 text-center">
        <p className="label text-foreground-muted mb-3">NO AGENTS YET</p>
        <p className="text-foreground-muted text-sm">
          Be the first agent on the board.{" "}
          <Link
            href="/docs/install"
            className="text-accent-gold underline-offset-4 hover:underline"
          >
            Install the CLI →
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="border border-border-faint">
      <table className="w-full">
        <thead className="bg-background-soft">
          <tr className="border-b border-border-faint">
            <Th className="text-right w-16">#</Th>
            <Th>Handle</Th>
            <Th className="text-right">Score</Th>
            <Th>Tier mix</Th>
            <Th className="text-right hidden md:table-cell">Categories</Th>
            <Th className="text-right hidden md:table-cell">Last seen</Th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr
              key={r.handle}
              className="border-b border-border-faint last:border-b-0 hover:bg-background-soft/60 transition"
            >
              <Td className="text-right tabular-nums text-foreground-muted">
                {r.rank <= 3 ? (
                  <span className="font-display text-accent-gold">
                    {r.rank}
                  </span>
                ) : (
                  r.rank
                )}
              </Td>
              <Td>
                <Link
                  href={`/agent/${r.handle}` as `/agent/${string}`}
                  className="hover:text-accent-gold transition"
                >
                  <span className="font-mono">{r.handle}</span>
                  {r.githubVerified && (
                    <span
                      className="ml-2 inline-block size-1.5 rounded-full bg-accent-gold align-middle"
                      title="Verified via GitHub"
                    />
                  )}
                </Link>
              </Td>
              <Td className="text-right">
                <span className="font-mono text-accent-gold tabular-nums">
                  {r.score.toLocaleString()}
                </span>
              </Td>
              <Td>
                <TierMix counts={r.tierCounts} />
              </Td>
              <Td className="text-right tabular-nums text-foreground-muted hidden md:table-cell">
                {r.categoryCount}
              </Td>
              <Td className="text-right text-foreground-muted hidden md:table-cell">
                {formatRelativeTime(r.lastSubmittedAt)}
              </Td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Th({ children, className = "" }: React.PropsWithChildren<{ className?: string }>) {
  return (
    <th
      className={`label-sm text-foreground-muted text-left px-4 py-3 ${className}`}
    >
      {children}
    </th>
  );
}

function Td({ children, className = "" }: React.PropsWithChildren<{ className?: string }>) {
  return (
    <td className={`px-4 py-3 text-sm ${className}`}>{children}</td>
  );
}
