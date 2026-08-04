import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from "@nestjs/common";
import { tap } from "rxjs/internal/operators/tap";
import { ConfigService } from "@nestjs/config";
import { randomUUID } from "crypto";
import { IMessageQueueService } from "@/core/abstracts/message-queue.abstract";
import { CONTEXT_KEYS, getContext } from "@/common/stores/context.store";
import { matchAuditRoute } from "./object";

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    private readonly configService: ConfigService,
    private readonly messageQueueService: IMessageQueueService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler) {
    return next.handle().pipe(
      tap(() => {
        const req = context.switchToHttp().getRequest();
        const method = ((req.method as string) || "GET").toUpperCase();

        const pathname = this.getPathname(req.url as string);
        const appPrefix = this.configService.get<string>("GLOBAL_PREFIX")!;
        const pathWithoutPrefix = this.stripPrefix(pathname, appPrefix);

        const match = matchAuditRoute(pathWithoutPrefix, method);
        if (!match) {
          return;
        }

        const createdBy =
          (req.user?.userId as string | undefined) ??
          (req.user?.id as string | undefined) ??
          null;

        if (!createdBy) {
          console.warn(
            `[AuditInterceptor] Missing createdBy for ${method} ${pathWithoutPrefix}`,
          );
          return;
        }

        const targetId =
          (getContext(CONTEXT_KEYS.AUDIT_TARGET_ID) as string | null) ?? null;
        const organizationId =
          (getContext(CONTEXT_KEYS.AUDIT_ORGANIZATION_ID) as string | null) ??
          null;
        const data =
          (getContext(CONTEXT_KEYS.AUDIT_DATA) as
            | Record<string, unknown>
            | undefined) ?? {};

        const params = (req.params || {}) as Record<string, unknown>;
        const query = (req.query || {}) as Record<string, unknown>;

        const payload = {
          id: randomUUID(),
          createdBy,
          organizationId,
          action: match.action,
          metadata: {
            request: {
              params,
              query,
              body: req.body || {},
            },
            current: data,
          },
          targetId,
          targetType: match.targetType,
          visibility: match.visibility,
          createdAt: new Date(),
        };

        this.messageQueueService
          .addActivityLog("http_request", payload)
          .catch((err) => {
            console.error(
              "[AuditInterceptor] [addActivityLog] Failed to add activity log",
              err,
            );
          });
      }),
    );
  }

  private getPathname(url: string): string {
    return (url || "").split("?")[0];
  }

  private stripPrefix(pathname: string, prefix: string): string {
    if (pathname.startsWith(prefix)) {
      const stripped = pathname.slice(prefix.length);
      return stripped.startsWith("/") ? stripped : `/${stripped}`;
    }
    return pathname.startsWith("/") ? pathname : `/${pathname}`;
  }
}
