import "server-only";
import type { StateJson, ScanSnapshot } from "@hermesranker/schema";
import { inArray } from "drizzle-orm";
import { db, schema } from "./db";

export type ValidationResult =
  | { ok: true }
  | { ok: false; reason: string; detail?: unknown };

/**
 * Server-side payload validation beyond Zod shape:
 *   - Every unlocked badge ID must exist in the catalog
 *   - The agent_id matches across state and scan
 *   - Unlock timestamps span a plausible window (no 60 in 1 second)
 *   - last_updated and generated_at aren't impossibly far in the future
 *
 * This is the layer that distinguishes a real Hermes-derived submission
 * from someone curling random JSON.
 */
export async function validateSubmission(
  state: StateJson,
  scan: ScanSnapshot,
): Promise<ValidationResult> {
  if (state.agent_id !== scan.agent_id) {
    return { ok: false, reason: "agent_id_mismatch" };
  }

  const now = Date.now();
  const drift = 5 * 60 * 1000; // 5 min clock drift tolerated
  if (new Date(state.last_updated).getTime() > now + drift) {
    return { ok: false, reason: "state_timestamp_in_future" };
  }
  if (new Date(scan.generated_at).getTime() > now + drift) {
    return { ok: false, reason: "scan_timestamp_in_future" };
  }

  // No 5+ unlocks in the same second (unrealistic mass insert).
  const bySecond = new Map<string, number>();
  for (const u of state.unlocked) {
    const sec = u.unlocked_at.slice(0, 19); // YYYY-MM-DDTHH:MM:SS
    bySecond.set(sec, (bySecond.get(sec) ?? 0) + 1);
  }
  for (const [sec, count] of bySecond) {
    if (count >= 5) {
      return {
        ok: false,
        reason: "implausible_burst_unlocks",
        detail: { second: sec, count },
      };
    }
  }

  // Every unlocked ID must exist in the catalog.
  const unlockedIds = state.unlocked.map((u) => u.id);
  if (unlockedIds.length === 0) {
    return { ok: true }; // empty submission is fine; just no score
  }
  const known = await db
    .select({ id: schema.achievementCatalog.id })
    .from(schema.achievementCatalog)
    .where(inArray(schema.achievementCatalog.id, unlockedIds));
  const knownSet = new Set(known.map((r) => r.id));
  const unknown = unlockedIds.filter((id) => !knownSet.has(id));
  if (unknown.length > 0) {
    return {
      ok: false,
      reason: "unknown_achievement_id",
      detail: { unknown: unknown.slice(0, 10), total: unknown.length },
    };
  }

  return { ok: true };
}

/**
 * Generate a handle slug from a suggestion. Lowercase, hyphenated, max 40.
 * Adds a 4-char suffix on collision (caller decides whether to retry).
 */
export function normalizeHandle(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-")
    .slice(0, 40);
}
