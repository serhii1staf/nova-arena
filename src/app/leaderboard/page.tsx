import Link from "next/link";
import { db } from "@/db";
import { matches, players } from "@/db/schema";
import { desc, eq, sql } from "drizzle-orm";
import { getSkin } from "@/game/skins";

export const dynamic = "force-dynamic";

async function getLeaderboard() {
  try {
    return await db
      .select({
        playerId: players.id,
        name: players.name,
        skinId: players.skinId,
        level: players.level,
        matches: sql<number>`count(${matches.id})::int`,
        kills: sql<number>`coalesce(sum(${matches.kills}),0)::int`,
        deaths: sql<number>`coalesce(sum(${matches.deaths}),0)::int`,
        headshots: sql<number>`coalesce(sum(${matches.headshots}),0)::int`,
        score: sql<number>`coalesce(sum(${matches.score}),0)::int`,
        wins: sql<number>`coalesce(sum(case when ${matches.won} then 1 else 0 end),0)::int`,
      })
      .from(players)
      .leftJoin(matches, eq(matches.playerId, players.id))
      .groupBy(players.id)
      .orderBy(desc(sql`coalesce(sum(${matches.score}),0)`))
      .limit(50);
  } catch {
    return [];
  }
}

export default async function LeaderboardPage() {
  const rows = await getLeaderboard();
  const medal = ["🥇", "🥈", "🥉"];
  return (
    <main className="min-h-screen bg-gradient-to-br from-violet-200 via-pink-100 to-sky-200 p-4 sm:p-8">
      <div className="mx-auto max-w-4xl">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-bold uppercase tracking-widest text-violet-500">Nova Arena</div>
            <h1 className="text-4xl font-black text-slate-800">Таблица лидеров</h1>
          </div>
          <div className="flex gap-2">
            <Link href="/lobby" className="rounded-2xl bg-white/85 px-4 py-2.5 font-bold text-slate-700 shadow hover:bg-white">← Лобби</Link>
            <Link href="/arena" className="rounded-2xl bg-gradient-to-r from-rose-400 to-orange-400 px-4 py-2.5 font-black text-white shadow hover:scale-105">⚔️ В бой</Link>
          </div>
        </div>

        <div className="mt-6 overflow-hidden rounded-3xl bg-white/90 shadow-2xl backdrop-blur">
          <table className="w-full text-left">
            <thead className="bg-violet-50 text-xs font-bold uppercase tracking-wider text-violet-600">
              <tr>
                <th className="px-4 py-3">#</th>
                <th className="px-4 py-3">Игрок</th>
                <th className="px-4 py-3 text-right">Очки</th>
                <th className="hidden px-4 py-3 text-right sm:table-cell">Убийств</th>
                <th className="hidden px-4 py-3 text-right sm:table-cell">K/D</th>
                <th className="hidden px-4 py-3 text-right md:table-cell">Хедшоты</th>
                <th className="hidden px-4 py-3 text-right md:table-cell">Матчей</th>
                <th className="hidden px-4 py-3 text-right md:table-cell">Побед</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-slate-500">Пока никто не сыграл. Станьте первым!</td>
                </tr>
              )}
              {rows.map((r, i) => {
                const skin = getSkin(r.skinId);
                return (
                  <tr key={r.playerId} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-3 text-lg font-black text-slate-500">{medal[i] ?? i + 1}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span className="inline-block h-8 w-8 rounded-full border-2 border-white shadow" style={{ background: `linear-gradient(135deg, ${skin.primary}, ${skin.accent})` }} />
                        <div>
                          <div className="font-black text-slate-800">{r.name}</div>
                          <div className="text-xs text-slate-500">Уровень {r.level} · {skin.name}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right text-lg font-black text-violet-600">{r.score}</td>
                    <td className="hidden px-4 py-3 text-right font-bold text-emerald-600 sm:table-cell">{r.kills}</td>
                    <td className="hidden px-4 py-3 text-right font-semibold text-slate-600 sm:table-cell">{(r.kills / Math.max(1, r.deaths)).toFixed(2)}</td>
                    <td className="hidden px-4 py-3 text-right font-semibold text-amber-600 md:table-cell">{r.headshots}</td>
                    <td className="hidden px-4 py-3 text-right text-slate-600 md:table-cell">{r.matches}</td>
                    <td className="hidden px-4 py-3 text-right text-slate-600 md:table-cell">{r.wins}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
