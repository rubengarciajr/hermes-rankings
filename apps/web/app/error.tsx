"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log so it shows up in Vercel logs even though Next swallows the trace
    // by default for client-side error boundaries.
    console.error("[error-boundary]", error);
  }, [error]);

  return (
    <div className="mx-auto max-w-xl px-6 py-24 text-center">
      <p className="label text-danger mb-3">UNEXPECTED ERROR</p>
      <h1 className="font-display text-3xl text-foreground mb-4">
        SOMETHING BROKE
      </h1>
      <p className="text-foreground-muted mb-2">
        We've logged the issue. Try reloading — if it sticks around, something
        on our end needs attention.
      </p>
      {error.digest && (
        <p className="font-mono text-xs text-foreground-faint mb-8">
          digest: {error.digest}
        </p>
      )}
      <div className="flex items-center justify-center gap-4 mt-8">
        <button
          type="button"
          onClick={reset}
          className="border border-accent-gold text-accent-gold label px-4 py-2.5 hover:bg-accent-gold/10 transition"
        >
          Try again
        </button>
        <Link
          href="/"
          className="border border-border-soft text-foreground-muted label px-4 py-2.5 hover:text-foreground hover:border-border-strong transition"
        >
          Back to leaderboard
        </Link>
      </div>
    </div>
  );
}
