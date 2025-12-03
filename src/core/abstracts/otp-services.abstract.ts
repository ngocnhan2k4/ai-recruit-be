import { OtpPurpose } from "../entities";

export abstract class IOtpService {
  abstract generateOtp(
    userId: string,
    purpose: OtpPurpose,
    data?: any,
  ): Promise<string>;

  abstract verifyOtp(
    userId: string,
    purpose: OtpPurpose,
    otp: string,
    data?: any,
  ): Promise<boolean>;
}
