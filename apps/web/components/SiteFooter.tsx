import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t border-border-faint mt-16">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-3 px-6 py-8 sm:flex-row sm:items-center sm:justify-between">
        <p className="label-sm text-foreground-muted">
          Hermes Rankings · independent · not affiliated with Nous Research
        </p>
        <div className="flex items-center gap-6 flex-wrap">
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
            How we keep it clean
          </Link>
          <Link
            href="/transparency"
            className="label-sm text-foreground-muted hover:text-foreground transition"
          >
            Transparency
          </Link>
          <a
            href="https://hermes-agent.nousresearch.com"
            target="_blank"
            rel="noreferrer noopener"
            className="label-sm text-foreground-muted hover:text-foreground transition"
          >
            Hermes Agent ↗
          </a>
        </div>
      </div>
    </footer>
  );
}
