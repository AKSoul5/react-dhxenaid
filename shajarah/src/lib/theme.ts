import type { PosterSettings, PosterTheme, ThemePreset } from "./types";

export const THEME_PRESETS: Record<ThemePreset, PosterTheme & { label: string }> = {
  classic: {
    label: "Classic botanical",
    preset: "classic", colorBy: "generation",
    male: "#3f8434", female: "#d9708a", ancestor: "#c9a24c", branch: "#5a391c",
    background: "parchment", metallic: false,
    nodeShape: "leaf", labelMode: "name", showYears: false, trunkStyle: "carved",
  },
  "silver-gold": {
    label: "Silver & Gold",
    preset: "silver-gold", colorBy: "gender",
    male: "#c0c0c0", female: "#d4af37", ancestor: "#9c7a2a", branch: "#4a3220",
    background: "parchment", metallic: true,
    nodeShape: "oval", labelMode: "name", showYears: false, trunkStyle: "badges",
  },
  emerald: {
    label: "Parchment & Emerald",
    preset: "emerald", colorBy: "gender",
    male: "#1f7a4d", female: "#b8892f", ancestor: "#6b4423", branch: "#4e3418",
    background: "parchment", metallic: false,
    nodeShape: "leaf", labelMode: "name", showYears: false, trunkStyle: "badges",
  },
  mono: {
    label: "Minimal black & white",
    preset: "mono", colorBy: "gender",
    male: "#ffffff", female: "#e6e6e6", ancestor: "#111111", branch: "#1a1a1a",
    background: "white", metallic: false,
    nodeShape: "circle", labelMode: "name", showYears: false, trunkStyle: "badges",
  },
};

/** Merges a tree's saved overrides onto its preset. */
export function resolveTheme(settings: PosterSettings | null | undefined): PosterTheme {
  const saved = settings?.theme ?? {};
  const preset = THEME_PRESETS[saved.preset ?? "classic"] ?? THEME_PRESETS.classic;
  const { label: _label, ...base } = preset;
  return { ...base, ...saved, preset: base.preset };
}

function rgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h.padEnd(6, "0");
  return [0, 2, 4].map((i) => Number.parseInt(full.slice(i, i + 2), 16) || 0) as [number, number, number];
}

/** Mixes a colour toward white (amount > 0) or black (amount < 0). */
export function shade(hex: string, amount: number): string {
  const target = amount > 0 ? 255 : 0;
  const k = Math.abs(amount);
  return `#${rgb(hex)
    .map((c) => Math.round(c + (target - c) * k).toString(16).padStart(2, "0"))
    .join("")}`;
}

/** Dark or light text, whichever reads better on the fill. */
export function textOn(hex: string): string {
  const [r, g, b] = rgb(hex).map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return lum > 0.4 ? "#1f1408" : "#ffffff";
}
