/**
 * Example: Elasticsearch Module Setup
 *
 * File location: src/frameworks/data-services/elasticsearch/elasticsearch.module.ts
 */

import { Global, Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ElasticsearchService } from "./elasticsearch.service";
import { JobSyncService } from "./sync/job-sync.service";
import { ElasticsearchJobRepository } from "./repositories/elasticsearch-job.repository";

@Global()
@Module({
  imports: [ConfigModule],
  providers: [ElasticsearchService, JobSyncService, ElasticsearchJobRepository],
  exports: [ElasticsearchService, JobSyncService, ElasticsearchJobRepository],
})
export class ElasticsearchModule {}

/**
 * Usage trong app.module.ts:
 *
 * import { ElasticsearchModule } from './frameworks/data-services/elasticsearch/elasticsearch.module';
 *
 * @Module({
 *   imports: [
 *     // ... other modules
 *     ElasticsearchModule,
 *   ],
 * })
 * export class AppModule {}
 */
