import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { BloomFilter } from "bloom-filters";
import { IBloomFilterService } from "@/core/abstracts/bloom-filter.abstract";

interface BloomFilterConfig {
  ttlSeconds?: number;
  expectedElements?: number;
  errorRate?: number;
}

// [TODO]: Using redis cache data to improve persistence across restarts
@Injectable()
export class BloomFilterService implements IBloomFilterService, OnModuleInit {
  private bloomFilter: BloomFilter;
  private config: Required<BloomFilterConfig>;
  private ready = false;
  private readonly logger = new Logger(BloomFilterService.name);

  constructor() {
    this.bloomFilter = new BloomFilter(10, 4);
    this.config = {
      ttlSeconds: 3700,
      expectedElements: 100000,
      errorRate: 0.01,
    };
  }

  updateConfig(config: BloomFilterConfig) {
    this.config = { ...this.config, ...config };
  }

  onModuleInit() {
    this.logger.log("[BloomFilterService] Initialized");
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
    const data = this.bloomFilter.saveAsJSON();
    return JSON.stringify({
      ...data,
      timestamp: Date.now(),
      expectedElements: this.config.expectedElements,
      errorRate: this.config.errorRate,
    });
  }

  deserialize(data: string): void {
    const parsed = JSON.parse(data);

    this.bloomFilter = BloomFilter.fromJSON(parsed);
  }

  initialize(items: string[]): void {
    const expectedElements = Math.max(
      items.length,
      this.config.expectedElements,
    );

    this.bloomFilter = BloomFilter.create(
      expectedElements,
      this.config.errorRate,
    );

    items.forEach((item) => this.add(item));

    // mark ready after initialization
    this.ready = true;

    this.logger.log(
      `[BloomFilterService] Bloom filter initialized with ${items.length} items`,
    );
  }

  addAndPersist(item: string): void {
    this.add(item);
  }

  mightContainAny(items: string[]): boolean {
    return items.some((item) => this.mightContain(item));
  }

  mightContainAll(items: string[]): boolean {
    return items.every((item) => this.mightContain(item));
  }

  isReady(): boolean {
    return this.ready;
  }
}
