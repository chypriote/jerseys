CREATE TABLE `country` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`continent` text NOT NULL,
	`league_id` integer NOT NULL,
	FOREIGN KEY (`league_id`) REFERENCES `league`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `country_name_unique` ON `country` (`name`);--> statement-breakpoint
CREATE UNIQUE INDEX `country_league_id_unique` ON `country` (`league_id`);--> statement-breakpoint
CREATE TABLE `jersey` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`kit_id` integer NOT NULL,
	`version` text NOT NULL,
	`size` text,
	`fit` text,
	`print` text,
	`acquisition_kind` text NOT NULL,
	`acquisition_date` text NOT NULL,
	`sent_date` text,
	`received_date` text,
	`store_id` integer,
	`price_cents` integer,
	`giver` text,
	FOREIGN KEY (`kit_id`) REFERENCES `kit`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`store_id`) REFERENCES `store`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `kit` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`team_id` integer NOT NULL,
	`season_start_year` integer NOT NULL,
	`season_end_year` integer,
	`kit_type` text NOT NULL,
	`cover_key` text,
	`cover_version` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`team_id`) REFERENCES `team`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `kit_team_season_type_unique` ON `kit` (`team_id`,`season_start_year`,`kit_type`);--> statement-breakpoint
CREATE TABLE `league` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`season_format` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `picture` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`kit_id` integer NOT NULL,
	`key` text NOT NULL,
	`position` integer NOT NULL,
	FOREIGN KEY (`kit_id`) REFERENCES `kit`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `store` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `store_name_unique` ON `store` (`name`);--> statement-breakpoint
CREATE TABLE `team` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`kind` text NOT NULL,
	`country_id` integer NOT NULL,
	FOREIGN KEY (`country_id`) REFERENCES `country`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `team_name_unique` ON `team` (`name`);--> statement-breakpoint
CREATE UNIQUE INDEX `team_national_country_unique` ON `team` (`country_id`) WHERE "team"."kind" = 'national';--> statement-breakpoint
CREATE TABLE `wishlist_item` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`kit_id` integer NOT NULL,
	`version` text,
	`desire` integer NOT NULL,
	FOREIGN KEY (`kit_id`) REFERENCES `kit`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "wishlist_item_desire_range" CHECK("wishlist_item"."desire" BETWEEN 1 AND 5)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `wishlist_item_kit_id_unique` ON `wishlist_item` (`kit_id`);