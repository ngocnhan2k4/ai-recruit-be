import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { IMessageBuilder } from "@/core/abstracts/message-builder.abstract";
import {
  IJobRepository,
  IOrganizationRepository,
  IUserRepository,
  ObjectType,
} from "@/core";
import {
  ObjectNameMap,
  RESPONSE_CODE,
  RESPONSE_MESSAGE,
} from "@/common/constants";
import { activityActionToAction } from "@/common/audit/object";
import {
  ApiResponse,
  GeneralQueryDto,
  PaginatedResultDto,
} from "@/interfaces/dtos";
import {
  AdminAuditItemDto,
  AdminAuditQueryDto,
  UserAuditItemDto,
} from "@/interfaces/dtos/activity";
import { IActivityRepository } from "@/core/abstracts/repositories/activity-repository.abstract";
import type { Activity, AuditVisibility } from "@/core/entities/activity";

type ActorInfo = { name: string | null; username: string | null };

type ActivityEnrichment = {
  actors: Map<string, ActorInfo>;
  /** key: `${targetType}:${targetId}` */
  targets: Map<string, string>;
};

function targetKey(targetType: ObjectType, targetId: string): string {
  return `${targetType}:${targetId}`;
}

function pickLabel(...values: Array<string | null | undefined>): string {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return "";
}

@Injectable()
export class ActivityUseCase {
  private readonly logger = new Logger(ActivityUseCase.name);

  constructor(
    private readonly activityRepository: IActivityRepository,
    private readonly messageBuilder: IMessageBuilder,
    private readonly userRepository: IUserRepository,
    private readonly jobRepository: IJobRepository,
    private readonly organizationRepository: IOrganizationRepository,
  ) {}

  initializeIndex(): Promise<ApiResponse<{ message: string }>> {
    return Promise.resolve({
      code: RESPONSE_CODE.SUCCESS,
      message: RESPONSE_MESSAGE.SUCCESS,
      data: {
        message: "Activities Postgres storage is ready",
      },
    });
  }

  private toCreatedAtIso(value: Date | string): string {
    return value instanceof Date ? value.toISOString() : String(value);
  }

  private toAdminAuditItem(row: Activity): AdminAuditItemDto {
    return {
      id: row.id,
      createdBy: row.createdBy,
      organizationId: row.organizationId,
      action: row.action,
      metadata: row.metadata ?? {},
      targetId: row.targetId,
      targetType: row.targetType as ObjectType,
      visibility: row.visibility as AuditVisibility,
      createdAt: this.toCreatedAtIso(row.createdAt),
    };
  }

  private async loadEnrichment(
    activities: Activity[],
  ): Promise<ActivityEnrichment> {
    const actorIds = new Set<string>();
    const jobIds = new Set<string>();
    const orgIds = new Set<string>();
    const userTargetIds = new Set<string>();

    for (const activity of activities) {
      if (activity.createdBy) {
        actorIds.add(activity.createdBy);
      }
      if (!activity.targetId) continue;

      switch (activity.targetType as ObjectType) {
        case ObjectType.JOB:
          jobIds.add(activity.targetId);
          break;
        case ObjectType.ORG:
          orgIds.add(activity.targetId);
          break;
        case ObjectType.USER:
          userTargetIds.add(activity.targetId);
          actorIds.add(activity.targetId);
          break;
      }
    }

    const userIds = [...actorIds];
    const [users, jobs, orgs] = await Promise.all([
      userIds.length
        ? this.userRepository.getByIds(userIds, ["id", "name", "username"])
        : Promise.resolve([]),
      jobIds.size
        ? this.jobRepository.getByIds([...jobIds], ["id", "title"])
        : Promise.resolve([]),
      orgIds.size
        ? this.organizationRepository.getByIds([...orgIds], ["id", "name"])
        : Promise.resolve([]),
    ]);

    const actors = new Map<string, ActorInfo>();
    for (const user of users) {
      actors.set(user.id, {
        name: user.name ?? null,
        username: user.username ?? null,
      });
    }

    const targets = new Map<string, string>();
    for (const job of jobs) {
      if (job.title) targets.set(targetKey(ObjectType.JOB, job.id), job.title);
    }
    for (const org of orgs) {
      if (org.name) {
        targets.set(targetKey(ObjectType.ORG, org.id), org.name);
      }
    }
    for (const userId of userTargetIds) {
      const actor = actors.get(userId);
      const label = pickLabel(actor?.name, actor?.username);
      if (label) targets.set(targetKey(ObjectType.USER, userId), label);
    }

    return { actors, targets };
  }

  private resolveActorLabel(
    doc: Activity,
    viewerId: string,
    enrichment: ActivityEnrichment,
  ): string {
    if (doc.createdBy === viewerId) {
      return "Bạn";
    }

    const actor = enrichment.actors.get(doc.createdBy);
    const lookedUp = pickLabel(actor?.name, actor?.username);
    if (lookedUp) return lookedUp;

    if (doc.metadata?.actorRole === "admin") {
      return "Một quản trị viên";
    }

    const metaName =
      typeof doc.metadata?.actorName === "string" ? doc.metadata.actorName : "";
    return pickLabel(metaName) || "Một thành viên";
  }

  private resolveTargetDetail(
    doc: Activity,
    enrichment: ActivityEnrichment,
  ): string {
    if (doc.targetId) {
      const lookedUp = enrichment.targets.get(
        targetKey(doc.targetType as ObjectType, doc.targetId),
      );
      if (lookedUp) return lookedUp;
    }

    const current = (doc.metadata?.current as Record<string, unknown>) ?? {};
    const labelKeys = ["title", "name", "skillName", "displayName", "username"];
    for (const key of labelKeys) {
      const value = current[key] ?? doc.metadata?.[key];
      if (typeof value === "string" && value.trim()) {
        return value.trim();
      }
    }
    return "";
  }

  private buildUserFacingLog(
    doc: Activity,
    viewerId: string,
    enrichment: ActivityEnrichment,
  ) {
    const actor = this.resolveActorLabel(doc, viewerId, enrichment);
    const httpAction = activityActionToAction(doc.action);
    const objectName =
      ObjectNameMap[doc.targetType as ObjectType] ?? "đối tượng";
    const detail = this.resolveTargetDetail(doc, enrichment);

    const messageBody = detail ? `${objectName} ${detail}` : objectName;
    const highlight = [actor, detail].filter(Boolean);
    const createdAtMs =
      (doc.createdAt instanceof Date
        ? doc.createdAt.getTime()
        : Date.parse(String(doc.createdAt))) || Date.now();

    return this.messageBuilder.buildCommonMessage(
      actor,
      httpAction,
      messageBody,
      highlight,
      createdAtMs,
    );
  }

  private mapUserFacingItems(
    activities: Activity[],
    viewerId: string,
    enrichment: ActivityEnrichment,
  ): UserAuditItemDto[] {
    return activities.map((src) => {
      const log = this.buildUserFacingLog(src, viewerId, enrichment);
      return {
        id: src.id,
        action: src.action,
        targetType: src.targetType as ObjectType,
        targetId: src.targetId,
        message: log.message,
        marks: log.marks,
        createdAt: this.toCreatedAtIso(src.createdAt),
      } satisfies UserAuditItemDto;
    });
  }

  async getAdminAudits(
    query: AdminAuditQueryDto,
  ): Promise<ApiResponse<PaginatedResultDto<AdminAuditItemDto>>> {
    const result = await this.activityRepository.getListActivities(query);

    return {
      code: RESPONSE_CODE.SUCCESS,
      message: RESPONSE_MESSAGE.SUCCESS,
      data: {
        data: result.data.map((row) => this.toAdminAuditItem(row)),
        pagination: result.pagination,
      },
    };
  }

  async getAdminAuditById(id: string): Promise<ApiResponse<AdminAuditItemDto>> {
    const raw = await this.activityRepository.getActivityById(id);
    if (!raw) {
      throw new NotFoundException("Audit log not found");
    }

    return {
      code: RESPONSE_CODE.SUCCESS,
      message: RESPONSE_MESSAGE.SUCCESS,
      data: this.toAdminAuditItem(raw),
    };
  }

  async getMyActivities(
    userId: string,
    query: GeneralQueryDto,
  ): Promise<ApiResponse<PaginatedResultDto<UserAuditItemDto>>> {
    const result = await this.activityRepository.getListActivities({
      visibility: "actor",
      actorOrTargetId: userId,
      cursor: query.cursor,
      limit: query.limit ?? 20,
    });

    const enrichment = await this.loadEnrichment(result.data);

    return {
      code: RESPONSE_CODE.SUCCESS,
      message: RESPONSE_MESSAGE.SUCCESS,
      data: {
        data: this.mapUserFacingItems(result.data, userId, enrichment),
        pagination: {
          nextCursor: result.pagination.nextCursor,
          hasNextPage: result.pagination.hasNextPage,
        },
      },
    };
  }

  async getOrganizationActivities(
    orgId: string,
    viewerId: string,
    query: GeneralQueryDto,
  ): Promise<ApiResponse<PaginatedResultDto<UserAuditItemDto>>> {
    const result = await this.activityRepository.getListActivities({
      visibility: "org",
      organizationId: orgId,
      cursor: query.cursor,
      limit: query.limit ?? 20,
    });

    const enrichment = await this.loadEnrichment(result.data);

    return {
      code: RESPONSE_CODE.SUCCESS,
      message: RESPONSE_MESSAGE.SUCCESS,
      data: {
        data: this.mapUserFacingItems(result.data, viewerId, enrichment),
        pagination: {
          nextCursor: result.pagination.nextCursor,
          hasNextPage: result.pagination.hasNextPage,
        },
      },
    };
  }
}
