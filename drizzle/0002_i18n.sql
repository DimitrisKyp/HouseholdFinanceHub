ALTER TABLE "notification" ADD COLUMN "data" jsonb;--> statement-breakpoint
ALTER TABLE "user_preference" ADD COLUMN "locale" varchar(5);--> statement-breakpoint
ALTER TABLE "user_preference" ADD CONSTRAINT "user_preference_locale_chk" CHECK ("user_preference"."locale" in ('en', 'el'));