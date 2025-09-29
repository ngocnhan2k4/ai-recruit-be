import { RESPONSE_CODE } from "@/common/constants/response";
import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";

@Injectable()
export class JwtAuthGuard extends AuthGuard("jwt") {
  // maintain this code to debug
  handleRequest<TokenPayload>(
    err: any,
    user: any,
    info: any,
    _context: ExecutionContext,
  ): TokenPayload {
    if (err || !user) {
      console.error("JWT Info:", info, err);
      throw new UnauthorizedException({
        message: info?.message || "Unauthorized",
        code: RESPONSE_CODE.TOKEN_EXPIRED,
      });
    }
    return user as TokenPayload;
  }
}
