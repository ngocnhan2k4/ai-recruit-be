import { ObjectType, UserActionType } from "@/core/entities";

export abstract class IUserActionRepository {
  abstract getActionCount(
    objectId: string,
    objectType: ObjectType,
    actionType: UserActionType,
  ): Promise<number>;

  abstract getActionCountsByObjectIds(
    objectIds: string[],
    objectType: ObjectType,
    actionType: UserActionType,
  ): Promise<Record<string, number>>;

  abstract getUserActionState(
    objectId: string,
    objectType: ObjectType,
    userId: string,
  ): Promise<{ isLiked: boolean; isSaved: boolean }>;

  abstract toggleAction(
    objectId: string,
    objectType: ObjectType,
    userId: string,
    actionType: UserActionType,
  ): Promise<void>;
}
