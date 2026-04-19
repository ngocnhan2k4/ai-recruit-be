import { Module } from "@nestjs/common";
import { CvSyncUseCases } from "./cv-sync.use-case";
import { ElasticsearchModule } from "@/frameworks/data-services/elasticsearch/elasticsearch.module";
import { PostgresDataServicesModule } from "@/frameworks/data-services/postgres/postgres-data-services.module";
import { CvModule } from "@/services/cv/cv.module";

@Module({
  imports: [ElasticsearchModule, PostgresDataServicesModule, CvModule],
  providers: [CvSyncUseCases],
  exports: [CvSyncUseCases],
})
export class CvSyncUseCaseModule {}
