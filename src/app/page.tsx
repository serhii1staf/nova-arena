"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useProfile, type Quality } from "@/game/store";
import { SKINS, getSkin } from "@/game/skins";
import { SkinPreview } from "@/game/ui/SkinPanel";
import { unlockAudio, sfx } from "@/game/audio";

export default function HomePage() {
  const router = useRouter();
  const profile = useProfile((s) => s.profile);
  const setProfile = useProfile((s) => s.setProfile);
  const settings = useProfile((s) => s.settings);
  const setSettings = useProfile((s) => s.setSettings);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
    if (profile?.name) setName(profile.name);
  }, [profile?.name]);

  const enter = async (dest: "/lobby" | "/arena") => {
    unlockAudio();
    sfx.ui();
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/players", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }) });
      const d = await res.json();
      if (res.ok) {
        setProfile({
          id: d.player.id,
          name: d.player.name,
          skinId: d.player.skinId,
          coins: d.player.coins,
          xp: d.player.xp,
          level: d.player.level,
          ownedSkins: d.player.ownedSkins,
        });
      } else {
        setProfile({ id: 0, name: name.trim(), skinId: "nova", coins: 0, xp: 0, level: 1, ownedSkins: ["nova"] });
      }
      router.push(dest);
    } catch {
      setProfile({ id: 0, name: name.trim(), skinId: "nova", coins: 0, xp: 0, level: 1, ownedSkins: ["nova"] });
      router.push(dest);
    } finally {
      setBusy(false);
    }
  };

  const skin = getSkin(profile?.skinId);

  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-br from-violet-300 via-pink-200 to-sky-200">
      {/* Декоративные планеты */}
      <div className="pointer-events-none absolute -left-24 -top-24 h-96 w-96 rounded-full bg-gradient-to-br from-pink-300 to-rose-200 opacity-80 blur-sm" />
      <div className="pointer-events-none absolute -bottom-32 -right-20 h-[28rem] w-[28rem] rounded-full bg-gradient-to-br from-sky-300 to-cyan-200 opacity-80" />
      <div className="pointer-events-none absolute right-1/4 top-16 h-24 w-24 rounded-full bg-amber-200 shadow-[0_0_60px_20px_rgba(253,230,138,.6)]" />
      <div className="pointer-events-none absolute inset-0 opacity-70" style={{ backgroundImage: "radial-gradient(white 1px, transparent 1px)", backgroundSize: "42px 42px" }} />

      <div className="relative mx-auto grid min-h-screen max-w-6xl items-center gap-10 px-6 py-12 lg:grid-cols-2">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-white/70 px-4 py-1.5 text-sm font-bold text-violet-700 shadow backdrop-blur">
            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" /> Web · Desktop · Mini-app
          </div>
          <h1 className="mt-4 text-6xl font-black leading-[0.95] text-slate-800 drop-shadow-sm sm:text-7xl">
            Nova<br />
            <span className="bg-gradient-to-r from-violet-600 via-fuchsia-500 to-orange-400 bg-clip-text text-transparent">Arena</span>
          </h1>
          <p className="mt-5 max-w-lg text-lg text-slate-700">
            Яркий мультяшный 3D-шутер: космическое лобби, арена-замок с настоящей физикой, 8 уникальных скинов, хедшоты, лидерборд и
            прогрессия. Работает даже на слабых устройствах.
          </p>
          <ul className="mt-6 grid grid-cols-2 gap-2 text-sm font-semibold text-slate-700">
            {["⚡ 60 FPS: адаптивное качество", "🧱 Физика Rapier (WASM)", "🎨 Cel-shading, инстансинг", "🔊 Процедурный звук", "📱 Тач-управление", "🌐 Presence-лобби, API"].map((f) => (
              <li key={f} className="rounded-xl bg-white/60 px-3 py-2 backdrop-blur">{f}</li>
            ))}
          </ul>
          <div className="mt-6 flex flex-wrap items-center gap-3 text-sm">
            <Link href="/leaderboard" className="rounded-xl bg-white/70 px-4 py-2 font-bold text-slate-700 shadow hover:bg-white">🏆 Таблица лидеров</Link>
            <a href="https://github.com" target="_blank" rel="noreferrer" className="rounded-xl bg-white/70 px-4 py-2 font-bold text-slate-700 shadow hover:bg-white">⭐ Готово к GitHub / Vercel / Tauri</a>
          </div>
        </div>

        <div className="rounded-3xl bg-white/90 p-7 shadow-2xl backdrop-blur">
          <div className="flex items-center gap-4">
            <div className="rounded-2xl bg-gradient-to-br from-violet-100 to-pink-100 p-2">
              <SkinPreview s={skin} size={96} />
            </div>
            <div>
              <div className="text-xs font-bold uppercase tracking-widest text-slate-500">Ваш профиль</div>
              <div className="text-2xl font-black text-slate-800">{hydrated && profile ? profile.name : "Новый пилот"}</div>
              {hydrated && profile && (
                <div className="text-sm font-semibold text-slate-500">Уровень {profile.level} · 🪙 {profile.coins} · {skin.name}</div>
              )}
            </div>
          </div>

          <label className="mt-6 block text-xs font-bold uppercase tracking-wider text-slate-500">Позывной</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && name.trim().length >= 2 && enter("/lobby")}
            maxLength={20}
            placeholder="Например, StarFox"
            className="mt-1 w-full rounded-2xl border-2 border-slate-200 bg-slate-50 px-4 py-3 text-lg font-bold text-slate-800 outline-none transition focus:border-violet-400 focus:bg-white"
          />
          {error && <div className="mt-2 rounded-xl bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-600">{error}</div>}

          <label className="mt-4 block text-xs font-bold uppercase tracking-wider text-slate-500">Качество графики</label>
          <div className="mt-1 grid grid-cols-3 gap-1 rounded-xl bg-slate-100 p-1">
            {(["low", "medium", "high"] as Quality[]).map((q) => (
              <button
                key={q}
                onClick={() => setSettings({ quality: q })}
                className={`rounded-lg py-2 text-sm font-bold transition ${settings.quality === q ? "bg-violet-500 text-white shadow" : "text-slate-600 hover:bg-white"}`}
              >
                {q === "low" ? "Низкое" : q === "medium" ? "Среднее" : "Высокое"}
              </button>
            ))}
          </div>

          <button
            onClick={() => enter("/lobby")}
            disabled={busy || name.trim().length < 2}
            className="mt-6 w-full rounded-2xl bg-gradient-to-r from-violet-500 to-fuchsia-500 py-4 text-xl font-black text-white shadow-lg transition hover:scale-[1.02] active:scale-95 disabled:opacity-40"
          >
            {busy ? "Подключение…" : "🚀 Войти в лобби"}
          </button>
          <button
            onClick={() => enter("/arena")}
            disabled={busy || name.trim().length < 2}
            className="mt-3 w-full rounded-2xl bg-gradient-to-r from-rose-400 to-orange-400 py-3 text-lg font-black text-white shadow-lg transition hover:scale-[1.02] active:scale-95 disabled:opacity-40"
          >
            ⚔️ Сразу в бой
          </button>

          <div className="mt-5 flex flex-wrap justify-center gap-1.5">
            {SKINS.map((s) => (
              <div key={s.id} className="rounded-xl bg-slate-50 p-1" title={s.name}>
                <SkinPreview s={s} size={36} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
