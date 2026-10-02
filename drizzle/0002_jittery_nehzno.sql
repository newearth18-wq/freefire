CREATE TABLE `learner_profiles` (
	`token` text PRIMARY KEY NOT NULL,
	`appearance` text DEFAULT '{}' NOT NULL,
	`created` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `learning_rewards` (
	`profile_token` text NOT NULL,
	`match_id` text NOT NULL,
	`question_id` text NOT NULL,
	`stars` integer NOT NULL,
	PRIMARY KEY(`profile_token`, `match_id`, `question_id`)
);
