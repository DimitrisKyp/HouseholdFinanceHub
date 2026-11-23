CREATE TABLE "user_preference" (
	"user_id" text PRIMARY KEY NOT NULL,
	"theme" varchar(10) DEFAULT 'system' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_preference_theme_chk" CHECK ("user_preference"."theme" in ('system', 'dark', 'light'))
);
--> statement-breakpoint
ALTER TABLE "user_preference" ADD CONSTRAINT "user_preference_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;