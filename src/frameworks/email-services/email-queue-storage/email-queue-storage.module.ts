import { Module } from "@nestjs/common";
import { IEmailQueueStorageService } from "@/core/abstracts/email-queue-storage.abstract";
import { InMemoryEmailQueueStorageService } from "./in-memory-email-queue-storage.service";

@Module({
  providers: [
    {
      provide: IEmailQueueStorageService,
      useClass: InMemoryEmailQueueStorageService,
    },
  ],
  exports: [IEmailQueueStorageService],
})
export class EmailQueueStorageModule {}
