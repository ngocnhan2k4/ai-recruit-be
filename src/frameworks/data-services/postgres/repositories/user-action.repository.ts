import { Inject, Injectable } from "@nestjs/common";
import { and, count, eq, inArray, sql } from "drizzle-orm";
import { type DBDrizzle } from "../types";
import { userActions } from "../models";
import { IUserActionRepository } from "@/core/abstracts/repositories/user-action-repository.abstract";
import { ObjectType, UserActionType } from "@/core/entities";

@Injectable()
export class UserActionRepository implements IUserActionRepository {
  constructor(@Inject("DRIZZLE") private readonly db: DBDrizzle) {}

  private buildObjectActionWhere(
    objectId: string,
    objectType: ObjectType,
    actionType: UserActionType,
  ) {
    return and(
      eq(userActions.objectId, objectId),
      eq(userActions.objectType, objectType),
      eq(userActions.type, actionType),
      sql`${userActions.deletedAt} IS NULL`,
    );
  }

  async getActionCount(
    objectId: string,
    objectType: ObjectType,
    actionType: UserActionType,
  ): Promise<number> {
    const [result] = await this.db
      .select({ total: count(userActions.id) })
      .from(userActions)
      .where(this.buildObjectActionWhere(objectId, objectType, actionType));

    return Number(result?.total ?? 0);
  }

  async getActionCountsByObjectIds(
    objectIds: string[],
    objectType: ObjectType,
    actionType: UserActionType,
  ): Promise<Record<string, number>> {
    if (objectIds.length === 0) {
      return {};
    }

    const rows = await this.db
      .select({
        objectId: userActions.objectId,
        total: count(userActions.id),
      })
      .from(userActions)
      .where(
        and(
          inArray(userActions.objectId, objectIds),
          eq(userActions.objectType, objectType),
          eq(userActions.type, actionType),
          sql`${userActions.deletedAt} IS NULL`,
        ),
      )
      .groupBy(userActions.objectId);

    return rows.reduce(
      (acc, row) => {
        acc[row.objectId] = Number(row.total ?? 0);
        return acc;
      },
      {} as Record<string, number>,
    );
  }

  async getUserActionState(
    objectId: string,
    objectType: ObjectType,
    userId: string,
  ): Promise<{ isLiked: boolean; isSaved: boolean }> {
    const [result] = await this.db
      .select({
        isLiked: sql<boolean>`BOOL_OR(${userActions.type} = 'LIKE' AND ${userActions.deletedAt} IS NULL)`,
        isSaved: sql<boolean>`BOOL_OR(${userActions.type} = 'SAVE' AND ${userActions.deletedAt} IS NULL)`,
      })
      .from(userActions)
      .where(
        and(
          eq(userActions.objectId, objectId),
          eq(userActions.objectType, objectType),
          eq(userActions.userId, userId),
        ),
      );

    return {
      isLiked: result?.isLiked ?? false,
      isSaved: result?.isSaved ?? false,
    };
  }

  async toggleAction(
    objectId: string,
    objectType: ObjectType,
    userId: string,
    actionType: UserActionType,
  ): Promise<void> {
    await this.db
      .insert(userActions)
      .values({
        objectId,
        objectType,
        userId,
        type: actionType,
      })
      .onConflictDoUpdate({
        target: [
          userActions.objectType,
          userActions.objectId,
          userActions.userId,
          userActions.type,
        ],
        set: {
          deletedAt: sql`CASE WHEN ${userActions.deletedAt} IS NULL THEN NOW() ELSE NULL END`,
          updatedAt: sql`NOW()`,
        },
      });
  }
}
