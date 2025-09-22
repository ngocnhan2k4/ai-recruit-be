import { Module } from "@nestjs/common";
import { DataServicesModule } from "@/services/data-services/data-services.module";
import { UserFactoryService } from "./job-factory.service";
import { UserUseCases } from "./job.use-case";

@Module({
  imports: [DataServicesModule],
  providers: [UserFactoryService, UserUseCases],
  exports: [UserUseCases],
})
export class UserUseCasesModule {}
