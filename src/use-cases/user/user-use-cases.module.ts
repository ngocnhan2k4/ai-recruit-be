import { Module } from "@nestjs/common";
import { DataServicesModule } from "@/services/data-services/data-services.module";
import { BloomFilterModule } from "../../frameworks/bloom-filter/bloom-filter.module";
import { BloomFilterService } from "../../frameworks/bloom-filter/bloom-filter.service";
import { IBloomFilterService } from "../../core/abstracts";
import { UserUseCases } from "./user.use-case";

@Module({
  imports: [DataServicesModule, BloomFilterModule],
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
