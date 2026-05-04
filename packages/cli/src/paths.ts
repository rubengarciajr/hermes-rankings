import { homedir, platform } from "node:os";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Where the Hermes Achievements plugin writes its state files.
 *   $HERMES_HOME wins (lets users override or test against fixtures)
 *   else ~/.hermes/plugins/hermes-achievements/
 *   else (Windows fallback) %USERPROFILE%\.hermes\plugins\hermes-achievements\
 */
export function findHermesAchievementsDir(): string {
  if (process.env.HERMES_HOME) {
    return join(process.env.HERMES_HOME, "plugins", "hermes-achievements");
  }
  return join(homedir(), ".hermes", "plugins", "hermes-achievements");
}

export function findStateJsonPath(): string {
  return join(findHermesAchievementsDir(), "state.json");
}

export function findScanSnapshotPath(): string {
  return join(findHermesAchievementsDir(), "scan_snapshot.json");
}

/**
 * Read + parse the local Hermes state.json. Throws with a friendly message
 * when missing — the catch block in the calling command should surface it.
 */
export function readStateJson(): unknown {
  const path = findStateJsonPath();
  if (!existsSync(path)) {
    throw new Error(
      `Hermes state.json not found at ${path}. Have you run Hermes with the achievements plugin enabled?`,
    );
  }
  return JSON.parse(readFileSync(path, "utf8"));
}

export function readScanSnapshot(): unknown {
  const path = findScanSnapshotPath();
  if (!existsSync(path)) {
    throw new Error(
      `Hermes scan_snapshot.json not found at ${path}. Open the achievements dashboard in Hermes once to generate it.`,
    );
  }
  return JSON.parse(readFileSync(path, "utf8"));
}

/** Identity / config dir for the CLI itself. */
export function cliConfigDir(): string {
  return join(homedir(), ".hermes-rank");
}

export function identityFilePath(): string {
  return join(cliConfigDir(), "identity.json");
}

export function machineIdFilePath(): string {
  return join(cliConfigDir(), "machine-id");
}

export function describePlatform(): string {
  return `${platform()} node ${process.versions.node}`;
}
