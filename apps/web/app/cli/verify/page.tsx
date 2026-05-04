import { Suspense } from "react";
import { VerifyClient } from "./VerifyClient";

export const metadata = {
  title: "Verify CLI",
  description: "One-time human check to register your hermes-rank install.",
};

export default function VerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ nonce?: string }>;
}) {
  return (
    <div className="mx-auto max-w-xl px-6 py-24">
      <p className="label text-accent-gold mb-3">CLI VERIFICATION</p>
      <h1 className="text-3xl font-bold text-foreground mb-3">
        Connecting hermes-rank
      </h1>
      <p className="text-foreground-muted mb-10 leading-relaxed">
        One quick check to confirm a real human is at the keyboard, then your
        CLI continues in the terminal. We never see your prompts, code, or
        Hermes session contents — only your unlocked badges.
      </p>
      <Suspense
        fallback={
          <p className="label-sm text-foreground-muted">Loading widget…</p>
        }
      >
        <VerifyClientWrapper searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function VerifyClientWrapper({
  searchParams,
}: {
  searchParams: Promise<{ nonce?: string }>;
}) {
  const params = await searchParams;
  const siteKey = process.env.TURNSTILE_SITE_KEY ?? "";
  return <VerifyClient nonce={params.nonce ?? ""} siteKey={siteKey} />;
}
