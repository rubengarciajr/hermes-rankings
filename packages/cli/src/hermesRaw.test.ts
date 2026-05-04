import { describe, it, expect } from "vitest";
import {
  normalize,
  parseRawHermesFiles,
  rawScanSnapshotSchema,
  rawStateJsonSchema,
} from "./hermesRaw";

const SAMPLE_STATE = {
  unlocks: {
    let_him_cook: {
      evidence: { session_id: "20260428_x", title: "t", value: 272 },
      first_tier: "Copper",
      unlocked_at: 1777903835,
    },
    claude_confidant: {
      evidence: null,
      first_tier: "Gold",
      unlocked_at: 1777903835,
    },
  },
};

const SAMPLE_SCAN = {
  achievements: [
    {
      id: "let_him_cook",
      name: "Let Him Cook",
      description: "Tool chain in one session.",
      category: "Agent Autonomy",
      tier: "Copper",
      state: "unlocked",
      unlocked: true,
      unlocked_at: 1777903835,
      progress: 272,
      next_threshold: 500,
      tiers: [
        { name: "Copper", threshold: 200 },
        { name: "Silver", threshold: 500 },
      ],
    },
    {
      id: "claude_confidant",
      name: "Claude Confidant",
      description: "Claude usage milestone.",
      category: "Model Lore",
      tier: "Gold",
      state: "unlocked",
      unlocked: true,
      unlocked_at: 1777903835,
      progress: 100,
      next_threshold: 200,
    },
    {
      id: "port_3000_taken",
      name: "???",
      description: "Secret achievement.",
      category: "Debugging Chaos",
      tier: null,
      state: "secret",
      unlocked: false,
      unlocked_at: null,
      progress: 0,
      next_threshold: 15,
      secret: true,
    },
  ],
  sessions: [
    {
      session_id: "20260428_072403_0a7476",
      started_at: 1777903835.123,
      last_active: 1777903999.456,
      message_count: 42,
      tool_call_count: 272,
    },
  ],
  generated_at: 1777904000,
};

describe("rawStateJsonSchema", () => {
  it("parses real-shape state with object-keyed unlocks", () => {
    const parsed = rawStateJsonSchema.parse(SAMPLE_STATE);
    expect(Object.keys(parsed.unlocks)).toHaveLength(2);
    expect(parsed.unlocks.let_him_cook?.first_tier).toBe("Copper");
  });

  it("rejects lowercase tier names", () => {
    const bad = {
      unlocks: {
        x: { evidence: null, first_tier: "copper", unlocked_at: 1 },
      },
    };
    const result = rawStateJsonSchema.safeParse(bad);
    expect(result.success).toBe(false);
  });
});

describe("rawScanSnapshotSchema", () => {
  it("accepts float timestamps in sessions", () => {
    const result = rawScanSnapshotSchema.safeParse(SAMPLE_SCAN);
    expect(result.success).toBe(true);
  });

  it("ignores extra unknown fields via passthrough", () => {
    const withExtras = {
      ...SAMPLE_SCAN,
      total_count: 60,
      unlocked_count: 15,
      surprise_field: "ignored",
    };
    const result = rawScanSnapshotSchema.safeParse(withExtras);
    expect(result.success).toBe(true);
  });
});

describe("parseRawHermesFiles", () => {
  it("returns ok=true on valid pair", () => {
    const r = parseRawHermesFiles({
      stateRaw: SAMPLE_STATE,
      scanRaw: SAMPLE_SCAN,
    });
    expect(r.ok).toBe(true);
  });

  it("returns ok=false with reason on bad state", () => {
    const r = parseRawHermesFiles({
      stateRaw: { not_unlocks: {} },
      scanRaw: SAMPLE_SCAN,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toContain("state.json");
  });
});

describe("normalize", () => {
  it("converts state.unlocks object → array with lowercase tiers + ISO timestamps", () => {
    const { state } = normalize({
      rawState: SAMPLE_STATE,
      rawScan: SAMPLE_SCAN,
      machineId: "abcdef0123456789abcdef0123456789",
    });
    expect(state.unlocked).toHaveLength(2);
    const cook = state.unlocked.find((u) => u.id === "let_him_cook");
    expect(cook?.tier).toBe("copper");
    expect(cook?.unlocked_at).toMatch(/^2026-/);
  });

  it("derives a stable agent_id from earliest unlock + machine prefix", () => {
    const a = normalize({
      rawState: SAMPLE_STATE,
      rawScan: SAMPLE_SCAN,
      machineId: "machine-one-prefix",
    });
    const b = normalize({
      rawState: SAMPLE_STATE,
      rawScan: SAMPLE_SCAN,
      machineId: "machine-one-prefix",
    });
    expect(a.state.agent_id).toBe(b.state.agent_id);
    expect(a.state.agent_id).toContain("hermes-");
  });

  it("different machines produce different agent_ids", () => {
    const a = normalize({
      rawState: SAMPLE_STATE,
      rawScan: SAMPLE_SCAN,
      machineId: "AAAA",
    });
    const b = normalize({
      rawState: SAMPLE_STATE,
      rawScan: SAMPLE_SCAN,
      machineId: "BBBB",
    });
    expect(a.state.agent_id).not.toBe(b.state.agent_id);
  });

  it("marks secrets via either secret:true or state==secret", () => {
    const { scan } = normalize({
      rawState: SAMPLE_STATE,
      rawScan: SAMPLE_SCAN,
      machineId: "x".repeat(32),
    });
    const port = scan.achievements.find((a) => a.id === "port_3000_taken");
    expect(port?.is_secret).toBe(true);
  });

  it("synthesizes session_ids in the agent:main:... format", () => {
    const { scan } = normalize({
      rawState: SAMPLE_STATE,
      rawScan: SAMPLE_SCAN,
      machineId: "x".repeat(32),
    });
    expect(scan.sessions[0]?.session_id).toMatch(
      /^agent:main:hermes:cli:/,
    );
  });

  it("filters out sessions missing started_at or last_active", () => {
    const scan = {
      ...SAMPLE_SCAN,
      sessions: [
        { session_id: "good", started_at: 1, last_active: 2 },
        { session_id: "bad", started_at: null, last_active: 3 },
      ],
    };
    const result = normalize({
      rawState: SAMPLE_STATE,
      rawScan: scan,
      machineId: "x".repeat(32),
    });
    expect(result.scan.sessions).toHaveLength(1);
    expect(result.scan.sessions[0]?.session_id).toContain("good");
  });
});
