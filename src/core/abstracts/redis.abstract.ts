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
}
