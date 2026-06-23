import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { BloomFilter } from "bloom-filters";
import { IBloomFilterService } from "@/core/abstracts/bloom-filter.abstract";
import { Cron, CronExpression } from "@nestjs/schedule";
import { RedisService } from "../redis/redis.service";

interface BloomFilterConfig {
  ttlSeconds?: number;
  expectedElements?: number;
  errorRate?: number;
}

@Injectable()
export class BloomFilterService implements IBloomFilterService, OnModuleInit {
  private filters: Map<string, BloomFilter> = new Map();
  private dirtyKeys: Set<string> = new Set();
  private config: Required<BloomFilterConfig>;
  private readonly logger = new Logger(BloomFilterService.name);

  constructor(private readonly redisService: RedisService) {
    this.config = {
      ttlSeconds: 86400, // 1 day default
      expectedElements: 10000,
      errorRate: 0.01,
    };
  }

  updateConfig(config: BloomFilterConfig) {
    this.config = { ...this.config, ...config };
  }

  onModuleInit() {
    this.logger.log("[BloomFilterService] Initialized");
  }

  private getFilter(key: string): BloomFilter {
    let filter = this.filters.get(key);
    if (!filter) {
      filter = BloomFilter.create(
        this.config.expectedElements,
        this.config.errorRate,
      );
      this.filters.set(key, filter);
    }
    return filter;
  }

  add(key: string, item: string): void {
    const filter = this.getFilter(key);
    filter.add(item);
    this.dirtyKeys.add(key);
  }

  mightContain(key: string, item: string): boolean {
    const filter = this.filters.get(key);
    if (!filter) return false;
    return filter.has(item);
  }

  clear(key: string): void {
    this.filters.delete(key);
    this.dirtyKeys.add(key);
  }

  getSize(key: string): number {
    const filter = this.filters.get(key);
    return filter ? filter.length : 0;
  }

  serialize(key: string): string | null {
    const filter = this.filters.get(key);
    if (!filter) return null;
    const data = filter.saveAsJSON();
    return JSON.stringify({
      ...data,
      timestamp: Date.now(),
      expectedElements: this.config.expectedElements,
      errorRate: this.config.errorRate,
    });
  }

  deserialize(key: string, data: string): void {
    try {
      const parsed = JSON.parse(data);
      const filter = BloomFilter.fromJSON(parsed);
      this.filters.set(key, filter);
    } catch {
      this.logger.error(`Failed to deserialize bloom filter for key ${key}`);
    }
  }

  initialize(key: string, items: string[]): void {
    const expectedElements = Math.max(
      items.length,
      this.config.expectedElements,
    );
    const filter = BloomFilter.create(expectedElements, this.config.errorRate);
    items.forEach((item) => filter.add(item));
    this.filters.set(key, filter);
    this.dirtyKeys.add(key);
  }

  addAndPersist(key: string, item: string): void {
    this.add(key, item);
    // Could sync to Redis immediately if needed, but we rely on cron
  }

  mightContainAny(key: string, items: string[]): boolean {
    return items.some((item) => this.mightContain(key, item));
  }

  mightContainAll(key: string, items: string[]): boolean {
    if (items.length === 0) return true;
    return items.every((item) => this.mightContain(key, item));
  }

  async loadFromRedis(key: string): Promise<void> {
    const redisKey = `bloom_filter:${key}`;
    const data = await this.redisService.get(redisKey);
    if (data) {
      this.deserialize(key, data);
    }
  }

  @Cron(CronExpression.EVERY_10_MINUTES)
  async syncToRedis() {
    if (this.dirtyKeys.size === 0) return;

    this.logger.log(
      `[BloomFilterService] Syncing ${this.dirtyKeys.size} filters to Redis...`,
    );
    const keysToSync = Array.from(this.dirtyKeys);

    for (const key of keysToSync) {
      const serialized = this.serialize(key);
      const redisKey = `bloom_filter:${key}`;

      if (serialized) {
        await this.redisService.set(redisKey, serialized, {
          ttlSeconds: this.config.ttlSeconds,
        });
      } else {
        await this.redisService.del(redisKey);
      }
      this.dirtyKeys.delete(key);
    }

    this.logger.log(`[BloomFilterService] Sync completed.`);
  }

  async syncKeyToRedis(key: string): Promise<void> {
    const serialized = this.serialize(key);
    const redisKey = `bloom_filter:${key}`;

    if (serialized) {
      await this.redisService.set(redisKey, serialized, {
        ttlSeconds: this.config.ttlSeconds,
      });
    } else {
      await this.redisService.del(redisKey);
    }
    this.dirtyKeys.delete(key);
  }
}
