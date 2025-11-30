# Plan: Lưu trữ và Quản lý CV Tối ưu hóa

## 1. Tổng quan Hệ thống

### Phân biệt 2 loại CV:

- **CV Upload**: CV gốc người dùng tải lên (file PDF/DOCX)
- **CV Optimized**: CV đã được AI tối ưu hóa (JSON data)

### Mục tiêu:

- Lưu trữ response từ AI service (JSON format)
- Cho phép người dùng chỉnh sửa CV đã tối ưu
- Quản lý nhiều phiên bản CV cho các công việc khác nhau
- Phân quyền: User chỉ truy cập CV của mình

---

## 2. Database Schema

### Table: `user_cvs`

```sql
CREATE TABLE user_cvs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Metadata
  title VARCHAR(255) NOT NULL,                    -- "CV cho DevOps Engineer 2025"
  target_job_title VARCHAR(255),                  -- From AI: "Fresher Fullstack Developer"

  -- CV Data (JSON)
  cv_data JSONB NOT NULL,                         -- Complete optimized CV from AI

  -- AI Analysis Results
  ats_score INTEGER,                              -- 0-100
  matching_skills TEXT[],                         -- ["Java", "Docker"]
  missing_skills TEXT[],                          -- ["AWS", "Kubernetes"]
  recommendation TEXT,                            -- AI suggestion

  -- Original Context
  job_description TEXT,                           -- Job description used for optimization
  original_cv_filename VARCHAR(255),              -- Original uploaded file name

  -- Settings
  language VARCHAR(10) DEFAULT 'vi',              -- 'vi' | 'en'
  is_favorite BOOLEAN DEFAULT false,

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  last_edited_at TIMESTAMP,                       -- Track manual edits

  -- Indexes
  INDEX idx_user_cvs_user_id (user_id),
  INDEX idx_user_cvs_created_at (created_at DESC),
  INDEX idx_user_cvs_favorite (user_id, is_favorite) WHERE is_favorite = true
);
```

### Table: `cv_edit_history` (Optional - Version tracking)

```sql
CREATE TABLE cv_edit_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cv_id UUID NOT NULL REFERENCES user_cvs(id) ON DELETE CASCADE,

  -- Version Info
  version_number INTEGER NOT NULL,                -- 1, 2, 3...
  cv_data_snapshot JSONB NOT NULL,                -- CV data at this version

  -- Change Tracking
  changed_fields JSONB,                           -- { "summary": true, "experience[0].achievements": true }
  edit_note TEXT,                                 -- User note: "Updated skills for senior position"

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),

  INDEX idx_cv_history_cv_id (cv_id, version_number DESC)
);
```

---

## 3. API Endpoints

### A. Lưu CV đã tối ưu

```typescript
POST /api/v1/cv/optimized/save
Authorization: Bearer {token}

Request Body:
{
  title: string;                    // Required: "CV for Google SWE"
  cvData: OptimizedCvDataDto;       // From AI response
  atsScore: number;
  matchingSkills: string[];
  missingSkills: string[];
  recommendation: string;
  jobDescription: string;
  originalFilename: string;
  language: 'vi' | 'en';
}

Response:
{
  data: {
    id: string;
    title: string;
    createdAt: string;
  },
  message: "CV saved successfully"
}
```

### B. Lấy danh sách CV đã lưu

```typescript
GET /api/v1/cv/optimized?page=1&limit=10&sortBy=created_at&order=desc&favorite=false
Authorization: Bearer {token}

Response:
{
  data: {
    items: [
      {
        id: string;
        title: string;
        targetJobTitle: string | null;
        atsScore: number;
        language: string;
        isFavorite: boolean;
        createdAt: string;
        updatedAt: string;
        lastEditedAt: string | null;
      }
    ],
    total: number;
    page: number;
    limit: number;
  }
}
```

### C. Lấy chi tiết 1 CV

```typescript
GET /api/v1/cv/optimized/:id
Authorization: Bearer {token}

Response:
{
  data: {
    id: string;
    title: string;
    targetJobTitle: string | null;
    cvData: OptimizedCvDataDto;      // Full CV data
    atsScore: number;
    matchingSkills: string[];
    missingSkills: string[];
    recommendation: string;
    jobDescription: string;
    originalFilename: string;
    language: string;
    isFavorite: boolean;
    createdAt: string;
    updatedAt: string;
    lastEditedAt: string | null;
  }
}
```

### D. Cập nhật CV (chỉnh sửa)

```typescript
PUT /api/v1/cv/optimized/:id
Authorization: Bearer {token}

Request Body:
{
  title?: string;
  cvData?: OptimizedCvDataDto;      // Modified CV data
  isFavorite?: boolean;
  editNote?: string;                // Optional: "Updated for senior role"
}

Response:
{
  data: {
    id: string;
    updatedAt: string;
    lastEditedAt: string;
  },
  message: "CV updated successfully"
}
```

### E. Xóa CV

```typescript
DELETE /api/v1/cv/optimized/:id
Authorization: Bearer {token}

Response:
{
  message: "CV deleted successfully"
}
```

### F. Nhân bản CV

```typescript
POST /api/v1/cv/optimized/:id/duplicate
Authorization: Bearer {token}

Request Body:
{
  title: string;                    // "Copy of CV for Backend Engineer"
}

Response:
{
  data: {
    id: string;                     // New CV ID
    title: string;
    createdAt: string;
  }
}
```

### G. Toggle favorite

```typescript
PATCH /api/v1/cv/optimized/:id/favorite
Authorization: Bearer {token}

Request Body:
{
  isFavorite: boolean;
}

Response:
{
  message: "Favorite status updated"
}
```

---

## 4. File Structure

```
src/
├── core/
│   └── entities/
│       ├── optimized-cv.entity.ts          # OptimizedCV entity
│       └── cv-edit-history.entity.ts       # CVEditHistory entity (optional)
│
├── frameworks/
│   └── data-services/
│       └── drizzle/
│           └── schemas/
│               ├── optimized-cv.schema.ts   # Drizzle schema
│               └── cv-edit-history.schema.ts
│
├── use-cases/
│   └── cv/
│       ├── cv-optimize.use-case.ts         # Existing - optimize CV
│       ├── optimized-cv-save.use-case.ts   # Save optimized CV
│       ├── optimized-cv-list.use-case.ts   # List user's CVs
│       ├── optimized-cv-get.use-case.ts    # Get single CV
│       ├── optimized-cv-update.use-case.ts # Update CV
│       ├── optimized-cv-delete.use-case.ts # Delete CV
│       └── optimized-cv-duplicate.use-case.ts # Duplicate CV
│
└── interfaces/
    ├── controllers/
    │   └── cv/
    │       ├── cv.controller.ts            # Existing endpoints
    │       └── optimized-cv.controller.ts  # New endpoints for CV management
    │
    └── dtos/
        └── cv/
            ├── save-optimized-cv.dto.ts    # SaveOptimizedCvDto
            ├── update-optimized-cv.dto.ts  # UpdateOptimizedCvDto
            ├── list-optimized-cv.dto.ts    # Query params & response
            └── optimized-cv-response.dto.ts # Detail response
```

---

## 5. Business Logic Flow

### Flow 1: Tối ưu và lưu CV

```
1. User upload CV → POST /cv/optimize-ats
2. Backend gọi AI service → nhận response (cvData, atsScore, etc.)
3. Frontend hiển thị kết quả
4. User click "Lưu CV" → POST /cv/optimized/save
5. Backend lưu vào database
6. Frontend redirect to CV list hoặc CV detail page
```

### Flow 2: Xem và chỉnh sửa CV đã lưu

```
1. User vào trang "CV của tôi" → GET /cv/optimized
2. Frontend hiển thị danh sách CV cards
3. User click vào 1 CV → GET /cv/optimized/:id
4. Frontend hiển thị CV detail với edit mode
5. User chỉnh sửa (summary, experience, skills, etc.)
6. User click "Lưu" → PUT /cv/optimized/:id
7. Backend cập nhật database, có thể lưu version history
```

### Flow 3: Tạo CV mới từ CV đã lưu

```
1. User click "Nhân bản" trên CV card → POST /cv/optimized/:id/duplicate
2. Backend copy CV data, tạo record mới
3. User có thể chỉnh sửa bản copy này cho job khác
```

---

## 6. Frontend Features

### A. CV List Page

- Grid/List view hiển thị các CV đã lưu
- Filter: Favorite, Language, Date range
- Sort: Created date, ATS score, Title
- Search: By title, target job title
- Actions: View, Edit, Duplicate, Delete, Toggle favorite

### B. CV Detail/Edit Page

- View mode: Hiển thị CV đã format đẹp
- Edit mode: Form để chỉnh sửa từng field
- Sections:
  - Personal Info
  - Target Job Title (display only - from AI)
  - Summary (editable)
  - Experience (add/edit/delete/reorder)
  - Education (add/edit/delete)
  - Skills (edit categories & items)
  - Projects (add/edit/delete)
  - Certificates (add/edit/delete)
- Sidebar: ATS Score, Matching/Missing skills, Recommendation
- Actions: Save, Cancel, Download PDF, Duplicate

### C. CV Card Component

```
┌─────────────────────────────────┐
│ ⭐ CV for DevOps Engineer 2025  │ ← Title + Favorite icon
│ Target: Senior DevOps Engineer  │ ← Target job title
│ ATS Score: 85/100               │ ← Score with color
│ Cập nhật: 2 ngày trước          │ ← Last updated
│ [Xem] [Sửa] [Nhân bản] [...]   │ ← Actions
└─────────────────────────────────┘
```

---

## 7. Validation & Security

### Validation Rules:

- User chỉ truy cập CV của mình (check `user_id` from JWT)
- Title: Max 255 chars, required
- CV data: Validate structure matches OptimizedCvDataDto
- Limit: Max 50 CVs per user (prevent spam)
- Rate limiting: Max 10 saves per hour

### Authorization:

```typescript
@UseGuards(JwtAuthGuard)
@Get('optimized/:id')
async getOptimizedCv(@Param('id') id: string, @GetUser() user: TokenPayload) {
  // Verify CV belongs to user
  const cv = await this.service.getCv(id);
  if (cv.userId !== user.id) {
    throw new ForbiddenException('Access denied');
  }
  return cv;
}
```

---

## 8. Migration Steps

### Phase 1: Database & Entities

1. Create migration file: `create_user_cvs_table.sql`
2. Run migration
3. Create entity classes
4. Create Drizzle schemas

### Phase 2: Use Cases & DTOs

1. Create DTOs for save/update/list
2. Implement use cases
3. Add validation pipes

### Phase 3: Controllers & Routes

1. Create new controller: `optimized-cv.controller.ts`
2. Wire up endpoints
3. Add Swagger documentation

### Phase 4: Testing

1. Unit tests for use cases
2. Integration tests for endpoints
3. Test authorization & validation

### Phase 5: Frontend Integration

1. Create CV list page
2. Create CV detail/edit page
3. Add save button to optimize result page
4. Test full flow

---

## 9. Advanced Features (Phase 2)

### A. Version History

- Track all edits with snapshots
- Allow rollback to previous versions
- Show diff between versions

### B. CV Templates

- Multiple PDF templates (professional, modern, creative)
- Template preview before download
- Custom styling options

### C. CV Comparison

- Compare 2 CV versions side-by-side
- Highlight differences
- Show ATS score changes

### D. AI Re-optimization

- Button: "Tối ưu lại với job mới"
- Use saved CV as base, apply to new job description
- Compare before/after

### E. Export Options

- PDF (client-side generation)
- Word (DOCX)
- JSON (for backup)
- Share link (public URL with token)

---

## 10. Performance Considerations

- **Pagination**: Always paginate CV list (default 10 items)
- **Indexing**: Index on `user_id`, `created_at`, `is_favorite`
- **JSONB Queries**: Use PostgreSQL JSONB operators for efficient queries
- **Caching**: Cache frequently accessed CVs (Redis)
- **Lazy Loading**: Load CV data only when viewing detail

---

## 11. Error Handling

```typescript
// Not Found
GET /cv/optimized/invalid-id → 404 Not Found

// Forbidden
GET /cv/optimized/other-user-cv → 403 Forbidden

// Validation Error
POST /cv/optimized/save with invalid data → 400 Bad Request

// Quota Exceeded
POST /cv/optimized/save (51st CV) → 400 Quota Exceeded
```

---

## 12. Implementation Priority

### Must Have (MVP):

- ✅ Save optimized CV
- ✅ List user's CVs
- ✅ Get CV detail
- ✅ Update CV
- ✅ Delete CV
- ✅ Authorization & validation

### Should Have:

- ⏳ Duplicate CV
- ⏳ Favorite toggle
- ⏳ Pagination & sorting
- ⏳ Search functionality

### Nice to Have:

- 🔮 Version history
- 🔮 CV comparison
- 🔮 AI re-optimization
- 🔮 Export to Word/PDF
- 🔮 Share link

---

**Created**: 2025-11-30
**Status**: Planning Phase
