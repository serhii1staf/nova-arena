"use client";
import * as THREE from "three";

let gradientMap: THREE.DataTexture | null = null;

/** Плавная карта для cel-shading — один раз на приложение. */
export function getGradientMap() {
  if (!gradientMap) {
    const data = new Uint8Array([55, 72, 90, 108, 126, 144, 162, 180, 198, 216, 234, 255]);
    gradientMap = new THREE.DataTexture(data, 12, 1, THREE.RedFormat);
    gradientMap.minFilter = THREE.LinearFilter;
    gradientMap.magFilter = THREE.LinearFilter;
    gradientMap.needsUpdate = true;
  }
  return gradientMap;
}

const toonCache = new Map<string, THREE.MeshToonMaterial>();
/** Кэш материалов: одинаковые цвета → один материал → меньше переключений состояния GPU. */
export function toon(color: string, emissive = "#000000", emissiveIntensity = 0) {
  const key = `${color}|${emissive}|${emissiveIntensity}`;
  let m = toonCache.get(key);
  if (!m) {
    m = new THREE.MeshToonMaterial({
      color,
      gradientMap: getGradientMap(),
      emissive,
      emissiveIntensity,
    });
    toonCache.set(key, m);
  }
  return m;
}

const basicCache = new Map<string, THREE.MeshBasicMaterial>();
export function basic(color: string, opts?: { transparent?: boolean; opacity?: number }) {
  const key = `${color}|${opts?.opacity ?? 1}`;
  let m = basicCache.get(key);
  if (!m) {
    m = new THREE.MeshBasicMaterial({ color, transparent: !!opts?.transparent, opacity: opts?.opacity ?? 1, toneMapped: false });
    basicCache.set(key, m);
  }
  return m;
}

/** Общие геометрии — переиспользуются всеми персонажами и объектами. */
export const GEO = {
  capsule: new THREE.CapsuleGeometry(0.32, 0.45, 6, 12),
  head: new THREE.SphereGeometry(0.34, 18, 14),
  visor: new THREE.SphereGeometry(0.26, 16, 12),
  limb: new THREE.CapsuleGeometry(0.1, 0.3, 4, 8),
  foot: new THREE.BoxGeometry(0.22, 0.14, 0.3),
  box: new THREE.BoxGeometry(1, 1, 1),
  sphere: new THREE.SphereGeometry(1, 16, 12),
  sphereLow: new THREE.SphereGeometry(1, 10, 8),
  cyl: new THREE.CylinderGeometry(1, 1, 1, 16),
  cone: new THREE.ConeGeometry(1, 1, 16),
  torus: new THREE.TorusGeometry(1, 0.08, 8, 24),
  plane: new THREE.PlaneGeometry(1, 1),
};
