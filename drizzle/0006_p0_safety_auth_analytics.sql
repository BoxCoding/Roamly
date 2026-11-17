CREATE TABLE "events" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"user_id" text,
	"props" text DEFAULT '{}' NOT NULL,
	"at" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ride_rsvps" ADD COLUMN "waiver_at" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "email_verified_at" text;--> statement-breakpoint
CREATE INDEX "events_name_at_idx" ON "events" USING btree ("name","at");--> statement-breakpoint
CREATE INDEX "events_user_idx" ON "events" USING btree ("user_id");