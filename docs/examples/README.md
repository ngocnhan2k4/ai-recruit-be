# Elasticsearch Implementation Examples

Thư mục này chứa các file code examples để triển khai Elasticsearch cho job matching feature.

## 📁 Cấu trúc Files

1. **elasticsearch-setup.md** - Hướng dẫn setup Elasticsearch (Docker, config, etc.)
2. **elasticsearch-service-example.ts** - Service chính để tương tác với Elasticsearch
3. **job-index-mapping.ts** - Định nghĩa index mapping và transform functions
4. **job-matching-query.ts** - Query builder cho job matching với scoring
5. **elasticsearch-module.ts** - NestJS module setup
6. **job-sync-service.ts** - Service để sync data từ PostgreSQL → Elasticsearch

## 🚀 Cách sử dụng

### Bước 1: Setup Elasticsearch

Xem file `elasticsearch-setup.md` để:
- Cài đặt package
- Setup Docker container
- Configure environment variables

### Bước 2: Tạo các files trong project

Copy các file examples vào đúng vị trí trong project:

```
src/frameworks/data-services/elasticsearch/
├── elasticsearch.service.ts          (từ elasticsearch-service-example.ts)
├── elasticsearch.module.ts           (từ elasticsearch-module.ts)
├── indices/
│   └── job.index.ts                  (từ job-index-mapping.ts)
├── queries/
│   └── job-matching.query.ts         (từ job-matching-query.ts)
└── sync/
    └── job-sync.service.ts           (từ job-sync-service.ts)
```

### Bước 3: Update Environment Config

Thêm Elasticsearch config vào `src/common/config/env.config.ts` (xem `elasticsearch-setup.md`)

### Bước 4: Import Module

Thêm `ElasticsearchModule` vào `AppModule`:

```typescript
import { ElasticsearchModule } from './frameworks/data-services/elasticsearch/elasticsearch.module';

@Module({
  imports: [
    // ... other modules
    ElasticsearchModule,
  ],
})
export class AppModule {}
```

### Bước 5: Initialize Index

Trong `main.ts` hoặc một service khởi tạo:

```typescript
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Initialize Elasticsearch index
  const jobSyncService = app.get(JobSyncService);
  await jobSyncService.initializeIndex();
  await jobSyncService.syncAllActiveJobs();
  
  await app.listen(3000);
}
```

### Bước 6: Sử dụng trong Repository/Use Case

```typescript
// Trong JobRepository hoặc Use Case
constructor(
  private elasticsearchService: ElasticsearchService,
  private jobMatchingQuery: JobMatchingQuery,
) {}

async findMatchingJobs(userId: string, filters: JobFilters) {
  // Lấy user profile
  const userProfile = await this.getUserProfile(userId);
  
  // Build query
  const query = JobMatchingQuery.buildMatchQuery(userProfile, filters);
  
  // Execute query
  const result = await this.elasticsearchService.search(
    JOB_INDEX_NAME,
    query.body,
  );
  
  // Transform results
  return this.transformResults(result);
}
```

## ⚠️ Lưu ý

1. **Các file này là examples** - Cần điều chỉnh cho phù hợp với codebase của bạn
2. **Cần implement các methods** trong `JobRepository` mà `JobSyncService` sử dụng
3. **Test kỹ** trước khi deploy production
4. **Monitor performance** và tune scoring weights dựa trên metrics

## 📚 Tài liệu tham khảo

- Xem file chính: `../JOB_MATCHING.md` để hiểu tổng quan về architecture và plan
- Elasticsearch docs: https://www.elastic.co/guide/en/elasticsearch/reference/current/index.html

