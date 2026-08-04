CREATE TYPE "public"."action" AS ENUM('LIKE', 'SAVE');--> statement-breakpoint
CREATE TYPE "public"."apply_status" AS ENUM('pending', 'accepted', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."billing_cycle_subscription" AS ENUM('monthly', 'yearly');--> statement-breakpoint
CREATE TYPE "public"."blog_post_source_type" AS ENUM('USER', 'AI', 'CRAWLED');--> statement-breakpoint
CREATE TYPE "public"."blog_post_status" AS ENUM('DRAFT', 'PENDING', 'PUBLISHED', 'REJECTED');--> statement-breakpoint
CREATE TYPE "public"."education_level" AS ENUM('high_school', 'bachelor', 'master', 'phd', 'other');--> statement-breakpoint
CREATE TYPE "public"."FeatureCodeEnum" AS ENUM('learning_path', 'cv', 'suggest_cv_field', 'optimize_cv', 'save_job');--> statement-breakpoint
CREATE TYPE "public"."feedback_status" AS ENUM('pending', 'read', 'resolved');--> statement-breakpoint
CREATE TYPE "public"."feedback_type" AS ENUM('feedback', 'survey');--> statement-breakpoint
CREATE TYPE "public"."gap_difficulty" AS ENUM('easy', 'medium', 'hard');--> statement-breakpoint
CREATE TYPE "public"."gender" AS ENUM('Male', 'Female', 'Other');--> statement-breakpoint
CREATE TYPE "public"."job_status" AS ENUM('pending_approval', 'active', 'paused', 'closed', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."language" AS ENUM('vi', 'en');--> statement-breakpoint
CREATE TYPE "public"."notification_type" AS ENUM('job_posted', 'job_updated', 'job_approved', 'admin_job_approved', 'admin_job_rejected', 'job_applied', 'job_matched', 'profile_viewed', 'cv_approved', 'cv_rejected', 'organization_invitation', 'system', 'feedback_assigned', 'blog_comment', 'blog_comment_reply');--> statement-breakpoint
CREATE TYPE "public"."object_type" AS ENUM('BLOG', 'ORG');--> statement-breakpoint
CREATE TYPE "public"."organization_invite_status" AS ENUM('pending', 'accepted', 'declined');--> statement-breakpoint
CREATE TYPE "public"."organization_invite_type" AS ENUM('outgoing', 'incoming');--> statement-breakpoint
CREATE TYPE "public"."organization_role" AS ENUM('organization_owner', 'organization_admin', 'organization_viewer', 'anonymously');--> statement-breakpoint
CREATE TYPE "public"."skill_level" AS ENUM('beginner', 'intermediate', 'advanced');--> statement-breakpoint
CREATE TYPE "public"."provider" AS ENUM('email', 'google', 'facebook', 'github');--> statement-breakpoint
CREATE TYPE "public"."resource_type" AS ENUM('video', 'course', 'article', 'book', 'documentation');--> statement-breakpoint
CREATE TYPE "public"."school_type" AS ENUM('college', 'university', 'highschool', 'secondary', 'primary');--> statement-breakpoint
CREATE TYPE "public"."SubscriptionEnum" AS ENUM('FREE', 'BASIC', 'PRO', 'ENTERPRISE');--> statement-breakpoint
CREATE TYPE "public"."task_status" AS ENUM('pending', 'in_progress', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."task_type" AS ENUM('learning_path_generation', 'cv_generation');--> statement-breakpoint
CREATE TYPE "public"."cv_template" AS ENUM('classic', 'modern-blue', 'modern-green');--> statement-breakpoint
CREATE TYPE "public"."user_interaction_type" AS ENUM('save');--> statement-breakpoint
CREATE TYPE "public"."user_status" AS ENUM('active', 'banned', 'pending_deletion', 'deleted');--> statement-breakpoint
CREATE TYPE "public"."user_subscription_status" AS ENUM('incomplete', 'active', 'canceled');--> statement-breakpoint
CREATE TYPE "public"."work_type" AS ENUM('remote', 'onsite', 'hybrid');--> statement-breakpoint
CREATE TYPE "public"."organization_type" AS ENUM('company', 'school', 'nonprofit', 'university');--> statement-breakpoint
CREATE TYPE "public"."phase_status" AS ENUM('not_started', 'in_progress', 'completed');--> statement-breakpoint
CREATE TABLE "user_educations" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"school_id" uuid NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date,
	"education_level" "education_level",
	"major" varchar(255),
	"gpa" varchar(10),
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "user_experiences" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"organization_id" uuid NOT NULL,
	"position" varchar(255) NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date,
	"job_title" varchar(255) NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "user_identities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"provider" "provider" NOT NULL,
	"provider_user_id" varchar(255),
	"provider_email" varchar(255),
	"provider_name" varchar(255),
	"provider_picture" varchar(500),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "user_onboardings" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"current_goal" varchar(500),
	"experience_years" integer,
	"skills" jsonb,
	"province_ids" uuid[],
	"category_ids" uuid[],
	"expected_salary" numeric(12, 2),
	"is_seeking_job" boolean DEFAULT false NOT NULL,
	CONSTRAINT "user_onboardings_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "user_skills" (
	"user_id" uuid NOT NULL,
	"skill_id" uuid NOT NULL,
	"organization_id" uuid,
	CONSTRAINT "user_skills_user_id_skill_id_pk" PRIMARY KEY("user_id","skill_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"username" varchar(255) NOT NULL,
	"email" varchar(255),
	"email_verified" boolean DEFAULT false NOT NULL,
	"phone" varchar(20),
	"firebase_uid" varchar(255),
	"avatar_url" varchar(500),
	"banner_url" varchar(500),
	"name" varchar(255) NOT NULL,
	"roles" varchar(255)[] DEFAULT '{"USER"}' NOT NULL,
	"dob" date,
	"bio" varchar(500),
	"address" varchar(255),
	"phone_verified" boolean DEFAULT false NOT NULL,
	"gender" "gender",
	"provider" "provider" DEFAULT 'email' NOT NULL,
	"status" "user_status" DEFAULT 'active' NOT NULL,
	"deletion_requested_at" timestamp,
	"purge_after_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp,
	"deleted_at" timestamp,
	"onboarding_completed" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "companies" (
	"organization_id" uuid PRIMARY KEY NOT NULL,
	"company_size" integer,
	"culture" text,
	"tax_code" varchar(100),
	"benefits" text,
	"company_raw_id" bigint,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "company_raws" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"logo_url" varchar(500),
	"description" text,
	"address" text[],
	"employees_min" integer,
	"employees_max" integer,
	"website_url" varchar(500),
	"source" varchar(255) NOT NULL,
	"crawled_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "skills" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(255),
	"name" varchar(255) NOT NULL,
	"description" text,
	"proficiency_levels" jsonb,
	"is_approved" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp,
	"deleted_at" timestamp,
	CONSTRAINT "skills_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "apply_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_id" uuid NOT NULL,
	"status" "apply_status" DEFAULT 'pending',
	"cv_id" uuid,
	"answers" jsonb,
	"matching_score" numeric(7, 2),
	"matching_criteria" jsonb,
	"scored_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "cvs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"ai_cv_id" uuid,
	"name" varchar(255) NOT NULL,
	"file_url" varchar(500) NOT NULL,
	"file_name" varchar(255) NOT NULL,
	"mime_type" varchar(255) NOT NULL,
	"last_used_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "job_provinces" (
	"job_id" uuid NOT NULL,
	"province_id" uuid NOT NULL,
	CONSTRAINT "job_provinces_job_id_province_id_pk" PRIMARY KEY("job_id","province_id")
);
--> statement-breakpoint
CREATE TABLE "job_raws" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"url" varchar(500),
	"date_posted" date,
	"skills" text[],
	"crawled_at" timestamp DEFAULT now() NOT NULL,
	"company_id" bigint NOT NULL,
	"salary_min" numeric(12, 2),
	"salary_max" numeric(12, 2),
	"provinces" text[],
	"category" text,
	"source" varchar(255) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "job_skills" (
	"job_id" uuid NOT NULL,
	"skill_id" uuid NOT NULL,
	CONSTRAINT "job_skills_job_id_skill_id_pk" PRIMARY KEY("job_id","skill_id")
);
--> statement-breakpoint
CREATE TABLE "jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"organization_id" uuid NOT NULL,
	"date_posted" date,
	"salary_min" numeric(12, 2),
	"salary_max" numeric(12, 2),
	"experience_min" integer,
	"experience_max" integer,
	"questions" jsonb,
	"apply_url" varchar(500),
	"end_date" date,
	"status" "job_status" DEFAULT 'pending_approval' NOT NULL,
	"work_type" "work_type",
	"job_raw_id" bigint,
	"reject_reason" text,
	"category_id" uuid,
	"recruit_count" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "user_interactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"job_id" uuid NOT NULL,
	"type" "user_interaction_type" NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	CONSTRAINT "categories_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "refresh_tokens" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"token" varchar NOT NULL,
	"expires_at" timestamp NOT NULL,
	"revoked" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "provinces" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	CONSTRAINT "provinces_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "casbin_rule" (
	"id" serial PRIMARY KEY NOT NULL,
	"ptype" varchar(100),
	"v0" varchar(100),
	"v1" varchar(100),
	"v2" varchar(100),
	"v3" varchar(100),
	"v4" varchar(100),
	"v5" varchar(100)
);
--> statement-breakpoint
CREATE TABLE "organization_invitations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"actor_id" uuid NOT NULL,
	"receiver_id" uuid,
	"role" "organization_role" NOT NULL,
	"type" "organization_invite_type" NOT NULL,
	"status" "organization_invite_status" NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "organization_locations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"address" text NOT NULL,
	"province_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "organization_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"organization_id" uuid NOT NULL,
	"role" "organization_role" NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"slug" varchar(255) NOT NULL,
	"type" "organization_type" NOT NULL,
	"description" text,
	"address" text[],
	"logo_url" varchar(500),
	"about" text,
	"website_url" varchar(500),
	"email" varchar(255),
	"phone" varchar(20),
	"founded_year" integer,
	"verified_at" timestamp,
	"employees_min" integer,
	"employees_max" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp,
	"deleted_at" timestamp,
	CONSTRAINT "organizations_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "schools" (
	"organization_id" uuid PRIMARY KEY NOT NULL,
	"school_type" "school_type" NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sender_id" uuid,
	"title" varchar NOT NULL,
	"message" varchar(500) NOT NULL,
	"type" "notification_type" NOT NULL,
	"payload" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "user_notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"notification_id" uuid NOT NULL,
	"receiver_id" uuid NOT NULL,
	"organization_id" uuid,
	"read_at" timestamp,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "feedbacks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"status" "feedback_status" DEFAULT 'pending' NOT NULL,
	"type" "feedback_type" DEFAULT 'feedback' NOT NULL,
	"user_id" uuid,
	"assigned_to_user_id" uuid,
	"name" varchar(255) NOT NULL,
	"email" varchar(255),
	"subject" varchar(500) NOT NULL,
	"message" text NOT NULL,
	"images" text[],
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "learning_roadmaps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"title" varchar(500) NOT NULL,
	"current_role" varchar(255),
	"target_role" varchar(255) NOT NULL,
	"time_commitment_hours_per_week" integer NOT NULL,
	"current_skills" jsonb,
	"total_weeks" integer NOT NULL,
	"gap_analysis" jsonb NOT NULL,
	"generated_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp,
	"start_date" timestamp,
	"overall_progress" numeric(5, 2) DEFAULT '0' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "roadmap_phases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"roadmap_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text NOT NULL,
	"duration_weeks" integer NOT NULL,
	"order_index" integer NOT NULL,
	"progress" numeric(5, 2) DEFAULT '0' NOT NULL,
	"status" "phase_status" DEFAULT 'not_started' NOT NULL,
	"started_at" timestamp,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "roadmap_skill_options" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"roadmap_skill_id" uuid NOT NULL,
	"option_id" varchar(255) NOT NULL,
	"resources" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"key_concepts" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "roadmap_skills" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"phase_id" uuid NOT NULL,
	"skill" varchar(500) NOT NULL,
	"description" text NOT NULL,
	"week_start" integer NOT NULL,
	"week_end" integer NOT NULL,
	"order_index" integer NOT NULL,
	"prerequisites" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "skill_notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"roadmap_skill_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"content" text DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "weekly_progress" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"roadmap_id" uuid NOT NULL,
	"week_number" integer NOT NULL,
	"hours_spent" numeric(5, 2) DEFAULT '0' NOT NULL,
	"skills_completed_this_week" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "ai_cvs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"title" varchar(255) NOT NULL,
	"target_job_title" varchar(255),
	"cv_data" jsonb NOT NULL,
	"ats_score" integer,
	"matching_skills" text[],
	"missing_skills" text[],
	"recommendation" text,
	"job_description" text,
	"original_cv_filename" varchar(255),
	"language" "language" DEFAULT 'vi' NOT NULL,
	"is_favorite" boolean DEFAULT false NOT NULL,
	"template" "cv_template" DEFAULT 'classic' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "areas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "questions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"skill_id" uuid NOT NULL,
	"question_text" text NOT NULL,
	"options" jsonb NOT NULL,
	"correct_answer" varchar(255) NOT NULL,
	"difficulty_levels" jsonb NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "user_tests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"selected_skill_ids" jsonb NOT NULL,
	"selected_difficulty_levels" jsonb,
	"question_ids" jsonb,
	"total_score" integer,
	"skill_levels_assessed" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_answers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_test_id" uuid NOT NULL,
	"question_id" uuid NOT NULL,
	"chosen_answer" varchar(255) NOT NULL,
	"is_correct" boolean NOT NULL,
	"point_gained" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "features" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"code" "FeatureCodeEnum" NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "subscription_features" (
	"subscription_id" uuid NOT NULL,
	"feature_id" bigserial NOT NULL,
	"limit" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "subscription_features_subscription_id_feature_id_pk" PRIMARY KEY("subscription_id","feature_id")
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" "SubscriptionEnum" NOT NULL,
	"price" numeric(12, 2) NOT NULL,
	"billing_cycle" "billing_cycle_subscription" DEFAULT 'monthly' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "user_feature_usages" (
	"user_id" uuid NOT NULL,
	"feature_id" bigserial NOT NULL,
	"usage" integer DEFAULT 0 NOT NULL,
	"last_refill_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp,
	"deleted_at" timestamp,
	CONSTRAINT "user_feature_usages_user_id_feature_id_pk" PRIMARY KEY("user_id","feature_id")
);
--> statement-breakpoint
CREATE TABLE "user_subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"subscription_id" uuid NOT NULL,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"expired_at" timestamp,
	"status" "user_subscription_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"input" jsonb NOT NULL,
	"result" jsonb,
	"error" text,
	"status" "task_status" DEFAULT 'pending' NOT NULL,
	"type" "task_type" NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "skills_synonyms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"master_skill_id" uuid NOT NULL,
	"alias_name" varchar(255) NOT NULL,
	CONSTRAINT "unique_alias_source_idx" UNIQUE("master_skill_id","alias_name")
);
--> statement-breakpoint
CREATE TABLE "comments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"content" text NOT NULL,
	"author_id" uuid NOT NULL,
	"parent_comment_id" uuid,
	"root_comment_id" uuid,
	"object_id" uuid NOT NULL,
	"object_type" "object_type" NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "user_actions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"object_id" uuid NOT NULL,
	"object_type" "object_type" NOT NULL,
	"user_id" uuid NOT NULL,
	"type" "action" NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "blog_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(50) NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp,
	"deleted_at" timestamp,
	CONSTRAINT "blog_categories_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "blog_post_tags" (
	"post_id" uuid NOT NULL,
	"tag_id" uuid,
	"skill_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "blog_posts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar(255) NOT NULL,
	"slug" varchar(255) NOT NULL,
	"summary" text NOT NULL,
	"thumbnail" varchar(255),
	"content" text NOT NULL,
	"status" "blog_post_status" DEFAULT 'DRAFT' NOT NULL,
	"source_type" "blog_post_source_type" DEFAULT 'USER' NOT NULL,
	"source" jsonb,
	"category_id" uuid NOT NULL,
	"author_id" uuid,
	"view_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp,
	"deleted_at" timestamp,
	CONSTRAINT "blog_posts_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"slug" varchar(100) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp,
	"deleted_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "user_educations" ADD CONSTRAINT "user_educations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_educations" ADD CONSTRAINT "user_educations_school_id_organizations_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_experiences" ADD CONSTRAINT "user_experiences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_experiences" ADD CONSTRAINT "user_experiences_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_identities" ADD CONSTRAINT "user_identities_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_onboardings" ADD CONSTRAINT "user_onboardings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_skills" ADD CONSTRAINT "user_skills_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_skills" ADD CONSTRAINT "user_skills_skill_id_skills_id_fk" FOREIGN KEY ("skill_id") REFERENCES "public"."skills"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_skills" ADD CONSTRAINT "user_skills_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "companies" ADD CONSTRAINT "companies_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "companies" ADD CONSTRAINT "companies_company_raw_id_company_raws_id_fk" FOREIGN KEY ("company_raw_id") REFERENCES "public"."company_raws"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "apply_jobs" ADD CONSTRAINT "apply_jobs_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "apply_jobs" ADD CONSTRAINT "apply_jobs_cv_id_cvs_id_fk" FOREIGN KEY ("cv_id") REFERENCES "public"."cvs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cvs" ADD CONSTRAINT "cvs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cvs" ADD CONSTRAINT "cvs_ai_cv_id_ai_cvs_id_fk" FOREIGN KEY ("ai_cv_id") REFERENCES "public"."ai_cvs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_provinces" ADD CONSTRAINT "job_provinces_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_provinces" ADD CONSTRAINT "job_provinces_province_id_provinces_id_fk" FOREIGN KEY ("province_id") REFERENCES "public"."provinces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_raws" ADD CONSTRAINT "job_raws_company_id_company_raws_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."company_raws"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_skills" ADD CONSTRAINT "job_skills_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_skills" ADD CONSTRAINT "job_skills_skill_id_skills_id_fk" FOREIGN KEY ("skill_id") REFERENCES "public"."skills"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_job_raw_id_job_raws_id_fk" FOREIGN KEY ("job_raw_id") REFERENCES "public"."job_raws"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_interactions" ADD CONSTRAINT "user_interactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_interactions" ADD CONSTRAINT "user_interactions_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_invitations" ADD CONSTRAINT "organization_invitations_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_invitations" ADD CONSTRAINT "organization_invitations_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_invitations" ADD CONSTRAINT "organization_invitations_receiver_id_users_id_fk" FOREIGN KEY ("receiver_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_locations" ADD CONSTRAINT "organization_locations_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_locations" ADD CONSTRAINT "organization_locations_province_id_provinces_id_fk" FOREIGN KEY ("province_id") REFERENCES "public"."provinces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schools" ADD CONSTRAINT "schools_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_sender_id_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_notifications" ADD CONSTRAINT "user_notifications_notification_id_notifications_id_fk" FOREIGN KEY ("notification_id") REFERENCES "public"."notifications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_notifications" ADD CONSTRAINT "user_notifications_receiver_id_users_id_fk" FOREIGN KEY ("receiver_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_notifications" ADD CONSTRAINT "user_notifications_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedbacks" ADD CONSTRAINT "feedbacks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedbacks" ADD CONSTRAINT "feedbacks_assigned_to_user_id_users_id_fk" FOREIGN KEY ("assigned_to_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learning_roadmaps" ADD CONSTRAINT "learning_roadmaps_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "roadmap_phases" ADD CONSTRAINT "roadmap_phases_roadmap_id_learning_roadmaps_id_fk" FOREIGN KEY ("roadmap_id") REFERENCES "public"."learning_roadmaps"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "roadmap_skill_options" ADD CONSTRAINT "roadmap_skill_options_roadmap_skill_id_roadmap_skills_id_fk" FOREIGN KEY ("roadmap_skill_id") REFERENCES "public"."roadmap_skills"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "roadmap_skills" ADD CONSTRAINT "roadmap_skills_phase_id_roadmap_phases_id_fk" FOREIGN KEY ("phase_id") REFERENCES "public"."roadmap_phases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "skill_notes" ADD CONSTRAINT "skill_notes_roadmap_skill_id_roadmap_skills_id_fk" FOREIGN KEY ("roadmap_skill_id") REFERENCES "public"."roadmap_skills"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "skill_notes" ADD CONSTRAINT "skill_notes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "weekly_progress" ADD CONSTRAINT "weekly_progress_roadmap_id_learning_roadmaps_id_fk" FOREIGN KEY ("roadmap_id") REFERENCES "public"."learning_roadmaps"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_cvs" ADD CONSTRAINT "ai_cvs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "questions" ADD CONSTRAINT "questions_skill_id_skills_id_fk" FOREIGN KEY ("skill_id") REFERENCES "public"."skills"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_tests" ADD CONSTRAINT "user_tests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_answers" ADD CONSTRAINT "user_answers_user_test_id_user_tests_id_fk" FOREIGN KEY ("user_test_id") REFERENCES "public"."user_tests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_answers" ADD CONSTRAINT "user_answers_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription_features" ADD CONSTRAINT "subscription_features_subscription_id_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."subscriptions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription_features" ADD CONSTRAINT "subscription_features_feature_id_features_id_fk" FOREIGN KEY ("feature_id") REFERENCES "public"."features"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_feature_usages" ADD CONSTRAINT "user_feature_usages_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_feature_usages" ADD CONSTRAINT "user_feature_usages_feature_id_features_id_fk" FOREIGN KEY ("feature_id") REFERENCES "public"."features"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_subscriptions" ADD CONSTRAINT "user_subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_subscriptions" ADD CONSTRAINT "user_subscriptions_subscription_id_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."subscriptions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "skills_synonyms" ADD CONSTRAINT "skills_synonyms_master_skill_id_skills_id_fk" FOREIGN KEY ("master_skill_id") REFERENCES "public"."skills"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_parent_comment_id_comments_id_fk" FOREIGN KEY ("parent_comment_id") REFERENCES "public"."comments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_root_comment_id_comments_id_fk" FOREIGN KEY ("root_comment_id") REFERENCES "public"."comments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_actions" ADD CONSTRAINT "user_actions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blog_post_tags" ADD CONSTRAINT "blog_post_tags_post_id_blog_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."blog_posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blog_post_tags" ADD CONSTRAINT "blog_post_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blog_post_tags" ADD CONSTRAINT "blog_post_tags_skill_id_skills_id_fk" FOREIGN KEY ("skill_id") REFERENCES "public"."skills"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blog_posts" ADD CONSTRAINT "blog_posts_category_id_blog_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."blog_categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blog_posts" ADD CONSTRAINT "blog_posts_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_user_educations_user_deleted_start" ON "user_educations" USING btree ("user_id","deleted_at","start_date" DESC);--> statement-breakpoint
CREATE INDEX "idx_user_educations_school_deleted" ON "user_educations" USING btree ("school_id","deleted_at");--> statement-breakpoint
CREATE INDEX "idx_user_experiences_user_deleted_start" ON "user_experiences" USING btree ("user_id","deleted_at","start_date" DESC);--> statement-breakpoint
CREATE INDEX "idx_user_experiences_org_deleted" ON "user_experiences" USING btree ("organization_id","deleted_at");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_user_identities_active" ON "user_identities" USING btree ("user_id","provider") WHERE "user_identities"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "idx_user_identities_user_provider_deleted" ON "user_identities" USING btree ("user_id","provider","deleted_at");--> statement-breakpoint
CREATE INDEX "idx_user_onboardings_skills_gin" ON "user_onboardings" USING gin ("skills");--> statement-breakpoint
CREATE INDEX "idx_user_onboardings_province_ids_gin" ON "user_onboardings" USING gin ("province_ids");--> statement-breakpoint
CREATE INDEX "idx_user_onboardings_category_ids_gin" ON "user_onboardings" USING gin ("category_ids");--> statement-breakpoint
CREATE INDEX "idx_user_skills_user_id" ON "user_skills" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_user_skills_skill_id" ON "user_skills" USING btree ("skill_id");--> statement-breakpoint
CREATE INDEX "idx_user_skills_org_id" ON "user_skills" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_users_email" ON "users" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_users_firebase_uid" ON "users" USING btree ("firebase_uid");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_users_phone" ON "users" USING btree ("phone");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_users_username" ON "users" USING btree ("username");--> statement-breakpoint
CREATE INDEX "idx_users_status_deleted_created" ON "users" USING btree ("status","deleted_at","created_at" DESC);--> statement-breakpoint
CREATE INDEX "idx_users_status_purge_after" ON "users" USING btree ("status","purge_after_at");--> statement-breakpoint
CREATE INDEX "idx_users_roles_gin" ON "users" USING gin ("roles");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_apply_jobs_cv_job" ON "apply_jobs" USING btree ("cv_id","job_id");--> statement-breakpoint
CREATE INDEX "idx_apply_jobs_job_id_created" ON "apply_jobs" USING btree ("job_id","created_at" desc);--> statement-breakpoint
CREATE INDEX "idx_job_provinces_job_id" ON "job_provinces" USING btree ("job_id");--> statement-breakpoint
CREATE INDEX "idx_job_provinces_province_job" ON "job_provinces" USING btree ("province_id","job_id");--> statement-breakpoint
CREATE INDEX "idx_job_skills_job_id" ON "job_skills" USING btree ("job_id");--> statement-breakpoint
CREATE INDEX "idx_job_skills_skill" ON "job_skills" USING btree ("skill_id");--> statement-breakpoint
CREATE INDEX "idx_jobs_deleted_id" ON "jobs" USING btree ("deleted_at","id");--> statement-breakpoint
CREATE INDEX "idx_jobs_organization_id_deleted" ON "jobs" USING btree ("organization_id","deleted_at");--> statement-breakpoint
CREATE INDEX "idx_jobs_category_id_deleted" ON "jobs" USING btree ("category_id","deleted_at") WHERE "jobs"."deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "idx_jobs_status_deleted" ON "jobs" USING btree ("status","deleted_at");--> statement-breakpoint
CREATE INDEX "idx_jobs_work_type_deleted" ON "jobs" USING btree ("work_type","deleted_at") WHERE "jobs"."deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "idx_jobs_date_posted" ON "jobs" USING btree ("date_posted") WHERE "jobs"."date_posted" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "idx_jobs_end_date_deleted" ON "jobs" USING btree ("end_date","deleted_at") WHERE "jobs"."end_date" IS NOT NULL AND "jobs"."deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "idx_jobs_job_raw_id" ON "jobs" USING btree ("job_raw_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_user_interactions_user_job_type" ON "user_interactions" USING btree ("user_id","job_id","type");--> statement-breakpoint
CREATE INDEX "idx_user_interactions_user_type_created" ON "user_interactions" USING btree ("user_id","type","created_at" desc);--> statement-breakpoint
CREATE INDEX "idx_user_interactions_job_type_created" ON "user_interactions" USING btree ("job_id","type","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_refresh_tokens_token" ON "refresh_tokens" USING btree ("token");--> statement-breakpoint
CREATE INDEX "idx_refresh_tokens_user" ON "refresh_tokens" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_org_invitation_org" ON "organization_invitations" USING btree ("organization_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_org_location_org" ON "organization_locations" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_org_location_province" ON "organization_locations" USING btree ("province_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_org_member_unique" ON "organization_members" USING btree ("user_id","organization_id");--> statement-breakpoint
CREATE INDEX "idx_org_member_org" ON "organization_members" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_org_member_user" ON "organization_members" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_org_member_org_role" ON "organization_members" USING btree ("organization_id","role");--> statement-breakpoint
CREATE INDEX "idx_user_notifications_receiver_deleted" ON "user_notifications" USING btree ("receiver_id","deleted_at");--> statement-breakpoint
CREATE INDEX "idx_user_notifications_receiver_org_deleted" ON "user_notifications" USING btree ("receiver_id","organization_id","deleted_at");--> statement-breakpoint
CREATE INDEX "idx_user_notifications_notification" ON "user_notifications" USING btree ("notification_id");--> statement-breakpoint
CREATE INDEX "idx_feedbacks_assigned_created" ON "feedbacks" USING btree ("assigned_to_user_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_feedbacks_active" ON "feedbacks" USING btree ("assigned_to_user_id","status","created_at" DESC NULLS LAST) WHERE deleted_at IS NULL;--> statement-breakpoint
CREATE INDEX "idx_feedbacks_created_at" ON "feedbacks" USING btree ("created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_feedbacks_user_survey_key" ON "feedbacks" USING btree ("user_id",(metadata->>'surveyKey'));--> statement-breakpoint
CREATE INDEX "idx_learning_roadmaps_user_deleted_created" ON "learning_roadmaps" USING btree ("user_id","deleted_at","created_at" desc);--> statement-breakpoint
CREATE INDEX "idx_roadmap_phases_roadmap_deleted_order" ON "roadmap_phases" USING btree ("roadmap_id","deleted_at","order_index");--> statement-breakpoint
CREATE INDEX "idx_roadmap_skill_options_skill_deleted" ON "roadmap_skill_options" USING btree ("roadmap_skill_id","deleted_at");--> statement-breakpoint
CREATE INDEX "idx_roadmap_skill_options_completed" ON "roadmap_skill_options" USING btree ("completed_at") WHERE "roadmap_skill_options"."completed_at" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "idx_roadmap_skills_phase_deleted_order" ON "roadmap_skills" USING btree ("phase_id","deleted_at","order_index");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_skill_notes_skill_user" ON "skill_notes" USING btree ("roadmap_skill_id","user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_weekly_progress_roadmap_week" ON "weekly_progress" USING btree ("roadmap_id","week_number");--> statement-breakpoint
CREATE INDEX "idx_ai_cvs_user_created" ON "ai_cvs" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_ai_cvs_user_favorite_created" ON "ai_cvs" USING btree ("user_id","is_favorite","created_at");--> statement-breakpoint
CREATE INDEX "idx_user_tests_user_created" ON "user_tests" USING btree ("user_id","created_at" DESC);--> statement-breakpoint
CREATE INDEX "idx_user_answers_user_test" ON "user_answers" USING btree ("user_test_id");--> statement-breakpoint
CREATE INDEX "idx_user_answers_question" ON "user_answers" USING btree ("question_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_user_answers_user_test_question_unique" ON "user_answers" USING btree ("user_test_id","question_id");--> statement-breakpoint
CREATE UNIQUE INDEX "features_code_unique" ON "features" USING btree ("code");--> statement-breakpoint
CREATE UNIQUE INDEX "features_code_name" ON "subscriptions" USING btree ("code");--> statement-breakpoint
CREATE INDEX "user_feature_usages_feature_idx" ON "user_feature_usages" USING btree ("feature_id");--> statement-breakpoint
CREATE UNIQUE INDEX "unique_active_subscription_per_user" ON "user_subscriptions" USING btree ("user_id") WHERE "user_subscriptions"."status"::text = 'active';--> statement-breakpoint
CREATE INDEX "user_subscriptions_user_status_idx" ON "user_subscriptions" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "user_subscriptions_user_idx" ON "user_subscriptions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_subscriptions_subscription_idx" ON "user_subscriptions" USING btree ("subscription_id");--> statement-breakpoint
CREATE INDEX "idx_tasks_type_status" ON "tasks" USING btree ("type","status");--> statement-breakpoint
CREATE INDEX "idx_tasks_user_id" ON "tasks" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_comments_object_user" ON "comments" USING btree ("object_type","object_id","author_id");--> statement-breakpoint
CREATE INDEX "idx_created_at" ON "comments" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_user_actions_unique" ON "user_actions" USING btree ("object_type","object_id","user_id","type");--> statement-breakpoint
CREATE INDEX "idx_user_actions_object" ON "user_actions" USING btree ("object_type","object_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_blog_post_tags_post_tag_unique" ON "blog_post_tags" USING btree ("post_id","tag_id") WHERE "blog_post_tags"."tag_id" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_blog_post_tags_post_skill_unique" ON "blog_post_tags" USING btree ("post_id","skill_id") WHERE "blog_post_tags"."skill_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "idx_blog_post_tags_post_id" ON "blog_post_tags" USING btree ("post_id");--> statement-breakpoint
CREATE INDEX "idx_blog_post_tags_tag_id" ON "blog_post_tags" USING btree ("tag_id");--> statement-breakpoint
CREATE INDEX "idx_blog_post_tags_skill_id" ON "blog_post_tags" USING btree ("skill_id");--> statement-breakpoint
CREATE INDEX "idx_blog_posts_status" ON "blog_posts" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_blog_posts_source_type" ON "blog_posts" USING btree ("source_type");--> statement-breakpoint
CREATE INDEX "idx_blog_posts_category" ON "blog_posts" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "idx_blog_posts_author" ON "blog_posts" USING btree ("author_id");--> statement-breakpoint
CREATE INDEX "idx_blog_posts_created_at" ON "blog_posts" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_tags_name_unique" ON "tags" USING btree ("name");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_tags_slug_unique" ON "tags" USING btree ("slug");
