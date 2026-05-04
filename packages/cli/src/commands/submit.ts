import open from "open";
import { readScanSnapshot, readStateJson } from "../paths.js";
import {
  readIdentity,
  writeIdentity,
  updateLastSubmit,
  type Identity,
} from "../identity.js";
import { getMachineId, makeFingerprint, suggestHandle } from "../machine.js";
import { normalize, parseRawHermesFiles } from "../hermesRaw.js";
import {
  ApiError,
  DEFAULT_SERVER_URL,
  registerStart,
  registerPoll,
  submit as apiSubmit,
  getCliVersion,
} from "../api.js";
import { c, fail, header, info, kv, spinner, success, TIER_COLOR } from "../ui.js";

export async function submitCommand(opts: { server?: string }) {
  const serverUrl = opts.server ?? DEFAULT_SERVER_URL;

  // 1. Read + parse local Hermes files (raw plugin format).
  let stateRaw: unknown, scanRaw: unknown;
  try {
    stateRaw = readStateJson();
    scanRaw = readScanSnapshot();
  } catch (err) {
    fail(err instanceof Error ? err.message : String(err));
    info("Run `hermes-rank doctor` for diagnostics.");
    process.exit(1);
  }
  const rawParsed = parseRawHermesFiles({ stateRaw, scanRaw });
  if (!rawParsed.ok) {
    fail(rawParsed.reason);
    info(
      "Your local Hermes plugin format may be newer than this CLI knows about — update with `npm install -g hermes-rank@latest`.",
    );
    if (rawParsed.issues) {
      console.log(JSON.stringify(rawParsed.issues, null, 2));
    }
    process.exit(1);
  }

  // 2. Normalize raw → API contract format.
  const { state, scan } = normalize({
    rawState: rawParsed.rawState,
    rawScan: rawParsed.rawScan,
    machineId: getMachineId(),
  });

  // 3. Register first if no identity.
  let identity = readIdentity();
  if (!identity) {
    identity = await runRegistration(serverUrl, state, scan);
  } else if (identity.server_url !== serverUrl) {
    fail(
      `Identity is bound to ${identity.server_url} but you asked for ${serverUrl}. Run \`hermes-rank reset\` first.`,
    );
    process.exit(1);
  }

  // 4. Submit.
  header("Submit");
  const sp = spinner("Uploading achievements…");
  try {
    const result = await apiSubmit(serverUrl, identity.api_key, {
      state,
      scan,
      cli_version: getCliVersion(),
    });
    sp.succeed(c.gold("Submitted."));
    updateLastSubmit();

    console.log("");
    kv("Handle", c.gold(identity.handle));
    kv("Score", `${c.bold(result.score.toString())} ${formatDelta(result.delta_score)}`);
    if (result.rank_overall) {
      kv("Rank", c.gold(`#${result.rank_overall}`));
    }
    if (result.new_unlocks.length > 0) {
      console.log("");
      console.log(c.gold("  New unlocks:"));
      for (const u of result.new_unlocks.slice(0, 8)) {
        const tierFn = TIER_COLOR[u.tier];
        console.log(`    ${tierFn(`◆ ${u.tier.toUpperCase().padEnd(8)}`)} ${u.name}`);
      }
      if (result.new_unlocks.length > 8) {
        info(`…and ${result.new_unlocks.length - 8} more.`);
      }
    }
    console.log("");
    info(`Profile: ${serverUrl}/agent/${identity.handle}`);
  } catch (err) {
    sp.fail("Submission failed.");
    if (err instanceof ApiError) {
      fail(`${err.message} (HTTP ${err.status})`);
      if (err.status === 401) {
        info("Your API key may have been revoked. Try `hermes-rank reset`.");
      } else if (err.status === 429) {
        info("Rate-limited. Try again in a minute.");
      }
    } else {
      fail(err instanceof Error ? err.message : String(err));
    }
    process.exit(1);
  }
}

async function runRegistration(
  serverUrl: string,
  state: ReturnType<typeof normalize>["state"],
  scan: ReturnType<typeof normalize>["scan"],
): Promise<Identity> {
  header("First-time setup");
  const fingerprint = makeFingerprint(state.agent_id);
  const handleSuggest = suggestHandle(state.agent_id);

  info(`Suggested handle: ${c.gold(handleSuggest)}`);
  info(`Server: ${serverUrl}`);

  const startSp = spinner("Requesting registration nonce…");
  let startRes;
  try {
    startRes = await registerStart(serverUrl, {
      fingerprint,
      handle_suggest: handleSuggest,
      cli_version: getCliVersion(),
      first_state: state,
      first_scan: scan,
    });
    startSp.succeed("Got nonce.");
  } catch (err) {
    startSp.fail("Failed to start registration.");
    if (err instanceof ApiError && err.status === 409) {
      fail("This machine is already registered but I can't find your local identity.");
      info("Either restore ~/.hermes-rank/identity.json or contact support to reset.");
    } else if (err instanceof ApiError) {
      fail(`${err.message} (HTTP ${err.status})`);
    } else {
      fail(err instanceof Error ? err.message : String(err));
    }
    process.exit(1);
  }

  console.log("");
  console.log("  Open this URL to complete a one-time human check:");
  console.log("  " + c.gold(startRes.verify_url));
  console.log("");

  // Try to auto-open in default browser. Failure is fine — they have the URL.
  open(startRes.verify_url).catch(() => {});

  const pollSp = spinner("Waiting for verification…");
  const deadline = Date.now() + 10 * 60_000;
  let result;
  while (Date.now() < deadline) {
    await sleep(startRes.poll_after_ms);
    try {
      const polled = await registerPoll(serverUrl, startRes.nonce);
      if (polled.status === "ready") {
        result = polled;
        break;
      }
      if (polled.status === "expired") {
        pollSp.fail("Registration expired. Try `hermes-rank submit` again.");
        process.exit(1);
      }
      if (polled.status === "rejected") {
        pollSp.fail(`Rejected: ${polled.reason}`);
        process.exit(1);
      }
    } catch {
      // network blip — keep polling
    }
  }
  if (!result) {
    pollSp.fail("Timed out waiting for verification.");
    process.exit(1);
  }
  pollSp.succeed("Verified.");

  const identity: Identity = {
    version: 1,
    fingerprint,
    handle: result.handle,
    agent_id: result.agent_id,
    api_key: result.api_key,
    registered_at: new Date().toISOString(),
    server_url: serverUrl,
  };
  writeIdentity(identity);
  success(`Identity saved (${identityPathHint()}).`);
  return identity;
}

function formatDelta(n: number): string {
  if (n === 0) return c.muted("·");
  return n > 0 ? c.gold(`+${n}`) : c.muted(String(n));
}

function identityPathHint(): string {
  return "~/.hermes-rank/identity.json";
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
