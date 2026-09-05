export type HatType = "none" | "antenna" | "horns" | "halo" | "cap" | "crown" | "ears" | "fin";
export type Rarity = "common" | "rare" | "epic" | "legendary";

export interface SkinDef {
  id: string;
  name: string;
  rarity: Rarity;
  price: number;
  primary: string;
  secondary: string;
  accent: string;
  visor: string;
  hat: HatType;
}

/** Яркая мультяшная палитра — без тёмных цветов. */
export const SKINS: SkinDef[] = [
  { id: "nova", name: "Nova", rarity: "common", price: 0, primary: "#4fa8ff", secondary: "#ffffff", accent: "#ffd166", visor: "#1e3a8a", hat: "antenna" },
  { id: "ember", name: "Ember", rarity: "common", price: 0, primary: "#ff7a45", secondary: "#ffe08a", accent: "#ff4d6d", visor: "#7c2d12", hat: "horns" },
  { id: "mint", name: "Mint", rarity: "common", price: 0, primary: "#5ce1b0", secondary: "#e6fff7", accent: "#ffb703", visor: "#065f46", hat: "cap" },
  { id: "bubble", name: "Bubblegum", rarity: "rare", price: 300, primary: "#ff7ac6", secondary: "#ffe4f3", accent: "#8ecae6", visor: "#9d174d", hat: "ears" },
  { id: "frost", name: "Frost", rarity: "rare", price: 350, primary: "#7dd3fc", secondary: "#f0f9ff", accent: "#a78bfa", visor: "#0c4a6e", hat: "fin" },
  { id: "grape", name: "Grape", rarity: "epic", price: 600, primary: "#a06cff", secondary: "#f3e8ff", accent: "#facc15", visor: "#4c1d95", hat: "crown" },
  { id: "solar", name: "Solar", rarity: "epic", price: 700, primary: "#ffc93c", secondary: "#fff7d6", accent: "#ff6b6b", visor: "#92400e", hat: "halo" },
  { id: "lagoon", name: "Lagoon", rarity: "legendary", price: 1200, primary: "#2dd4bf", secondary: "#fef08a", accent: "#fb7185", visor: "#134e4a", hat: "crown" },
];

export const DEFAULT_OWNED = ["nova", "ember", "mint"];

export const SKIN_MAP: Record<string, SkinDef> = Object.fromEntries(SKINS.map((s) => [s.id, s]));

export function getSkin(id: string | undefined | null): SkinDef {
  return (id && SKIN_MAP[id]) || SKINS[0];
}

export const RARITY_COLOR: Record<Rarity, string> = {
  common: "#94a3b8",
  rare: "#38bdf8",
  epic: "#a78bfa",
  legendary: "#fbbf24",
};
