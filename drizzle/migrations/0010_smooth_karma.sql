ALTER TABLE "companies" ALTER COLUMN "benefits" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "email" varchar(255);--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "phone" varchar(50);