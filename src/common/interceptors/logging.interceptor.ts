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

type RequestSnapshot = {
  method: string;
  url: string;
  query?: string;
  body?: string;
  headers?: string;
  cookies?: string;
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
    const start = getRequestStartTime() ?? performance.now();
    const requestId =
      getRequestId() ||
      req.requestId ||
      (req.headers[REQUEST_ID_HEADER] as string | undefined) ||
      "-";

    const requestSnapshot = this.captureRequest(req);

    return next.handle().pipe(
      tap({
        next: (data) => {
          this.logHttpExchange(
            requestId,
            requestSnapshot,
            res.statusCode,
            performance.now() - start,
            data,
          );
        },
        error: (err: unknown) => {
          const statusCode =
            err instanceof HttpException
              ? err.getStatus()
              : ((err as { statusCode?: number })?.statusCode ??
                res.statusCode ??
                500);
          const errorBody =
            err instanceof HttpException
              ? err.getResponse()
              : err instanceof Error
                ? { message: err.message, name: err.name }
                : err;
          this.logHttpExchange(
            requestId,
            requestSnapshot,
            statusCode,
            performance.now() - start,
            errorBody,
          );
        },
      }),
    );
  }

  private captureRequest(req: RequestWithMeta): RequestSnapshot {
    return {
      method: req.method,
      url: req.originalUrl,
      query: serializeRequestPayload(req.query),
      body: serializeRequestPayload(req.body),
      headers: serializeRequestHeaders(req.headers as Record<string, unknown>),
      cookies: serializeRequestCookies(req.cookies),
    };
  }

  private logHttpExchange(
    requestId: string,
    request: RequestSnapshot,
    statusCode: number,
    duration: number,
    responseBody: unknown,
  ): void {
    const durationStr = duration.toFixed(1);
    const response = serializeRequestPayload(responseBody);

    const payload = {
      requestId,
      method: request.method,
      url: request.url,
      statusCode,
      durationMs: Number(durationStr),
      query: request.query,
      body: request.body,
      headers: request.headers,
      cookies: request.cookies,
      response,
    };

    const message = `[INFO] API Request ${request.method} ${request.url} -> ${statusCode} (${durationStr}ms) | ${JSON.stringify(payload)}`;

    if (duration > this.slowApiThreshold) {
      this.logger.warn(`🐌 ${message}`);

      if (!this.isLocal) {
        void this.loggerService.logError({
          type: "SLOW_API",
          content: message,
          note: `Threshold: ${this.slowApiThreshold}ms | requestId=${requestId}`,
        });
      }
    } else if (statusCode >= 400) {
      this.logger.warn(message);
    } else {
      this.logger.log(message);
    }
  }
}
