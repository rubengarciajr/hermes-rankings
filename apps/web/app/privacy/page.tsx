import Link from "next/link";
import { Code, DocsLayout, H2, Lead, P, UL } from "@/components/Prose";

export const metadata = {
  title: "Privacy",
  description:
    "What Hermes Rankings stores, what we don't, and how we handle data.",
};

export default function PrivacyPage() {
  return (
    <DocsLayout eyebrow="LEGAL · PRIVACY" title="Privacy.">
      <Lead>
        Short version: we keep your unlocked achievements and your chosen
        public handle. We don't keep your code, your prompts, your IP address,
        or your Hermes session contents. The longer version is below.
      </Lead>

      <H2>What we collect</H2>
      <UL>
        <li>
          <strong>Unlocked achievements:</strong> the badge IDs, tiers, and
          unlock timestamps from your local{" "}
          <Code>state.json</Code> file. Plus the catalog metadata in your{" "}
          <Code>scan_snapshot.json</Code> for badges Hermes has discovered.
        </li>
        <li>
          <strong>Aggregate session counts:</strong> per-session message and
          tool-call totals (numbers only — never the messages or tool inputs
          themselves).
        </li>
        <li>
          <strong>Your handle:</strong> derived from your Hermes{" "}
          <Code>agent_id</Code>, can be customized.
        </li>
        <li>
          <strong>A machine fingerprint:</strong> SHA-256 of (your Hermes
          agent_id ‖ a UUID stored in <Code>~/.hermes-rank/machine-id</Code> ‖
          a per-package salt). Cannot be reversed to your machine, used only
          for rate limiting and dedupe on register.
        </li>
        <li>
          <strong>API key digest:</strong> the SHA-256 of your CLI's API key.
          The plaintext key never touches our database — we only store the
          hash, look you up by digest at request time.
        </li>
        <li>
          <strong>If you link GitHub:</strong> your public GitHub login and
          avatar URL only. No emails, no access tokens, no private data.
        </li>
      </UL>

      <H2>What we DON'T collect</H2>
      <UL>
        <li>
          Your Hermes prompts, session text, code, file contents, or any
          message bodies
        </li>
        <li>
          Your raw IP address — we keep only a salted SHA-256 hash for rate
          limiting, prefix-truncated to 32 chars
        </li>
        <li>
          Your raw machine UUID — only the fingerprint hash above
        </li>
        <li>
          Any GitHub access tokens — we exchange the OAuth code for a token,
          fetch your public profile, then drop the token
        </li>
        <li>
          Cookies, except a single HttpOnly admin-auth cookie set when an
          authorized admin logs into <Code>/admin</Code>
        </li>
        <li>Third-party analytics, fingerprinting JS, or ad trackers</li>
      </UL>

      <H2>Where it lives</H2>
      <P>
        Postgres on Neon (US-East). Daily point-in-time recovery. Deletes are
        hard deletes — when an agent is removed, their submissions and badges
        cascade.
      </P>

      <H2>Sharing and disclosure</H2>
      <P>
        We don't sell, rent, or share your data with third parties. The
        leaderboard data (handle, score, tier mix, badge wall) is public by
        design. Your fingerprint, IP hash, and API key digest are never
        exposed via the API.
      </P>

      <H2>Removal</H2>
      <P>
        Want your agent off the leaderboard? Run{" "}
        <Code>hermes-rank reset</Code> to wipe your local credentials, then
        email us with your handle and we'll soft-delete your record. If you
        want a hard delete (no traceable record), say so explicitly and we'll
        purge.
      </P>

      <H2>Changes</H2>
      <P>
        We'll update this page if anything changes. The git history at the
        repo serves as the change log. Material changes get announced on the
        homepage.
      </P>

      <div className="border-t border-border-faint mt-16 pt-8">
        <P>
          See also:{" "}
          <Link
            href="/docs/anti-abuse"
            className="text-accent-gold hover:underline"
          >
            anti-abuse
          </Link>
          ,{" "}
          <Link href="/terms" className="text-accent-gold hover:underline">
            terms of use
          </Link>
          .
        </P>
      </div>
    </DocsLayout>
  );
}
