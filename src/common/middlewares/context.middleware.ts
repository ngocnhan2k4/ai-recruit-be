import { Injectable, NestMiddleware } from "@nestjs/common";
import { CONTEXT_KEYS, runContext, setContext } from "../stores/context.store";
import { FastifyReply, FastifyRequest } from "fastify";
import { resolveRequestLanguage } from "../utils";
import { DEFAULT_LANGUAGE_CODE } from "../constants/translation";
import {
  REQUEST_ID_HEADER,
  createRequestId,
  setResponseHeader,
} from "../utils/request-log";

type RequestWithMeta = FastifyRequest & { requestId?: string };

@Injectable()
export class ContextMiddleware implements NestMiddleware {
  use(req: RequestWithMeta, res: FastifyReply, next: () => void) {
    const query = req.query as { lang?: string | string[] };
    const requestId =
      req.requestId || createRequestId(req.headers[REQUEST_ID_HEADER]);

    req.requestId = requestId;
    setResponseHeader(res, REQUEST_ID_HEADER, requestId);

    runContext(() => {
      setContext(CONTEXT_KEYS.REQUEST_ID, requestId);
      setContext(
        CONTEXT_KEYS.REQUEST_LANGUAGE,
        resolveRequestLanguage({
          queryLang: query.lang,
          acceptLanguage: req.headers["accept-language"],
        }),
      );
      setContext(CONTEXT_KEYS.FALLBACK_LANGUAGE, DEFAULT_LANGUAGE_CODE);
      next();
    });
  }
}
