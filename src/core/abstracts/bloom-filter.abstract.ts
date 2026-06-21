export abstract class IBloomFilterService {
  abstract add(key: string, item: string): void;
  abstract mightContain(key: string, item: string): boolean;
  abstract clear(key: string): void;
  abstract getSize(key: string): number;
  abstract serialize(key: string): string | null;
  abstract deserialize(key: string, data: string): void;
  abstract initialize(key: string, items: string[]): void;
  abstract addAndPersist(key: string, item: string): void;
  abstract mightContainAny(key: string, items: string[]): boolean;
  abstract mightContainAll(key: string, items: string[]): boolean;
  abstract loadFromRedis(key: string): Promise<void>;
  abstract syncKeyToRedis(key: string): Promise<void>;
}
