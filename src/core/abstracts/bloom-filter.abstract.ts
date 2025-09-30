export abstract class IBloomFilterService {
  abstract add(item: string): void;
  abstract mightContain(item: string): boolean;
  abstract clear(): void;
  abstract getSize(): number;
  abstract serialize(): string;
  abstract deserialize(data: string): void;
  abstract initialize(items: string[]): void;
  abstract addAndPersist(item: string): void;
  abstract mightContainAny(items: string[]): boolean;
  abstract mightContainAll(items: string[]): boolean;
}
