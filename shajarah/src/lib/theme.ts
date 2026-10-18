import { PAPER_SIZES, type PaperSize } from "./paper";
import type { PosterSettings, PosterTheme, ThemePreset } from "./types";

const ORNAMENTS = { bismillah: true, verse: true, hadith: true, frame: true };

export const THEME_PRESETS: Record<ThemePreset, PosterTheme & { label: string }> = {
  refined: {
    label: "Refined ivory (recommended)",
    preset: "refined", colorBy: "gender",
    male: "#c9cbc7", female: "#dcbc6a", ancestor: "#b08a2e", branch: "#6e5538",
    background: "parchment", metallic: true, nodeRim: "#8d8f8a",
    nodeShape: "leaf", femaleCapsule: true, branchColors: true, labelMode: "name", showYears: false, trunkStyle: "badges", soilStyle: "column",
    foliage: false, bismillah: true, verse: false, hadith: false, frame: false,
  },
  luxe: {
    label: "Luxe (Canva gold-foil frame)",
    preset: "luxe", colorBy: "gender",
    male: "#c0c0c0", female: "#d4af37", ancestor: "#d4af37", branch: "#5b4128",
    background: "parchment", metallic: true, nodeRim: "#6f6f6f",
    nodeShape: "leaf", femaleCapsule: true, branchColors: false, labelMode: "name", showYears: false, trunkStyle: "badges", soilStyle: "banner",
    foliage: false, ...ORNAMENTS,
  },
  heritage: {
    label: "Heritage (ivory & gold)",
    preset: "heritage", colorBy: "gender",
    male: "#fbf3dc", female: "#d4af37", ancestor: "#d4af37", branch: "#4a2e1a",
    background: "parchment", metallic: true, nodeRim: "#b8892f",
    nodeShape: "circle", femaleCapsule: false, branchColors: false, labelMode: "name", showYears: false, trunkStyle: "badges", soilStyle: "banner",
    foliage: true, ...ORNAMENTS,
  },
  "silver-gold": {
    label: "Silver & Gold",
    preset: "silver-gold", colorBy: "gender",
    male: "#c0c0c0", female: "#d4af37", ancestor: "#d4af37", branch: "#4a2e1a",
    background: "parchment", metallic: true, nodeRim: "#6f6f6f",
    nodeShape: "oval", femaleCapsule: false, branchColors: false, labelMode: "name", showYears: false, trunkStyle: "badges", soilStyle: "column",
    foliage: true, ...ORNAMENTS,
  },
  classic: {
    label: "Classic botanical",
    preset: "classic", colorBy: "generation",
    male: "#3f8434", female: "#d9708a", ancestor: "#d4af37", branch: "#4a2e1a",
    background: "parchment", metallic: false, nodeRim: "#2f4a1a",
    nodeShape: "leaf", femaleCapsule: false, branchColors: false, labelMode: "name", showYears: false, trunkStyle: "carved", soilStyle: "paragraph",
    foliage: true, ...ORNAMENTS,
  },
  emerald: {
    label: "Parchment & Emerald",
    preset: "emerald", colorBy: "gender",
    male: "#1f7a4d", female: "#d4af37", ancestor: "#d4af37", branch: "#4a2e1a",
    background: "parchment", metallic: false, nodeRim: "#0f3d26",
    nodeShape: "leaf", femaleCapsule: false, branchColors: false, labelMode: "name", showYears: false, trunkStyle: "badges", soilStyle: "spine",
    foliage: true, ...ORNAMENTS,
  },
  mono: {
    label: "Minimal black & white",
    preset: "mono", colorBy: "gender",
    male: "#ffffff", female: "#e6e6e6", ancestor: "#111111", branch: "#1a1a1a",
    background: "white", metallic: false, nodeRim: "#111111",
    nodeShape: "circle", femaleCapsule: false, branchColors: false, labelMode: "name", showYears: false, trunkStyle: "badges", soilStyle: "paragraph",
    foliage: false, bismillah: true, verse: false, hadith: false, frame: false,
  },
};

/** Merges a tree's saved overrides onto its preset. */
export function resolveTheme(settings: PosterSettings | null | undefined): PosterTheme {
  const saved = settings?.theme ?? {};
  // Refined ivory (fine gold rule, satin leaves and capsules) is the default look.
  const preset = THEME_PRESETS[saved.preset ?? "refined"] ?? THEME_PRESETS.refined;
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

/**
 * Muted, print-friendly lineage colours, ordered so neighbours differ
 * strongly: forest green, burgundy, dusty blue, ochre, deep teal, plum.
 * All are dark enough to read as lines on ivory (≥ 3:1).
 */
export const LINEAGE_COLORS = ["#3d6b45", "#7b3542", "#46688f", "#8f6a1e", "#23696b", "#6a4a72"] as const;

export function lineageColor(i: number | null | undefined, fallback: string): string {
  return i == null ? fallback : LINEAGE_COLORS[i % LINEAGE_COLORS.length];
}

/** WCAG contrast ratio between two colours. */
export function contrast(a: string, b: string): number {
  const lum = (hex: string) => {
    const [r, g, bl] = rgb(hex).map((c) => {
      const s = c / 255;
      return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  };
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

/** A soft satin finish (highlight, body, shade): metal without the glare. */
export function satinStops(c: string): [string, string, string] {
  return [shade(c, 0.55), shade(c, 0.12), shade(c, -0.1)];
}

/** Layout options implied by a theme and poster size (shape, labels, legibility, header space). */
export function layoutOptionsFor(theme: PosterTheme, paper: PaperSize = "A2") {
  return {
    nodeShape: theme.nodeShape,
    labelMode: theme.labelMode,
    showYears: theme.showYears,
    branchScale: theme.background === "white" ? 0.35 : 1,
    foliage: theme.foliage,
    cornerMedallions: theme.verse || theme.hadith,
    framed: theme.frame,
    soilStyle: theme.soilStyle,
    femaleCapsule: theme.femaleCapsule,
    paperWidthMm: PAPER_SIZES[paper].w,
    // inside the frame the header starts below its top rosette
    // (room for basmala, title, subtitle and the divider under them)
    headerBand: theme.frame ? 0.19 : theme.verse || theme.hadith || theme.bismillah ? 0.13 : 0.105,
  };
}
