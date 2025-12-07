import { Injectable } from "@nestjs/common";
import { IOtpService } from "@/core/abstracts/otp-services.abstract";
import { OtpConfig, OtpEntity, OtpPurpose } from "@/core/entities";
import { IOtpStorageService } from "@/core/abstracts/otp-storage.abstract";

@Injectable()
export class OtpService implements IOtpService {
  private readonly otpConfig: OtpConfig = {
    length: 6,
    ttlMinutes: 10,
  };
  constructor(private readonly otpStorageService: IOtpStorageService) {}

  async generateOtp(
    userId: string,
    purpose: OtpPurpose,
    data?: any,
  ): Promise<string> {
    const otp = Math.random().toString().slice(-this.otpConfig.length);
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + this.otpConfig.ttlMinutes);

    const otpEntity: OtpEntity = {
      userId,
      purpose,
      data,
      otp,
      expiresAt,
      createdAt: new Date(),
    };

    await this.otpStorageService.store(`${userId}-${purpose}`, otpEntity);
    return otp;
  }

  async verifyOtp(
    userId: string,
    purpose: OtpPurpose,
    otp: string,
    data?: any,
  ): Promise<boolean> {
    const key = `${userId}-${purpose}`;
    const storedOtp = await this.otpStorageService.get(key);

    if (!storedOtp) {
      return false;
    }

    // Check OTP validity
    const isOtpValid =
      storedOtp.otp === otp &&
      storedOtp.expiresAt > new Date() &&
      storedOtp.purpose === purpose;

    if (!isOtpValid) {
      return false;
    }

    // If data is provided, compare it (deep comparison for objects)
    if (data !== undefined) {
      const storedData = JSON.stringify(storedOtp.data);
      const providedData = JSON.stringify(data);
      if (storedData !== providedData) {
        return false;
      }
    }

    await this.otpStorageService.delete(key); // Invalidate OTP after successful verification
    return true;
  }
}
