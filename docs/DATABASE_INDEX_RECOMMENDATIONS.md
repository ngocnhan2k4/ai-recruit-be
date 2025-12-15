# Database Index Recommendations

Tài liệu này liệt kê các index được khuyến nghị cho database dựa trên phân tích các repository và query patterns.

## Tổng quan

Index giúp cải thiện hiệu suất truy vấn bằng cách:
- Tăng tốc độ tìm kiếm trong WHERE clauses
- Tối ưu hóa JOIN operations
- Cải thiện ORDER BY và GROUP BY
- Hỗ trợ cursor pagination


## Index được khuyến nghị thêm

### 1. Users Table (`users`)

#### Index đơn
```sql
-- Tìm kiếm theo username (đã có unique constraint, nhưng cần index cho performance)
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

```

#### Composite Index
```sql
-- Tìm kiếm active users không bị xóa
CREATE INDEX IF NOT EXISTS idx_users_deleted_at_status ON users(deleted_at, status) WHERE deleted_at IS NULL;

```

### 2. Jobs Table (`jobs`)

#### Index đơn
```sql
-- Tìm kiếm theo work_type
CREATE INDEX IF NOT EXISTS idx_jobs_work_type ON jobs(work_type);

-- Tìm kiếm theo deleted_at (soft delete)
CREATE INDEX IF NOT EXISTS idx_jobs_deleted_at ON jobs(deleted_at) WHERE deleted_at IS NULL;

-- Tìm kiếm theo end_date (để filter jobs còn hạn)
CREATE INDEX IF NOT EXISTS idx_jobs_end_date ON jobs(end_date);

-- Sắp xếp theo created_at
CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON jobs(created_at DESC);

```

#### Composite Index
```sql
-- Query pattern: getJobs với status và deleted_at
CREATE INDEX IF NOT EXISTS idx_jobs_status_deleted_at ON jobs(status, deleted_at) WHERE deleted_at IS NULL;

-- Query pattern: getJobs với organization và status
CREATE INDEX IF NOT EXISTS idx_jobs_org_status ON jobs(organization_id, status) WHERE deleted_at IS NULL;

-- Query pattern: active jobs sắp xếp theo date_posted
CREATE INDEX IF NOT EXISTS idx_jobs_active_date_posted ON jobs(status, date_posted DESC) WHERE status = 'active' AND deleted_at IS NULL;

-- Query pattern: filter theo salary range
CREATE INDEX IF NOT EXISTS idx_jobs_salary_min ON jobs(salary_min) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_jobs_salary_max ON jobs(salary_max) WHERE deleted_at IS NULL;

-- Query pattern: filter theo experience
CREATE INDEX IF NOT EXISTS idx_jobs_experience_min ON jobs(experience_min) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_jobs_experience_max ON jobs(experience_max) WHERE deleted_at IS NULL;

-- Query pattern: cursor pagination với status
CREATE INDEX IF NOT EXISTS idx_jobs_id_status ON jobs(id, status) WHERE deleted_at IS NULL;
```

### 3. User Experiences Table (`user_experiences`)

#### Index đơn
```sql
-- Foreign key index
CREATE INDEX IF NOT EXISTS idx_user_experiences_user_id ON user_experiences(user_id);
CREATE INDEX IF NOT EXISTS idx_user_experiences_organization_id ON user_experiences(organization_id);
```

### 4. User Skills Table (`user_skills`)

#### Composite Index
```sql
-- Query pattern: getUserSkills với organization
CREATE INDEX IF NOT EXISTS idx_user_skills_user_org_skill ON user_skills(user_id, skill_id, organization_id);
```

### 5. User Educations Table (`user_educations`)

#### Index đơn
```sql
-- Foreign key index
CREATE INDEX IF NOT EXISTS idx_user_educations_school_id ON user_educations(user_id, school_id);
```

### 6. User Onboardings Table (`user_onboardings`)

#### Index đơn
```sql
-- Foreign key index (đã có unique constraint, nhưng cần index cho performance)
CREATE INDEX IF NOT EXISTS idx_user_onboardings_user_id ON user_onboardings(user_id);
```

### 7. Organizations Table (`organizations`)

#### Index đơn
```sql
-- Tìm kiếm theo type
CREATE INDEX IF NOT EXISTS idx_organizations_type ON organizations(type);

-- Tìm kiếm theo deleted_at
CREATE INDEX IF NOT EXISTS idx_organizations_deleted_at ON organizations(deleted_at) WHERE deleted_at IS NULL;

-- Tìm kiếm theo verified_at
CREATE INDEX IF NOT EXISTS idx_organizations_verified_at ON organizations(verified_at) WHERE verified_at IS NOT NULL;

-- Sắp xếp theo created_at (cursor pagination)
CREATE INDEX IF NOT EXISTS idx_organizations_created_at ON organizations(created_at DESC);

-- Full-text search trên name (sử dụng similarity)
-- Cần extension: CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS idx_organizations_name_trgm ON organizations USING GIN(name gin_trgm_ops);
```

#### Composite Index
```sql
-- Query pattern: getAllOrganizations với type và deleted_at
CREATE INDEX IF NOT EXISTS idx_organizations_type_deleted_at ON organizations(type, deleted_at) WHERE deleted_at IS NULL;
```

### 8. Organization Members Table (`organization_members`)

#### Index đơn
```sql
-- Foreign key index
CREATE INDEX IF NOT EXISTS idx_org_members_user_id ON organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_org_members_organization_id ON organization_members(organization_id);

-- Tìm kiếm theo deleted_at
CREATE INDEX IF NOT EXISTS idx_org_members_deleted_at ON organization_members(deleted_at) WHERE deleted_at IS NULL;

-- Sắp xếp theo created_at (cursor pagination)
CREATE INDEX IF NOT EXISTS idx_org_members_created_at ON organization_members(created_at DESC);
```

#### Composite Index
```sql
-- Query pattern: getAllMembers với organization và role
CREATE INDEX IF NOT EXISTS idx_org_members_org_role ON organization_members(organization_id, role) WHERE deleted_at IS NULL;

-- Query pattern: isActiveMember
CREATE INDEX IF NOT EXISTS idx_org_members_org_user ON organization_members(organization_id, user_id) WHERE deleted_at IS NULL;

-- Query pattern: getMemberRole
CREATE INDEX IF NOT EXISTS idx_org_members_org_user_deleted ON organization_members(organization_id, user_id, deleted_at) WHERE deleted_at IS NULL;
```

### 9. Organization Locations Table (`organization_locations`)

#### Index đơn
```sql
-- Foreign key index
CREATE INDEX IF NOT EXISTS idx_org_locations_organization_id ON organization_locations(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_locations_province_id ON organization_locations(province_id);
```

### 10. Organization Invitations Table (`organization_invitations`)

#### Index đơn
```sql
-- Foreign key index
CREATE INDEX IF NOT EXISTS idx_org_invitations_organization_id ON organization_invitations(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_invitations_actor_id ON organization_invitations(actor_id);
CREATE INDEX IF NOT EXISTS idx_org_invitations_receiver_id ON organization_invitations(receiver_id);

-- Tìm kiếm theo status
CREATE INDEX IF NOT EXISTS idx_org_invitations_status ON organization_invitations(status);

-- Tìm kiếm theo expires_at (để cleanup expired invitations)
CREATE INDEX IF NOT EXISTS idx_org_invitations_expires_at ON organization_invitations(expires_at);

-- Sắp xếp theo created_at (cursor pagination)
CREATE INDEX IF NOT EXISTS idx_org_invitations_created_at ON organization_invitations(created_at DESC);
```

#### Composite Index
```sql
-- Query pattern: getByOrganizationId với status pending
CREATE INDEX IF NOT EXISTS idx_org_invitations_org_status ON organization_invitations(organization_id, status, created_at DESC) WHERE status = 'pending' AND deleted_at IS NULL;
```

### 11. Job Provinces Table (`job_provinces`)

#### Index đơn
```sql
-- Foreign key index (đã có primary key composite, nhưng cần index riêng)
CREATE INDEX IF NOT EXISTS idx_job_provinces_job_id ON job_provinces(job_id);
CREATE INDEX IF NOT EXISTS idx_job_provinces_province_id ON job_provinces(province_id);
```

### 12. Job Skills Table (`job_skills`)

#### Index đơn
```sql
-- Foreign key index (đã có primary key composite, nhưng cần index riêng)
CREATE INDEX IF NOT EXISTS idx_job_skills_job_id ON job_skills(job_id);
CREATE INDEX IF NOT EXISTS idx_job_skills_skill_id ON job_skills(skill_id);
```

### 13. User Interactions Table (`user_interactions`)

#### Index đơn
```sql
-- Foreign key index
CREATE INDEX IF NOT EXISTS idx_user_interactions_user_id ON user_interactions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_interactions_job_id ON user_interactions(job_id);

-- Tìm kiếm theo type
CREATE INDEX IF NOT EXISTS idx_user_interactions_type ON user_interactions(type);
```

#### Composite Index
```sql
-- Query pattern: saveJob, hideJob - tìm interaction theo user, job và type
CREATE INDEX IF NOT EXISTS idx_user_interactions_user_job_type ON user_interactions(user_id, job_id, type);

-- Query pattern: getAllSavedJobs
CREATE INDEX IF NOT EXISTS idx_user_interactions_user_type ON user_interactions(user_id, type) WHERE type = 'save';
```

### 14. Apply Jobs Table (`apply_jobs`)

#### Index đơn
```sql
-- Foreign key index
CREATE INDEX IF NOT EXISTS idx_apply_jobs_job_id ON apply_jobs(job_id);
CREATE INDEX IF NOT EXISTS idx_apply_jobs_cv_id ON apply_jobs(cv_id);

-- Tìm kiếm theo status
CREATE INDEX IF NOT EXISTS idx_apply_jobs_status ON apply_jobs(status);

-- Sắp xếp theo created_at
CREATE INDEX IF NOT EXISTS idx_apply_jobs_created_at ON apply_jobs(created_at DESC);
```

#### Composite Index
```sql
-- Query pattern: getApplyJobs với job_id
CREATE INDEX IF NOT EXISTS idx_apply_jobs_job_created_at ON apply_jobs(job_id, created_at DESC);

-- Query pattern: check existing application
CREATE INDEX IF NOT EXISTS idx_apply_jobs_cv_job ON apply_jobs(cv_id, job_id);
```

### 15. CVs Table (`cvs`)

#### Index đơn
```sql
-- Foreign key index
CREATE INDEX IF NOT EXISTS idx_cvs_user_id ON cvs(user_id);

-- Sắp xếp theo last_used
CREATE INDEX IF NOT EXISTS idx_cvs_last_used ON cvs(last_used_at DESC);
```

#### Composite Index
```sql
-- Query pattern: getAllAppliedJobs - join với cvs và apply_jobs
CREATE INDEX IF NOT EXISTS idx_cvs_user_id_last_used ON cvs(user_id, last_used_at DESC);
```

### 16. Notifications Table (`notifications`)

#### Index đơn
```sql
-- Foreign key index
CREATE INDEX IF NOT EXISTS idx_notifications_sender_id ON notifications(sender_id);

-- Tìm kiếm theo type
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);

-- Sắp xếp theo created_at
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- JSONB index cho payload.orgId
CREATE INDEX IF NOT EXISTS idx_notifications_payload_org_id ON notifications USING GIN((payload->>'orgId'));
```

### 17. User Notifications Table (`user_notifications`)

#### Index đơn
```sql
-- Foreign key index
CREATE INDEX IF NOT EXISTS idx_user_notifications_notification_id ON user_notifications(notification_id);
CREATE INDEX IF NOT EXISTS idx_user_notifications_receiver_id ON user_notifications(receiver_id);
CREATE INDEX IF NOT EXISTS idx_user_notifications_organization_id ON user_notifications(organization_id);

-- Tìm kiếm theo read_at
CREATE INDEX IF NOT EXISTS idx_user_notifications_read_at ON user_notifications(read_at) WHERE read_at IS NULL;

-- Tìm kiếm theo deleted_at
CREATE INDEX IF NOT EXISTS idx_user_notifications_deleted_at ON user_notifications(deleted_at) WHERE deleted_at IS NULL;
```

#### Composite Index
```sql
-- Query pattern: getNotificationsByUser
CREATE INDEX IF NOT EXISTS idx_user_notifications_receiver_deleted_created ON user_notifications(receiver_id, deleted_at, created_at DESC) WHERE deleted_at IS NULL;

-- Query pattern: getNotificationsByUser với organization
CREATE INDEX IF NOT EXISTS idx_user_notifications_receiver_org_deleted ON user_notifications(receiver_id, organization_id, deleted_at) WHERE deleted_at IS NULL;

-- Query pattern: getUnreadCount
CREATE INDEX IF NOT EXISTS idx_user_notifications_receiver_read_deleted ON user_notifications(receiver_id, read_at, deleted_at) WHERE read_at IS NULL AND deleted_at IS NULL;

-- Query pattern: markAsRead, markAsDeleted
CREATE INDEX IF NOT EXISTS idx_user_notifications_id_deleted ON user_notifications(id, deleted_at) WHERE deleted_at IS NULL;
```

### 18. User Tests Table (`user_tests`)

#### Index đơn
```sql
-- Foreign key index
CREATE INDEX IF NOT EXISTS idx_user_tests_user_id ON user_tests(user_id);

-- Sắp xếp theo created_at
CREATE INDEX IF NOT EXISTS idx_user_tests_created_at ON user_tests(created_at DESC);
```

#### Composite Index
```sql
-- Query pattern: getUserTests
CREATE INDEX IF NOT EXISTS idx_user_tests_user_created_at ON user_tests(user_id, created_at DESC);
```

### 19. User Answers Table (`user_answers`)

#### Index đơn
```sql
-- Foreign key index
CREATE INDEX IF NOT EXISTS idx_user_answers_user_test_id ON user_answers(user_test_id);
CREATE INDEX IF NOT EXISTS idx_user_answers_question_id ON user_answers(question_id);
```

#### Composite Index
```sql
-- Query pattern: getTestAnswers
CREATE INDEX IF NOT EXISTS idx_user_answers_test_question ON user_answers(user_test_id, question_id);

-- Query pattern: upsertAnswers
CREATE INDEX IF NOT EXISTS idx_user_answers_test_question_unique ON user_answers(user_test_id, question_id);
```

### 20. Questions Table (`questions`)

#### Index đơn
```sql
-- Foreign key index
CREATE INDEX IF NOT EXISTS idx_questions_skill_id ON questions(skill_id);

-- Tìm kiếm theo is_active
CREATE INDEX IF NOT EXISTS idx_questions_is_active ON questions(is_active);

-- Full-text search trên question_text
CREATE INDEX IF NOT EXISTS idx_questions_question_text_trgm ON questions USING GIN(question_text gin_trgm_ops);
```

#### Composite Index
```sql
-- Query pattern: getActiveQuestionsBySkills
CREATE INDEX IF NOT EXISTS idx_questions_skill_active ON questions(skill_id, is_active) WHERE is_active = true;

-- Query pattern: getPaginatedQuestions với skillIds
CREATE INDEX IF NOT EXISTS idx_questions_skill_ids ON questions USING GIN(skill_id);
```

### 21. Learning Roadmaps Table (`learning_roadmaps`)

#### Index đơn
```sql
-- Foreign key index
CREATE INDEX IF NOT EXISTS idx_learning_roadmaps_user_id ON learning_roadmaps(user_id);

-- Tìm kiếm theo deleted_at
CREATE INDEX IF NOT EXISTS idx_learning_roadmaps_deleted_at ON learning_roadmaps(deleted_at) WHERE deleted_at IS NULL;

-- Sắp xếp theo created_at
CREATE INDEX IF NOT EXISTS idx_learning_roadmaps_created_at ON learning_roadmaps(created_at DESC);
```

#### Composite Index
```sql
-- Query pattern: getPaginatedRoadmaps
CREATE INDEX IF NOT EXISTS idx_learning_roadmaps_user_deleted_created ON learning_roadmaps(user_id, deleted_at, created_at DESC) WHERE deleted_at IS NULL;
```

### 22. Roadmap Phases Table (`roadmap_phases`)

#### Index đơn
```sql
-- Foreign key index
CREATE INDEX IF NOT EXISTS idx_roadmap_phases_roadmap_id ON roadmap_phases(roadmap_id);

-- Tìm kiếm theo deleted_at
CREATE INDEX IF NOT EXISTS idx_roadmap_phases_deleted_at ON roadmap_phases(deleted_at) WHERE deleted_at IS NULL;

-- Sắp xếp theo order_index
CREATE INDEX IF NOT EXISTS idx_roadmap_phases_order_index ON roadmap_phases(order_index);
```

#### Composite Index
```sql
-- Query pattern: getRoadmapWithDetails
CREATE INDEX IF NOT EXISTS idx_roadmap_phases_roadmap_deleted_order ON roadmap_phases(roadmap_id, deleted_at, order_index) WHERE deleted_at IS NULL;
```

### 23. Roadmap Skills Table (`roadmap_skills`)

#### Index đơn
```sql
-- Foreign key index
CREATE INDEX IF NOT EXISTS idx_roadmap_skills_phase_id ON roadmap_skills(phase_id);
CREATE INDEX IF NOT EXISTS idx_roadmap_skills_skill_id ON roadmap_skills(skill_id);

-- Tìm kiếm theo deleted_at
CREATE INDEX IF NOT EXISTS idx_roadmap_skills_deleted_at ON roadmap_skills(deleted_at) WHERE deleted_at IS NULL;

-- Sắp xếp theo order_index
CREATE INDEX IF NOT EXISTS idx_roadmap_skills_order_index ON roadmap_skills(order_index);
```

#### Composite Index
```sql
-- Query pattern: getProgressStats
CREATE INDEX IF NOT EXISTS idx_roadmap_skills_phase_deleted_order ON roadmap_skills(phase_id, deleted_at, order_index) WHERE deleted_at IS NULL;
```

### 24. Job Raws Table (`job_raws`)

#### Index đơn
```sql
-- Foreign key index
CREATE INDEX IF NOT EXISTS idx_job_raws_company_id ON job_raws(company_id);

-- Tìm kiếm theo source
CREATE INDEX IF NOT EXISTS idx_job_raws_source ON job_raws(source);

-- Sắp xếp theo crawled_at
CREATE INDEX IF NOT EXISTS idx_job_raws_crawled_at ON job_raws(crawled_at DESC);

-- Tìm kiếm theo date_posted
CREATE INDEX IF NOT EXISTS idx_job_raws_date_posted ON job_raws(date_posted);
```

### 25. Company Raws Table (`company_raws`)

#### Index đơn
```sql
-- Tìm kiếm theo source
CREATE INDEX IF NOT EXISTS idx_company_raws_source ON company_raws(source);

-- Sắp xếp theo crawled_at
CREATE INDEX IF NOT EXISTS idx_company_raws_crawled_at ON company_raws(crawled_at DESC);
```

## Lưu ý quan trọng

### 1. Partial Indexes (WHERE clauses)
Nhiều index sử dụng partial index với `WHERE deleted_at IS NULL` để:
- Giảm kích thước index
- Cải thiện hiệu suất cho queries chỉ tìm active records
- Giảm overhead khi update/delete

### 2. GIN Indexes
Sử dụng GIN indexes cho:
- Array columns (như `roles`)
- JSONB columns (như `payload`)
- Full-text search với `pg_trgm` extension

### 3. Composite Indexes
Thứ tự columns trong composite index quan trọng:
- Column được filter nhiều nhất nên đứng đầu
- Column được sort nên đứng cuối
- Ví dụ: `(organization_id, status, created_at DESC)`

### 4. Cursor Pagination
Các index cho cursor pagination thường kết hợp:
- Filter columns (WHERE)
- Sort column (ORDER BY)
- Cursor column (id hoặc created_at)

### 5. Foreign Keys
Tất cả foreign keys nên có index để tối ưu JOIN operations.

## Script tạo index

Tạo file migration hoặc script SQL để apply tất cả các index trên. Lưu ý:
- Chạy trên database production cần backup trước
- Monitor performance sau khi tạo index
- Có thể tạo index CONCURRENTLY để tránh lock table

## Monitoring

Sau khi tạo index, cần monitor:
- Query performance
- Index usage (pg_stat_user_indexes)
- Index size
- Write performance (indexes làm chậm INSERT/UPDATE)



