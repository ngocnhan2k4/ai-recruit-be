import { Injectable, Logger, NestMiddleware } from "@nestjs/common";
import { FastifyReply, FastifyRequest } from "fastify";
import {
  REQUEST_ID_HEADER,
  createRequestId,
  serializeRequestPayload,
  setResponseHeader,
} from "@/common/utils/request-log";

type RequestWithMeta = FastifyRequest & { requestId?: string };

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger(LoggerMiddleware.name);

  use(req: RequestWithMeta, res: FastifyReply, next: () => void) {
    req["startTime"] = performance.now();

    const requestId =
      req.requestId || createRequestId(req.headers[REQUEST_ID_HEADER]);
    req.requestId = requestId;
    setResponseHeader(res, REQUEST_ID_HEADER, requestId);

    const { method, originalUrl } = req;
    const body = serializeRequestPayload(req.body);
    const query = serializeRequestPayload(req.query);

    const parts = [
      method,
      originalUrl,
      query ? `query=${query}` : null,
      body ? `body=${body}` : null,
    ].filter(Boolean);

    this.logger.log(parts.join(" "));

    next();
  }
}
