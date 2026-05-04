import { existsSync, statSync } from "node:fs";
import {
  describePlatform,
  findScanSnapshotPath,
  findStateJsonPath,
  identityFilePath,
  readScanSnapshot,
  readStateJson,
} from "../paths.js";
import { readIdentity } from "../identity.js";
import { DEFAULT_SERVER_URL } from "../api.js";
import { c, fail, header, info, kv, success, warn } from "../ui.js";
import { rawScanSnapshotSchema, rawStateJsonSchema } from "../hermesRaw.js";

export async function doctorCommand(opts: { server?: string }) {
  const serverUrl = opts.server ?? DEFAULT_SERVER_URL;

  header("Diagnostics");
  kv("Platform", describePlatform());
  kv("Server", serverUrl);
  console.log("");

  // Hermes state files
  const statePath = findStateJsonPath();
  const scanPath = findScanSnapshotPath();
  if (existsSync(statePath)) {
    success(`state.json found (${formatBytes(statSync(statePath).size)})`);
    try {
      const parsed = rawStateJsonSchema.safeParse(readStateJson());
      if (parsed.success) {
        info(`unlocks=${Object.keys(parsed.data.unlocks).length}`);
      } else {
        warn("state.json schema mismatch — CLI may be out of date.");
      }
    } catch (e) {
      fail(`state.json unreadable: ${e instanceof Error ? e.message : e}`);
    }
  } else {
    fail(`state.json missing at ${statePath}`);
    info("Set $HERMES_HOME if your install is in a non-default location.");
  }

  if (existsSync(scanPath)) {
    success(`scan_snapshot.json found (${formatBytes(statSync(scanPath).size)})`);
    try {
      const parsed = rawScanSnapshotSchema.safeParse(readScanSnapshot());
      if (parsed.success) {
        info(
          `achievements catalog=${parsed.data.achievements.length}  sessions=${parsed.data.sessions.length}`,
        );
      } else {
        warn("scan_snapshot.json schema mismatch.");
      }
    } catch (e) {
      fail(`scan_snapshot.json unreadable: ${e instanceof Error ? e.message : e}`);
    }
  } else {
    fail(`scan_snapshot.json missing at ${scanPath}`);
    info("Open the achievements dashboard in Hermes once to generate it.");
  }

  // Identity
  const idPath = identityFilePath();
  if (existsSync(idPath)) {
    const id = readIdentity();
    if (id) {
      success(`identity.json found (${id.handle})`);
      kv("  handle", id.handle);
      kv("  agent_id", id.agent_id);
    } else {
      warn("identity.json present but unparseable. Try `hermes-rank reset`.");
    }
  } else {
    info("identity.json not present — first run of `hermes-rank submit` will create it.");
  }

  // Server reachability
  console.log("");
  info(`Pinging ${serverUrl}…`);
  try {
    const res = await fetch(`${serverUrl}/api/v1/leaderboard?limit=1`);
    if (res.ok || res.status === 404) {
      success(`Server reachable (HTTP ${res.status})`);
    } else {
      warn(`Server returned HTTP ${res.status}`);
    }
  } catch (e) {
    fail(`Server unreachable: ${e instanceof Error ? e.message : e}`);
  }
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n}B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)}KB`;
  return `${(n / 1024 / 1024).toFixed(2)}MB`;
}
