import { Injectable, NestMiddleware } from "@nestjs/common";
import { CONTEXT_KEYS, runContext, setContext } from "../stores/context.store";
import { FastifyReply, FastifyRequest } from "fastify";
import { resolveExplicitRequestLanguage } from "../utils";
import { DEFAULT_LANGUAGE_CODE } from "../constants/translation";

@Injectable()
export class ContextMiddleware implements NestMiddleware {
  use(req: FastifyRequest, _res: FastifyReply, next: () => void) {
    const query = req.query as { lang?: string | string[] };

    runContext(() => {
      setContext(
        CONTEXT_KEYS.REQUEST_LANGUAGE,
        resolveExplicitRequestLanguage({
          queryLang: query.lang,
          acceptLanguage: req.headers["accept-language"],
        }),
      );
      setContext(CONTEXT_KEYS.FALLBACK_LANGUAGE, DEFAULT_LANGUAGE_CODE);
      next();
    });
  }
}
