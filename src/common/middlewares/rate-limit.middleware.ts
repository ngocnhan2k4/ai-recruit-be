import {
  Injectable,
  Logger,
  NestMiddleware,
  HttpStatus,
  Inject,
  HttpException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ICacheService } from "@/core/abstracts/cache.abstract";
import { FastifyRequest, FastifyReply } from "fastify";
import { RESPONSE_CODE, RESPONSE_MESSAGE } from "../constants";

@Injectable()
export class RateLimitMiddleware implements NestMiddleware {
  private readonly logger = new Logger(RateLimitMiddleware.name);

  private readonly enabled: boolean;
  private readonly capacity: number;
  private readonly refillRate: number;
  private readonly ttlSeconds: number;

  constructor(
    configService: ConfigService,
    @Inject(ICacheService) private readonly cacheService: ICacheService,
  ) {
    this.enabled = configService.get<boolean>("RATE_LIMIT_ENABLED", true);
    this.capacity = configService.get<number>("RATE_LIMIT_CAPACITY", 30);
    this.refillRate = configService.get<number>("RATE_LIMIT_REFILL_RATE", 1);
    this.ttlSeconds = Math.ceil((this.capacity / this.refillRate) * 2);
  }

  async use(
    req: FastifyRequest,
    _: FastifyReply,
    next: () => void,
  ): Promise<void> {
    if (!this.enabled || req.method === "OPTIONS") {
      return next();
    }

    const ip = this.getClientIp(req);
    const key = `rl:${ip}`;

    let allowed = false;

    try {
      const now = Math.floor(Date.now() / 1000);

      const luaScript = `
        local key = KEYS[1]
        local capacity = tonumber(ARGV[1])
        local refillRate = tonumber(ARGV[2])
        local now = tonumber(ARGV[3])
        local ttl = tonumber(ARGV[4])

        local bucket = redis.call('HMGET', key, 'tokens', 'lastRefill')
        local tokens = tonumber(bucket[1])
        local lastRefill = tonumber(bucket[2])

        if not tokens then
          tokens = capacity
          lastRefill = now
        else
          local elapsed = math.max(0, now - lastRefill)
          tokens = math.min(capacity, tokens + (elapsed * refillRate))
          lastRefill = now
        end

        if tokens >= 1 then
          tokens = tokens - 1
          redis.call('HMSET', key, 'tokens', tokens, 'lastRefill', lastRefill)
          redis.call('EXPIRE', key, ttl)
          return 1
        else
          return 0
        end
      `;

      const result = await this.cacheService.eval(
        luaScript,
        1,
        key,
        this.capacity.toString(),
        this.refillRate.toString(),
        now.toString(),
        this.ttlSeconds.toString(),
      );

      if ((result as unknown as number) === 1) {
        allowed = true;
      }
    } catch (err) {
      this.logger.error("Rate limiter error — failing open:", err);
      return next();
    }

    if (!allowed) {
      throw new HttpException(
        {
          code: RESPONSE_CODE.TOO_MANY_REQUESTS,
          message: RESPONSE_MESSAGE.TOO_MANY_REQUESTS,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    next();
  }

  private getClientIp(req: FastifyRequest): string {
    return req.ip || "unknown";
  }
}
