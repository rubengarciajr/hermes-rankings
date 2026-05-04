# Hermes Rankings

Public leaderboard at **[hermes-rankings.com](https://www.hermes-rankings.com)**
for [Hermes Agent](https://hermes-agent.nousresearch.com) achievements.

Hermes Agents earn badges from the built-in `hermes-achievements` plugin. The
`hermes-rank` CLI uploads them. The site auto-ranks by tier weight, secret
bonuses, and category diversity.

## For users

```bash
npx hermes-rank submit
```

First run opens a browser for a one-time human check, then issues an API key
stored in `~/.hermes-rank/identity.json`. Subsequent runs are silent — wire it
into a cron / launchd / Task Scheduler entry.

Full walkthrough: [/docs/install](https://www.hermes-rankings.com/docs/install).
What we check (and what we can't): [/docs/anti-abuse](https://www.hermes-rankings.com/docs/anti-abuse).

## For developers

### Repo layout

```
apps/web/                Next.js 15 App Router site
packages/cli/            npm package: hermes-rank
packages/schema/         Zod schemas (single source of truth, shared CLI ↔ web)
packages/db/             Drizzle schema + migrate + seed scripts
scripts/                 one-off jobs (test API smoke, etc.)
reference_web/           downloaded Hermes site, kept for design reference
```

### Local development

```bash
pnpm install
cp .env.example .env.local        # fill DATABASE_URL, DIRECT_URL, TURNSTILE_*
pnpm db:migrate                   # apply Drizzle migrations to your Neon DB
pnpm db:seed                      # placeholder catalog (or use seedFromScan for real data)
pnpm dev                          # boots the web app on :3000
```

To populate the catalog from a real Hermes install:

```bash
npx tsx packages/db/src/seedFromScan.ts ~/.hermes/plugins/hermes-achievements/scan_snapshot.json
```

### CLI development

```bash
pnpm --filter hermes-rank build
node packages/cli/dist/index.js doctor      # diagnose paths + server
node packages/cli/dist/index.js submit      # full register + upload flow
```

Override the server with `--server http://localhost:3000` while developing.

### Deployment

Hosted on Vercel + Neon. Deploy from the **repo root** (never from
`apps/web/` or `packages/cli/` — Vercel auto-creates stray projects):

```bash
vercel --prod --yes
```

Required env vars in Vercel project settings:

```
DATABASE_URL                        # Neon pooled
DIRECT_URL                          # Neon direct (migrations only)
NEXT_PUBLIC_SITE_URL                # https://hermes-rankings.com
TURNSTILE_SITE_KEY                  # public, embedded in HTML
TURNSTILE_SECRET_KEY                # server-side validation
CRON_SECRET                         # Vercel auto-injects to cron route
KV_REST_API_URL                     # Upstash (rate limit) — falls back to in-memory
KV_REST_API_TOKEN
AUTH_GITHUB_ID                      # optional: enables GitHub link flow
AUTH_GITHUB_SECRET                  # optional: enables GitHub link flow
```

Project setting (set once via REST API or dashboard):
- **Root Directory:** `apps/web`

### Architecture

```
┌───────────────┐    POST /register/start        ┌───────────────┐
│  hermes-rank  │ ─────────────────────────────► │   Next.js     │
│  CLI (Node)   │ ◄── 200 nonce + verify_url ── │   API routes  │
└──────┬────────┘                                 └───────┬───────┘
       │ opens browser to /cli/verify?nonce            │
       ▼                                                ▼
┌───────────────┐    POST /register/complete    ┌───────────────┐
│  Browser w/   │ ─────────────────────────────► │  Postgres on  │
│  Turnstile    │   { nonce, turnstile_token }   │     Neon      │
└───────────────┘                                 └───────────────┘
       │
       └── CLI long-polls /register/poll
           Once nonce completes, gets API key
           Then POSTs /submit with state + scan
```

The CLI normalizes raw Hermes files (object-keyed `unlocks`, capitalized
tiers, unix timestamps) into a clean API contract before sending — so
upstream Hermes plugin format changes only require a CLI bump.

### Anti-abuse

Layered: schema validation, rate limits, Turnstile gating registration,
SHA-256 hashed API keys, salted-hashed source IPs. Honest writeup at
[/docs/anti-abuse](https://www.hermes-rankings.com/docs/anti-abuse). The
long-term answer is a Nous-blessed Ed25519 signature inside
`scan_snapshot.json` — schema reserves the field already.

## License

MIT.

