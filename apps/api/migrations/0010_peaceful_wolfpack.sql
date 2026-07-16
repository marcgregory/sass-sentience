CREATE TABLE "firmware_packages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"version" text NOT NULL,
	"device_type" text[] DEFAULT '{}' NOT NULL,
	"release_notes" text,
	"file_hash" text,
	"file_size" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rollout_devices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"rollout_id" uuid NOT NULL,
	"device_id" uuid NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"error_message" text,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "rollouts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_type" text DEFAULT 'firmware' NOT NULL,
	"name" text NOT NULL,
	"firmware_package_id" uuid,
	"job_config" jsonb,
	"target_group_id" uuid NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"device_count" integer DEFAULT 0 NOT NULL,
	"completed_count" integer DEFAULT 0 NOT NULL,
	"failed_count" integer DEFAULT 0 NOT NULL,
	"created_by" uuid NOT NULL,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "rollout_devices" ADD CONSTRAINT "rollout_devices_rollout_id_rollouts_id_fk" FOREIGN KEY ("rollout_id") REFERENCES "public"."rollouts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rollout_devices" ADD CONSTRAINT "rollout_devices_device_id_devices_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."devices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rollouts" ADD CONSTRAINT "rollouts_firmware_package_id_firmware_packages_id_fk" FOREIGN KEY ("firmware_package_id") REFERENCES "public"."firmware_packages"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rollouts" ADD CONSTRAINT "rollouts_target_group_id_device_groups_id_fk" FOREIGN KEY ("target_group_id") REFERENCES "public"."device_groups"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rollouts" ADD CONSTRAINT "rollouts_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "firmware_packages_name_idx" ON "firmware_packages" USING btree ("name");--> statement-breakpoint
CREATE INDEX "firmware_packages_version_idx" ON "firmware_packages" USING btree ("version");--> statement-breakpoint
CREATE INDEX "rollout_devices_rollout_idx" ON "rollout_devices" USING btree ("rollout_id");--> statement-breakpoint
CREATE INDEX "rollout_devices_device_idx" ON "rollout_devices" USING btree ("device_id");--> statement-breakpoint
CREATE INDEX "rollout_devices_status_idx" ON "rollout_devices" USING btree ("status");--> statement-breakpoint
CREATE INDEX "rollouts_status_idx" ON "rollouts" USING btree ("status");--> statement-breakpoint
CREATE INDEX "rollouts_job_type_idx" ON "rollouts" USING btree ("job_type");--> statement-breakpoint
CREATE INDEX "rollouts_target_group_idx" ON "rollouts" USING btree ("target_group_id");--> statement-breakpoint
CREATE INDEX "rollouts_created_idx" ON "rollouts" USING btree ("created_at");--> statement-breakpoint

-- State machine CHECK constraints for rollout lifecycle enforcement
ALTER TABLE "rollouts" ADD CONSTRAINT "rollouts_status_check"
  CHECK (status IN ('draft', 'running', 'completed', 'failed', 'cancelled'));--> statement-breakpoint
ALTER TABLE "rollout_devices" ADD CONSTRAINT "rollout_devices_status_check"
  CHECK (status IN ('pending', 'running', 'succeeded', 'failed', 'skipped', 'cancelled'));--> statement-breakpoint

-- Terminal state invariants: completion timestamps must align with status
ALTER TABLE "rollouts" ADD CONSTRAINT "rollouts_completed_at_check"
  CHECK (
    (status IN ('completed', 'failed') AND completed_at IS NOT NULL)
    OR (status NOT IN ('completed', 'failed') AND completed_at IS NULL)
  );--> statement-breakpoint
ALTER TABLE "rollouts" ADD CONSTRAINT "rollouts_cancelled_at_check"
  CHECK (
    (status = 'cancelled' AND cancelled_at IS NOT NULL)
    OR (status != 'cancelled' AND cancelled_at IS NULL)
  );--> statement-breakpoint
ALTER TABLE "rollouts" ADD CONSTRAINT "rollouts_started_at_check"
  CHECK (
    (status IN ('running', 'completed', 'failed', 'cancelled') AND started_at IS NOT NULL)
    OR (status = 'draft' AND started_at IS NULL)
  );