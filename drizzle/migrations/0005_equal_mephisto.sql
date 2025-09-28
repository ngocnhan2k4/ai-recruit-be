CREATE TABLE "provinces" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	CONSTRAINT "provinces_name_unique" UNIQUE("name")
);
--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "date_posted" date;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "experience_min" integer;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "experience_max" integer;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "province_id" uuid;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "end_date" date;--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_province_id_provinces_id_fk" FOREIGN KEY ("province_id") REFERENCES "public"."provinces"("id") ON DELETE no action ON UPDATE no action;