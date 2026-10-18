// Calligraphic column: the ancestors in Ruqaa, one under another, strung on
// a thin gold thread that continues the thread joining the trunk's
// ancestors. Names nearest the trunk are larger and more widely spaced, so
// the column grows out of the trunk's base; the oldest are smallest (never
// below the legibility floor). A lineage longer than the column's share of
// the page continues in an inscribed plaque at its foot ("بن … بن آدم").

import {
  RUQAA_WIDTH, clamp, drawPlaque, fitCount, fx, lozenge, namesOf, plaqueFor, restAsText, smallestName, unionBox,
} from "./common";
import type { SoilContext, SoilShape, SoilStyleDef, SoilText } from "./types";

/** Most of the content height the column itself may take. */
const COLUMN_SHARE = 0.24;
/** How far below the ground line the trunk narrows to the point the thread leaves from. */
const taperOf = (ctx: SoilContext) => ctx.f * 2.4;
/** The oldest name in the column, relative to the nearest. */
const SMALLEST = 0.78;

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
  const { entries, prose } = names;
  // the nearest name is set as large as the trunk's badges, a little larger
  const fsTop = clamp(ctx.f * 1.12, ctx.floor, ctx.maxFont * 0.85);
  const fsBottom = Math.max(ctx.floor, fsTop * SMALLEST);
  /** The column's rows when it holds k names. */
  const rowsFor = (k: number): Row[] => {
    const rows: Row[] = [];
    let y = taperOf(ctx) + ctx.f * 0.35;
    for (let i = 0; i < k; i++) {
      const t = k > 1 ? i / (k - 1) : 0;
      // a long name is set smaller to fit the width (never below the floor)
      const fit = (ctx.maxWidth * 0.9) / Math.max(1e-6, ctx.textWidth(entries[i].label, 1) * RUQAA_WIDTH);
      const fs = Math.max(ctx.floor, Math.min(fsTop + (fsBottom - fsTop) * t, fit));
      if (i === 0) y += fs * 0.95;
      else {
        // more space near the trunk, closer together further down
        const prev = rows[i - 1].fs;
        y += ((prev + fs) / 2) * (1.75 + 0.55 * (1 - t));
      }
      rows.push({ label: entries[i].label, fs, y, memberId: entries[i].id });
    }
    return rows;
  };
  const bottomOf = (rows: Row[]) => {
    const last = rows[rows.length - 1];
    return last ? last.y + last.fs * 0.45 + last.fs * 0.9 : taperOf(ctx) + ctx.f * 0.35;
  };
  const k = fitCount(entries.length, ctx.avail * COLUMN_SHARE, (n) => bottomOf(rowsFor(n)));
  const rows = rowsFor(k);
  const headBottom = bottomOf(rows);
  const plaque = plaqueFor(ctx, restAsText(ctx, names, k));
  return { rows, headBottom, plaque, height: headBottom + (plaque?.height ?? 0), fsTop };
}

export const column: SoilStyleDef = {
  id: "column",
  label: "Calligraphic column",
  description: "The ancestors in calligraphy on a gold thread, growing out of the trunk's base.",
  height: (ctx) => measure(ctx).height,
  layout(p) {
    const m = measure(p);
    const G = p.groundY;
    const shapes: SoilShape[] = [];
    const texts: SoilText[] = m.rows.map((r) => ({
      x: p.cx, y: G + r.y, text: r.label, fontSize: r.fs, anchor: "middle", ink: "ink", font: "ruqaa", weight: 700, memberId: r.memberId,
    }));

    // The gold thread: from the trunk's lowest ancestor down the column,
    // passing between the names (never through them), thinning as it goes.
    const threadW = p.f * 0.11;
    const seg = (y0: number, y1: number, w: number) => {
      if (y1 - y0 > p.f * 0.15) shapes.push({ d: `M${fx(p.cx)} ${fx(y0)}V${fx(y1)}`, stroke: "goldLight", strokeWidth: w });
    };
    const top = (r: (typeof m.rows)[number]) => G + r.y - r.fs * 0.95;
    const bottom = (r: (typeof m.rows)[number]) => G + r.y + r.fs * 0.45;
    if (m.rows.length) {
      seg(p.threadFrom, top(m.rows[0]), threadW);
      m.rows.forEach((r, i) => {
        const next = m.rows[i + 1];
        const t = m.rows.length > 1 ? i / (m.rows.length - 1) : 0;
        const w = threadW * (1 - 0.45 * t);
        if (next) {
          seg(bottom(r), top(next), w);
          // a small bead halfway between two names
          const mid = (bottom(r) + top(next)) / 2;
          if (top(next) - bottom(r) > r.fs * 0.5) shapes.push({ d: lozenge(p.cx, mid, r.fs * 0.1, r.fs * 0.16), fill: "gold" });
        }
      });
      // the thread ends in a finial (or runs on into the plaque)
      const last = m.rows[m.rows.length - 1];
      const end = G + m.headBottom;
      seg(bottom(last), end - (m.plaque ? 0 : last.fs * 0.35), threadW * 0.55);
      if (!m.plaque) shapes.push({ d: lozenge(p.cx, end - last.fs * 0.3, last.fs * 0.2, last.fs * 0.3), fill: "gold" });
    }

    const boxes = m.rows.map((r) => {
      const w = p.textWidth(r.label, r.fs) * RUQAA_WIDTH;
      return { x: p.cx - w / 2, y: top(r), w, h: r.fs * 1.4 };
    });
    if (m.rows.length) boxes.push({ x: p.cx - p.f * 0.3, y: G, w: p.f * 0.6, h: m.headBottom });
    if (m.plaque) {
      const pl = drawPlaque(p, m.plaque, G + m.headBottom);
      shapes.push(...pl.shapes);
      texts.push(...pl.texts);
      boxes.push(pl.box);
    }
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
