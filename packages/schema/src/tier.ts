import { z } from "zod";

export const TIERS = ["copper", "silver", "gold", "diamond", "olympian"] as const;
export const tierSchema = z.enum(TIERS);
export type Tier = z.infer<typeof tierSchema>;

export const TIER_WEIGHT: Record<Tier, number> = {
  copper: 1,
  silver: 3,
  gold: 10,
  diamond: 25,
  olympian: 100,
};

export const TIER_LABEL: Record<Tier, string> = {
  copper: "COPPER",
  silver: "SILVER",
  gold: "GOLD",
  diamond: "DIAMOND",
  olympian: "OLYMPIAN",
};

export const TIER_ORDER: Record<Tier, number> = {
  copper: 0,
  silver: 1,
  gold: 2,
  diamond: 3,
  olympian: 4,
};

/**
 * Score bonuses applied on top of summed tier weights.
 * Centralized here so the CLI, API, and recompute job all agree.
 */
export const SCORE_BONUS = {
  perSecret: 5,
  perCategory: 2,
  githubVerified: 10,
} as const;
