# Job Salary Insight

Tính năng cung cấp **thông tin lương thị trường** cho một tin tuyển dụng của tổ chức: so sánh mức lương của job hiện tại với **trung vị lương của các job tương đương** (cùng lĩnh vực / khu vực / mức kinh nghiệm) đã đăng trong khoảng thời gian gần đây.

Nhà tuyển dụng mở tab **"Thông tin thị trường"** trên một job → hệ thống truy vấn Elasticsearch, tính khoảng lương phổ biến (P25–P50–P75) của các job so sánh được, và trả về kết luận job đang trả **thấp hơn / ngang bằng / cao hơn** thị trường.

---

## 1. Kiến trúc tổng quan

```
Web (insight-panel.tsx)
  └─ useSalaryInsight()  ──► GET /organizations/:orgId/jobs/:jobId/salary-insight
                                    │
                        OrganizationJobController.getSalaryInsight
                                    │
                          JobUseCases.getSalaryInsight        ← quyền + lấy job hiện tại + gọi ES + build DTO
                                    │
                    ┌───────────────┴────────────────┐
        JobSearchService.getSalaryInsight     buildSalaryInsightDto (pure helper)
          (widening fallback qua ES)            (so sánh + gate ngưỡng mẫu)
                                    │
                    Elasticsearch (percentiles aggregation)
```

| Lớp | File |
| --- | --- |
| Controller | `src/interfaces/controllers/job/organization-job-controller.ts` |
| Use-case | `src/use-cases/job/job.use-case.ts` → `getSalaryInsight()` |
| Build DTO (pure) | `src/use-cases/job/job-salary-insight.helper.ts` |
| ES service | `src/frameworks/data-services/elasticsearch/domains/jobs/job-search.service.ts` → `getSalaryInsight()` |
| ES query builder (pure) | `src/frameworks/data-services/elasticsearch/domains/jobs/job-salary-insight-query.helper.ts` |
| Abstract + criteria | `src/core/abstracts/job-search-service.abstract.ts` |
| Aggregation result entity | `src/core/entities/job-salary-insight.entity.ts` |
| Response DTO (Swagger) | `src/interfaces/dtos/jobs/res/job-salary-insight.dto.ts` |
| Frontend panel | `airecruit-frontend/apps/airecruit/.../jobs/_components/insight-panel.tsx` |
| Frontend hook / API | `.../dashboard/_hooks/use-job.ts` → `useSalaryInsight`; `src/api/jobs.ts` → `JobApi.getSalaryInsight` |
| Frontend types | `airecruit-frontend/packages/core/src/types/job.ts` → `JobSalaryInsight*` |
| i18n | `apps/airecruit/src/locales/translations/{vi,en}/organization.json` → `organization.jobs.insight` |

---

## 2. API

**`GET /organizations/:orgId/jobs/:jobId/salary-insight`**

- Guard: `JwtAuthGuard` + `OrganizationAuthorizeGuard` (caller phải là thành viên tổ chức)
- Use-case còn kiểm tra `job.organizationId === orgId` → 403 nếu không khớp; job không tồn tại/đã xoá → 400 `JOB_NOT_FOUND`

### Response shape (`JobSalaryInsightDto`)

```jsonc
{
  "sampleCount": 42,                 // số job so sánh được ở tier cuối cùng đã dùng
  "currency": "VND",                 // cố định — dữ liệu lương chỉ VND, theo tháng
  "matchTier": "regional",           // "exact" | "regional" | "category" | null
  "market": {                        // null nếu không đủ dữ liệu
    "medianMidpoint": 18000000,      // P50 của midpoint (salaryMin+salaryMax)/2
    "rangeLow": 15000000,            // P25
    "rangeHigh": 22000000            // P75
  },
  "current": {                       // null nếu job chưa khai báo lương
    "salaryMin": 12000000,
    "salaryMax": 20000000,
    "midpoint": 16000000
  },
  "comparison": "below"              // "below" | "at" | "above" | null
}
```

**`matchTier`** cho biết mức độ chặt của tập job so sánh (xem §4):

| Tier | Điều kiện lọc |
| --- | --- |
| `exact` | cùng lĩnh vực **+** khu vực **+** khoảng kinh nghiệm |
| `regional` | cùng lĩnh vực **+** khoảng kinh nghiệm |
| `category` | cùng lĩnh vực |
| `null` | không đủ mẫu ở bất kỳ tier nào |

---

## 3. Định nghĩa "job tương đương" (ES query)

File: `job-salary-insight-query.helper.ts`

### Base filters (áp dụng mọi tier)

- `status = active`
- Đăng trong **N tháng gần đây** (`SALARY_INSIGHT_LOOKBACK_MONTHS`, mặc định 12): dùng `datePosted >= fromDate`; job không có `datePosted` thì fallback theo `createdAt >= fromDate`
- **Loại job "thoả thuận":** `salaryMin > 0` **và** `salaryMax > 0` — job thoả thuận lưu 0/null sẽ làm lệch trung vị nên bị loại (thay cho `exists` cũ)
- Loại chính job đang xem (`must_not id = excludeJobId`)

### Tier filters (chặt dần)

```ts
exact:    [category, provinces, experienceOverlap]
regional: [category,           experienceOverlap]
category: [category]
```

Trong đó **experienceOverlap** = khoảng kinh nghiệm của job hiện tại giao với job so sánh:
`experienceMin <= job.experienceMax` **và** `experienceMax >= job.experienceMin`.

> **Vì sao dùng `filter` chứ không `should`+boost:** query chạy với `size: 0` (chỉ lấy aggregation, không lấy hit). Aggregation `percentiles` **không hề quan tâm `_score`** nên `should`/`boost` hoàn toàn vô tác dụng ở đây — chỉ `filter`/`must` mới thực sự thu hẹp tập tài liệu tham gia tính trung vị. Skill đã được bỏ khỏi tiêu chí vì không đóng góp ý nghĩa thống kê.

### Aggregation (nhất quán nội tại)

Một aggregation `percentiles` duy nhất trên **midpoint** `(salaryMin + salaryMax) / 2`, lấy `[25, 50, 75]`:

```jsonc
"aggs": {
  "midpoint_percentiles": {
    "percentiles": {
      "script": { "lang": "painless",
                  "source": "(doc['salaryMin'].value + doc['salaryMax'].value) / 2.0" },
      "percents": [25, 50, 75]
    }
  }
}
```

`parseSalaryInsightResponse` map `values["25.0"]→rangeLow`, `["50.0"]→medianMidpoint`, `["75.0"]→rangeHigh`. Vì cùng tính trên **một** trường midpoint nên luôn đảm bảo `rangeLow ≤ medianMidpoint ≤ rangeHigh`.

> Percentile của ES dựa trên xấp xỉ TDigest (không tuyệt đối chính xác) — chấp nhận được cho mục đích "insight" tham khảo.

---

## 4. Widening fallback + ngưỡng mẫu tối thiểu

File: `job-search.service.ts` → `getSalaryInsight()`

Duyệt tier từ chặt → lỏng (`exact → regional → category`), dừng ở tier **đầu tiên** đạt `sampleCount >= MIN_SAMPLE_COUNT` và trả kèm `matchTier` tương ứng:

```
for tier in [exact, regional, category]:
    result = query(tier)
    if result.sampleCount >= minSampleCount: return result   # đủ mẫu → dùng luôn
return lastResult   # hết tier vẫn thiếu → trả tier lỏng nhất, use-case quyết định "không đủ dữ liệu"
```

`buildSalaryInsightDto` chốt lại gate: chỉ coi là có `market` khi
`sampleCount >= minSampleCount` **và** cả 3 percentile đều có giá trị. Không đạt → `market = null`, `matchTier = null`, `comparison = null` → FE hiển thị "Chưa đủ dữ liệu".

---

## 5. Logic so sánh (below / at / above)

File: `job-salary-insight.helper.ts`

- Tính `currentMidpoint = (salaryMin + salaryMax) / 2` của job hiện tại (null nếu job chưa khai lương)
- `diffRatio = (currentMidpoint − medianMidpoint) / medianMidpoint`
- Ngưỡng `AT_MARKET_THRESHOLD_RATIO` (mặc định `0.05` = 5%):
  - `diffRatio < −5%` → **below**
  - `diffRatio > +5%` → **above**
  - còn lại → **at**
- Job chưa khai lương → `current = null`, `comparison = null` (vẫn trả `market` để nhà tuyển dụng tham khảo)

---

## 6. Cấu hình (ConfigService / env)

Tất cả ngưỡng đọc từ `ConfigService`, có default nếu env không set — không cần redeploy để tinh chỉnh:

| Env key | Mặc định | Ý nghĩa |
| --- | --- | --- |
| `SALARY_INSIGHT_LOOKBACK_MONTHS` | `12` | Cửa sổ thời gian job so sánh (tháng) |
| `SALARY_INSIGHT_MIN_SAMPLE_COUNT` | `5` | Số job tối thiểu để coi là có dữ liệu thị trường |
| `SALARY_INSIGHT_AT_MARKET_THRESHOLD_RATIO` | `0.05` | Biên ±% quanh trung vị được coi là "ngang thị trường" |

Hằng default khai báo tại: `job-search.service.ts` (`*_DEFAULT`) và `job-salary-insight.helper.ts` (`DEFAULT_*`).

---

## 7. Frontend

- `useSalaryInsight(orgId, jobId, { enabled })` — `useSafeQuery`, key `JOBS_QUERY_KEYS.salaryInsight`
- `InsightPanel` hiển thị: trung vị thị trường (P50), khoảng phổ biến (P25–P75), lương job hiện tại, chip so sánh (below/at/above), số mẫu, và **caption `matchTier`** (i18n key `organization.jobs.insight.matchTier.{exact|regional|category}`)
- Khi `market` null → "Chưa đủ dữ liệu để so sánh với thị trường"

---

## 8. Test

`src/use-cases/job/job-salary-insight.helper.spec.ts` — 8 case: below/at/above, gate dưới ngưỡng mẫu (default + custom), sampleCount = 0, job không khai lương, thiếu trường percentile dù có mẫu.

---

## 9. Câu hỏi mở / lưu ý

- `MIN_SAMPLE_COUNT = 5` là đề xuất — lĩnh vực ít phổ biến có thể luôn rơi về tier `category` hoặc `null`; cần xác nhận với business.
- Đổi field DTO `medianMin/medianMax` → `rangeLow/rangeHigh` là **breaking change**; đã đồng bộ FE `apps/airecruit`. Nếu có consumer khác (mobile, admin) dùng tên field cũ thì cần rà thêm.
- Chỉ hỗ trợ **VND / theo tháng** — chưa chuẩn hoá currency/kỳ trả lương.
