import { ExecutionContext, Injectable } from "@nestjs/common";
import { ThrottlerGuard } from "@nestjs/throttler";

@Injectable()
export class FastifyThrottlerGuard extends ThrottlerGuard {
  getRequestResponse(context: ExecutionContext) {
    const ctx = context.switchToHttp();
    return {
      req: ctx.getRequest(),
      res: ctx.getResponse(),
    };
  }
}
