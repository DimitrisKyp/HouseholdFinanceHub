CREATE TABLE "task" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"household_id" uuid NOT NULL,
	"title" varchar(120) NOT NULL,
	"due_on" date,
	"remind_days_before" integer DEFAULT 1 NOT NULL,
	"assignee_user_id" text,
	"created_by_user_id" text,
	"done_at" timestamp with time zone,
	"done_by_user_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "task_remind_days_chk" CHECK ("task"."remind_days_before" between 0 and 30)
);
--> statement-breakpoint
ALTER TABLE "recurring_item" ADD COLUMN "due_on" date;--> statement-breakpoint
ALTER TABLE "recurring_item" ADD COLUMN "paid_through" date;--> statement-breakpoint
ALTER TABLE "recurring_item" ADD COLUMN "remind_days_before" integer DEFAULT 3 NOT NULL;--> statement-breakpoint
ALTER TABLE "task" ADD CONSTRAINT "task_household_id_household_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."household"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task" ADD CONSTRAINT "task_assignee_user_id_user_id_fk" FOREIGN KEY ("assignee_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task" ADD CONSTRAINT "task_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task" ADD CONSTRAINT "task_done_by_user_id_user_id_fk" FOREIGN KEY ("done_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "task_household_open_idx" ON "task" USING btree ("household_id","done_at");--> statement-breakpoint
ALTER TABLE "recurring_item" ADD CONSTRAINT "recurring_item_remind_days_chk" CHECK ("recurring_item"."remind_days_before" between 0 and 30);