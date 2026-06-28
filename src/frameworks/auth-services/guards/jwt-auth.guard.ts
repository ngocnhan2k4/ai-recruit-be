import { RESPONSE_CODE } from "@/common/constants";
import { ALLOWED_USER_STATUSES_KEY } from "@/common/decorators";
import { UserStatusEnum } from "@/core";
import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { Reflector } from "@nestjs/core";

@Injectable()
export class JwtAuthGuard extends AuthGuard("jwt") {
  private readonly logger = new Logger(JwtAuthGuard.name);

  constructor(private readonly reflector: Reflector) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const canActivate = (await super.canActivate(context)) as boolean;
    if (!canActivate) {
      return false;
    }

    const request = context.switchToHttp().getRequest();
    const payload = request.user as
      | { userId?: string; status?: UserStatusEnum }
      | undefined;
    if (!payload?.userId || !payload.status) {
      throw new UnauthorizedException({
        message: "Unauthorized",
        code: RESPONSE_CODE.UNAUTHORIZED,
      });
    }

    const allowedStatuses = this.reflector.getAllAndOverride<UserStatusEnum[]>(
      ALLOWED_USER_STATUSES_KEY,
      [context.getHandler(), context.getClass()],
    ) ?? [UserStatusEnum.ACTIVE];

    if (!allowedStatuses.includes(payload.status)) {
      throw new UnauthorizedException({
        message: `User account is ${payload.status}`,
        code: RESPONSE_CODE.UNAUTHORIZED,
      });
    }

    request.userStatus = payload.status;
    return true;
  }

  handleRequest<TokenPayload>(
    err: any,
    user: any,
    info: any,
    _context: ExecutionContext,
  ): TokenPayload {
    if (err || !user) {
      this.logger.error("[JwtAuthGuard] [handleRequest] JWT Info:", info, err);
      throw new UnauthorizedException({
        message: info?.message || "Unauthorized",
        code: (info?.message || "").includes("jwt expired")
          ? RESPONSE_CODE.TOKEN_EXPIRED
          : RESPONSE_CODE.UNAUTHORIZED,
      });
    }
    return user as TokenPayload;
  }
}
