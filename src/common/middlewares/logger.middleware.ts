import { Injectable, Logger, NestMiddleware } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { FastifyReply, FastifyRequest } from "fastify";

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger(LoggerMiddleware.name);

  constructor(private readonly configService: ConfigService) {}

  use(req: FastifyRequest, res: FastifyReply, next: () => void) {
    let bodyMsg: string = "";
    const { method, originalUrl, body } = req;
    if (
      Object.keys((body || {}) as Record<string, any>).length > 0 &&
      this.configService.get<string>("NODE_ENV") === "local"
    ) {
      bodyMsg = `-> BODY: ${JSON.stringify(body)}`;
    }
    this.logger.log(`${method} ${originalUrl} ${bodyMsg || ""}`);

    next();
  }
}
