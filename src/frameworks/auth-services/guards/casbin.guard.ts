import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { PERM_KEY } from "@/common/constants/response";
import { CasbinService } from "../casbin/casbin.service";
import { FastifyRequest } from "fastify";
import { TokenPayload } from "@/common/types/token";

@Injectable()
export class CasbinGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly casbinService: CasbinService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req: FastifyRequest & { user: TokenPayload } = context
      .switchToHttp()
      .getRequest();
    const user = req.user;

    // Get metadata from decorator
    const meta = this.reflector.getAllAndOverride<{ obj: string; act: string }>(
      PERM_KEY,
      [context.getHandler(), context.getClass()],
    );

    // If route doesn’t require permission → allow
    if (!meta) {
      return true;
    }

    // Extract organization ID (priority: params → query → body)
    const organizationId = this.extractOrganizationId(req);

    console.log("User roles:", user.roles);
    console.log("Casbin meta:", meta.act, meta.obj);
    console.log("Organization ID:", organizationId);

    let ok = false;

    // 1️⃣ Check system-level permissions first
    ok = await this.casbinService.can(user.roles, meta.obj, meta.act);

    // 2️⃣ If not allowed at system level → check org-level permissions
    if (!ok && organizationId) {
      for (const role of user.roles) {
        if (role.startsWith("ORGANIZATION_")) {
          const hasOrgPermission = await this.casbinService.canWithDomain(
            role,
            organizationId,
            meta.obj,
            meta.act,
          );

          if (hasOrgPermission) {
            ok = true;
            break;
          }
        }
      }
    }

    // 3️⃣ Final decision
    if (!ok) {
      throw new ForbiddenException(
        "You don't have permission to access this resource",
      );
    }

    return true;
  }

  /**
   * Extracts organizationId from request (params, query, or body)
   * Supports: organization_id, organizationId, orgId
   */
  private extractOrganizationId(req: FastifyRequest): string | null {
    const keys = ["organization_id", "organizationId", "orgId"];

    // Check URL params
    for (const key of keys) {
      const value = (req.params as Record<string, any>)?.[key];
      if (value) return String(value);
    }

    // Check query params
    for (const key of keys) {
      const value = (req.query as Record<string, any>)?.[key];
      if (value) return String(value);
    }

    // Check body
    if (req.body && typeof req.body === "object") {
      for (const key of keys) {
        const value = (req.body as Record<string, any>)?.[key];
        if (value) return String(value);
      }
    }

    return null;
  }
}
