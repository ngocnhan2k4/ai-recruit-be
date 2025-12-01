import { IOtpStorageService } from "@/core/abstracts/otp-storage.abstract";
import { Module } from "@nestjs/common";
import { InMemoryOtpStorageService } from "./in-memory-otp-storage.service";

@Module({
  providers: [
    {
      provide: IOtpStorageService,
      useClass: InMemoryOtpStorageService,
    },
  ],
  exports: [IOtpStorageService],
})
export class OtpStorageModule {}
