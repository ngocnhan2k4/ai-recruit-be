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

interface AuthenticatedSocket extends Socket, IdentityUser {
  roles?: RoleEnum[];
}

@Injectable()
@WSGateway({
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
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

      this.connectedUsers.set(
        this.getKeyIdentity({
          userId: client.userId,
          organizationId: orgId,
        }),
        client,
      );

      this.logger.log(
        `User ${this.getKeyIdentity({
          userId: client.userId,
          organizationId: orgId,
        })} connected to WebSocket`,
      );

      // Join user-specific room
      client.join(
        `user_${this.getKeyIdentity({
          userId: client.userId,
          organizationId: orgId,
        })}`,
      );

      // Check if user is admin and join admin room
      const isAdmin =
        client.roles &&
        (client.roles.includes(RoleEnum.ADMIN) ||
          client.roles.includes(RoleEnum.SUPER_ADMIN));

      if (isAdmin) {
        client.join("admin");
        this.logger.log(`Admin user ${client.userId} joined admin room`);
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
      this.connectedUsers.delete(this.getKeyIdentity(client));
      this.logger.log(
        `User ${this.getKeyIdentity(client)} disconnected from WebSocket`,
      );
    }
  }

  @SubscribeMessage("ping")
  handlePing(@ConnectedSocket() client: AuthenticatedSocket) {
    client.emit("pong", { timestamp: new Date().toISOString() });
  }

  sendToUser(identity: IdentityUser, notification: Notification) {
    const userSocket = this.connectedUsers.get(this.getKeyIdentity(identity));

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
  private getKeyIdentity(identity: IdentityUser): string {
    return `${identity.userId}:${identity.organizationId ?? "none"}`;
  }
}
