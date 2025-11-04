import { Module } from "@nestjs/common";
import { BloomFilterModule } from "@/frameworks/bloom-filter/bloom-filter.module";
import { IBloomFilterService } from "@/core";
import { BloomFilterService } from "@/frameworks/bloom-filter/bloom-filter.service";
import { OrganizationUseCase } from "./organization.use-case";

@Module({
  imports: [BloomFilterModule],
  providers: [
    OrganizationUseCase,
    {
      provide: IBloomFilterService,
      useClass: BloomFilterService,
    },
  ],
  exports: [OrganizationUseCase],
})
export class OrganizationUseCasesModule {}
