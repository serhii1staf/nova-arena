"use client";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { Text, Billboard } from "@react-three/drei";
import { CapsuleCollider, RigidBody, type RapierRigidBody } from "@react-three/rapier";
import { Character, type CharacterHandle } from "./Character";
import type { BodyTag } from "../world";

export interface RemotePlayer {
  playerId: number;
  name: string;
  skinId: string;
  avatarId: string;
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
      <Billboard position={[0, 2.15, 0]}>
        <Text fontSize={0.26} color="#ffffff" outlineWidth={0.025} outlineColor="#0891b2" anchorY="bottom">
          {p.name}
        </Text>
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

export function RemotePlayers({ players, weapon = false, collidable = false }: { players: RemotePlayer[]; weapon?: boolean; collidable?: boolean }) {
  return (
    <>
      {players.map((p) => (
        <Remote key={p.playerId} p={p} weapon={weapon} collidable={collidable} />
      ))}
    </>
  );
}
