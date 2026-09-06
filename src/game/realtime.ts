import type { RemotePlayer } from "./components/RemotePlayers";

type Position = Omit<RemotePlayer, "playerId" | "sessionId"> & { playerId: number; sessionId?: string };

export interface RealtimeConnection {
  update(position: Partial<Position>): void;
  damage(targetId: number, amount: number, headshot: boolean): void;
  close(): void;
}

export function connectRealtime(room: string, player: Position, onPlayers: (players: RemotePlayer[]) => void, onDamage?: (amount: number, from: string, headshot: boolean) => void): RealtimeConnection {
  if (typeof window === "undefined") return { update: () => {}, damage: () => {}, close: () => {} };
  const endpoint = `${"wss://nova-arena-realtime.odi44972.workers.dev"}/room/${encodeURIComponent(room)}`;
  const sessionId = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
  let latest = { ...player, sessionId };
  const socket = new WebSocket(endpoint);
  let closed = false;
  const send = (type: "join" | "state") => {
    if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ type, player: latest }));
  };
  socket.addEventListener("open", () => send("join"));
  socket.addEventListener("message", (event) => {
    try {
      const message = JSON.parse(event.data) as { type?: string; players?: RemotePlayer[]; targetId?: number; amount?: number; from?: string; headshot?: boolean };
      if (message.type === "players") onPlayers((message.players ?? []).filter((remote) => remote.sessionId !== sessionId));
      if (message.type === "damage" && message.targetId === player.playerId) onDamage?.(Number(message.amount), String(message.from ?? "Player"), Boolean(message.headshot));
    } catch {
      // Ignore malformed realtime packets.
    }
  });
  const interval = window.setInterval(() => send("state"), 50);
  return {
    update(position) {
      latest = { ...latest, ...position };
    },
    damage(targetId, amount, headshot) {
      if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ type: "damage", targetId, amount, headshot }));
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