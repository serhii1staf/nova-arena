"use client";
import { useState } from "react";
import { useProfile } from "../store";

export function ModeratorPanel() {
  const role = useProfile((state) => state.profile?.role);
  const [open, setOpen] = useState(false);
  const [invisible, setInvisible] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [scale, setScale] = useState(1);
  if (role !== "moderator") return null;

  return (
    <div className="pointer-events-auto fixed bottom-4 right-4 z-40">
      {open && <div className="mb-2 w-64 rounded-2xl bg-slate-950/90 p-4 text-white shadow-2xl backdrop-blur">
        <div className="text-xs font-black uppercase tracking-widest text-cyan-300">Moderator tools</div>
        <label className="mt-3 flex items-center justify-between text-sm font-bold"><span>Невидимость</span><input type="checkbox" checked={invisible} onChange={(event) => setInvisible(event.target.checked)} /></label>
        <label className="mt-3 block text-sm font-bold">Размер: {scale.toFixed(1)}x<input className="mt-1 w-full" type="range" min="0.5" max="2" step="0.1" value={scale} onChange={(event) => setScale(Number(event.target.value))} /></label>
        <label className="mt-3 block text-sm font-bold">Скорость: {speed.toFixed(1)}x<input className="mt-1 w-full" type="range" min="0.5" max="3" step="0.1" value={speed} onChange={(event) => setSpeed(Number(event.target.value))} /></label>
        <div className="mt-3 text-[11px] leading-4 text-slate-300">Панель видна только роли moderator. Командные эффекты будут синхронизированы серверным moderation API.</div>
      </div>}
      <button onClick={() => setOpen((value) => !value)} className="rounded-xl bg-cyan-500 px-4 py-2 text-sm font-black text-white shadow-lg hover:bg-cyan-400">{open ? "Закрыть" : "Moderator"}</button>
    </div>
  );
}
