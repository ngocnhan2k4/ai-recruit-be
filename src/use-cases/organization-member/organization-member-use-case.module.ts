import { Module } from "@nestjs/common";
import { BloomFilterModule } from "@/frameworks/bloom-filter/bloom-filter.module";
import { IBloomFilterService } from "@/core";
import { BloomFilterService } from "@/frameworks/bloom-filter/bloom-filter.service";
import { OrganizationMemberUseCase } from "./organization-member.use-case";

@Module({
  imports: [BloomFilterModule],
  providers: [
    OrganizationMemberUseCase,
    {
      provide: IBloomFilterService,
      useClass: BloomFilterService,
    },
  ],
  exports: [OrganizationMemberUseCase],
})
export class OrganizationMemberUseCasesModule {}
