CREATE TABLE "accounts" (
	"user_id" text PRIMARY KEY NOT NULL,
	"public_id" text NOT NULL,
	"name" text NOT NULL,
	"email" text DEFAULT '' NOT NULL,
	"provider" text NOT NULL,
	"role" text DEFAULT 'rider' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"suspend_reason" text DEFAULT '' NOT NULL,
	"created_at" text NOT NULL,
	"last_seen_at" text NOT NULL,
	CONSTRAINT "accounts_public_id_unique" UNIQUE("public_id")
);
--> statement-breakpoint
ALTER TABLE "crew_members" ADD COLUMN "role" text DEFAULT 'member' NOT NULL;--> statement-breakpoint
ALTER TABLE "crew_members" ADD COLUMN "status" text DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE "crews" ADD COLUMN "visibility" text DEFAULT 'public' NOT NULL;--> statement-breakpoint
CREATE INDEX "accounts_role_idx" ON "accounts" USING btree ("role");--> statement-breakpoint
CREATE INDEX "crew_members_user_idx" ON "crew_members" USING btree ("user_id");--> statement-breakpoint
-- Existing organizers become the owner of their crew.
UPDATE "crew_members" SET "role" = 'owner' FROM "crews" WHERE "crews"."id" = "crew_members"."crew_id" AND "crews"."organizer_id" = "crew_members"."user_id";
