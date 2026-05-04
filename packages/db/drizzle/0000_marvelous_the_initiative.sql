CREATE TYPE "public"."agent_status" AS ENUM('active', 'flagged', 'suspended', 'deleted');--> statement-breakpoint
CREATE TYPE "public"."tier" AS ENUM('copper', 'silver', 'gold', 'diamond', 'olympian');--> statement-breakpoint
CREATE TABLE "achievement_catalog" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"tier" "tier" NOT NULL,
	"category" text NOT NULL,
	"is_secret" boolean DEFAULT false NOT NULL,
	"rarity_pct" numeric(6, 3) DEFAULT '0' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "achievements_state" (
	"agent_id" uuid NOT NULL,
	"achievement_id" text NOT NULL,
	"tier" "tier" NOT NULL,
	"category" text NOT NULL,
	"unlocked_at" timestamp with time zone NOT NULL,
	"progress_num" integer,
	"progress_den" integer,
	"is_secret" boolean DEFAULT false NOT NULL,
	CONSTRAINT "achievements_state_agent_id_achievement_id_pk" PRIMARY KEY("agent_id","achievement_id")
);
--> statement-breakpoint
CREATE TABLE "agents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"handle" text NOT NULL,
	"display_name" text,
	"fingerprint" text NOT NULL,
	"api_key_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"github_login" text,
	"github_verified" boolean DEFAULT false NOT NULL,
	"status" "agent_status" DEFAULT 'active' NOT NULL,
	"bio" text,
	"avatar_url" text,
	"last_submitted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor" text NOT NULL,
	"action" text NOT NULL,
	"target_agent" uuid,
	"reason" text,
	"evidence" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"public" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "leaderboard_scores" (
	"agent_id" uuid PRIMARY KEY NOT NULL,
	"total_score" integer NOT NULL,
	"rank_overall" integer,
	"tier_counts" jsonb NOT NULL,
	"category_count" integer NOT NULL,
	"earliest_unlock_at" timestamp with time zone,
	"computed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "registration_nonces" (
	"nonce" text PRIMARY KEY NOT NULL,
	"fingerprint" text NOT NULL,
	"handle_suggest" text NOT NULL,
	"cli_version" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"completed_agent_id" uuid,
	"completed_api_key" text
);
--> statement-breakpoint
CREATE TABLE "submissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_id" uuid,
	"raw_state_json" jsonb NOT NULL,
	"raw_scan_json" jsonb NOT NULL,
	"client_version" text NOT NULL,
	"source_ip_hash" text NOT NULL,
	"user_agent" text,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	"accepted" boolean NOT NULL,
	"reject_reason" text
);
--> statement-breakpoint
ALTER TABLE "achievements_state" ADD CONSTRAINT "achievements_state_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "achievements_state" ADD CONSTRAINT "achievements_state_achievement_id_achievement_catalog_id_fk" FOREIGN KEY ("achievement_id") REFERENCES "public"."achievement_catalog"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_target_agent_agents_id_fk" FOREIGN KEY ("target_agent") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leaderboard_scores" ADD CONSTRAINT "leaderboard_scores_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "registration_nonces" ADD CONSTRAINT "registration_nonces_completed_agent_id_agents_id_fk" FOREIGN KEY ("completed_agent_id") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "achievements_state_agent_idx" ON "achievements_state" USING btree ("agent_id");--> statement-breakpoint
CREATE UNIQUE INDEX "agents_handle_uniq" ON "agents" USING btree ("handle");--> statement-breakpoint
CREATE UNIQUE INDEX "agents_fingerprint_uniq" ON "agents" USING btree ("fingerprint");--> statement-breakpoint
CREATE INDEX "agents_status_idx" ON "agents" USING btree ("status");--> statement-breakpoint
CREATE INDEX "audit_log_target_idx" ON "audit_log" USING btree ("target_agent");--> statement-breakpoint
CREATE INDEX "audit_log_public_idx" ON "audit_log" USING btree ("public","created_at");--> statement-breakpoint
CREATE INDEX "leaderboard_scores_rank_idx" ON "leaderboard_scores" USING btree ("rank_overall");--> statement-breakpoint
CREATE INDEX "leaderboard_scores_score_idx" ON "leaderboard_scores" USING btree ("total_score" desc);--> statement-breakpoint
CREATE INDEX "registration_nonces_expires_idx" ON "registration_nonces" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "submissions_agent_received_idx" ON "submissions" USING btree ("agent_id","received_at");--> statement-breakpoint
CREATE INDEX "submissions_accepted_idx" ON "submissions" USING btree ("accepted");