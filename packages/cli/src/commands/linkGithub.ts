import open from "open";
import { readIdentity } from "../identity.js";
import { ApiError, DEFAULT_SERVER_URL, getCliVersion } from "../api.js";
import { c, fail, header, info, kv, spinner, success } from "../ui.js";

type StartResponse = {
  authorize_url: string;
  nonce: string;
  poll_after_ms: number;
  expires_in_sec: number;
};

type PollResponse =
  | { status: "pending" }
  | { status: "ready"; github_login: string }
  | { status: "expired" }
  | { status: "rejected"; reason: string };

export async function linkGithubCommand(opts: { server?: string }) {
  const serverUrl = opts.server ?? DEFAULT_SERVER_URL;
  header("Link GitHub");

  const identity = readIdentity();
  if (!identity) {
    fail("Not registered yet. Run `hermes-rank submit` first.");
    process.exit(1);
  }

  const startSp = spinner("Requesting GitHub authorize URL…");
  let start: StartResponse;
  try {
    const res = await fetch(`${serverUrl}/api/v1/link-github/start`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${identity.api_key}`,
        "user-agent": `hermes-rank/${getCliVersion()}`,
      },
    });
    const json = (await res.json().catch(() => null)) as
      | { error?: string; [k: string]: unknown }
      | null;
    if (res.status === 503) {
      startSp.fail("GitHub linking isn't enabled on the server yet.");
      info(
        "If you run this server, set AUTH_GITHUB_ID and AUTH_GITHUB_SECRET env vars from your GitHub OAuth App.",
      );
      process.exit(1);
    }
    if (!res.ok) {
      throw new ApiError(json?.error ?? `http_${res.status}`, res.status, json);
    }
    start = json as unknown as StartResponse;
    startSp.succeed("Got authorize URL.");
  } catch (err) {
    startSp.fail("Failed to start GitHub link.");
    fail(err instanceof Error ? err.message : String(err));
    process.exit(1);
  }

  console.log("");
  console.log("  Open this URL and click " + c.gold("Authorize") + ":");
  console.log("  " + c.gold(start.authorize_url));
  console.log("");

  open(start.authorize_url).catch(() => {});

  const pollSp = spinner("Waiting for you to authorize on GitHub…");
  const deadline = Date.now() + start.expires_in_sec * 1000;
  while (Date.now() < deadline) {
    await sleep(start.poll_after_ms);
    try {
      const res = await fetch(
        `${serverUrl}/api/v1/link-github/poll?nonce=${encodeURIComponent(start.nonce)}`,
      );
      if (!res.ok) continue;
      const polled = (await res.json()) as PollResponse;
      if (polled.status === "ready") {
        pollSp.succeed("Linked.");
        success(`Verified as ${c.gold("@" + polled.github_login)}.`);
        kv("Bonus", "+10 score for the Verified ring.");
        kv("Profile", `${serverUrl}/agent/${identity.handle}`);
        return;
      }
      if (polled.status === "expired") {
        pollSp.fail("Link request expired. Run `hermes-rank link-github` again.");
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
  pollSp.fail("Timed out waiting for GitHub authorization.");
  process.exit(1);
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
