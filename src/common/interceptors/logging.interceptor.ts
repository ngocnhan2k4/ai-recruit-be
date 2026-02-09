import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { FastifyReply, FastifyRequest } from "fastify";
import { Observable, tap } from "rxjs";

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger("HTTP");
  private readonly slowApiThreshold: number;

  constructor(private readonly configService: ConfigService) {
    this.slowApiThreshold =
      this.configService.get<number>("SLOW_API_THRESHOLD_MS") ?? 1000;
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const ctx = context.switchToHttp();
    const req = ctx.getRequest<FastifyRequest>();
    const res = ctx.getResponse<FastifyReply>();
    const { method, originalUrl } = req;
    const start = performance.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = performance.now() - start;
          const statusCode = res.statusCode;
          this.logRequest(method, originalUrl, statusCode, duration);
        },
        error: () => {
          const duration = performance.now() - start;
          const statusCode = res.statusCode;
          this.logRequest(method, originalUrl, statusCode, duration);
        },
      }),
    );
  }

  private logRequest(
    method: string,
    url: string,
    statusCode: number,
    duration: number,
  ): void {
    const durationStr = duration.toFixed(1);

    if (duration > this.slowApiThreshold) {
      this.logger.error(
        `🐌 ${method} ${url} -> ${statusCode} (${durationStr}ms)`,
      );
    } else if (statusCode >= 400) {
      this.logger.warn(`${method} ${url} -> ${statusCode} (${durationStr}ms)`);
    } else {
      this.logger.log(`${method} ${url} -> ${statusCode} (${durationStr}ms)`);
    }
  }
}
