import { Module } from "@nestjs/common";
import { IEmailQueueStorageService } from "@/core/abstracts/email-queue-storage.abstract";
import { RedisEmailQueueStorageService } from "./redis-email-queue-storage.service";
import { RedisModule } from "@/frameworks/redis/redis.module";

@Module({
  imports: [RedisModule],
  providers: [
    {
      provide: IEmailQueueStorageService,
      useClass: RedisEmailQueueStorageService,
    },
  ],
  exports: [IEmailQueueStorageService],
})
export class EmailQueueStorageModule {}
