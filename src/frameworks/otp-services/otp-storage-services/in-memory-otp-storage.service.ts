import { OtpEntity } from "@/core";
import { IOtpStorageService } from "@/core/abstracts/otp-storage.abstract";
import { Injectable } from "@nestjs/common";

@Injectable()
export class InMemoryOtpStorageService implements IOtpStorageService {
  private readonly otpStore: Map<string, OtpEntity> = new Map();

  store(key: string, otp: OtpEntity): Promise<void> {
    this.otpStore.set(key, otp);
    return Promise.resolve();
  }

  get(key: string): Promise<OtpEntity | null> {
    return Promise.resolve(this.otpStore.get(key) || null);
  }

  delete(key: string): Promise<void> {
    this.otpStore.delete(key);
    return Promise.resolve();
  }
}
