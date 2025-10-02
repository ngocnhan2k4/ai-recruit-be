import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { TokenPayload } from "../types/token";

export const GetUser = createParamDecorator(
  (data: string, ctx: ExecutionContext): TokenPayload => {
    const request = ctx.switchToHttp().getRequest();
    const user = request?.user;
    return (data ? user?.[data] : user) as TokenPayload;
  },
);
