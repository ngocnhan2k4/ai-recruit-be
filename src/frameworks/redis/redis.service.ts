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

  // Sorted Set operations for queue
  async addToSortedSet(
    key: string,
    score: number,
    member: string,
  ): Promise<void> {
    await this.redis.zadd(key, score, member);
  }

  async getRangeBySortedSetScore(
    key: string,
    min: number,
    max: number,
    limit?: number,
  ): Promise<string[]> {
    if (limit) {
      return this.redis.zrangebyscore(key, min, max, "LIMIT", 0, limit);
    }
    return this.redis.zrangebyscore(key, min, max);
  }

  async removeFromSortedSet(key: string, member: string): Promise<void> {
    await this.redis.zrem(key, member);
  }

  async getSortedSetRange(
    key: string,
    start: number,
    stop: number,
  ): Promise<string[]> {
    return this.redis.zrange(key, start, stop);
  }

  async getSortedSetSize(key: string): Promise<number> {
    return this.redis.zcard(key);
  }

  async countSortedSetByScore(
    key: string,
    min: number,
    max: number,
  ): Promise<number> {
    return this.redis.zcount(key, min, max);
  }

  // Bulk operations
  async getKeysByPattern(pattern: string): Promise<string[]> {
    return this.redis.keys(pattern);
  }

  async deleteMultipleKeys(keys: string[]): Promise<void> {
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }
}
