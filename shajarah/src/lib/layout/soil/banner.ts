// Illuminated banner: a manuscript panel below the trunk, with a fine
// double gold rule, a border of small lozenges between the rules, a
// head- and tailpiece, and the ancestors stacked with ornamental separators
// between them. A long lineage is set in columns (read right to left in
// Arabic), as manuscripts do; every name stays in the panel.

import {
  clamp, dot, fx, gapBelowGround, lozenge, namesOf, rectPath, rootsTo, runningFont, separatorMark,
  smallestName, wrapWords,
} from "./common";
import type { SoilContext, SoilShape, SoilStyleDef, SoilText } from "./types";

const BANNER_SHARE = 0.3;

function measure(ctx: SoilContext) {
  const { entries, prose } = namesOf(ctx);
  const fs = clamp(ctx.f * 0.9, ctx.floor, ctx.maxFont * 0.7);
  const pad = fs * 1.4; // between the inner rule and the names
  const rule = fs * 0.55; // between the two rules (the lozenge border)
  const head = fs * 1.5; // head- and tailpiece
  if (prose || !entries.length) {
    // a custom inscription that is not a nasab: set as text in the panel
    const tfs = runningFont(ctx);
    const width = ctx.maxWidth * 0.72;
    const lines = wrapWords(ctx, prose ?? ctx.text, width - 2 * (pad + rule), tfs);
    const inner = head * 2 + lines.length * tfs * 1.65;
    return { kind: "prose" as const, fs: tfs, pad, rule, head, lines, width, cols: 0, rows: 0, colW: 0, gutter: 0, entries,
      panelH: inner + 2 * (pad + rule), height: gapBelowGround(ctx) + inner + 2 * (pad + rule) };
  }
  const nameStep = fs * 1.25; // a name
  const sepStep = fs * 0.85; // and the ornament under it
  const colW = Math.max(fs * 7, ...entries.map((e) => ctx.textWidth(e.label, fs))) + fs * 1.4;
  const gutter = fs * 1.2;
  const frame = 2 * (pad + rule);
  const maxCols = Math.max(1, Math.floor((ctx.maxWidth - frame + gutter) / (colW + gutter)));
  const panelFor = (cols: number) => {
    const rows = Math.ceil(entries.length / cols);
    return { rows, h: frame + head * 2 + rows * nameStep + (rows - 1) * sepStep };
  };
  let cols = 1;
  while (cols < maxCols && gapBelowGround(ctx) + panelFor(cols).h > ctx.avail * BANNER_SHARE) cols++;
  const { rows, h } = panelFor(cols);
  return {
    kind: "names" as const, fs, pad, rule, head, lines: [] as string[], cols, rows, colW, gutter, entries, nameStep, sepStep,
    width: cols * colW + (cols - 1) * gutter + frame, panelH: h, height: gapBelowGround(ctx) + h,
  };
}

export const banner: SoilStyleDef = {
  id: "banner",
  label: "Illuminated banner",
  description: "A manuscript panel with a double gold rule; the ancestors stacked between ornaments.",
  height: (ctx) => measure(ctx).height,
  layout(p) {
    const m = measure(p);
    const G = p.groundY;
    const top = G + gapBelowGround(p);
    const x = p.cx - m.width / 2;
    const { fs, pad, rule, head } = m;
    const shapes: SoilShape[] = [];
    const texts: SoilText[] = [];

    // the panel: outer and inner gold rules, lozenges between them, corner and edge ornaments
    shapes.push({ d: rectPath(x, top, m.width, m.panelH, fs * 0.25), fill: "ivory", stroke: "gold", strokeWidth: p.W * 0.0016, opacity: 0.96 });
    shapes.push({ d: rectPath(x + rule, top + rule, m.width - 2 * rule, m.panelH - 2 * rule, fs * 0.15), stroke: "gold", strokeWidth: p.W * 0.0006 });
    const border: string[] = [];
    const mid = rule / 2;
    const along = (x0: number, y0: number, x1: number, y1: number) => {
      const L = Math.hypot(x1 - x0, y1 - y0);
      const n = Math.max(1, Math.round(L / (fs * 1.1)));
      for (let i = 1; i < n; i++) border.push(lozenge(x0 + ((x1 - x0) * i) / n, y0 + ((y1 - y0) * i) / n, fs * 0.09, fs * 0.09));
    };
    along(x + mid, top + mid, x + m.width - mid, top + mid);
    along(x + mid, top + m.panelH - mid, x + m.width - mid, top + m.panelH - mid);
    along(x + mid, top + mid, x + mid, top + m.panelH - mid);
    along(x + m.width - mid, top + mid, x + m.width - mid, top + m.panelH - mid);
    for (const [cx, cy] of [[x + mid, top + mid], [x + m.width - mid, top + mid], [x + mid, top + m.panelH - mid], [x + m.width - mid, top + m.panelH - mid]]) {
      border.push(lozenge(cx, cy, fs * 0.28, fs * 0.28), dot(cx, cy, fs * 0.08));
    }
    shapes.push({ d: border.join(""), fill: "gold", opacity: 0.85 });
    // head- and tailpiece
    const innerTop = top + rule + pad;
    const innerBottom = top + m.panelH - rule - pad;
    shapes.push({ d: separatorMark(p.cx, innerTop + head * 0.35, fs * 1.5), fill: "gold" });
    shapes.push({ d: separatorMark(p.cx, innerBottom - head * 0.35, fs * 1.5), fill: "gold" });

    if (m.kind === "prose") {
      m.lines.forEach((line, k) => {
        texts.push({ x: p.cx, y: innerTop + head + fs * 1.15 + k * fs * 1.65, text: line, fontSize: fs, anchor: "middle", ink: "ink", font: "naskh" });
      });
    } else {
      // columns in reading order (right to left in Arabic), each read top to bottom
      const colX = (c: number) => {
        const left = x + rule + pad + m.colW / 2 + c * (m.colW + m.gutter);
        return p.rtl ? x + m.width - (left - x) : left;
      };
      const seps: string[] = [];
      m.entries.forEach((e, i) => {
        const c = Math.floor(i / m.rows), r = i % m.rows;
        const yName = innerTop + head + r * (m.nameStep! + m.sepStep!) + fs * 0.95;
        texts.push({ x: colX(c), y: yName, text: e.label, fontSize: fs, anchor: "middle", ink: "ink", font: "naskh", weight: 700, memberId: e.id });
        const isLast = r === m.rows - 1 || i === m.entries.length - 1;
        if (!isLast) seps.push(separatorMark(colX(c), yName + fs * 0.3 + m.sepStep! * 0.5, fs * 0.75));
      });
      shapes.push({ d: seps.join(""), fill: "gold", opacity: 0.9 });
      // fine rules between the columns
      for (let c = 1; c < m.cols; c++) {
        const between = (colX(c - 1) + colX(c)) / 2;
        shapes.push({ d: `M${fx(between)} ${fx(innerTop + head * 0.8)}V${fx(innerBottom - head * 0.8)}`, stroke: "gold", strokeWidth: p.W * 0.0005 });
      }
    }
    // the trunk stands on the panel's head, with a few fine roots onto its top rule
    return {
      style: "banner",
      ground: null,
      roots: rootsTo(p, top, p.trunkWidth * 0.5, 2, 0.6),
      shapes,
      texts,
      fontSize: smallestName(texts, fs),
      box: { x, y: top, w: m.width, h: m.panelH },
      count: p.custom ? 0 : p.entries.length,
      custom: p.custom,
      trunkSpread: 0.3,
      trunkTaper: 0,
    };
  },
};
