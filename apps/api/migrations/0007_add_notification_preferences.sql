--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "notification_preferences" jsonb NOT NULL DEFAULT '{}';
