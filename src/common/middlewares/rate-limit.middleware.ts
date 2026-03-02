import {
  Injectable,
  Logger,
  NestMiddleware,
  HttpStatus,
  Inject,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { IRedisService } from "@/core/abstracts/redis.abstract";
import { IncomingMessage, ServerResponse } from "http";
import { RESPONSE_CODE, RESPONSE_MESSAGE } from "../constants";
import { ApiResponse } from "@/interfaces/dtos";

@Injectable()
export class RateLimitMiddleware implements NestMiddleware {
  private readonly logger = new Logger(RateLimitMiddleware.name);

  private readonly capacity: number;
  private readonly refillRate: number;
  private readonly ttlSeconds: number;

  constructor(
    configService: ConfigService,
    @Inject(IRedisService) private readonly redisService: IRedisService,
  ) {
    this.capacity = configService.get<number>("RATE_LIMIT_CAPACITY", 60);
    this.refillRate = configService.get<number>("RATE_LIMIT_REFILL_RATE", 1);
    this.ttlSeconds = Math.ceil((this.capacity / this.refillRate) * 2);
  }

  async use(
    req: IncomingMessage,
    res: ServerResponse,
    next: () => void,
  ): Promise<void> {
    const ip = this.getClientIp(req);
    const key = `rl:${ip}`;
    const now = Date.now() / 1000;

    try {
      const bucket = await (this.redisService as any).hgetall(key);

      let tokens: number;
      let lastRefill: number;

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

      let allowed = false;
      if (tokens >= 1) {
        tokens -= 1;
        allowed = true;
      }

      await (this.redisService as any).hset(key, {
        tokens: tokens.toString(),
        lastRefill: lastRefill.toString(),
      });
      await (this.redisService as any).expire(key, this.ttlSeconds);

      if (!allowed) {
        this.logger.warn(`Rate limit exceeded for IP: ${ip}`);
        const body: ApiResponse<never> = {
          code: RESPONSE_CODE.TOO_MANY_REQUESTS,
          message: RESPONSE_MESSAGE.TOO_MANY_REQUESTS,
        };

        res.statusCode = HttpStatus.TOO_MANY_REQUESTS;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify(body));
        return;
      }

      next();
    } catch (err) {
      this.logger.error("Rate limiter error — failing open:", err);
      next();
    }
  }

  private getClientIp(req: IncomingMessage): string {
    const forwarded = req.headers["x-forwarded-for"];
    if (forwarded) {
      const first = Array.isArray(forwarded) ? forwarded[0] : forwarded;
      return first.split(",")[0].trim();
    }
    return req.socket?.remoteAddress ?? "unknown";
  }
}
