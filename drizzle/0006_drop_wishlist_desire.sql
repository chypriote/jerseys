PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_wishlist_item` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`kit_id` integer NOT NULL,
	`version` text,
	FOREIGN KEY (`kit_id`) REFERENCES `kit`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_wishlist_item`("id", "kit_id", "version") SELECT "id", "kit_id", "version" FROM `wishlist_item`;--> statement-breakpoint
DROP TABLE `wishlist_item`;--> statement-breakpoint
ALTER TABLE `__new_wishlist_item` RENAME TO `wishlist_item`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `wishlist_item_kit_id_unique` ON `wishlist_item` (`kit_id`);