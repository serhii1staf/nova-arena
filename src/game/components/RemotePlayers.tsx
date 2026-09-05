"use client";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { Text, Billboard } from "@react-three/drei";
import { Character, type CharacterHandle } from "./Character";

export interface RemotePlayer {
  playerId: number;
  name: string;
  skinId: string;
  x: number;
  y: number;
  z: number;
  ry: number;
}

/** Удалённый игрок: интерполяция к последней известной позиции (сглаживание сетевых тиков). */
function Remote({ p, weapon = false }: { p: RemotePlayer; weapon?: boolean }) {
  const g = useRef<THREE.Group>(null!);
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
    predicted.current.addScaledVector(velocity.current, Math.min(updateAge.current, 0.08));
    lastPosition.current.copy(g.current.position);
    g.current.position.lerp(predicted.current, 1 - Math.exp(-dt * 28));
    const speed = lastPosition.current.distanceTo(g.current.position) / Math.max(dt, 0.001);
    if (char.current) char.current.speed = Math.min(1, speed / 7);
    let dy = p.ry - g.current.rotation.y;
    dy = Math.atan2(Math.sin(dy), Math.cos(dy));
    g.current.rotation.y += dy * Math.min(1, dt * 12);
  });

  return (
    <group ref={g}>
      <group rotation={[0, Math.PI, 0]}>
        <Character ref={char} skinId={p.skinId} weapon={weapon} castShadow={false} />
      </group>
      <Billboard position={[0, 2.15, 0]}>
        <Text fontSize={0.26} color="#ffffff" outlineWidth={0.025} outlineColor="#0891b2" anchorY="bottom">
          {p.name}
        </Text>
      </Billboard>
    </group>
  );
}

export function RemotePlayers({ players, weapon = false }: { players: RemotePlayer[]; weapon?: boolean }) {
  return (
    <>
      {players.map((p) => (
        <Remote key={p.playerId} p={p} weapon={weapon} />
      ))}
    </>
  );
}
