// ISO-216 poster sizes. The layout judges legibility at the chosen size,
// and export prints at it.
//
// Beyond A0 the sizes keep doubling (2A0, 4A0, 8A0 …), with no limit that
// matters in the app: a family too large to be clear on one size simply
// takes the next. (Large prints are tiled onto sheets, or printed by a
// print shop; on screen and as SVG any size works.)

/** The largest multiple of A0 offered: 1024A0 is about 27 × 38 m. */
const MAX_A0_MULTIPLE = 1024;

const BASE = {
  A3: { w: 297, h: 420 },
  A2: { w: 420, h: 594 },
  A1: { w: 594, h: 841 },
  A0: { w: 841, h: 1189 },
} as const;

/** A3 … A0, or n·A0 for n = 2, 4, 8 … (each twice the area of the last). */
export type PaperSize = keyof typeof BASE | `${number}A0`;

/** n·A0 (n a power of two): each doubling doubles the short side, which
 *  becomes the long one, as ISO 216 does (2A0 is 1189 × 1682 mm, 4A0 1682 × 2378 mm). */
function multipleOfA0(n: number) {
  let { w, h } = BASE.A0 as { w: number; h: number };
  for (let k = 1; k < n; k *= 2) [w, h] = [h, w * 2];
  return { w, h };
}

export const PAPER_ORDER: PaperSize[] = [
  "A3", "A2", "A1", "A0",
  ...Array.from({ length: Math.log2(MAX_A0_MULTIPLE) }, (_, i): PaperSize => `${2 ** (i + 1)}A0`),
];

export const PAPER_SIZES: Record<PaperSize, { w: number; h: number }> = Object.fromEntries(
  PAPER_ORDER.map((p) => [p, p in BASE ? BASE[p as keyof typeof BASE] : multipleOfA0(Number.parseInt(p, 10))]),
) as Record<PaperSize, { w: number; h: number }>;

/** Whether a value (from a saved project, a URL) names one of the sizes. */
export function isPaperSize(value: unknown): value is PaperSize {
  return typeof value === "string" && (PAPER_ORDER as string[]).includes(value);
}

/** Sheets that tiled prints are split onto. */
export const SHEET_SIZES = { A4: { w: 210, h: 297 }, A3: { w: 297, h: 420 } } as const;
export type SheetSize = keyof typeof SHEET_SIZES;

/** The smallest paper at least `scale` times wider than `paper`, if any. */
export function paperForScale(paper: PaperSize, scale: number): PaperSize | null {
  const need = PAPER_SIZES[paper].w * scale;
  return PAPER_ORDER.find((p) => PAPER_SIZES[p].w >= need * 0.995) ?? null;
}
