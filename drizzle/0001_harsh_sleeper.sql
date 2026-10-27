CREATE TABLE `ai_quota` (
	`user_id` text PRIMARY KEY NOT NULL,
	`day` text NOT NULL,
	`calls` integer DEFAULT 0 NOT NULL
);
