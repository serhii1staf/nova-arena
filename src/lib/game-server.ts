import { db } from "@/db";
import { skins, playerSkins, players } from "@/db/schema";
import { SKINS, DEFAULT_OWNED } from "@/game/skins";
import { eq, sql } from "drizzle-orm";

let seeded = false;

/** Идемпотентное сидирование каталога скинов (один раз на процесс). */
export async function ensureSkinsSeeded() {
  if (seeded) return;
  await db
    .insert(skins)
    .values(
      SKINS.map((s) => ({
        id: s.id,
        name: s.name,
        rarity: s.rarity,
        price: s.price,
        primary: s.primary,
        secondary: s.secondary,
        accent: s.accent,
        visor: s.visor,
        hat: s.hat,
      })),
    )
    .onConflictDoUpdate({
      target: skins.id,
      set: {
        name: sql`excluded.name`,
        rarity: sql`excluded.rarity`,
        price: sql`excluded.price`,
        primary: sql`excluded.primary`,
        secondary: sql`excluded.secondary`,
        accent: sql`excluded.accent`,
        visor: sql`excluded.visor`,
        hat: sql`excluded.hat`,
      },
    });
  seeded = true;
}

export function sanitizeName(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const name = raw.trim().replace(/\s+/g, " ").slice(0, 20);
  if (name.length < 2) return null;
  if (!/^[\p{L}\p{N} _\-.]+$/u.test(name)) return null;
  return name;
}

export async function getOrCreatePlayer(name: string) {
  await ensureSkinsSeeded();
  const existing = await db.select().from(players).where(eq(players.name, name)).limit(1);
  let player = existing[0];
  if (!player) {
    const inserted = await db.insert(players).values({ name }).returning();
    player = inserted[0];
    await db
      .insert(playerSkins)
      .values(DEFAULT_OWNED.map((skinId) => ({ playerId: player.id, skinId })))
      .onConflictDoNothing();
  } else {
    await db.update(players).set({ lastSeenAt: new Date() }).where(eq(players.id, player.id));
  }
  const owned = await db
    .select({ skinId: playerSkins.skinId })
    .from(playerSkins)
    .where(eq(playerSkins.playerId, player.id));
  return { ...player, ownedSkins: owned.map((o) => o.skinId) };
}

export function levelForXp(xp: number) {
  return Math.max(1, Math.floor(Math.sqrt(xp / 100)) + 1);
}
