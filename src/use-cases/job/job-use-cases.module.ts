import { Module } from "@nestjs/common";
import { DataServicesModule } from "@/services/data-services/data-services.module";
import { JobUseCases } from "./job.use-case";

@Module({
  imports: [DataServicesModule],
  providers: [JobUseCases],
  exports: [JobUseCases],
})
export class JobUseCasesModule {}
