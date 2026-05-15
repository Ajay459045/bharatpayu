import { Logger } from "@nestjs/common";
import { OnGatewayConnection, OnGatewayInit, WebSocketGateway, WebSocketServer } from "@nestjs/websockets";
import { Server, Socket } from "socket.io";

@WebSocketGateway({
  namespace: "admin",
  cors: {
    origin: [/localhost:\d+$/, /bharatpayu\.com$/],
    credentials: true
  }
})
export class AdminRealtimeGateway implements OnGatewayInit, OnGatewayConnection {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(AdminRealtimeGateway.name);
  private timer?: NodeJS.Timeout;

  afterInit() {
    this.timer = setInterval(() => {
      this.server.emit("admin:heartbeat", {
        at: new Date().toISOString(),
        systemStatus: "online"
      });
    }, 15000);
    this.logger.log("Admin realtime gateway ready");
  }

  handleConnection(client: Socket) {
    client.emit("admin:connected", {
      socketId: client.id,
      streams: ["admin:transactions", "admin:notifications", "admin:heartbeat"]
    });
  }

  emitTransaction(payload: Record<string, unknown>) {
    this.server.emit("admin:transactions", payload);
  }

  emitNotification(payload: Record<string, unknown>) {
    this.server.emit("admin:notifications", payload);
  }
}
