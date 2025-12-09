import { Global, Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ElasticsearchService } from "./elasticsearch.service";
import { PostgresDataServicesModule } from "../postgres/postgres-data-services.module";

@Global()
@Module({
  imports: [ConfigModule, PostgresDataServicesModule],
  providers: [ElasticsearchService],
  exports: [ElasticsearchService],
})
export class ElasticsearchModule {}
