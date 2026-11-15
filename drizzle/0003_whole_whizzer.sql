CREATE TABLE `crew_members` (
	`crew_id` text NOT NULL,
	`user_id` text NOT NULL,
	`joined_at` text NOT NULL,
	PRIMARY KEY(`crew_id`, `user_id`),
	FOREIGN KEY (`crew_id`) REFERENCES `crews`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `crews` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`city` text NOT NULL,
	`vehicle` text NOT NULL,
	`description` text NOT NULL,
	`meetup` text NOT NULL,
	`cadence` text NOT NULL,
	`links` text DEFAULT '{}' NOT NULL,
	`organizer_id` text NOT NULL,
	`organizer_name` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `crews_organizer_idx` ON `crews` (`organizer_id`);