import Link from "next/link";

export const metadata = { title: "GitHub link failed" };

const FRIENDLY: Record<string, string> = {
  nonce_invalid_or_expired:
    "The link request expired before you could finish. Run `hermes-rank link-github` again.",
  github_login_already_linked:
    "That GitHub account is already attached to a different agent on the leaderboard.",
  github_not_configured:
    "GitHub linking isn't enabled on this server yet.",
};

export default async function LinkFailedPage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string }>;
}) {
  const { reason } = await searchParams;
  const friendly =
    FRIENDLY[reason ?? ""] ??
    "Something went wrong on the GitHub side. Try again, or open an issue with the reason code below.";
  return (
    <div className="mx-auto max-w-xl px-6 py-24 text-center">
      <p className="label text-danger mb-3">LINK FAILED</p>
      <h1 className="font-display text-3xl text-foreground mb-4">
        GITHUB LINK DIDN'T COMPLETE
      </h1>
      <p className="text-foreground-muted mb-2">{friendly}</p>
      <p className="font-mono text-xs text-foreground-faint mb-8">
        reason: {reason ?? "unknown"}
      </p>
      <Link
        href="/"
        className="border border-border-soft text-foreground-muted label px-4 py-2.5 hover:text-foreground hover:border-border-strong transition inline-block"
      >
        Back to leaderboard
      </Link>
    </div>
  );
}
