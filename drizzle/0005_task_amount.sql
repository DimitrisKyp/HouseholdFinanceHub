ALTER TABLE "task" ADD COLUMN "amount" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "task" ADD CONSTRAINT "task_amount_chk" CHECK ("task"."amount" is null or "task"."amount" > 0);