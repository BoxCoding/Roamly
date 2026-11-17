ALTER TABLE "rides" ADD COLUMN "cover" text;--> statement-breakpoint
ALTER TABLE "rides" ADD COLUMN "tags" text DEFAULT '[]' NOT NULL;