import { INotificationRepository } from "@/core";
import { Injectable } from "@nestjs/common";

@Injectable()
export class NotificationUseCase {
  constructor(
    private readonly notificationRepository: INotificationRepository,
  ) {}
}
