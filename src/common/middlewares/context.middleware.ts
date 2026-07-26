import { Injectable, NestMiddleware } from "@nestjs/common";
import { CONTEXT_KEYS, runContext, setContext } from "../stores/context.store";
import { FastifyReply, FastifyRequest } from "fastify";
import { resolveExplicitRequestLanguage } from "../utils";
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
    const query = req.query as {
      lang?: string | string[];
      language?: string | string[];
      languageCode?: string | string[];
      locale?: string | string[];
    };
    const requestId =
      req.requestId || createRequestId(req.headers[REQUEST_ID_HEADER]);
    const requestLanguage =
      query.lang ??
      query.language ??
      query.languageCode ??
      query.locale ??
      req.headers["x-language"];

    req.requestId = requestId;
    setResponseHeader(res, REQUEST_ID_HEADER, requestId);

    runContext(() => {
      setContext(CONTEXT_KEYS.REQUEST_ID, requestId);
      setContext(CONTEXT_KEYS.START_TIME, performance.now());
      setContext(
        CONTEXT_KEYS.REQUEST_LANGUAGE,
        resolveExplicitRequestLanguage({
          queryLang: requestLanguage,
          acceptLanguage: req.headers["accept-language"],
        }),
      );
      setContext(CONTEXT_KEYS.FALLBACK_LANGUAGE, DEFAULT_LANGUAGE_CODE);
      next();
    });
  }
}
