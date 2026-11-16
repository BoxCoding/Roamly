CREATE TABLE "geocodes" (
	"query" text PRIMARY KEY NOT NULL,
	"lat" double precision,
	"lng" double precision,
	"label" text DEFAULT '' NOT NULL,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plans" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"title" text NOT NULL,
	"data" text NOT NULL,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "rides" ADD COLUMN "plan" text;--> statement-breakpoint
CREATE INDEX "plans_user_idx" ON "plans" USING btree ("user_id");