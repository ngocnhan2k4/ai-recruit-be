import {
  Injectable,
  Logger,
  NestMiddleware,
  HttpException,
  HttpStatus,
  Inject,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { IRedisService } from "@/core/abstracts/redis.abstract";
import { FastifyRequest, FastifyReply } from "fastify";
import { RESPONSE_CODE, RESPONSE_MESSAGE } from "../constants";

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
    req: FastifyRequest,
    res: FastifyReply,
    next: () => void,
  ): Promise<void> {
    try {
      await this.checkRateLimit(req, res);
      next();
    } catch (err) {
      if (err instanceof HttpException) throw err;
      this.logger.error("Rate limiter error — failing open:", err);
      next();
    }
  }

  async onRequest(req: FastifyRequest, reply: FastifyReply): Promise<void> {
    await this.checkRateLimit(req, reply);
  }

  private async checkRateLimit(
    req: FastifyRequest,
    _: FastifyReply,
  ): Promise<void> {
    const ip = this.getClientIp(req);
    const key = `rl:${ip}`;
    const now = Date.now() / 1000;

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
      const retryAfter = Math.ceil(1 / this.refillRate);
      this.logger.warn(`Rate limit exceeded for IP: ${ip}`);

      throw new HttpException(
        {
          code: RESPONSE_CODE.TOO_MANY_REQUESTS,
          message: RESPONSE_MESSAGE.TOO_MANY_REQUESTS,
          retryAfter,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  private getClientIp(req: any): string {
    if (req && typeof req === "object" && "raw" in req && req.raw) {
      const forwarded = req.raw.headers["x-forwarded-for"];
      if (forwarded) {
        const first = Array.isArray(forwarded) ? forwarded[0] : forwarded;
        return String(first).split(",")[0].trim();
      }
      const remoteAddr = req.raw.socket?.remoteAddress;
      return typeof remoteAddr === "string" ? remoteAddr : "unknown";
    }

    if (req && typeof req === "object" && "headers" in req) {
      const forwarded = req.headers["x-forwarded-for"];
      if (forwarded) {
        const first = Array.isArray(forwarded) ? forwarded[0] : forwarded;
        return String(first).split(",")[0].trim();
      }
    }

    const socketAddr = (req as { socket?: { remoteAddress?: string } })?.socket
      ?.remoteAddress;
    return typeof socketAddr === "string" ? socketAddr : "unknown";
  }
}
