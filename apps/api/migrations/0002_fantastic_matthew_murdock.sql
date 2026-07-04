ALTER TABLE "devices" ADD COLUMN "device_config" jsonb;--> statement-breakpoint
ALTER TABLE "devices" ADD COLUMN "device_io" jsonb;--> statement-breakpoint
ALTER TABLE "devices" ADD COLUMN "last_diagnostics" jsonb;