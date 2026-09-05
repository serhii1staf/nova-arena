"use client";
import dynamic from "next/dynamic";

const ArenaScene = dynamic(() => import("@/game/scenes/ArenaScene"), {
  ssr: false,
  loading: () => (
    <div className="grid h-screen place-items-center bg-gradient-to-br from-sky-200 via-fuchsia-100 to-amber-100">
      <div className="text-center">
        <div className="mx-auto h-14 w-14 animate-spin rounded-full border-4 border-violet-300 border-t-violet-600" />
        <div className="mt-4 text-lg font-black text-slate-700">Загружаем арену…</div>
      </div>
    </div>
  ),
});

export default function ArenaPage() {
  return <ArenaScene />;
}
