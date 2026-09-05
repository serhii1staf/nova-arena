import type { RemotePlayer } from "./components/RemotePlayers";

type Position = Omit<RemotePlayer, "playerId"> & { playerId: number };

export interface RealtimeConnection {
  update(position: Partial<Position>): void;
  close(): void;
}

export function connectRealtime(room: string, player: Position, onPlayers: (players: RemotePlayer[]) => void): RealtimeConnection {
  if (typeof window === "undefined") return { update: () => {}, close: () => {} };
  const endpoint = `${"wss://nova-arena-realtime.odi44972.workers.dev"}/room/${encodeURIComponent(room)}`;
  const socket = new WebSocket(endpoint);
  let closed = false;
  let latest = player;
  const send = (type: "join" | "state") => {
    if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ type, player: latest }));
  };
  socket.addEventListener("open", () => send("join"));
  socket.addEventListener("message", (event) => {
    try {
      const message = JSON.parse(event.data) as { type?: string; players?: RemotePlayer[] };
      if (message.type === "players") onPlayers((message.players ?? []).filter((remote) => remote.playerId !== player.playerId));
    } catch {
      // Ignore malformed realtime packets.
    }
  });
  const interval = window.setInterval(() => send("state"), 50);
  return {
    update(position) {
      latest = { ...latest, ...position };
    },
    close() {
    if (closed) return;
    closed = true;
    window.clearInterval(interval);
    if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ type: "leave" }));
    socket.close();
    },
  };
}