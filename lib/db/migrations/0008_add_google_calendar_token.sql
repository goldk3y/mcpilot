CREATE TABLE IF NOT EXISTS "gmail_search_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"query" text NOT NULL,
	"timestamp" timestamp DEFAULT now() NOT NULL,
	"result_count" integer DEFAULT 0,
	"execution_time_ms" integer DEFAULT 0
);
--> statement-breakpoint
ALTER TABLE "User" ADD COLUMN "googleCalendarRefreshToken" text;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "gmail_search_history" ADD CONSTRAINT "gmail_search_history_user_id_User_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
