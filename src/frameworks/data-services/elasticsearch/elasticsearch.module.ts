import { Global, Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ElasticsearchService } from "./elasticsearch.service";
import { ISearchService } from "@/core";
import { LoggerServiceModule } from "@/frameworks/logger-services/logger.module";

@Global()
@Module({
  imports: [ConfigModule, LoggerServiceModule],
  providers: [
    {
      provide: ISearchService,
      useClass: ElasticsearchService,
    },
  ],
  exports: [ISearchService],
})
export class ElasticsearchModule {}
