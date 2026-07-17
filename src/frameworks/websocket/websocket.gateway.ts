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
import {
  DEFAULT_LANGUAGE_CODE,
  RoleEnum,
  ROOM_NOTIFICATIONS,
} from "@/common/constants";
import { NotificationRendererService } from "@/frameworks/notification/notification-renderer.service";
import { IUserRepository } from "@/core/abstracts/repositories/user-repository.abstract";
import {
  normalizeLanguageCode,
  resolveExplicitRequestLanguage,
} from "@/common/utils";

interface AuthenticatedSocket extends Socket, IdentityUser {
  roles?: RoleEnum[];
}

@Injectable()
@WSGateway({
  namespace: "/notifications",
  cors: {
    origin: process.env.CORS_ORIGINS,
    methods: ["GET", "POST"],
    credentials: true,
  },
})
export class WebSocketGateway
  implements IWebSocketGateway, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(WebSocketGateway.name);
  private connectedUsers = new Map<string, Set<AuthenticatedSocket>>();

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly userRepository: IUserRepository,
    private readonly notificationRenderer: NotificationRendererService,
  ) {}

  async handleConnection(client: AuthenticatedSocket) {
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
      const user = await this.userRepository.get(client.userId);
      client.preferredLanguage = user?.preferredLanguage
        ? normalizeLanguageCode(user.preferredLanguage)
        : DEFAULT_LANGUAGE_CODE;
      client.languageCode = resolveExplicitRequestLanguage({
        queryLang:
          client.handshake.query.languageCode ??
          client.handshake.query.lang ??
          (client.handshake.auth?.languageCode as
            | string
            | string[]
            | undefined) ??
          (client.handshake.auth?.lang as string | string[] | undefined),
        acceptLanguage: client.handshake.headers["accept-language"],
      });

      client.organizationId = orgId;

      const userKey = ROOM_NOTIFICATIONS.user({
        userId: client.userId,
        orgId: orgId,
      });
      if (!this.connectedUsers.has(userKey)) {
        this.connectedUsers.set(userKey, new Set());
      }

      this.connectedUsers.get(userKey)?.add(client);

      this.logger.log(`User ${userKey} connected to WebSocket`);

      // Join user-specific room
      client.join(`user_${userKey}`);

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
        client.join(ROOM_NOTIFICATIONS.org({ orgId }));
        this.logger.log(
          `User ${client.userId} joined organization room ${ROOM_NOTIFICATIONS.org({ orgId: orgId })}`,
        );
      }

      client.emit("connected", {
        message: "Connected to notification service",
        userId: client.userId,
        orgId: orgId ? orgId : "none",
        languageCode:
          client.languageCode ??
          client.preferredLanguage ??
          DEFAULT_LANGUAGE_CODE,
      });
    } catch (error) {
      this.logger.error("WebSocket authentication failed:", error);
      client.disconnect();
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    if (client.userId) {
      const userKey = ROOM_NOTIFICATIONS.user({
        userId: client.userId,
        orgId: client.organizationId,
      });

      const sockets = this.connectedUsers.get(userKey);

      if (sockets) {
        sockets.delete(client);

        if (sockets.size === 0) {
          this.connectedUsers.delete(userKey);
        }
      }

      this.logger.log(`User ${userKey} disconnected from WebSocket`);
    }
  }

  @SubscribeMessage("ping")
  handlePing(@ConnectedSocket() client: AuthenticatedSocket) {
    client.emit("pong", { timestamp: new Date().toISOString() });
  }

  private getSocketsForUser(userId: string): Set<AuthenticatedSocket> {
    const matchedSockets = new Set<AuthenticatedSocket>();

    for (const sockets of this.connectedUsers.values()) {
      sockets.forEach((socket) => {
        if (socket.userId === userId) {
          matchedSockets.add(socket);
        }
      });
    }

    return matchedSockets;
  }

  sendToUser(identity: IdentityUser, notification: Notification) {
    const sockets = this.getSocketsForUser(identity.userId);

    if (!sockets || sockets.size === 0) {
      this.logger.warn(
        `User ${identity.userId} (org:${identity.organizationId}) not connected`,
      );
      return false;
    }
    sockets.forEach((socket) => {
      const primaryLanguage =
        socket.languageCode ??
        socket.preferredLanguage ??
        DEFAULT_LANGUAGE_CODE;
      const fallbackLanguage =
        socket.preferredLanguage ?? DEFAULT_LANGUAGE_CODE;
      const rendered = this.notificationRenderer.render(notification, {
        languagePriority: [primaryLanguage, fallbackLanguage],
      });
      socket.emit("notification", {
        ...notification,
        title: rendered.title,
        message: rendered.message,
        displayLanguage: rendered.language,
      });
    });
    this.logger.log(
      `Notification sent to user ${identity.userId}, org:${identity.organizationId}`,
    );
    return true;
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
