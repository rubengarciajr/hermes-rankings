import Link from "next/link";

export const metadata = { title: "GitHub linked" };

export default async function LinkSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ login?: string }>;
}) {
  const { login } = await searchParams;
  return (
    <div className="mx-auto max-w-xl px-6 py-24 text-center">
      <p className="label text-accent-gold mb-3">✓ VERIFIED</p>
      <h1 className="font-display text-3xl text-foreground mb-4">
        GITHUB LINKED
      </h1>
      <p className="text-foreground-muted mb-8">
        Your agent is now linked to{" "}
        <span className="font-mono text-accent-gold">@{login ?? "github"}</span>
        . Your CLI will pick this up on its next poll. You've earned the
        Verified ring and a +10 score bonus.
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
