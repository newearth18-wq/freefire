CREATE TABLE `room_inputs` (
	`code` text NOT NULL,
	`member_id` text NOT NULL,
	`data` text NOT NULL,
	`updated` integer NOT NULL,
	`expires` integer NOT NULL,
	PRIMARY KEY(`code`, `member_id`)
);
--> statement-breakpoint
CREATE INDEX `room_inputs_expires` ON `room_inputs` (`expires`);--> statement-breakpoint
ALTER TABLE `rooms` ADD `queue_mode` text;--> statement-breakpoint
CREATE UNIQUE INDEX `rooms_open_queue` ON `rooms` (`queue_mode`);