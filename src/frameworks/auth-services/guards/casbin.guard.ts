import {
  ExecutionContext,
  Injectable,
  ForbiddenException,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { CasbinService } from "../casbin/casbin.service";
import { FastifyRequest } from "fastify";
import { TokenPayload } from "@/common/types/token";
import { newEnforceContext } from "casbin";

@Injectable()
export class CasbinGuard {
  constructor(
    private readonly reflector: Reflector,
    private readonly casbinService: CasbinService,
  ) {}

  // async canActivate(context: ExecutionContext): Promise<boolean> {
  //   const req: FastifyRequest & { user: TokenPayload } = context
  //     .switchToHttp()
  //     .getRequest();
  //   const user = req.user;

  //   // Get metadata from decorator
  //   const meta = this.reflector.getAllAndOverride<{ obj: string; act: string }>(
  //     PERM_KEY,
  //     [context.getHandler(), context.getClass()],
  //   );

  //   // If route doesn't require permission → allow
  //   if (!meta) {
  //     return true;
  //   }

  //   // Extract organization ID (priority: params → query → body)
  //   const organizationId = this.extractKeyFromRequest(req, "organization_id");

  //   console.log("User roles:", user.roles);
  //   console.log("Casbin meta:", meta.act, meta.obj);
  //   console.log("Organization ID:", organizationId);

  //   let ok = false;

  //   // 1️⃣ Check system-level permissions first
  //   ok = await this.casbinService.can(user.roles, meta.obj, meta.act);

  //   // 2️⃣ If not allowed at system level → check org-level permissions
  //   if (!ok && organizationId) {
  //     for (const role of user.roles) {
  //       if (role.startsWith("ORGANIZATION_")) {
  //         const hasOrgPermission = await this.casbinService.canWithDomain(
  //           PtypeEnum.DOMAIN_ASSIGNMENT,
  //           user.userId,
  //           "org",
  //           organizationId,
  //           meta.obj,
  //           meta.act,
  //         );

  //         if (hasOrgPermission) {
  //           ok = true;
  //           break;
  //         }
  //       }
  //     }
  //   }

  //   // 3️⃣ Final decision
  //   if (!ok) {
  //     throw new ForbiddenException(
  //       "You don't have permission to access this resource",
  //     );
  //   }

  //   return true;
  // }

  /**
   * Authorizes a system-level request (r = sub, obj, act)
   * Similar to Go's CheckAuthorizeSystem
   */
  async authorizeSystem(context: ExecutionContext): Promise<boolean> {
    const req: FastifyRequest & { user: TokenPayload } = context
      .switchToHttp()
      .getRequest();

    const user = req.user;
    if (!user) {
      throw new UnauthorizedException("User not authenticated");
    }

    const fullPath = req.url;
    const method = req.method;

    const ok = await this.checkAuthorizeSystem(user.userId, fullPath, method);

    if (!ok) {
      throw new ForbiddenException("Insufficient permissions");
    }

    return true;
  }

  /**
   * Authorizes an organization-level request (r2 = sub, org_id, obj, act)
   * Similar to Go's CheckAuthorizeOrganization
   */
  async authorizeOrganization(context: ExecutionContext): Promise<boolean> {
    const req: FastifyRequest & { user: TokenPayload } = context
      .switchToHttp()
      .getRequest();

    const user = req.user;
    if (!user) {
      throw new UnauthorizedException("User not authenticated");
    }

    const organizationId = this.extractKeyFromRequest(req, "orgId");
    // Use routeOptions.url to get the route pattern (e.g., /api/v1/organizations/:orgId)
    // instead of req.url which contains the actual URL with resolved params
    const fullPath: string =
      (req as unknown as { routeOptions?: { url?: string } }).routeOptions
        ?.url || req.url;
    const method = req.method;

    const ok = await this.checkAuthorizeOrganization(
      user.userId,
      organizationId,
      fullPath,
      method,
    );

    if (!ok) {
      throw new ForbiddenException("Insufficient permissions");
    }

    return true;
  }

  /**
   * Checks system-level authorization
   * Similar to Go's CheckAuthorizeSystem
   */
  private async checkAuthorizeSystem(
    userId: string,
    fullPath: string,
    method: string,
  ): Promise<boolean> {
    const enforcer = await this.casbinService.getCachedEnforcer(userId);

    try {
      // Use userId directly - matcher g(r.sub, p.sub) will resolve to roles
      return await enforcer.enforce(userId, fullPath, method);
    } catch (error) {
      console.error("[CheckAuthorizeSystem] error:", error);
      return false;
    }
  }

  /**
   * Checks organization-level authorization using m2 matcher
   * Similar to Go's CheckAuthorizeOrganization
   *
   * Uses r2 = sub, org_id, obj, act
   * Matcher m2 checks: g2(r2.sub, p2.sub, r2.org_id) && p2.dom_type == "org" && keyMatch2(r2.obj, p2.obj) && regexMatch(r2.act, p2.act)
   */
  private async checkAuthorizeOrganization(
    userId: string,
    organizationId: string | undefined,
    fullPath: string,
    method: string,
  ): Promise<boolean> {
    const enforcer = await this.casbinService.getCachedEnforcer(userId);

    try {
      if (organizationId) {
        // Use EnforceContext to specify we want to use r2, p2, e2, m2
        // This matches Go's: enforcer.Enforce(casbin.NewEnforceContext("2"), userId, organizationId, fullPath, method)
        const enforceContext = newEnforceContext("2");

        // r2 = sub, org_id, obj, act
        const ok = await enforcer.enforce(
          enforceContext,
          userId,
          organizationId,
          fullPath,
          method,
        );

        return ok;
      }

      // Fallback to system-level check if no organizationId
      return await enforcer.enforce(userId, fullPath, method);
    } catch (error) {
      console.error("[CheckAuthorizeOrganization] error:", error);
      return false;
    }
  }

  /**
   * Extracts a key from request (params, query, body, or headers)
   * Similar to Go's ExtractKeyFromRequest
   */
  private extractKeyFromRequest(
    req: FastifyRequest,
    key: string,
  ): string | undefined {
    const lowerKey = key.toLowerCase();

    // 1️⃣ Check headers
    const headerValue = req.headers[lowerKey];
    if (headerValue) {
      return Array.isArray(headerValue) ? headerValue[0] : headerValue;
    }

    // 2️⃣ Check route params
    const paramsValue =
      (req.params as Record<string, any>)?.[key] ??
      (req.params as Record<string, any>)?.[lowerKey];
    if (paramsValue) return String(paramsValue);

    // 3️⃣ Check query string
    const queryValue =
      (req.query as Record<string, any>)?.[key] ??
      (req.query as Record<string, any>)?.[lowerKey];
    if (queryValue) return String(queryValue);

    // 4️⃣ Check request body
    const bodyValue =
      (req.body as Record<string, any>)?.[key] ??
      (req.body as Record<string, any>)?.[lowerKey];
    if (bodyValue) return String(bodyValue);

    return undefined;
  }
}
