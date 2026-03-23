import { UserSubscription } from "@/core";
import { GenericRepository } from "./generic-repository";
import { Inject, Injectable } from "@nestjs/common";
import { type DBDrizzle } from "../types";
import {
  UpdateUserSubscriptionInput,
  IUserSubscriptionRepository,
} from "@/core";
import { userSubscriptions } from "../models";
import { and, eq, isNull, sql } from "drizzle-orm";
import { UserSubscriptionStatusEnum } from "@/core/entities";

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
}
