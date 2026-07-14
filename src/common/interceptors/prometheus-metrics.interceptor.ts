import {
  CallHandler,
  ExecutionContext,
  HttpException,
  Injectable,
  NestInterceptor,
} from "@nestjs/common";
import { InjectMetric } from "@willsoto/nestjs-prometheus";
import { FastifyReply, FastifyRequest } from "fastify";
import { Counter, Histogram } from "prom-client";
import { Observable, tap } from "rxjs";
import { getRequestStartTime } from "../utils";

// Normalizes dynamic path segments so metrics are not high-cardinality.
// e.g. /api/v1/users/123/profile -> /api/v1/users/:id/profile
function normalizePath(url: string): string {
  return url
    .split("?")[0]
    .replace(
      /\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,
      "/:id",
    )
    .replace(/\/\d+/g, "/:id");
}

@Injectable()
export class PrometheusMetricsInterceptor implements NestInterceptor {
  constructor(
    @InjectMetric("http_requests_total")
    private readonly requestsCounter: Counter<string>,
    @InjectMetric("http_request_duration_seconds")
    private readonly requestDuration: Histogram<string>,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const ctx = context.switchToHttp();
    const req = ctx.getRequest<FastifyRequest>();
    const res = ctx.getResponse<FastifyReply>();
    const { method } = req;
    const route = normalizePath(req.originalUrl ?? req.url);
    const start = getRequestStartTime() ?? performance.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = (performance.now() - start) / 1000;
          const status = String(res.statusCode);
          this.requestsCounter.inc({ method, route, status });
          this.requestDuration.observe({ method, route, status }, duration);
        },
        error: (err: unknown) => {
          const duration = (performance.now() - start) / 1000;
          const status = String(
            err instanceof HttpException
              ? err.getStatus()
              : ((err as { statusCode?: number })?.statusCode ?? 500),
          );
          this.requestsCounter.inc({ method, route, status });
          this.requestDuration.observe({ method, route, status }, duration);
        },
      }),
    );
  }
}
