"use client";
import dynamic from "next/dynamic";

const LobbyScene = dynamic(() => import("@/game/scenes/LobbyScene"), {
  ssr: false,
  loading: () => (
    <div className="grid h-screen place-items-center bg-gradient-to-br from-violet-200 via-pink-100 to-sky-200">
      <div className="text-center">
        <div className="mx-auto h-14 w-14 animate-spin rounded-full border-4 border-violet-300 border-t-violet-600" />
        <div className="mt-4 text-lg font-black text-slate-700">Загружаем лобби…</div>
      </div>
    </div>
  ),
});

export default function LobbyPage() {
  return <LobbyScene />;
}
