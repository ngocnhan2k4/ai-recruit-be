import {
  WebSocketGateway as WSGateway,
  WebSocketServer,
  SubscribeMessage,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { Injectable, Logger } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { Notification } from "@/core";
import { IWebSocketGateway } from "@/core/abstracts/websocket.abstract";
import { IdentityUser } from "@/core/entities/websocket.entity";
import { RoleEnum } from "@/common/constants";
import { ROOM_NOTIFICATIONS } from "@/common/constants";

interface AuthenticatedSocket extends Socket, IdentityUser {
  roles?: RoleEnum[];
}

@Injectable()
@WSGateway({
  namespace: "/notifications",
})
export class WebSocketGateway
  implements IWebSocketGateway, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(WebSocketGateway.name);
  private connectedUsers = new Map<string, AuthenticatedSocket>();

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  afterInit(server: Server) {
    server.engine.opts.cors = {
      origin: this.configService.get<string[]>("CORS_ORIGINS"),
      methods: ["GET", "POST"],
      credentials: true,
    };
  }

  handleConnection(client: AuthenticatedSocket) {
    try {
      // Extract token from handshake query or headers
      const token =
        (client.handshake.query.token as string) ||
        (client.handshake.auth.token as string) ||
        client.handshake.headers.authorization?.replace("Bearer ", "");

      if (!token) {
        this.logger.warn("Client connected without token");
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token, {
        secret: this.configService.get<string>("JWT_SECRET"),
      });
      client.userId = payload.userId;
      client.roles = payload.roles || [];

      if (!client.userId) {
        this.logger.warn("Token invalid");
        client.disconnect();
        return;
      }

      const orgId = client.handshake.query.organizationId as string;
      const roomUser = ROOM_NOTIFICATIONS.user({
        userId: client.userId,
        orgId: orgId,
      });
      this.connectedUsers.set(roomUser, client);

      this.logger.log(`User ${roomUser} connected to WebSocket`);

      // Join user-specific room
      client.join(`user_${roomUser}`);

      // Check if user is admin and join admin room
      const isAdmin =
        client.roles &&
        (client.roles.includes(RoleEnum.ADMIN) ||
          client.roles.includes(RoleEnum.SUPER_ADMIN));

      if (isAdmin) {
        client.join(ROOM_NOTIFICATIONS.admin);
        this.logger.log(`Admin user ${client.userId} joined admin room`);
      }

      if (orgId) {
        client.join(ROOM_NOTIFICATIONS.org({ orgId: orgId }));
        this.logger.log(
          `User ${client.userId} joined organization room ${ROOM_NOTIFICATIONS.org({ orgId: orgId })}`,
        );
      }

      client.emit("connected", {
        message: "Connected to notification service",
        userId: client.userId,
        orgId: orgId ? orgId : "none",
      });
    } catch (error) {
      this.logger.error("WebSocket authentication failed:", error);
      client.disconnect();
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    if (client.userId) {
      const roomUser = ROOM_NOTIFICATIONS.user({
        userId: client.userId,
        orgId: client.organizationId,
      });

      this.connectedUsers.delete(roomUser);
      this.logger.log(
        `User ${ROOM_NOTIFICATIONS.user({
          userId: client.userId,
          orgId: client.organizationId,
        })} disconnected from WebSocket`,
      );
    }
  }

  @SubscribeMessage("ping")
  handlePing(@ConnectedSocket() client: AuthenticatedSocket) {
    client.emit("pong", { timestamp: new Date().toISOString() });
  }

  sendToUser(identity: IdentityUser, notification: Notification) {
    const userSocket = this.connectedUsers.get(
      ROOM_NOTIFICATIONS.user({
        userId: identity.userId,
        orgId: identity.organizationId,
      }),
    );

    if (userSocket) {
      userSocket.emit("notification", notification);
      this.logger.log(
        `Notification sent to user ${identity.userId}, orgId:${identity.organizationId}`,
      );
      return true;
    }
    this.logger.warn(
      `User ${identity.userId}, orgId:${identity.organizationId} is not connected`,
    );
    return false;
  }

  // Method to broadcast notification to all connected users
  broadcast(notification: Notification) {
    this.server.emit("notification", notification);
    this.logger.log(
      `Broadcast notification sent to ${this.connectedUsers.size} users`,
    );
  }

  sendToRoom(room: string, notification: Notification) {
    this.server.to(room).emit("notification", notification);
    this.logger.log(`Notification sent to room ${room}`);
  }

  getConnectedUsersCount(): number {
    return this.connectedUsers.size;
  }

  getConnectedUsers(): string[] {
    return Array.from(this.connectedUsers.keys());
  }
}
