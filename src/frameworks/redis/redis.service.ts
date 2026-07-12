import { ICacheService } from "@/core/abstracts/cache.abstract";
import { Injectable, Inject, OnModuleDestroy, Logger } from "@nestjs/common";
import { Redis } from "ioredis";

@Injectable()
export class RedisService implements ICacheService, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);

  constructor(@Inject("REDIS_CLIENT") private readonly redis: Redis) {}

  private ttlSeconds(ttlMs?: number) {
    if (!ttlMs) return undefined;
    return Math.max(1, Math.ceil(ttlMs / 1000));
  }

  async onModuleDestroy() {
    if (this.redis.status === "end" || this.redis.status === "close") {
      return;
    }

    try {
      await this.redis.quit();
    } catch (error) {
      const err = error as Error;
      if (!err.message.includes("Connection is closed")) {
        this.logger.warn(`Redis shutdown skipped: ${err.message}`);
      }
    }
  }

  async get(key: string): Promise<string | null> {
    return this.redis.get(key);
  }

  async set(
    key: string,
    value: string,
    options?: { ttlSeconds?: number; NX?: boolean },
  ): Promise<boolean> {
    if (options?.ttlSeconds && options?.NX) {
      const result = await this.redis.set(
        key,
        value,
        "EX",
        options.ttlSeconds,
        "NX",
      );
      return result === "OK";
    }

    if (options?.ttlSeconds) {
      await this.redis.setex(key, options.ttlSeconds, value);
      return true;
    }

    if (options?.NX) {
      const result = await this.redis.setnx(key, value);
      return result === 1;
    }

    await this.redis.set(key, value);
    return true;
  }
  async del(key: string): Promise<void> {
    await this.redis.del(key);
  }

  async exists(key: string): Promise<boolean> {
    const result = await this.redis.exists(key);
    return result === 1;
  }

  async getJson<T>(key: string): Promise<T | null> {
    const raw = await this.get(key);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  async setJson(key: string, value: any, ttlMs?: number): Promise<void> {
    const ttl = this.ttlSeconds(ttlMs);
    await this.set(key, JSON.stringify(value), { ttlSeconds: ttl });
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

  // Hash operations
  async hgetall(key: string): Promise<Record<string, string>> {
    return this.redis.hgetall(key);
  }

  async hset(key: string, data: Record<string, any>): Promise<void> {
    await this.redis.hset(key, data);
  }

  async expire(key: string, seconds: number): Promise<void> {
    await this.redis.expire(key, seconds);
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

  async removeSortedSetRangeByRank(
    key: string,
    start: number,
    stop: number,
  ): Promise<void> {
    await this.redis.zremrangebyrank(key, start, stop);
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

  async popMinFromSortedSet(key: string, count?: number): Promise<string[]> {
    const result = await this.redis.zpopmin(key, count ?? 1);
    const members: string[] = [];

    for (let i = 0; i < result.length; i += 2) {
      members.push(result[i]);
    }

    return members;
  }

  async increment(key: string, value: number): Promise<void> {
    await this.redis.incrby(key, value);
  }

  async addToSet(key: string, member: string): Promise<void> {
    await this.redis.sadd(key, member);
  }

  async removeFromSet(key: string, ...members: string[]): Promise<void> {
    await this.redis.srem(key, ...members);
  }

  async getSetMembers(key: string): Promise<string[]> {
    return this.redis.smembers(key);
  }

  async eval(
    script: string,
    keys: number,
    ...args: string[]
  ): Promise<string[]> {
    return (await this.redis.eval(script, keys, ...args)) as string[];
  }
}
