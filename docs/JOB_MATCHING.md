# Job Matching với Elasticsearch - Kế hoạch Triển khai

## 📋 Tổng quan

Tài liệu này mô tả kế hoạch triển khai hệ thống tính điểm và xếp hạng user-job sử dụng Elasticsearch để tối ưu hiệu suất và độ chính xác của job matching.

## 🎯 Mục tiêu

1. **Tính điểm matching** giữa user và job dựa trên nhiều tiêu chí
2. **Xếp hạng kết quả** từ cao xuống thấp theo điểm số
3. **Tối ưu hiệu suất** với Elasticsearch thay vì query phức tạp trên PostgreSQL
4. **Mở rộng dễ dàng** cho các tiêu chí matching mới trong tương lai

## 🏗️ Kiến trúc

### 1. Luồng dữ liệu

```
PostgreSQL (Source of Truth)
    ↓
Elasticsearch Index (Search & Scoring)
    ↓
API Response (Ranked Jobs)
```

### 2. Các thành phần chính

- **Elasticsearch Index**: Lưu trữ và index jobs
- **Sync Service**: Đồng bộ dữ liệu từ PostgreSQL → Elasticsearch
- **Matching Service**: Tính điểm và query jobs phù hợp với user
- **Scoring Algorithm**: Công thức tính điểm matching

## 📊 Công thức Tính Điểm (Scoring Formula)

### Tổng điểm = Weighted Sum của các thành phần:

```
Total Score = 
  (Skill Match Score × 40%) +
  (Experience Match Score × 25%) +
  (Location Match Score × 15%) +
  (Salary Match Score × 10%) +
  (Education Match Score × 5%) +
  (Category Match Score × 5%)
```

### Chi tiết từng thành phần:

#### 1. Skill Match Score (40% - Quan trọng nhất)

```javascript
skillMatchScore = (matchedSkills / totalJobSkills) × 100

// Bonus cho skills có proficiency level cao
if (userSkill.proficiencyLevel === 'advanced') {
  skillMatchScore += 10
} else if (userSkill.proficiencyLevel === 'intermediate') {
  skillMatchScore += 5
}
```

#### 2. Experience Match Score (25%)

```javascript
if (userExperienceYears >= job.experienceMax) {
  experienceScore = 100
} else if (userExperienceYears >= job.experienceMin) {
  experienceScore = 80
} else if (userExperienceYears >= job.experienceMin * 0.7) {
  experienceScore = 50
} else {
  experienceScore = 20
}
```

#### 3. Location Match Score (15%)

```javascript
if (userProvinceId === job.provinceId) {
  locationScore = 100
} else if (userProvinceId in nearbyProvinces) {
  locationScore = 60
} else {
  locationScore = 0
}
```

#### 4. Salary Match Score (10%)

```javascript
userExpectedSalary = (userOnboarding.salaryExpectation || 0)
jobAvgSalary = (job.salaryMin + job.salaryMax) / 2

if (userExpectedSalary === 0) {
  salaryScore = 50 // Không có thông tin thì cho điểm trung bình
} else if (userExpectedSalary <= jobAvgSalary * 1.2) {
  salaryScore = 100
} else if (userExpectedSalary <= jobAvgSalary * 1.5) {
  salaryScore = 70
} else {
  salaryScore = 30
}
```

#### 5. Education Match Score (5%)

```javascript
if (userEducation.educationLevel >= job.requiredEducationLevel) {
  educationScore = 100
} else {
  educationScore = 50
}
```

#### 6. Category Match Score (5%)

```javascript
if (userPreferredCategories.includes(job.categoryId)) {
  categoryScore = 100
} else {
  categoryScore = 0
}
```

## 🔧 Cấu trúc Index Mapping

### Job Index Structure

```json
{
  "mappings": {
    "properties": {
      "id": { "type": "keyword" },
      "title": { 
        "type": "text",
        "fields": {
          "keyword": { "type": "keyword" }
        }
      },
      "description": { "type": "text" },
      "organizationId": { "type": "keyword" },
      "organizationName": { "type": "keyword" },
      "skillIds": { "type": "keyword" },
      "skillNames": { "type": "keyword" },
      "categoryIds": { "type": "keyword" },
      "provinceId": { "type": "keyword" },
      "provinceName": { "type": "keyword" },
      "salaryMin": { "type": "float" },
      "salaryMax": { "type": "float" },
      "experienceMin": { "type": "integer" },
      "experienceMax": { "type": "integer" },
      "workType": { "type": "keyword" },
      "status": { "type": "keyword" },
      "endDate": { "type": "date" },
      "datePosted": { "type": "date" },
      "createdAt": { "type": "date" },
      "updatedAt": { "type": "date" }
    }
  }
}
```

## 📝 Kế hoạch Triển khai

### Phase 1: Setup & Infrastructure
#### 1.1 Cài đặt Elasticsearch Client

```bash
npm install @elastic/elasticsearch
```

#### 1.2 Tạo Elasticsearch Module

- `src/frameworks/data-services/elasticsearch/`
  - `elasticsearch.module.ts` - Module configuration
  - `elasticsearch.service.ts` - Core service
  - `elasticsearch.config.ts` - Config & connection
  - `indices/job.index.ts` - Job index definition

#### 1.3 Environment Variables

Thêm vào `.env`:
```env
ELASTICSEARCH_NODE=http://localhost:9200
ELASTICSEARCH_USERNAME=elastic
ELASTICSEARCH_PASSWORD=changeme
ELASTICSEARCH_INDEX_JOBS=jobs
```
### Phase 2: Matching Service 

#### 2.1 User Profile Indexing (Optional)

Có thể index user profiles để:
- Reverse matching (jobs → users)
- Personalized recommendations

#### 2.2 Matching Query Builder

Tạo function để build Elasticsearch query với:
- Function Score Query
- Custom scoring script
- Filters cho status, dates, etc.

#### 2.3 Scoring Implementation

Implement scoring algorithm trong Elasticsearch:
- Function Score Query với multiple functions
- Script Score cho complex calculations
- Boost factors cho các tiêu chí

### Phase 4: API Integration

#### 4.1 Repository Pattern

Tạo `ElasticsearchJobRepository` implement `IJobRepository`:
- `searchJobs(userId, filters)` - Main matching method
- `getJobById(id)` - Fallback to PostgreSQL nếu cần
- `updateJob(job)` - Update both PostgreSQL & Elasticsearch

#### 4.2 Use Case Update

Update `JobUseCases`:
- Thay thế hoặc bổ sung query từ Elasticsearch
- Combine results nếu cần
- Cache popular queries

#### 4.3 API Endpoints

- `GET /api/v1/jobs/recommended?userId=xxx` - Recommended jobs
- `GET /api/v1/jobs/match?userId=xxx&jobId=xxx` - Match score cho 1 job
- `GET /api/v1/jobs/search?q=...&userId=xxx` - Search với ranking

### Phase 5: Testing & Optimization (Tuần 4)

#### 5.1 Performance Testing

- Load testing với large dataset
- Query optimization
- Index optimization (shards, replicas)

#### 5.2 Accuracy Testing

- Compare results với PostgreSQL queries
- A/B testing với users
- Tune scoring weights

#### 5.3 Monitoring

- Setup monitoring cho Elasticsearch
- Log slow queries
- Track matching accuracy metrics

## 🔍 Best Practices

### 1. Index Management

- **Use Aliases**: Để zero-downtime reindexing
- **Index Templates**: Để consistent mapping
- **Index Lifecycle Management**: Auto delete old indices

### 2. Query Optimization

- **Use Filters**: Cho exact matches (không affect scoring)
- **Cache Filters**: Cho frequently used filters
- **Limit Fields**: Chỉ return fields cần thiết
- **Pagination**: Sử dụng search_after thay vì from/size cho deep pagination

### 3. Data Consistency

- **Dual Write**: Write to both PostgreSQL và Elasticsearch
- **Eventual Consistency**: Accept small delay
- **Sync Jobs**: Scheduled jobs để sync missed updates
- **Conflict Resolution**: Handle conflicts gracefully

### 4. Monitoring

- **Cluster Health**: Monitor cluster status
- **Query Performance**: Track slow queries
- **Index Size**: Monitor disk usage
- **Error Rates**: Track failed queries

## 📈 Metrics để Track

1. **Matching Accuracy**
   - Click-through rate của recommended jobs
   - Application rate
   - User feedback

2. **Performance**
   - Query latency (p50, p95, p99)
   - Index size
   - Query throughput

3. **Data Quality**
   - Sync lag
   - Data consistency rate
   - Missing documents

## 🚀 Deployment Strategy

### 1. Staging

- Setup Elasticsearch cluster
- Test với subset data
- Validate scoring algorithm
- Performance testing

### 2. Production Rollout

- **Phase 1**: Read-only (dual read từ PostgreSQL và Elasticsearch, compare results)
- **Phase 2**: 10% traffic to Elasticsearch
- **Phase 3**: Gradually increase to 100%
- **Phase 4**: Remove PostgreSQL fallback (optional)

### 3. Rollback Plan

- Keep PostgreSQL queries as fallback
- Feature flag để switch between implementations
- Monitor error rates và performance

## 📚 Tài liệu Tham khảo

- [Elasticsearch Function Score Query](https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl-function-score-query.html)
- [Elasticsearch Script Score](https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl-script-score-query.html)
- [Elasticsearch Best Practices](https://www.elastic.co/guide/en/elasticsearch/reference/current/tune-for-search-speed.html)

## ✅ Checklist Triển khai

- [ ] Setup Elasticsearch cluster
- [ ] Install @elastic/elasticsearch package
- [ ] Create Elasticsearch module và service
- [ ] Define job index mapping
- [ ] Implement sync service
- [ ] Implement matching query builder
- [ ] Create repository với Elasticsearch
- [ ] Update use cases
- [ ] Add API endpoints
- [ ] Write unit tests
- [ ] Write integration tests
- [ ] Performance testing
- [ ] Setup monitoring
- [ ] Documentation
- [ ] Deploy to staging
- [ ] Deploy to production

## 🔄 Maintenance

### Daily
- Monitor cluster health
- Check sync lag
- Review slow queries

### Weekly
- Review matching accuracy metrics
- Optimize slow queries
- Check index size growth

### Monthly
- Review và tune scoring weights
- Optimize index settings
- Plan capacity scaling

