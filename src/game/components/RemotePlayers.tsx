"use client";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { Text, Billboard } from "@react-three/drei";
import { CapsuleCollider, RigidBody, type RapierRigidBody } from "@react-three/rapier";
import { Character, type CharacterHandle } from "./Character";
import type { BodyTag } from "../world";
import { getAvatar } from "../avatars";
import { GEO, basic } from "../materials";

export interface RemotePlayer {
  playerId: number;
  sessionId: string;
  name: string;
  skinId: string;
  avatarId: string;
  team: "red" | "blue";
  hp: number;
  x: number;
  y: number;
  z: number;
  ry: number;
}

/** Удалённый игрок: интерполяция к последней известной позиции (сглаживание сетевых тиков). */
function Remote({ p, weapon = false, collidable = false }: { p: RemotePlayer; weapon?: boolean; collidable?: boolean }) {
  const g = useRef<THREE.Group>(null!);
  const body = useRef<RapierRigidBody>(null);
  const char = useRef<CharacterHandle>(null);
  const target = useRef(new THREE.Vector3(p.x, p.y, p.z));
  const previousTarget = useRef(target.current.clone());
  const velocity = useRef(new THREE.Vector3());
  const predicted = useRef(new THREE.Vector3());
  const lastPosition = useRef(new THREE.Vector3());
  const updateAge = useRef(0);
  const receivedAt = useRef(performance.now());
  const init = useRef(false);

  useEffect(() => {
    const next = new THREE.Vector3(p.x, p.y, p.z);
    const elapsed = Math.max(0.05, (performance.now() - receivedAt.current) / 1000);
    velocity.current.copy(next).sub(previousTarget.current).divideScalar(elapsed).clampLength(0, 14);
    previousTarget.current.copy(next);
    target.current.copy(next);
    updateAge.current = 0;
    receivedAt.current = performance.now();
  }, [p.x, p.y, p.z]);

  useFrame((_, dt) => {
    if (!init.current) {
      g.current.position.copy(target.current);
      init.current = true;
    }
    updateAge.current += dt;
    predicted.current.copy(target.current);
    predicted.current.addScaledVector(velocity.current, Math.min(updateAge.current, 0.04));
    lastPosition.current.copy(g.current.position);
    const nextPosition = predicted.current;
    if (collidable && body.current) {
      body.current.setTranslation({ x: nextPosition.x, y: nextPosition.y, z: nextPosition.z }, true);
      g.current.position.set(0, 0, 0);
    } else {
      g.current.position.lerp(nextPosition, 1 - Math.exp(-dt * 18));
    }
    const speed = collidable ? velocity.current.length() : lastPosition.current.distanceTo(g.current.position) / Math.max(dt, 0.001);
    if (char.current) char.current.speed = Math.min(1, speed / 7);
    let dy = p.ry - g.current.rotation.y;
    dy = Math.atan2(Math.sin(dy), Math.cos(dy));
    g.current.rotation.y += dy * Math.min(1, dt * 12);
  });

  const visual = (
    <group ref={g}>
      <Character ref={char} skinId={p.skinId} weapon={weapon} castShadow={false} />
      <Billboard position={[0, 2.35, 0]}>
        <group>
          <mesh geometry={GEO.plane} material={basic(p.team === "red" ? "#fb7185" : "#60a5fa")} scale={[0.9, 0.1, 1]} position={[0, 0.22, 0]} />
          <mesh geometry={GEO.plane} material={basic("#34d399")} scale={[0.9 * Math.max(0, p.hp) / 100, 0.07, 1]} position={[-0.45 + 0.45 * Math.max(0, p.hp) / 100, 0.22, 0.002]} />
          <mesh geometry={GEO.plane} material={basic(p.team === "red" ? "#fb7185" : "#60a5fa")} scale={0.16} position={[0, 0.58, 0]} rotation={[0, 0, Math.PI / 4]} />
          <sprite position={[-0.62, 0.58, 0]} scale={[0.28, 0.28, 1]}><spriteMaterial map={avatarTexture(getAvatar(p.avatarId).url)} transparent /></sprite>
          <Text fontSize={0.24} color="#ffffff" outlineWidth={0.025} outlineColor={p.team === "red" ? "#be123c" : "#1d4ed8"} anchorY="bottom">
            {p.name}
          </Text>
        </group>
      </Billboard>
    </group>
  );
  if (!collidable) return visual;
  return (
    <RigidBody ref={body} type="fixed" colliders={false} position={[p.x, p.y, p.z]} userData={{ type: "remote", id: p.playerId } satisfies BodyTag}>
      <CapsuleCollider args={[0.35, 0.3]} />
      {visual}
    </RigidBody>
  );
}

const avatarTextures = new Map<string, THREE.Texture>();
function avatarTexture(url: string) {
  let texture = avatarTextures.get(url);
  if (!texture) {
    texture = new THREE.TextureLoader().load(url);
    texture.colorSpace = THREE.SRGBColorSpace;
    avatarTextures.set(url, texture);
  }
  return texture;
}

export function RemotePlayers({ players, weapon = false, collidable = false }: { players: RemotePlayer[]; weapon?: boolean; collidable?: boolean }) {
  return (
    <>
      {players.map((p) => (
        <Remote key={p.sessionId || `${p.playerId}-${p.name}`} p={p} weapon={weapon} collidable={collidable} />
      ))}
    </>
  );
}
