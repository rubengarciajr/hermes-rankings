import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { randomBytes, createHash } from "node:crypto";
import { dirname } from "node:path";
import { cliConfigDir, machineIdFilePath } from "./paths.js";

/**
 * Stable per-machine UUID. Generated once on first invocation, persisted to
 * ~/.hermes-rank/machine-id (chmod 600). We avoid OS-specific machine IDs
 * (/etc/machine-id, ioreg) so the same code works everywhere without
 * elevated permissions.
 */
export function getMachineId(): string {
  const path = machineIdFilePath();
  if (existsSync(path)) {
    return readFileSync(path, "utf8").trim();
  }
  mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
  const id = randomBytes(16).toString("hex");
  writeFileSync(path, id, { mode: 0o600 });
  return id;
}

/**
 * Combine the Hermes agent_id with the machine UUID into a stable
 * fingerprint. Two Hermes profiles on one machine = two fingerprints.
 * One Hermes profile on two machines = two fingerprints (the second one
 * will register as a separate agent — by design, we can't dedupe across
 * machines without a server-trusted identity).
 */
export function makeFingerprint(hermesAgentId: string): string {
  const machineId = getMachineId();
  return createHash("sha256")
    .update(`hermes-rank-v1|${hermesAgentId}|${machineId}`)
    .digest("hex");
}

/**
 * Default handle suggestion derived from the Hermes agent_id.
 * Lowercases, replaces non-handle chars, max 40.
 */
export function suggestHandle(hermesAgentId: string): string {
  const slug = hermesAgentId
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);
  return slug || `agent-${randomBytes(3).toString("hex")}`;
}
