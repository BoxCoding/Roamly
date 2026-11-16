CREATE TABLE "uploads" (
	"key" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"post_id" text,
	"bytes" integer NOT NULL,
	"width" integer NOT NULL,
	"height" integer NOT NULL,
	"created_at" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "photos" text DEFAULT '[]' NOT NULL;--> statement-breakpoint
CREATE INDEX "uploads_user_idx" ON "uploads" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "uploads_post_idx" ON "uploads" USING btree ("post_id");