"use client";
import { useProfile, type Quality } from "../store";
import { setVolume, setMusicEnabled, sfx } from "../audio";

export function SettingsPanel({ onClose }: { onClose: () => void }) {
  const settings = useProfile((s) => s.settings);
  const setSettings = useProfile((s) => s.setSettings);

  return (
    <div className="w-[22rem] rounded-3xl bg-white/95 p-7 shadow-2xl">
      <h2 className="text-2xl font-black text-slate-800">Настройки</h2>

      <label className="mt-4 block text-xs font-bold uppercase tracking-wider text-slate-500">Качество графики</label>
      <div className="mt-1 grid grid-cols-3 gap-1 rounded-xl bg-slate-100 p-1">
        {(["low", "medium", "high"] as Quality[]).map((q) => (
          <button
            key={q}
            onClick={() => {
              sfx.ui();
              setSettings({ quality: q });
            }}
            className={`rounded-lg py-2 text-sm font-bold transition ${settings.quality === q ? "bg-violet-500 text-white shadow" : "text-slate-600 hover:bg-white"}`}
          >
            {q === "low" ? "Низкое" : q === "medium" ? "Среднее" : "Высокое"}
          </button>
        ))}
      </div>
      <p className="mt-1 text-[11px] text-slate-400">Низкое — для слабых устройств: без теней, меньше ботов и частиц.</p>

      <label className="mt-4 block text-xs font-bold uppercase tracking-wider text-slate-500">
        Чувствительность мыши — {settings.sensitivity.toFixed(2)}
      </label>
      <input type="range" min={0.2} max={3} step={0.05} value={settings.sensitivity} onChange={(e) => setSettings({ sensitivity: +e.target.value })} className="mt-1 w-full accent-violet-500" />

      <label className="mt-3 block text-xs font-bold uppercase tracking-wider text-slate-500">Поле зрения — {settings.fov}°</label>
      <input type="range" min={60} max={110} step={1} value={settings.fov} onChange={(e) => setSettings({ fov: +e.target.value })} className="mt-1 w-full accent-violet-500" />

      <label className="mt-3 block text-xs font-bold uppercase tracking-wider text-slate-500">Громкость — {Math.round(settings.volume * 100)}%</label>
      <input
        type="range"
        min={0}
        max={1}
        step={0.01}
        value={settings.volume}
        onChange={(e) => {
          setSettings({ volume: +e.target.value });
          setVolume(+e.target.value);
        }}
        className="mt-1 w-full accent-violet-500"
      />

      <div className="mt-3 flex items-center justify-between">
        <span className="text-sm font-semibold text-slate-700">Музыка</span>
        <button
          onClick={() => {
            setSettings({ music: !settings.music });
            setMusicEnabled(!settings.music);
          }}
          className={`h-7 w-12 rounded-full p-0.5 transition ${settings.music ? "bg-emerald-400" : "bg-slate-300"}`}
        >
          <span className={`block h-6 w-6 rounded-full bg-white shadow transition ${settings.music ? "translate-x-5" : ""}`} />
        </button>
      </div>
      <div className="mt-2 flex items-center justify-between">
        <span className="text-sm font-semibold text-slate-700">Показывать FPS</span>
        <button onClick={() => setSettings({ showFps: !settings.showFps })} className={`h-7 w-12 rounded-full p-0.5 transition ${settings.showFps ? "bg-emerald-400" : "bg-slate-300"}`}>
          <span className={`block h-6 w-6 rounded-full bg-white shadow transition ${settings.showFps ? "translate-x-5" : ""}`} />
        </button>
      </div>

      <button onClick={onClose} className="mt-6 w-full rounded-2xl bg-slate-800 py-3 font-bold text-white hover:bg-slate-700">
        Готово
      </button>
    </div>
  );
}
