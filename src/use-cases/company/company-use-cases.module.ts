import { Module } from "@nestjs/common";
import { CompanyUseCase } from "./company.use-case";
import { BloomFilterModule } from "@/frameworks/bloom-filter/bloom-filter.module";
import { IBloomFilterService } from "@/core";
import { BloomFilterService } from "@/frameworks/bloom-filter/bloom-filter.service";

@Module({
  imports: [BloomFilterModule],
  providers: [
    CompanyUseCase,
    {
      provide: IBloomFilterService,
      useClass: BloomFilterService,
    },
  ],
  exports: [CompanyUseCase],
})
export class CompanyUseCasesModule {}
