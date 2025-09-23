import { Module } from "@nestjs/common";
import { DataServicesModule } from "@/services/data-services/data-services.module";
import { JobUseCases } from "./job.use-case";
import { JobFactoryService } from "./job-factory.service";

@Module({
  imports: [DataServicesModule],
  providers: [JobFactoryService, JobUseCases],
  exports: [JobUseCases],
})
export class JobUseCasesModule {}
