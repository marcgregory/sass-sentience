ALTER TABLE "firmware_packages" ADD COLUMN "status" text DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE "firmware_packages" ADD COLUMN "created_by" uuid;--> statement-breakpoint
ALTER TABLE "firmware_packages" ADD COLUMN "metadata" jsonb DEFAULT '{}'::jsonb;--> statement-breakpoint
ALTER TABLE "firmware_packages" ADD CONSTRAINT "firmware_packages_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "firmware_packages" ADD CONSTRAINT "firmware_packages_status_check"
  CHECK (status IN ('active', 'deprecated'));--> statement-breakpoint
CREATE INDEX "firmware_packages_status_idx" ON "firmware_packages" USING btree ("status");