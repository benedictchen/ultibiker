CREATE TABLE `devices` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`device_id` text NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`protocol` text NOT NULL,
	`is_connected` integer DEFAULT false,
	`signal_strength` integer DEFAULT 0,
	`battery_level` integer,
	`manufacturer` text,
	`model` text,
	`firmware_version` text,
	`last_seen` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)),
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)),
	`updated_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer))
);
--> statement-breakpoint
CREATE TABLE `sensor_data` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`device_id` text NOT NULL,
	`session_id` text NOT NULL,
	`timestamp` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)),
	`metric_type` text NOT NULL,
	`value` real NOT NULL,
	`unit` text NOT NULL,
	`quality` integer DEFAULT 100,
	`raw_data` text,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)),
	FOREIGN KEY (`device_id`) REFERENCES `devices`(`device_id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`session_id`) REFERENCES `sessions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text DEFAULT 'Ride Session',
	`start_time` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)),
	`end_time` integer,
	`duration` integer,
	`status` text DEFAULT 'active',
	`distance` real,
	`avg_heart_rate` real,
	`max_heart_rate` real,
	`avg_power` real,
	`max_power` real,
	`avg_cadence` real,
	`avg_speed` real,
	`max_speed` real,
	`energy_expenditure` real,
	`notes` text,
	`weather_conditions` text,
	`temperature` real,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)),
	`updated_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `devices_device_id_unique` ON `devices` (`device_id`);--> statement-breakpoint
CREATE INDEX `idx_devices_device_id` ON `devices` (`device_id`);--> statement-breakpoint
CREATE INDEX `idx_devices_type` ON `devices` (`type`);--> statement-breakpoint
CREATE INDEX `idx_devices_is_connected` ON `devices` (`is_connected`);--> statement-breakpoint
CREATE INDEX `idx_sensor_data_device_id` ON `sensor_data` (`device_id`);--> statement-breakpoint
CREATE INDEX `idx_sensor_data_session_id` ON `sensor_data` (`session_id`);--> statement-breakpoint
CREATE INDEX `idx_sensor_data_timestamp` ON `sensor_data` (`timestamp`);--> statement-breakpoint
CREATE INDEX `idx_sensor_data_metric_type` ON `sensor_data` (`metric_type`);--> statement-breakpoint
CREATE INDEX `idx_sensor_data_composite` ON `sensor_data` (`session_id`,`timestamp`,`metric_type`);--> statement-breakpoint
CREATE INDEX `idx_sessions_start_time` ON `sessions` (`start_time`);--> statement-breakpoint
CREATE INDEX `idx_sessions_status` ON `sessions` (`status`);