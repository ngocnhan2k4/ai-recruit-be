import { Injectable, NestMiddleware } from "@nestjs/common";
import { ContextStorage } from "../stores/context.store";
import { FastifyReply, FastifyRequest } from "fastify";

@Injectable()
export class ContextMiddleware implements NestMiddleware {
  constructor(private readonly contextStorage: ContextStorage) {}

  use(req: FastifyRequest, res: FastifyReply, next: () => void) {
    this.contextStorage.run(() => next());
  }
}
