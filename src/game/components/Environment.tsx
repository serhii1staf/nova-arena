"use client";
import { useMemo } from "react";
import * as THREE from "three";
import { PerformanceMonitor } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { useProfile, QUALITY_PRESETS } from "../store";

/** Яркое градиентное небо — один draw call, без текстур. */
export function GradientSky({ top = "#c9b8ff", horizon = "#ffe3f1", bottom = "#a9ecff" }: { top?: string; horizon?: string; bottom?: string }) {
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        uniforms: {
          top: { value: new THREE.Color(top) },
          horizon: { value: new THREE.Color(horizon) },
          bottom: { value: new THREE.Color(bottom) },
        },
        vertexShader: `varying vec3 vPos; void main(){ vPos = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
        fragmentShader: `
          uniform vec3 top; uniform vec3 horizon; uniform vec3 bottom; varying vec3 vPos;
          void main(){
            float h = normalize(vPos).y;
            vec3 c = h > 0.0 ? mix(horizon, top, pow(h, 0.6)) : mix(horizon, bottom, pow(-h, 0.8));
            gl_FragColor = vec4(c, 1.0);
          }`,
        toneMapped: false,
      }),
    [top, horizon, bottom],
  );
  return (
    <mesh material={material} frustumCulled={false} renderOrder={-1000}>
      <sphereGeometry args={[400, 24, 12]} />
    </mesh>
  );
}

/** Адаптивный DPR: если FPS падает — снижаем разрешение, если стабильно высокий — повышаем. */
export function AdaptiveQuality() {
  const quality = useProfile((s) => s.settings.quality);
  const setDpr = useThree((s) => s.setDpr);
  const preset = QUALITY_PRESETS[quality];
  return (
    <PerformanceMonitor
      bounds={() => [40, 58]}
      flipflops={4}
      onChange={({ factor }) => {
        const [lo, hi] = preset.dpr;
        const cap = Math.min(hi, typeof window !== "undefined" ? window.devicePixelRatio : 1);
        setDpr(Math.max(lo, Math.round((lo + (cap - lo) * factor) * 4) / 4));
      }}
    />
  );
}

export function Lights({ shadows, shadowMap, color = "#fff6e5", intensity = 2.2, area = 60 }: { shadows: boolean; shadowMap: number; color?: string; intensity?: number; area?: number }) {
  return (
    <>
      <hemisphereLight args={["#ffffff", "#ffd6f0", 1.1]} />
      <directionalLight
        position={[30, 50, 20]}
        intensity={intensity}
        color={color}
        castShadow={shadows}
        shadow-mapSize={[shadowMap, shadowMap]}
        shadow-camera-left={-area}
        shadow-camera-right={area}
        shadow-camera-top={area}
        shadow-camera-bottom={-area}
        shadow-camera-near={1}
        shadow-camera-far={150}
        shadow-bias={-0.0005}
        shadow-normalBias={0.03}
      />
      <ambientLight intensity={0.35} color="#e0f2ff" />
    </>
  );
}
