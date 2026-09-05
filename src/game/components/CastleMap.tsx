"use client";
import { memo, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { RigidBody, CuboidCollider, CylinderCollider } from "@react-three/rapier";
import { Float } from "@react-three/drei";
import { GEO, toon, basic } from "../materials";
import type { BodyTag } from "../world";

type Box = { p: [number, number, number]; s: [number, number, number]; r?: [number, number, number] };

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _p = new THREE.Vector3();
const _s = new THREE.Vector3();

/** Группа одинаковых боксов одним draw call + опциональные коллайдеры. */
function InstancedBoxes({ boxes, color, collide = true, shadow = true }: { boxes: Box[]; color: string; collide?: boolean; shadow?: boolean }) {
  const ref = useRef<THREE.InstancedMesh>(null!);
  useLayoutEffect(() => {
    boxes.forEach((b, i) => {
      _e.set(b.r?.[0] ?? 0, b.r?.[1] ?? 0, b.r?.[2] ?? 0);
      _q.setFromEuler(_e);
      _p.set(...b.p);
      _s.set(...b.s);
      _m.compose(_p, _q, _s);
      ref.current.setMatrixAt(i, _m);
    });
    ref.current.instanceMatrix.needsUpdate = true;
  }, [boxes]);
  return (
    <>
      <instancedMesh ref={ref} args={[GEO.box, toon(color), boxes.length]} castShadow={shadow} receiveShadow />
      {collide &&
        boxes.map((b, i) => (
          <CuboidCollider key={i} args={[b.s[0] / 2, b.s[1] / 2, b.s[2] / 2]} position={b.p} rotation={b.r ?? [0, 0, 0]} />
        ))}
    </>
  );
}

const W = 32; // половина размера арены
const RAMP_ANGLE = Math.atan2(3, 8);

export const CastleMap = memo(function CastleMap({ shadows }: { shadows: boolean }) {
  const data = useMemo(() => {
    const walls: Box[] = [
      { p: [0, 3, -W], s: [W * 2 + 4, 6, 2] },
      { p: [0, 3, W], s: [W * 2 + 4, 6, 2] },
      { p: [-W, 3, 0], s: [2, 6, W * 2] },
      { p: [W, 3, 0], s: [2, 6, W * 2] },
    ];
    const merlons: Box[] = [];
    for (let i = -W + 2; i <= W - 2; i += 2.5) {
      merlons.push({ p: [i, 6.5, -W], s: [1.2, 1, 2.2] }, { p: [i, 6.5, W], s: [1.2, 1, 2.2] });
      merlons.push({ p: [-W, 6.5, i], s: [2.2, 1, 1.2] }, { p: [W, 6.5, i], s: [2.2, 1, 1.2] });
    }
    const crates: Box[] = [
      [13, 5], [14.7, 5], [13.85, 5, 2.55], [-13, -5], [-13, -6.7], [16, -12], [17.7, -12], [16.85, -12, 2.55],
      [-20, 12], [-21.7, 12], [22, 22], [-22, -22], [6, -18], [-6, 18], [24, -4], [-24, 4], [4, 26], [-4, -26],
    ].map((c) => ({ p: [c[0], c[2] ?? 0.85, c[1]] as [number, number, number], s: [1.7, 1.7, 1.7] as [number, number, number] }));
    const covers: Box[] = [
      { p: [9.5, 0.75, 9.5], s: [5, 1.5, 0.8], r: [0, -Math.PI / 4, 0] },
      { p: [-9.5, 0.75, 9.5], s: [5, 1.5, 0.8], r: [0, Math.PI / 4, 0] },
      { p: [9.5, 0.75, -9.5], s: [5, 1.5, 0.8], r: [0, Math.PI / 4, 0] },
      { p: [-9.5, 0.75, -9.5], s: [5, 1.5, 0.8], r: [0, -Math.PI / 4, 0] },
      { p: [20, 0.75, -20], s: [5, 1.5, 0.8], r: [0, Math.PI / 4, 0] },
      { p: [-20, 0.75, 20], s: [5, 1.5, 0.8], r: [0, Math.PI / 4, 0] },
      { p: [20, 0.75, 20], s: [5, 1.5, 0.8], r: [0, -Math.PI / 4, 0] },
      { p: [-20, 0.75, -20], s: [5, 1.5, 0.8], r: [0, -Math.PI / 4, 0] },
    ];
    const keep: Box[] = [
      { p: [0, 1.5, 0], s: [14, 3, 14] },
      // парапет платформы (с проёмами под рампы шириной 5)
      { p: [4.75, 3.4, 6.8], s: [4.5, 0.8, 0.4] },
      { p: [-4.75, 3.4, 6.8], s: [4.5, 0.8, 0.4] },
      { p: [4.75, 3.4, -6.8], s: [4.5, 0.8, 0.4] },
      { p: [-4.75, 3.4, -6.8], s: [4.5, 0.8, 0.4] },
      { p: [6.8, 3.4, 4.75], s: [0.4, 0.8, 4.5] },
      { p: [-6.8, 3.4, 4.75], s: [0.4, 0.8, 4.5] },
      { p: [6.8, 3.4, -4.75], s: [0.4, 0.8, 4.5] },
      { p: [-6.8, 3.4, -4.75], s: [0.4, 0.8, 4.5] },
    ];
    const ramps: Box[] = [
      { p: [11.2, 1.45, 0], s: [8.8, 0.5, 5], r: [0, 0, -RAMP_ANGLE] },
      { p: [-11.2, 1.45, 0], s: [8.8, 0.5, 5], r: [0, 0, RAMP_ANGLE] },
    ];
    const ramps2: Box[] = [
      { p: [0, 1.45, 11.2], s: [5, 0.5, 8.8], r: [RAMP_ANGLE, 0, 0] },
      { p: [0, 1.45, -11.2], s: [5, 0.5, 8.8], r: [-RAMP_ANGLE, 0, 0] },
    ];
    const pillars = Array.from({ length: 8 }, (_, i) => {
      const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
      return [Math.cos(a) * 17, Math.sin(a) * 17] as [number, number];
    });
    const trees = [
      [-27, 27], [27, -27], [-28, -14], [28, 14], [-14, -28], [14, 28], [27, 27], [-27, -27],
    ] as [number, number][];
    const towers = [
      [W, W], [-W, W], [W, -W], [-W, -W],
    ] as [number, number][];
    return { walls, merlons, crates, covers, keep, ramps, ramps2, pillars, trees, towers };
  }, []);

  return (
    <group>
      <RigidBody type="fixed" colliders={false} userData={{ type: "static" } satisfies BodyTag}>
        {/* Земля: трава + мощёный двор */}
        <mesh geometry={GEO.box} material={toon("#8fe388")} scale={[W * 2 + 6, 1, W * 2 + 6]} position={[0, -0.5, 0]} receiveShadow />
        <CuboidCollider args={[W + 3, 0.5, W + 3]} position={[0, -0.5, 0]} />
        <mesh geometry={GEO.cyl} material={toon("#f3e7d3")} scale={[24, 0.1, 24]} position={[0, 0.02, 0]} receiveShadow />
        <mesh geometry={GEO.torus} material={toon("#c4b5fd")} scale={[24, 24, 1]} rotation={[Math.PI / 2, 0, 0]} position={[0, 0.06, 0]} />

        <InstancedBoxes boxes={data.walls} color="#f7dfae" />
        <InstancedBoxes boxes={data.merlons} color="#fbe9c4" collide={false} />
        <InstancedBoxes boxes={data.keep} color="#e9d5ff" />
        <InstancedBoxes boxes={data.ramps} color="#ddd6fe" />
        <InstancedBoxes boxes={data.ramps2} color="#ddd6fe" />
        <InstancedBoxes boxes={data.crates} color="#ffb86b" />
        <InstancedBoxes boxes={data.covers} color="#bfdbfe" />

        {/* Башни по углам */}
        {data.towers.map(([x, z], i) => (
          <group key={i} position={[x, 0, z]}>
            <mesh geometry={GEO.cyl} material={toon("#fde68a")} scale={[4.5, 12, 4.5]} position={[0, 6, 0]} castShadow={shadows} receiveShadow />
            <mesh geometry={GEO.cone} material={toon("#ff8fa3")} scale={[5.5, 4.5, 5.5]} position={[0, 14.2, 0]} castShadow={shadows} />
            <mesh geometry={GEO.sphereLow} material={basic("#fff7ae")} scale={0.6} position={[0, 16.6, 0]} />
            <mesh geometry={GEO.cyl} material={toon("#ffffff")} scale={[0.08, 3, 0.08]} position={[0, 18, 0]} />
            <mesh geometry={GEO.plane} material={basic(i % 2 ? "#60a5fa" : "#fb7185")} scale={[1.6, 1, 1]} position={[0.8, 18.9, 0]} />
            <CylinderCollider args={[6, 4.5]} position={[0, 6, 0]} />
          </group>
        ))}

        {/* Центральная башня на платформе */}
        <group position={[0, 3, 0]}>
          <mesh geometry={GEO.cyl} material={toon("#fbcfe8")} scale={[2.6, 6, 2.6]} position={[0, 3, 0]} castShadow={shadows} receiveShadow />
          <mesh geometry={GEO.cone} material={toon("#a78bfa")} scale={[3.4, 3, 3.4]} position={[0, 7.5, 0]} castShadow={shadows} />
          <mesh geometry={GEO.torus} material={basic("#fde68a")} scale={2.7} rotation={[Math.PI / 2, 0, 0]} position={[0, 5.5, 0]} />
          <CylinderCollider args={[3, 2.6]} position={[0, 3, 0]} />
        </group>

        {/* Колонны */}
        {data.pillars.map(([x, z], i) => (
          <group key={i} position={[x, 0, z]}>
            <mesh geometry={GEO.cyl} material={toon("#fef3c7")} scale={[0.8, 5, 0.8]} position={[0, 2.5, 0]} castShadow={shadows} receiveShadow />
            <mesh geometry={GEO.box} material={toon("#fcd34d")} scale={[2, 0.4, 2]} position={[0, 5.2, 0]} castShadow={shadows} />
            <mesh geometry={GEO.box} material={toon("#fcd34d")} scale={[2, 0.3, 2]} position={[0, 0.15, 0]} />
            <CylinderCollider args={[2.6, 0.8]} position={[0, 2.6, 0]} />
          </group>
        ))}

        {/* Деревья */}
        {data.trees.map(([x, z], i) => (
          <group key={i} position={[x, 0, z]}>
            <mesh geometry={GEO.cyl} material={toon("#d8a47f")} scale={[0.45, 3, 0.45]} position={[0, 1.5, 0]} castShadow={shadows} />
            <mesh geometry={GEO.sphereLow} material={toon(i % 2 ? "#6ee7b7" : "#86efac")} scale={2.2} position={[0, 4, 0]} castShadow={shadows} />
            <mesh geometry={GEO.sphereLow} material={toon(i % 2 ? "#a7f3d0" : "#bbf7d0")} scale={1.5} position={[0.8, 5, 0.5]} castShadow={shadows} />
            <CylinderCollider args={[1.5, 0.5]} position={[0, 1.5, 0]} />
          </group>
        ))}

        {/* Невидимый потолок-ограничитель, чтобы никто не выпрыгнул */}
        <CuboidCollider args={[W + 3, 0.5, W + 3]} position={[0, 24, 0]} />
      </RigidBody>

      {/* Декор: облака */}
      {[
        [-40, 34, -50], [45, 40, -30], [-55, 36, 20], [50, 32, 45], [0, 44, 60], [10, 38, -70],
      ].map((p, i) => (
        <Float key={i} speed={0.6} floatIntensity={1.5} rotationIntensity={0}>
          <group position={p as [number, number, number]}>
            <mesh geometry={GEO.sphereLow} material={toon("#ffffff")} scale={[6, 3.2, 4]} />
            <mesh geometry={GEO.sphereLow} material={toon("#ffffff")} scale={[4, 2.8, 3.5]} position={[5, 0.6, 0]} />
            <mesh geometry={GEO.sphereLow} material={toon("#ffffff")} scale={[3.8, 2.4, 3]} position={[-4.5, 0.2, 0.5]} />
          </group>
        </Float>
      ))}
    </group>
  );
});
