// Calligraphic column: the ancestors in Ruqaa, one under another on the
// trunk's axis, strung on a thin gold thread that continues the thread
// joining the trunk's ancestors. The trunk narrows to a point and opens into
// two fine gold sweeps that cradle the nearest name, so the column reads as
// the trunk's own base. Names nearest the trunk are larger and more widely
// spaced; the oldest are smallest (never below the legibility floor). Small
// gold diamonds sit on the thread between names. A lineage longer than the
// column's share of the page continues as an unframed inscription on the
// same axis ("بن … بن آدم"): no panels, no boxes.

import {
  RUQAA_WIDTH, clamp, dot, drawInscription, fitCount, fx, inscriptionFor, lozenge, namesOf, restAsText, smallestName, unionBox,
} from "./common";
import type { SoilContext, SoilShape, SoilStyleDef, SoilText } from "./types";

/** Most of the content height the column itself may take. */
const COLUMN_SHARE = 0.26;
/** How far below the ground line the trunk narrows to the point the thread leaves from. */
const taperOf = (ctx: SoilContext) => ctx.f * 2.2;
/** Room between the trunk's point and the nearest name, for the sweeps. */
const neckOf = (ctx: SoilContext) => ctx.f * 0.6;
/** The oldest name in the column, relative to the nearest. */
const SMALLEST = 0.76;

interface Row {
  label: string;
  fs: number;
  /** Baseline, from the ground line. */
  y: number;
  memberId: string | null;
}

/** Every position of the column, from the ground line down. */
function measure(ctx: SoilContext) {
  const names = namesOf(ctx);
  const { entries } = names;
  // the nearest name is set a little larger than the trunk's badges
  const fsTop = clamp(ctx.f * 1.25, ctx.floor, ctx.maxFont * 0.9);
  const fsBottom = Math.max(ctx.floor, fsTop * SMALLEST);
  const start = taperOf(ctx) + neckOf(ctx);
  /** The column's rows when it holds k names. */
  const rowsFor = (k: number): Row[] => {
    const rows: Row[] = [];
    let y = start;
    for (let i = 0; i < k; i++) {
      const t = k > 1 ? i / (k - 1) : 0;
      // a long name is set smaller to fit the width (never below the floor)
      const fit = (ctx.maxWidth * 0.8) / Math.max(1e-6, ctx.textWidth(entries[i].label, 1) * RUQAA_WIDTH);
      const fs = Math.max(ctx.floor, Math.min(fsTop + (fsBottom - fsTop) * t, fit));
      if (i === 0) y += fs * 0.95;
      else {
        // more air near the trunk, closer together further down
        const prev = rows[i - 1].fs;
        y += ((prev + fs) / 2) * (2.15 + 0.85 * (1 - t));
      }
      rows.push({ label: entries[i].label, fs, y, memberId: entries[i].id });
    }
    return rows;
  };
  const bottomOf = (rows: Row[]) => {
    const last = rows[rows.length - 1];
    return last ? last.y + last.fs * 0.45 + last.fs * 1.1 : start;
  };
  const k = fitCount(entries.length, ctx.avail * COLUMN_SHARE, (n) => bottomOf(rowsFor(n)));
  const rows = rowsFor(k);
  const headBottom = bottomOf(rows);
  const rest = inscriptionFor(ctx, restAsText(ctx, names, k));
  return { rows, headBottom, rest, height: headBottom + (rest?.height ?? 0), fsTop };
}

export const column: SoilStyleDef = {
  id: "column",
  label: "Calligraphic column",
  description: "The ancestors in calligraphy on a gold thread, flowing out of the trunk's base.",
  height: (ctx) => measure(ctx).height,
  layout(p) {
    const m = measure(p);
    const G = p.groundY;
    const shapes: SoilShape[] = [];
    // the nearest name in the bark's colour, as if still part of the trunk
    const texts: SoilText[] = m.rows.map((r, i) => ({
      x: p.cx, y: G + r.y, text: r.label, fontSize: r.fs, anchor: "middle", ink: i === 0 ? "bark" : "ink", font: "ruqaa", weight: 700,
      memberId: r.memberId,
    }));
    const top = (r: Row) => G + r.y - r.fs * 0.95;
    const bottom = (r: Row) => G + r.y + r.fs * 0.45;
    const widthOf = (r: Row) => p.textWidth(r.label, r.fs) * RUQAA_WIDTH;
    const boxes = m.rows.map((r) => ({ x: p.cx - widthOf(r) / 2, y: top(r), w: widthOf(r), h: r.fs * 1.4 }));

    // The gold thread: from the trunk's lowest ancestor, through the trunk's
    // point and down the column between the names, thinning as it goes.
    const threadW = p.f * 0.12;
    const seg = (y0: number, y1: number, w: number) => {
      if (y1 - y0 > p.f * 0.12) shapes.push({ d: `M${fx(p.cx)} ${fx(y0)}V${fx(y1)}`, stroke: "goldLight", strokeWidth: w });
    };
    const tip = G + taperOf(p);
    if (m.rows.length) {
      const first = m.rows[0];
      seg(p.threadFrom, top(first) - first.fs * 0.3, threadW);
      // the trunk's point opens into two fine sweeps cradling the nearest name
      const reach = widthOf(first) / 2 + first.fs * 0.45;
      const endY = G + first.y - first.fs * 0.3;
      const sweeps: string[] = [];
      for (const side of [-1, 1]) {
        const ex = p.cx + side * reach;
        sweeps.push(
          `M${fx(p.cx)} ${fx(tip)}C${fx(p.cx + side * reach * 0.35)} ${fx(tip + p.f * 0.05)} ${fx(ex)} ${fx(tip + (endY - tip) * 0.25)} ${fx(ex)} ${fx(endY)}`,
        );
        shapes.push({ d: dot(ex, endY + first.fs * 0.12, first.fs * 0.07), fill: "gold" });
      }
      shapes.push({ d: sweeps.join(""), stroke: "gold", strokeWidth: p.f * 0.045 });
      shapes.push({ d: lozenge(p.cx, tip, p.f * 0.09, p.f * 0.13), fill: "gold" });
      boxes.push({ x: p.cx - reach - first.fs * 0.1, y: tip, w: 2 * reach + first.fs * 0.2, h: endY - tip + first.fs * 0.3 });

      m.rows.forEach((r, i) => {
        const next = m.rows[i + 1];
        if (!next) return;
        const t = m.rows.length > 1 ? i / (m.rows.length - 1) : 0;
        const w = threadW * (1 - 0.55 * t);
        const a = bottom(r), b = top(next);
        const mid = (a + b) / 2;
        const s = (r.fs + next.fs) / 2;
        // a small diamond on the thread halfway between two names
        if (b - a > s * 0.6) {
          seg(a, mid - s * 0.26, w);
          seg(mid + s * 0.26, b, w);
          shapes.push({ d: lozenge(p.cx, mid, s * 0.09, s * 0.15), fill: "gold" });
        } else seg(a, b, w);
      });
      // the thread ends in a finial, or runs on to the inscription's ornament
      const last = m.rows[m.rows.length - 1];
      const end = G + m.headBottom;
      if (m.rest) seg(bottom(last), end + m.rest.fs * 0.3, threadW * 0.45);
      else {
        seg(bottom(last), end - last.fs * 0.55, threadW * 0.45);
        shapes.push({ d: lozenge(p.cx, end - last.fs * 0.35, last.fs * 0.14, last.fs * 0.24), fill: "gold" });
      }
      boxes.push({ x: p.cx - p.f * 0.3, y: G, w: p.f * 0.6, h: m.headBottom });
    }

    if (m.rest) {
      const ins = drawInscription(p, m.rest, G + m.headBottom);
      shapes.push(...ins.shapes);
      texts.push(...ins.texts);
      boxes.push(ins.box);
    }
    if (!boxes.length) boxes.push({ x: p.cx, y: G, w: 0, h: m.height });
    // the trunk narrows to a point and the thread runs on from it: no ground, no roots
    return {
      style: "column",
      ground: null,
      roots: [],
      shapes,
      texts,
      fontSize: smallestName(texts, m.fsTop),
      box: unionBox(boxes),
      count: p.custom ? 0 : p.entries.length,
      custom: p.custom,
      trunkSpread: 0,
      trunkTaper: taperOf(p),
    };
  },
};
