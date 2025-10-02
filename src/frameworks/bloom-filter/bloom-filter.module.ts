import { Module } from "@nestjs/common";
import { BloomFilterService } from "./bloom-filter.service";

@Module({
  providers: [BloomFilterService],
  exports: [BloomFilterService],
})
export class BloomFilterModule {}
