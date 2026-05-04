CREATE TABLE "github_link_nonces" (
	"nonce" text PRIMARY KEY NOT NULL,
	"agent_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"completed_github_login" text,
	"completed_at" timestamp with time zone,
	"error" text
);
--> statement-breakpoint
ALTER TABLE "github_link_nonces" ADD CONSTRAINT "github_link_nonces_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "github_link_nonces_expires_idx" ON "github_link_nonces" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "github_link_nonces_agent_idx" ON "github_link_nonces" USING btree ("agent_id");