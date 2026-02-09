import { type AppConfigProps } from "@/common/config";
import { ApiResponse } from "@/interfaces/dtos";
import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  Logger,
} from "@nestjs/common";
import { FastifyReply, FastifyRequest } from "fastify";
import { assign } from "lodash";
import { RESPONSE_CODE } from "@/common/constants";
import { ILoggerServices } from "@/core/abstracts/logger-services.abstract";
import { Environment } from "@/common/config";
import { DrizzleQueryError } from "drizzle-orm";

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  constructor(
    private readonly appConfigs: AppConfigProps,
    private readonly loggerService: ILoggerServices,
  ) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<FastifyReply>();
    const request = ctx.getRequest<FastifyRequest>();

    let code: string;
    let message: string;

    const { method, originalUrl } = request;

    const name = (exception as any).name;
    let resContent: ApiResponse<any>;

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
    } else if (exception instanceof DrizzleQueryError) {
      code = RESPONSE_CODE.BAD_REQUEST;
      message = exception.cause?.message || "Bad request";

      resContent = {
        message: message,
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

    const stack = (exception as any).stack || "";

    this.logger.error(
      `${method} ${originalUrl} -> ${name}: ${resContent.message || resContent.code}`,
      stack,
    );

    if (this.appConfigs.nodeEnv === Environment.Local) {
      assign(resContent, { stack });
    }

    const stackLines = (exception as any).stack.split("\n") || [];
    const moduleLine =
      stackLines.find((line: string) => line.includes("src/")) ||
      "Unknown module";
    const moduleName = moduleLine.match(/src\/(.*?):/)?.[1] || "Unknown Module";

    const userId = request["user"]?.sub || "Unknown User";
    this.loggerService.logError({
      type: moduleName,
      content: JSON.stringify({
        method,
        url: originalUrl,
        statusCode: code,
        message: message["message"] || message,
        stack,
      }),
      note: `User: ${userId}`,
    });

    response
      .status(exception instanceof HttpException ? exception.getStatus() : 500)
      .send(resContent);
  }
}
