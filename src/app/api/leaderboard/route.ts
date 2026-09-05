import { db } from "@/db";
import { matches, players } from "@/db/schema";
import { desc, eq, sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const rows = await db
      .select({
        playerId: players.id,
        name: players.name,
        skinId: players.skinId,
        level: players.level,
        matches: sql<number>`count(${matches.id})::int`,
        kills: sql<number>`coalesce(sum(${matches.kills}),0)::int`,
        deaths: sql<number>`coalesce(sum(${matches.deaths}),0)::int`,
        score: sql<number>`coalesce(sum(${matches.score}),0)::int`,
        wins: sql<number>`coalesce(sum(case when ${matches.won} then 1 else 0 end),0)::int`,
      })
      .from(players)
      .leftJoin(matches, eq(matches.playerId, players.id))
      .groupBy(players.id)
      .orderBy(desc(sql`coalesce(sum(${matches.score}),0)`))
      .limit(50);
    return Response.json({ leaderboard: rows });
  } catch (e) {
    console.error(e);
    return Response.json({ error: "Server error" }, { status: 500 });
  }
}
