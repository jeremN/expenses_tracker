CREATE TABLE `account_valuations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`account_id` integer NOT NULL,
	`date` text NOT NULL,
	`value` integer NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uniq_account_valuation_date` ON `account_valuations` (`account_id`,`date`);--> statement-breakpoint
CREATE INDEX `idx_account_valuations_date` ON `account_valuations` (`date`);--> statement-breakpoint
CREATE TABLE `accounts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`kind` text NOT NULL,
	`type` text NOT NULL,
	`valuation` text DEFAULT 'manual' NOT NULL,
	`current_value` integer DEFAULT 0 NOT NULL,
	`institution` text,
	`color` text,
	`icon` text,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_accounts_kind` ON `accounts` (`kind`);--> statement-breakpoint
CREATE INDEX `idx_accounts_type` ON `accounts` (`type`);--> statement-breakpoint
CREATE TABLE `asset_transfers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`date` text NOT NULL,
	`from_account_id` integer,
	`to_account_id` integer,
	`amount` integer NOT NULL,
	`note` text,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`from_account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`to_account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_asset_transfers_date` ON `asset_transfers` (`date`);--> statement-breakpoint
CREATE INDEX `idx_asset_transfers_from` ON `asset_transfers` (`from_account_id`);--> statement-breakpoint
CREATE INDEX `idx_asset_transfers_to` ON `asset_transfers` (`to_account_id`);--> statement-breakpoint
CREATE TABLE `holdings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`account_id` integer NOT NULL,
	`symbol` text,
	`name` text NOT NULL,
	`quantity` real,
	`cost_basis` integer,
	`market_value` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_holdings_account_id` ON `holdings` (`account_id`);--> statement-breakpoint
CREATE TABLE `net_worth_snapshots` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`date` text NOT NULL,
	`total_assets` integer NOT NULL,
	`total_liabilities` integer NOT NULL,
	`net_worth` integer NOT NULL,
	`note` text,
	`created_at` text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uniq_net_worth_date` ON `net_worth_snapshots` (`date`);