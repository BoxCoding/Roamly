CREATE TABLE "ai_quota" (
	"user_id" text PRIMARY KEY NOT NULL,
	"day" text NOT NULL,
	"calls" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app_secrets" (
	"name" text PRIMARY KEY NOT NULL,
	"value" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "crew_members" (
	"crew_id" text NOT NULL,
	"user_id" text NOT NULL,
	"joined_at" text NOT NULL,
	CONSTRAINT "crew_members_crew_id_user_id_pk" PRIMARY KEY("crew_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "crew_reports" (
	"crew_id" text NOT NULL,
	"reporter_id" text NOT NULL,
	"reason" text NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"created_at" text NOT NULL,
	CONSTRAINT "crew_reports_crew_id_reporter_id_pk" PRIMARY KEY("crew_id","reporter_id")
);
--> statement-breakpoint
CREATE TABLE "crews" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"city" text NOT NULL,
	"vehicle" text NOT NULL,
	"description" text NOT NULL,
	"meetup" text NOT NULL,
	"cadence" text NOT NULL,
	"links" text DEFAULT '{}' NOT NULL,
	"organizer_id" text NOT NULL,
	"organizer_name" text NOT NULL,
	"created_at" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"user_id" text PRIMARY KEY NOT NULL,
	"details" text NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"password_hash" text NOT NULL,
	"created_at" text NOT NULL,
	"failed_logins" integer DEFAULT 0 NOT NULL,
	"locked_until" text,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "crew_members" ADD CONSTRAINT "crew_members_crew_id_crews_id_fk" FOREIGN KEY ("crew_id") REFERENCES "public"."crews"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crew_reports" ADD CONSTRAINT "crew_reports_crew_id_crews_id_fk" FOREIGN KEY ("crew_id") REFERENCES "public"."crews"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "crews_organizer_idx" ON "crews" USING btree ("organizer_id");--> statement-breakpoint
CREATE INDEX "crews_status_idx" ON "crews" USING btree ("status");