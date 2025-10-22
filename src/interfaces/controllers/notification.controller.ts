import { NotificationUseCase } from "@/use-cases/notification/notification.use-case";

export class NotificationController {
  constructor(private readonly notificationUseCase: NotificationUseCase) {}
}
