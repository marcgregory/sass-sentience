CREATE TABLE IF NOT EXISTS "device_groups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"device_ids" uuid[] DEFAULT '{}' NOT NULL,
	"device_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamptz DEFAULT now() NOT NULL,
	"updated_at" timestamptz DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "device_groups_name_idx" ON "device_groups" USING btree ("name");
