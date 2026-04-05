CREATE TABLE `entries` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`created_at` integer NOT NULL,
	`raw_text` text NOT NULL,
	`processed_text` text,
	`duration_ms` integer,
	`confidence` real,
	`engine` text DEFAULT 'local' NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `sessions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`started_at` integer NOT NULL,
	`ended_at` integer,
	`model` text DEFAULT 'ggml-base.en' NOT NULL,
	`entry_count` integer DEFAULT 0 NOT NULL,
	`total_words` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL,
	`updated_at` integer NOT NULL
);
