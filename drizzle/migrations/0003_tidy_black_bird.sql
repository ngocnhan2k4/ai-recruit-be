ALTER TABLE "jobs" ADD COLUMN "salary_min" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "salary_max" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "jobs" DROP COLUMN "salary_range";