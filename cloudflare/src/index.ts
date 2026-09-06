import { DurableObject } from "cloudflare:workers";

interface PlayerState {
  playerId: number;
  name: string;
  skinId: string;
  x: number;
  y: number;
  z: number;
  ry: number;
}

interface Env {
  ROOM: DurableObjectNamespace<Room>;
}

export class Room extends DurableObject<Env> {
  private sockets = new Map<WebSocket, PlayerState>();

  async fetch(request: Request): Promise<Response> {
    if (request.headers.get("Upgrade")?.toLowerCase() !== "websocket") {
      return new Response("WebSocket upgrade required", { status: 426 });
    }

    const pair = new WebSocketPair();
    const client = pair[0];
    const server = pair[1];
    server.accept();
    server.addEventListener("message", (event) => this.onMessage(server, String(event.data)));
    server.addEventListener("close", () => this.remove(server));
    server.addEventListener("error", () => this.remove(server));
    return new Response(null, { status: 101, webSocket: client });
  }

  private onMessage(socket: WebSocket, raw: string) {
    try {
      const message = JSON.parse(raw) as { type?: string; player?: PlayerState; targetId?: number; amount?: number; headshot?: boolean };
      if (message.type === "join" && message.player) {
        this.sockets.set(socket, this.normalize(message.player));
        this.broadcast();
      } else if (message.type === "state" && message.player && this.sockets.has(socket)) {
        this.sockets.set(socket, this.normalize(message.player));
        this.broadcast(socket);
      } else if (message.type === "damage" && message.targetId && message.amount) {
        this.broadcast(JSON.stringify({ type: "damage", targetId: Number(message.targetId), amount: Number(message.amount), headshot: Boolean(message.headshot), from: this.sockets.get(socket)?.name ?? "Player" }));
      } else if (message.type === "leave") {
        this.remove(socket);
      }
    } catch {
      socket.close(1003, "Invalid message");
    }
  }

  private normalize(player: PlayerState): PlayerState {
    return {
      playerId: Number(player.playerId),
      name: String(player.name).slice(0, 20),
      skinId: String(player.skinId).slice(0, 32),
      x: Number(player.x) || 0,
      y: Number(player.y) || 0,
      z: Number(player.z) || 0,
      ry: Number(player.ry) || 0,
    };
  }

  private remove(socket: WebSocket) {
    if (this.sockets.delete(socket)) this.broadcast();
  }

  private broadcast(payload?: string, exclude?: WebSocket) {
    const players = [...this.sockets.values()];
    const message = payload ?? JSON.stringify({ type: "players", players });
    for (const socket of this.sockets.keys()) {
      if (socket === exclude || socket.readyState !== WebSocket.OPEN) continue;
      socket.send(message);
    }
  }
}

export default {
  fetch(request: Request, env: Env): Response {
    const url = new URL(request.url);
    const room = url.pathname.match(/^\/room\/([a-z0-9_-]{1,32})$/i)?.[1] ?? "main";
    return env.ROOM.getByName(room).fetch(request);
  },
};