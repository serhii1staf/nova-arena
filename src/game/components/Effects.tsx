"use client";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";

/**
 * Пулы эффектов на InstancedMesh: трассеры, искры, вспышки.
 * Ни одного аллока в рантайме — фиксированные массивы, кольцевые буферы.
 */
interface Tracer {
  from: THREE.Vector3;
  to: THREE.Vector3;
  life: number;
  color: THREE.Color;
}
interface Particle {
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  life: number;
  max: number;
  size: number;
  color: THREE.Color;
}

const MAX_TRACERS = 48;
const tracers: Tracer[] = Array.from({ length: MAX_TRACERS }, () => ({
  from: new THREE.Vector3(),
  to: new THREE.Vector3(),
  life: 0,
  color: new THREE.Color(),
}));
let tracerIdx = 0;

let MAX_PARTICLES = 128;
let particles: Particle[] = [];
let particleIdx = 0;

function ensureParticles(n: number) {
  if (particles.length === n) return;
  MAX_PARTICLES = n;
  particles = Array.from({ length: n }, () => ({
    pos: new THREE.Vector3(),
    vel: new THREE.Vector3(),
    life: 0,
    max: 1,
    size: 0.1,
    color: new THREE.Color(),
  }));
  particleIdx = 0;
}
ensureParticles(128);

export const fx = {
  tracer(from: THREE.Vector3, to: THREE.Vector3, color: string | number, life = 0.08) {
    const t = tracers[tracerIdx++ % MAX_TRACERS];
    t.from.copy(from);
    t.to.copy(to);
    t.life = life;
    t.color.set(color);
  },
  burst(at: THREE.Vector3, color: string | number, count = 8, speed = 4, size = 0.08, life = 0.5, normal?: THREE.Vector3) {
    for (let i = 0; i < count; i++) {
      const p = particles[particleIdx++ % MAX_PARTICLES];
      p.pos.copy(at);
      p.vel.set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize();
      if (normal) p.vel.addScaledVector(normal, 1.2).normalize();
      p.vel.multiplyScalar(speed * (0.4 + Math.random() * 0.8));
      p.life = p.max = life * (0.6 + Math.random() * 0.6);
      p.size = size * (0.6 + Math.random() * 0.8);
      p.color.set(color);
    }
  },
};

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _s = new THREE.Vector3();
const _p = new THREE.Vector3();
const _dir = new THREE.Vector3();
const _up = new THREE.Vector3(0, 1, 0);
const _zero = new THREE.Matrix4().makeScale(0, 0, 0);
const GRAV = new THREE.Vector3(0, -9, 0);

export function Effects({ particleBudget = 128 }: { particleBudget?: number }) {
  ensureParticles(particleBudget);
  const tracerMesh = useRef<THREE.InstancedMesh>(null!);
  const partMesh = useRef<THREE.InstancedMesh>(null!);

  const tracerGeo = useMemo(() => new THREE.CylinderGeometry(0.03, 0.03, 1, 5, 1), []);
  const partGeo = useMemo(() => new THREE.BoxGeometry(1, 1, 1), []);
  const tracerMat = useMemo(() => new THREE.MeshBasicMaterial({ toneMapped: false, transparent: true, opacity: 0.95 }), []);
  const partMat = useMemo(() => new THREE.MeshBasicMaterial({ toneMapped: false }), []);

  useFrame((_, dt) => {
    const tm = tracerMesh.current;
    const pm = partMesh.current;
    if (!tm || !pm) return;
    for (let i = 0; i < MAX_TRACERS; i++) {
      const t = tracers[i];
      if (t.life <= 0) {
        tm.setMatrixAt(i, _zero);
        continue;
      }
      t.life -= dt;
      _dir.subVectors(t.to, t.from);
      const len = _dir.length();
      _p.copy(t.from).addScaledVector(_dir, 0.5);
      _q.setFromUnitVectors(_up, _dir.normalize());
      _s.set(1, len, 1);
      _m.compose(_p, _q, _s);
      tm.setMatrixAt(i, _m);
      tm.setColorAt(i, t.color);
    }
    tm.instanceMatrix.needsUpdate = true;
    if (tm.instanceColor) tm.instanceColor.needsUpdate = true;

    for (let i = 0; i < MAX_PARTICLES; i++) {
      const p = particles[i];
      if (p.life <= 0) {
        pm.setMatrixAt(i, _zero);
        continue;
      }
      p.life -= dt;
      p.vel.addScaledVector(GRAV, dt);
      p.pos.addScaledVector(p.vel, dt);
      const k = Math.max(0, p.life / p.max);
      _s.setScalar(p.size * k);
      _q.setFromAxisAngle(_up, p.life * 10);
      _m.compose(p.pos, _q, _s);
      pm.setMatrixAt(i, _m);
      pm.setColorAt(i, p.color);
    }
    pm.instanceMatrix.needsUpdate = true;
    if (pm.instanceColor) pm.instanceColor.needsUpdate = true;
  });

  return (
    <>
      <instancedMesh ref={tracerMesh} args={[tracerGeo, tracerMat, MAX_TRACERS]} frustumCulled={false} />
      <instancedMesh ref={partMesh} args={[partGeo, partMat, particleBudget]} frustumCulled={false} />
    </>
  );
}
