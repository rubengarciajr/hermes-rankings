import { z } from "zod";
import { tierSchema } from "./tier";

/**
 * Schema for `~/.hermes/plugins/hermes-achievements/scan_snapshot.json`.
 *
 * The scan snapshot is the full catalog plus per-achievement progress for
 * the local agent. Cross-checked against the server's `achievement_catalog`
 * table on submit — unknown IDs cause rejection.
 */

const SESSION_KEY_PATTERN = /^agent:[a-z0-9_-]+:[a-z0-9_-]+:[a-z0-9_-]+:.+$/i;

export const achievementCatalogEntrySchema = z.object({
  id: z.string().min(1).max(128),
  name: z.string().min(1).max(128),
  description: z.string().max(2000),
  tier: tierSchema,
  category: z.string().min(1).max(64),
  is_secret: z.boolean(),
  /** Progress on this agent's local data, e.g. { num: 52, den: 70 }. */
  progress: z
    .object({
      num: z.number().int().nonnegative(),
      den: z.number().int().positive(),
    })
    .nullable(),
  /** True iff progress meets the unlock threshold. */
  unlocked: z.boolean(),
});
export type AchievementCatalogEntry = z.infer<
  typeof achievementCatalogEntrySchema
>;

export const sessionStatSchema = z.object({
  session_id: z.string().regex(SESSION_KEY_PATTERN, {
    message:
      "session_id must match agent:main:{platform}:{chat_type}:{chat_id}",
  }),
  started_at: z.string().datetime({ offset: true }),
  last_active: z.string().datetime({ offset: true }),
  message_count: z.number().int().nonnegative(),
  tool_call_count: z.number().int().nonnegative(),
});
export type SessionStat = z.infer<typeof sessionStatSchema>;

export const scanSnapshotSchema = z.object({
  schema_version: z.number().int().positive(),
  agent_id: z.string().min(1).max(256),
  generated_at: z.string().datetime({ offset: true }),
  achievements: z.array(achievementCatalogEntrySchema).max(500),
  sessions: z.array(sessionStatSchema).max(10_000),
  /**
   * Reserved for v2: a Nous-blessed Ed25519 signature over the canonical
   * payload. When present and valid, the agent earns the "Officially
   * Verified" tier without needing a GitHub link.
   */
  share_card_attestation: z
    .object({
      alg: z.literal("Ed25519"),
      sig: z.string().min(1),
      key_id: z.string().min(1),
    })
    .optional(),
});
export type ScanSnapshot = z.infer<typeof scanSnapshotSchema>;
