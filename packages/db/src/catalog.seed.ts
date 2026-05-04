/**
 * Initial achievement catalog.
 *
 * These entries are best-effort reconstructions of the Hermes Achievements
 * plugin catalog inferred from public docs (categories: AGENT AUTONOMY,
 * TOOL MASTERY, etc.; tiers: copper → olympian). Replace this list by
 * running `scripts/seed-catalog.ts` against a real
 * `~/.hermes/plugins/hermes-achievements/scan_snapshot.json`.
 */
import type { Tier } from "@hermesranker/schema";

export type CatalogSeed = {
  id: string;
  name: string;
  description: string;
  tier: Tier;
  category: string;
  is_secret: boolean;
};

export const SEED_CATALOG: CatalogSeed[] = [
  // AGENT AUTONOMY
  {
    id: "agent_autonomy_toolchain_maxxer",
    name: "Toolchain Maxxer",
    description: "Use a wide spread of distinct Hermes tools in one session.",
    tier: "gold",
    category: "AGENT AUTONOMY",
    is_secret: false,
  },
  {
    id: "agent_autonomy_marathon",
    name: "Marathon",
    description: "Run a single agent session for over 8 hours straight.",
    tier: "diamond",
    category: "AGENT AUTONOMY",
    is_secret: false,
  },
  {
    id: "agent_autonomy_first_steps",
    name: "First Steps",
    description: "Complete your first autonomous task without user intervention.",
    tier: "copper",
    category: "AGENT AUTONOMY",
    is_secret: false,
  },
  {
    id: "agent_autonomy_self_directed",
    name: "Self-Directed",
    description: "Chain 50 tool calls without asking the user a clarifying question.",
    tier: "silver",
    category: "AGENT AUTONOMY",
    is_secret: false,
  },

  // TOOL MASTERY
  {
    id: "tool_mastery_grep_god",
    name: "Grep God",
    description: "Issue 1,000 successful grep / Glob searches.",
    tier: "gold",
    category: "TOOL MASTERY",
    is_secret: false,
  },
  {
    id: "tool_mastery_first_edit",
    name: "First Edit",
    description: "Make your first successful file edit.",
    tier: "copper",
    category: "TOOL MASTERY",
    is_secret: false,
  },
  {
    id: "tool_mastery_bash_brawler",
    name: "Bash Brawler",
    description: "Run 500 successful Bash commands.",
    tier: "silver",
    category: "TOOL MASTERY",
    is_secret: false,
  },
  {
    id: "tool_mastery_zero_typo",
    name: "Zero Typo",
    description: "Land 100 consecutive Edit calls without a single retry.",
    tier: "diamond",
    category: "TOOL MASTERY",
    is_secret: false,
  },

  // SKILL & MEMORY
  {
    id: "memory_keeper",
    name: "Memory Keeper",
    description: "Write 25 distinct memory entries.",
    tier: "silver",
    category: "SKILL & MEMORY",
    is_secret: false,
  },
  {
    id: "memory_curator",
    name: "Memory Curator",
    description: "Consolidate or prune memory at least 10 times.",
    tier: "gold",
    category: "SKILL & MEMORY",
    is_secret: false,
  },
  {
    id: "skill_user",
    name: "Skill User",
    description: "Invoke a skill for the first time.",
    tier: "copper",
    category: "SKILL & MEMORY",
    is_secret: false,
  },
  {
    id: "skill_polyglot",
    name: "Skill Polyglot",
    description: "Use 10 different skills in a single week.",
    tier: "gold",
    category: "SKILL & MEMORY",
    is_secret: false,
  },

  // DEBUGGING
  {
    id: "debug_root_cause",
    name: "Root Cause",
    description: "Find and fix the underlying cause, not just the symptom.",
    tier: "silver",
    category: "DEBUGGING",
    is_secret: false,
  },
  {
    id: "debug_bisect_hero",
    name: "Bisect Hero",
    description: "Use git bisect to find a regression in under 10 steps.",
    tier: "gold",
    category: "DEBUGGING",
    is_secret: false,
  },
  {
    id: "debug_no_console_log",
    name: "No Console.log",
    description: "Resolve a bug without adding a single print statement.",
    tier: "diamond",
    category: "DEBUGGING",
    is_secret: false,
  },

  // VIBE CODING
  {
    id: "vibe_first_ship",
    name: "First Ship",
    description: "Deploy something publicly for the first time.",
    tier: "copper",
    category: "VIBE CODING",
    is_secret: false,
  },
  {
    id: "vibe_streak_7",
    name: "7-Day Streak",
    description: "Use Hermes for coding 7 days in a row.",
    tier: "silver",
    category: "VIBE CODING",
    is_secret: false,
  },
  {
    id: "vibe_streak_30",
    name: "30-Day Streak",
    description: "Use Hermes for coding 30 days in a row.",
    tier: "gold",
    category: "VIBE CODING",
    is_secret: false,
  },
  {
    id: "vibe_streak_365",
    name: "Year One",
    description: "Use Hermes for coding 365 days in a row.",
    tier: "olympian",
    category: "VIBE CODING",
    is_secret: false,
  },

  // MODEL VARIETY
  {
    id: "model_polyglot",
    name: "Model Polyglot",
    description: "Drive sessions with at least 3 distinct model families.",
    tier: "silver",
    category: "MODEL VARIETY",
    is_secret: false,
  },
  {
    id: "model_local_native",
    name: "Local Native",
    description: "Run an agent session entirely on a local model.",
    tier: "gold",
    category: "MODEL VARIETY",
    is_secret: false,
  },

  // LIFESTYLE
  {
    id: "lifestyle_night_owl",
    name: "Night Owl",
    description: "Complete 20 sessions between midnight and 4 AM.",
    tier: "silver",
    category: "LIFESTYLE",
    is_secret: false,
  },
  {
    id: "lifestyle_weekend_warrior",
    name: "Weekend Warrior",
    description: "Ship something material on a Saturday or Sunday.",
    tier: "copper",
    category: "LIFESTYLE",
    is_secret: false,
  },
  {
    id: "lifestyle_marathon_week",
    name: "Marathon Week",
    description: "Log 60+ hours of agent time in a single week.",
    tier: "diamond",
    category: "LIFESTYLE",
    is_secret: false,
  },

  // OLYMPIAN tier — the rarest
  {
    id: "olympian_full_pantheon",
    name: "Full Pantheon",
    description: "Earn at least one Diamond badge in every category.",
    tier: "olympian",
    category: "OLYMPIAN",
    is_secret: false,
  },
  {
    id: "olympian_first_million",
    name: "First Million",
    description: "Cross 1,000,000 lifetime tool calls.",
    tier: "olympian",
    category: "OLYMPIAN",
    is_secret: false,
  },

  // SECRETS — hidden until first signal
  {
    id: "secret_typo_master",
    name: "Typo Master",
    description: "Recover from 100 typos without losing flow.",
    tier: "gold",
    category: "SECRETS",
    is_secret: true,
  },
  {
    id: "secret_5am_club",
    name: "5 AM Club",
    description: "Start a session before 5 AM local time, three times.",
    tier: "silver",
    category: "SECRETS",
    is_secret: true,
  },
  {
    id: "secret_one_shot",
    name: "One-Shot",
    description: "Land a feature in a single conversation, no follow-ups.",
    tier: "diamond",
    category: "SECRETS",
    is_secret: true,
  },
];
