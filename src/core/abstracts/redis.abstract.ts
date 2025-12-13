export abstract class IRedisService {
  abstract get(key: string): Promise<string | null>;
  abstract set(key: string, value: string, ttlSeconds?: number): Promise<void>;
  abstract del(key: string): Promise<void>;
  abstract exists(key: string): Promise<boolean>;
  abstract setWithExpiry(
    key: string,
    value: string,
    ttlSeconds: number,
  ): Promise<void>;
  abstract getSetMetadata(
    key: string,
  ): Promise<{ lastUpdated: number; itemCount: number } | null>;
  abstract setMetadata(
    key: string,
    metadata: { lastUpdated: number; itemCount: number },
    ttlSeconds?: number,
  ): Promise<void>;

  // Sorted Set operations for queue
  abstract addToSortedSet(
    key: string,
    score: number,
    member: string,
  ): Promise<void>;
  abstract getRangeBySortedSetScore(
    key: string,
    min: number,
    max: number,
    limit?: number,
  ): Promise<string[]>;
  abstract removeFromSortedSet(key: string, member: string): Promise<void>;

  abstract getSortedSetRange(
    key: string,
    start: number,
    stop: number,
  ): Promise<string[]>;
  abstract getSortedSetSize(key: string): Promise<number>;
  abstract countSortedSetByScore(
    key: string,
    min: number,
    max: number,
  ): Promise<number>;

  // Bulk operations
  abstract getKeysByPattern(pattern: string): Promise<string[]>;
  abstract deleteMultipleKeys(keys: string[]): Promise<void>;
  abstract popMinFromSortedSet(key: string, count?: number): Promise<string[]>;
}
