import { z } from "zod";
import {
  type StateJson,
  type ScanSnapshot,
  type Tier,
} from "@hermesranker/schema";

/**
 * Schemas for the *actual* Hermes Achievements plugin file format on disk.
 * These differ from our API contract:
 *   - state.unlocks is an object keyed by id, not an array
 *   - tiers are capitalized ("Copper", "Silver", ...)
 *   - timestamps are unix seconds, not ISO strings
 *   - state.json has no top-level agent_id or schema_version
 *
 * Keeping the raw schemas isolated from the API schema means a Hermes
 * format change is a CLI-only update — the server keeps its clean contract.
 */

const RAW_TIERS = ["Copper", "Silver", "Gold", "Diamond", "Olympian"] as const;
const rawTierSchema = z.enum(RAW_TIERS);
type RawTier = z.infer<typeof rawTierSchema>;

const TIER_LOWER: Record<RawTier, Tier> = {
  Copper: "copper",
  Silver: "silver",
  Gold: "gold",
  Diamond: "diamond",
  Olympian: "olympian",
};

export const rawStateUnlockSchema = z.object({
  evidence: z.unknown().nullable(),
  first_tier: rawTierSchema,
  unlocked_at: z.number(),
});

export const rawStateJsonSchema = z.object({
  unlocks: z.record(z.string(), rawStateUnlockSchema),
});
export type RawStateJson = z.infer<typeof rawStateJsonSchema>;

const rawAchievementSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  category: z.string(),
  tier: rawTierSchema.nullable().optional(),
  state: z.enum(["unlocked", "discovered", "secret"]),
  unlocked: z.boolean(),
  unlocked_at: z.number().nullable().optional(),
  progress: z.number().nullable().optional(),
  next_threshold: z.number().nullable().optional(),
  secret: z.boolean().optional(),
  // Permissively accept any additional fields without failing the parse.
});

const rawSessionSchema = z
  .object({
    session_id: z.string().min(1),
    started_at: z.number().nullable().optional(),
    last_active: z.number().nullable().optional(),
    message_count: z.number().nullable().optional(),
    tool_call_count: z.number().nullable().optional(),
  })
  .passthrough();

export const rawScanSnapshotSchema = z
  .object({
    achievements: z.array(rawAchievementSchema),
    sessions: z.array(rawSessionSchema),
    generated_at: z.number(),
    discovered_count: z.number().optional(),
    secret_count: z.number().optional(),
    total_count: z.number().optional(),
    unlocked_count: z.number().optional(),
  })
  .passthrough();
export type RawScanSnapshot = z.infer<typeof rawScanSnapshotSchema>;

function unixToIso(unix: number): string {
  return new Date(Math.floor(unix * 1000)).toISOString();
}

/**
 * Derive a stable agent_id when Hermes doesn't write one.
 * We use the earliest unlocked_at + machine UUID prefix so the same Hermes
 * install on the same machine always produces the same id.
 */
export function deriveAgentId(
  raw: RawStateJson,
  machineIdPrefix: string,
): string {
  const earliest = Object.values(raw.unlocks)
    .map((u) => u.unlocked_at)
    .sort((a, b) => a - b)[0];
  const seed = earliest ?? 0;
  return `hermes-${machineIdPrefix.slice(0, 8)}-${seed.toString(36)}`;
}

/**
 * Normalize raw Hermes files into the API contract format. Pure transform.
 */
export function normalize(args: {
  rawState: RawStateJson;
  rawScan: RawScanSnapshot;
  machineId: string;
}): { state: StateJson; scan: ScanSnapshot } {
  const { rawState, rawScan, machineId } = args;
  const agentId = deriveAgentId(rawState, machineId);

  // Build a quick lookup so unlocked entries can pull category + secret info.
  const byId = new Map(rawScan.achievements.map((a) => [a.id, a]));

  const unlocked = Object.entries(rawState.unlocks).map(([id, u]) => ({
    id,
    tier: TIER_LOWER[u.first_tier],
    unlocked_at: unixToIso(u.unlocked_at),
  }));

  // Most recent unlock dictates last_updated.
  const lastUpdatedUnix = Object.values(rawState.unlocks)
    .map((u) => u.unlocked_at)
    .sort((a, b) => b - a)[0];

  const state: StateJson = {
    schema_version: 1,
    agent_id: agentId,
    unlocked,
    last_updated: lastUpdatedUnix
      ? unixToIso(lastUpdatedUnix)
      : new Date().toISOString(),
  };

  const scan: ScanSnapshot = {
    schema_version: 1,
    agent_id: agentId,
    generated_at: unixToIso(rawScan.generated_at),
    achievements: rawScan.achievements.map((a) => {
      const isSecret = a.secret === true || a.state === "secret";
      const total = a.next_threshold ?? null;
      return {
        id: a.id,
        name: a.name,
        description: a.description,
        tier: TIER_LOWER[a.tier ?? "Copper"],
        category: a.category,
        is_secret: isSecret,
        progress:
          a.progress != null && total != null && total > 0
            ? { num: Math.floor(a.progress), den: total }
            : null,
        unlocked: a.unlocked,
      };
    }),
    sessions: rawScan.sessions
      .map((s) => {
        // Real Hermes session_ids look like "20260428_072403_0a7476"; our
        // server schema requires `agent:main:{platform}:{chat_type}:{chat_id}`.
        // Synthesize a compatible id rather than reject. CLI/server format
        // mismatch is a CLI-only normalization concern.
        const synthesized = `agent:main:hermes:cli:${s.session_id}`;
        const started = s.started_at != null ? unixToIso(s.started_at) : null;
        const last = s.last_active != null ? unixToIso(s.last_active) : null;
        if (!started || !last) return null;
        return {
          session_id: synthesized,
          started_at: started,
          last_active: last,
          message_count: s.message_count ?? 0,
          tool_call_count: s.tool_call_count ?? 0,
        };
      })
      .filter((s): s is NonNullable<typeof s> => s !== null),
  };

  return { state, scan };
}

export function parseRawHermesFiles(args: {
  stateRaw: unknown;
  scanRaw: unknown;
}):
  | { ok: true; rawState: RawStateJson; rawScan: RawScanSnapshot }
  | { ok: false; reason: string; issues?: unknown } {
  const stateParsed = rawStateJsonSchema.safeParse(args.stateRaw);
  if (!stateParsed.success) {
    return {
      ok: false,
      reason: "state.json shape mismatch",
      issues: stateParsed.error.issues.slice(0, 3),
    };
  }
  const scanParsed = rawScanSnapshotSchema.safeParse(args.scanRaw);
  if (!scanParsed.success) {
    return {
      ok: false,
      reason: "scan_snapshot.json shape mismatch",
      issues: scanParsed.error.issues.slice(0, 3),
    };
  }
  return {
    ok: true,
    rawState: stateParsed.data,
    rawScan: scanParsed.data,
  };
}
