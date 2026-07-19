import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpStatus,
  Inject,
  HttpException,
  Logger,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ICacheService } from "@/core/abstracts/cache.abstract";
import { FastifyRequest } from "fastify";
import { RESPONSE_CODE, RESPONSE_MESSAGE } from "../constants";

@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly logger = new Logger(RateLimitGuard.name);

  private readonly enabled: boolean;
  private readonly capacity: number;
  private readonly refillRate: number;
  private readonly ttlSeconds: number;
  private readonly globalPrefix: string;
  private readonly excludedPaths: Set<string>;

  constructor(
    configService: ConfigService,
    @Inject(ICacheService) private readonly cacheService: ICacheService,
  ) {
    this.enabled = configService.get<boolean>("RATE_LIMIT_ENABLED", true);
    this.capacity = configService.get<number>("RATE_LIMIT_CAPACITY", 30);
    this.refillRate = configService.get<number>("RATE_LIMIT_REFILL_RATE", 1);
    this.ttlSeconds = Math.ceil((this.capacity / this.refillRate) * 2);
    this.globalPrefix = configService.get<string>("GLOBAL_PREFIX", "");

    const excluded = ["/health", "/users/me", "/auth/refresh"];

    this.excludedPaths = new Set(
      excluded.map((path) => `${this.globalPrefix}${path}`),
    );
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (!this.enabled) {
      return true;
    }

    const request = context.switchToHttp().getRequest<FastifyRequest>();

    if (request.method === "OPTIONS") {
      return true;
    }

    const path = request.url.split("?")[0];
    const excludedPaths = ["/health", "/users/me", "/auth/refresh"];
    const isExcluded = excludedPaths.some((excluded) => {
      const cleanExcluded = excluded.startsWith("/")
        ? excluded
        : `/${excluded}`;
      const prefix = this.globalPrefix.startsWith("/")
        ? this.globalPrefix
        : `/${this.globalPrefix}`;
      const prefixedExcluded = this.globalPrefix
        ? `${prefix}${cleanExcluded}`
        : cleanExcluded;
      return path === cleanExcluded || path === prefixedExcluded;
    });

    if (isExcluded) {
      return true;
    }

    const ip = this.getClientIp(request);
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
      return true;
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

    return true;
  }

  private getClientIp(req: FastifyRequest): string {
    return req.ip || "unknown";
  }
}
