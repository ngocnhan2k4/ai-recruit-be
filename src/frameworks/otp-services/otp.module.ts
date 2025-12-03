import { Module } from "@nestjs/common";
import { IOtpService } from "@/core/abstracts/otp-services.abstract";
import { OtpService } from "./otp.service";
import { OtpStorageModule } from "./otp-storage-services/otp-storage.module";

@Module({
  imports: [OtpStorageModule],
  providers: [
    {
      provide: IOtpService,
      useClass: OtpService,
    },
  ],
  exports: [IOtpService],
})
export class OtpModule {}
