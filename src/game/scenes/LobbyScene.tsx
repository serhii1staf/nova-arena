"use client";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { useRouter } from "next/navigation";
import { Canvas } from "@react-three/fiber";
import { Physics } from "@react-three/rapier";
import { Preload } from "@react-three/drei";
import { useProfile, QUALITY_PRESETS } from "../store";
import { attachInput, input, requestLock, releaseLock } from "../input";
import { unlockAudio, startMusic, stopMusic, setVolume, setMusicEnabled, sfx } from "../audio";
import { SpaceLobby, LOBBY_ZONES, JUMP_PADS } from "../components/SpaceLobby";
import { SkinPreview } from "../ui/SkinPanel";
import { getSkin } from "../skins";
import { LobbyPlayer } from "../components/LobbyPlayer";
import { RemotePlayers, type RemotePlayer } from "../components/RemotePlayers";
import { Effects } from "../components/Effects";
import { GradientSky, Lights } from "../components/Environment";
import { SkinPanel } from "../ui/SkinPanel";
import { SettingsPanel } from "../ui/SettingsPanel";
import { TouchControls } from "../ui/TouchControls";
import { connectRealtime, type RealtimeConnection } from "../realtime";
import { getAvatar } from "../avatars";
import { ModeratorPanel } from "../ui/ModeratorPanel";

const ZONES = Object.values(LOBBY_ZONES);
const PROMPTS: Record<string, string> = {
  portal: "Войти на арену",
  skins: "Открыть гардероб скинов",
  board: "Открыть таблицу лидеров",
  settings: "Открыть настройки",
};

export default function LobbyScene() {
  const router = useRouter();
  const wrap = useRef<HTMLDivElement>(null);
  const profile = useProfile((s) => s.profile);
  const settings = useProfile((s) => s.settings);
  const preset = QUALITY_PRESETS[settings.quality];
  const [ready, setReady] = useState(false);
  const [started, setStarted] = useState(true);
  const [zone, setZone] = useState<string | null>(null);
  const [panel, setPanel] = useState<"skins" | "settings" | null>(null);
  const [others, setOthers] = useState<RemotePlayer[]>([]);
  const [leaders, setLeaders] = useState<{ name: string; score: number; kills: number }[]>([]);
  const [entering, setEntering] = useState(false);
  const pos = useRef({ x: 0, y: 0, z: 0, ry: 0 });
  const realtime = useRef<RealtimeConnection | null>(null);

  useEffect(() => {
    if (!profile) router.replace("/");
  }, [profile, router]);

  useEffect(() => {
    const detach = attachInput();
    setVolume(settings.volume);
    fetch("/api/leaderboard")
      .then((r) => r.json())
      .then((d) => setLeaders(d.leaderboard ?? []))
      .catch(() => {});
    return () => {
      detach();
      stopMusic();
      releaseLock();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!profile || !started) return;
    realtime.current = connectRealtime("main", { playerId: profile.id, name: profile.name, skinId: profile.skinId, avatarId: profile.avatarId, team: profile.id % 2 ? "red" : "blue", hp: 100, ...pos.current }, setOthers);
    return () => {
      realtime.current?.close();
      realtime.current = null;
    };
  }, [profile, started]);

  // закрытие панели по Esc
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Escape") setPanel(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const enterArena = useCallback(() => {
    if (entering) return;
    setEntering(true);
    sfx.portal();
    releaseLock();
    setTimeout(() => router.push("/arena"), 700);
  }, [entering, router]);

  const onInteract = useCallback(
    (id: string) => {
      if (panel) return;
      sfx.ui();
      if (id === "portal") enterArena();
      else if (id === "skins") {
        releaseLock();
        setPanel("skins");
      } else if (id === "settings") {
        releaseLock();
        setPanel("settings");
      } else if (id === "board") {
        releaseLock();
        router.push("/leaderboard");
      }
    },
    [panel, enterArena, router],
  );

  const start = () => {
    unlockAudio();
    setVolume(settings.volume);
    if (settings.music) startMusic("lobby");
    setMusicEnabled(settings.music);
    setStarted(true);
    if (wrap.current) requestLock(wrap.current);
  };

  if (!profile) return null;

  return (
    <div ref={wrap} className="fixed inset-0 overflow-hidden bg-sky-100" style={{ touchAction: "none" }}>
      <Canvas
        shadows={preset.shadows ? { type: THREE.PCFShadowMap } : false}
        dpr={preset.dpr}
        gl={{ antialias: preset.antialias, powerPreference: "high-performance", stencil: false }}
        camera={{ fov: 60, near: 0.1, far: 600, position: [0, 4, 16] }}
        onCreated={({ gl }) => {
          gl.setClearColor("#d8ccff");
          setReady(true);
        }}
        onPointerDown={() => {
          if (started && !panel && !input.locked && wrap.current) requestLock(wrap.current);
        }}
      >
        <GradientSky top="#b8a7ff" horizon="#ffd9ec" bottom="#9fe6ff" />
        <Lights shadows={preset.shadows} shadowMap={preset.shadowMap} area={30} color="#fff1f2" intensity={2} />
        <Suspense fallback={null}>
          <Physics gravity={[0, -24, 0]} timeStep={1 / 60} interpolate>
            <SpaceLobby skinId={profile.skinId} leaders={leaders} sparkles={preset.sparkles} />
            {started && (
              <LobbyPlayer
                skinId={profile.skinId}
                name={profile.name}
                zones={ZONES}
                jumpPads={JUMP_PADS}
                onZone={setZone}
                onInteract={onInteract}
                onMove={(x, y, z, ry) => {
                  pos.current = { x, y, z, ry };
                  realtime.current?.update({ x, y, z, ry });
                }}
              />
            )}
          </Physics>
          <RemotePlayers players={others} />
          <Effects particleBudget={64} />
          <Preload all />
        </Suspense>
      </Canvas>

      {/* Верхняя панель */}
      <div className="pointer-events-none fixed left-0 right-0 top-0 z-20 flex items-start justify-between p-4">
        <div className="pointer-events-auto flex items-center gap-3 rounded-2xl bg-white/85 px-4 py-2 shadow-lg backdrop-blur">
          <div className="grid h-10 w-10 place-items-center overflow-hidden rounded-xl bg-gradient-to-br from-violet-100 to-fuchsia-100">
            <img src={getAvatar(profile.avatarId).url} alt="" className="h-10 w-10 rounded-xl object-cover" />
          </div>
          <div>
            <div className="font-black text-slate-800">{profile.name}</div>
            <div className="text-xs font-semibold text-slate-500">Уровень {profile.level} · 🪙 {profile.coins}</div>
          </div>
          <div className="ml-3 rounded-xl bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">👥 Онлайн: {others.length + (started ? 1 : 0)}</div>
        </div>
        <div className="pointer-events-auto flex gap-2">
          <button onClick={enterArena} className="rounded-2xl bg-gradient-to-r from-rose-400 to-orange-400 px-5 py-2.5 font-black text-white shadow-lg transition hover:scale-105">
            ⚔️ В бой
          </button>
          <button onClick={() => { releaseLock(); setPanel("skins"); }} className="rounded-2xl bg-white/85 px-4 py-2.5 font-bold text-slate-700 shadow-lg backdrop-blur hover:bg-white">
            👕 Скины
          </button>
          <button onClick={() => { releaseLock(); setPanel("settings"); }} className="rounded-2xl bg-white/85 px-4 py-2.5 font-bold text-slate-700 shadow-lg backdrop-blur hover:bg-white">
            ⚙️
          </button>
          <button onClick={() => { releaseLock(); router.push("/"); }} className="rounded-2xl bg-white/85 px-4 py-2.5 font-bold text-slate-700 shadow-lg backdrop-blur hover:bg-white">
            ⏏
          </button>
        </div>
      </div>

      {/* Подсказка взаимодействия */}
      {started && zone && !panel && (
        <div className="pointer-events-auto fixed bottom-28 left-1/2 z-20 -translate-x-1/2">
          <button onClick={() => onInteract(zone)} className="flex items-center gap-3 rounded-2xl bg-white/90 px-5 py-3 shadow-xl backdrop-blur transition hover:scale-105">
            <kbd className="rounded-lg bg-slate-800 px-2.5 py-1 font-mono font-black text-white">E</kbd>
            <span className="font-bold text-slate-800">{PROMPTS[zone]}</span>
          </button>
        </div>
      )}

      {/* Панели */}
      {panel && (
        <div className="fixed inset-0 z-30 grid place-items-center bg-violet-200/40 backdrop-blur-sm">
          {panel === "skins" ? <SkinPanel onClose={() => setPanel(null)} /> : <SettingsPanel onClose={() => setPanel(null)} />}
        </div>
      )}

      {/* Стартовый экран */}
      {!started && (
        <div className="fixed inset-0 z-30 grid place-items-center bg-gradient-to-br from-violet-200/70 via-pink-100/70 to-sky-200/70 backdrop-blur-sm">
          <div className="max-w-md rounded-3xl bg-white/95 p-8 text-center shadow-2xl">
            <div className="text-sm font-bold uppercase tracking-widest text-violet-500">Космическое лобби</div>
            <h1 className="mt-1 text-4xl font-black text-slate-800">Добро пожаловать, {profile.name}!</h1>
            <p className="mt-3 text-slate-600">Прогуляйтесь по станции, загляните в гардероб, проверьте таблицу лидеров и входите в портал, когда будете готовы.</p>
            <button
              onClick={start}
              disabled={!ready}
              className="mt-6 w-full rounded-2xl bg-gradient-to-r from-violet-500 to-fuchsia-500 py-4 text-xl font-black text-white shadow-lg transition hover:scale-[1.02] disabled:opacity-50"
            >
              {ready ? "Войти в лобби" : "Загрузка…"}
            </button>
          </div>
        </div>
      )}

      {entering && <div className="pointer-events-none fixed inset-0 z-40 animate-pulse bg-white/80" />}

      {started && !panel && <TouchControls fire={false} />}
      <ModeratorPanel />
    </div>
  );
}
