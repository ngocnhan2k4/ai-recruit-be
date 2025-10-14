ALTER TABLE "companies" ADD COLUMN "company_raw_id" bigint;--> statement-breakpoint
ALTER TABLE "company_raws" ADD COLUMN "employees_min" integer;--> statement-breakpoint
ALTER TABLE "company_raws" ADD COLUMN "employees_max" integer;--> statement-breakpoint
ALTER TABLE "job_raws" ADD COLUMN "salary_min" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "job_raws" ADD COLUMN "salary_max" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "job_raws" ADD COLUMN "provinces" text[];--> statement-breakpoint
ALTER TABLE "job_raws" ADD COLUMN "category" text;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "job_raw_id" bigint;--> statement-breakpoint
ALTER TABLE "user_cv" ADD COLUMN "name" varchar(255) NOT NULL;--> statement-breakpoint
ALTER TABLE "companies" ADD CONSTRAINT "companies_company_raw_id_company_raws_id_fk" FOREIGN KEY ("company_raw_id") REFERENCES "public"."company_raws"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_job_raw_id_job_raws_id_fk" FOREIGN KEY ("job_raw_id") REFERENCES "public"."job_raws"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_raws" DROP COLUMN "employees";--> statement-breakpoint
ALTER TABLE "job_raws" DROP COLUMN "salary_range";--> statement-breakpoint
ALTER TABLE "jobs" DROP COLUMN "apply_type";--> statement-breakpoint
ALTER TABLE "jobs" DROP COLUMN "apply_url";