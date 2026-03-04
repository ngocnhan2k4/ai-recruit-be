import { Module } from "@nestjs/common";
import { JobMatchingUseCases } from "./job-matching.use-cases";
import { EmailModule } from "@/frameworks/email-services/email.module";
import { ElasticsearchModule } from "@/frameworks/data-services/elasticsearch/elasticsearch.module";
import { JobMatchingQuery } from "@/frameworks/data-services/elasticsearch/queries/job-matching.query";

@Module({
  imports: [EmailModule, ElasticsearchModule],
  providers: [JobMatchingUseCases, JobMatchingQuery],
  exports: [JobMatchingUseCases],
})
export class JobMatchingUseCasesModule {}
