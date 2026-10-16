// Generation colours, modelled on the "ألوان الأجيال" legend used on
// traditional nasab posters. Index 0 is the first generation (tree root).

export interface GenerationColor {
  fill: string;
  text: string;
}

export const GENERATION_COLORS: GenerationColor[] = [
  { fill: "#e9843c", text: "#ffffff" },
  { fill: "#b7b7b2", text: "#2b2b2b" },
  { fill: "#2f9a62", text: "#ffffff" },
  { fill: "#3b8c86", text: "#ffffff" },
  { fill: "#ead44f", text: "#3a2f05" },
  { fill: "#e2a92a", text: "#3a2605" },
  { fill: "#c9a24c", text: "#2e2108" },
  { fill: "#a6d47f", text: "#1f3510" },
  { fill: "#f1e4b5", text: "#3b2f12" },
  { fill: "#9d6a3c", text: "#ffffff" },
  { fill: "#62b29f", text: "#0f2e27" },
  { fill: "#d6ab7f", text: "#3a240e" },
  { fill: "#c8553d", text: "#ffffff" },
  { fill: "#7d8fb3", text: "#ffffff" },
  { fill: "#8fbf4d", text: "#1f3510" },
  { fill: "#b07aa1", text: "#ffffff" },
];

export function generationColor(generation: number): GenerationColor {
  const n = GENERATION_COLORS.length;
  return GENERATION_COLORS[((generation % n) + n) % n];
}

const ORDINALS = [
  "الأول", "الثاني", "الثالث", "الرابع", "الخامس", "السادس",
  "السابع", "الثامن", "التاسع", "العاشر", "الحادي عشر", "الثاني عشر",
  "الثالث عشر", "الرابع عشر", "الخامس عشر", "السادس عشر", "السابع عشر",
  "الثامن عشر", "التاسع عشر", "العشرون",
];

export function generationLabel(generation: number, arabic: boolean): string {
  if (arabic) return `الجيل ${ORDINALS[generation] ?? generation + 1}`;
  return `Generation ${generation + 1}`;
}

export const LEAF_TONES = ["#2f6b2a", "#3f8434", "#4f9a3e", "#5f8f3a", "#6aa84f", "#356f3a"];
export const BARK = "#5b3a1d";
export const BARK_DARK = "#3e2711";
