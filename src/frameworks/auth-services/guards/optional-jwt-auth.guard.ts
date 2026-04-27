import { RESPONSE_CODE } from "@/common/constants";
import { IUserRepository } from "@/core";
import {
  Injectable,
  ExecutionContext,
  Logger,
  Inject,
  UnauthorizedException,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";

@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard("jwt") {
  private readonly logger = new Logger(OptionalJwtAuthGuard.name);
  private readonly blockedStatuses = new Set([
    "banned",
    "pending_deletion",
    "deleted",
  ]);

  constructor(
    @Inject(IUserRepository) private readonly userRepository: IUserRepository,
  ) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      const result = (await super.canActivate(context)) as boolean;
      if (!result) {
        return false;
      }

      const request = context.switchToHttp().getRequest();
      const payload = request.user as { userId?: string } | undefined;
      if (!payload?.userId) {
        return true;
      }

      const user = await this.userRepository.get(payload.userId);
      if (!user || this.blockedStatuses.has(String(user.status))) {
        throw new UnauthorizedException({
          message: user ? `User account is ${user.status}` : "Unauthorized",
          code: RESPONSE_CODE.UNAUTHORIZED,
        });
      }

      request.userStatus = user.status;
      return true;
    } catch (error) {
      // If JWT parsing or user validation fails, continue without user.
      this.logger.debug("[OptionalJwtAuthGuard] JWT parsing failed:", error);
      return true;
    }
  }

  handleRequest(
    err: any,
    user: any,
    info: any,
    _context: ExecutionContext,
  ): any {
    // If there's an error or no user, return null instead of throwing
    if (err || !user) {
      this.logger.debug(
        "[OptionalJwtAuthGuard] No valid user found:",
        info?.message,
      );
      return null;
    }
    return user;
  }
}
