"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useGame, useProfile, MATCH_DURATION } from "../store";
import { input } from "../input";
import { sfx } from "../audio";
import { SettingsPanel } from "./SettingsPanel";

const fmt = (t: number) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, "0")}`;

export function HUD({ onStart, onResume, results }: { onStart: () => void; onResume: () => void; results: { coinsEarned: number; xpEarned: number; saved: boolean } | null }) {
  const router = useRouter();
  const phase = useGame((s) => s.phase);
  const hp = useGame((s) => s.hp);
  const ammo = useGame((s) => s.ammo);
  const maxAmmo = useGame((s) => s.maxAmmo);
  const reloading = useGame((s) => s.reloading);
  const timeLeft = useGame((s) => s.timeLeft);
  const stats = useGame((s) => s.stats);
  const killFeed = useGame((s) => s.killFeed);
  const lastDamageAt = useGame((s) => s.lastDamageAt);
  const hitMarkerAt = useGame((s) => s.hitMarkerAt);
  const profile = useProfile((s) => s.profile);
  const showFps = useProfile((s) => s.settings.showFps);
  const [flash, setFlash] = useState(false);
  const [hit, setHit] = useState(false);
  const [settings, setSettings] = useState(false);
  const [fps, setFps] = useState(0);

  useEffect(() => {
    if (!lastDamageAt) return;
    setFlash(true);
    const id = setTimeout(() => setFlash(false), 220);
    return () => clearTimeout(id);
  }, [lastDamageAt]);
  useEffect(() => {
    if (!hitMarkerAt) return;
    setHit(true);
    const id = setTimeout(() => setHit(false), 120);
    return () => clearTimeout(id);
  }, [hitMarkerAt]);
  useEffect(() => {
    if (!showFps) return;
    let frames = 0;
    let last = performance.now();
    let raf = 0;
    const loop = () => {
      frames++;
      const now = performance.now();
      if (now - last >= 500) {
        setFps(Math.round((frames * 1000) / (now - last)));
        frames = 0;
        last = now;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [showFps]);

  const accuracy = stats.shots ? Math.round((stats.hits / stats.shots) * 100) : 0;
  const lowHp = hp <= 30;
  const urgent = timeLeft <= 10;

  return (
    <div className="pointer-events-none fixed inset-0 z-20 select-none font-[system-ui]">
      {/* Виньетка урона */}
      <div
        className="absolute inset-0 transition-opacity duration-200"
        style={{
          opacity: flash ? 0.7 : lowHp && phase === "playing" ? 0.35 : 0,
          background: "radial-gradient(ellipse at center, rgba(255,80,120,0) 45%, rgba(255,60,110,0.75) 100%)",
        }}
      />

      {(phase === "playing" || phase === "dead") && (
        <>
          {/* Прицел */}
          {phase === "playing" && (
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
              <div className={`relative h-8 w-8 transition-transform ${hit ? "scale-125" : ""}`}>
                <span className="absolute left-1/2 top-0 h-2.5 w-0.5 -translate-x-1/2 rounded bg-white shadow-[0_0_4px_rgba(0,0,0,.5)]" />
                <span className="absolute bottom-0 left-1/2 h-2.5 w-0.5 -translate-x-1/2 rounded bg-white shadow-[0_0_4px_rgba(0,0,0,.5)]" />
                <span className="absolute left-0 top-1/2 h-0.5 w-2.5 -translate-y-1/2 rounded bg-white shadow-[0_0_4px_rgba(0,0,0,.5)]" />
                <span className="absolute right-0 top-1/2 h-0.5 w-2.5 -translate-y-1/2 rounded bg-white shadow-[0_0_4px_rgba(0,0,0,.5)]" />
                {hit && (
                  <>
                    <span className="absolute left-1/2 top-1/2 h-3 w-0.5 -translate-x-1/2 -translate-y-1/2 rotate-45 bg-rose-400" />
                    <span className="absolute left-1/2 top-1/2 h-3 w-0.5 -translate-x-1/2 -translate-y-1/2 -rotate-45 bg-rose-400" />
                  </>
                )}
              </div>
            </div>
          )}

          {/* Таймер и счёт */}
          <div className="absolute left-1/2 top-4 flex -translate-x-1/2 items-center gap-3">
            <div className="rounded-2xl bg-white/85 px-4 py-2 text-center shadow-lg backdrop-blur">
              <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Убийств</div>
              <div className="text-2xl font-black text-emerald-500">{stats.kills}</div>
            </div>
            <div className={`rounded-2xl px-5 py-2 text-center shadow-lg backdrop-blur ${urgent ? "animate-pulse bg-rose-400 text-white" : "bg-white/85 text-slate-800"}`}>
              <div className="text-[10px] font-bold uppercase tracking-widest opacity-70">Время</div>
              <div className="text-3xl font-black tabular-nums">{fmt(timeLeft)}</div>
            </div>
            <div className="rounded-2xl bg-white/85 px-4 py-2 text-center shadow-lg backdrop-blur">
              <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Очки</div>
              <div className="text-2xl font-black text-violet-500">{stats.score}</div>
            </div>
          </div>

          {/* Килл-фид */}
          <div className="absolute right-4 top-4 flex flex-col items-end gap-1.5">
            {killFeed.map((k) => (
              <div key={k.id} className="rounded-xl bg-white/85 px-3 py-1.5 text-sm font-semibold text-slate-800 shadow backdrop-blur">
                {k.text}
              </div>
            ))}
          </div>

          {/* HP */}
          <div className="absolute bottom-6 left-6 w-72">
            <div className="mb-1 flex items-end justify-between">
              <span className="text-sm font-black uppercase tracking-wider text-white drop-shadow">{profile?.name ?? "Игрок"}</span>
              <span className={`text-3xl font-black tabular-nums drop-shadow ${lowHp ? "text-rose-300" : "text-white"}`}>{hp}</span>
            </div>
            <div className="h-4 w-full overflow-hidden rounded-full bg-white/50 shadow-inner">
              <div
                className={`h-full rounded-full transition-all duration-200 ${lowHp ? "bg-gradient-to-r from-rose-400 to-rose-500" : "bg-gradient-to-r from-emerald-300 to-emerald-500"}`}
                style={{ width: `${hp}%` }}
              />
            </div>
            <div className="mt-1 text-xs font-semibold text-white/90 drop-shadow">
              Серия: {stats.streak} · Точность: {accuracy}%
            </div>
          </div>

          {/* Патроны */}
          <div className="absolute bottom-6 right-6 text-right">
            <div className="text-xs font-bold uppercase tracking-widest text-white/90 drop-shadow">{reloading ? "Перезарядка…" : "Бластер"}</div>
            <div className={`text-5xl font-black tabular-nums text-white drop-shadow ${ammo === 0 && !reloading ? "animate-pulse text-rose-300" : ""}`}>
              {ammo}
              <span className="text-2xl text-white/70"> / {maxAmmo}</span>
            </div>
            <div className="mt-1 flex justify-end gap-0.5">
              {Array.from({ length: maxAmmo }).map((_, i) => (
                <span key={i} className={`h-3 w-1 rounded-sm ${i < ammo ? "bg-amber-300" : "bg-white/30"}`} />
              ))}
            </div>
          </div>
        </>
      )}

      {showFps && <div className="absolute left-3 top-3 rounded bg-white/80 px-2 py-0.5 text-xs font-bold text-slate-700">{fps} FPS</div>}

      {/* Экран смерти */}
      {phase === "dead" && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="rounded-3xl bg-white/90 px-10 py-6 text-center shadow-2xl backdrop-blur">
            <div className="text-4xl font-black text-rose-500">Вы повержены!</div>
            <div className="mt-2 text-slate-600">Возрождение через мгновение…</div>
          </div>
        </div>
      )}

      {/* Старт */}
      {phase === "ready" && (
        <div className="pointer-events-auto absolute inset-0 flex items-center justify-center bg-sky-200/40 backdrop-blur-sm">
          <div className="max-w-md rounded-3xl bg-white/95 p-8 text-center shadow-2xl">
            <div className="text-sm font-bold uppercase tracking-widest text-violet-500">Арена · Замок</div>
            <h1 className="mt-1 text-4xl font-black text-slate-800">Готовы к бою?</h1>
            <p className="mt-3 text-slate-600">
              {MATCH_DURATION / 60} минут · Deathmatch против ботов. Хедшот = мгновенное устранение.
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2 text-left text-sm text-slate-700">
              <div className="rounded-xl bg-slate-100 p-2"><b>WASD</b> — движение</div>
              <div className="rounded-xl bg-slate-100 p-2"><b>Мышь</b> — обзор / ЛКМ — огонь</div>
              <div className="rounded-xl bg-slate-100 p-2"><b>Space</b> — прыжок</div>
              <div className="rounded-xl bg-slate-100 p-2"><b>R</b> — перезарядка · <b>Shift</b> — бег</div>
            </div>
            <button
              onClick={() => {
                sfx.ui();
                onStart();
              }}
              className="mt-6 w-full rounded-2xl bg-gradient-to-r from-violet-500 to-fuchsia-500 py-4 text-xl font-black text-white shadow-lg transition hover:scale-[1.02] active:scale-95"
            >
              {input.touch ? "Начать бой" : "Нажмите, чтобы начать"}
            </button>
            <button onClick={() => router.push("/lobby")} className="mt-3 text-sm font-semibold text-slate-500 hover:text-slate-800">
              ← В лобби
            </button>
          </div>
        </div>
      )}

      {/* Пауза */}
      {phase === "paused" && (
        <div className="pointer-events-auto absolute inset-0 flex items-center justify-center bg-sky-200/40 backdrop-blur-sm">
          {settings ? (
            <SettingsPanel onClose={() => setSettings(false)} />
          ) : (
            <div className="w-80 rounded-3xl bg-white/95 p-8 text-center shadow-2xl">
              <h2 className="text-3xl font-black text-slate-800">Пауза</h2>
              <div className="mt-2 text-sm text-slate-500">
                {stats.kills} убийств · {stats.deaths} смертей · {stats.score} очков
              </div>
              <button onClick={() => { sfx.ui(); onResume(); }} className="mt-6 w-full rounded-2xl bg-gradient-to-r from-emerald-400 to-teal-500 py-3 text-lg font-black text-white shadow-lg hover:scale-[1.02]">
                Продолжить
              </button>
              <button onClick={() => setSettings(true)} className="mt-3 w-full rounded-2xl bg-slate-100 py-3 font-bold text-slate-700 hover:bg-slate-200">
                Настройки
              </button>
              <button onClick={() => router.push("/lobby")} className="mt-3 w-full rounded-2xl bg-rose-100 py-3 font-bold text-rose-600 hover:bg-rose-200">
                Выйти в лобби
              </button>
            </div>
          )}
        </div>
      )}

      {/* Итоги */}
      {phase === "ended" && (
        <div className="pointer-events-auto absolute inset-0 flex items-center justify-center bg-sky-200/50 backdrop-blur-sm">
          <div className="w-[26rem] rounded-3xl bg-white/95 p-8 text-center shadow-2xl">
            <div className="text-sm font-bold uppercase tracking-widest text-violet-500">Матч завершён</div>
            <h2 className="mt-1 text-4xl font-black text-slate-800">{stats.kills >= 10 ? "Победа! 🏆" : "Неплохо! ⭐"}</h2>
            <div className="mt-5 grid grid-cols-3 gap-2">
              {[
                ["Убийств", stats.kills, "text-emerald-500"],
                ["Смертей", stats.deaths, "text-rose-500"],
                ["Хедшотов", stats.headshots, "text-amber-500"],
                ["Очки", stats.score, "text-violet-500"],
                ["Точность", `${accuracy}%`, "text-sky-500"],
                ["K/D", (stats.kills / Math.max(1, stats.deaths)).toFixed(2), "text-fuchsia-500"],
              ].map(([l, v, c]) => (
                <div key={l as string} className="rounded-2xl bg-slate-100 p-3">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{l}</div>
                  <div className={`text-2xl font-black ${c}`}>{v}</div>
                </div>
              ))}
            </div>
            <div className="mt-4 rounded-2xl bg-amber-50 p-3 text-sm font-semibold text-amber-700">
              {results ? (results.saved ? `+${results.coinsEarned} монет · +${results.xpEarned} XP` : "Результат сохранён локально") : "Сохраняем результат…"}
            </div>
            <div className="mt-5 flex gap-3">
              <button onClick={() => router.push("/lobby")} className="flex-1 rounded-2xl bg-slate-100 py-3 font-bold text-slate-700 hover:bg-slate-200">
                В лобби
              </button>
              <button onClick={() => window.location.reload()} className="flex-1 rounded-2xl bg-gradient-to-r from-violet-500 to-fuchsia-500 py-3 font-black text-white shadow-lg hover:scale-[1.02]">
                Ещё раз
              </button>
            </div>
          </div>
        </div>
      )}

      {phase === "loading" && (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-sky-200 via-fuchsia-100 to-amber-100">
          <div className="text-center">
            <div className="mx-auto h-14 w-14 animate-spin rounded-full border-4 border-violet-300 border-t-violet-600" />
            <div className="mt-4 text-lg font-black text-slate-700">Загружаем арену…</div>
          </div>
        </div>
      )}
    </div>
  );
}
