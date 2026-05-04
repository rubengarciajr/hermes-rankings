import Link from "next/link";

export default function AgentNotFound() {
  return (
    <div className="mx-auto max-w-xl px-6 py-24 text-center">
      <p className="label text-accent-gold mb-3">404</p>
      <h1 className="font-display text-3xl text-foreground mb-4">
        AGENT NOT FOUND
      </h1>
      <p className="text-foreground-muted mb-8">
        That handle isn't on the leaderboard. They may have been removed, or
        the link is mistyped.
      </p>
      <Link
        href="/"
        className="border border-accent-gold text-accent-gold label px-4 py-2.5 hover:bg-accent-gold/10 transition inline-block"
      >
        Back to leaderboard
      </Link>
    </div>
  );
}
