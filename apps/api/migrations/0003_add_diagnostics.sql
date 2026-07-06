CREATE TABLE "diagnostic_results" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"test_id" uuid NOT NULL,
	"device_id" uuid NOT NULL,
	"status" text NOT NULL,
	"message" text NOT NULL,
	"details" jsonb,
	"ran_by" uuid NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"completed_at" timestamp with time zone NOT NULL,
	"duration_ms" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "diagnostic_tests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"description" text NOT NULL,
	"supported_device_types" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"timeout" integer DEFAULT 30 NOT NULL,
	"result_schema" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "diagnostic_results" ADD CONSTRAINT "diagnostic_results_test_id_diagnostic_tests_id_fk" FOREIGN KEY ("test_id") REFERENCES "public"."diagnostic_tests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "diagnostic_results" ADD CONSTRAINT "diagnostic_results_device_id_devices_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."devices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "diag_results_device_idx" ON "diagnostic_results" USING btree ("device_id");--> statement-breakpoint
CREATE INDEX "diag_results_test_idx" ON "diagnostic_results" USING btree ("test_id");--> statement-breakpoint
CREATE INDEX "diag_results_status_idx" ON "diagnostic_results" USING btree ("status");--> statement-breakpoint
CREATE INDEX "diag_results_started_at_idx" ON "diagnostic_results" USING btree ("started_at");--> statement-breakpoint
CREATE INDEX "diag_tests_type_idx" ON "diagnostic_tests" USING btree ("type");--> statement-breakpoint
CREATE INDEX "diag_tests_enabled_idx" ON "diagnostic_tests" USING btree ("enabled");