import "server-only";
import {
  type Tier,
  TIER_WEIGHT,
  TIER_ORDER,
  SCORE_BONUS,
  type StateJson,
  type ScanSnapshot,
  type AchievementCatalogEntry,
} from "@hermesranker/schema";

export type ComputedScore = {
  totalScore: number;
  tierCounts: Record<Tier, number>;
  categoryCount: number;
  earliestUnlockAt: Date | null;
  /** Set of unlocked achievement IDs (for diffing on submit). */
  unlockedIds: Set<string>;
};

/**
 * Compute an agent's score from their state + scan snapshot. Pure — no DB
 * access, no env. Same function runs in the submit endpoint and the cron
 * recompute job.
 */
export function computeScore(args: {
  state: StateJson;
  scan: ScanSnapshot;
  catalogById: Map<string, AchievementCatalogEntry>;
  githubVerified: boolean;
}): ComputedScore {
  const { state, scan, catalogById, githubVerified } = args;

  const tierCounts: Record<Tier, number> = {
    copper: 0,
    silver: 0,
    gold: 0,
    diamond: 0,
    olympian: 0,
  };
  const categories = new Set<string>();
  const unlockedIds = new Set<string>();

  let tierWeightSum = 0;
  let secretCount = 0;
  let earliest: Date | null = null;

  // Cross-reference state.unlocked against scan.achievements (catalog) to
  // get is_secret, category, and trusted tier. State alone doesn't carry
  // category or secret flags.
  const scanById = new Map(scan.achievements.map((a) => [a.id, a]));

  for (const u of state.unlocked) {
    const catEntry = scanById.get(u.id) ?? catalogById.get(u.id);
    if (!catEntry) continue; // Unknown badge — silently ignore

    unlockedIds.add(u.id);
    tierCounts[u.tier] += 1;
    tierWeightSum += TIER_WEIGHT[u.tier];
    categories.add(catEntry.category);
    if (catEntry.is_secret) secretCount += 1;

    const t = new Date(u.unlocked_at);
    if (!earliest || t < earliest) earliest = t;
  }

  const totalScore =
    tierWeightSum +
    SCORE_BONUS.perSecret * secretCount +
    SCORE_BONUS.perCategory * categories.size +
    (githubVerified ? SCORE_BONUS.githubVerified : 0);

  return {
    totalScore,
    tierCounts,
    categoryCount: categories.size,
    earliestUnlockAt: earliest,
    unlockedIds,
  };
}

/**
 * Tiebreaker comparator: more Olympians → more Diamonds → ... → earlier
 * earliest-unlock → handle alpha. Returns negative if a should rank higher
 * than b (i.e. ascending sort = leaderboard order).
 */
export function compareForRank(
  a: {
    totalScore: number;
    tierCounts: Record<Tier, number>;
    earliestUnlockAt: Date | null;
    handle: string;
  },
  b: typeof a,
): number {
  if (a.totalScore !== b.totalScore) return b.totalScore - a.totalScore;
  // Higher tier first
  for (const tier of [...Object.keys(TIER_ORDER)].reverse() as Tier[]) {
    if (a.tierCounts[tier] !== b.tierCounts[tier]) {
      return b.tierCounts[tier] - a.tierCounts[tier];
    }
  }
  if (a.earliestUnlockAt && b.earliestUnlockAt) {
    const diff =
      a.earliestUnlockAt.getTime() - b.earliestUnlockAt.getTime();
    if (diff !== 0) return diff; // earlier = better
  }
  return a.handle.localeCompare(b.handle);
}
