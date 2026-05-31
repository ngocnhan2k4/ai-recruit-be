import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from "@nestjs/common";
import { ContextStorage } from "../stores/context.store";
import { tap } from "rxjs/internal/operators/tap";
import { ConfigService } from "@nestjs/config";
import { IMessageQueueService } from "@/core/abstracts/message-queue.abstract";

const includesPath = ["/jobs", "/jobs/:id"];

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    private readonly contextStorage: ContextStorage,
    private readonly configService: ConfigService,
    private readonly messageQueueService: IMessageQueueService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler) {
    return next.handle().pipe(
      tap(() => {
        const req = context.switchToHttp().getRequest();

        if (!this.shouldAudit(req.url)) return;

        const data = this.contextStorage.get("data");
        const objectIds = this.contextStorage.get("objectIds") || [];

        this.messageQueueService
          .addActivityLog("http_request", {
            method: req.method,
            url: req.url,
            userId: req.user?.userId,
            createdAt: new Date(),
            data: data,
            objectIds,
            request: { params: req.params, query: req.query, body: req.body },
          })
          .catch((err) => {
            console.error(
              "[AuditInterceptor] [addActivityLog] Failed to add activity log",
              err,
            );
          });
      }),
    );
  }

  private shouldAudit(path: string): boolean {
    const pathname = path.split("?")[0];

    const appPrefix = this.configService.get<string>("GLOBAL_PREFIX")!;

    return includesPath.some((p) => {
      const pattern = `${appPrefix}${p}`.replace(/:[^/]+/g, "[^/]+");

      const regex = new RegExp(`^${pattern}/?$`);

      return regex.test(pathname);
    });
  }
}
