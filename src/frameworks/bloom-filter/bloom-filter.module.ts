import { Module } from "@nestjs/common";
import { BloomFilterService } from "./bloom-filter.service";
import { IBloomFilterService } from "../../core/abstracts";
import { RedisModule } from "../redis/redis.module";

@Module({
  imports: [RedisModule],
  providers: [
    {
      provide: IBloomFilterService,
      useClass: BloomFilterService,
    },
  ],
  exports: [IBloomFilterService],
})
export class BloomFilterModule {}
