CREATE TABLE `teacher_auth_limits` (
	`key` text PRIMARY KEY NOT NULL,
	`count` integer NOT NULL,
	`expires` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `teacher_auth_limits_expires` ON `teacher_auth_limits` (`expires`);--> statement-breakpoint
CREATE TABLE `teacher_credentials` (
	`email` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`name` text NOT NULL,
	`password_hash` text NOT NULL,
	`recovery_hash` text NOT NULL,
	`created` integer NOT NULL,
	FOREIGN KEY (`owner_id`) REFERENCES `teacher_accounts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `teacher_credentials_owner` ON `teacher_credentials` (`owner_id`);--> statement-breakpoint
CREATE TABLE `teacher_sessions` (
	`token_hash` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`expires` integer NOT NULL,
	FOREIGN KEY (`owner_id`) REFERENCES `teacher_accounts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `teacher_sessions_owner` ON `teacher_sessions` (`owner_id`);--> statement-breakpoint
CREATE INDEX `teacher_sessions_expires` ON `teacher_sessions` (`expires`);