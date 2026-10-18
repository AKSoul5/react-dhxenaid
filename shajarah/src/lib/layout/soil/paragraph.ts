// Inscribed panel: the lineage as running text in a gold-ruled panel below
// the trunk (the original foundation, unchanged).

import { clamp, gapBelowGround, groundArc, rectPath, rootsTo, runningFont, wrapWords } from "./common";
import type { SoilContext, SoilStyleDef } from "./types";

const linesOf = (ctx: SoilContext) => {
  const fs = runningFont(ctx);
  return { fs, lines: wrapWords(ctx, ctx.text, ctx.maxWidth - fs * 3, fs) };
};

export const paragraph: SoilStyleDef = {
  id: "paragraph",
  label: "Inscribed panel",
  description: "The lineage as running text in a gold-ruled panel.",
  height(ctx) {
    const { fs, lines } = linesOf(ctx);
    return gapBelowGround(ctx) + lines.length * fs * 1.65 + fs * 1.5;
  },
  layout(p) {
    const { fs, lines } = linesOf(p);
    const lh = fs * 1.65;
    const x0 = p.cx - p.maxWidth / 2;
    const top = p.groundY + gapBelowGround(p);
    const box = { x: x0, y: top, w: p.maxWidth, h: lines.length * lh + fs * 1.5 };
    const inset = p.W * 0.005;
    const gw = clamp(p.trunkWidth * 1.4, p.maxWidth * 0.22, p.maxWidth * 0.32);
    return {
      style: "paragraph",
      ground: groundArc(p, gw),
      roots: rootsTo(p, top, gw),
      shapes: [
        { d: rectPath(box.x, box.y, box.w, box.h, p.W * 0.006), fill: "ivory", stroke: "line", strokeWidth: p.W * 0.0016, opacity: 0.9 },
        { d: rectPath(box.x + inset, box.y + inset, box.w - 2 * inset, box.h - 2 * inset, p.W * 0.004), stroke: "line", strokeWidth: p.W * 0.0006 },
      ],
      texts: lines.map((text, k) => ({
        x: p.cx, y: top + fs * 1.55 + k * lh, text, fontSize: fs, anchor: "middle", ink: "ink", font: "naskh",
      })),
      fontSize: fs,
      box,
      count: p.custom ? 0 : p.entries.length,
      custom: p.custom,
      trunkSpread: 0.55,
      trunkTaper: 0,
    };
  },
};
