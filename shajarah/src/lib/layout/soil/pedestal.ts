// Stepped pedestal: the trunk stands on a stack of steps, each a little
// wider than the one above, each carrying the next group of ancestors
// ("بن X بن Y …"), so the lineage widens downward into its foundation.

import { avoidWidow, clamp, fx, namesOf, rectPath, restAsText, wordsOf, wrapWords } from "./common";
import type { SoilContext, SoilShape, SoilStyleDef, SoilText } from "./types";

/** Lines of the inscription, the first (under the trunk) narrowest. */
function measure(ctx: SoilContext) {
  const fs = clamp(ctx.f * 0.9, ctx.floor, ctx.maxFont * 0.72);
  const stepH = fs * 2.0;
  const names = namesOf(ctx);
  const text = names.prose ?? restAsText(ctx, names, 0);
  const firstW = clamp(fs * 9, fs * 6, ctx.maxWidth);
  const widen = fs * 3.2;
  const widthOf = (k: number) => Math.min(ctx.maxWidth, firstW + k * widen);
  // wrap with a width that grows line by line
  const lines: string[] = [];
  let cur = "";
  for (const word of wordsOf(text)) {
    const next = cur ? `${cur} ${word}` : word;
    if (cur && ctx.textWidth(next, fs) > widthOf(lines.length) - fs * 2) {
      lines.push(cur);
      cur = word;
    } else cur = next;
  }
  if (cur) lines.push(cur);
  const balanced = avoidWidow(ctx, lines, widthOf(lines.length - 1) - fs * 2, fs);
  lines.splice(0, lines.length, ...balanced);
  // a single word wider than its step still gets a step of its own size
  const widths = lines.map((l, k) => Math.max(widthOf(k), ctx.textWidth(l, fs) + fs * 2));
  return { fs, stepH, lines: lines.length ? lines : wrapWords(ctx, text, ctx.maxWidth, fs), widths, height: lines.length * stepH + fs * 0.5 };
}

export const pedestal: SoilStyleDef = {
  id: "pedestal",
  label: "Stepped pedestal",
  description: "The trunk stands on steps widening downward, each carrying a group of ancestors.",
  height: (ctx) => measure(ctx).height,
  layout(p) {
    const m = measure(p);
    const G = p.groundY;
    const shapes: SoilShape[] = [];
    const texts: SoilText[] = [];
    m.lines.forEach((line, k) => {
      const w = m.widths[k];
      const y = G + k * m.stepH;
      shapes.push({ d: rectPath(p.cx - w / 2, y, w, m.stepH, m.fs * 0.12), fill: "ivory", stroke: "gold", strokeWidth: p.W * 0.0006, opacity: 0.55 });
      // a fine highlight along each step's top edge
      shapes.push({ d: `M${fx(p.cx - w / 2 + m.fs * 0.35)} ${fx(y + m.fs * 0.28)}H${fx(p.cx + w / 2 - m.fs * 0.35)}`, stroke: "goldLight", strokeWidth: p.W * 0.0005 });
      texts.push({ x: p.cx, y: y + m.stepH * 0.64, text: line, fontSize: m.fs, anchor: "middle", ink: "ink", font: "naskh", maxWidth: w - m.fs * 0.8 });
    });
    // a fine double rule under the widest step, in place of a heavy plinth
    const last = m.widths[m.widths.length - 1] ?? p.maxWidth;
    const yb = G + m.lines.length * m.stepH;
    shapes.push({ d: `M${fx(p.cx - last / 2 - m.fs * 0.3)} ${fx(yb + m.fs * 0.15)}H${fx(p.cx + last / 2 + m.fs * 0.3)}M${fx(p.cx - last / 2)} ${fx(yb + m.fs * 0.38)}H${fx(p.cx + last / 2)}`, stroke: "gold", strokeWidth: p.W * 0.0006 });
    const widest = Math.max(...m.widths, last + m.fs * 0.6);
    return {
      style: "pedestal",
      ground: null,
      roots: [],
      shapes,
      texts,
      fontSize: m.fs,
      box: { x: p.cx - widest / 2, y: G, w: widest, h: m.height },
      count: p.custom ? 0 : p.entries.length,
      custom: p.custom,
      trunkSpread: 0.12,
      trunkTaper: 0,
    };
  },
};
