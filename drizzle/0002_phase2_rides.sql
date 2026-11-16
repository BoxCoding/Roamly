CREATE TABLE "ride_rsvps" (
	"ride_id" text NOT NULL,
	"user_id" text NOT NULL,
	"status" text NOT NULL,
	"checklist" text DEFAULT '[]' NOT NULL,
	"created_at" text NOT NULL,
	CONSTRAINT "ride_rsvps_ride_id_user_id_pk" PRIMARY KEY("ride_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "ride_updates" (
	"id" text PRIMARY KEY NOT NULL,
	"ride_id" text NOT NULL,
	"author_id" text NOT NULL,
	"author_name" text NOT NULL,
	"body" text NOT NULL,
	"pinned" boolean DEFAULT false NOT NULL,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rides" (
	"id" text PRIMARY KEY NOT NULL,
	"crew_id" text NOT NULL,
	"title" text NOT NULL,
	"route_id" text NOT NULL,
	"route" text DEFAULT '{}' NOT NULL,
	"start_date" text NOT NULL,
	"days" integer NOT NULL,
	"meetup_point" text NOT NULL,
	"meetup_time" text NOT NULL,
	"capacity" integer NOT NULL,
	"min_experience" text DEFAULT 'Beginner' NOT NULL,
	"vehicle" text NOT NULL,
	"stay" text DEFAULT 'Comfort' NOT NULL,
	"distance_km" integer NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"lead_id" text NOT NULL,
	"status" text DEFAULT 'scheduled' NOT NULL,
	"brief" text,
	"brief_at" text,
	"brief_count" integer DEFAULT 0 NOT NULL,
	"created_at" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ride_rsvps" ADD CONSTRAINT "ride_rsvps_ride_id_rides_id_fk" FOREIGN KEY ("ride_id") REFERENCES "public"."rides"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ride_updates" ADD CONSTRAINT "ride_updates_ride_id_rides_id_fk" FOREIGN KEY ("ride_id") REFERENCES "public"."rides"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rides" ADD CONSTRAINT "rides_crew_id_crews_id_fk" FOREIGN KEY ("crew_id") REFERENCES "public"."crews"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ride_rsvps_user_idx" ON "ride_rsvps" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "ride_updates_ride_idx" ON "ride_updates" USING btree ("ride_id");--> statement-breakpoint
CREATE INDEX "rides_crew_idx" ON "rides" USING btree ("crew_id");--> statement-breakpoint
CREATE INDEX "rides_start_idx" ON "rides" USING btree ("start_date");