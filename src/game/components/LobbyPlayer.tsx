"use client";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { RigidBody, CapsuleCollider, useRapier, type RapierRigidBody } from "@react-three/rapier";
import { Text, Billboard } from "@react-three/drei";
import { Character, type CharacterHandle } from "./Character";
import { input, consumeFrameInput, moveAxes } from "../input";
import { useProfile } from "../store";
import { sfx } from "../audio";
import { fx } from "./Effects";
import { world } from "../world";

const SPEED = 7;
const JUMP = 9;
const _dir = new THREE.Vector3();
const _camPos = new THREE.Vector3();
const _look = new THREE.Vector3();
const _cameraAnchor = new THREE.Vector3();

export const LOBBY_SPAWN: [number, number, number] = [0, 1.5, 8];

interface Props {
  skinId: string;
  name: string;
  /** Колбэк каждые ~100мс с позицией (для presence) */
  onMove?: (x: number, y: number, z: number, ry: number) => void;
  /** Зоны взаимодействия: возвращает подсказку по позиции */
  zones: { pos: [number, number, number]; radius: number; id: string }[];
  onZone: (id: string | null) => void;
  onInteract: (id: string) => void;
  jumpPads?: { pos: [number, number, number]; radius: number; power: number }[];
}

/** Контроллер от 3-го лица: капсула Rapier + орбитальная камера с плавным следованием. */
export function LobbyPlayer({ skinId, name, onMove, zones, onZone, onInteract, jumpPads = [] }: Props) {
  const body = useRef<RapierRigidBody>(null);
  const visual = useRef<THREE.Group>(null!);
  const char = useRef<CharacterHandle>(null);
  const { world: physics, rapier } = useRapier();
  const camera = useThree((s) => s.camera);
  const cameraAnchor = useRef(new THREE.Vector3());
  const cameraReady = useRef(false);
  const sensitivity = useProfile((s) => s.settings.sensitivity);
  const st = useRef({ yaw: 0, pitch: 0.35, faceYaw: Math.PI, grounded: false, zone: null as string | null, moveT: 0, stepT: 0, padCd: 0 });

  useEffect(() => {
    const cam = camera as THREE.PerspectiveCamera;
    cam.fov = 60;
    cam.near = 0.1;
    cam.updateProjectionMatrix();
  }, [camera]);

  useFrame((_, rawDt) => {
    const rb = body.current;
    if (!rb) return;
    const dt = Math.min(rawDt, 0.05);
    const s = st.current;
    const t = rb.translation();
    world.player.position.set(t.x, t.y, t.z);

    {
      const k = 0.0022 * sensitivity;
      s.yaw += input.yawDelta * k;
      s.pitch = THREE.MathUtils.clamp(s.pitch - input.pitchDelta * k, -0.3, 1.2);
    }

    const ray = new rapier.Ray({ x: t.x, y: t.y, z: t.z }, { x: 0, y: -1, z: 0 });
    const hit = physics.castRay(ray, 0.9, true, undefined, undefined, undefined, rb);
    s.grounded = !!hit && hit.timeOfImpact < 0.75;

    const vel = rb.linvel();
    const [f, r] = moveAxes();
    _dir.set(-Math.sin(s.yaw) * f + Math.cos(s.yaw) * r, 0, -Math.cos(s.yaw) * f - Math.sin(s.yaw) * r);
    const moving = _dir.lengthSq() > 0.01;
    const k = 1 - Math.exp(-dt * (s.grounded ? 12 : 3));
    let ny = vel.y;
    if (input.jumpPressed && s.grounded) {
      ny = JUMP;
      sfx.jump();
    }
    // джамп-пады
    s.padCd -= dt;
    if (s.padCd <= 0) {
      for (const p of jumpPads) {
        if (Math.hypot(t.x - p.pos[0], t.z - p.pos[2]) < p.radius && Math.abs(t.y - p.pos[1]) < 1.5) {
          ny = p.power;
          s.padCd = 0.6;
          sfx.portal();
          fx.burst(new THREE.Vector3(t.x, t.y - 0.6, t.z), "#fef08a", 20, 5, 0.1, 0.7);
        }
      }
    }
    rb.setLinvel({ x: vel.x + (_dir.x * SPEED - vel.x) * k, y: ny, z: vel.z + (_dir.z * SPEED - vel.z) * k }, true);

    // упал с острова
    if (t.y < -30) {
      rb.setTranslation({ x: LOBBY_SPAWN[0], y: LOBBY_SPAWN[1], z: LOBBY_SPAWN[2] }, true);
      rb.setLinvel({ x: 0, y: 0, z: 0 }, true);
      sfx.respawn();
    }

    // визуал
    const hs = Math.hypot(vel.x, vel.z);
    if (moving) s.faceYaw = Math.atan2(_dir.x, _dir.z);
    let dy = s.faceYaw - visual.current.rotation.y;
    dy = Math.atan2(Math.sin(dy), Math.cos(dy));
    visual.current.rotation.y += dy * Math.min(1, dt * 12);
    visual.current.position.set(t.x, t.y - 0.65, t.z);
    if (char.current) char.current.speed = Math.min(1, hs / SPEED);
    if (s.grounded && hs > 2) {
      s.stepT -= dt * hs;
      if (s.stepT <= 0) {
        s.stepT = 2.6;
        sfx.step();
      }
    }

    // камера: орбита с плавностью + защита от проваливания под остров
    _cameraAnchor.set(t.x, t.y + 1, t.z);
    if (!cameraReady.current) {
      cameraAnchor.current.copy(_cameraAnchor);
      cameraReady.current = true;
    }
    cameraAnchor.current.lerp(_cameraAnchor, 1 - Math.exp(-dt * 20));
    const dist = 5.5;
    _camPos.set(
      cameraAnchor.current.x + Math.sin(s.yaw) * Math.cos(s.pitch) * dist,
      cameraAnchor.current.y + Math.sin(s.pitch) * dist,
      cameraAnchor.current.z + Math.cos(s.yaw) * Math.cos(s.pitch) * dist,
    );
    camera.position.lerp(_camPos, 1 - Math.exp(-dt * 20));
    _look.copy(cameraAnchor.current);
    camera.lookAt(_look);

    // зоны
    let zone: string | null = null;
    for (const z of zones) {
      if (Math.hypot(t.x - z.pos[0], t.z - z.pos[2]) < z.radius && Math.abs(t.y - z.pos[1]) < 3) {
        zone = z.id;
        break;
      }
    }
    if (zone !== s.zone) {
      s.zone = zone;
      onZone(zone);
    }
    if (zone && input.interact) onInteract(zone);

    s.moveT -= dt;
    if (s.moveT <= 0) {
      s.moveT = 0.033;
      onMove?.(t.x, t.y - 0.65, t.z, visual.current.rotation.y);
    }
    consumeFrameInput();
  });

  return (
    <>
      <RigidBody ref={body} position={LOBBY_SPAWN} colliders={false} enabledRotations={[false, false, false]} friction={0} linearDamping={0} ccd>
        <CapsuleCollider args={[0.35, 0.3]} />
      </RigidBody>
      <group ref={visual} rotation={[0, Math.PI, 0]}>
        <Character ref={char} skinId={skinId} weapon={false} />
        <Billboard position={[0, 2.15, 0]}>
          <Text fontSize={0.26} color="#ffffff" outlineWidth={0.025} outlineColor="#6d28d9" anchorY="bottom">
            {name}
          </Text>
        </Billboard>
      </group>
    </>
  );
}
