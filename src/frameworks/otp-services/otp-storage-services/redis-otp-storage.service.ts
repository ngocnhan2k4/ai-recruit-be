import { Injectable, Logger } from "@nestjs/common";
import { IOtpStorageService } from "@/core/abstracts/otp-storage.abstract";
import { OtpEntity } from "@/core/entities/otp.entity";
import { ICacheService } from "@/core/abstracts/cache.abstract";

@Injectable()
export class RedisOtpStorageService implements IOtpStorageService {
  private readonly logger = new Logger(RedisOtpStorageService.name);
  private readonly OTP_PREFIX = "otp:";

  constructor(private readonly redisService: ICacheService) {}

  async store(key: string, otp: OtpEntity): Promise<void> {
    const redisKey = this.OTP_PREFIX + key;

    // Calculate TTL in seconds
    const ttlSeconds = Math.floor(
      (otp.expiresAt.getTime() - Date.now()) / 1000,
    );

    if (ttlSeconds > 0) {
      await this.redisService.setWithExpiry(
        redisKey,
        JSON.stringify(otp),
        ttlSeconds,
      );
      this.logger.debug(`Stored OTP with key ${key}, TTL: ${ttlSeconds}s`);
    } else {
      this.logger.warn(`OTP with key ${key} already expired, not storing`);
    }
  }

  async get(key: string): Promise<OtpEntity | null> {
    const redisKey = this.OTP_PREFIX + key;

    const data = await this.redisService.get(redisKey);

    if (!data) {
      return null;
    }

    try {
      const otp: OtpEntity = JSON.parse(data);
      // Parse dates back from JSON
      otp.createdAt = new Date(otp.createdAt);
      otp.expiresAt = new Date(otp.expiresAt);

      return otp;
    } catch (error) {
      this.logger.error(`Failed to parse OTP data for key ${key}`, error);
      return null;
    }
  }

  async delete(key: string): Promise<void> {
    const redisKey = this.OTP_PREFIX + key;

    await this.redisService.del(redisKey);
    this.logger.debug(`Deleted OTP with key ${key}`);
  }

  async exists(key: string): Promise<boolean> {
    const redisKey = this.OTP_PREFIX + key;

    return this.redisService.exists(redisKey);
  }

  async clear(): Promise<void> {
    const keys = await this.redisService.getKeysByPattern(
      this.OTP_PREFIX + "*",
    );

    if (keys.length > 0) {
      await this.redisService.deleteMultipleKeys(keys);
      this.logger.warn(`Cleared ${keys.length} OTP keys from Redis`);
    }
  }
}
