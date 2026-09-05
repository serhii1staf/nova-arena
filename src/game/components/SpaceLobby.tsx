"use client";
import { memo, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { RigidBody, CylinderCollider, CuboidCollider } from "@react-three/rapier";
import { Float, Sparkles, Text } from "@react-three/drei";
import { GEO, toon, basic } from "../materials";
import { Character } from "./Character";

export const LOBBY_ZONES = {
  portal: { pos: [0, 0, -17] as [number, number, number], radius: 2.6, id: "portal" },
  skins: { pos: [15, 0, 0] as [number, number, number], radius: 3, id: "skins" },
  board: { pos: [-15, 0, 0] as [number, number, number], radius: 3.5, id: "board" },
  settings: { pos: [0, 0, 16] as [number, number, number], radius: 2.5, id: "settings" },
};
export const JUMP_PADS = [{ pos: [8, 0, 12] as [number, number, number], radius: 1.6, power: 19 }];

/** Портал в арену — анимированный шейдер-вихрь, 1 draw call. */
function Portal({ position }: { position: [number, number, number] }) {
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        side: THREE.DoubleSide,
        uniforms: { time: { value: 0 } },
        vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
        fragmentShader: `
          uniform float time; varying vec2 vUv;
          void main(){
            vec2 p = vUv - 0.5; float r = length(p)*2.0; float a = atan(p.y,p.x);
            float swirl = sin(a*5.0 + r*8.0 - time*4.0)*0.5+0.5;
            vec3 c1 = vec3(0.55,0.75,1.0); vec3 c2 = vec3(1.0,0.6,0.9); vec3 c3 = vec3(1.0,0.95,0.6);
            vec3 col = mix(mix(c1,c2,swirl), c3, pow(1.0-r,3.0));
            float alpha = smoothstep(1.0,0.85,r)*0.95;
            gl_FragColor = vec4(col, alpha);
          }`,
        toneMapped: false,
      }),
    [],
  );
  const ring = useRef<THREE.Mesh>(null!);
  useFrame((state, dt) => {
    mat.uniforms.time.value = state.clock.elapsedTime;
    ring.current.rotation.z += dt * 0.5;
  });
  return (
    <group position={position}>
      <mesh geometry={GEO.cyl} material={toon("#e9d5ff")} scale={[4.2, 0.4, 4.2]} position={[0, 0.2, 0]} receiveShadow />
      <mesh geometry={GEO.cyl} material={toon("#c4b5fd")} scale={[3.4, 0.4, 3.4]} position={[0, 0.5, 0]} />
      <group position={[0, 3.6, 0]}>
        <mesh ref={ring} geometry={GEO.torus} material={toon("#fde68a", "#fbbf24", 0.6)} scale={[3, 3, 3]} castShadow />
        <mesh material={mat} rotation={[0, 0, 0]}>
          <circleGeometry args={[2.85, 48]} />
        </mesh>
      </group>
      <Text position={[0, 7.4, 0]} fontSize={0.9} color="#ffffff" outlineWidth={0.06} outlineColor="#7c3aed" anchorY="bottom" fontWeight="bold">
        АРЕНА
      </Text>
      <Text position={[0, 7, 0]} fontSize={0.35} color="#f5f3ff" outlineWidth={0.02} outlineColor="#7c3aed" anchorY="bottom">
        Замок · Deathmatch
      </Text>
      <Sparkles count={40} scale={[6, 7, 3]} position={[0, 3.6, 0]} size={5} speed={0.6} color="#fff" />
    </group>
  );
}

function FloatingIsland({ position, scale = 1, color = "#a5f3c8", rock = "#c4b5fd", crystal = "#fda4af", collide = false }: { position: [number, number, number]; scale?: number; color?: string; rock?: string; crystal?: string; collide?: boolean }) {
  const inner = (
    <group position={collide ? undefined : position} scale={scale}>
      <mesh geometry={GEO.cyl} material={toon(color)} scale={[3, 0.6, 3]} position={[0, -0.3, 0]} castShadow receiveShadow />
      <mesh geometry={GEO.cone} material={toon(rock)} scale={[3, 3.5, 3]} position={[0, -2.3, 0]} rotation={[Math.PI, 0, 0]} />
      <mesh material={toon(crystal, crystal, 0.5)} position={[0.8, 0.6, 0.4]} rotation={[0.2, 0.4, 0.1]} castShadow>
        <octahedronGeometry args={[0.6, 0]} />
      </mesh>
      <mesh material={toon(crystal, crystal, 0.5)} position={[-0.7, 0.4, -0.5]} scale={0.6} rotation={[-0.2, 0.9, 0.3]}>
        <octahedronGeometry args={[0.6, 0]} />
      </mesh>
      {collide && <CylinderCollider args={[0.3, 3]} position={[0, -0.3, 0]} />}
    </group>
  );
  if (collide) {
    return (
      <RigidBody type="fixed" colliders={false} position={position}>
        {inner}
      </RigidBody>
    );
  }
  return (
    <Float speed={1.2} floatIntensity={1.2} rotationIntensity={0.15}>
      {inner}
    </Float>
  );
}

function Planet({ position, r, color, ring, ringColor = "#fde68a" }: { position: [number, number, number]; r: number; color: string; ring?: boolean; ringColor?: string }) {
  const g = useRef<THREE.Group>(null!);
  useFrame((_, dt) => {
    g.current.rotation.y += dt * 0.05;
  });
  return (
    <group ref={g} position={position}>
      <mesh geometry={GEO.sphere} material={toon(color)} scale={r} />
      {ring && (
        <mesh material={toon(ringColor)} rotation={[Math.PI / 2.6, 0.3, 0]}>
          <torusGeometry args={[r * 1.7, r * 0.18, 6, 48]} />
        </mesh>
      )}
    </group>
  );
}

function HoloGlobe() {
  const g = useRef<THREE.Group>(null!);
  useFrame((state, dt) => {
    g.current.rotation.y += dt * 0.6;
    g.current.position.y = 3.2 + Math.sin(state.clock.elapsedTime * 1.5) * 0.15;
  });
  return (
    <group>
      <mesh geometry={GEO.cyl} material={toon("#ffffff")} scale={[2.2, 1.2, 2.2]} position={[0, 0.6, 0]} castShadow receiveShadow />
      <mesh geometry={GEO.cyl} material={toon("#fbcfe8")} scale={[1.6, 0.4, 1.6]} position={[0, 1.4, 0]} />
      <group ref={g} position={[0, 3.2, 0]}>
        <mesh material={new THREE.MeshStandardMaterial({ color: "#7dd3fc", emissive: "#38bdf8", emissiveIntensity: 0.6, transparent: true, opacity: 0.7, roughness: 0.2 })}>
          <icosahedronGeometry args={[1.1, 1]} />
        </mesh>
        <mesh material={basic("#fef3c7")} rotation={[Math.PI / 2.2, 0, 0]}>
          <torusGeometry args={[1.6, 0.05, 6, 40]} />
        </mesh>
        <mesh material={basic("#fbcfe8")} rotation={[Math.PI / 3, 0.8, 0]}>
          <torusGeometry args={[1.9, 0.04, 6, 40]} />
        </mesh>
      </group>
      <Sparkles count={30} scale={[3, 3, 3]} position={[0, 3.2, 0]} size={4} speed={0.4} color="#fde68a" />
    </group>
  );
}

function GrassPatch({ position, scale = 1 }: { position: [number, number, number]; scale?: number }) {
  const ref = useRef<THREE.Group>(null!);
  const blade = toon("#54b879");
  const lightBlade = toon("#8bdc91");
  useFrame((state) => {
    ref.current.rotation.z = Math.sin(state.clock.elapsedTime * 1.8 + position[0] * 0.3 + position[2] * 0.2) * 0.08;
  });
  return (
    <group ref={ref} position={position} scale={scale}>
      <mesh geometry={GEO.cone} material={blade} scale={[0.12, 0.65, 0.12]} position={[-0.25, 0.32, 0]} rotation={[0, 0, -0.28]} />
      <mesh geometry={GEO.cone} material={lightBlade} scale={[0.12, 0.8, 0.12]} position={[0, 0.4, 0.05]} />
      <mesh geometry={GEO.cone} material={blade} scale={[0.12, 0.58, 0.12]} position={[0.24, 0.29, -0.03]} rotation={[0, 0, 0.3]} />
    </group>
  );
}

function GearIcon() {
  const ref = useRef<THREE.Group>(null!);
  useFrame((_, dt) => {
    ref.current.rotation.y += dt * 0.45;
  });
  return (
    <group ref={ref} position={[0, 2, 0]}>
      <mesh geometry={GEO.torus} material={toon("#0ea5e9", "#38bdf8", 0.35)} scale={1.35} rotation={[Math.PI / 2, 0, 0]} />
      {Array.from({ length: 8 }, (_, i) => {
        const angle = (i / 8) * Math.PI * 2;
        return <mesh key={i} geometry={GEO.box} material={toon("#0284c7")} scale={[0.22, 0.18, 0.42]} position={[Math.cos(angle) * 1.25, 0, Math.sin(angle) * 1.25]} rotation={[0, -angle, 0]} />;
      })}
      <mesh geometry={GEO.cyl} material={toon("#bae6fd")} scale={[0.42, 0.12, 0.42]} />
    </group>
  );
}

function CloudCluster({ position, scale = 1 }: { position: [number, number, number]; scale?: number }) {
  return (
    <Float speed={0.35} floatIntensity={0.8} rotationIntensity={0.02}>
      <group position={position} scale={scale}>
        <mesh geometry={GEO.sphereLow} material={toon("#ffffff")} scale={[5, 2.2, 3.2]} />
        <mesh geometry={GEO.sphereLow} material={toon("#ffffff")} scale={[3.6, 2.8, 3]} position={[4, 0.5, 0.2]} />
        <mesh geometry={GEO.sphereLow} material={toon("#f1f5f9")} scale={[3.8, 2.4, 2.8]} position={[-4, 0.2, 0.4]} />
      </group>
    </Float>
  );
}

function Booth({ position, label, sub, color, facing = 0, children }: { position: [number, number, number]; label: string; sub: string; color: string; facing?: number; children?: React.ReactNode }) {
  return (
    <group position={position}>
      <mesh geometry={GEO.cyl} material={toon(color)} scale={[2.4, 0.5, 2.4]} position={[0, 0.25, 0]} castShadow receiveShadow />
      <mesh geometry={GEO.torus} material={basic("#ffffff")} scale={2.4} rotation={[Math.PI / 2, 0, 0]} position={[0, 0.52, 0]} />
      <group rotation={[0, facing, 0]}>
        <Text position={[0, 4.2, 0]} fontSize={0.6} color="#ffffff" outlineWidth={0.04} outlineColor="#0ea5e9" anchorY="bottom" fontWeight="bold">
          {label}
        </Text>
        <Text position={[0, 3.85, 0]} fontSize={0.28} color="#f0f9ff" outlineWidth={0.015} outlineColor="#0ea5e9" anchorY="bottom">
          {sub}
        </Text>
      </group>
      {children}
    </group>
  );
}

function SkinDisplay({ skinId }: { skinId: string }) {
  const g = useRef<THREE.Group>(null!);
  useFrame((_, dt) => {
    g.current.rotation.y += dt * 0.8;
  });
  return (
    <group ref={g} position={[0, 0.5, 0]}>
      <Character skinId={skinId} weapon={false} />
    </group>
  );
}

interface LeaderRow {
  name: string;
  score: number;
  kills: number;
}

export const SpaceLobby = memo(function SpaceLobby({ skinId, leaders, sparkles }: { skinId: string; leaders: LeaderRow[]; sparkles: number }) {
  const padRef = useRef<THREE.Mesh>(null!);
  useFrame((state) => {
    padRef.current.scale.setScalar(1 + Math.sin(state.clock.elapsedTime * 4) * 0.08);
  });

  const tiles = useMemo(() => {
    const arr: [number, number][] = [];
    for (let i = 0; i < 28; i++) {
      const a = (i / 28) * Math.PI * 2;
      arr.push([Math.cos(a) * 12, Math.sin(a) * 12]);
    }
    return arr;
  }, []);

  return (
    <group>
      {/* Главный остров */}
      <RigidBody type="fixed" colliders={false}>
        <mesh geometry={GEO.cyl} material={toon("#86d7ad")} scale={[22, 2, 22]} position={[0, -1, 0]} receiveShadow />
        <mesh geometry={GEO.cone} material={toon("#d8b4fe")} scale={[22, 16, 22]} position={[0, -10, 0]} rotation={[Math.PI, 0, 0]} />
        <CylinderCollider args={[1, 22]} position={[0, -1, 0]} />
        {/* Дорожки */}
        <mesh geometry={GEO.cyl} material={toon("#fff7ed")} scale={[7, 0.12, 7]} position={[0, 0.06, 0]} receiveShadow />
        <mesh geometry={GEO.box} material={toon("#fff7ed")} scale={[3, 0.12, 30]} position={[0, 0.06, 0]} receiveShadow />
        <mesh geometry={GEO.box} material={toon("#fff7ed")} scale={[30, 0.12, 3]} position={[0, 0.06, 0]} receiveShadow />
        {tiles.map(([x, z], i) => (
          <mesh key={i} geometry={GEO.cyl} material={toon(i % 2 ? "#fbcfe8" : "#bae6fd")} scale={[0.9, 0.16, 0.9]} position={[x, 0.08, z]} />
        ))}
        {/* Забор-ограда из светящихся столбиков по краю */}
        {Array.from({ length: 24 }, (_, i) => {
          const a = (i / 24) * Math.PI * 2;
          return (
            <group key={i} position={[Math.cos(a) * 21, 0, Math.sin(a) * 21]}>
              <mesh geometry={GEO.cyl} material={toon("#ffffff")} scale={[0.18, 1.2, 0.18]} position={[0, 0.6, 0]} />
              <mesh geometry={GEO.sphereLow} material={basic(i % 3 === 0 ? "#fde68a" : i % 3 === 1 ? "#fbcfe8" : "#bae6fd")} scale={0.28} position={[0, 1.35, 0]} />
            </group>
          );
        })}
        {/* Кусты и деревья */}
        {[
          [8, 6], [-8, 6], [7, -12], [-7, -12], [17, 5], [-17, 5], [5, 18], [-5, 18], [-16, -12], [16, -12],
        ].map(([x, z], i) => (
          <group key={i} position={[x, 0, z]}>
            <mesh geometry={GEO.cyl} material={toon("#f9a8d4")} scale={[0.35, 2.4, 0.35]} position={[0, 1.2, 0]} castShadow />
            <mesh geometry={GEO.sphereLow} material={toon(i % 2 ? "#65c98b" : "#42b8d1")} scale={[1.25, 1.05, 1.1]} position={[-0.75, 3, 0]} castShadow />
            <mesh geometry={GEO.sphereLow} material={toon(i % 2 ? "#86efac" : "#67e8f9")} scale={[1.45, 1.2, 1.3]} position={[0.45, 3.15, 0.05]} castShadow />
            <mesh geometry={GEO.sphereLow} material={toon(i % 2 ? "#bbf7d0" : "#a5f3fc")} scale={[0.9, 0.8, 0.85]} position={[0.8, 4, 0.3]} />
            <CylinderCollider args={[1.2, 0.4]} position={[0, 1.2, 0]} />
          </group>
        ))}
        {[[5, 8], [-5, 8], [9, -8], [-9, -8], [19, 10], [-19, 10], [10, 19], [-10, 19]].map(([x, z], i) => (
          <GrassPatch key={`grass-${i}`} position={[x, 0, z]} scale={0.8 + (i % 3) * 0.15} />
        ))}
        {/* Центр */}
        <group position={[0, 0, 0]}>
          <HoloGlobe />
        </group>
        <CylinderCollider args={[0.6, 2.2]} position={[0, 0.6, 0]} />
        {/* Портал */}
        <Portal position={LOBBY_ZONES.portal.pos} />
        <CylinderCollider args={[0.35, 4.2]} position={[LOBBY_ZONES.portal.pos[0], 0.35, LOBBY_ZONES.portal.pos[2]]} />
        {/* Скины */}
        <Booth position={LOBBY_ZONES.skins.pos} label="СКИНЫ" sub="Нажми E" color="#fbcfe8" facing={-Math.atan2(LOBBY_ZONES.skins.pos[0], -LOBBY_ZONES.skins.pos[2])}>
          <SkinDisplay skinId={skinId} />
        </Booth>
        <CylinderCollider args={[0.25, 2.4]} position={[LOBBY_ZONES.skins.pos[0], 0.25, LOBBY_ZONES.skins.pos[2]]} />
        {/* Лидерборд */}
        <group position={LOBBY_ZONES.board.pos} rotation={[0, Math.PI / 2, 0]}>
          <mesh geometry={GEO.box} material={toon("#ffffff")} scale={[6, 4.4, 0.3]} position={[0, 3.2, 0]} castShadow />
          <mesh geometry={GEO.box} material={toon("#c7d2fe")} scale={[5.6, 4, 0.1]} position={[0, 3.2, 0.15]} />
          <mesh geometry={GEO.cyl} material={toon("#a5b4fc")} scale={[0.25, 1.2, 0.25]} position={[-2.5, 0.6, 0]} />
          <mesh geometry={GEO.cyl} material={toon("#a5b4fc")} scale={[0.25, 1.2, 0.25]} position={[2.5, 0.6, 0]} />
          <Text position={[0, 4.75, 0.25]} fontSize={0.5} color="#4338ca" anchorY="middle" fontWeight="bold">
            ТОП ИГРОКОВ
          </Text>
          {(leaders.length ? leaders : [{ name: "Пока пусто", score: 0, kills: 0 }]).slice(0, 5).map((l, i) => (
            <Text key={i} position={[-2.5, 4.1 - i * 0.55, 0.25]} fontSize={0.36} color="#312e81" anchorX="left" anchorY="middle">
              {`${i + 1}. ${l.name}  —  ${l.score} очк.`}
            </Text>
          ))}
          <Text position={[0, 1.3, 0.25]} fontSize={0.26} color="#6366f1" anchorY="middle">
            E — полная таблица
          </Text>
          <CuboidCollider args={[3, 2.2, 0.2]} position={[0, 3.2, 0]} />
        </group>
        {/* Настройки */}
        <Booth position={LOBBY_ZONES.settings.pos} label="НАСТРОЙКИ" sub="Нажми E" facing={Math.PI} color="#bae6fd">
          <GearIcon />
        </Booth>
        <CylinderCollider args={[0.25, 2.4]} position={[LOBBY_ZONES.settings.pos[0], 0.25, LOBBY_ZONES.settings.pos[2]]} />
        {/* Джамп-пад */}
        <group position={JUMP_PADS[0].pos}>
          <mesh geometry={GEO.cyl} material={toon("#fde68a")} scale={[1.8, 0.25, 1.8]} position={[0, 0.12, 0]} />
          <mesh ref={padRef} geometry={GEO.cyl} material={basic("#fb7185")} scale={[1.3, 0.3, 1.3]} position={[0, 0.2, 0]} />
          <Text position={[0, 1.4, 0]} fontSize={0.3} color="#ffffff" outlineWidth={0.02} outlineColor="#e11d48" anchorY="bottom">
            ↑ Джамп-пад
          </Text>
        </group>
      </RigidBody>

      {/* Верхняя платформа, куда закидывает джамп-пад */}
      <FloatingIsland position={[12, 8.5, 12]} scale={1.3} color="#fef08a" rock="#fda4af" crystal="#a78bfa" collide />

      {/* Декоративные парящие острова */}
      <FloatingIsland position={[-30, 4, -20]} scale={1.2} />
      <FloatingIsland position={[32, 7, -10]} color="#fde68a" rock="#f9a8d4" crystal="#67e8f9" />
      <FloatingIsland position={[-28, -2, 22]} scale={0.8} color="#bae6fd" rock="#c4b5fd" crystal="#fde047" />
      <FloatingIsland position={[26, 2, 28]} scale={0.9} color="#fbcfe8" rock="#a5f3fc" crystal="#86efac" />
      <FloatingIsland position={[0, 12, -45]} scale={1.6} color="#a7f3d0" rock="#fbcfe8" crystal="#fde68a" />

      {/* Дальние облака создают движение и глубину, не вмешиваясь в коллизии острова. */}
      <CloudCluster position={[-42, 28, -54]} scale={1.5} />
      <CloudCluster position={[48, 34, -42]} scale={1.2} />
      <CloudCluster position={[-58, 32, 24]} scale={1.1} />
      <CloudCluster position={[54, 30, 46]} scale={1.4} />

      {/* Планеты */}
      <Planet position={[-120, 40, -160]} r={28} color="#fbcfe8" ring ringColor="#fde68a" />
      <Planet position={[150, 70, -120]} r={20} color="#bfdbfe" />
      <Planet position={[90, -30, 160]} r={16} color="#fef08a" ring ringColor="#c4b5fd" />
      <Planet position={[-160, -10, 90]} r={12} color="#a7f3d0" />
      <mesh geometry={GEO.sphere} material={basic("#fffbeb")} scale={14} position={[60, 120, -200]} />

      {/* Звёзды — мягкие светящиеся точки */}
      <Sparkles count={sparkles} scale={[260, 140, 260]} size={6} speed={0.15} opacity={0.9} color="#ffffff" />
      <Sparkles count={Math.round(sparkles / 3)} scale={[200, 120, 200]} size={9} speed={0.1} opacity={0.8} color="#fde68a" />
    </group>
  );
});
