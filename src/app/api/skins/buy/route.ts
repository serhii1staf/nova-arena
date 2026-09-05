import { NextRequest } from "next/server";
import { db } from "@/db";
import { players, playerSkins } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { SKIN_MAP } from "@/game/skins";
import { ensureSkinsSeeded } from "@/lib/game-server";

export const dynamic = "force-dynamic";

/** POST { playerId, skinId } → покупка скина за монеты (транзакционно). */
export async function POST(req: NextRequest) {
  try {
    await ensureSkinsSeeded();
    const body = await req.json().catch(() => ({}));
    const playerId = Number(body?.playerId);
    const skinId = String(body?.skinId ?? "");
    const def = SKIN_MAP[skinId];
    if (!Number.isFinite(playerId) || !def) return Response.json({ error: "Bad request" }, { status: 400 });

    const result = await db.transaction(async (tx) => {
      const [p] = await tx.select().from(players).where(eq(players.id, playerId)).for("update");
      if (!p) return { error: "Игрок не найден", status: 404 } as const;
      const owned = await tx
        .select()
        .from(playerSkins)
        .where(and(eq(playerSkins.playerId, playerId), eq(playerSkins.skinId, skinId)));
      if (owned.length) return { error: "Уже куплен", status: 409 } as const;
      if (p.coins < def.price) return { error: "Недостаточно монет", status: 402 } as const;
      const [updated] = await tx
        .update(players)
        .set({ coins: p.coins - def.price, skinId })
        .where(eq(players.id, playerId))
        .returning();
      await tx.insert(playerSkins).values({ playerId, skinId });
      return { player: updated } as const;
    });

    if ("error" in result) return Response.json({ error: result.error }, { status: result.status });
    const owned = await db.select({ skinId: playerSkins.skinId }).from(playerSkins).where(eq(playerSkins.playerId, playerId));
    return Response.json({ player: { ...result.player, ownedSkins: owned.map((o) => o.skinId) } });
  } catch (e) {
    console.error(e);
    return Response.json({ error: "Server error" }, { status: 500 });
  }
}
