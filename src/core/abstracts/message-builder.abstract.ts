import { Action } from "@/common/constants/action";
import {} from "@/common/constants/object-type";
import { HistoryLogDto } from "@/interfaces/dtos/activity/history-log.dto";
import { ObjectType } from "../entities";

export abstract class IMessageBuilder {
  abstract buildCommonMessage(
    actor: string,
    action: Action,
    message: string,
    highlightWords: string[],
    createdAt: number,
  ): HistoryLogDto;

  abstract buildMessageChangeStatus(
    actor: string,
    oldStatus: string,
    newStatus: string,
    createdAt: number,
    object: ObjectType,
  ): HistoryLogDto;

  abstract buildMessageCreateObject(
    actor: string,
    object: ObjectType,
    code: string,
    createdAt: number,
  ): HistoryLogDto;

  abstract buildFieldChangeMessage(
    field: string,
    beforeValue: string | null,
    afterValue: string | null,
    highlight: string[],
    createdAt: number,
  ): HistoryLogDto;
}
