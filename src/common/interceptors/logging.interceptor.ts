import {
  CallHandler,
  ExecutionContext,
  HttpException,
  Injectable,
  Logger,
  NestInterceptor,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { FastifyReply, FastifyRequest } from "fastify";
import { Observable, tap } from "rxjs";
import { ILoggerServices } from "@/core/abstracts/logger-services.abstract";
import { Environment } from "../config/env.config";
import {
  REQUEST_ID_HEADER,
  serializeRequestCookies,
  serializeRequestHeaders,
  serializeRequestPayload,
} from "@/common/utils/request-log";
import { getRequestId, getRequestStartTime } from "../utils";

type RequestWithMeta = FastifyRequest & {
  requestId?: string;
  cookies?: Record<string, unknown>;
};

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger("HTTP");
  private readonly slowApiThreshold: number;
  private readonly isLocal: boolean;

  constructor(
    private readonly configService: ConfigService,
    private readonly loggerService: ILoggerServices,
  ) {
    this.slowApiThreshold =
      this.configService.get<number>("SLOW_API_THRESHOLD_MS") ?? 1000;
    const env = this.configService.get<string>("NODE_ENV");
    this.isLocal = !env || env === Environment.Local.toString();
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const ctx = context.switchToHttp();
    const req = ctx.getRequest<RequestWithMeta>();
    const res = ctx.getResponse<FastifyReply>();
    const { method, originalUrl } = req;
    const start = getRequestStartTime() ?? performance.now();
    const requestId =
      getRequestId() ||
      req.requestId ||
      (req.headers[REQUEST_ID_HEADER] as string | undefined) ||
      "-";

    this.logIncoming(req);

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = performance.now() - start;
          const statusCode = res.statusCode;
          this.logRequest(requestId, method, originalUrl, statusCode, duration);
        },
        error: (err: unknown) => {
          const duration = performance.now() - start;
          const statusCode =
            err instanceof HttpException
              ? err.getStatus()
              : ((err as { statusCode?: number })?.statusCode ??
                res.statusCode ??
                500);
          this.logRequest(requestId, method, originalUrl, statusCode, duration);
        },
      }),
    );
  }

  private logIncoming(req: RequestWithMeta): void {
    const serializedQuery = serializeRequestPayload(req.query);
    const serializedBody = serializeRequestPayload(req.body);
    const serializedHeaders = serializeRequestHeaders(
      req.headers as Record<string, unknown>,
    );
    const serializedCookies = serializeRequestCookies(req.cookies);
    const parts = [
      "[INFO] API Request:",
      req.method,
      req.originalUrl,
      serializedQuery ? `query=${serializedQuery}` : null,
      serializedBody ? `body=${serializedBody}` : null,
      serializedHeaders ? `headers=${serializedHeaders}` : null,
      serializedCookies ? `cookies=${serializedCookies}` : null,
    ].filter(Boolean);

    this.logger.log(parts.join(" "));
  }

  private logRequest(
    requestId: string,
    method: string,
    url: string,
    statusCode: number,
    duration: number,
  ): void {
    const durationStr = duration.toFixed(1);

    if (duration > this.slowApiThreshold) {
      this.logger.warn(
        `🐌 ${method} ${url} -> ${statusCode} (${durationStr}ms) requestId=${requestId}`,
      );

      if (!this.isLocal) {
        void this.loggerService.logError({
          type: "SLOW_API",
          content: `${method} ${url} -> ${statusCode} (${durationStr}ms)`,
          note: `Threshold: ${this.slowApiThreshold}ms | requestId=${requestId}`,
        });
      }
    } else if (statusCode >= 400) {
      this.logger.warn(`${method} ${url} -> ${statusCode} (${durationStr}ms)`);
    } else {
      this.logger.log(`${method} ${url} -> ${statusCode} (${durationStr}ms)`);
    }
  }
}
