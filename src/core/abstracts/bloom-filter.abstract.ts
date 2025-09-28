export abstract class IBloomFilterService {
  abstract add(item: string): void;
  abstract mightContain(item: string): boolean;
  abstract clear(): void;
  abstract getSize(): number;
  abstract serialize(): string;
  abstract deserialize(data: string): void;
  abstract initialize(items: string[]): Promise<void>;
  abstract addAndPersist(item: string): Promise<void>;
  abstract getLastUpdateTime(): Promise<Date | null>;
  abstract isStale(maxAgeHours?: number): Promise<boolean>;
}
