CREATE TABLE "organization_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"organization_id" uuid NOT NULL,
	"role" varchar(100) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "universities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	CONSTRAINT "universities_name_unique" UNIQUE("name")
);
--> statement-breakpoint
ALTER TABLE "user_onboardings" ADD COLUMN "experience_years" integer;--> statement-breakpoint
ALTER TABLE "user_onboardings" ADD COLUMN "experience_details" varchar(500);--> statement-breakpoint
ALTER TABLE "user_onboardings" ADD COLUMN "skills" jsonb;--> statement-breakpoint
ALTER TABLE "user_skills" ADD COLUMN "company_id" uuid;--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "founding_year" integer;--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "tax_code" varchar(100);--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "organization_culture" text;--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "benefits" text[];--> statement-breakpoint
ALTER TABLE "user_cv" ADD COLUMN "file_name" varchar(255) NOT NULL;--> statement-breakpoint
ALTER TABLE "user_cv" ADD COLUMN "mime_type" varchar(255) NOT NULL;--> statement-breakpoint
ALTER TABLE "user_cv" ADD COLUMN "file_size" bigint NOT NULL;--> statement-breakpoint
ALTER TABLE "user_cv" ADD COLUMN "last_used_at" timestamp DEFAULT now();--> statement-breakpoint
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_organization_id_companies_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_skills" ADD CONSTRAINT "user_skills_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_cv" DROP COLUMN "is_default";