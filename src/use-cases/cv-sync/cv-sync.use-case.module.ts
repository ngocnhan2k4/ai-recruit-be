import { Module } from "@nestjs/common";
import { CvSyncUseCases } from "./cv-sync.use-case";
import { ElasticsearchModule } from "@/frameworks/data-services/elasticsearch/elasticsearch.module";
import { CvModule } from "@/services/cv/cv.module";

@Module({
  imports: [ElasticsearchModule, CvModule],
  providers: [CvSyncUseCases],
  exports: [CvSyncUseCases],
})
export class CvSyncUseCaseModule {}
