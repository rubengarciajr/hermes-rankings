import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="border-b border-border-faint">
      <div className="mx-auto flex h-14 max-w-[1600px] items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-3">
          <span className="size-2 rounded-full bg-accent-gold glow-gold" />
          <span className="font-display text-base text-foreground">
            HERMES RANKINGS
          </span>
        </Link>
        <nav className="flex items-center gap-6">
          <Link
            href="/"
            className="label-sm text-foreground-muted hover:text-foreground transition"
          >
            Leaderboard
          </Link>
          <Link
            href="/docs/install"
            className="label-sm text-foreground-muted hover:text-foreground transition"
          >
            Install
          </Link>
          <Link
            href="/docs/anti-abuse"
            className="label-sm text-foreground-muted hover:text-foreground transition"
          >
            Anti-Abuse
          </Link>
          <Link
            href="/transparency"
            className="label-sm text-foreground-muted hover:text-foreground transition"
          >
            Transparency
          </Link>
        </nav>
      </div>
    </header>
  );
}
