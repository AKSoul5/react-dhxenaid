import type { PosterSettings, PosterTheme, ThemePreset } from "./types";

const ORNAMENTS = { bismillah: true, verse: true, hadith: true };

export const THEME_PRESETS: Record<ThemePreset, PosterTheme & { label: string }> = {
  heritage: {
    label: "Heritage (ivory & gold)",
    preset: "heritage", colorBy: "gender",
    male: "#fbf3dc", female: "#d4af37", ancestor: "#d4af37", branch: "#4a2e1a",
    background: "parchment", metallic: true, nodeRim: "#b8892f",
    nodeShape: "circle", labelMode: "name", showYears: false, trunkStyle: "badges",
    foliage: true, ...ORNAMENTS,
  },
  "silver-gold": {
    label: "Silver & Gold",
    preset: "silver-gold", colorBy: "gender",
    male: "#c0c0c0", female: "#d4af37", ancestor: "#d4af37", branch: "#4a2e1a",
    background: "parchment", metallic: true, nodeRim: "#6f6f6f",
    nodeShape: "oval", labelMode: "name", showYears: false, trunkStyle: "badges",
    foliage: true, ...ORNAMENTS,
  },
  classic: {
    label: "Classic botanical",
    preset: "classic", colorBy: "generation",
    male: "#3f8434", female: "#d9708a", ancestor: "#d4af37", branch: "#4a2e1a",
    background: "parchment", metallic: false, nodeRim: "#2f4a1a",
    nodeShape: "leaf", labelMode: "name", showYears: false, trunkStyle: "carved",
    foliage: true, ...ORNAMENTS,
  },
  emerald: {
    label: "Parchment & Emerald",
    preset: "emerald", colorBy: "gender",
    male: "#1f7a4d", female: "#d4af37", ancestor: "#d4af37", branch: "#4a2e1a",
    background: "parchment", metallic: false, nodeRim: "#0f3d26",
    nodeShape: "leaf", labelMode: "name", showYears: false, trunkStyle: "badges",
    foliage: true, ...ORNAMENTS,
  },
  mono: {
    label: "Minimal black & white",
    preset: "mono", colorBy: "gender",
    male: "#ffffff", female: "#e6e6e6", ancestor: "#111111", branch: "#1a1a1a",
    background: "white", metallic: false, nodeRim: "#111111",
    nodeShape: "circle", labelMode: "name", showYears: false, trunkStyle: "badges",
    foliage: false, bismillah: true, verse: false, hadith: false,
  },
};

/** Merges a tree's saved overrides onto its preset. */
export function resolveTheme(settings: PosterSettings | null | undefined): PosterTheme {
  const saved = settings?.theme ?? {};
  // Heritage (ivory roundels, gold medallions, green foliage) is the default look.
  const preset = THEME_PRESETS[saved.preset ?? "heritage"] ?? THEME_PRESETS.heritage;
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

/** The default bark colour; it maps to a hand-tuned walnut gradient. */
export const BARK_DEFAULT = "#4a2e1a";

/** Three bark gradient stops (shadow, lit, deep shadow). */
export function barkStops(c: string): [string, string, string] {
  if (c.toLowerCase() === BARK_DEFAULT) return ["#3B2314", "#6E472A", "#24140B"];
  return [shade(c, -0.2), shade(c, 0.3), shade(c, -0.5)];
}

/** Metallic gradient stops (highlight, body, shadow) for a node colour. */
export function metalStops(c: string): [string, string, string] {
  const k = c.toLowerCase();
  if (k === "#c0c0c0") return ["#E8E8E8", "#C0C0C0", "#999999"]; // silver
  if (k === "#d4af37") return ["#FFE57F", "#D4AF37", "#AA7C11"]; // gold
  return [shade(c, 0.55), c, shade(c, -0.25)];
}

/** Layout options implied by a theme (shape, labels, foliage, header space). */
export function layoutOptionsFor(theme: PosterTheme) {
  return {
    nodeShape: theme.nodeShape,
    labelMode: theme.labelMode,
    showYears: theme.showYears,
    branchScale: theme.background === "white" ? 0.35 : 1,
    foliage: theme.foliage,
    cornerMedallions: theme.verse || theme.hadith,
    headerBand: theme.bismillah || theme.verse || theme.hadith ? 0.125 : 0.095,
  };
}
