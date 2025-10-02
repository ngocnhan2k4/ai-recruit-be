import { Module } from "@nestjs/common";
import { BloomFilterModule } from "../../frameworks/bloom-filter/bloom-filter.module";
import { BloomFilterService } from "../../frameworks/bloom-filter/bloom-filter.service";
import { IBloomFilterService } from "../../core/abstracts";
import { UserUseCases } from "./user.use-case";
import { CloudinaryModule } from "@/frameworks/storage/cloudinary/cloudinary.module";
import { PostgresDataServicesModule } from "../../frameworks/data-services/postgres/postgres-data-services.module";

@Module({
  imports: [BloomFilterModule, CloudinaryModule, PostgresDataServicesModule],
  providers: [
    UserUseCases,
    {
      provide: IBloomFilterService,
      useClass: BloomFilterService,
    },
  ],
  exports: [UserUseCases],
})
export class UserUseCasesModule {}
