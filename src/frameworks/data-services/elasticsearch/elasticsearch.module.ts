import { Global, Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ElasticsearchService } from "./elasticsearch.service";
import { IJobSearchService, ISearchService } from "@/core";
import { LoggerServiceModule } from "@/frameworks/logger-services/logger.module";
import { JobSearchService } from "./domains/jobs/job-search.service";

@Global()
@Module({
  imports: [ConfigModule, LoggerServiceModule],
  providers: [
    {
      provide: ISearchService,
      useClass: ElasticsearchService,
    },
    {
      provide: IJobSearchService,
      useClass: JobSearchService,
    },
  ],
  exports: [ISearchService, IJobSearchService],
})
export class ElasticsearchModule {}
