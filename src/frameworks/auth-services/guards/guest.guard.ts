import { RESPONSE_CODE } from "@/common/constants/response";
import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";

// Allow guest users, but still validate JWT if provided
@Injectable()
export class GuestGuard extends AuthGuard("jwt") {
  private readonly logger = new Logger(GuestGuard.name);
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
