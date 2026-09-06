"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useProfile } from "@/game/store";
import { SKINS, getSkin } from "@/game/skins";
import { SkinPreview } from "@/game/ui/SkinPanel";
import { AVATARS, DEFAULT_AVATAR_ID, getAvatar } from "@/game/avatars";
import { unlockAudio, sfx } from "@/game/audio";

export default function HomePage() {
  const router = useRouter();
  const profile = useProfile((s) => s.profile);
  const setProfile = useProfile((s) => s.setProfile);
  const [name, setName] = useState("");
  const [avatarId, setAvatarId] = useState(DEFAULT_AVATAR_ID);
  const [avatarsOpen, setAvatarsOpen] = useState(false);
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
      const res = await fetch("/api/players", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, avatarId }) });
      const d = await res.json();
      if (res.ok) {
        setProfile({
          id: d.player.id,
          name: d.player.name,
          role: d.player.role ?? "player",
          avatarId: d.player.avatarId ?? DEFAULT_AVATAR_ID,
          skinId: d.player.skinId,
          coins: d.player.coins,
          xp: d.player.xp,
          level: d.player.level,
          ownedSkins: d.player.ownedSkins,
        });
      } else {
        setProfile({ id: 0, name: name.trim(), role: "player", avatarId, skinId: "nova", coins: 0, xp: 0, level: 1, ownedSkins: ["nova"] });
      }
      router.push(dest);
    } catch {
      setProfile({ id: 0, name: name.trim(), role: "player", avatarId, skinId: "nova", coins: 0, xp: 0, level: 1, ownedSkins: ["nova"] });
      router.push(dest);
    } finally {
      setBusy(false);
    }
  };

  const skin = getSkin(profile?.skinId);
  const avatar = getAvatar(avatarId);

  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-br from-violet-300 via-pink-200 to-sky-200">
      {/* Декоративные планеты */}
      <div className="pointer-events-none absolute -left-24 -top-24 h-96 w-96 rounded-full bg-gradient-to-br from-pink-300 to-rose-200 opacity-80 blur-sm" />
      <div className="pointer-events-none absolute -bottom-32 -right-20 h-[28rem] w-[28rem] rounded-full bg-gradient-to-br from-sky-300 to-cyan-200 opacity-80" />
      <div className="pointer-events-none absolute right-1/4 top-16 h-24 w-24 rounded-full bg-amber-200 shadow-[0_0_60px_20px_rgba(253,230,138,.6)]" />
      <div className="pointer-events-none absolute inset-0 opacity-70" style={{ backgroundImage: "radial-gradient(white 1px, transparent 1px)", backgroundSize: "42px 42px" }} />

      <div className="relative mx-auto grid min-h-screen max-w-6xl items-center gap-10 px-6 py-12 lg:grid-cols-2">
        <div className="hidden lg:block">
          <h1 className="text-7xl font-black leading-[0.9] text-slate-800 drop-shadow-sm">Nova<br /><span className="bg-gradient-to-r from-violet-600 via-fuchsia-500 to-orange-400 bg-clip-text text-transparent">Arena</span></h1>
          <div className="mt-6 text-lg font-bold text-slate-700">Космический deathmatch начинается здесь.</div>
        </div>

        <div className="rounded-3xl bg-white/90 p-7 shadow-2xl backdrop-blur">
          <div className="flex items-center gap-4">
            <button onClick={() => setAvatarsOpen(true)} className="overflow-hidden rounded-2xl bg-gradient-to-br from-violet-100 to-pink-100 p-2 shadow-inner" title="Выбрать аватар">
              <img src={avatar.url} alt={avatar.name} className="h-24 w-24 rounded-xl object-cover" />
            </button>
            <div>
              <div className="text-xs font-bold uppercase tracking-widest text-slate-500">Профиль пилота</div>
              <div className="text-2xl font-black text-slate-800">{hydrated && profile ? profile.name : "Новый пилот"}</div>
              {hydrated && profile && <div className="text-sm font-semibold text-slate-500">Уровень {profile.level} · 🪙 {profile.coins} · {skin.name}</div>}
              <button onClick={() => setAvatarsOpen(true)} className="mt-1 text-xs font-black text-violet-600 hover:text-violet-800">Выбрать аватар</button>
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
      {avatarsOpen && <div className="fixed inset-0 z-30 grid place-items-center bg-slate-900/35 p-4 backdrop-blur-sm">
        <div className="w-[min(34rem,94vw)] rounded-3xl bg-white p-6 shadow-2xl">
          <div className="flex items-center justify-between"><h2 className="text-2xl font-black text-slate-800">Аватар пилота</h2><button onClick={() => setAvatarsOpen(false)} className="rounded-xl bg-slate-100 px-3 py-2 font-bold text-slate-600">Закрыть</button></div>
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">{AVATARS.map((option) => <button key={option.id} onClick={() => { setAvatarId(option.id); setAvatarsOpen(false); }} className={`overflow-hidden rounded-2xl border-4 bg-slate-50 p-1 ${avatarId === option.id ? "border-violet-500" : "border-transparent"}`}><img src={option.url} alt={option.name} className="aspect-square w-full rounded-xl object-cover" /></button>)}</div>
        </div>
      </div>}
    </main>
  );
}
