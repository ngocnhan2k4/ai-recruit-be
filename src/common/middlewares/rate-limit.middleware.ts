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
    this.capacity = configService.get<number>("RATE_LIMIT_CAPACITY", 60);
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
      const bucket = await this.cacheService.hgetall(key);

      let tokens: number;
      let lastRefill: number;
      const now = Date.now() / 1000;

      if (!bucket || Object.keys(bucket).length === 0) {
        tokens = this.capacity;
        lastRefill = now;
      } else {
        tokens = parseFloat(bucket.tokens);
        lastRefill = parseFloat(bucket.lastRefill);
      }

      const elapsed = Math.max(0, now - lastRefill);
      tokens = Math.min(this.capacity, tokens + elapsed * this.refillRate);
      lastRefill = now;

      if (tokens >= 1) {
        tokens -= 1;
        allowed = true;
      }

      await this.cacheService.hset(key, {
        tokens: tokens.toString(),
        lastRefill: lastRefill.toString(),
      });
      await this.cacheService.expire(key, this.ttlSeconds);
    } catch (err) {
      this.logger.error("Rate limiter error — failing open:", err);
      return next();
    }

    if (!allowed) {
      this.logger.warn(`Rate limit exceeded for IP: ${ip}`);

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
