import { IRedisService } from "@/core/abstracts/redis.abstract";
import { Injectable, Inject, OnModuleDestroy } from "@nestjs/common";
import { Redis } from "ioredis";

@Injectable()
export class RedisService implements IRedisService, OnModuleDestroy {
  constructor(@Inject("REDIS_CLIENT") private readonly redis: Redis) {}

  async onModuleDestroy() {
    await this.redis.quit();
  }

  async get(key: string): Promise<string | null> {
    return this.redis.get(key);
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (ttlSeconds) {
      await this.redis.setex(key, ttlSeconds, value);
    } else {
      await this.redis.set(key, value);
    }
  }

  async del(key: string): Promise<void> {
    await this.redis.del(key);
  }

  async exists(key: string): Promise<boolean> {
    const result = await this.redis.exists(key);
    return result === 1;
  }

  async setWithExpiry(
    key: string,
    value: string,
    ttlSeconds: number,
  ): Promise<void> {
    await this.redis.setex(key, ttlSeconds, value);
  }

  async getSetMetadata(
    key: string,
  ): Promise<{ lastUpdated: number; itemCount: number } | null> {
    const data = await this.redis.get(`${key}:metadata`);
    return data
      ? (JSON.parse(data) as { lastUpdated: number; itemCount: number })
      : null;
  }

  async setMetadata(
    key: string,
    metadata: { lastUpdated: number; itemCount: number },
    ttlSeconds?: number,
  ): Promise<void> {
    const value = JSON.stringify(metadata);
    if (ttlSeconds) {
      await this.redis.setex(`${key}:metadata`, ttlSeconds, value);
    } else {
      await this.redis.set(`${key}:metadata`, value);
    }
  }
}
