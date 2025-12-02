import { IOtpStorageService } from "@/core/abstracts/otp-storage.abstract";
import { Module } from "@nestjs/common";
import { RedisOtpStorageService } from "./redis-otp-storage.service";
import { RedisModule } from "@/frameworks/redis/redis.module";

@Module({
  imports: [RedisModule],
  providers: [
    {
      provide: IOtpStorageService,
      useClass: RedisOtpStorageService,
    },
  ],
  exports: [IOtpStorageService],
})
export class OtpStorageModule {}
