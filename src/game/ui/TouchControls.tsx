"use client";
import { useEffect, useRef, useState } from "react";
import { input } from "../input";

/** Экранный джойстик + зона обзора + кнопки — для телефонов / мини-приложений. */
export function TouchControls({ fire = true }: { fire?: boolean }) {
  const [show, setShow] = useState(false);
  const joyRef = useRef<HTMLDivElement>(null);
  const knobRef = useRef<HTMLDivElement>(null);
  const joyId = useRef<number | null>(null);
  const lookId = useRef<number | null>(null);
  const lookLast = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    input.touch = coarse;
    setShow(coarse);
  }, []);

  useEffect(() => {
    if (!show) return;
    const onMove = (e: PointerEvent) => {
      if (e.pointerId === joyId.current && joyRef.current && knobRef.current) {
        const r = joyRef.current.getBoundingClientRect();
        const cx = r.left + r.width / 2;
        const cy = r.top + r.height / 2;
        let dx = e.clientX - cx;
        let dy = e.clientY - cy;
        const max = r.width / 2;
        const len = Math.hypot(dx, dy);
        if (len > max) {
          dx = (dx / len) * max;
          dy = (dy / len) * max;
        }
        input.joyX = dx / max;
        input.joyY = dy / max;
        knobRef.current.style.transform = `translate(${dx}px, ${dy}px)`;
      } else if (e.pointerId === lookId.current) {
        input.yawDelta -= (e.clientX - lookLast.current.x) * 2.2;
        input.pitchDelta -= (e.clientY - lookLast.current.y) * 2.2;
        lookLast.current = { x: e.clientX, y: e.clientY };
      }
    };
    const onUp = (e: PointerEvent) => {
      if (e.pointerId === joyId.current) {
        joyId.current = null;
        input.joyX = input.joyY = 0;
        if (knobRef.current) knobRef.current.style.transform = "translate(0,0)";
      }
      if (e.pointerId === lookId.current) lookId.current = null;
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [show]);

  if (!show) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-30 select-none" style={{ touchAction: "none" }}>
      {/* зона обзора — правая половина */}
      <div
        className="pointer-events-auto absolute right-0 top-0 h-full w-1/2"
        onPointerDown={(e) => {
          if (lookId.current !== null) return;
          lookId.current = e.pointerId;
          lookLast.current = { x: e.clientX, y: e.clientY };
        }}
      />
      {/* джойстик */}
      <div
        ref={joyRef}
        className="pointer-events-auto absolute bottom-8 left-8 h-32 w-32 rounded-full border-4 border-white/70 bg-white/20 backdrop-blur"
        onPointerDown={(e) => {
          if (joyId.current !== null) return;
          joyId.current = e.pointerId;
        }}
      >
        <div ref={knobRef} className="absolute left-1/2 top-1/2 -ml-7 -mt-7 h-14 w-14 rounded-full bg-white/90 shadow-lg" />
      </div>
      {/* кнопки */}
      <div className="pointer-events-auto absolute bottom-8 right-6 flex flex-col items-end gap-3">
        {fire && (
          <button
            className="h-20 w-20 rounded-full border-4 border-white/80 bg-rose-400/90 text-2xl font-black text-white shadow-xl active:scale-95"
            onPointerDown={() => {
              input.fire = true;
              input.firePressed = true;
            }}
            onPointerUp={() => (input.fire = false)}
            onPointerLeave={() => (input.fire = false)}
          >
            🔥
          </button>
        )}
        <div className="flex gap-3">
          {fire && (
            <button
              className="h-14 w-14 rounded-full border-4 border-white/80 bg-sky-400/90 text-xl font-black text-white shadow-xl active:scale-95"
              onPointerDown={() => (input.reload = true)}
            >
              R
            </button>
          )}
          <button
            className="h-14 w-14 rounded-full border-4 border-white/80 bg-emerald-400/90 text-xl font-black text-white shadow-xl active:scale-95"
            onPointerDown={() => {
              input.jump = true;
              input.jumpPressed = true;
            }}
            onPointerUp={() => (input.jump = false)}
          >
            ⤒
          </button>
          <button
            className="h-14 w-14 rounded-full border-4 border-white/80 bg-amber-400/90 text-xl font-black text-white shadow-xl active:scale-95"
            onPointerDown={() => (input.interact = true)}
          >
            E
          </button>
        </div>
      </div>
    </div>
  );
}
