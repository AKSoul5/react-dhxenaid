// Inscribed panel: the lineage as running text in a gold-ruled panel below
// the trunk (the original foundation, unchanged).

import { clamp, gapBelowGround, groundArc, rectPath, rootsTo, runningFont, wrapWords } from "./common";
import type { SoilContext, SoilStyleDef } from "./types";

// The inner rule sits half a name's height inside the outer one, and the
// text keeps clear of it on every side, at any size. (The rule was once set
// in by a share of the page: a long lineage set small on a large poster ran
// its first line into it.)
const geometry = (fs: number) => {
  const inset = fs * 0.5;
  const padY = inset + fs * 0.55, padX = inset + fs;
  return { inset, padY, padX, lh: fs * 1.65, ascent: fs * 1.05, descent: fs * 0.45 };
};

const linesOf = (ctx: SoilContext) => {
  const fs = runningFont(ctx);
  const g = geometry(fs);
  return { fs, g, lines: wrapWords(ctx, ctx.text, ctx.maxWidth - 2 * g.padX, fs) };
};

const boxHeight = (n: number, g: ReturnType<typeof geometry>) => 2 * g.padY + g.ascent + Math.max(0, n - 1) * g.lh + g.descent;

export const paragraph: SoilStyleDef = {
  id: "paragraph",
  label: "Inscribed panel",
  description: "The lineage as running text in a gold-ruled panel.",
  height(ctx) {
    const { g, lines } = linesOf(ctx);
    return gapBelowGround(ctx) + boxHeight(lines.length, g);
  },
  layout(p) {
    const { fs, g, lines } = linesOf(p);
    const x0 = p.cx - p.maxWidth / 2;
    const top = p.groundY + gapBelowGround(p);
    const box = { x: x0, y: top, w: p.maxWidth, h: boxHeight(lines.length, g) };
    const inset = g.inset;
    const gw = clamp(p.trunkWidth * 1.4, p.maxWidth * 0.22, p.maxWidth * 0.32);
    return {
      style: "paragraph",
      ground: groundArc(p, gw),
      roots: rootsTo(p, top, gw),
      shapes: [
        { d: rectPath(box.x, box.y, box.w, box.h, p.W * 0.006), fill: "ivory", stroke: "line", strokeWidth: p.W * 0.0016, opacity: 0.9 },
        { d: rectPath(box.x + inset, box.y + inset, box.w - 2 * inset, box.h - 2 * inset, Math.min(p.W * 0.004, inset)), stroke: "line", strokeWidth: p.W * 0.0006 },
      ],
      texts: lines.map((text, k) => ({
        x: p.cx, y: top + g.padY + g.ascent + k * g.lh, text, fontSize: fs, anchor: "middle", ink: "ink", font: "naskh", maxWidth: p.maxWidth - 2 * g.padX,
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
