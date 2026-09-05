"use client";
import { useState } from "react";
import { SKINS, RARITY_COLOR, type SkinDef } from "../skins";
import { useProfile } from "../store";
import { sfx } from "../audio";

export function SkinPreview({ s, size = 64 }: { s: SkinDef; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64">
      <ellipse cx="32" cy="58" rx="14" ry="3" fill="rgba(0,0,0,.12)" />
      <rect x="20" y="30" width="24" height="22" rx="10" fill={s.primary} />
      <rect x="26" y="36" width="12" height="7" rx="2" fill={s.secondary} />
      <circle cx="32" cy="22" r="12" fill={s.secondary} />
      <ellipse cx="32" cy="23" rx="9" ry="6.5" fill={s.visor} />
      <circle cx="29" cy="21" r="1.5" fill="#fff" />
      <circle cx="35" cy="21" r="1.5" fill="#fff" />
      <rect x="22" y="50" width="7" height="6" rx="2" fill={s.accent} />
      <rect x="35" y="50" width="7" height="6" rx="2" fill={s.accent} />
      {s.hat === "antenna" && (
        <>
          <rect x="31" y="4" width="2" height="8" fill={s.secondary} />
          <circle cx="32" cy="4" r="3" fill={s.accent} />
        </>
      )}
      {s.hat === "horns" && (
        <>
          <polygon points="20,14 24,4 27,14" fill={s.accent} />
          <polygon points="44,14 40,4 37,14" fill={s.accent} />
        </>
      )}
      {s.hat === "halo" && <ellipse cx="32" cy="7" rx="10" ry="2.5" fill="none" stroke={s.accent} strokeWidth="2.5" />}
      {s.hat === "cap" && <path d="M20 14 Q32 2 44 14 L48 15 L16 15 Z" fill={s.accent} />}
      {s.hat === "crown" && <polygon points="22,13 25,5 29,11 32,3 35,11 39,5 42,13" fill={s.accent} />}
      {s.hat === "ears" && (
        <>
          <circle cx="22" cy="11" r="4.5" fill={s.accent} />
          <circle cx="42" cy="11" r="4.5" fill={s.accent} />
        </>
      )}
      {s.hat === "fin" && <polygon points="30,12 32,2 34,12" fill={s.accent} />}
    </svg>
  );
}

export function SkinPanel({ onClose }: { onClose: () => void }) {
  const profile = useProfile((s) => s.profile);
  const updateProfile = useProfile((s) => s.updateProfile);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  if (!profile) return null;

  const select = async (s: SkinDef) => {
    sfx.ui();
    setError(null);
    const owned = profile.ownedSkins.includes(s.id);
    setBusy(s.id);
    try {
      const res = await fetch(owned ? "/api/players" : "/api/skins/buy", {
        method: owned ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId: profile.id, skinId: s.id }),
      });
      const d = await res.json();
      if (!res.ok) {
        setError(d.error ?? "Ошибка");
        return;
      }
      if (owned) updateProfile({ skinId: s.id });
      else {
        updateProfile({ skinId: s.id, coins: d.player.coins, ownedSkins: d.player.ownedSkins });
        sfx.pickup();
      }
    } catch {
      setError("Нет связи с сервером");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="w-[min(40rem,94vw)] rounded-3xl bg-white/95 p-6 shadow-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-800">Скины</h2>
          <p className="text-sm text-slate-500">Монеты: <b className="text-amber-500">🪙 {profile.coins}</b> · зарабатывайте их в боях</p>
        </div>
        <button onClick={onClose} className="rounded-xl bg-slate-100 px-4 py-2 font-bold text-slate-600 hover:bg-slate-200">
          Закрыть
        </button>
      </div>
      {error && <div className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-600">{error}</div>}
      <div className="mt-4 grid max-h-[60vh] grid-cols-2 gap-3 overflow-y-auto pr-1 sm:grid-cols-4">
        {SKINS.map((s) => {
          const owned = profile.ownedSkins.includes(s.id);
          const active = profile.skinId === s.id;
          return (
            <button
              key={s.id}
              disabled={busy !== null}
              onClick={() => select(s)}
              className={`group relative flex flex-col items-center rounded-2xl border-2 p-3 transition hover:scale-[1.03] ${active ? "border-violet-500 bg-violet-50" : "border-slate-100 bg-slate-50 hover:border-slate-300"}`}
            >
              <span className="absolute left-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-black uppercase text-white" style={{ background: RARITY_COLOR[s.rarity] }}>
                {s.rarity}
              </span>
              <SkinPreview s={s} size={80} />
              <div className="mt-1 font-black text-slate-800">{s.name}</div>
              <div className="text-xs font-bold">
                {active ? <span className="text-violet-600">Выбран</span> : owned ? <span className="text-emerald-600">Куплен</span> : <span className="text-amber-600">🪙 {s.price}</span>}
              </div>
              {busy === s.id && <div className="absolute inset-0 grid place-items-center rounded-2xl bg-white/60 text-sm font-bold">…</div>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
