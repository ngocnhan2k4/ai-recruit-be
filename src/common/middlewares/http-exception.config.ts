import { type AppConfigProps } from "@/common/config";
import { ApiResponse } from "@/interfaces/dtos";
import { Catch, ExceptionFilter, HttpException, Logger } from "@nestjs/common";
import type { ArgumentsHost } from "@nestjs/common";
import { FastifyReply, FastifyRequest } from "fastify";
import { assign } from "lodash";
import { RESPONSE_CODE, RESPONSE_MESSAGE } from "@/common/constants";
import { ILoggerServices } from "@/core/abstracts/logger-services.abstract";
import { Environment } from "@/common/config";
import { DrizzleQueryError } from "drizzle-orm";
import * as Sentry from "@sentry/nestjs";
import { SentryExceptionCaptured } from "@sentry/nestjs";
import {
  extractDbErrorInfo,
  formatDbErrorMessage,
  isDbQueryError,
} from "@/common/utils/db-error";
import {
  REQUEST_ID_HEADER,
  serializeRequestCookies,
  serializeRequestHeaders,
  serializeRequestPayload,
  setResponseHeader,
  truncateStack,
} from "@/common/utils/request-log";
import { extractExternalErrorInfo } from "@/common/utils/external-error";
import { getRequestId } from "../utils";

type RequestWithMeta = FastifyRequest & {
  requestId?: string;
  user?: { sub?: string; userId?: string };
  params?: Record<string, unknown>;
  cookies?: Record<string, unknown>;
};

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  constructor(
    private readonly appConfigs: AppConfigProps,
    private readonly loggerService: ILoggerServices,
  ) {}

  @SentryExceptionCaptured()
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<FastifyReply>();
    const request = ctx.getRequest<RequestWithMeta>();

    let code: string;
    let message: string;

    const { method, originalUrl } = request;
    const requestId =
      getRequestId() ||
      request.requestId ||
      (request.headers[REQUEST_ID_HEADER] as string | undefined) ||
      "unknown";
    const userId = request.user?.sub || request.user?.userId || "anonymous";
    const query = serializeRequestPayload(request.query);
    const params = serializeRequestPayload(request.params);
    const body = serializeRequestPayload(request.body);
    const headers = serializeRequestHeaders(
      request.headers as Record<string, unknown>,
    );
    const cookies = serializeRequestCookies(request.cookies);

    const name = (exception as Error)?.name ?? "Error";
    let resContent: ApiResponse<any>;
    let dbErrorInfo: Record<string, unknown> | undefined;
    const externalErrorInfo = extractExternalErrorInfo(exception);

    if (exception instanceof HttpException) {
      message =
        (exception as any).getResponse()?.message || (exception as any).message;
      code =
        (exception as any).getResponse()?.code ||
        (exception as any).getStatus();

      resContent = {
        message: message,
        code: code,
      };
    } else if (
      exception instanceof DrizzleQueryError ||
      isDbQueryError(exception)
    ) {
      code = RESPONSE_CODE.SERVER_ERROR;
      message = formatDbErrorMessage(exception);
      dbErrorInfo = extractDbErrorInfo(exception);

      resContent = {
        message: RESPONSE_MESSAGE.SERVER_ERROR,
        code: code,
      };
    } else {
      code = RESPONSE_CODE.SERVER_ERROR;
      message = (exception as any).message || "Internal server error";

      resContent = {
        message: message,
        code: code,
      };
    }

    const stack = truncateStack((exception as any)?.stack || "");
    const causeStack = truncateStack(
      (exception as any)?.cause instanceof Error
        ? (exception as any).cause.stack
        : undefined,
    );
    const httpStatus =
      exception instanceof HttpException ? exception.getStatus() : 500;

    const logPayload = {
      requestId,
      method,
      url: originalUrl,
      userId,
      statusCode: httpStatus,
      errorCode: code,
      errorName: name,
      message: typeof message === "string" ? message : message?.["message"],
      query,
      params,
      body,
      headers,
      cookies,
      ip: request.ip,
      stack,
      causeStack,
      ...(dbErrorInfo?.params
        ? { sqlParams: dbErrorInfo.params, sqlQuery: dbErrorInfo.query }
        : {}),
      ...(dbErrorInfo ? { dbError: dbErrorInfo } : {}),
      ...(externalErrorInfo ? { externalError: externalErrorInfo } : {}),
    };

    // Single-arg: Nest Logger.error(msg, stack) treats 2nd arg as stack only.
    this.logger.error(
      `[ERROR] API Request ${method} ${originalUrl} -> ${name}: ${logPayload.message} | ${JSON.stringify(logPayload)}`,
    );

    Sentry.setTag("requestId", requestId);
    Sentry.setUser({ id: userId === "anonymous" ? undefined : userId });
    Sentry.setContext("request", {
      requestId,
      method,
      url: originalUrl,
      userId,
      query,
      params,
      body,
      headers,
      cookies,
      ip: request.ip,
    });
    if (dbErrorInfo) {
      Sentry.setContext("dbError", dbErrorInfo);
    }
    if (externalErrorInfo) {
      Sentry.setContext("externalError", externalErrorInfo);
    }

    // Local-only debug fields; requestId is header-only.
    if (this.appConfigs.nodeEnv === Environment.Local) {
      assign(resContent, {
        stack,
        ...(dbErrorInfo ? { dbError: dbErrorInfo } : {}),
      });
    }

    const stackLines = (stack || "").split("\n");
    const moduleLine =
      stackLines.find((line: string) => line.includes("src/")) ||
      "Unknown module";
    const moduleName = moduleLine.match(/src\/(.*?):/)?.[1] || "Unknown Module";

    void this.loggerService.logError({
      type: moduleName,
      content: JSON.stringify(logPayload),
      note: `User: ${userId} | requestId: ${requestId}`,
    });

    setResponseHeader(response, REQUEST_ID_HEADER, requestId);
    response.status(httpStatus).send(resContent);
  }
}
