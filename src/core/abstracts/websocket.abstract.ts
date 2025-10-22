import { Notification } from "../entities";
import { IdentityUser } from "../entities/websocket.entity";

export abstract class IWebSocketGateway {
  abstract sendToUser(
    identity: IdentityUser,
    notification: Notification,
  ): boolean;
  abstract broadcast(notification: Notification): void;
  abstract sendToRoom(room: string, notification: Notification): void;
}
