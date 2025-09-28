import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { BloomFilter } from "bloom-filters";
import { IBloomFilterService } from "../../core/abstracts/bloom-filter.abstract";
import { RedisService } from "../redis/redis.service";

interface BloomFilterConfig {
  redisKey: string;
  ttlSeconds?: number;
  expectedElements?: number;
  errorRate?: number;
}

interface BloomFilterData {
  type: string;
  size: number;
  nbHashes: number;
  bitset: number[];
  itemCount: number;
  timestamp: number;
  expectedElements: number;
  errorRate: number;
  redisKey: string;
}

@Injectable()
export class BloomFilterService implements IBloomFilterService, OnModuleInit {
  private bloomFilter: BloomFilter;
  private config: Required<BloomFilterConfig>;
  private readonly logger = new Logger(BloomFilterService.name);
  private itemCount = 0;

  constructor(private readonly redisService: RedisService) {
    // errorRate: 1% (0.01), expectedElements: 100,000
    this.bloomFilter = new BloomFilter(10, 4);
    this.config = {
      redisKey: "bloom_filter:default",
      ttlSeconds: 3700,
      expectedElements: 100000,
      errorRate: 0.01,
    };
  }

  updateConfig(config: BloomFilterConfig) {
    this.config = {
      ...this.config,
      ...config,
    };
  }

  async onModuleInit() {
    const loaded = await this.loadFromRedis();
    if (!loaded) {
      this.logger.log("No Bloom filter data found in Redis");
    }
  }

  add(item: string): void {
    this.bloomFilter.add(item);
  }

  mightContain(item: string): boolean {
    return this.bloomFilter.has(item);
  }

  clear(): void {
    this.bloomFilter = new BloomFilter(10, 4);
  }

  getSize(): number {
    return this.bloomFilter.length;
  }

  serialize(): string {
    try {
      const data = this.bloomFilter.saveAsJSON();
      return JSON.stringify({
        ...data,
        itemCount: this.itemCount,
        timestamp: Date.now(),
        expectedElements: this.config.expectedElements,
        errorRate: this.config.errorRate,
        redisKey: this.config.redisKey,
      });
    } catch (error) {
      this.logger.error(
        `Failed to serialize bloom filter for ${this.config.redisKey}:`,
        error,
      );
      return JSON.stringify({
        type: "BloomFilter",
        size: 10,
        nbHashes: 4,
        bitset: [],
        itemCount: 0,
        timestamp: Date.now(),
        expectedElements: this.config.expectedElements,
        errorRate: this.config.errorRate,
        redisKey: this.config.redisKey,
      });
    }
  }

  deserialize(data: string): void {
    try {
      const parsed = JSON.parse(data);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      this.bloomFilter = BloomFilter.fromJSON(parsed);
      this.itemCount = parsed.itemCount ?? 0;
      this.logger.log(
        `Bloom filter [${parsed.redisKey}] loaded with ${this.itemCount} items`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to deserialize bloom filter for ${this.config.redisKey}:`,
        error,
      );
      this.bloomFilter = BloomFilter.create(
        this.config.expectedElements,
        this.config.errorRate,
      );
      this.itemCount = 0;
    }
  }

  async initialize(items: string[]): Promise<void> {
    const expectedElements = Math.max(
      items.length,
      this.config.expectedElements,
    );

    // Create new bloom filter with optimal parameters
    this.bloomFilter = BloomFilter.create(
      expectedElements,
      this.config.errorRate,
    );
    this.itemCount = 0;

    // Add all items
    items.forEach((item) => this.add(item));

    // Save to Redis
    await this.saveToRedis();

    this.logger.log(
      `Bloom filter initialized for ${this.config.redisKey} with ${items.length} items`,
    );
  }

  private async loadFromRedis(): Promise<boolean> {
    try {
      const data = await this.redisService.get(this.config.redisKey);

      if (data) {
        this.deserialize(data);
        return true;
      }
      return false;
    } catch (error) {
      this.logger.error(
        `Failed to load bloom filter from Redis for ${this.config.redisKey}:`,
        error,
      );
      return false;
    }
  }

  private async saveToRedis(): Promise<void> {
    try {
      const serializedData = this.serialize();

      await this.redisService.set(
        this.config.redisKey,
        serializedData,
        this.config.ttlSeconds,
      );

      this.logger.log(
        `Bloom filter saved to Redis for ${this.config.redisKey} with ${this.itemCount} items`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to save bloom filter to Redis for ${this.config.redisKey}:`,
        error,
      );
    }
  }

  async addAndPersist(item: string): Promise<void> {
    this.add(item);
    await this.saveToRedis();
  }

  async getLastUpdateTime(): Promise<Date | null> {
    try {
      const data = await this.redisService.get(this.config.redisKey);
      if (data) {
        const parsed: BloomFilterData = JSON.parse(data);
        return new Date(parsed.timestamp);
      }
      return null;
    } catch (error) {
      this.logger.error(
        `Failed to get last update time for ${this.config.redisKey}:`,
        error,
      );
      return null;
    }
  }

  async isStale(maxAgeHours: number = 1): Promise<boolean> {
    const lastUpdate = await this.getLastUpdateTime();
    if (!lastUpdate) return true;

    const now = new Date();
    const diffHours = (now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60);
    return diffHours >= maxAgeHours;
  }

  mightContainAny(items: string[]): boolean {
    return items.some((item) => this.mightContain(item));
  }

  mightContainAll(items: string[]): boolean {
    return items.every((item) => this.mightContain(item));
  }
}
