import { ExecutionContext, Injectable } from "@nestjs/common";
import { CacheInterceptor } from "@nestjs/cache-manager";
import { FastifyRequest } from "fastify";

@Injectable()
export class HttpCacheInterceptor extends CacheInterceptor {
  trackBy(context: ExecutionContext): string | undefined {
    const request = context.switchToHttp().getRequest<FastifyRequest>();
    const isGetRequest = request.method === "GET";

    if (!isGetRequest) {
      return undefined; // not cache POST/PUT/DELETE
    }

    const { url } = request;
    const query = request.query as Record<string, any>;
    const user = (request as any).user;
    const userId = user?.userId || "guest";

    const path = url.split("?")[0];

    if (query && Object.keys(query).length > 0) {
      const sortedQuery = Object.keys(query)
        .filter((key) => query[key] !== undefined && query[key] !== "")
        .sort()
        .map((key) => `${key}=${decodeURIComponent(query[key] as string)}`)
        .join("&");

      const cacheKey = sortedQuery ? `${path}?${sortedQuery}` : path;
      return `${userId}:${cacheKey}`;
    }

    // return path without query string
    return `${userId}:${path}`;
  }
}
