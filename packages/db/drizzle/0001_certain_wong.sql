ALTER TABLE "registration_nonces" ADD COLUMN "pending_state_json" jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "registration_nonces" ADD COLUMN "pending_scan_json" jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "registration_nonces" ADD COLUMN "source_ip_hash" text NOT NULL;