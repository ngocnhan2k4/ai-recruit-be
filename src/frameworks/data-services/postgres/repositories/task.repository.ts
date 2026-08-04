import { Injectable, Inject } from "@nestjs/common";
import { GenericRepository } from "./generic-repository";
import { type DBDrizzle } from "../types";
import { tasks } from "../models/task.model";
import { users } from "../models";
import {
  ListTaskResponse,
  Task,
  TaskFilter,
  TaskStatusEnum,
} from "@/core/entities";
import { ITaskRepository } from "@/core/abstracts/repositories/task-repository.abstract";
import { PaginatedResult, RelatedEntity } from "@/common/types";
import {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  ilike,
  isNull,
  lte,
  or,
  SQL,
  sql,
} from "drizzle-orm";

const SORTABLE_FIELDS = new Set([
  "createdAt",
  "updatedAt",
  "status",
  "type",
  "name",
]);

@Injectable()
export class TaskRepository
  extends GenericRepository<Task, typeof tasks>
  implements ITaskRepository
{
  constructor(@Inject("DRIZZLE") protected db: DBDrizzle) {
    super(db, tasks);
  }

  async getTasks(
    filter: TaskFilter,
  ): Promise<PaginatedResult<ListTaskResponse>> {
    const whereConditions: SQL[] = [isNull(tasks.deletedAt)];

    if (filter.status) {
      whereConditions.push(eq(tasks.status, filter.status));
    }

    if (filter.type) {
      whereConditions.push(eq(tasks.type, filter.type));
    }

    if (filter.userId) {
      whereConditions.push(eq(tasks.userId, filter.userId));
    }

    if (filter.startDate) {
      whereConditions.push(gte(tasks.createdAt, filter.startDate));
    }

    if (filter.endDate) {
      whereConditions.push(lte(tasks.createdAt, filter.endDate));
    }

    if (filter.keyword) {
      const keyword = `%${filter.keyword}%`;
      whereConditions.push(
        or(
          ilike(sql`${tasks.id}::text`, keyword),
          ilike(tasks.name, keyword),
          ilike(sql`COALESCE(${tasks.error}, '')`, keyword),
          ilike(sql`COALESCE(${users.name}, '')`, keyword),
          ilike(sql`COALESCE(${users.email}, '')`, keyword),
        )!,
      );
    }

    const sortBy =
      filter.sortBy && SORTABLE_FIELDS.has(filter.sortBy)
        ? filter.sortBy
        : "createdAt";
    const sortDirection = filter.sortDirection === "asc" ? asc : desc;
    const sortColumn = (tasks as any)[sortBy] ?? tasks.createdAt;

    const whereClause =
      whereConditions.length > 0 ? and(...whereConditions) : undefined;

    const [tasksResult, totalResult, summaryRows] = await Promise.all([
      this.db
        .select({
          id: tasks.id,
          name: tasks.name,
          input: tasks.input,
          result: tasks.result,
          error: tasks.error,
          status: tasks.status,
          type: tasks.type,
          userId: tasks.userId,
          createdAt: tasks.createdAt,
          updatedAt: tasks.updatedAt,
          deletedAt: tasks.deletedAt,
          user: sql<
            (RelatedEntity & { email?: string | null }) | undefined
          >`json_build_object('id', ${users.id}, 'name', COALESCE(${users.name}, ${users.email}), 'email', ${users.email})`.as(
            "user",
          ),
        })
        .from(tasks)
        .leftJoin(users, eq(tasks.userId, users.id))
        .where(whereClause)
        .orderBy(sortDirection(sortColumn))
        .limit(filter.limit)
        .offset((filter.page! - 1) * filter.limit),
      this.db
        .select({ count: count() })
        .from(tasks)
        .leftJoin(users, eq(tasks.userId, users.id))
        .where(whereClause),
      this.db
        .select({
          status: tasks.status,
          count: count(),
        })
        .from(tasks)
        .where(isNull(tasks.deletedAt))
        .groupBy(tasks.status),
    ]);

    const statusCounts = Object.fromEntries(
      summaryRows.map((row) => [row.status, Number(row.count)]),
    ) as Record<string, number>;

    const summary: Record<string, number> = {
      total: Object.values(statusCounts).reduce((sum, n) => sum + n, 0),
      pending: statusCounts[TaskStatusEnum.PENDING] ?? 0,
      inProgress: statusCounts[TaskStatusEnum.IN_PROGRESS] ?? 0,
      completed: statusCounts[TaskStatusEnum.COMPLETED] ?? 0,
      failed: statusCounts[TaskStatusEnum.FAILED] ?? 0,
    };

    return {
      data: tasksResult as ListTaskResponse[],
      pagination: { total: Number(totalResult[0]?.count ?? 0) },
      summary,
    };
  }
}
