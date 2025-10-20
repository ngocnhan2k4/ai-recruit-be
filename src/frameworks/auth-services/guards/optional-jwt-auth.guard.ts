import { Injectable, ExecutionContext, Logger } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";

@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard("jwt") {
  private readonly logger = new Logger(OptionalJwtAuthGuard.name);

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

  // Override canActivate to handle JWT parsing but not block requests
  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      const result = await super.canActivate(context);
      return !!result;
    } catch (error) {
      // If JWT parsing fails, continue without user (don't block request)
      this.logger.debug("[OptionalJwtAuthGuard] JWT parsing failed:", error);
      return true;
    }
  }
}
