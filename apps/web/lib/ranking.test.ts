import { describe, it, expect } from "vitest";
import type {
  StateJson,
  ScanSnapshot,
  AchievementCatalogEntry,
  Tier,
} from "@hermesranker/schema";
import { computeScore, compareForRank } from "./ranking";

function catalog(
  ...entries: Array<Partial<AchievementCatalogEntry> & { id: string }>
): Map<string, AchievementCatalogEntry> {
  return new Map(
    entries.map((e) => [
      e.id,
      {
        id: e.id,
        name: e.name ?? e.id,
        description: e.description ?? "",
        tier: e.tier ?? "copper",
        category: e.category ?? "Misc",
        is_secret: e.is_secret ?? false,
        progress: null,
        unlocked: false,
      },
    ]),
  );
}

function fixtureState(unlocked: { id: string; tier: Tier }[]): StateJson {
  return {
    schema_version: 1,
    agent_id: "agent-test",
    unlocked: unlocked.map((u) => ({
      ...u,
      unlocked_at: "2026-01-01T00:00:00Z",
    })),
    last_updated: "2026-05-04T00:00:00Z",
  };
}

function fixtureScan(): ScanSnapshot {
  return {
    schema_version: 1,
    agent_id: "agent-test",
    generated_at: "2026-05-04T00:00:00Z",
    achievements: [],
    sessions: [],
  };
}

describe("computeScore", () => {
  it("sums tier weights using catalog metadata", () => {
    const result = computeScore({
      state: fixtureState([
        { id: "a", tier: "copper" }, // 1
        { id: "b", tier: "silver" }, // 3
        { id: "c", tier: "gold" }, // 10
      ]),
      scan: fixtureScan(),
      catalogById: catalog(
        { id: "a", category: "X" },
        { id: "b", category: "X" },
        { id: "c", category: "Y" },
      ),
      githubVerified: false,
    });
    // 1 + 3 + 10 = 14, plus 2 categories * 2 = 4 → 18
    expect(result.totalScore).toBe(18);
    expect(result.tierCounts).toEqual({
      copper: 1,
      silver: 1,
      gold: 1,
      diamond: 0,
      olympian: 0,
    });
    expect(result.categoryCount).toBe(2);
  });

  it("applies +5 per secret unlock", () => {
    const result = computeScore({
      state: fixtureState([{ id: "s1", tier: "copper" }]),
      scan: fixtureScan(),
      catalogById: catalog({ id: "s1", category: "Sec", is_secret: true }),
      githubVerified: false,
    });
    // 1 (copper) + 5 (secret) + 2 (1 category) = 8
    expect(result.totalScore).toBe(8);
  });

  it("applies +10 for githubVerified", () => {
    const result = computeScore({
      state: fixtureState([{ id: "a", tier: "copper" }]),
      scan: fixtureScan(),
      catalogById: catalog({ id: "a", category: "X" }),
      githubVerified: true,
    });
    // 1 + 2 + 10 = 13
    expect(result.totalScore).toBe(13);
  });

  it("ignores unlocks with unknown badge IDs (silently)", () => {
    const result = computeScore({
      state: fixtureState([
        { id: "known", tier: "gold" },
        { id: "ghost", tier: "olympian" },
      ]),
      scan: fixtureScan(),
      catalogById: catalog({ id: "known", category: "X" }),
      githubVerified: false,
    });
    // Just `known`: 10 + 2 categories * 2 (1 cat) = 12
    expect(result.totalScore).toBe(12);
    expect(result.unlockedIds.has("ghost")).toBe(false);
  });

  it("returns earliest unlock timestamp", () => {
    const result = computeScore({
      state: {
        ...fixtureState([{ id: "a", tier: "copper" }]),
        unlocked: [
          { id: "b", tier: "silver", unlocked_at: "2025-06-01T00:00:00Z" },
          { id: "a", tier: "copper", unlocked_at: "2024-01-15T00:00:00Z" },
          { id: "c", tier: "gold", unlocked_at: "2026-02-01T00:00:00Z" },
        ],
      },
      scan: fixtureScan(),
      catalogById: catalog(
        { id: "a", category: "X" },
        { id: "b", category: "X" },
        { id: "c", category: "X" },
      ),
      githubVerified: false,
    });
    expect(result.earliestUnlockAt?.toISOString()).toBe("2024-01-15T00:00:00.000Z");
  });
});

describe("compareForRank", () => {
  const baseTiers = {
    copper: 0,
    silver: 0,
    gold: 0,
    diamond: 0,
    olympian: 0,
  };

  it("higher score ranks first", () => {
    const a = {
      totalScore: 100,
      tierCounts: baseTiers,
      earliestUnlockAt: null,
      handle: "a",
    };
    const b = { ...a, totalScore: 50 };
    expect(compareForRank(a, b)).toBeLessThan(0);
  });

  it("breaks ties by Olympian count", () => {
    const a = {
      totalScore: 100,
      tierCounts: { ...baseTiers, olympian: 1 },
      earliestUnlockAt: null,
      handle: "a",
    };
    const b = {
      totalScore: 100,
      tierCounts: { ...baseTiers, olympian: 0, diamond: 5 },
      earliestUnlockAt: null,
      handle: "b",
    };
    expect(compareForRank(a, b)).toBeLessThan(0);
  });

  it("breaks tier-tie by earlier earliestUnlockAt", () => {
    const a = {
      totalScore: 100,
      tierCounts: baseTiers,
      earliestUnlockAt: new Date("2024-01-01"),
      handle: "a",
    };
    const b = {
      totalScore: 100,
      tierCounts: baseTiers,
      earliestUnlockAt: new Date("2025-01-01"),
      handle: "b",
    };
    expect(compareForRank(a, b)).toBeLessThan(0);
  });

  it("falls back to handle alpha", () => {
    const a = {
      totalScore: 100,
      tierCounts: baseTiers,
      earliestUnlockAt: null,
      handle: "abc",
    };
    const b = { ...a, handle: "xyz" };
    expect(compareForRank(a, b)).toBeLessThan(0);
  });
});
