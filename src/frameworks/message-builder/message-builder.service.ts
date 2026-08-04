import { ObjectNameMap } from "@/common/constants/object-type";
import { IMessageBuilder } from "@/core/abstracts/message-builder.abstract";
import {
  AuditMarkDto,
  HistoryLogDto,
} from "@/interfaces/dtos/activity/history-log.dto";
import { Injectable } from "@nestjs/common";
import { Action } from "@/common/constants/action";
import { ObjectType } from "@/core";

@Injectable()
export class MessageBuilder implements IMessageBuilder {
  buildCommonMessage(
    actor: string,
    action: Action,
    message: string,
    highlightWords: string[],
    createdAt: number,
  ): HistoryLogDto {
    const actionName = this.humanizeAction(action);
    const completeMessage = actionName
      ? `${actor} ${actionName} ${message}`
      : `${actor} ${message}`;

    const words = [...highlightWords, actor].filter(Boolean);
    return {
      message: completeMessage,
      marks: this.findMarks(completeMessage, words),
      createdAt,
    };
  }

  buildMessageChangeStatus(
    actor: string,
    oldStatus: string,
    newStatus: string,
    createdAt: number,
    object: ObjectType,
  ): HistoryLogDto {
    const objectName = ObjectNameMap[object] ?? "đối tượng";
    let completeMessage: string;
    let highlightWords: string[];

    switch (newStatus.toLowerCase()) {
      case "approved":
      case "active":
        completeMessage = `${actor} đã duyệt ${objectName} này`;
        highlightWords = [actor];
        break;
      case "rejected":
        completeMessage = `${actor} đã từ chối ${objectName} này`;
        highlightWords = [actor];
        break;
      default:
        completeMessage = `${actor} đã cập nhật trạng thái từ ${oldStatus} sang ${newStatus}`;
        highlightWords = [actor, oldStatus, newStatus];
        break;
    }

    return {
      message: completeMessage,
      marks: this.findMarks(completeMessage, highlightWords),
      createdAt,
    };
  }

  buildMessageCreateObject(
    actor: string,
    object: ObjectType,
    code: string,
    createdAt: number,
  ): HistoryLogDto {
    const objectName = ObjectNameMap[object] ?? "đối tượng";
    const message = `${actor} đã tạo ${objectName} mới ${code}`.trim();
    return {
      message,
      marks: this.findMarks(message, [actor, code].filter(Boolean)),
      createdAt,
    };
  }

  buildFieldChangeMessage(
    field: string,
    beforeValue: string | null,
    afterValue: string | null,
    highlight: string[],
    createdAt: number,
  ): HistoryLogDto {
    const toDisplay = (
      v: string | null,
    ): { present: boolean; text: string } => {
      if (v === null || v === undefined)
        return { present: false, text: "trống" };
      const trimmed = v.trim();
      if (!trimmed) return { present: false, text: "trống" };
      return { present: true, text: trimmed };
    };

    const before = toDisplay(beforeValue);
    const after = toDisplay(afterValue);

    let msg = "";
    switch (true) {
      case !before.present && after.present:
        msg = `Đã thêm ${field}: ${after.text}`;
        break;
      case before.present && !after.present:
        msg = `Đã xóa ${field}: ${before.text}`;
        break;
      case before.present && after.present && before.text !== after.text:
        msg = `Đã đổi ${field}: ${before.text} → ${after.text}`;
        break;
      default:
        msg = "";
    }

    return {
      message: msg,
      marks: this.findMarks(msg, highlight),
      createdAt,
    };
  }

  private findMarks(message: string, words: string[]): AuditMarkDto[] {
    if (!message || !words?.length) return [];

    const msgFold = message.toLocaleLowerCase("vi");
    const marks: AuditMarkDto[] = [];

    for (const word of words) {
      if (!word) continue;
      const wFold = word.toLocaleLowerCase("vi");
      if (!wFold) continue;

      let from = 0;
      while (from <= msgFold.length - wFold.length) {
        const idx = msgFold.indexOf(wFold, from);
        if (idx === -1) break;

        marks.push({
          startIndex: idx,
          endIndex: idx + wFold.length,
          styles: ["bold"],
        });
        from = idx + wFold.length;
      }
    }

    return marks;
  }

  private humanizeAction(action: Action): string {
    switch (action) {
      case Action.ActionInsert:
        return "đã thêm";
      case Action.ActionUpdate:
        return "đã cập nhật";
      case Action.ActionDelete:
        return "đã xóa";
      case Action.ActionApprove:
        return "đã duyệt";
      case Action.ActionCancel:
        return "đã hủy";
      case Action.ActionActive:
        return "đã kích hoạt";
      case Action.ActionInactive:
        return "đã vô hiệu hóa";
      case Action.ActionApply:
        return "đã ứng tuyển";
      case Action.ActionSave:
        return "đã lưu";
      case Action.ActionInvite:
        return "đã mời vào";
      case Action.ActionKick:
        return "đã buộc rời";
      case Action.ActionLeave:
        return "đã rời";
      case Action.ActionVerify:
        return "đã xác minh";
      case Action.ActionConfirm:
        return "đã xác nhận";
      case Action.ActionRestore:
        return "đã khôi phục";
      case Action.ActionLink:
        return "đã liên kết";
      case Action.ActionUnlink:
        return "đã hủy liên kết";
      case Action.ActionComplete:
        return "đã hoàn thành";
      case Action.ActionSend:
        return "đã gửi";
      default:
        return "";
    }
  }
}
