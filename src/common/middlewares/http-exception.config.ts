import { type AppConfigProps } from "@/common/config/app.config";
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
import { RESPONSE_CODE } from "../constants/response";

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  constructor(private readonly appConfigs: AppConfigProps) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<FastifyReply>();
    const request = ctx.getRequest<FastifyRequest>();

    const { method, originalUrl } = request;

    const name = (exception as any).name;
    let resContent: ApiResponse<any>;

    if (exception instanceof HttpException) {
      resContent = {
        message:
          (exception as any).getResponse()?.message ||
          (exception as any).message,
        code:
          (exception as any).getResponse()?.code ||
          (exception as any).getStatus(),
      };
    } else {
      resContent = {
        message: (exception as any).message || "Internal server error",
        code: RESPONSE_CODE.SERVER_ERROR,
      };
    }
    this.logger.error(
      `${method} ${originalUrl} -> ${name}: ${resContent.message || resContent.code}`,
    );

    if (this.appConfigs.nodeEnv === "development") {
      assign(resContent, { stack: (exception as any).stack });
    }

    response
      .status(exception instanceof HttpException ? exception.getStatus() : 500)
      .send(resContent);
  }
}
