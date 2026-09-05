"use client";
import { useMemo, useRef, forwardRef, useImperativeHandle } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { GEO, toon, basic } from "../materials";
import { getSkin, type HatType } from "../skins";

export interface CharacterHandle {
  group: THREE.Group;
  /** скорость 0..1 для анимации ходьбы; выставляется владельцем каждый кадр */
  speed: number;
  /** true — играть анимацию стрельбы */
  shooting: boolean;
}

interface Props {
  skinId: string;
  castShadow?: boolean;
  /** Показывать бластер в руке */
  weapon?: boolean;
}

function Hat({ type, accent, secondary }: { type: HatType; accent: string; secondary: string }) {
  const a = toon(accent);
  const s = toon(secondary);
  switch (type) {
    case "antenna":
      return (
        <group position={[0, 0.34, 0]}>
          <mesh geometry={GEO.cyl} material={s} scale={[0.03, 0.25, 0.03]} position={[0, 0.12, 0]} />
          <mesh geometry={GEO.sphereLow} material={basic(accent)} scale={0.07} position={[0, 0.27, 0]} />
        </group>
      );
    case "horns":
      return (
        <group position={[0, 0.2, 0]}>
          <mesh geometry={GEO.cone} material={a} scale={[0.08, 0.22, 0.08]} position={[-0.22, 0.12, 0]} rotation={[0, 0, 0.5]} />
          <mesh geometry={GEO.cone} material={a} scale={[0.08, 0.22, 0.08]} position={[0.22, 0.12, 0]} rotation={[0, 0, -0.5]} />
        </group>
      );
    case "halo":
      return <mesh geometry={GEO.torus} material={basic(accent)} scale={0.28} position={[0, 0.55, 0]} rotation={[Math.PI / 2, 0, 0]} />;
    case "cap":
      return (
        <group position={[0, 0.25, 0]}>
          <mesh geometry={GEO.sphereLow} material={a} scale={[0.36, 0.2, 0.36]} />
          <mesh geometry={GEO.box} material={a} scale={[0.34, 0.04, 0.25]} position={[0, -0.02, 0.3]} />
        </group>
      );
    case "crown":
      return (
        <group position={[0, 0.36, 0]}>
          <mesh geometry={GEO.cyl} material={a} scale={[0.22, 0.12, 0.22]} />
          {[0, 1, 2, 3, 4].map((i) => (
            <mesh
              key={i}
              geometry={GEO.cone}
              material={a}
              scale={[0.06, 0.14, 0.06]}
              position={[Math.cos((i / 5) * Math.PI * 2) * 0.2, 0.12, Math.sin((i / 5) * Math.PI * 2) * 0.2]}
            />
          ))}
        </group>
      );
    case "ears":
      return (
        <group position={[0, 0.25, 0]}>
          <mesh geometry={GEO.sphereLow} material={a} scale={0.12} position={[-0.26, 0.12, 0]} />
          <mesh geometry={GEO.sphereLow} material={a} scale={0.12} position={[0.26, 0.12, 0]} />
        </group>
      );
    case "fin":
      return <mesh geometry={GEO.box} material={a} scale={[0.05, 0.3, 0.4]} position={[0, 0.4, -0.05]} rotation={[0.4, 0, 0]} />;
    default:
      return null;
  }
}

/**
 * Процедурный мультяшный персонаж: общие геометрии и кэшированные материалы.
 * Анимация: ходьба, дыхание и отдача при выстреле.
 */
export const Character = forwardRef<CharacterHandle, Props>(function Character({ skinId, castShadow = true, weapon = true }, ref) {
  const skin = getSkin(skinId);
  const group = useRef<THREE.Group>(null!);
  const body = useRef<THREE.Group>(null!);
  const lLeg = useRef<THREE.Group>(null!);
  const rLeg = useRef<THREE.Group>(null!);
  const lArm = useRef<THREE.Group>(null!);
  const rArm = useRef<THREE.Group>(null!);
  const head = useRef<THREE.Group>(null!);
  const state = useRef({ speed: 0, shooting: false, phase: Math.random() * 10, recoil: 0 });

  useImperativeHandle(ref, () => ({
    get group() {
      return group.current;
    },
    get speed() {
      return state.current.speed;
    },
    set speed(v: number) {
      state.current.speed = v;
    },
    get shooting() {
      return state.current.shooting;
    },
    set shooting(v: boolean) {
      state.current.shooting = v;
      if (v) state.current.recoil = 1;
    },
  }));

  const mats = useMemo(
    () => ({
      primary: toon(skin.primary),
      secondary: toon(skin.secondary),
      accent: toon(skin.accent),
      visor: new THREE.MeshStandardMaterial({ color: skin.visor, roughness: 0.15, metalness: 0.4, emissive: skin.visor, emissiveIntensity: 0.25 }),
      glow: basic(skin.accent),
      gun: toon("#e2e8f0"),
    }),
    [skin],
  );

  useFrame((_, dt) => {
    const s = state.current;
    if (!group.current) return;
    s.phase += dt * (2 + s.speed * 9);
    const walk = s.speed;
    const swing = Math.sin(s.phase) * 0.8 * walk;
    lLeg.current.rotation.x = swing;
    rLeg.current.rotation.x = -swing;
    lArm.current.rotation.x = -swing * 0.7;
    // Оружейная поза нужна только персонажам, которые действительно держат оружие.
    s.recoil = Math.max(0, s.recoil - dt * 6);
    rArm.current.rotation.x = weapon ? -1.3 - s.recoil * 0.5 + swing * 0.15 * (1 - s.recoil) : swing;
    body.current.position.y = 0.05 + Math.abs(Math.sin(s.phase * 2)) * 0.05 * walk + Math.sin(s.phase * 0.5) * 0.01;
    head.current.rotation.z = Math.sin(s.phase * 0.5) * 0.04;
    body.current.rotation.z = Math.sin(s.phase) * 0.05 * walk;
  });

  return (
    <group ref={group}>
      <group ref={body}>
        {/* корпус */}
        <mesh geometry={GEO.capsule} material={mats.primary} position={[0, 0.72, 0]} castShadow={castShadow} />
        {/* грудная пластина */}
        <mesh geometry={GEO.box} material={mats.secondary} scale={[0.4, 0.3, 0.12]} position={[0, 0.8, 0.26]} />
        <mesh geometry={GEO.box} material={mats.glow} scale={[0.14, 0.08, 0.02]} position={[0, 0.82, 0.33]} />
        {/* ремень */}
        <mesh geometry={GEO.cyl} material={mats.accent} scale={[0.34, 0.06, 0.34]} position={[0, 0.5, 0]} />
        {/* рюкзак / ранец */}
        <mesh geometry={GEO.box} material={mats.secondary} scale={[0.36, 0.42, 0.2]} position={[0, 0.78, -0.32]} castShadow={castShadow} />
        <mesh geometry={GEO.cyl} material={mats.accent} scale={[0.06, 0.2, 0.06]} position={[-0.1, 0.55, -0.36]} />
        <mesh geometry={GEO.cyl} material={mats.accent} scale={[0.06, 0.2, 0.06]} position={[0.1, 0.55, -0.36]} />
        {/* голова */}
        <group ref={head} position={[0, 1.34, 0]}>
          <mesh geometry={GEO.head} material={mats.secondary} castShadow={castShadow} />
          <mesh geometry={GEO.visor} material={mats.visor} position={[0, 0.02, 0.14]} scale={[1.05, 0.8, 0.9]} />
          {/* блики глаз */}
          <mesh geometry={GEO.sphereLow} material={basic("#ffffff")} scale={0.045} position={[-0.1, 0.08, 0.36]} />
          <mesh geometry={GEO.sphereLow} material={basic("#ffffff")} scale={0.045} position={[0.1, 0.08, 0.36]} />
          <mesh geometry={GEO.torus} material={mats.accent} scale={0.35} position={[0, -0.06, 0.04]} rotation={[0.25, 0, 0]} />
          <Hat type={skin.hat} accent={skin.accent} secondary={skin.secondary} />
        </group>
        {/* руки */}
        <group ref={lArm} position={[-0.42, 0.95, 0]}>
          <mesh geometry={GEO.limb} material={mats.primary} position={[0, -0.22, 0]} />
          <mesh geometry={GEO.sphereLow} material={mats.accent} scale={0.12} position={[0, -0.48, 0]} />
        </group>
        <group ref={rArm} position={[0.42, 0.95, 0]}>
          <mesh geometry={GEO.limb} material={mats.primary} position={[0, -0.22, 0]} />
          <mesh geometry={GEO.sphereLow} material={mats.accent} scale={0.12} position={[0, -0.48, 0]} />
          {weapon && (
            <group position={[0, -0.5, 0.15]}>
              <mesh geometry={GEO.box} material={mats.gun} scale={[0.12, 0.14, 0.5]} />
              <mesh geometry={GEO.box} material={mats.accent} scale={[0.08, 0.08, 0.2]} position={[0, 0.05, 0.3]} />
              <mesh geometry={GEO.box} material={mats.secondary} scale={[0.15, 0.04, 0.28]} position={[0, 0.1, -0.05]} />
              <mesh geometry={GEO.box} material={mats.accent} scale={[0.1, 0.18, 0.12]} position={[0, -0.14, -0.04]} rotation={[0.25, 0, 0]} />
              <mesh geometry={GEO.cyl} material={mats.gun} scale={[0.045, 0.16, 0.045]} rotation={[Math.PI / 2, 0, 0]} position={[0, 0.02, 0.47]} />
              <mesh geometry={GEO.cyl} material={mats.glow} scale={[0.04, 0.1, 0.04]} rotation={[Math.PI / 2, 0, 0]} position={[0, 0.02, 0.42]} />
            </group>
          )}
        </group>
      </group>
      {/* ноги */}
      <group ref={lLeg} position={[-0.16, 0.5, 0]}>
        <mesh geometry={GEO.limb} material={mats.secondary} position={[0, -0.22, 0]} />
        <mesh geometry={GEO.foot} material={mats.accent} position={[0, -0.45, 0.04]} />
      </group>
      <group ref={rLeg} position={[0.16, 0.5, 0]}>
        <mesh geometry={GEO.limb} material={mats.secondary} position={[0, -0.22, 0]} />
        <mesh geometry={GEO.foot} material={mats.accent} position={[0, -0.45, 0.04]} />
      </group>
    </group>
  );
});
