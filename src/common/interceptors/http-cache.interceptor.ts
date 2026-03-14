import { CallHandler, ExecutionContext, Injectable } from "@nestjs/common";
import { CACHE_TTL_METADATA, CacheInterceptor } from "@nestjs/cache-manager";
import { FastifyRequest } from "fastify";
import { from, lastValueFrom, Observable, of } from "rxjs";

@Injectable()
export class HttpCacheInterceptor extends CacheInterceptor {
  private readonly pending = new Map<string, Promise<any>>();

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const key = this.trackBy(context);
    if (!key) return next.handle();

    // Check if there's a pending request for the same key
    if (this.pending.has(key)) {
      return from(this.pending.get(key)!);
    }

    const cached = await this.cacheManager.get(key);
    if (cached) return of(cached);

    // Double check if another request has set the cache while we were awaiting
    if (this.pending.has(key)) {
      return from(this.pending.get(key)!);
    }

    const request$ = lastValueFrom(next.handle(), { defaultValue: null });

    this.pending.set(key, request$);

    try {
      const response = await request$;

      const ttl =
        this.reflector.get<number>(CACHE_TTL_METADATA, context.getHandler()) ??
        this.reflector.get<number>(CACHE_TTL_METADATA, context.getClass()) ??
        60;
      if (response !== null) {
        await this.cacheManager.set(key, response, ttl);
      }
      return of(response);
    } finally {
      this.pending.delete(key);
    }
  }

  trackBy(context: ExecutionContext): string | undefined {
    const request = context.switchToHttp().getRequest<FastifyRequest>();

    if (request.method !== "GET") return undefined; // not cache POST/PUT/DELETE

    const { url, query } = request;
    const user = (request as any).user;
    const userId = user?.userId || "guest";

    const path = url.split("?")[0];

    const sortedQuery = Object.entries(query || {})
      .filter(([key, v]) => key !== "keyword" && v !== undefined && v !== "") // [TODO]: Hardcode here keyword to not be included in cache key, since it can be very dynamic and may not benefit from caching
      .sort()
      .map(([key, value]) => `${key}=${decodeURIComponent(value)}`)
      .join("&");

    return `${userId}:${path}${sortedQuery ? `?${sortedQuery}` : ""}`;
  }
}
