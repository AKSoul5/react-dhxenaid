// ISO-216 poster sizes. The layout judges legibility at the chosen size,
// and export prints at it.

export const PAPER_SIZES = {
  A3: { w: 297, h: 420 },
  A2: { w: 420, h: 594 },
  A1: { w: 594, h: 841 },
  A0: { w: 841, h: 1189 },
  /** 2A0: for very large families; printed as tiles or by a print shop. */
  "2A0": { w: 1189, h: 1682 },
} as const;
export type PaperSize = keyof typeof PAPER_SIZES;
export const PAPER_ORDER: PaperSize[] = ["A3", "A2", "A1", "A0", "2A0"];

/** Sheets that tiled prints are split onto. */
export const SHEET_SIZES = { A4: { w: 210, h: 297 }, A3: { w: 297, h: 420 } } as const;
export type SheetSize = keyof typeof SHEET_SIZES;

/** The smallest paper at least `scale` times wider than `paper`, if any. */
export function paperForScale(paper: PaperSize, scale: number): PaperSize | null {
  const need = PAPER_SIZES[paper].w * scale;
  return PAPER_ORDER.find((p) => PAPER_SIZES[p].w >= need * 0.995) ?? null;
}
