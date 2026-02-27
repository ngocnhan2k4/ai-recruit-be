import {
  Injectable,
  Logger,
  NestMiddleware,
  HttpException,
  HttpStatus,
  OnModuleDestroy,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Redis } from "ioredis";
import { FastifyRequest, FastifyReply } from "fastify";

// KEYS[1]  = bucket key (e.g. "rl:127.0.0.1")
// ARGV[1]  = capacity (max tokens)
// ARGV[2]  = refill rate (tokens per second, float ok)
// ARGV[3]  = current timestamp in seconds (float)
// ARGV[4]  = TTL in seconds (bucket auto-expires after inactivity)
//
// Returns: [allowed (0|1), tokensRemaining (float string)]
const TOKEN_BUCKET_SCRIPT = `
local key         = KEYS[1]
local capacity    = tonumber(ARGV[1])
local refillRate  = tonumber(ARGV[2])
local now         = tonumber(ARGV[3])
local ttl         = tonumber(ARGV[4])

local bucket     = redis.call("HMGET", key, "tokens", "lastRefill")
local tokens     = tonumber(bucket[1])
local lastRefill = tonumber(bucket[2])

if tokens == nil then
  tokens     = capacity
  lastRefill = now
end

local elapsed = math.max(0, now - lastRefill)
tokens = math.min(capacity, tokens + elapsed * refillRate)
lastRefill = now

local allowed = 0
if tokens >= 1 then
  tokens  = tokens - 1
  allowed = 1
end

redis.call("HMSET", key, "tokens", tokens, "lastRefill", lastRefill)
redis.call("EXPIRE", key, ttl)

return { allowed, tostring(tokens) }
`;

@Injectable()
export class RateLimitMiddleware implements NestMiddleware, OnModuleDestroy {
  private readonly logger = new Logger(RateLimitMiddleware.name);
  private readonly redis: Redis;

  private readonly capacity: number;
  private readonly refillRate: number;
  private readonly ttlSeconds: number;

  constructor(configService: ConfigService) {
    // Safe parser: handles NaN, undefined, and string values from env
    const safeInt = (key: string, fallback: number) => {
      const val = parseInt(String(configService.get(key) ?? fallback), 10);
      return Number.isFinite(val) ? val : fallback;
    };
    const safeFloat = (key: string, fallback: number) => {
      const val = parseFloat(String(configService.get(key) ?? fallback));
      return Number.isFinite(val) ? val : fallback;
    };

    this.capacity = safeInt("RATE_LIMIT_CAPACITY", 60);
    this.refillRate = safeFloat("RATE_LIMIT_REFILL_RATE", 1);
    this.ttlSeconds = Math.ceil((this.capacity / this.refillRate) * 2);

    this.redis = new Redis({
      host: configService.get<string>("REDIS_HOST"),
      port: safeInt("REDIS_PORT", 6379),
      password: configService.get<string>("REDIS_PASSWORD"),
      db: safeInt("RATE_LIMIT_REDIS_DB", 2),
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    });

    this.redis.on("connect", () =>
      this.logger.log("✅ Rate-limit Redis connected"),
    );
    this.redis.on("error", (err) =>
      this.logger.error("❌ Rate-limit Redis error:", err),
    );
  }

  async onModuleDestroy() {
    await this.redis.quit();
  }

  async use(
    req: FastifyRequest,
    res: FastifyReply,
    next: () => void,
  ): Promise<void> {
    const ip = this.getClientIp(req);
    const key = `rl:${ip}`;
    const now = (Date.now() / 1000).toFixed(6);

    try {
      const result = (await this.redis.eval(
        TOKEN_BUCKET_SCRIPT,
        1,
        key,
        String(this.capacity),
        String(this.refillRate),
        now,
        String(this.ttlSeconds),
      )) as [number, string];

      const [allowed, tokensRemaining] = result;
      const remaining = parseFloat(tokensRemaining);

      res.header("X-RateLimit-Limit", this.capacity);
      res.header("X-RateLimit-Remaining", Math.floor(remaining));
      res.header(
        "X-RateLimit-Reset",
        Math.ceil(
          Date.now() / 1000 + (this.capacity - remaining) / this.refillRate,
        ),
      );

      if (!allowed) {
        const retryAfter = Math.ceil(1 / this.refillRate);
        res.header("Retry-After", retryAfter);
        this.logger.warn(`Rate limit exceeded for IP: ${ip}`);
        throw new HttpException(
          {
            statusCode: HttpStatus.TOO_MANY_REQUESTS,
            message: "Too many requests. Please slow down.",
            retryAfter,
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }

      next();
    } catch (err) {
      if (err instanceof HttpException) throw err;
      // Fail open — if Redis is unavailable, don't block legitimate traffic
      this.logger.error("Rate limiter Redis error — failing open:", err);
      next();
    }
  }

  private getClientIp(req: FastifyRequest): string {
    const raw = req.raw;
    const forwarded = raw.headers["x-forwarded-for"];
    if (forwarded) {
      const first = Array.isArray(forwarded) ? forwarded[0] : forwarded;
      return first.split(",")[0].trim();
    }
    return raw.socket?.remoteAddress ?? "unknown";
  }
}
