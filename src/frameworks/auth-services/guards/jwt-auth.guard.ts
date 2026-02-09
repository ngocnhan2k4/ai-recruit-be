import { RESPONSE_CODE } from "@/common/constants";
import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";

@Injectable()
export class JwtAuthGuard extends AuthGuard("jwt") {
  private readonly logger = new Logger(JwtAuthGuard.name);
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
