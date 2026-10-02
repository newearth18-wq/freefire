CREATE TABLE `teacher_accounts` (
	`id` text PRIMARY KEY NOT NULL,
	`created` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `teacher_question_sets` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`title` text NOT NULL,
	`map_id` text NOT NULL,
	`lesson` text NOT NULL,
	`question_count` integer NOT NULL,
	`revision` integer DEFAULT 0 NOT NULL,
	`created` integer NOT NULL,
	`updated` integer NOT NULL,
	FOREIGN KEY (`owner_id`) REFERENCES `teacher_accounts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `teacher_sets_owner_updated` ON `teacher_question_sets` (`owner_id`,`updated`);