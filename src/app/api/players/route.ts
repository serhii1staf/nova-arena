import { NextRequest } from "next/server";
import { db, hasDatabase } from "@/db";
import { players } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getOrCreatePlayer, sanitizeName } from "@/lib/game-server";
import { SKIN_MAP } from "@/game/skins";

export const dynamic = "force-dynamic";

/** POST { name } → создать/получить профиль. */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const name = sanitizeName(body?.name);
    if (!name) return Response.json({ error: "Имя: 2–20 символов (буквы, цифры, _ - .)" }, { status: 400 });
    if (!hasDatabase) {
      return Response.json({ player: { id: 0, name, role: name.toLowerCase() === "kairozun" ? "moderator" : "player", skinId: "nova", coins: 0, xp: 0, level: 1, ownedSkins: ["nova"] } });
    }
    const player = await getOrCreatePlayer(name);
    return Response.json({ player });
  } catch (e) {
    console.error(e);
    return Response.json({ error: "Server error" }, { status: 500 });
  }
}

/** PATCH { playerId, skinId } → выбрать скин. */
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const playerId = Number(body?.playerId);
    const skinId = String(body?.skinId ?? "");
    const requestedName = body?.name === undefined ? null : sanitizeName(body.name);
    if (requestedName === null && body?.name !== undefined) return Response.json({ error: "Имя: 2–20 символов" }, { status: 400 });
    if (!Number.isFinite(playerId) || (!SKIN_MAP[skinId] && requestedName === null)) {
      return Response.json({ error: "Bad request" }, { status: 400 });
    }
    try {
      const [updated] = await db.update(players).set({ ...(SKIN_MAP[skinId] ? { skinId } : {}), ...(requestedName ? { name: requestedName } : {}) }).where(eq(players.id, playerId)).returning();
      if (!updated) return Response.json({ error: "Not found" }, { status: 404 });
      return Response.json({ player: updated });
    } catch (error) {
      if (String(error).toLowerCase().includes("unique")) return Response.json({ error: "Это имя уже занято" }, { status: 409 });
      throw error;
    }
  } catch (e) {
    console.error(e);
    return Response.json({ error: "Server error" }, { status: 500 });
  }
}
