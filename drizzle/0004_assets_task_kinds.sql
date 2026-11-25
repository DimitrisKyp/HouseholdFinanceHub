CREATE TYPE "public"."asset_kind" AS ENUM('bank', 'crypto', 'stocks', 'real_estate', 'other');--> statement-breakpoint
CREATE TYPE "public"."task_kind" AS ENUM('vehicle', 'documents', 'subscriptions', 'warranties', 'bills', 'returns', 'prescriptions', 'free_trials', 'other');--> statement-breakpoint
CREATE TYPE "public"."task_repeat" AS ENUM('daily', 'weekly', 'monthly', 'yearly');--> statement-breakpoint
CREATE TABLE "asset" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"household_id" uuid NOT NULL,
	"name" varchar(120) NOT NULL,
	"kind" "asset_kind" DEFAULT 'other' NOT NULL,
	"value" numeric(12, 2) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "asset_value_chk" CHECK ("asset"."value" >= 0)
);
--> statement-breakpoint
ALTER TABLE "task" ADD COLUMN "kind" "task_kind" DEFAULT 'other' NOT NULL;--> statement-breakpoint
ALTER TABLE "task" ADD COLUMN "repeat" "task_repeat";--> statement-breakpoint
ALTER TABLE "asset" ADD CONSTRAINT "asset_household_id_household_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."household"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "asset_household_idx" ON "asset" USING btree ("household_id");--> statement-breakpoint
ALTER TABLE "task" ADD CONSTRAINT "task_repeat_chk" CHECK ("task"."repeat" is null or "task"."due_on" is not null);