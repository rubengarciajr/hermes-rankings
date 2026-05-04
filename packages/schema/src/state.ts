import { z } from "zod";
import { tierSchema } from "./tier";

/**
 * Schema for `~/.hermes/plugins/hermes-achievements/state.json`.
 *
 * This is the unlock-history file the Hermes Achievements plugin maintains.
 * Shape inferred from the plugin docs at
 * https://hermes-agent.nousresearch.com/docs/user-guide/features/built-in-plugins#hermes-achievements
 *
 * If the upstream plugin format changes, the API will reject submissions
 * until this schema is updated and shipped to clients.
 */

export const unlockedAchievementSchema = z.object({
  id: z.string().min(1).max(128),
  tier: tierSchema,
  unlocked_at: z.string().datetime({ offset: true }),
  /** Optional snapshot of progress at unlock time, e.g. 52/70. */
  progress_num: z.number().int().nonnegative().optional(),
  progress_den: z.number().int().positive().optional(),
});
export type UnlockedAchievement = z.infer<typeof unlockedAchievementSchema>;

export const stateJsonSchema = z.object({
  schema_version: z.number().int().positive(),
  agent_id: z.string().min(1).max(256),
  /** Each badge that has been earned at any tier. */
  unlocked: z.array(unlockedAchievementSchema).max(500),
  /** Last time the local plugin wrote this file. */
  last_updated: z.string().datetime({ offset: true }),
});
export type StateJson = z.infer<typeof stateJsonSchema>;
