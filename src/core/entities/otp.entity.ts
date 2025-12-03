import { OtpPurpose } from "./enum.entity";

export interface OtpEntity {
  userId: string;
  purpose: OtpPurpose;
  data?: any;
  otp: string;
  createdAt: Date;
  expiresAt: Date;
}

export interface OtpConfig {
  length: number;
  ttlMinutes: number;
}
