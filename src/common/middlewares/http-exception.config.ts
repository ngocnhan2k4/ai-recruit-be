import { type AppConfigProps } from "@/common/config/app.config";
import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  Logger,
} from "@nestjs/common";
import { FastifyReply, FastifyRequest } from "fastify";
import { assign } from "lodash";

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  constructor(private readonly appConfigs: AppConfigProps) {}

  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<FastifyReply>();
    const request = ctx.getRequest<FastifyRequest>();

    const { method, originalUrl } = request;

    const name = exception.name;
    const status = exception.getStatus();
    const data = exception.getResponse();

    this.logger.error(
      `${method} ${originalUrl} -> ${name}: ${data["message"] || data}`,
    );

    let resContent: string | object;
    if (typeof data === "string") {
      resContent = { message: data };
    } else if (data instanceof Error) {
      resContent = {
        message: data.message,
      };
    } else {
      resContent = data;
    }
    if (this.appConfigs.nodeEnv === "development") {
      assign(resContent, { stack: exception.stack });
    }

    response.status(status).send(resContent);
  }
}
