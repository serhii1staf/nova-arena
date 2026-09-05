"use client";
/**
 * Единый модуль ввода: клавиатура, мышь (pointer lock), тач-джойстик.
 * Никаких React-ререндеров — всё читается в useFrame напрямую.
 */
export const input = {
  forward: 0, // -1..1
  right: 0,
  jump: false,
  jumpPressed: false,
  fire: false,
  firePressed: false,
  reload: false,
  sprint: false,
  yawDelta: 0,
  pitchDelta: 0,
  locked: false,
  touch: false,
  interact: false,
  // тач-джойстик
  joyX: 0,
  joyY: 0,
  touchLookX: 0,
  touchLookY: 0,
  touchFire: false,
  touchJump: false,
};

const keys = new Set<string>();
let attached = 0;

function updateFromKeys() {
  let f = 0,
    r = 0;
  if (keys.has("KeyW") || keys.has("ArrowUp")) f += 1;
  if (keys.has("KeyS") || keys.has("ArrowDown")) f -= 1;
  if (keys.has("KeyD") || keys.has("ArrowRight")) r += 1;
  if (keys.has("KeyA") || keys.has("ArrowLeft")) r -= 1;
  input.forward = f;
  input.right = r;
  input.sprint = keys.has("ShiftLeft") || keys.has("ShiftRight");
}

function onKeyDown(e: KeyboardEvent) {
  if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
  if (e.code === "Space") {
    if (!keys.has("Space")) input.jumpPressed = true;
    input.jump = true;
    e.preventDefault();
  }
  if (e.code === "KeyR") input.reload = true;
  if (e.code === "KeyE" || e.code === "KeyF") input.interact = true;
  keys.add(e.code);
  updateFromKeys();
}
function onKeyUp(e: KeyboardEvent) {
  if (e.code === "Space") input.jump = false;
  keys.delete(e.code);
  updateFromKeys();
}
function onMouseMove(e: MouseEvent) {
  // pointer lock — основной режим; drag-look (зажатая ЛКМ по канвасу) — fallback для iframe/мини-приложений
  const dragging = !input.locked && (e.buttons & 1) === 1 && e.target instanceof HTMLCanvasElement;
  if (!input.locked && !dragging) return;
  input.yawDelta -= e.movementX;
  input.pitchDelta -= e.movementY;
}
function onMouseDown(e: MouseEvent) {
  if (e.button === 0 && (input.locked || e.target instanceof HTMLCanvasElement)) {
    input.fire = true;
    input.firePressed = true;
  }
}
function onMouseUp(e: MouseEvent) {
  if (e.button === 0) input.fire = false;
}
function onLockChange() {
  input.locked = !!document.pointerLockElement;
  if (!input.locked) {
    input.fire = false;
    keys.clear();
    updateFromKeys();
  }
}
function onBlur() {
  keys.clear();
  updateFromKeys();
  input.fire = false;
}

export function attachInput() {
  if (typeof window === "undefined") return () => {};
  if (attached++ === 0) {
    input.touch = window.matchMedia("(pointer: coarse)").matches;
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mouseup", onMouseUp);
    window.addEventListener("blur", onBlur);
    document.addEventListener("pointerlockchange", onLockChange);
  }
  return () => {
    if (--attached === 0) {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mouseup", onMouseUp);
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("pointerlockchange", onLockChange);
    }
  };
}

/** Вызывается в конце кадра: сбрасывает одноразовые события. */
export function consumeFrameInput() {
  input.yawDelta = 0;
  input.pitchDelta = 0;
  input.jumpPressed = false;
  input.firePressed = false;
  input.reload = false;
  input.interact = false;
}

/** Собранное направление движения с учётом джойстика. */
export function moveAxes(): [number, number] {
  let f = input.forward;
  let r = input.right;
  if (input.touch) {
    f += -input.joyY;
    r += input.joyX;
  }
  const len = Math.hypot(f, r);
  if (len > 1) {
    f /= len;
    r /= len;
  }
  return [f, r];
}

export function requestLock(el: HTMLElement) {
  if (input.touch) return;
  try {
    el.requestPointerLock?.();
  } catch {
    /* ignore */
  }
}

export function releaseLock() {
  if (typeof document !== "undefined" && document.pointerLockElement) document.exitPointerLock();
}
