"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Quality = "low" | "medium" | "high";

export interface Profile {
  id: number;
  name: string;
  skinId: string;
  coins: number;
  xp: number;
  level: number;
  ownedSkins: string[];
}

export interface Settings {
  quality: Quality;
  sensitivity: number;
  volume: number;
  music: boolean;
  fov: number;
  showFps: boolean;
}

interface ProfileState {
  profile: Profile | null;
  settings: Settings;
  setProfile: (p: Profile | null) => void;
  updateProfile: (p: Partial<Profile>) => void;
  setSettings: (s: Partial<Settings>) => void;
}

export const useProfile = create<ProfileState>()(
  persist(
    (set) => ({
      profile: null,
      settings: { quality: "medium", sensitivity: 1, volume: 0.7, music: true, fov: 80, showFps: false },
      setProfile: (profile) => set({ profile }),
      updateProfile: (p) => set((s) => (s.profile ? { profile: { ...s.profile, ...p } } : s)),
      setSettings: (s) => set((st) => ({ settings: { ...st.settings, ...s } })),
    }),
    { name: "nova-arena-profile" },
  ),
);

export type Phase = "loading" | "ready" | "playing" | "dead" | "paused" | "ended";

export interface MatchStats {
  kills: number;
  deaths: number;
  headshots: number;
  shots: number;
  hits: number;
  score: number;
  streak: number;
}

interface GameState {
  phase: Phase;
  hp: number;
  ammo: number;
  maxAmmo: number;
  reloading: boolean;
  timeLeft: number;
  stats: MatchStats;
  killFeed: { id: number; text: string }[];
  lastDamageAt: number;
  hitMarkerAt: number;
  botsAlive: number;
  setPhase: (p: Phase) => void;
  setHp: (hp: number) => void;
  setAmmo: (ammo: number, reloading?: boolean) => void;
  setTimeLeft: (t: number) => void;
  addKill: (headshot: boolean, victim: string) => void;
  addDeath: (killer: string) => void;
  addShot: (hit: boolean) => void;
  damaged: () => void;
  feed: (text: string) => void;
  reset: () => void;
}

const initialStats: MatchStats = { kills: 0, deaths: 0, headshots: 0, shots: 0, hits: 0, score: 0, streak: 0 };
let feedId = 0;

export const MATCH_DURATION = 300;
export const MAX_AMMO = 24;

export const useGame = create<GameState>()((set) => ({
  phase: "loading",
  hp: 100,
  ammo: MAX_AMMO,
  maxAmmo: MAX_AMMO,
  reloading: false,
  timeLeft: MATCH_DURATION,
  stats: { ...initialStats },
  killFeed: [],
  lastDamageAt: 0,
  hitMarkerAt: 0,
  botsAlive: 0,
  setPhase: (phase) => set({ phase }),
  setHp: (hp) => set({ hp }),
  setAmmo: (ammo, reloading = false) => set({ ammo, reloading }),
  setTimeLeft: (timeLeft) => set({ timeLeft }),
  addKill: (headshot, victim) =>
    set((s) => {
      const streak = s.stats.streak + 1;
      const bonus = headshot ? 50 : 0;
      const streakBonus = streak >= 3 ? 25 * streak : 0;
      const text = `${headshot ? "🎯 ХЕДШОТ! " : "💥 "}Вы устранили ${victim}${streak >= 3 ? ` · серия ×${streak}` : ""}`;
      const id = ++feedId;
      return {
        stats: {
          ...s.stats,
          kills: s.stats.kills + 1,
          headshots: s.stats.headshots + (headshot ? 1 : 0),
          score: s.stats.score + 100 + bonus + streakBonus,
          streak,
        },
        killFeed: [...s.killFeed.slice(-4), { id, text }],
      };
    }),
  addDeath: (killer) =>
    set((s) => ({
      stats: { ...s.stats, deaths: s.stats.deaths + 1, streak: 0 },
      killFeed: [...s.killFeed.slice(-4), { id: ++feedId, text: `☠️ ${killer} устранил вас` }],
    })),
  addShot: (hit) =>
    set((s) => ({
      stats: { ...s.stats, shots: s.stats.shots + 1, hits: s.stats.hits + (hit ? 1 : 0) },
      hitMarkerAt: hit ? performance.now() : s.hitMarkerAt,
    })),
  damaged: () => set({ lastDamageAt: performance.now() }),
  feed: (text) => set((s) => ({ killFeed: [...s.killFeed.slice(-4), { id: ++feedId, text }] })),
  reset: () =>
    set({
      phase: "ready",
      hp: 100,
      ammo: MAX_AMMO,
      reloading: false,
      timeLeft: MATCH_DURATION,
      stats: { ...initialStats },
      killFeed: [],
      lastDamageAt: 0,
      hitMarkerAt: 0,
    }),
}));

export const QUALITY_PRESETS: Record<
  Quality,
  { dpr: [number, number]; shadows: boolean; shadowMap: number; bots: number; particles: number; antialias: boolean; sparkles: number }
> = {
  low: { dpr: [0.75, 1], shadows: false, shadowMap: 512, bots: 4, particles: 48, antialias: false, sparkles: 80 },
  medium: { dpr: [1, 1.25], shadows: true, shadowMap: 1024, bots: 6, particles: 96, antialias: true, sparkles: 160 },
  high: { dpr: [1, 2], shadows: true, shadowMap: 2048, bots: 8, particles: 160, antialias: true, sparkles: 300 },
};
