"use client";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { RigidBody, CapsuleCollider, useRapier, type RapierRigidBody } from "@react-three/rapier";
import { Text, Billboard } from "@react-three/drei";
import { Character, type CharacterHandle } from "./Character";
import { fx } from "./Effects";
import { sfx } from "../audio";
import { useGame } from "../store";
import { world, ARENA, BOT_NAMES, BOT_SKINS, randomSpawn, type BodyTag } from "../world";
import { getSkin } from "../skins";
import { GEO, basic } from "../materials";

const BOT_SPEED = 5.2;
const COMBAT_RANGE = 32;
const _to = new THREE.Vector3();
const _pos = new THREE.Vector3();
const _aim = new THREE.Vector3();
const _muzzle = new THREE.Vector3();

interface BotProps {
  id: number;
  name: string;
  skinId: string;
  difficulty: number; // 0..1
}

function Bot({ id, name, skinId, difficulty }: BotProps) {
  const body = useRef<RapierRigidBody>(null);
  const visual = useRef<THREE.Group>(null!);
  const char = useRef<CharacterHandle>(null);
  const hpBar = useRef<THREE.Mesh>(null!);
  const { world: physics, rapier } = useRapier();
  const skin = getSkin(skinId);

  const s = useRef({
    hp: 100,
    alive: true,
    respawnT: 0,
    wp: Math.floor(Math.random() * ARENA.waypoints.length),
    losT: Math.random() * 0.3,
    seesPlayer: false,
    fireCd: 1 + Math.random(),
    strafeDir: 1,
    strafeT: 0,
    stuckT: 0,
    yaw: 0,
    lastX: 0,
    lastZ: 0,
    jumpCd: 0,
  });

  const spawn = useMemo(() => randomSpawn(), []);

  useEffect(() => {
    const handle = {
      id,
      name,
      get alive() {
        return s.current.alive;
      },
      get body() {
        return body.current;
      },
      takeDamage: (dmg: number, point: THREE.Vector3, headshot: boolean) => {
        const st = s.current;
        if (!st.alive) return;
        st.hp -= dmg;
        fx.burst(point, headshot ? "#fff176" : skin.accent, headshot ? 14 : 8, 4, 0.07, 0.5);
        if (st.hp <= 0) {
          st.alive = false;
          st.respawnT = 4.5 + Math.random() * 2;
          const rb = body.current;
          if (rb) {
            const t = rb.translation();
            _pos.set(t.x, t.y, t.z);
            fx.burst(_pos, skin.primary, 28, 7, 0.16, 1.0);
            fx.burst(_pos, skin.secondary, 16, 5, 0.1, 0.8);
            sfx.explode(_pos.distanceTo(world.player.position));
            rb.setEnabled(false);
          }
          if (visual.current) visual.current.visible = false;
          const g = useGame.getState();
          g.addKill(headshot, name);
          sfx.kill();
        } else {
          // при попадании — бот сразу узнаёт об игроке
          st.seesPlayer = true;
          st.losT = 0.5;
        }
      },
    };
    world.bots.set(id, handle);
    return () => {
      world.bots.delete(id);
    };
  }, [id, name, skin]);

  useFrame((_, rawDt) => {
    const rb = body.current;
    if (!rb) return;
    const dt = Math.min(rawDt, 0.05);
    const st = s.current;
    const phase = useGame.getState().phase;
    const playing = phase === "playing" || phase === "dead";

    if (!st.alive) {
      st.respawnT -= dt;
      if (st.respawnT <= 0 && playing) {
        const [x, y, z] = randomSpawn(world.player.position);
        rb.setTranslation({ x, y: y + 0.5, z }, true);
        rb.setLinvel({ x: 0, y: 0, z: 0 }, true);
        rb.setEnabled(true);
        st.hp = 100;
        st.alive = true;
        st.seesPlayer = false;
        st.fireCd = 1.2;
        visual.current.visible = true;
        const t = rb.translation();
        _pos.set(t.x, t.y - 0.65, t.z);
        fx.burst(_pos, "#ffffff", 12, 3, 0.1, 0.6);
      }
      return;
    }

    const t = rb.translation();
    const vel = rb.linvel();
    const pp = world.player.position;
    const dx = pp.x - t.x;
    const dz = pp.z - t.z;
    const dist = Math.hypot(dx, dz);

    // Line of sight — не чаще 6 раз/сек на бота, со сдвигом фазы
    st.losT -= dt;
    if (st.losT <= 0) {
      st.losT = 0.15 + Math.random() * 0.05;
      st.seesPlayer = false;
      if (world.player.alive && playing && dist < COMBAT_RANGE) {
        _to.set(dx, pp.y + 0.5 - (t.y + 0.4), dz);
        const len = _to.length();
        _to.divideScalar(len);
        const ray = new rapier.Ray({ x: t.x, y: t.y + 0.4, z: t.z }, { x: _to.x, y: _to.y, z: _to.z });
        const hit = physics.castRay(ray, len + 0.5, true, undefined, undefined, undefined, rb);
        if (hit) {
          const tag = hit.collider.parent()?.userData as BodyTag | undefined;
          st.seesPlayer = tag?.type === "player";
        }
      }
    }

    // — принятие решения —
    let mx = 0,
      mz = 0;
    let faceYaw = st.yaw;
    if (st.seesPlayer && world.player.alive) {
      faceYaw = Math.atan2(dx, dz);
      st.strafeT -= dt;
      if (st.strafeT <= 0) {
        st.strafeT = 0.8 + Math.random() * 1.2;
        st.strafeDir = Math.random() < 0.5 ? -1 : 1;
      }
      const nx = dx / (dist || 1);
      const nz = dz / (dist || 1);
      // держим дистанцию 8–14 м и стрейфим
      const approach = dist > 14 ? 1 : dist < 7 ? -0.8 : 0;
      mx = nx * approach + -nz * st.strafeDir * 0.8;
      mz = nz * approach + nx * st.strafeDir * 0.8;

      // стрельба
      st.fireCd -= dt;
      if (st.fireCd <= 0 && phase === "playing") {
        st.fireCd = 0.55 - difficulty * 0.2 + Math.random() * 0.4;
        const accuracy = Math.max(0.15, 0.55 + difficulty * 0.3 - dist * 0.012);
        const hitPlayer = Math.random() < accuracy;
        _muzzle.set(t.x + Math.cos(st.yaw) * 0.4, t.y + 0.35, t.z - Math.sin(st.yaw) * 0.4);
        if (hitPlayer) {
          _aim.set(pp.x, pp.y + 0.3, pp.z);
          world.player.takeDamage(7 + Math.round(Math.random() * 5 + difficulty * 4), name);
        } else {
          _aim.set(pp.x + (Math.random() - 0.5) * 3, pp.y + (Math.random() - 0.2) * 2, pp.z + (Math.random() - 0.5) * 3);
        }
        fx.tracer(_muzzle, _aim, skin.accent, 0.09);
        sfx.botShoot(dist);
        if (char.current) char.current.shooting = true;
      }
    } else {
      // патруль по вейпоинтам
      const wp = ARENA.waypoints[st.wp];
      const wx = wp[0] - t.x;
      const wz = wp[2] - t.z;
      const wd = Math.hypot(wx, wz);
      if (wd < 1.6) {
        st.wp = (st.wp + 1 + Math.floor(Math.random() * 3)) % ARENA.waypoints.length;
      } else {
        mx = wx / wd;
        mz = wz / wd;
        faceYaw = Math.atan2(mx, mz);
      }
    }

    // застревание → смена цели + прыжок
    const moved = Math.hypot(t.x - st.lastX, t.z - st.lastZ);
    st.lastX = t.x;
    st.lastZ = t.z;
    const wantsMove = Math.hypot(mx, mz) > 0.1;
    st.stuckT = wantsMove && moved < 0.01 ? st.stuckT + dt : 0;
    st.jumpCd -= dt;
    let vy = vel.y;
    if (st.stuckT > 0.6) {
      st.stuckT = 0;
      st.wp = Math.floor(Math.random() * ARENA.waypoints.length);
      if (st.jumpCd <= 0) {
        vy = 7;
        st.jumpCd = 1.5;
      }
    }

    const speed = BOT_SPEED * (0.85 + difficulty * 0.3);
    const k = 1 - Math.exp(-dt * 10);
    rb.setLinvel({ x: vel.x + (mx * speed - vel.x) * k, y: vy, z: vel.z + (mz * speed - vel.z) * k }, true);

    // упал с карты
    if (t.y < -25) {
      st.alive = false;
      st.respawnT = 2;
      rb.setEnabled(false);
      visual.current.visible = false;
      return;
    }

    // визуал: поворот, анимация, hp-бар
    let dy = faceYaw - st.yaw;
    dy = Math.atan2(Math.sin(dy), Math.cos(dy));
    st.yaw += dy * Math.min(1, dt * 10);
    visual.current.position.set(t.x, t.y - 0.65, t.z);
    visual.current.rotation.y = st.yaw;
    if (char.current) {
      char.current.speed = Math.min(1, Math.hypot(vel.x, vel.z) / BOT_SPEED);
      char.current.shooting = false;
    }
    hpBar.current.scale.x = Math.max(0.001, st.hp / 100);
    hpBar.current.position.x = -(1 - st.hp / 100) * 0.4;
  });

  return (
    <>
      <RigidBody
        ref={body}
        position={[spawn[0], spawn[1] + 0.5, spawn[2]]}
        colliders={false}
        enabledRotations={[false, false, false]}
        friction={0}
        linearDamping={0}
        userData={{ type: "bot", id } satisfies BodyTag}
      >
        <CapsuleCollider args={[0.35, 0.3]} />
      </RigidBody>
      <group ref={visual}>
        <Character ref={char} skinId={skinId} />
        {/* Nameplate + HP */}
        <Billboard position={[0, 2.05, 0]}>
          <Text fontSize={0.22} color="#ffffff" outlineWidth={0.02} outlineColor="#4c1d95" anchorY="bottom" position={[0, 0.1, 0]}>
            {name}
          </Text>
          <mesh geometry={GEO.plane} material={basic("#ffffff", { transparent: true, opacity: 0.6 })} scale={[0.84, 0.1, 1]} />
          <mesh ref={hpBar} geometry={GEO.plane} material={basic("#4ade80")} scale={[0.8, 0.07, 1]} position={[0, 0, 0.001]} />
        </Billboard>
      </group>
    </>
  );
}

export function Bots({ count }: { count: number }) {
  const bots = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        id: i + 1,
        name: BOT_NAMES[i % BOT_NAMES.length],
        skinId: BOT_SKINS[i % BOT_SKINS.length],
        difficulty: 0.3 + ((i * 37) % 60) / 100,
      })),
    [count],
  );
  return (
    <>
      {bots.map((b) => (
        <Bot key={b.id} {...b} />
      ))}
    </>
  );
}

/** Аптечки — вращающиеся кресты, подбор по дистанции, респаун через 20 с. */
export function HealthPacks() {
  const refs = useRef<(THREE.Group | null)[]>([]);
  const timers = useRef(ARENA.health.map(() => 0));
  useFrame((state, dt) => {
    const pp = world.player.position;
    for (let i = 0; i < ARENA.health.length; i++) {
      const g = refs.current[i];
      if (!g) continue;
      if (timers.current[i] > 0) {
        timers.current[i] -= dt;
        g.visible = false;
        continue;
      }
      g.visible = true;
      g.rotation.y += dt * 2;
      g.position.y = ARENA.health[i][1] + Math.sin(state.clock.elapsedTime * 3 + i) * 0.12;
      const [x, , z] = ARENA.health[i];
      if (world.player.alive && Math.hypot(pp.x - x, pp.z - z) < 1.3 && Math.abs(pp.y - g.position.y) < 1.5) {
        const game = useGame.getState();
        if (game.hp < 100) {
          const previousHp = game.hp;
          const hp = Math.min(100, game.hp + 40);
          game.setHp(hp);
          // синхронизируем внутренний hp игрока через отрицательный урон
          world.player.takeDamage(-(hp - previousHp), "heal");
          timers.current[i] = 20;
          sfx.pickup();
          fx.burst(g.position, "#4ade80", 14, 3, 0.08, 0.6);
        }
      }
    }
  });
  return (
    <>
      {ARENA.health.map((p, i) => (
        <group
          key={i}
          position={p}
          ref={(el) => {
            refs.current[i] = el;
          }}
        >
          <mesh geometry={GEO.box} material={basic("#ff5d8f")} scale={[0.5, 0.16, 0.16]} />
          <mesh geometry={GEO.box} material={basic("#ff5d8f")} scale={[0.16, 0.5, 0.16]} />
          <mesh geometry={GEO.box} material={basic("#ffffff", { transparent: true, opacity: 0.35 })} scale={0.7} />
        </group>
      ))}
    </>
  );
}
