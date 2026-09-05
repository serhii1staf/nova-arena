"use client";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { RigidBody, CapsuleCollider, useRapier, type RapierRigidBody } from "@react-three/rapier";
import { input, consumeFrameInput, moveAxes } from "../input";
import { useGame, useProfile, MAX_AMMO } from "../store";
import { sfx } from "../audio";
import { fx } from "./Effects";
import { world, randomSpawn, type BodyTag } from "../world";
import { GEO, toon, basic } from "../materials";
import { getSkin } from "../skins";

const SPEED = 7.5;
const SPRINT = 10.5;
const JUMP = 8.5;
const FIRE_INTERVAL = 0.11;
const RELOAD_TIME = 1.25;
const DAMAGE = 34;
const HEAD_DAMAGE = 100;

const _dir = new THREE.Vector3();
const _fwd = new THREE.Vector3();
const _right = new THREE.Vector3();
const _origin = new THREE.Vector3();
const _hit = new THREE.Vector3();
const _normal = new THREE.Vector3();
const _muzzle = new THREE.Vector3();
const _tmp = new THREE.Vector3();
const _euler = new THREE.Euler(0, 0, 0, "YXZ");

interface Props {
  onMove?: (x: number, y: number, z: number, ry: number) => void;
}

/**
 * FPS-контроллер: динамическая капсула Rapier (без вращения), raycast-проверка земли,
 * стрельба hitscan через физический raycast (один вызов на выстрел), viewmodel-оружие.
 */
export function Player({ onMove }: Props) {
  const body = useRef<RapierRigidBody>(null);
  const gun = useRef<THREE.Group>(null!);
  const flash = useRef<THREE.Mesh>(null!);
  const { world: physics, rapier } = useRapier();
  const camera = useThree((s) => s.camera);
  const sensitivity = useProfile((s) => s.settings.sensitivity);
  const fov = useProfile((s) => s.settings.fov);
  const skin = getSkin(useProfile((s) => s.profile?.skinId));
  const spawn = useMemo(() => randomSpawn(), []);

  const st = useRef({
    yaw: 0,
    pitch: 0,
    grounded: false,
    wasGrounded: false,
    fireCd: 0,
    reloadT: 0,
    ammo: MAX_AMMO,
    hp: 100,
    recoil: 0,
    bob: 0,
    stepT: 0,
    deadT: 0,
    coyote: 0,
    vy: 0,
    moveT: 0,
  });

  useEffect(() => {
    const cam = camera as THREE.PerspectiveCamera;
    cam.fov = fov;
    cam.near = 0.05;
    cam.updateProjectionMatrix();
  }, [camera, fov]);

  // регистрация в мировом реестре
  useEffect(() => {
    const p = world.player;
    p.alive = true;
    p.takeDamage = (dmg, from) => {
      const s = st.current;
      if (!p.alive) return;
      if (dmg < 0) {
        // лечение
        s.hp = Math.min(100, s.hp - dmg);
        useGame.getState().setHp(s.hp);
        return;
      }
      s.hp = Math.max(0, s.hp - dmg);
      const g = useGame.getState();
      g.setHp(s.hp);
      g.damaged();
      sfx.damage();
      if (s.hp <= 0) {
        p.alive = false;
        s.deadT = 3;
        g.addDeath(from);
        g.setPhase("dead");
        sfx.death();
        if (body.current) fx.burst(p.position, skin.primary, 24, 6, 0.14, 0.9);
      }
    };
    return () => {
      p.alive = false;
      p.body = null;
    };
  }, [skin.primary]);

  const respawn = () => {
    const rb = body.current;
    if (!rb) return;
    const s = st.current;
    const [x, y, z] = randomSpawn();
    rb.setTranslation({ x, y: y + 0.5, z }, true);
    rb.setLinvel({ x: 0, y: 0, z: 0 }, true);
    s.hp = 100;
    s.ammo = MAX_AMMO;
    s.reloadT = 0;
    world.player.alive = true;
    const g = useGame.getState();
    g.setHp(100);
    g.setAmmo(MAX_AMMO);
    g.setPhase("playing");
    sfx.respawn();
  };

  useEffect(() => {
    // первый спавн: смотрим в центр карты
    const rb = body.current;
    if (rb) {
      const t = rb.translation();
      st.current.yaw = Math.atan2(-t.x, -t.z);
    }
  }, []);

  useFrame((state, rawDt) => {
    const rb = body.current;
    if (!rb) return;
    const dt = Math.min(rawDt, 0.05);
    const s = st.current;
    const game = useGame.getState();
    const phase = game.phase;
    world.player.body = rb;

    const t = rb.translation();
    world.player.position.set(t.x, t.y, t.z);

    if (t.y > 16) {
      rb.setTranslation({ x: spawn[0], y: spawn[1] + 0.5, z: spawn[2] }, true);
      rb.setLinvel({ x: 0, y: 0, z: 0 }, true);
      s.vy = 0;
    }

    st.current.moveT -= dt;
    if (st.current.moveT <= 0) {
      st.current.moveT = 0.033;
      onMove?.(t.x, t.y - 0.65, t.z, s.yaw);
    }

    // мёртв — ждём респаун, камера чуть опускается
    if (phase === "dead") {
      s.deadT -= dt;
      if (s.deadT <= 0) respawn();
      camera.position.set(t.x, t.y + 0.2, t.z);
      consumeFrameInput();
      return;
    }

    const active = phase === "playing";
    const canLook = active;

    // — обзор —
    if (canLook) {
      const k = 0.0022 * sensitivity;
      s.yaw += input.yawDelta * k;
      s.pitch = THREE.MathUtils.clamp(s.pitch + input.pitchDelta * k, -1.45, 1.45);
    }

    // — земля —
    const ray = new rapier.Ray({ x: t.x, y: t.y, z: t.z }, { x: 0, y: -1, z: 0 });
    const hit = physics.castRay(ray, 0.8, true, undefined, undefined, undefined, rb);
    s.wasGrounded = s.grounded;
    s.grounded = !!hit && hit.timeOfImpact < 0.72;
    if (s.grounded) s.coyote = 0.12;
    else s.coyote -= dt;
    if (s.grounded && !s.wasGrounded && s.vy < -4) sfx.land();

    // — движение —
    const vel = rb.linvel();
    s.vy = vel.y;
    const [f, r] = active ? moveAxes() : [0, 0];
    _fwd.set(-Math.sin(s.yaw), 0, -Math.cos(s.yaw));
    _right.set(Math.cos(s.yaw), 0, -Math.sin(s.yaw));
    _dir.set(0, 0, 0).addScaledVector(_fwd, f).addScaledVector(_right, r);
    const speed = input.sprint ? SPRINT : SPEED;
    const control = s.grounded ? 1 : 0.25;
    const tx = _dir.x * speed;
    const tz = _dir.z * speed;
    const lerp = 1 - Math.exp(-dt * (s.grounded ? 14 : 3) * control * 2);
    const nx = vel.x + (tx - vel.x) * lerp;
    const nz = vel.z + (tz - vel.z) * lerp;
    let ny = vel.y;
    if (active && input.jumpPressed && s.coyote > 0) {
      ny = JUMP;
      s.coyote = 0;
      sfx.jump();
    }
    rb.setLinvel({ x: nx, y: ny, z: nz }, true);

    // шаги
    const hspeed = Math.hypot(nx, nz);
    if (s.grounded && hspeed > 2) {
      s.stepT -= dt * hspeed;
      if (s.stepT <= 0) {
        s.stepT = 2.6;
        sfx.step();
      }
      s.bob += dt * hspeed * 1.6;
    }

    // падение за карту
    if (t.y < -25) {
      world.player.takeDamage(1000, "Гравитация");
    }

    // — камера —
    const bobY = s.grounded ? Math.abs(Math.sin(s.bob)) * 0.045 * Math.min(1, hspeed / SPEED) : 0;
    camera.position.set(t.x, t.y + 0.6 + bobY, t.z);
    s.recoil = Math.max(0, s.recoil - dt * 8);
    _euler.set(s.pitch + s.recoil * 0.018, s.yaw, 0);
    camera.quaternion.setFromEuler(_euler);

    // — оружие —
    s.fireCd -= dt;
    if (s.reloadT > 0) {
      s.reloadT -= dt;
      if (s.reloadT <= 0) {
        s.ammo = MAX_AMMO;
        game.setAmmo(MAX_AMMO, false);
      }
    } else if (active) {
      if ((input.reload && s.ammo < MAX_AMMO) || (s.ammo === 0 && input.fire)) {
        s.reloadT = RELOAD_TIME;
        game.setAmmo(s.ammo, true);
        sfx.reload();
      } else if (input.fire && s.fireCd <= 0 && s.ammo > 0) {
        s.fireCd = FIRE_INTERVAL;
        s.ammo--;
        s.recoil = 1;
        game.setAmmo(s.ammo, false);
        sfx.shoot();

        // направление с небольшим разбросом
        camera.getWorldDirection(_dir);
        const spread = 0.008 + (hspeed > 1 ? 0.012 : 0) + (s.grounded ? 0 : 0.02);
        _dir.x += (Math.random() - 0.5) * spread;
        _dir.y += (Math.random() - 0.5) * spread;
        _dir.z += (Math.random() - 0.5) * spread;
        _dir.normalize();
        _origin.copy(camera.position);
        const shotRay = new rapier.Ray({ x: _origin.x, y: _origin.y, z: _origin.z }, { x: _dir.x, y: _dir.y, z: _dir.z });
        const res = physics.castRayAndGetNormal(shotRay, 200, true, undefined, undefined, undefined, rb);
        const dist = res ? res.timeOfImpact : 200;
        _hit.copy(_origin).addScaledVector(_dir, dist);

        // дуло
        _muzzle.set(0.28, -0.22, -0.7).applyQuaternion(camera.quaternion).add(camera.position);
        fx.tracer(_muzzle, _hit, skin.accent, 0.07);
        flash.current.scale.setScalar(0.18);

        let hitBot = false;
        if (res) {
          const parent = res.collider.parent();
          const tag = parent?.userData as BodyTag | undefined;
          if (tag?.type === "bot") {
            const bot = world.bots.get(tag.id);
            if (bot?.alive && bot.body) {
              const bt = bot.body.translation();
              const headshot = _hit.y > bt.y + 0.42;
              bot.takeDamage(headshot ? HEAD_DAMAGE : DAMAGE, _hit, headshot);
              hitBot = true;
              if (headshot) sfx.headshot();
              else sfx.hit();
            }
          } else {
            _normal.set(res.normal.x, res.normal.y, res.normal.z);
            fx.burst(_hit, "#fff4c2", 5, 3, 0.06, 0.4, _normal);
            sfx.impact(dist);
          }
        }
        game.addShot(hitBot);
      }
    }

    // viewmodel: позиция относительно камеры
    if (gun.current) {
      const sway = Math.sin(s.bob) * 0.01 * Math.min(1, hspeed / SPEED);
      const swayY = Math.abs(Math.cos(s.bob)) * 0.01 * Math.min(1, hspeed / SPEED);
      _tmp.set(0.26 + sway, -0.26 + swayY - (s.reloadT > 0 ? 0.18 : 0), -0.45 + s.recoil * 0.08).applyQuaternion(camera.quaternion);
      gun.current.position.copy(camera.position).add(_tmp);
      gun.current.quaternion.copy(camera.quaternion);
      gun.current.rotateX(-s.recoil * 0.12 + (s.reloadT > 0 ? -0.5 : 0));
      flash.current.scale.multiplyScalar(Math.max(0, 1 - dt * 25));
    }

    consumeFrameInput();
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
        ccd
        userData={{ type: "player" } satisfies BodyTag}
      >
        <CapsuleCollider args={[0.35, 0.3]} />
      </RigidBody>
      {/* Viewmodel — бластер */}
      <group ref={gun}>
        <mesh geometry={GEO.box} material={toon("#f1f5f9")} scale={[0.09, 0.12, 0.42]} />
        <mesh geometry={GEO.box} material={toon(skin.primary)} scale={[0.1, 0.06, 0.3]} position={[0, 0.07, -0.04]} />
        <mesh geometry={GEO.box} material={toon(skin.accent)} scale={[0.07, 0.16, 0.08]} position={[0, -0.13, 0.12]} rotation={[0.3, 0, 0]} />
        <mesh geometry={GEO.box} material={toon(skin.secondary)} scale={[0.12, 0.035, 0.25]} position={[0, 0.08, -0.08]} />
        <mesh geometry={GEO.box} material={toon(skin.accent)} scale={[0.09, 0.12, 0.1]} position={[0, -0.15, 0.12]} rotation={[0.25, 0, 0]} />
        <mesh geometry={GEO.cyl} material={toon("#cbd5e1")} scale={[0.035, 0.22, 0.035]} rotation={[Math.PI / 2, 0, 0]} position={[0, 0.02, -0.3]} />
        <mesh geometry={GEO.torus} material={basic(skin.accent)} scale={0.05} position={[0, 0.02, -0.38]} />
        <mesh ref={flash} geometry={GEO.sphereLow} material={basic("#fff7ae")} scale={0} position={[0, 0.02, -0.46]} />
      </group>
    </>
  );
}
