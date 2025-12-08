import { Module } from "@nestjs/common";
import { JobSyncUseCases } from "./job-sync.use-case";
import { ElasticsearchModule } from "@/frameworks/data-services/elasticsearch/elasticsearch.module";

@Module({
  imports: [ElasticsearchModule],
  providers: [JobSyncUseCases],
  exports: [JobSyncUseCases],
})
export class JobSyncUseCaseModule {}
