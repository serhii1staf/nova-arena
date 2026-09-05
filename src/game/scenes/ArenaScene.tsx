"use client";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { useRouter } from "next/navigation";
import { Canvas } from "@react-three/fiber";
import { Physics } from "@react-three/rapier";
import { Preload } from "@react-three/drei";
import { useGame, useProfile, QUALITY_PRESETS, MATCH_DURATION } from "../store";
import { attachInput, input, requestLock, releaseLock } from "../input";
import { unlockAudio, startMusic, stopMusic, setVolume, setMusicEnabled, sfx } from "../audio";
import { world } from "../world";
import { CastleMap } from "../components/CastleMap";
import { Player } from "../components/Player";
import { Bots, HealthPacks } from "../components/Bots";
import { Effects } from "../components/Effects";
import { GradientSky, Lights } from "../components/Environment";
import { HUD } from "../ui/HUD";
import { TouchControls } from "../ui/TouchControls";
import { RemotePlayers, type RemotePlayer } from "../components/RemotePlayers";
import { connectRealtime, type RealtimeConnection } from "../realtime";

function SceneReady() {
  useEffect(() => {
    const g = useGame.getState();
    if (g.phase === "loading") g.setPhase("ready");
  }, []);
  return null;
}

export default function ArenaScene() {
  const router = useRouter();
  const wrap = useRef<HTMLDivElement>(null);
  const profile = useProfile((s) => s.profile);
  const settings = useProfile((s) => s.settings);
  const preset = QUALITY_PRESETS[settings.quality];
  const [results, setResults] = useState<{ coinsEarned: number; xpEarned: number; saved: boolean } | null>(null);
  const [others, setOthers] = useState<RemotePlayer[]>([]);
  const arenaPosition = useRef({ x: 0, y: 0, z: 0, ry: 0 });
  const realtime = useRef<RealtimeConnection | null>(null);
  const submitted = useRef(false);
  const updateProfile = useProfile((s) => s.updateProfile);

  useEffect(() => {
    if (!profile) router.replace("/");
  }, [profile, router]);

  // жизненный цикл сцены
  useEffect(() => {
    world.reset();
    useGame.getState().reset();
    useGame.getState().setPhase("loading");
    const detach = attachInput();
    setVolume(settings.volume);
    return () => {
      detach();
      stopMusic();
      releaseLock();
      world.reset();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!profile) return;
    realtime.current = connectRealtime("arena", { playerId: profile.id, name: profile.name, skinId: profile.skinId, ...arenaPosition.current }, setOthers);
    return () => {
      realtime.current?.close();
      realtime.current = null;
    };
  }, [profile]);

  // пауза при потере pointer lock (десктоп)
  useEffect(() => {
    const onLock = () => {
      const g = useGame.getState();
      if (!document.pointerLockElement && !input.touch && (g.phase === "playing" || g.phase === "dead")) g.setPhase("paused");
    };
    document.addEventListener("pointerlockchange", onLock);
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Escape" && input.touch) {
        const g = useGame.getState();
        if (g.phase === "playing") g.setPhase("paused");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerlockchange", onLock);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  // таймер матча
  useEffect(() => {
    const id = setInterval(() => {
      const g = useGame.getState();
      if (g.phase !== "playing" && g.phase !== "dead") return;
      const t = g.timeLeft - 1;
      if (t <= 10 && t > 0) sfx.countdown(false);
      if (t <= 0) {
        g.setTimeLeft(0);
        g.setPhase("ended");
        sfx.countdown(true);
        releaseLock();
        stopMusic();
      } else g.setTimeLeft(t);
    }, 1000);
    return () => clearInterval(id);
  }, []);

  // отправка результатов
  const phase = useGame((s) => s.phase);
  useEffect(() => {
    if (phase !== "ended" || submitted.current) return;
    submitted.current = true;
    const s = useGame.getState().stats;
    if (!profile) return;
    fetch("/api/matches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        playerId: profile.id,
        map: "castle",
        kills: s.kills,
        deaths: s.deaths,
        headshots: s.headshots,
        score: s.score,
        accuracy: s.shots ? s.hits / s.shots : 0,
        durationSec: MATCH_DURATION,
        won: s.kills >= 10,
      }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.player) updateProfile({ coins: d.player.coins, xp: d.player.xp, level: d.player.level });
        setResults({ coinsEarned: d.coinsEarned ?? 0, xpEarned: d.xpEarned ?? 0, saved: !!d.match });
      })
      .catch(() => setResults({ coinsEarned: 0, xpEarned: 0, saved: false }));
  }, [phase, profile, updateProfile]);

  const start = useCallback(() => {
    unlockAudio();
    setVolume(settings.volume);
    if (settings.music) startMusic("arena");
    setMusicEnabled(settings.music);
    useGame.getState().setPhase("playing");
    if (wrap.current) requestLock(wrap.current);
  }, [settings.music, settings.volume]);

  const resume = useCallback(() => {
    useGame.getState().setPhase("playing");
    if (wrap.current) requestLock(wrap.current);
  }, []);

  if (!profile) return null;

  return (
    <div ref={wrap} className="fixed inset-0 overflow-hidden bg-sky-200" style={{ touchAction: "none" }}>
      <Canvas
        shadows={preset.shadows ? { type: THREE.PCFShadowMap } : false}
        dpr={preset.dpr}
        gl={{ antialias: preset.antialias, powerPreference: "high-performance", stencil: false }}
        camera={{ fov: settings.fov, near: 0.05, far: 500, position: [0, 2, 10] }}
        onCreated={({ gl }) => {
          gl.setClearColor("#bfe7ff");
        }}
        onPointerDown={() => {
          const g = useGame.getState();
          if (g.phase === "playing" && !input.locked && wrap.current) requestLock(wrap.current);
        }}
      >
        <GradientSky top="#8ec5ff" horizon="#e8f4ff" bottom="#c7f0d8" />
        <fog attach="fog" args={["#e8f4ff", 60, 180]} />
        <Lights shadows={preset.shadows} shadowMap={preset.shadowMap} area={45} />
        <Suspense fallback={null}>
          <Physics gravity={[0, -22, 0]} timeStep={1 / 60} interpolate paused={phase === "paused" || phase === "ended"}>
            <CastleMap shadows={preset.shadows} />
            <Player onMove={(x, y, z, ry) => { arenaPosition.current = { x, y, z, ry }; realtime.current?.update({ x, y, z, ry }); }} />
            <Bots count={others.length > 0 ? 0 : preset.bots} />
            <HealthPacks />
          </Physics>
          <RemotePlayers players={others} weapon />
          <Effects particleBudget={preset.particles} />
          <SceneReady />
          <Preload all />
        </Suspense>
      </Canvas>
      <HUD onStart={start} onResume={resume} results={results} />
      {(phase === "playing" || phase === "dead") && <TouchControls />}
      {input.touch && phase === "playing" && (
        <button onClick={() => useGame.getState().setPhase("paused")} className="fixed left-3 top-3 z-30 rounded-xl bg-white/80 px-3 py-1.5 text-sm font-bold text-slate-700 shadow">
          ⏸
        </button>
      )}
    </div>
  );
}
