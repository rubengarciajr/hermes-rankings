import { z } from "zod";
import { stateJsonSchema } from "./state";
import { scanSnapshotSchema } from "./scan";
import { tierSchema } from "./tier";

/**
 * POST /api/v1/register/start
 * Called by the CLI. Includes the local Hermes state/scan so the browser
 * step doesn't need access to the user's filesystem — it only clears
 * Turnstile to prove a human is present.
 */
export const registerStartRequestSchema = z.object({
  fingerprint: z.string().regex(/^[a-f0-9]{64}$/, "fingerprint must be sha256 hex"),
  handle_suggest: z.string().min(3).max(40).regex(/^[a-z0-9-]+$/),
  cli_version: z.string().min(1).max(32),
  first_state: stateJsonSchema,
  first_scan: scanSnapshotSchema,
});
export type RegisterStartRequest = z.infer<typeof registerStartRequestSchema>;

export const registerStartResponseSchema = z.object({
  nonce: z.string().min(16).max(64),
  verify_url: z.string().url(),
  poll_after_ms: z.number().int().positive(),
});
export type RegisterStartResponse = z.infer<typeof registerStartResponseSchema>;

/**
 * POST /api/v1/register/complete
 * Called from the browser /cli/verify page once the user clears Turnstile.
 * The state/scan were already stored against the nonce in /start.
 */
export const registerCompleteRequestSchema = z.object({
  nonce: z.string().min(16).max(64),
  turnstile_token: z.string().min(1),
});
export type RegisterCompleteRequest = z.infer<
  typeof registerCompleteRequestSchema
>;

/** GET /api/v1/register/poll?nonce=... */
export const registerPollResponseSchema = z.discriminatedUnion("status", [
  z.object({ status: z.literal("pending") }),
  z.object({
    status: z.literal("ready"),
    api_key: z.string().min(32),
    handle: z.string().min(3).max(40),
    agent_id: z.string().uuid(),
  }),
  z.object({ status: z.literal("expired") }),
  z.object({ status: z.literal("rejected"), reason: z.string() }),
]);
export type RegisterPollResponse = z.infer<typeof registerPollResponseSchema>;

/** POST /api/v1/submit */
export const submitRequestSchema = z.object({
  state: stateJsonSchema,
  scan: scanSnapshotSchema,
  cli_version: z.string().min(1).max(32),
});
export type SubmitRequest = z.infer<typeof submitRequestSchema>;

export const submitResponseSchema = z.object({
  rank_overall: z.number().int().positive().nullable(),
  score: z.number().int().nonnegative(),
  delta_score: z.number().int(),
  new_unlocks: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      tier: tierSchema,
    }),
  ),
});
export type SubmitResponse = z.infer<typeof submitResponseSchema>;

/** GET /api/v1/leaderboard */
export const leaderboardEntrySchema = z.object({
  rank: z.number().int().positive(),
  handle: z.string(),
  display_name: z.string().nullable(),
  score: z.number().int().nonnegative(),
  tier_counts: z.record(tierSchema, z.number().int().nonnegative()),
  category_count: z.number().int().nonnegative(),
  github_verified: z.boolean(),
  last_seen: z.string().datetime({ offset: true }).nullable(),
});
export type LeaderboardEntry = z.infer<typeof leaderboardEntrySchema>;

export const leaderboardResponseSchema = z.object({
  entries: z.array(leaderboardEntrySchema),
  next_cursor: z.string().nullable(),
  computed_at: z.string().datetime({ offset: true }),
});
export type LeaderboardResponse = z.infer<typeof leaderboardResponseSchema>;
