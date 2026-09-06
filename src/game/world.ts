"use client";
import * as THREE from "three";
import type { RapierRigidBody } from "@react-three/rapier";

/** Реестр сущностей мира — прямой доступ из useFrame без React-состояния. */
export interface BotHandle {
  id: number;
  name: string;
  alive: boolean;
  body: RapierRigidBody | null;
  takeDamage: (dmg: number, point: THREE.Vector3, headshot: boolean) => void;
}

export interface PlayerHandle {
  body: RapierRigidBody | null;
  position: THREE.Vector3;
  alive: boolean;
  takeDamage: (dmg: number, from: string) => void;
}

export const world = {
  bots: new Map<number, BotHandle>(),
  player: {
    body: null,
    position: new THREE.Vector3(0, 2, 0),
    alive: false,
    takeDamage: () => {},
  } as PlayerHandle,
  reset() {
    this.bots.clear();
    this.player.body = null;
    this.player.alive = false;
  },
};

export type BodyTag = { type: "player" } | { type: "bot"; id: number } | { type: "remote"; id: number } | { type: "static" };

export const ARENA = {
  spawns: [
    [24, 2, 0],
    [-24, 2, 0],
    [0, 2, 24],
    [0, 2, -24],
    [18, 2, 18],
    [-18, 2, 18],
    [18, 2, -18],
    [-18, 2, -18],
  ] as [number, number, number][],
  waypoints: [
    [20, 0, 0],
    [-20, 0, 0],
    [0, 0, 20],
    [0, 0, -20],
    [14, 0, 14],
    [-14, 0, 14],
    [14, 0, -14],
    [-14, 0, -14],
    [24, 0, 10],
    [-24, 0, -10],
    [10, 0, -24],
    [-10, 0, 24],
    [0, 3, 5],
    [0, 3, -5],
    [5, 3, 0],
    [-5, 3, 0],
    [26, 0, -22],
    [-26, 0, 22],
  ] as [number, number, number][],
  health: [
    [0, 3.7, 5.2],
    [26, 0.6, 26],
    [-26, 0.6, -26],
  ] as [number, number, number][],
};

export const BOT_NAMES = ["Zed", "Pixel", "Cosmo", "Rocket", "Bolt", "Nyx", "Juno", "Vex", "Kiwi", "Orbit"];
export const BOT_SKINS = ["ember", "mint", "bubble", "frost", "grape", "solar", "lagoon", "nova"];

export function randomSpawn(avoid?: THREE.Vector3) {
  const list = ARENA.spawns;
  if (!avoid) return list[Math.floor(Math.random() * list.length)];
  // выбираем из 3 самых дальних от игрока — честный респаун
  const sorted = [...list].sort((a, b) => avoid.distanceToSquared(new THREE.Vector3(...b)) - avoid.distanceToSquared(new THREE.Vector3(...a)));
  return sorted[Math.floor(Math.random() * 3)];
}
