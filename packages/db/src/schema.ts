import {
  pgTable,
  pgEnum,
  uuid,
  text,
  timestamp,
  boolean,
  integer,
  jsonb,
  numeric,
  primaryKey,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const tierEnum = pgEnum("tier", [
  "copper",
  "silver",
  "gold",
  "diamond",
  "olympian",
]);

export const agentStatusEnum = pgEnum("agent_status", [
  "active",
  "flagged",
  "suspended",
  "deleted",
]);

export const agents = pgTable(
  "agents",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    handle: text("handle").notNull(),
    displayName: text("display_name"),
    fingerprint: text("fingerprint").notNull(),
    apiKeyHash: text("api_key_hash").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    githubLogin: text("github_login"),
    githubVerified: boolean("github_verified").default(false).notNull(),
    status: agentStatusEnum("status").default("active").notNull(),
    bio: text("bio"),
    avatarUrl: text("avatar_url"),
    lastSubmittedAt: timestamp("last_submitted_at", { withTimezone: true }),
  },
  (t) => ({
    handleUniq: uniqueIndex("agents_handle_uniq").on(t.handle),
    fingerprintUniq: uniqueIndex("agents_fingerprint_uniq").on(t.fingerprint),
    statusIdx: index("agents_status_idx").on(t.status),
  }),
);

export const submissions = pgTable(
  "submissions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    agentId: uuid("agent_id").references(() => agents.id, {
      onDelete: "cascade",
    }),
    rawStateJson: jsonb("raw_state_json").notNull(),
    rawScanJson: jsonb("raw_scan_json").notNull(),
    clientVersion: text("client_version").notNull(),
    sourceIpHash: text("source_ip_hash").notNull(),
    userAgent: text("user_agent"),
    receivedAt: timestamp("received_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    accepted: boolean("accepted").notNull(),
    rejectReason: text("reject_reason"),
  },
  (t) => ({
    agentReceivedIdx: index("submissions_agent_received_idx").on(
      t.agentId,
      t.receivedAt,
    ),
    acceptedIdx: index("submissions_accepted_idx").on(t.accepted),
  }),
);

export const achievementCatalog = pgTable("achievement_catalog", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  tier: tierEnum("tier").notNull(),
  category: text("category").notNull(),
  isSecret: boolean("is_secret").default(false).notNull(),
  rarityPct: numeric("rarity_pct", { precision: 6, scale: 3 })
    .default("0")
    .notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const achievementsState = pgTable(
  "achievements_state",
  {
    agentId: uuid("agent_id")
      .references(() => agents.id, { onDelete: "cascade" })
      .notNull(),
    achievementId: text("achievement_id")
      .references(() => achievementCatalog.id)
      .notNull(),
    tier: tierEnum("tier").notNull(),
    category: text("category").notNull(),
    unlockedAt: timestamp("unlocked_at", { withTimezone: true }).notNull(),
    progressNum: integer("progress_num"),
    progressDen: integer("progress_den"),
    isSecret: boolean("is_secret").default(false).notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.agentId, t.achievementId] }),
    agentIdx: index("achievements_state_agent_idx").on(t.agentId),
  }),
);

export const leaderboardScores = pgTable(
  "leaderboard_scores",
  {
    agentId: uuid("agent_id")
      .references(() => agents.id, { onDelete: "cascade" })
      .primaryKey(),
    totalScore: integer("total_score").notNull(),
    rankOverall: integer("rank_overall"),
    tierCounts: jsonb("tier_counts").notNull(),
    categoryCount: integer("category_count").notNull(),
    earliestUnlockAt: timestamp("earliest_unlock_at", { withTimezone: true }),
    computedAt: timestamp("computed_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => ({
    rankIdx: index("leaderboard_scores_rank_idx").on(t.rankOverall),
    scoreIdx: index("leaderboard_scores_score_idx").on(
      sql`${t.totalScore} desc`,
    ),
  }),
);

export const auditLog = pgTable(
  "audit_log",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    actor: text("actor").notNull(),
    action: text("action").notNull(),
    targetAgent: uuid("target_agent").references(() => agents.id),
    reason: text("reason"),
    evidence: jsonb("evidence"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    public: boolean("public").default(false).notNull(),
  },
  (t) => ({
    targetIdx: index("audit_log_target_idx").on(t.targetAgent),
    publicIdx: index("audit_log_public_idx").on(t.public, t.createdAt),
  }),
);

export const registrationNonces = pgTable(
  "registration_nonces",
  {
    nonce: text("nonce").primaryKey(),
    fingerprint: text("fingerprint").notNull(),
    handleSuggest: text("handle_suggest").notNull(),
    cliVersion: text("cli_version").notNull(),
    pendingStateJson: jsonb("pending_state_json").notNull(),
    pendingScanJson: jsonb("pending_scan_json").notNull(),
    sourceIpHash: text("source_ip_hash").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    completedAgentId: uuid("completed_agent_id").references(() => agents.id),
    completedApiKey: text("completed_api_key"),
  },
  (t) => ({
    expiresIdx: index("registration_nonces_expires_idx").on(t.expiresAt),
  }),
);

export const githubLinkNonces = pgTable(
  "github_link_nonces",
  {
    nonce: text("nonce").primaryKey(),
    agentId: uuid("agent_id")
      .references(() => agents.id, { onDelete: "cascade" })
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    completedGithubLogin: text("completed_github_login"),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    error: text("error"),
  },
  (t) => ({
    expiresIdx: index("github_link_nonces_expires_idx").on(t.expiresAt),
    agentIdx: index("github_link_nonces_agent_idx").on(t.agentId),
  }),
);

export type Agent = typeof agents.$inferSelect;
export type NewAgent = typeof agents.$inferInsert;
export type Submission = typeof submissions.$inferSelect;
export type AchievementCatalog = typeof achievementCatalog.$inferSelect;
export type AchievementState = typeof achievementsState.$inferSelect;
export type LeaderboardScore = typeof leaderboardScores.$inferSelect;
