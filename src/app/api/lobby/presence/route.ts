import { NextRequest } from "next/server";
import { db, hasDatabase } from "@/db";
import { lobbyPresence } from "@/db/schema";
import { and, eq, gt, lt, ne } from "drizzle-orm";
import { SKIN_MAP } from "@/game/skins";

export const dynamic = "force-dynamic";

const STALE_MS = 20_000;
const MAX_PLAYERS = 60;

/**
 * Heartbeat presence: один запрос = запись своей позиции + получение остальных.
 * Дешёвый upsert по PK, индекс (room, updated_at) — масштабируется горизонтально;
 * для realtime заменяется на WebSocket-шард без изменения клиентского контракта.
 */
export async function POST(req: NextRequest) {
  try {
    if (!hasDatabase) return Response.json({ others: [], serverTime: Date.now() });
    const b = await req.json().catch(() => ({}));
    const playerId = Number(b?.playerId);
    if (!Number.isFinite(playerId)) return Response.json({ error: "Bad request" }, { status: 400 });
    const room = typeof b.room === "string" ? b.room.slice(0, 32) : "main";
    const name = String(b.name ?? "Player").slice(0, 20);
    const skinId = SKIN_MAP[b.skinId] ? String(b.skinId) : "nova";
    const num = (v: unknown) => (Number.isFinite(Number(v)) ? Number(v) : 0);
    const now = new Date();

    await db
      .insert(lobbyPresence)
      .values({ playerId, room, name, skinId, x: num(b.x), y: num(b.y), z: num(b.z), ry: num(b.ry), updatedAt: now })
      .onConflictDoUpdate({
        target: lobbyPresence.playerId,
        set: { room, name, skinId, x: num(b.x), y: num(b.y), z: num(b.z), ry: num(b.ry), updatedAt: now },
      });

    // Ленивая очистка устаревших записей (амортизированно).
    if (Math.random() < 0.05) {
      await db.delete(lobbyPresence).where(lt(lobbyPresence.updatedAt, new Date(Date.now() - 120_000)));
    }

    const others = await db
      .select({
        playerId: lobbyPresence.playerId,
        name: lobbyPresence.name,
        skinId: lobbyPresence.skinId,
        x: lobbyPresence.x,
        y: lobbyPresence.y,
        z: lobbyPresence.z,
        ry: lobbyPresence.ry,
      })
      .from(lobbyPresence)
      .where(
        and(
          eq(lobbyPresence.room, room),
          ne(lobbyPresence.playerId, playerId),
          gt(lobbyPresence.updatedAt, new Date(Date.now() - STALE_MS)),
        ),
      )
      .limit(MAX_PLAYERS);

    return Response.json({ others, serverTime: Date.now() });
  } catch (e) {
    console.error(e);
    return Response.json({ error: "Server error" }, { status: 500 });
  }
}

/** DELETE { playerId } — выход из лобби. */
export async function DELETE(req: NextRequest) {
  try {
    if (!hasDatabase) return Response.json({ ok: true });
    const b = await req.json().catch(() => ({}));
    const playerId = Number(b?.playerId);
    if (Number.isFinite(playerId)) await db.delete(lobbyPresence).where(eq(lobbyPresence.playerId, playerId));
    return Response.json({ ok: true });
  } catch {
    return Response.json({ ok: false }, { status: 500 });
  }
}
