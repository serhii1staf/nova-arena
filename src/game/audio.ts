"use client";
/**
 * Процедурный звук на Web Audio API — 0 байт ассетов, мгновенная загрузка,
 * никакого блокирования потока. Все звуки синтезируются на лету.
 */
let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let musicGain: GainNode | null = null;
let musicStop: (() => void) | null = null;
let noiseBuffer: AudioBuffer | null = null;
let volume = 0.7;

function ensure() {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = volume;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -12;
    master.connect(comp).connect(ctx.destination);
    musicGain = ctx.createGain();
    musicGain.gain.value = 0.35;
    musicGain.connect(master);
    const len = ctx.sampleRate * 1;
    noiseBuffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = noiseBuffer.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  }
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
  return ctx;
}

export function unlockAudio() {
  ensure();
}

export function setVolume(v: number) {
  volume = v;
  if (master && ctx) master.gain.setTargetAtTime(v, ctx.currentTime, 0.05);
}

function env(g: GainNode, t: number, a: number, peak: number, d: number) {
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + a);
  g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
}

function noise(t: number, dur: number, peak: number, filterHz: number, type: BiquadFilterType = "bandpass", q = 1) {
  const c = ensure();
  if (!c || !noiseBuffer || !master) return;
  const src = c.createBufferSource();
  src.buffer = noiseBuffer;
  const f = c.createBiquadFilter();
  f.type = type;
  f.frequency.value = filterHz;
  f.Q.value = q;
  const g = c.createGain();
  env(g, t, 0.005, peak, dur);
  src.connect(f).connect(g).connect(master);
  src.start(t);
  src.stop(t + dur + 0.05);
}

function tone(t: number, type: OscillatorType, f0: number, f1: number, dur: number, peak: number, a = 0.005) {
  const c = ensure();
  if (!c || !master) return;
  const o = c.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(f0, t);
  o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
  const g = c.createGain();
  env(g, t, a, peak, dur);
  o.connect(g).connect(master);
  o.start(t);
  o.stop(t + dur + a + 0.05);
}

/** Пространственная громкость по расстоянию. */
const dist = (d = 0) => 1 / (1 + d * d * 0.02);

export const sfx = {
  shoot(d = 0) {
    const c = ensure();
    if (!c) return;
    const t = c.currentTime;
    const v = dist(d);
    tone(t, "sawtooth", 900, 140, 0.12, 0.35 * v);
    tone(t, "square", 1800, 300, 0.06, 0.12 * v);
    noise(t, 0.08, 0.25 * v, 2500, "highpass");
  },
  botShoot(d = 0) {
    const c = ensure();
    if (!c) return;
    const t = c.currentTime;
    const v = dist(d);
    tone(t, "triangle", 600, 120, 0.14, 0.25 * v);
    noise(t, 0.06, 0.15 * v, 1800, "bandpass");
  },
  hit() {
    const c = ensure();
    if (!c) return;
    const t = c.currentTime;
    tone(t, "square", 1200, 1600, 0.05, 0.18);
    tone(t + 0.03, "square", 1600, 2000, 0.04, 0.12);
  },
  headshot() {
    const c = ensure();
    if (!c) return;
    const t = c.currentTime;
    tone(t, "square", 1000, 2200, 0.08, 0.2);
    tone(t + 0.06, "triangle", 1500, 2600, 0.12, 0.2);
  },
  impact(d = 0) {
    const c = ensure();
    if (!c) return;
    noise(c.currentTime, 0.08, 0.2 * dist(d), 900, "lowpass");
  },
  damage() {
    const c = ensure();
    if (!c) return;
    const t = c.currentTime;
    tone(t, "sine", 220, 80, 0.25, 0.4);
    noise(t, 0.15, 0.25, 400, "lowpass");
  },
  jump() {
    const c = ensure();
    if (!c) return;
    tone(c.currentTime, "sine", 300, 700, 0.15, 0.15);
  },
  land() {
    const c = ensure();
    if (!c) return;
    noise(c.currentTime, 0.1, 0.18, 300, "lowpass");
  },
  step() {
    const c = ensure();
    if (!c) return;
    noise(c.currentTime, 0.05, 0.06, 500 + Math.random() * 300, "bandpass", 2);
  },
  reload() {
    const c = ensure();
    if (!c) return;
    const t = c.currentTime;
    noise(t, 0.05, 0.2, 2200, "bandpass", 4);
    noise(t + 0.35, 0.05, 0.2, 1500, "bandpass", 4);
    tone(t + 0.7, "square", 900, 1300, 0.06, 0.15);
  },
  kill() {
    const c = ensure();
    if (!c) return;
    const t = c.currentTime;
    [523, 659, 784, 1047].forEach((f, i) => tone(t + i * 0.06, "triangle", f, f, 0.15, 0.2));
  },
  explode(d = 0) {
    const c = ensure();
    if (!c) return;
    const t = c.currentTime;
    const v = dist(d);
    noise(t, 0.4, 0.5 * v, 400, "lowpass");
    tone(t, "sine", 150, 40, 0.4, 0.4 * v);
  },
  death() {
    const c = ensure();
    if (!c) return;
    const t = c.currentTime;
    tone(t, "sawtooth", 400, 60, 0.7, 0.3, 0.02);
    noise(t, 0.5, 0.3, 300, "lowpass");
  },
  respawn() {
    const c = ensure();
    if (!c) return;
    const t = c.currentTime;
    [392, 523, 659, 784].forEach((f, i) => tone(t + i * 0.08, "sine", f, f * 1.01, 0.25, 0.18));
  },
  pickup() {
    const c = ensure();
    if (!c) return;
    const t = c.currentTime;
    tone(t, "sine", 880, 1320, 0.12, 0.2);
    tone(t + 0.1, "sine", 1320, 1760, 0.15, 0.2);
  },
  portal() {
    const c = ensure();
    if (!c) return;
    const t = c.currentTime;
    tone(t, "sine", 200, 1600, 0.8, 0.3, 0.05);
    noise(t, 0.6, 0.2, 3000, "highpass");
  },
  ui() {
    const c = ensure();
    if (!c) return;
    tone(c.currentTime, "sine", 700, 900, 0.06, 0.12);
  },
  countdown(final = false) {
    const c = ensure();
    if (!c) return;
    tone(c.currentTime, "square", final ? 880 : 440, final ? 880 : 440, final ? 0.4 : 0.12, 0.15);
  },
};

/**
 * Фоновая музыка: генеративный «космический» пэд (lobby) или пульсирующий бит (arena).
 * Генерируется осцилляторами — без файлов, крайне дёшево для CPU.
 */
export function startMusic(kind: "lobby" | "arena") {
  const c = ensure();
  if (!c || !musicGain) return;
  stopMusic();
  const nodes: AudioNode[] = [];
  const timers: number[] = [];
  const g = musicGain;

  if (kind === "lobby") {
    const chords = [
      [261.6, 329.6, 392.0, 523.3],
      [220.0, 277.2, 329.6, 440.0],
      [174.6, 220.0, 261.6, 349.2],
      [196.0, 246.9, 293.7, 392.0],
    ];
    const oscs: OscillatorNode[] = [];
    const gains: GainNode[] = [];
    for (let i = 0; i < 4; i++) {
      const o = c.createOscillator();
      o.type = i % 2 ? "triangle" : "sine";
      const og = c.createGain();
      og.gain.value = 0.06;
      const f = c.createBiquadFilter();
      f.type = "lowpass";
      f.frequency.value = 1200;
      o.connect(og).connect(f).connect(g);
      o.start();
      oscs.push(o);
      gains.push(og);
      nodes.push(o, og, f);
    }
    const lfo = c.createOscillator();
    lfo.frequency.value = 0.15;
    const lg = c.createGain();
    lg.gain.value = 3;
    lfo.connect(lg);
    oscs.forEach((o) => lg.connect(o.detune));
    lfo.start();
    nodes.push(lfo, lg);
    let step = 0;
    const play = () => {
      const ch = chords[step % chords.length];
      const t = c.currentTime;
      oscs.forEach((o, i) => o.frequency.setTargetAtTime(ch[i], t, 0.4));
      // арпеджио сверху
      ch.forEach((f, i) => tone(t + 0.5 + i * 0.5, "sine", f * 2, f * 2, 0.5, 0.03, 0.05));
      step++;
    };
    play();
    timers.push(window.setInterval(play, 4000));
  } else {
    const bass = [110, 110, 130.8, 98];
    let step = 0;
    const beat = () => {
      const t = c.currentTime;
      const b = bass[Math.floor(step / 8) % bass.length];
      if (step % 2 === 0) {
        // кик
        const o = c.createOscillator();
        o.frequency.setValueAtTime(150, t);
        o.frequency.exponentialRampToValueAtTime(40, t + 0.15);
        const kg = c.createGain();
        env(kg, t, 0.005, 0.5, 0.2);
        o.connect(kg).connect(g);
        o.start(t);
        o.stop(t + 0.3);
      }
      if (step % 4 === 2) noise(t, 0.12, 0.12, 6000, "highpass");
      if (step % 8 === 4) noise(t, 0.18, 0.2, 1800, "bandpass", 0.7);
      // бас
      const bo = c.createOscillator();
      bo.type = "sawtooth";
      bo.frequency.value = step % 4 === 3 ? b * 1.5 : b;
      const bf = c.createBiquadFilter();
      bf.type = "lowpass";
      bf.frequency.setValueAtTime(900, t);
      bf.frequency.exponentialRampToValueAtTime(200, t + 0.2);
      const bg = c.createGain();
      env(bg, t, 0.01, 0.12, 0.22);
      bo.connect(bf).connect(bg).connect(g);
      bo.start(t);
      bo.stop(t + 0.3);
      // мелодия
      if (step % 16 >= 8 && step % 2 === 1) {
        const m = [523, 587, 659, 784, 659, 587, 523, 440][(step >> 1) % 8];
        tone(t, "square", m, m, 0.15, 0.04, 0.01);
      }
      step++;
    };
    beat();
    timers.push(window.setInterval(beat, 250));
  }

  musicStop = () => {
    timers.forEach((id) => clearInterval(id));
    nodes.forEach((n) => {
      try {
        if (n instanceof OscillatorNode) n.stop();
        n.disconnect();
      } catch {
        /* ignore */
      }
    });
  };
}

export function stopMusic() {
  musicStop?.();
  musicStop = null;
}

export function setMusicEnabled(on: boolean) {
  if (musicGain && ctx) musicGain.gain.setTargetAtTime(on ? 0.35 : 0, ctx.currentTime, 0.1);
}
