import { Module } from "@nestjs/common";
import { BloomFilterModule } from "../../frameworks/bloom-filter/bloom-filter.module";

@Module({
  imports: [BloomFilterModule],
  exports: [BloomFilterModule],
})
export class CacheServicesModule {}
