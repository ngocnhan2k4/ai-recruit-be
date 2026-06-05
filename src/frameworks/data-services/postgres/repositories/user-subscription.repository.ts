import { UserSubscription } from "@/core";
import { GenericRepository } from "./generic-repository";
import { Inject, Injectable } from "@nestjs/common";
import { type DBDrizzle } from "../types";
import {
  UpdateUserSubscriptionInput,
  IUserSubscriptionRepository,
} from "@/core";
import { userSubscriptions } from "../models";
import { and, eq, gte, inArray, isNull, SQL, sql } from "drizzle-orm";
import {
  GetUserSubscriptionFilter,
  UserSubscriptionStatusEnum,
} from "@/core/entities";

@Injectable()
export class UserSubscriptionRepository
  extends GenericRepository<UserSubscription, typeof userSubscriptions>
  implements IUserSubscriptionRepository
{
  constructor(@Inject("DRIZZLE") protected db: DBDrizzle) {
    super(db, userSubscriptions);
  }

  async updateUserSubscription(
    id: string,
    data: UpdateUserSubscriptionInput,
  ): Promise<UserSubscription | null> {
    return this.db.transaction(async (tx) => {
      if (data.status === UserSubscriptionStatusEnum.ACTIVE) {
        await tx
          .update(userSubscriptions)
          .set({
            status: UserSubscriptionStatusEnum.CANCELED,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(userSubscriptions.userId, data.userId),
              eq(userSubscriptions.status, UserSubscriptionStatusEnum.ACTIVE),
              isNull(userSubscriptions.deletedAt),
              sql`${userSubscriptions.id} <> ${id}`,
            ),
          );
      }

      const [updated] = await tx
        .update(userSubscriptions)
        .set({
          ...(data.subscriptionId !== undefined && {
            subscriptionId: data.subscriptionId,
          }),
          ...(data.status !== undefined && { status: data.status }),
          ...(data.expiredAt !== undefined && { expiredAt: data.expiredAt }),
          updatedAt: new Date(),
        })
        .where(eq(userSubscriptions.id, id))
        .returning();

      return (updated as UserSubscription) ?? null;
    });
  }

  async getListUserSubscriptions(
    filter: GetUserSubscriptionFilter,
  ): Promise<UserSubscription[]> {
    const whereConditions: SQL[] = [isNull(userSubscriptions.deletedAt)];

    if (filter.statuses && filter.statuses.length > 0) {
      whereConditions.push(inArray(userSubscriptions.status, filter.statuses));
    }

    if (filter.fromDate) {
      whereConditions.push(gte(userSubscriptions.createdAt, filter.fromDate));
    }

    return this.db
      .select()
      .from(userSubscriptions)
      .where(and(...whereConditions));
  }
}
