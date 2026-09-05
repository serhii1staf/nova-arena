import { NextRequest } from "next/server";
import { db, hasDatabase } from "@/db";
import { matches, players } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { levelForXp } from "@/lib/game-server";

export const dynamic = "force-dynamic";

const clampInt = (v: unknown, max: number) => Math.max(0, Math.min(max, Math.floor(Number(v) || 0)));

/** POST результат матча → начисление XP/монет, запись в историю. */
export async function POST(req: NextRequest) {
  try {
    if (!hasDatabase) return Response.json({ coinsEarned: 0, xpEarned: 0, saved: false });
    const body = await req.json().catch(() => ({}));
    const playerId = Number(body?.playerId);
    if (!Number.isFinite(playerId)) return Response.json({ error: "Bad request" }, { status: 400 });

    const kills = clampInt(body.kills, 500);
    const deaths = clampInt(body.deaths, 500);
    const headshots = clampInt(body.headshots, kills);
    const score = clampInt(body.score, 100000);
    const durationSec = clampInt(body.durationSec, 3600);
    const accuracy = Math.max(0, Math.min(1, Number(body.accuracy) || 0));
    const won = Boolean(body.won);

    const coinsEarned = 50 + kills * 10 + headshots * 5 + (won ? 100 : 0);
    const xpEarned = Math.round(score / 4) + (won ? 150 : 50);

    const [saved] = await db
      .insert(matches)
      .values({ playerId, map: String(body.map ?? "castle"), kills, deaths, headshots, score, accuracy, durationSec, won })
      .returning();

    const [p] = await db
      .update(players)
      .set({
        coins: sql`${players.coins} + ${coinsEarned}`,
        xp: sql`${players.xp} + ${xpEarned}`,
        lastSeenAt: new Date(),
      })
      .where(eq(players.id, playerId))
      .returning();
    if (p) {
      const level = levelForXp(p.xp);
      if (level !== p.level) await db.update(players).set({ level }).where(eq(players.id, playerId));
      p.level = level;
    }
    return Response.json({ match: saved, player: p, coinsEarned, xpEarned });
  } catch (e) {
    console.error(e);
    return Response.json({ error: "Server error" }, { status: 500 });
  }
}
