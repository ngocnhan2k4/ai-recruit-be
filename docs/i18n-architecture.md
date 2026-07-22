# Tài liệu Thiết kế Kiến trúc Hệ thống Đa ngôn ngữ (i18n Architecture)

**Tài liệu này mô tả chi tiết kiến trúc (High-level & Low-level), thiết kế cơ sở dữ liệu và chiến lược triển khai hệ thống đa ngôn ngữ cho nền tảng CareerLens (hỗ trợ Tiếng Việt, Tiếng Anh và mở rộng trong tương lai).**

---

## 1. Kiến trúc Hệ thống (System Architecture)

### 1.1. Kiến trúc Cấp cao (High-Level Architecture)

Hệ thống áp dụng mô hình **Asynchronous Translation** (Dịch bất đồng bộ) kết hợp **CQRS Pattern** (Tách biệt luồng Đọc/Ghi) để đảm bảo trải nghiệm người dùng (Latency thấp) trong khi vẫn duy trì được khối lượng dữ liệu lớn.

```
┌─────────────────────────────────────────────────────────────┐
│                    Client App / Web Browser                 │
│         (Gửi request với header Accept-Language: en-US)      │
└────────────────────────────┬────────────────────────────────┘
                             │
                             ▼
        ┌────────────────────────────────────────┐
        │         API Gateway / NestJS Backend   │
        │  - Extract locale từ Accept-Language   │
        │  - Lưu vào Request Context             │
        └───────────────┬────────────────────────┘
                        │
          ┌─────────────┴──────────────┬──────────────┐
          ▼                            ▼              ▼
    ┌──────────────┐         ┌──────────────┐  ┌──────────────┐
    │  Redis Cache │         │ PostgreSQL   │  │ Message Queue│
    │  (Read Path) │         │ Main DB      │  │(Kafka/Redis) │
    │              │         │              │  │              │
    │ Format:      │         │ Core Tables  │  │ - Publish    │
    │ entity:id:   │         │ + _trans     │  │   Events     │
    │ lang_code    │         │   tables     │  │              │
    └──────────────┘         └──────────────┘  └──────┬───────┘
                                                       │
                                    ┌──────────────────┘
                                    │
                                    ▼
                        ┌───────────────────────┐
                        │ Background Worker     │
                        │ - Consume Events      │
                        │ - Call Translation    │
                        │   Service (Google     │
                        │   Translate/DeepL)    │
                        │ - Write to _trans     │
                        │   tables (Async)      │
                        └───────────────────────┘
```

### 1.2. Kiến trúc Cấp thấp (Low-Level Architecture)

#### A. Luồng Đọc (Read Path) - Tối ưu Tốc độ

```
1. Middleware/Interceptor
   ├─ Chặn request HTTP
   ├─ Đọc header Accept-Language (vd: en-US, vi-VN)
   ├─ Extract mã ngôn ngữ (en, vi)
   └─ Lưu vào RequestContext/Thread-local storage

2. Service Layer
   ├─ Nhận request với language_code
   ├─ Gọi Repository.getByIdWithTranslation(id, lang_code)
   └─ Check Redis Cache: [entity]:[id]:[lang_code]
      ├─ HIT → Trả về ngay
      └─ MISS → Tiếp tục bước 3

3. Repository Layer
   ├─ Thực hiện Query với LEFT JOIN:
   │  SELECT COALESCE(trans.title, base.title) AS title
   │  FROM base_table base
   │  LEFT JOIN base_table_translations trans
   │    ON base.id = trans.entity_id
   │    AND trans.language_code = $1
   │  WHERE base.id = $2
   └─ Fallback logic (nếu không có dịch → dùng bản gốc)

4. Cache & Return
   ├─ Lưu kết quả vào Redis (TTL: 24h)
   └─ Trả về cho Client
```

#### B. Luồng Ghi (Write Path) - Tối ưu Trải nghiệm (Không block API)

```
1. Controller
   └─ Nhận payload từ User (vd: tạo Job mới bằng tiếng Việt)

2. Repository - Write Bảng Gốc
   ├─ INSERT vào jobs (lưu bản gốc tiếng Việt)
   └─ Database Generate: id, timestamps

3. Event Publisher
   ├─ Publish Event: JobCreated {
   │    id: "uuid",
   │    title: "...",
   │    description: "...",
   │    source_language: "vi"
   │  }
   └─ Gửi vào Message Queue (Kafka/RabbitMQ/Redis Stream)

4. Response → Client (< 100ms)
   └─ 200 OK, Trả về Job ID
      (Không chờ translation hoàn thành)

5. Background Consumer (Chạy async, Không block API)
   ├─ Consume Event từ Queue
   ├─ Gọi Translation Service:
   │  ├─ Google Translate API
   │  ├─ DeepL API
   │  └─ Hoặc Custom AI Model
   ├─ Nhận bản dịch: { en: "...", ... }
   └─ Bulk INSERT vào job_translations

6. Cache Invalidation
   ├─ Xóa Redis key: job:[id]:*
   └─ Request tới lần sau sẽ tự động rebuild cache
```

---

## 2. Thiết kế Cơ sở dữ liệu (Database Design)

Chiến lược phân loại dữ liệu thành **3 nhóm** để tối ưu không gian lưu trữ, tốc độ truy vấn và tính linh hoạt.

### 2.1. Nhóm 1: Master Data - Dữ liệu Tĩnh (Thay đổi rất ít)

**Đặc điểm:**
- Thay đổi hiếm khi hoặc không đổi
- Cần dịch cho toàn bộ user
- Dữ liệu nhỏ gọn

**Bảng thuộc nhóm:**
- `features` - Các tính năng của hệ thống
- `provinces` - Danh sách tỉnh/thành phố
- `blog_categories` - Danh mục blog
- `categories` - Danh mục công việc (nếu có)

**Thiết kế:**

```sql
-- Bảng Master Data (VD: features)
CREATE TABLE features (
    id BIGSERIAL PRIMARY KEY,
    code VARCHAR UNIQUE NOT NULL,
    name VARCHAR NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bảng Dịch (tương ứng với features)
CREATE TABLE feature_translations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    feature_id BIGINT NOT NULL REFERENCES features(id) ON DELETE CASCADE,
    language_code VARCHAR(5) NOT NULL,
    name VARCHAR NOT NULL,
    description TEXT,
    UNIQUE(feature_id, language_code),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_feature_trans_lookup ON feature_translations(feature_id, language_code);

-- Tương tự cho các bảng khác:
CREATE TABLE blog_category_translations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID NOT NULL REFERENCES blog_categories(id) ON DELETE CASCADE,
    language_code VARCHAR(5) NOT NULL,
    name VARCHAR NOT NULL,
    description TEXT,
    UNIQUE(category_id, language_code)
);
CREATE INDEX idx_blog_cat_trans_lookup ON blog_category_translations(category_id, language_code);

CREATE TABLE province_translations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    province_id UUID NOT NULL REFERENCES provinces(id) ON DELETE CASCADE,
    language_code VARCHAR(5) NOT NULL,
    name VARCHAR NOT NULL,
    UNIQUE(province_id, language_code)
);
CREATE INDEX idx_province_trans_lookup ON province_translations(province_id, language_code);
```

**Strategy triển khai:**
1. Migration: Tạo bảng _translations từng cái một
2. Seed: Chạy script import dữ liệu dịch từ tệp hardcoded hoặc API
3. Không cần async worker (dữ liệu ít, có thể pre-translate)

---

### 2.2. Nhóm 2: Core Entities - Dữ liệu Động (Nghiệp vụ cốt lõi)

**Đặc điểm:**
- Dữ liệu lớn (hàng triệu bản ghi)
- Được cập nhật bởi Admin, Recruiter, Employer
- Cần dịch cho toàn bộ user
- Có độ ưu tiên cao

**Bảng thuộc nhóm:**
- `jobs` - Công việc đăng tuyển
- `organizations` - Công ty/Tổ chức
- `blog_posts` - Bài viết blog
- `questions` - Câu hỏi quiz/test
- `roadmap_phases` - Các phase trong learning roadmap
- `roadmap_skills` - Các kỹ năng trong roadmap

**Thiết kế:**

```sql
-- Bảng Jobs (Bảng gốc chứa dữ liệu bất biến)
CREATE TABLE jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    title VARCHAR NOT NULL,
    description TEXT NOT NULL,
    salary_min NUMERIC,
    salary_max NUMERIC,
    experience_min INTEGER,
    experience_max INTEGER,
    date_posted DATE,
    end_date DATE,
    status USER-DEFINED,
    work_type USER-DEFINED,
    questions JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

-- Bảng Dịch cho Jobs
CREATE TABLE job_translations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    language_code VARCHAR(5) NOT NULL,
    title VARCHAR NOT NULL,
    description TEXT NOT NULL,
    UNIQUE(job_id, language_code),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_job_trans_lookup ON job_translations(job_id, language_code);
CREATE INDEX idx_job_trans_search ON job_translations USING GIN(to_tsvector('english', description));

-- Query chuẩn: Lấy Job với đúng ngôn ngữ + Fallback
SELECT
    j.id,
    j.organization_id,
    j.salary_min,
    j.salary_max,
    j.experience_min,
    j.experience_max,
    j.work_type,
    j.date_posted,
    j.status,
    COALESCE(jt.title, j.title) AS title,
    COALESCE(jt.description, j.description) AS description
FROM jobs j
LEFT JOIN job_translations jt
    ON j.id = jt.job_id
    AND jt.language_code = $1  -- $1 là language_code từ Request (vd: 'en', 'vi')
WHERE j.id = $2
    AND j.deleted_at IS NULL;
```

**Các bảng khác trong Nhóm 2:**

```sql
-- Organizations
CREATE TABLE organization_translations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    language_code VARCHAR(5) NOT NULL,
    name VARCHAR NOT NULL,
    description TEXT,
    about TEXT,
    UNIQUE(organization_id, language_code)
);

-- Blog Posts
CREATE TABLE blog_post_translations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES blog_posts(id) ON DELETE CASCADE,
    language_code VARCHAR(5) NOT NULL,
    title VARCHAR NOT NULL,
    slug VARCHAR NOT NULL,
    summary TEXT,
    content TEXT,
    UNIQUE(post_id, language_code),
    INDEX idx_blog_post_trans_slug(slug, language_code)
);

-- Questions
CREATE TABLE question_translations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    language_code VARCHAR(5) NOT NULL,
    question_text TEXT NOT NULL,
    options JSONB,  -- JSON array: [{ id: "a", text: "...", lang_specific: true }, ...]
    UNIQUE(question_id, language_code)
);

-- Roadmap Phases
CREATE TABLE roadmap_phase_translations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phase_id UUID NOT NULL REFERENCES roadmap_phases(id) ON DELETE CASCADE,
    language_code VARCHAR(5) NOT NULL,
    name VARCHAR NOT NULL,
    description TEXT,
    UNIQUE(phase_id, language_code)
);

-- Roadmap Skills
CREATE TABLE roadmap_skill_translations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    skill_id UUID NOT NULL REFERENCES roadmap_skills(id) ON DELETE CASCADE,
    language_code VARCHAR(5) NOT NULL,
    name VARCHAR NOT NULL,
    description TEXT,
    UNIQUE(skill_id, language_code)
);
```

**Strategy triển khai:**
1. Migration: Tạo từng bảng _translations
2. ETL Offline: Extract dữ liệu cũ (bộn lộn Anh-Việt) → Language Detection → Translation → Load
3. Tích hợp Async Worker: Mọi Create/Update trên bảng gốc → Publish Event → Worker dịch ngầm
4. Update Read Query: Dùng LEFT JOIN + COALESCE + Caching

---

### 2.3. Nhóm 3: User-Generated Content & Personal Data

**Đặc điểm:**
- Dữ liệu của user cá nhân (không cần dịch cho toàn hệ thống)
- Không ai cần dịch lịch sử làm việc của bạn ra 5 thứ tiếng
- Không dùng bảng _translations
- Thêm cột `language_code` / `locale` để định danh ngôn ngữ tạo bản ghi

**Bảng thuộc nhóm:**
- `ai_cvs` - CV do AI tạo
- `user_experiences` - Lịch sử làm việc của user
- `user_educations` - Lịch sử học tập
- `user_onboardings` - Data onboarding user
- `comments` - Bình luận người dùng
- `notifications` - Thông báo (hỗ trợ i18n qua template engine)

**Thiết kế:**

```sql
-- AI CVs - Thêm cột language_code
ALTER TABLE ai_cvs ADD COLUMN language_code VARCHAR(5) DEFAULT 'vi';

-- Ví dụ Query:
SELECT * FROM ai_cvs
WHERE user_id = $1
    AND language_code = $2  -- $2 là ngôn ngữ đã chọn
    AND deleted_at IS NULL;

-- User Experiences
ALTER TABLE user_experiences ADD COLUMN language_code VARCHAR(5) DEFAULT 'vi';

-- User Educations
ALTER TABLE user_educations ADD COLUMN language_code VARCHAR(5) DEFAULT 'vi';

-- User Onboardings
ALTER TABLE user_onboardings ADD COLUMN language_code VARCHAR(5) DEFAULT 'vi';

-- Comments (dựa trên bối cảnh sử dụng)
-- Nếu là comment trên Job Post → dùng ngôn ngữ của Job
-- Nếu là UGC pure → thêm language_code
ALTER TABLE comments ADD COLUMN language_code VARCHAR(5) DEFAULT 'vi';

-- Notifications
-- Notification content được quản lý qua i18n template engine
-- Template structure: notification_templates.language_code
-- VD: "job_applied" template có variation: "en", "vi"
```

**Notification i18n Strategy:**

```typescript
// TypeScript Example
interface NotificationTemplate {
  id: string;
  type: 'job_applied' | 'comment_reply' | ...;
  variables: { job_title: string; company_name: string; ... };
}

// Template Structure (Database hoặc i18n file)
const templates = {
  job_applied: {
    vi: 'Bạn vừa ứng tuyển vào vị trí {{job_title}} tại {{company_name}}',
    en: 'You just applied for {{job_title}} at {{company_name}}'
  }
};

// Rendering Notification
function renderNotification(userId: string, template: NotificationTemplate, lang: string) {
  const text = templates[template.type][lang];
  return mustache.render(text, template.variables);
}
```

---

## 3. Danh sách Bảng & Phân Loại (Table Mapping)

### Nhóm 1: Master Data (Static)
| Bảng | Cột Dịch | Bảng _translations | Ghi chú |
|------|---------|-------------------|--------|
| `features` | name, description | `feature_translations` | Pre-translate, không async |
| `provinces` | name | `province_translations` | Master data tĩnh |
| `blog_categories` | name, description | `blog_category_translations` | Danh mục cố định |

### Nhóm 2: Core Entities (Dynamic)
| Bảng | Cột Dịch | Bảng _translations | Async Worker | Ghi chú |
|------|---------|-------------------|--------------|--------|
| `jobs` | title, description | `job_translations` | ✓ | Priority cao |
| `organizations` | name, description, about | `organization_translations` | ✓ | Priority cao |
| `blog_posts` | title, slug, summary, content | `blog_post_translations` | ✓ | FTS Search |
| `questions` | question_text, options | `question_translations` | ✓ | Quiz/Test |
| `roadmap_phases` | name, description | `roadmap_phase_translations` | ✓ | Learning Path |
| `roadmap_skills` | name, description | `roadmap_skill_translations` | ✓ | Learning Path |

### Nhóm 3: User-Generated Content
| Bảng | Chiến lược | Ghi chú |
|------|-----------|--------|
| `ai_cvs` | Thêm cột `language_code` | Dữ liệu cá nhân user |
| `user_experiences` | Thêm cột `language_code` | Portfolio của user |
| `user_educations` | Thêm cột `language_code` | Lịch sử học tập |
| `user_onboardings` | Thêm cột `language_code` | Onboarding preference |
| `comments` | Thêm cột `language_code` (tuỳ ngữ cảnh) | Có thể kế thừa từ parent |
| `notifications` | Template-based i18n | Dùng Handlebars/Mustache templates |
| `user_answers` | (Không dịch) | Đáp án của user |

---

## 4. Chiến lược Triển khai (Implementation Strategy)

Áp dụng mô hình **Parallel Change** (Chuyển đổi song song) qua **5 giai đoạn** để **không gây Downtime**.

### Giai đoạn 1: Schema & Static Data (Tuần 1)

**Công việc:**

1. Chạy Migration tạo toàn bộ bảng _translations:
   ```bash
   npm run migration:run
   # hoặc
   drizzle-kit migrate
   ```

2. Cập nhật bảng Nhóm 3 (UGC) thêm cột `language_code`:
   ```sql
   ALTER TABLE ai_cvs ADD COLUMN language_code VARCHAR(5) DEFAULT 'vi';
   ALTER TABLE user_experiences ADD COLUMN language_code VARCHAR(5) DEFAULT 'vi';
   ALTER TABLE user_educations ADD COLUMN language_code VARCHAR(5) DEFAULT 'vi';
   ALTER TABLE user_onboardings ADD COLUMN language_code VARCHAR(5) DEFAULT 'vi';
   ALTER TABLE comments ADD COLUMN language_code VARCHAR(5) DEFAULT 'vi';
   ```

3. Seed Master Data (Features, Provinces):
   ```bash
   # Chạy script import dữ liệu dịch vào bảng _translations
   npm run seed:i18n
   ```

**Output:** Hệ thống vẫn chạy bình thường, các bảng mới trống hoặc có dữ liệu tĩnh.

---

### Giai đoạn 2: ETL Offline cho Dữ liệu cũ (Tuần 2)

**Mục đích:** Dọn sạch dữ liệu lộn xộn Anh-Việt hiện tại.

**Công việc:**

1. **Extract:** Dump dữ liệu từ các bảng chính:
   ```bash
   psql $DATABASE_URL -c "COPY jobs TO STDOUT" > jobs.csv
   psql $DATABASE_URL -c "COPY organizations TO STDOUT" > organizations.csv
   psql $DATABASE_URL -c "COPY blog_posts TO STDOUT" > blog_posts.csv
   ```

2. **Transform:** Viết script Python/Node.js (chạy local):
   ```python
   # Python Example: extract_and_translate.py
   from google.cloud import translate_v2
   import csv
   import json

   client = translate_v2.Client()

   # Language Detection + Translation
   for row in read_csv('jobs.csv'):
       title = row['title']
       description = row['description']

       # Detect source language
       source_lang = detect_language(title)  # Returns 'vi' or 'en'

       # Translate if not already in target languages
       translations = {source_lang: {'title': title, 'description': description}}

       target_langs = ['en', 'vi']
       for target_lang in target_langs:
           if target_lang != source_lang:
               en_result = client.translate_text(
                   title, target_language=target_lang
               )
               translations[target_lang] = {
                   'title': en_result['translatedText'],
                   'description': client.translate_text(
                       description, target_language=target_lang
                   )['translatedText']
               }

       export_to_csv(row['id'], translations)
   ```

3. **Load:** Bulk Insert vào Production (Off-peak hours):
   ```bash
   # Chạy lúc ~2AM
   psql $DATABASE_URL -c "COPY job_translations FROM STDIN" < job_trans_cleaned.csv
   ```

**Output:** Bảng _translations đã có dữ liệu dịch hoàn chỉnh.

---

### Giai đoạn 3: Bật Luồng Ghi Bất đồng bộ (Tuần 3)

**Công việc:**

1. **Setup Message Broker:**
   ```bash
   # Nếu dùng Kafka (recommended)
   docker-compose up -d kafka

   # Hoặc Redis Stream (đơn giản hơn)
   docker-compose up -d redis
   ```

2. **Code Background Worker:**
   ```typescript
   // src/workers/translation.worker.ts
   import { KafkaConsumer } from '@nestjs/microservices';

   @Injectable()
   export class TranslationWorker {
     constructor(
       private translateService: TranslateService,
       private jobsRepository: JobsRepository,
     ) {}

     @MessagePattern('job.created')
     async handleJobCreated(event: JobCreatedEvent) {
       try {
         const { jobId, title, description, sourceLanguage } = event;

         // Call Translation Service
         const translations = await this.translateService.translate(
           { title, description },
           sourceLanguage,
           ['en', 'vi']
         );

         // Bulk INSERT into job_translations
         await this.jobsRepository.saveTranslations(jobId, translations);

         // Invalidate Cache
         await this.cacheService.invalidate(`job:${jobId}:*`);
       } catch (error) {
         this.logger.error('Translation failed', error);
         // Retry logic hoặc DLQ (Dead Letter Queue)
       }
     }
   }
   ```

3. **Update API Logic** - Publish Event sau khi ghi dữ liệu:
   ```typescript
   // src/modules/jobs/services/jobs.service.ts
   @Injectable()
   export class JobsService {
     constructor(
       private jobsRepository: JobsRepository,
       private eventPublisher: EventPublisher,
     ) {}

     async createJob(createJobDto: CreateJobDto): Promise<JobResponse> {
       // 1. Write to main table
       const job = await this.jobsRepository.create({
         title: createJobDto.title,
         description: createJobDto.description,
         // ... other fields
       });

       // 2. Publish event for async translation
       await this.eventPublisher.publish({
         event: 'job.created',
         payload: {
           jobId: job.id,
           title: job.title,
           description: job.description,
           sourceLanguage: 'vi' // hoặc từ request context
         }
       });

       // 3. Return immediately (< 100ms)
       return { id: job.id, status: 'created' };
     }
   }
   ```

**Output:** Mỗi khi tạo/cập nhật Job → Publish event → Worker dịch ngầm không block API.

---

### Giai đoạn 4: Chuyển đổi Luồng Đọc & Caching (Tuần 4)

**Công việc:**

1. **Update Repository** - Implement LEFT JOIN + COALESCE:
   ```typescript
   // src/modules/jobs/repositories/jobs.repository.ts
   @Injectable()
   export class JobsRepository {
     constructor(
       private prisma: PrismaService,
       private cache: CacheService,
     ) {}

     async findByIdWithTranslation(
       jobId: string,
       languageCode: string = 'vi',
     ): Promise<Job> {
       // 1. Check Cache
       const cacheKey = `job:${jobId}:${languageCode}`;
       const cached = await this.cache.get(cacheKey);
       if (cached) return cached;

       // 2. Query with LEFT JOIN
       const result = await this.prisma.$queryRaw`
         SELECT
           j.id,
           j.organization_id,
           j.salary_min,
           j.salary_max,
           j.experience_min,
           j.experience_max,
           j.work_type,
           j.date_posted,
           j.status,
           COALESCE(jt.title, j.title) AS title,
           COALESCE(jt.description, j.description) AS description
         FROM jobs j
         LEFT JOIN job_translations jt
           ON j.id = jt.job_id
           AND jt.language_code = ${languageCode}
         WHERE j.id = ${jobId}
           AND j.deleted_at IS NULL
       `;

       // 3. Cache result (TTL: 24 hours)
       await this.cache.set(cacheKey, result[0], 24 * 60 * 60);

       return result[0];
     }

     async findManyWithTranslation(
       filters: JobFilters,
       languageCode: string = 'vi',
     ): Promise<Job[]> {
       const cacheKey = `jobs:${JSON.stringify(filters)}:${languageCode}`;
       const cached = await this.cache.get(cacheKey);
       if (cached) return cached;

       const results = await this.prisma.$queryRaw`
         SELECT
           j.id,
           j.organization_id,
           COALESCE(jt.title, j.title) AS title,
           COALESCE(jt.description, j.description) AS description,
           j.salary_min,
           j.salary_max,
           j.experience_min,
           j.experience_max
         FROM jobs j
         LEFT JOIN job_translations jt
           ON j.id = jt.job_id
           AND jt.language_code = ${languageCode}
         WHERE j.deleted_at IS NULL
           ${filters.organizationId ? `AND j.organization_id = ${filters.organizationId}` : ''}
           ${filters.salaryMin ? `AND j.salary_min >= ${filters.salaryMin}` : ''}
         LIMIT ${filters.limit}
         OFFSET ${filters.offset}
       `;

       await this.cache.set(cacheKey, results, 12 * 60 * 60);
       return results;
     }
   }
   ```

2. **Update Service** - Inject language từ Request:
   ```typescript
   // src/modules/jobs/services/jobs.service.ts
   @Injectable()
   export class JobsService {
     constructor(private jobsRepository: JobsRepository) {}

     async getJobDetail(
       jobId: string,
       req: Request,
     ): Promise<JobDetailResponse> {
       // Extract language từ Accept-Language header
       const languageCode = this.extractLanguageCode(req);

       // Query với translation
       const job = await this.jobsRepository.findByIdWithTranslation(
         jobId,
         languageCode,
       );

       if (!job) throw new NotFoundException('Job not found');

       return {
         id: job.id,
         title: job.title,  // Đã là dịch hoặc fallback
         description: job.description,
         // ... other fields
       };
     }

     private extractLanguageCode(req: Request): string {
       const acceptLanguage = req.headers['accept-language'] || 'vi';
       // Parse Accept-Language: en-US,en;q=0.9 → 'en'
       return acceptLanguage.split('-')[0].toLowerCase();
     }
   }
   ```

3. **Middleware** - Inject languageCode vào Request Context:
   ```typescript
   // src/common/middleware/i18n.middleware.ts
   @Injectable()
   export class I18nMiddleware implements NestMiddleware {
     use(req: Request, res: Response, next: NextFunction) {
       const acceptLanguage = req.headers['accept-language'] || 'vi';
       const languageCode = acceptLanguage.split('-')[0].toLowerCase();

       // Store in RequestContext
       req['languageCode'] = languageCode;

       next();
     }
   }

   // app.module.ts
   export class AppModule implements NestModule {
     configure(consumer: MiddlewareConsumer) {
       consumer.apply(I18nMiddleware).forRoutes('*');
     }
   }
   ```

4. **Deploy Code lên Production:**
   ```bash
   npm run build
   npm run migration:run  # Ensure all migrations run
   npm run start:prod
   ```

**Output:** Mỗi request từ Frontend bây giờ sẽ thấy dữ liệu đã dịch hoặc fallback bản gốc. Tốc độ phục vụ cải thiện 3-5x nhờ caching.

---

### Giai đoạn 5: Cắt rốn & Dọn dẹp (Tuần 5 - Sau 1 tuần ổn định)

**Công việc:**

1. **Monitoring (1 tuần):**
   - Kiểm tra Logs: Không có lỗi Query, Exception
   - Kiểm tra Performance: Query time < 50ms, Cache hit rate > 80%
   - Kiểm tra Data Quality: Dữ liệu dịch chính xác, không thiếu

2. **Cắt rốn** - Drop các cột gốc khỏi bảng chính:
   ```sql
   -- ⚠️ BACKUP trước khi chạy
   BEGIN;

   -- Verify toàn bộ dữ liệu đã được dịch
   SELECT COUNT(*) FROM jobs
   WHERE id NOT IN (SELECT job_id FROM job_translations);
   -- Kết quả phải là 0

   -- Drop cột gốc
   ALTER TABLE jobs DROP COLUMN title;
   ALTER TABLE jobs DROP COLUMN description;

   ALTER TABLE organizations DROP COLUMN name;
   ALTER TABLE organizations DROP COLUMN description;
   ALTER TABLE organizations DROP COLUMN about;

   ALTER TABLE blog_posts DROP COLUMN title;
   ALTER TABLE blog_posts DROP COLUMN slug;
   ALTER TABLE blog_posts DROP COLUMN summary;
   ALTER TABLE blog_posts DROP COLUMN content;

   COMMIT;
   ```

3. **Update Code** - Loại bỏ fallback logic (vì dữ liệu gốc đã bị xóa):
   ```typescript
   // Cũ: COALESCE(jt.title, j.title)
   // Mới: jt.title (bắt buộc phải có translation)

   async findByIdWithTranslation(jobId: string, languageCode: string) {
     return this.prisma.$queryRaw`
       SELECT
         j.id,
         jt.title,  -- Không cần COALESCE nữa
         jt.description,
         j.salary_min,
         j.salary_max
       FROM jobs j
       INNER JOIN job_translations jt  -- INNER JOIN thay vì LEFT JOIN
         ON j.id = jt.job_id
         AND jt.language_code = ${languageCode}
       WHERE j.id = ${jobId}
     `;
   }
   ```

4. **Validation & Handoff:**
   ```bash
   npm run test:e2e  # Test toàn bộ flow
   npm run migration:verify  # Verify schema consistency
   ```

**Output:** Hệ thống chính thức đạt chuẩn **Strict i18n Architecture**.

---

## 5. Quản lý i18n Notification & Dynamic Content

### 5.1. Notification Template-based i18n

Thay vì lưu text trực tiếp vào DB, lưu **template key + variables**, rồi render khi cần:

```typescript
// src/interfaces/notification.ts
interface Notification {
  id: string;
  type: 'job_applied' | 'comment_reply' | 'job_expires' | ...;
  templateKey: string;  // VD: "job_applied"
  variables: Record<string, any>;
  recipientId: string;
  createdAt: Date;
}

interface NotificationTemplate {
  [language: string]: string;  // 'vi', 'en', ...
}

// src/config/notification-templates.ts
export const NOTIFICATION_TEMPLATES: Record<string, NotificationTemplate> = {
  'job_applied': {
    vi: '{{user}} vừa ứng tuyển vị trí {{job_title}} tại {{company_name}}',
    en: '{{user}} just applied for {{job_title}} at {{company_name}}'
  },
  'comment_reply': {
    vi: '{{user}} đã trả lời bình luận của bạn',
    en: '{{user}} replied to your comment'
  },
  'job_expires_soon': {
    vi: 'Vị trí {{job_title}} sắp hết hạn ứng tuyển ({{days}} ngày nữa)',
    en: 'Position {{job_title}} expires soon ({{days}} days left)'
  }
};

// src/services/notification.service.ts
@Injectable()
export class NotificationService {
  async renderNotification(
    notification: Notification,
    language: string
  ): Promise<string> {
    const template = NOTIFICATION_TEMPLATES[notification.templateKey]?.[language];
    if (!template) {
      // Fallback to Vietnamese
      return mustache.render(
        NOTIFICATION_TEMPLATES[notification.templateKey]['vi'],
        notification.variables
      );
    }
    return mustache.render(template, notification.variables);
  }

  async getUserNotifications(
    userId: string,
    language: string,
    limit: number = 20
  ): Promise<RenderedNotification[]> {
    const notifications = await this.prisma.notification.findMany({
      where: { recipientId: userId },
      take: limit,
      orderBy: { createdAt: 'desc' }
    });

    return Promise.all(
      notifications.map(async (notif) => ({
        ...notif,
        content: await this.renderNotification(notif, language)
      }))
    );
  }
}
```

### 5.2. User Preference i18n

```typescript
// Add language preference to users table
ALTER TABLE users ADD COLUMN preferred_language VARCHAR(5) DEFAULT 'vi';

// src/modules/auth/dto/user-preferences.dto.ts
export class UpdateUserPreferencesDto {
  preferredLanguage?: 'vi' | 'en' | string;  // Mở rộng cho ngôn ngữ khác
}

// src/modules/auth/services/auth.service.ts
async updateUserPreferences(
  userId: string,
  preferences: UpdateUserPreferencesDto
) {
  return this.prisma.user.update({
    where: { id: userId },
    data: {
      preferred_language: preferences.preferredLanguage,
    }
  });
}

// Middleware: Sử dụng preferredLanguage nếu không có Accept-Language
@Injectable()
export class I18nMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    let languageCode = req.headers['accept-language']?.split('-')[0].toLowerCase();

    // Fallback: Sử dụng user preference (nếu user đã login)
    if (!languageCode && req['user']) {
      languageCode = req['user'].preferred_language || 'vi';
    }

    req['languageCode'] = languageCode || 'vi';
    next();
  }
}
```

---

## 6. Cache Strategy

### 6.1. Redis Cache Keys

```
Format: [entity]:[id]:[language_code]

Ví dụ:
- job:550e8400-e29b-41d4-a716-446655440000:en
- job:550e8400-e29b-41d4-a716-446655440000:vi
- organization:550e8400-e29b-41d4-a716-446655440001:en
- blog_post:550e8400-e29b-41d4-a716-446655440002:vi
- notification:550e8400-e29b-41d4-a716-446655440003:en
```

### 6.2. Cache Invalidation Strategy

```typescript
// Khi có update/delete, invalidate matching patterns
async invalidateCaches(entityType: string, entityId: string) {
  const pattern = `${entityType}:${entityId}:*`;
  const keys = await this.redis.keys(pattern);

  if (keys.length > 0) {
    await this.redis.del(...keys);
  }
}

// Usage
async updateJob(jobId: string, updateDto: UpdateJobDto) {
  await this.jobsRepository.update(jobId, updateDto);

  // Invalidate cache for all languages
  await this.invalidateCaches('job', jobId);
}
```

### 6.3. TTL Policy

| Entity Type | TTL |
|-------------|-----|
| Master Data (Features, Provinces) | 30 days |
| Core Entities (Jobs, Organizations) | 24 hours |
| Blog Posts (FTS Search) | 12 hours |
| Notifications | 7 days |
| User Data (UGC) | 1 hour |

---

## 7. Testing Strategy

### 7.1. Unit Tests

```typescript
// test/services/jobs.service.spec.ts
describe('JobsService - i18n', () => {
  it('should return translated job title', async () => {
    const job = await jobsService.getJobDetail(jobId, 'en');
    expect(job.title).toBe('Software Engineer');  // English
  });

  it('should fallback to default language if translation missing', async () => {
    const job = await jobsService.getJobDetail(jobId, 'ja');
    expect(job.title).toBe('Kỹ sư Phần mềm');  // Vietnamese fallback
  });

  it('should cache translation results', async () => {
    const job1 = await jobsService.getJobDetail(jobId, 'en');
    const cacheHit = jest.spyOn(cacheService, 'get');

    const job2 = await jobsService.getJobDetail(jobId, 'en');

    expect(cacheHit).toHaveBeenCalled();
    expect(job1).toEqual(job2);
  });
});
```

### 7.2. E2E Tests

```typescript
// test/e2e/jobs.e2e.spec.ts
describe('Jobs API - i18n (E2E)', () => {
  it('GET /jobs/:id with Accept-Language: en', async () => {
    const response = await request(app.getHttpServer())
      .get(`/jobs/${jobId}`)
      .set('Accept-Language', 'en-US')
      .expect(200);

    expect(response.body.title).toMatch(/Engineer/);  // English
  });

  it('GET /jobs/:id with Accept-Language: vi', async () => {
    const response = await request(app.getHttpServer())
      .get(`/jobs/${jobId}`)
      .set('Accept-Language', 'vi-VN')
      .expect(200);

    expect(response.body.title).toMatch(/Kỹ sư/);  // Vietnamese
  });

  it('should publish translation event when creating job', async () => {
    const publishSpy = jest.spyOn(eventPublisher, 'publish');

    await request(app.getHttpServer())
      .post('/jobs')
      .send(createJobDto)
      .expect(201);

    expect(publishSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'job.created'
      })
    );
  });
});
```

---

## 8. Monitoring & Logging

### 8.1. Metrics to Track

```typescript
// src/common/decorators/track-i18n.decorator.ts
export function TrackI18n() {
  return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const startTime = Date.now();
      const languageCode = args[args.length - 1];  // Last argument

      try {
        const result = await originalMethod.apply(this, args);
        const duration = Date.now() - startTime;

        // Track metrics
        prometheus.histogram('i18n_query_duration_ms', {
          entity: propertyKey,
          language: languageCode
        }).observe(duration);

        prometheus.counter('i18n_query_success', {
          entity: propertyKey,
          language: languageCode
        }).inc();

        return result;
      } catch (error) {
        prometheus.counter('i18n_query_error', {
          entity: propertyKey,
          language: languageCode,
          error: error.message
        }).inc();

        throw error;
      }
    };

    return descriptor;
  };
}
```

### 8.2. Log Format

```typescript
logger.info('i18n.query', {
  entity: 'job',
  entityId: '550e8400-e29b-41d4-a716-446655440000',
  language: 'en',
  cacheHit: true,
  duration: 5,  // ms
  timestamp: new Date().toISOString()
});

logger.warn('i18n.translation_missing', {
  entity: 'job',
  entityId: '550e8400-e29b-41d4-a716-446655440000',
  language: 'ja',
  fallbackTo: 'vi',
  timestamp: new Date().toISOString()
});

logger.error('i18n.translation_failed', {
  entity: 'job',
  entityId: '550e8400-e29b-41d4-a716-446655440000',
  error: 'Translation API timeout',
  timestamp: new Date().toISOString()
});
```

---

## 9. Configuration & Environment Variables

```bash
# .env
# i18n Configuration
I18N_SUPPORTED_LANGUAGES=vi,en,ja,ko
I18N_DEFAULT_LANGUAGE=vi
I18N_CACHE_TTL_HOURS=24
I18N_REDIS_KEY_PREFIX=i18n

# Translation Service
TRANSLATION_SERVICE=google  # google, deepl, openai
GOOGLE_TRANSLATE_API_KEY=xxxxxxxxxxxx
DEEPL_API_KEY=xxxxxxxxxxxx

# Message Queue
MESSAGE_BROKER=kafka  # kafka, rabbitmq, redis
KAFKA_BROKERS=localhost:9092
KAFKA_TOPICS=job.created,organization.created

# Cache
REDIS_URL=redis://localhost:6379
CACHE_DEFAULT_TTL=3600
```

---

## 10. Future Enhancements

1. **Machine Learning untuk Language Detection:** Tự động detect ngôn ngữ gốc của text
2. **Multi-language Search (FTS):** Full-Text Search hỗ trợ nhiều ngôn ngữ đồng thời
3. **Admin Dashboard:** Quản lý translation status, approve/reject dịch thuật
4. **A/B Testing:** Test impact của translation quality trên user engagement
5. **Community Translation:** Cho phép user đóng góp translation (crowdsourcing)
6. **Regional Variants:** Support `en-US` vs `en-GB` vs `en-AU` etc.
7. **Currency & Date Localization:** Tự động convert currency, date format theo locale

---

## Tóm tắt Timeline

| Giai đoạn | Tuần | Công việc | Người chịu trách nhiệm |
|-----------|------|----------|----------------------|
| 1 | Tuần 1 | Schema + Static Data | Backend Lead |
| 2 | Tuần 2 | ETL Offline | Data Engineer |
| 3 | Tuần 3 | Async Worker | Backend Dev |
| 4 | Tuần 4 | Read Path + Caching | Backend Dev |
| 5 | Tuần 5 | Monitoring + Cleanup | Backend Lead |

**Tổng thời gian:** ~5 tuần từ planning đến production-ready.

---

**Document Version:** 1.0
**Last Updated:** May 2026
**Status:** Ready for Implementation
