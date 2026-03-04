# Job API Documentation

> **Document dành cho Frontend để đối chiếu và sync các API liên quan đến Job**
>
> **Base URL**: Tùy thuộc environment:
>
> - Local: `http://localhost:3000/api/v1`
> - Development: `https://your-dev-domain/api/v1`
> - Production: `https://your-prod-domain/api/v1`

**Authentication**: Hầu hết các endpoints yêu cầu Bearer Token trong header:

```
Authorization: Bearer <your-access-token>
```

---

## 📋 Table of Contents

1. [Tạo Job (Create Job)](#1-tạo-job-create-job)
2. [Cập nhật Job (Update Job)](#2-cập-nhật-job-update-job)
3. [Lấy danh sách Jobs (Get Jobs)](#3-lấy-danh-sách-jobs-get-jobs)
4. [Lấy chi tiết Job (Get Job Detail)](#4-lấy-chi-tiết-job-get-job-detail)
5. [Apply Job](#5-apply-job)
6. [Lấy danh sách Job đã Apply](#6-lấy-danh-sách-job-đã-apply)
7. [Lấy danh sách Job đã Save](#7-lấy-danh-sách-job-đã-save)
8. [Save/Unsave Job](#8-saveunsave-job)
9. [Hide/Unhide Job](#9-hideunhide-job)
10. [Cập nhật Apply Job Status](#10-cập-nhật-apply-job-status)
11. [Lấy Apply Job theo ID](#11-lấy-apply-job-theo-id)
12. [Lấy danh sách Apply theo Job ID](#12-lấy-danh-sách-apply-theo-job-id)
13. [Xóa Job (Delete Job)](#13-xóa-job-delete-job)
14. [Get Job Statistics](#14-get-job-statistics)
15. [Get Top In Market](#15-get-top-in-market)
16. [Get Saved Jobs Count](#16-get-saved-jobs-count)
17. [Get Applied Jobs Count](#17-get-applied-jobs-count)

---

## 1. Tạo Job (Create Job)

**Endpoint**: `POST /jobs`

**Authentication**: Required (JWT Bearer Token)

**Request Body**:

```typescript
{
  title: string;                    // Tiêu đề công việc
  description?: object;             // Mô tả công việc (JSON format)
  organizationId: string;           // UUID của organization
  salaryMin?: string | null;        // Lương tối thiểu (string để hỗ trợ số lớn)
  salaryMax?: string | null;        // Lương tối đa
  experienceMin?: number | null;    // Số năm kinh nghiệm tối thiểu
  experienceMax?: number | null;    // Số năm kinh nghiệm tối đa
  endDate?: string | null;          // Ngày kết thúc (ISO date format)
  workType?: "remote" | "onsite" | "hybrid"; // Loại hình làm việc
  provinceIds?: string[] | null;    // Mảng UUID của provinces
  questions?: string[] | null;      // Câu hỏi cho ứng viên
  skillIds?: string[] | null;       // Mảng UUID của skills
  categoryId?: string | null;       // UUID của category
}
```

**Example Request**:

```bash
curl -X POST https://api.example.com/api/v1/jobs \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Senior Frontend Developer",
    "description": {
      "content": "We are looking for an experienced frontend developer..."
    },
    "organizationId": "550e8400-e29b-41d4-a716-446655440000",
    "salaryMin": "25000000",
    "salaryMax": "40000000",
    "experienceMin": 3,
    "experienceMax": 5,
    "endDate": "2024-12-31",
    "workType": "remote",
    "provinceIds": ["province-uuid-1", "province-uuid-2"],
    "questions": [
      "What is your experience with React?",
      "How do you handle state management?"
    ],
    "skillIds": ["skill-uuid-1", "skill-uuid-2"],
    "categoryId": "category-uuid-1"
  }'
```

**Response** (200 OK):

```typescript
{
  success: true;
  data: {
    id: string;                     // UUID của job
    title: string;
    description: object | null;
    organizationId: string;
    salaryMin: string | null;
    salaryMax: string | null;
    experienceMin: number | null;
    experienceMax: number | null;
    datePosted: string | null;
    endDate: string | null;
    createdAt: string;              // ISO date
    updatedAt: string | null;
    deletedAt: string | null;
    workType: "remote" | "onsite" | "hybrid" | null;
    experienceYear: number | null;
    jobRawId: number | null;
    applyUrl: string | null;
    status: "active" | "inactive" | "pending" | "rejected";
    questions: string[] | null;
    rejectReason: string | null;
  };
  message: string;
}
```

---

## 2. Cập nhật Job (Update Job)

**Endpoint**: `PUT /jobs/:id`

**Authentication**: Required (JWT Bearer Token)

**⚠️ Important Note**: **Chỉ ADMIN/SUPER_ADMIN được phép cập nhật `status` của Job**. User thường chỉ có thể cập nhật các field khác.

**URL Parameters**:

- `id` (string): UUID của job cần update

**Request Body** (tất cả fields đều optional):

```typescript
{
  title?: string;
  description?: object;
  companyId?: string;               // UUID
  salaryMin?: string | null;
  salaryMax?: string | null;
  experienceMin?: number | null;
  experienceMax?: number | null;
  datePosted?: string | null;       // ISO date format
  endDate?: string | null;
  workType?: "remote" | "onsite" | "hybrid";
  applyUrl?: string | null;
  status?: "active" | "inactive" | "pending" | "rejected"; // ⚠️ Admin only
  priority?: number | null;
  provinceIds?: string[] | null;
  questions?: string[] | null;
  skillIds?: string[] | null;
  rejectReason?: string | null;
  updateType?: "approval" | "rejected" | null;
}
```

**Example Request**:

```bash
curl -X PUT https://api.example.com/api/v1/jobs/550e8400-e29b-41d4-a716-446655440000 \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Senior Frontend Developer (Updated)",
    "salaryMax": "45000000",
    "endDate": "2025-01-31"
  }'
```

**Response** (200 OK):

```typescript
{
  success: true;
  data: {
    // Same structure as Create Job response
    id: string;
    title: string;
    // ... (all job fields)
  }
  message: string;
}
```

**Error Response** (403 Forbidden - khi non-admin cố update status):

```typescript
{
  success: false;
  message: "Only admin can update job status";
  code: "FORBIDDEN";
}
```

---

## 3. Lấy danh sách Jobs (Get Jobs)

**Endpoint**: `GET /jobs`

**Authentication**: Optional (có token thì trả thêm `isSaved`, `isApplied`)

**Query Parameters**:

```typescript
{
  // Pagination (cursor-based)
  cursor?: string;                  // Cursor cho page tiếp theo
  limit?: number;                   // Số lượng items (default: 10)

  // Filters
  search?: string;                  // Tìm kiếm theo title
  salaryMin?: number;               // Filter lương tối thiểu
  salaryMax?: number;               // Filter lương tối đa
  experienceMin?: number;           // Filter kinh nghiệm tối thiểu
  experienceMax?: number;           // Filter kinh nghiệm tối đa
  provinceId?: string;              // Filter theo province UUID
  companyId?: string;               // Filter theo company UUID
  organizationId?: string;          // Filter theo organization UUID
  workType?: "remote" | "onsite" | "hybrid";
  status?: "active" | "inactive" | "pending" | "rejected";
}
```

**Example Request**:

```bash
# Get first page
curl -X GET "https://api.example.com/api/v1/jobs?limit=20&workType=remote" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Get next page using cursor
curl -X GET "https://api.example.com/api/v1/jobs?limit=20&cursor=2024-01-15T10:30:00.000Z" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response** (200 OK):

```typescript
{
  success: true;
  data: {
    data: [
      {
        job: {
          id: string;
          title: string;
          description: object | null;
          organizationId: string;
          salaryMin: string | null;
          salaryMax: string | null;
          experienceMin: number | null;
          experienceMax: number | null;
          datePosted: string | null;
          endDate: string | null;
          createdAt: string;
          updatedAt: string | null;
          deletedAt: string | null;
          workType: "remote" | "onsite" | "hybrid" | null;
          experienceYear: number | null;
          jobRawId: number | null;
          applyUrl: string | null;
          status: "active" | "inactive" | "pending" | "rejected";
          questions: string[] | null;
          rejectReason: string | null;
        };
        provinces: [
          {
            id: string;
            name: string;
            nameEn: string | null;
            fullName: string | null;
            fullNameEn: string | null;
            codeName: string | null;
            administrativeUnitId: number | null;
            administrativeRegionId: number | null;
          }
        ];
        organization: {
          id: string;
          name: string;
          email: string | null;
          phone: string | null;
          address: string | null;
          website: string | null;
          description: string | null;
          logoUrl: string | null;
          coverUrl: string | null;
          isVerified: boolean;
          createdAt: string;
          updatedAt: string | null;
        };
        skills: [
          {
            id: string;
            name: string;
            description: string | null;
          }
        ];
        isSaved?: boolean;           // Chỉ có khi user authenticated
        isApplied?: boolean;         // Chỉ có khi user authenticated
        applyStatus?: string;        // Chỉ có khi user đã apply
        applyId?: string;            // Chỉ có khi user đã apply
      }
    ];
    pagination: {
      cursor: string | null;        // Cursor cho page tiếp theo (null nếu hết)
      limit: number;
      hasMore: boolean;             // true nếu còn data
    };
  };
  message: string;
}
```

---

## 4. Lấy chi tiết Job (Get Job Detail)

**Endpoint**: `GET /jobs/:id`

**Authentication**: Optional (có token thì trả thêm `isSaved`, `isApplied`)

**URL Parameters**:

- `id` (string): UUID của job

**Example Request**:

```bash
curl -X GET https://api.example.com/api/v1/jobs/550e8400-e29b-41d4-a716-446655440000 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response** (200 OK):

```typescript
{
  success: true;
  data: {
    job: {
      id: string;
      title: string;
      description: object | null;
      // ... (all job fields)
    };
    provinces: Province[];
    organization: OrganizationWithDetails;
    skills: Skill[];
    isSaved?: boolean;               // Chỉ có khi user authenticated
    isApplied?: boolean;             // Chỉ có khi user authenticated
    applyStatus?: string;            // "pending" | "approved" | "rejected"
    applyId?: string;                // UUID của application
  };
  message: string;
}
```

**Error Response** (404 Not Found):

```typescript
{
  success: false;
  message: "Job not found";
  code: "JOB_NOT_FOUND";
}
```

---

## 5. Apply Job

**Endpoint**: `POST /jobs/apply`

**Authentication**: Required (JWT Bearer Token)

**Request Body**:

```typescript
{
  jobId: string;                    // UUID của job
  cvId?: string;                    // UUID của CV (optional)
  answers?: [
    {
      question: string;
      answer: string;
    }
  ];
}
```

**Example Request**:

```bash
curl -X POST https://api.example.com/api/v1/jobs/apply \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "jobId": "550e8400-e29b-41d4-a716-446655440000",
    "cvId": "cv-uuid-123",
    "answers": [
      {
        "question": "What is your experience with React?",
        "answer": "I have 3 years of experience with React."
      },
      {
        "question": "How do you handle state management?",
        "answer": "I use Redux and Context API."
      }
    ]
  }'
```

**Response** (200 OK):

```typescript
{
  success: true;
  data: {
    id: string;                     // UUID của application
    jobId: string;
    status: "pending" | "approved" | "rejected";
    userCvId?: string;              // UUID của CV đã dùng
    answers?: [
      {
        question: string;
        answer: string;
      }
    ];
  };
  message: string;
}
```

---

## 6. Lấy danh sách Job đã Apply

**Endpoint**: `GET /jobs/applied`

**Authentication**: Required (JWT Bearer Token)

**Query Parameters**:

```typescript
{
  cursor?: string;                  // Cursor-based pagination
  limit?: number;                   // Default: 10
  search?: string;                  // Tìm kiếm theo title
}
```

**Example Request**:

```bash
curl -X GET "https://api.example.com/api/v1/jobs/applied?limit=20" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response** (200 OK):

```typescript
{
  success: true;
  data: {
    data: [
      {
        id: string;                 // Job ID
        title: string;
        salaryMin: string | null;
        salaryMax: string | null;
        companyName: string;
        logoUrl?: string;
        workType: "remote" | "onsite" | "hybrid";
        createdAt: string;
        endedAt?: string;
        provinceNames: string[];    // Tên các provinces
        isSaved: boolean;
        isApplied: boolean;         // Luôn true
        applyStatus: "pending" | "approved" | "rejected";
      }
    ];
    pagination: {
      cursor: string | null;
      limit: number;
      hasMore: boolean;
    };
  };
  message: string;
}
```

---

## 7. Lấy danh sách Job đã Save

**Endpoint**: `GET /jobs/saved`

**Authentication**: Required (JWT Bearer Token)

**Query Parameters**:

```typescript
{
  cursor?: string;                  // Cursor-based pagination
  limit?: number;                   // Default: 10
  search?: string;                  // Tìm kiếm theo title
}
```

**Example Request**:

```bash
curl -X GET "https://api.example.com/api/v1/jobs/saved?limit=20" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response** (200 OK):

```typescript
{
  success: true;
  data: {
    data: [
      {
        id: string;                 // Job ID
        title: string;
        salaryMin: string | null;
        salaryMax: string | null;
        companyName: string;
        logoUrl?: string;
        workType: "remote" | "onsite" | "hybrid";
        createdAt: string;
        endedAt?: string;
        provinceNames: string[];
        isSaved: boolean;           // Luôn true
        isApplied: boolean;
      }
    ];
    pagination: {
      cursor: string | null;
      limit: number;
      hasMore: boolean;
    };
  };
  message: string;
}
```

---

## 8. Save/Unsave Job

**Endpoint**: `POST /jobs/save`

**Authentication**: Required (JWT Bearer Token)

**Request Body**:

```typescript
{
  jobId: string;                    // UUID của job
  save?: boolean;                   // true = save, false = unsave (default: true)
}
```

**Example Request**:

```bash
# Save job
curl -X POST https://api.example.com/api/v1/jobs/save \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "jobId": "550e8400-e29b-41d4-a716-446655440000",
    "save": true
  }'

# Unsave job
curl -X POST https://api.example.com/api/v1/jobs/save \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "jobId": "550e8400-e29b-41d4-a716-446655440000",
    "save": false
  }'
```

**Response** (200 OK):

```typescript
{
  success: true;
  data: {
    id: string;                     // Interaction ID
    userId: string;
    jobId: string;
    type: "save";
  } | null;                         // null nếu unsave
  message: string;
}
```

---

## 9. Hide/Unhide Job

**Endpoint**: `POST /jobs/hide`

**Authentication**: Required (JWT Bearer Token)

**Request Body**:

```typescript
{
  jobId: string;                    // UUID của job
  hide?: boolean;                   // true = hide, false = unhide (default: true)
}
```

**Example Request**:

```bash
# Hide job
curl -X POST https://api.example.com/api/v1/jobs/hide \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "jobId": "550e8400-e29b-41d4-a716-446655440000",
    "hide": true
  }'
```

**Response** (200 OK):

```typescript
{
  success: true;
  data: {
    id: string;
    userId: string;
    jobId: string;
    type: "hide";
  } | null;                         // null nếu unhide
  message: string;
}
```

---

## 10. Cập nhật Apply Job Status

**Endpoint**: `PUT /jobs/apply/:applyId`

**Authentication**: Required (JWT Bearer Token)

**URL Parameters**:

- `applyId` (string): UUID của application

**Request Body**:

```typescript
{
  status?: "pending" | "approved" | "rejected";
  userCvId?: string;                // Chỉ update được khi status là "applied"
  answers?: [
    {
      question: string;
      answer: string;
    }
  ];
}
```

**Example Request**:

```bash
curl -X PUT https://api.example.com/api/v1/jobs/apply/apply-uuid-123 \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "approved"
  }'
```

**Response** (200 OK):

```typescript
{
  success: true;
  data: {
    id: string;
    jobId: string;
    status: "pending" | "approved" | "rejected";
    userCvId?: string;
    answers?: JobAnswerDto[];
  };
  message: string;
}
```

---

## 11. Lấy Apply Job theo ID

**Endpoint**: `GET /jobs/apply/:applyId`

**Authentication**: Required (JWT Bearer Token)

**URL Parameters**:

- `applyId` (string): UUID của application

**Example Request**:

```bash
curl -X GET https://api.example.com/api/v1/jobs/apply/apply-uuid-123 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response** (200 OK):

```typescript
{
  success: true;
  data: {
    id: string;
    jobId: string;
    status: "pending" | "approved" | "rejected";
    userCvId?: string;
    answers?: [
      {
        question: string;
        answer: string;
      }
    ];
  };
  message: string;
}
```

---

## 12. Lấy danh sách Apply theo Job ID

**Endpoint**: `GET /jobs/apply`

**Authentication**: Required (JWT Bearer Token)

**Query Parameters**:

```typescript
{
  jobId: string; // Required - UUID của job
}
```

**Example Request**:

```bash
curl -X GET "https://api.example.com/api/v1/jobs/apply?jobId=550e8400-e29b-41d4-a716-446655440000" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response** (200 OK):

```typescript
{
  success: true;
  data: [
    {
      id: string;
      jobId: string;
      status: "pending" | "approved" | "rejected";
      userCvId?: string;
      answers?: JobAnswerDto[];
    }
  ];
  message: string;
}
```

---

## 13. Xóa Job (Delete Job)

**Endpoint**: `DELETE /jobs/:id`

**Authentication**: Required (JWT Bearer Token)

**URL Parameters**:

- `id` (string): UUID của job

**Query Parameters**:

```typescript
{
  organizationId: string; // Required - UUID của organization
}
```

**Example Request**:

```bash
curl -X DELETE "https://api.example.com/api/v1/jobs/550e8400-e29b-41d4-a716-446655440000?organizationId=org-uuid-123" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response** (200 OK):

```typescript
{
  success: true;
  data: {
    message: "Job deleted successfully";
  }
  message: string;
}
```

---

## 14. Get Job Statistics

**Endpoint**: `GET /jobs/statistics`

**Authentication**: Not required

**Query Parameters**:

```typescript
{
  // Add filter parameters as needed
}
```

**Example Request**:

```bash
curl -X GET "https://api.example.com/api/v1/jobs/statistics"
```

**Response** (200 OK):

```typescript
{
  success: true;
  data: {
    // Statistics data structure
    // (Depends on implementation)
  }
  message: string;
}
```

---

## 15. Get Top In Market

**Endpoint**: `GET /jobs/statistics/top-in-market`

**Authentication**: Not required

**Example Request**:

```bash
curl -X GET "https://api.example.com/api/v1/jobs/statistics/top-in-market"
```

**Response** (200 OK):

```typescript
{
  success: true;
  data: {
    topAppliedJobs: Job[];
    topEmployers: Organization[];
    topCategories: Category[];
  };
  message: string;
}
```

---

## 16. Get Saved Jobs Count

**Endpoint**: `GET /jobs/saved/count`

**Authentication**: Required (JWT Bearer Token)

**Example Request**:

```bash
curl -X GET "https://api.example.com/api/v1/jobs/saved/count" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response** (200 OK):

```typescript
{
  success: true;
  data: number; // Số lượng jobs đã save
  message: string;
}
```

---

## 17. Get Applied Jobs Count

**Endpoint**: `GET /jobs/applied/count`

**Authentication**: Required (JWT Bearer Token)

**Example Request**:

```bash
curl -X GET "https://api.example.com/api/v1/jobs/applied/count" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response** (200 OK):

```typescript
{
  success: true;
  data: number; // Số lượng jobs đã apply
  message: string;
}
```

---

## 📝 Common Types & Enums

### JobStatusEnum

```typescript
enum JobStatusEnum {
  ACTIVE = "active",
  INACTIVE = "inactive",
  PENDING = "pending",
  REJECTED = "rejected",
}
```

### WorkTypeEnum

```typescript
enum WorkTypeEnum {
  REMOTE = "remote",
  ONSITE = "onsite",
  HYBRID = "hybrid",
}
```

### ApplyStatusEnum

```typescript
enum ApplyStatusEnum {
  PENDING = "pending",
  APPROVED = "approved",
  REJECTED = "rejected",
}
```

---

## 🔒 Authorization Rules

1. **Create Job**: Authenticated users only
2. **Update Job**:
   - Authenticated users can update most fields
   - ⚠️ **Only ADMIN/SUPER_ADMIN can update `status` field**
3. **Delete Job**: Authenticated users (must be owner of organization)
4. **Apply Job**: Authenticated users only
5. **Save/Hide Job**: Authenticated users only
6. **Get Jobs**: Public (but authenticated users get `isSaved`, `isApplied` info)
7. **Get Job Detail**: Public (but authenticated users get `isSaved`, `isApplied` info)

---

## 🚨 Common Error Codes

| Code              | HTTP Status | Description                                     |
| ----------------- | ----------- | ----------------------------------------------- |
| `JOB_NOT_FOUND`   | 404         | Job không tồn tại hoặc đã bị xóa                |
| `FORBIDDEN`       | 403         | Không có quyền (ví dụ: non-admin update status) |
| `UNAUTHORIZED`    | 401         | Chưa đăng nhập hoặc token không hợp lệ          |
| `BAD_REQUEST`     | 400         | Dữ liệu request không hợp lệ                    |
| `JOB_NOT_UPDATED` | 400         | Không thể update job                            |

---

## 💡 Integration Tips

### 1. Cursor-based Pagination

```typescript
// First request
const response1 = await fetch("/api/v1/jobs?limit=20");
const { data, pagination } = response1.data;

// Check if có page tiếp theo
if (pagination.hasMore && pagination.cursor) {
  // Request page tiếp theo
  const response2 = await fetch(
    `/api/v1/jobs?limit=20&cursor=${pagination.cursor}`,
  );
}
```

### 2. Handle Authentication

```typescript
const headers = {
  "Content-Type": "application/json",
  Authorization: `Bearer ${accessToken}`,
};

const response = await fetch("/api/v1/jobs", { headers });
```

### 3. Error Handling

```typescript
try {
  const response = await fetch("/api/v1/jobs/123");
  const result = await response.json();

  if (!result.success) {
    // Handle API error
    console.error(result.message, result.code);
  }
} catch (error) {
  // Handle network error
  console.error("Network error:", error);
}
```

### 4. TypeScript Types

```typescript
// Recommend tạo file types/job.ts
export interface Job {
  id: string;
  title: string;
  description: object | null;
  organizationId: string;
  salaryMin: string | null;
  salaryMax: string | null;
  experienceMin: number | null;
  experienceMax: number | null;
  datePosted: string | null;
  endDate: string | null;
  createdAt: string;
  updatedAt: string | null;
  deletedAt: string | null;
  workType: WorkTypeEnum | null;
  experienceYear: number | null;
  jobRawId: number | null;
  applyUrl: string | null;
  status: JobStatusEnum;
  questions: string[] | null;
  rejectReason: string | null;
}

export interface JobResponse {
  job: Job;
  provinces: Province[];
  organization: Organization;
  skills: Skill[];
  isSaved?: boolean;
  isApplied?: boolean;
  applyStatus?: ApplyStatusEnum;
  applyId?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
}
```

---

## 📞 Support

Nếu có vấn đề hoặc cần clarify thêm về API, vui lòng liên hệ Backend team hoặc tạo issue trên repository.

**Last Updated**: December 15, 2025
