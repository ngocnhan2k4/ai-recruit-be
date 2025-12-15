// --- ENUMS ---

Enum apply_status {
  pending
  accepted
  rejected
}

Enum education_level {
  high_school
  bachelor
  master
  phd
  other
}

Enum gender {
  Male
  Female
  Other
}

Enum provider {
  email
  google
  facebook
  github
}

Enum school_type {
  college
  university
  highschool
  secondary
  primary
}

Enum user_status {
  active
  inactive
  banned
}

Enum work_type {
  remote
  onsite
  hybrid
}

Enum organization_type {
  company
  school
  nonprofit
  university
}

Enum user_interaction_type {
  save
  hide
}

Enum organization_role {
  organization_owner
  organization_admin
  organization_editor
  organization_viewer
  organization_content_admin
  organization_content_editor
  organization_content_viewer
  organization_recruiter_admin
  organization_recruiter_editor
  organization_recruiter_viewer
  organization_analyst_admin
  organization_analyst_editor
  organization_analyst_viewer
  organization_employee
  anonymously
}

Enum organization_invite_status {
  pending
  accepted
  declined
}

Enum organization_invite_type {
  outgoing
  incoming
}

Enum feedback_status {
  pending
  read
  resolved
}

Enum notification_type {
  job_posted
  job_approved
  admin_job_approved
  admin_job_rejected
  job_applied
  job_matched
  profile_viewed
  cv_approved
  cv_rejected
  organization_invitation
  system
}

Enum gap_difficulty {
  easy
  medium
  hard
}

Enum skill_level {
  beginner
  intermediate
  advanced
}

Enum resource_type {
  video
  course
  article
  book
  documentation
}

Enum language {
  vi
  en
}

// FIXED: Added quotes for values with hyphens
Enum cv_template {
  classic
  "modern-blue"
  "modern-green"
}

Enum job_status {
  pending_approval
  active
  paused
  closed
  rejected
}

// --- TABLES ---

Table ai_cvs {
  id uuid [pk, default: `gen_random_uuid()`]
  user_id uuid [not null]
  title varchar(255) [not null]
  target_job_title varchar(255)
  cv_data jsonb [not null]
  ats_score integer
  matching_skills text[]
  missing_skills text[]
  recommendation text
  job_description text
  original_cv_filename varchar(255)
  language language [default: 'vi', not null]
  is_favorite boolean [default: false, not null]
  created_at timestamp [default: `now()`, not null]
  updated_at timestamp
  deleted_at timestamp
  template cv_template [default: 'classic', not null]
}

Table apply_jobs {
  id uuid [pk, default: `gen_random_uuid()`]
  job_id uuid [not null]
  status apply_status [default: 'pending']
  cv_id uuid
  answers jsonb
  created_at timestamp [default: `now()`, not null]
  updated_at timestamp
  deleted_at timestamp
}

Table areas {
  id uuid [pk, default: `gen_random_uuid()`]
  name varchar(255) [not null]
  description text
  created_at timestamp [default: `now()`, not null]
  updated_at timestamp
  deleted_at timestamp
}

Table casbin_rule {
  id serial [pk]
  ptype varchar(100)
  v0 varchar(100)
  v1 varchar(100)
  v2 varchar(100)
  v3 varchar(100)
  v4 varchar(100)
  v5 varchar(100)
}

Table categories {
  id uuid [pk, default: `gen_random_uuid()`]
  name varchar(255) [not null, unique]
}

Table companies {
  organization_id uuid [pk]
  company_size integer
  tax_code varchar(100)
  benefits text
  company_raw_id bigint
  created_at timestamp [default: `now()`, not null]
  updated_at timestamp
  deleted_at timestamp
  culture text
}

Table company_raws {
  id bigserial [pk]
  name varchar(255) [not null]
  logo_url varchar(500)
  description text
  address text[]
  employees_min integer
  employees_max integer
  website_url varchar(500)
  source varchar(255) [not null]
  crawled_at timestamp [default: `now()`, not null]
}

Table cvs {
  id uuid [pk, default: `gen_random_uuid()`]
  user_id uuid [not null]
  name varchar(255) [not null]
  file_url varchar(500) [not null]
  file_name varchar(255) [not null]
  mime_type varchar(255) [not null]
  last_used_at timestamp [default: `now()`]
  created_at timestamp [default: `now()`, not null]
  updated_at timestamp
  deleted_at timestamp
}

Table feedbacks {
  id uuid [pk, default: `gen_random_uuid()`]
  status feedback_status [default: 'pending', not null]
  user_id uuid
  name varchar(255) [not null]
  subject varchar(500) [not null]
  message text [not null]
  images text[]
  created_at timestamp [default: `now()`, not null]
  updated_at timestamp
  deleted_at timestamp
}

Table import_logs {
  id uuid [pk, default: `gen_random_uuid()`]
  file_name varchar(255) [not null]
  total_rows integer [not null]
  success_rows integer [not null]
  failed_rows integer [not null]
  created_at timestamp [default: `now()`, not null]
}

Table job_provinces {
  job_id uuid
  province_id uuid
  
  indexes {
    (job_id, province_id) [pk]
  }
}

Table job_raws {
  id bigserial [pk]
  title varchar(255) [not null]
  description text
  url varchar(500)
  date_posted date
  skills text[]
  crawled_at timestamp [default: `now()`, not null]
  company_id bigint [not null]
  salary_min numeric(12, 2)
  salary_max numeric(12, 2)
  provinces text[]
  category text
  source varchar(255) [not null]
}

Table job_skills {
  job_id uuid
  skill_id uuid
  
  indexes {
    (job_id, skill_id) [pk]
  }
}

Table jobs {
  id uuid [pk, default: `gen_random_uuid()`]
  title varchar(255) [not null]
  description json
  organization_id uuid [not null]
  date_posted date
  salary_min numeric(12, 2)
  salary_max numeric(12, 2)
  experience_min integer
  experience_max integer
  questions jsonb
  end_date date
  status job_status [default: 'pending_approval', not null]
  work_type work_type
  job_raw_id bigint
  reject_reason text
  created_at timestamp [default: `now()`, not null]
  updated_at timestamp
  deleted_at timestamp
  category_id uuid
}

Table learning_roadmaps {
  id uuid [pk, default: `gen_random_uuid()`]
  user_id uuid [not null]
  title varchar(500) [not null]
  current_role varchar(255)
  target_role varchar(255) [not null]
  time_commitment_hours_per_week integer [not null]
  current_skills jsonb
  total_weeks integer [not null]
  gap_analysis jsonb [not null]
  generated_at timestamp [default: `now()`, not null]
  completed_at timestamp
  overall_progress numeric(5, 2) [default: 0, not null]
  created_at timestamp [default: `now()`, not null]
  updated_at timestamp
  deleted_at timestamp
}

Table levels {
  id uuid [pk, default: `gen_random_uuid()`]
  area_id uuid [not null]
  level_name varchar(100) [not null]
  min_score integer [not null]
  max_score integer [not null]
  created_at timestamp [default: `now()`, not null]
  updated_at timestamp
  deleted_at timestamp
}

Table notifications {
  id uuid [pk, default: `gen_random_uuid()`]
  sender_id uuid
  title varchar [not null]
  message varchar(500) [not null]
  type notification_type [not null]
  payload jsonb
  created_at timestamp [default: `now()`, not null]
  updated_at timestamp
}

Table organization_invitations {
  id uuid [pk, default: `gen_random_uuid()`]
  organization_id uuid [not null]
  actor_id uuid [not null]
  receiver_id uuid
  role organization_role [not null]
  status organization_invite_status [not null]
  expires_at timestamp [not null]
  created_at timestamp [default: `now()`, not null]
  updated_at timestamp
  deleted_at timestamp
  type organization_invite_type [not null]
}

Table organization_locations {
  id uuid [pk, default: `gen_random_uuid()`]
  organization_id uuid [not null]
  address text [not null]
  province_id uuid
  created_at timestamp [default: `now()`, not null]
  updated_at timestamp
  deleted_at timestamp
}

Table organization_members {
  id uuid [pk, default: `gen_random_uuid()`]
  user_id uuid [not null]
  organization_id uuid [not null]
  role organization_role [not null]
  created_at timestamp [default: `now()`, not null]
  updated_at timestamp
  deleted_at timestamp
}

Table organizations {
  id uuid [pk, default: `gen_random_uuid()`]
  name varchar(255) [not null]
  slug varchar(255) [not null, unique]
  type organization_type [not null]
  description text
  address text[]
  logo_url varchar(500)
  about text
  website_url varchar(500)
  email varchar(255)
  phone varchar(20)
  founded_year integer
  verified_at timestamp
  employees_min integer
  employees_max integer
  created_at timestamp [default: `now()`, not null]
  updated_at timestamp
  deleted_at timestamp
}

Table provinces {
  id uuid [pk, default: `gen_random_uuid()`]
  name varchar(255) [not null, unique]
}

Table questions {
  id uuid [pk, default: `gen_random_uuid()`]
  skill_id uuid [not null]
  question_text text [not null]
  options jsonb [not null]
  correct_answer varchar(255) [not null]
  point integer [default: 1, not null]
  difficulty_levels jsonb [not null]
  is_active boolean [default: true, not null]
  created_at timestamp [default: `now()`, not null]
  updated_at timestamp
  deleted_at timestamp
}

Table refresh_tokens {
  id serial [pk]
  user_id uuid [not null]
  token varchar [not null]
  expires_at timestamp [not null]
  revoked boolean [default: false, not null]
  created_at timestamp [default: `now()`, not null]
}

Table roadmap_phases {
  id uuid [pk, default: `gen_random_uuid()`]
  roadmap_id uuid [not null]
  name varchar(255) [not null]
  description text [not null]
  duration_weeks integer [not null]
  order_index integer [not null]
  completed_at timestamp
  created_at timestamp [default: `now()`, not null]
  updated_at timestamp
  deleted_at timestamp
}

Table roadmap_skill_options {
  id uuid [pk, default: `gen_random_uuid()`]
  roadmap_skill_id uuid [not null]
  option_id varchar(255) [not null]
  resources jsonb [default: '[]', not null]
  key_concepts jsonb [default: '[]', not null]
  is_selected boolean [default: false, not null]
  completed_at timestamp
  created_at timestamp [default: `now()`, not null]
  updated_at timestamp
  deleted_at timestamp
}

Table roadmap_skills {
  id uuid [pk, default: `gen_random_uuid()`]
  phase_id uuid [not null]
  week_start integer [not null]
  week_end integer [not null]
  prerequisites jsonb [default: '[]', not null]
  order_index integer [not null]
  created_at timestamp [default: `now()`, not null]
  updated_at timestamp
  deleted_at timestamp
  skill varchar(500) [not null]
  description text [not null]
}

Table schools {
  organization_id uuid [pk]
  school_type school_type [not null]
  created_at timestamp [default: `now()`, not null]
  updated_at timestamp
  deleted_at timestamp
}

Table skills {
  id uuid [pk, default: `gen_random_uuid()`]
  name varchar(255) [not null]
  slug varchar(255) [unique]
  description text
  proficiency_levels jsonb
  created_at timestamp [default: `now()`, not null]
  updated_at timestamp
  deleted_at timestamp
}

Table user_answers {
  id uuid [pk, default: `gen_random_uuid()`]
  user_test_id uuid [not null]
  question_id uuid [not null]
  chosen_answer varchar(255) [not null]
  is_correct boolean [not null]
  point_gained integer [default: 0, not null]
  created_at timestamp [default: `now()`, not null]
}

Table user_educations {
  id bigserial [pk]
  user_id uuid [not null]
  school_id uuid [not null]
  start_date date [not null]
  end_date date
  education_level education_level
  major varchar(255)
  gpa varchar(10)
  description text
  created_at timestamp [default: `now()`, not null]
  updated_at timestamp
  deleted_at timestamp
}

Table user_experiences {
  id bigserial [pk]
  user_id uuid [not null]
  organization_id uuid [not null]
  position varchar(255) [not null]
  start_date date [not null]
  end_date date
  job_title varchar(255) [not null]
  description text
  created_at timestamp [default: `now()`, not null]
  updated_at timestamp
  deleted_at timestamp
}

Table user_interactions {
  id uuid [pk, default: `gen_random_uuid()`]
  user_id uuid [not null]
  job_id uuid [not null]
  type user_interaction_type [not null]
  created_at timestamp [default: `now()`, not null]
  updated_at timestamp
  deleted_at timestamp
}

Table user_notifications {
  id uuid [pk, default: `gen_random_uuid()`]
  notification_id uuid [not null]
  receiver_id uuid [not null]
  organization_id uuid
  read_at timestamp
  deleted_at timestamp
}

Table user_onboardings {
  id bigserial [pk]
  user_id uuid [not null, unique]
  education_level education_level
  major varchar(255)
  school varchar(255)
  current_goal varchar(500)
  experience_years integer
  experience_details varchar(500)
  skills jsonb
}

Table user_skills {
  user_id uuid
  skill_id uuid
  organization_id uuid
  
  indexes {
    (user_id, skill_id) [pk]
  }
}

Table user_tests {
  id uuid [pk, default: `gen_random_uuid()`]
  user_id uuid [not null]
  selected_skill_ids jsonb [not null]
  selected_difficulty_levels jsonb
  total_score integer
  skill_levels_assessed jsonb
  created_at timestamp [default: `now()`, not null]
  question_ids jsonb
}

Table users {
  id uuid [pk, default: `gen_random_uuid()`]
  username varchar(255) [not null, unique]
  email varchar(255) [unique]
  email_verified boolean [default: false, not null]
  phone varchar(20) [unique]
  firebase_uid varchar(255) [unique]
  avatar_url varchar(500)
  banner_url varchar(500)
  name varchar(255) [not null]
  roles "varchar(255)[]" [default: '{USER}', not null]
  dob date
  bio varchar(500)
  address varchar(255)
  phone_verified boolean [default: false, not null]
  gender gender
  provider provider [default: 'email', not null]
  status user_status [default: 'active', not null]
  created_at timestamp [default: `now()`, not null]
  updated_at timestamp
  deleted_at timestamp
  onboarding_completed boolean [default: false, not null]
}

Table drizzle.__drizzle_migrations {
  id serial [pk]
  hash text [not null]
  created_at bigint
}

// --- RELATIONSHIPS ---

Ref: ai_cvs.user_id > users.id [delete: cascade]
Ref: apply_jobs.cv_id > cvs.id
Ref: apply_jobs.job_id > jobs.id
Ref: companies.company_raw_id > company_raws.id
Ref: companies.organization_id - organizations.id [delete: cascade]
Ref: cvs.user_id > users.id
Ref: feedbacks.user_id > users.id [delete: set null]
Ref: job_provinces.job_id > jobs.id
Ref: job_provinces.province_id > provinces.id
Ref: job_raws.company_id > company_raws.id
Ref: job_skills.job_id > jobs.id
Ref: job_skills.skill_id > skills.id
Ref: jobs.category_id > categories.id
Ref: jobs.job_raw_id > job_raws.id
Ref: jobs.organization_id > organizations.id
Ref: learning_roadmaps.user_id > users.id [delete: cascade]
Ref: levels.area_id > areas.id [delete: cascade]
Ref: notifications.sender_id > users.id [delete: set null]
Ref: organization_invitations.actor_id > users.id
Ref: organization_invitations.organization_id > organizations.id
Ref: organization_invitations.receiver_id > users.id
Ref: organization_locations.organization_id > organizations.id
Ref: organization_locations.province_id > provinces.id
Ref: organization_members.organization_id > organizations.id
Ref: organization_members.user_id > users.id
Ref: questions.skill_id > skills.id [delete: cascade]
Ref: refresh_tokens.user_id > users.id
Ref: roadmap_phases.roadmap_id > learning_roadmaps.id [delete: cascade]
Ref: roadmap_skill_options.roadmap_skill_id > roadmap_skills.id [delete: cascade]
Ref: roadmap_skills.phase_id > roadmap_phases.id [delete: cascade]
Ref: schools.organization_id - organizations.id
Ref: user_answers.question_id > questions.id [delete: cascade]
Ref: user_answers.user_test_id > user_tests.id [delete: cascade]
Ref: user_educations.school_id > organizations.id
Ref: user_educations.user_id > users.id
Ref: user_experiences.organization_id > organizations.id
Ref: user_experiences.user_id > users.id
Ref: user_interactions.job_id > jobs.id
Ref: user_notifications.notification_id > notifications.id [delete: cascade]
Ref: user_notifications.organization_id > organizations.id [delete: set null]
Ref: user_notifications.receiver_id > users.id
Ref: user_onboardings.user_id - users.id
Ref: user_skills.organization_id > organizations.id
Ref: user_skills.skill_id > skills.id
Ref: user_skills.user_id > users.id
Ref: user_tests.user_id > users.id [delete: cascade]