import { Module } from "@nestjs/common";
import { DataServicesModule } from "@/services/data-services/data-services.module";
import { JobRawUseCases } from "./jobRaw.use-case";

@Module({
  imports: [DataServicesModule],
  providers: [JobRawUseCases],
  exports: [JobRawUseCases],
})
export class JobRawUseCasesModule {}
