import { Module } from "@nestjs/common";
import { BloomFilterService } from "./bloom-filter.service";
import { RedisModule } from "../redis/redis.module";

@Module({
  imports: [RedisModule],
  providers: [BloomFilterService],
  exports: [BloomFilterService],
})
export class BloomFilterModule {}
