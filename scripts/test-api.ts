/**
 * End-to-end smoke test for the upload API.
 *
 *   pnpm dlx tsx scripts/test-api.ts                    # local
 *   pnpm dlx tsx scripts/test-api.ts https://...        # against a deployed URL
 *
 * Skips the Turnstile-gated /register/complete step (that needs a real browser).
 * Tests /register/start happy path + a few rejections.
 */

const BASE = process.argv[2] ?? "http://localhost:3000";

async function main() {
  console.log(`Testing ${BASE}\n`);

  const fixture = makeFixture();

  // 1. Happy path: /register/start
  await test("POST /register/start (valid payload)", async () => {
    const res = await fetch(`${BASE}/api/v1/register/start`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        fingerprint: "a".repeat(64),
        handle_suggest: "test-curious-pebble",
        cli_version: "0.1.0-test",
        first_state: fixture.state,
        first_scan: fixture.scan,
      }),
    });
    const json = await res.json();
    if (res.status !== 200) {
      throw new Error(`expected 200, got ${res.status}: ${JSON.stringify(json)}`);
    }
    if (!json.nonce || !json.verify_url) {
      throw new Error(`missing nonce/verify_url: ${JSON.stringify(json)}`);
    }
    console.log(`  → nonce=${json.nonce.slice(0, 8)}…  verify_url=${json.verify_url}`);
    return json.nonce as string;
  });

  // 2. Poll an unknown nonce
  await test("GET /register/poll (unknown nonce → expired)", async () => {
    const res = await fetch(
      `${BASE}/api/v1/register/poll?nonce=does-not-exist-1234567890abcdef`,
    );
    const json = await res.json();
    if (json.status !== "expired") {
      throw new Error(`expected expired, got ${JSON.stringify(json)}`);
    }
  });

  // 3. Reject invalid payload (missing fields)
  await test("POST /register/start (invalid payload → 400)", async () => {
    const res = await fetch(`${BASE}/api/v1/register/start`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ fingerprint: "short" }),
    });
    if (res.status !== 400) {
      throw new Error(`expected 400, got ${res.status}`);
    }
  });

  // 4. Reject unknown achievement ID
  await test("POST /register/start (unknown badge → 400)", async () => {
    const bad = makeFixture();
    bad.state.unlocked.push({
      id: "totally_made_up_badge_xyz",
      tier: "olympian",
      unlocked_at: "2026-05-01T00:00:00Z",
    });
    bad.scan.achievements.push({
      id: "totally_made_up_badge_xyz",
      name: "Fake",
      description: "x",
      tier: "olympian",
      category: "FAKE",
      is_secret: false,
      progress: null,
      unlocked: true,
    });
    const res = await fetch(`${BASE}/api/v1/register/start`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        fingerprint: "b".repeat(64),
        handle_suggest: "fake-agent",
        cli_version: "0.1.0-test",
        first_state: bad.state,
        first_scan: bad.scan,
      }),
    });
    const json = await res.json();
    if (res.status !== 400 || json.reason !== "unknown_achievement_id") {
      throw new Error(
        `expected 400 unknown_achievement_id, got ${res.status} ${JSON.stringify(json)}`,
      );
    }
  });

  // 5. Submit without auth → 401
  await test("POST /submit (no auth → 401)", async () => {
    const res = await fetch(`${BASE}/api/v1/submit`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        state: fixture.state,
        scan: fixture.scan,
        cli_version: "0.1.0-test",
      }),
    });
    if (res.status !== 401) throw new Error(`expected 401, got ${res.status}`);
  });

  console.log("\n✓ All tests passed.");
}

let testCount = 0;
async function test(label: string, fn: () => Promise<unknown>) {
  testCount++;
  try {
    const result = await fn();
    console.log(`✓ ${label}`);
    return result;
  } catch (err) {
    console.error(
      `✗ ${label}\n  ${err instanceof Error ? err.message : err}`,
    );
    process.exit(1);
  }
}

function makeFixture() {
  const now = new Date();
  const minutesAgo = (n: number) =>
    new Date(now.getTime() - n * 60_000).toISOString();
  const daysAgo = (n: number) =>
    new Date(now.getTime() - n * 86_400_000).toISOString();

  // Pick real seeded badge IDs across tiers and categories.
  const unlocked = [
    {
      id: "agent_autonomy_first_steps",
      tier: "copper" as const,
      unlocked_at: daysAgo(30),
    },
    {
      id: "tool_mastery_first_edit",
      tier: "copper" as const,
      unlocked_at: daysAgo(28),
    },
    {
      id: "tool_mastery_bash_brawler",
      tier: "silver" as const,
      unlocked_at: daysAgo(15),
    },
    {
      id: "agent_autonomy_toolchain_maxxer",
      tier: "gold" as const,
      unlocked_at: daysAgo(7),
      progress_num: 52,
      progress_den: 70,
    },
    {
      id: "memory_keeper",
      tier: "silver" as const,
      unlocked_at: daysAgo(3),
    },
    {
      id: "secret_5am_club",
      tier: "silver" as const,
      unlocked_at: minutesAgo(120),
    },
  ];

  const state = {
    schema_version: 1,
    agent_id: "agent-test-curious-pebble",
    unlocked,
    last_updated: now.toISOString(),
  };

  const scan = {
    schema_version: 1,
    agent_id: "agent-test-curious-pebble",
    generated_at: now.toISOString(),
    achievements: unlocked.map((u) => ({
      id: u.id,
      name: u.id,
      description: "test",
      tier: u.tier,
      category: "TEST",
      is_secret: u.id.startsWith("secret_"),
      progress: u.progress_num
        ? { num: u.progress_num, den: u.progress_den! }
        : null,
      unlocked: true,
    })),
    sessions: [
      {
        session_id: "agent:main:test:private:1234567890",
        started_at: daysAgo(30),
        last_active: minutesAgo(10),
        message_count: 4200,
        tool_call_count: 18000,
      },
    ],
  };

  return { state, scan };
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
