// Timeline spine: the trunk narrows into a fine spine running down the
// foundation; the ancestors sit to either side of it (alternating, so the
// spine stays short), each joined to it by a short gold tick, with their
// generation number on the spine. The spine is widest where it leaves the
// trunk, so trunk and spine read as one form.

import {
  clamp, dot, drawInscription, fitCount, fx, gapBelowGround, inscriptionFor, lozenge, namesOf, restAsText, smallestName, unionBox,
} from "./common";
import type { SoilContext, SoilPlacement, SoilShape, SoilStyleDef, SoilText } from "./types";

const SPINE_SHARE = 0.24;

interface Row {
  label: string;
  fs: number;
  /** Centre of the row, from the ground line. */
  y: number;
  side: 1 | -1;
  memberId: string | null;
  generation: number | null;
}

/** The disc carrying the generation number. */
const discR = (fs: number) => fs * 0.55;
/** Room from the spine's centre line to a name: disc, tick, a little air. */
const reachFor = (fs: number) => discR(fs) + fs * 1.0 + fs * 0.3;

function measure(ctx: SoilContext) {
  const names = namesOf(ctx);
  const { entries } = names;
  const fsTop = clamp(ctx.f * 0.95, ctx.floor, ctx.maxFont * 0.72);
  const fsBottom = Math.max(ctx.floor, fsTop * 0.88);
  // the side the reading starts from first: right in Arabic
  const first: 1 | -1 = ctx.rtl ? 1 : -1;
  const rowsFor = (k: number): Row[] => {
    const rows: Row[] = [];
    let y = gapBelowGround(ctx);
    for (let i = 0; i < k; i++) {
      const t = k > 1 ? i / (k - 1) : 0;
      const room = ctx.maxWidth / 2 - reachFor(fsTop);
      const fit = room / Math.max(1e-6, ctx.textWidth(entries[i].label, 1));
      const fs = Math.max(ctx.floor, Math.min(fsTop + (fsBottom - fsTop) * t, fit));
      // names alternate sides, so consecutive rows can be close
      y += i === 0 ? fs * 0.8 : ((rows[i - 1].fs + fs) / 2) * 1.12;
      rows.push({ label: entries[i].label, fs, y, side: (i % 2 === 0 ? first : -first) as 1 | -1, memberId: entries[i].id, generation: entries[i].generation });
    }
    return rows;
  };
  const bottomOf = (rows: Row[]) => {
    const last = rows[rows.length - 1];
    return last ? last.y + last.fs * 0.6 + last.fs * 1.1 : gapBelowGround(ctx);
  };
  const k = fitCount(entries.length, ctx.avail * SPINE_SHARE, (n) => bottomOf(rowsFor(n)));
  const rows = rowsFor(k);
  const headBottom = bottomOf(rows);
  const rest = inscriptionFor(ctx, restAsText(ctx, names, k));
  return { rows, headBottom, rest, height: headBottom + (rest?.height ?? 0), fsTop };
}

/** Arabic-Indic digits in Arabic. */
const numeral = (n: number, rtl: boolean) => (rtl ? n.toLocaleString("ar-EG", { useGrouping: false }) : String(n));

export const spine: SoilStyleDef = {
  id: "spine",
  label: "Timeline spine",
  description: "A fine spine growing out of the trunk, the ancestors to either side with their generation numbers.",
  height: (ctx) => measure(ctx).height,
  layout(p: SoilPlacement) {
    const m = measure(p);
    const G = p.groundY;
    const shapes: SoilShape[] = [];
    const texts: SoilText[] = [];
    const yTop = G - p.f * 0.4; // starts inside the trunk's foot
    const yEnd = G + m.headBottom - (m.rest ? 0 : (m.rows.at(-1)?.fs ?? p.f) * 0.4);
    // as wide as the trunk where it leaves it: trunk and spine are one form
    const wStart = p.trunkWidth * 0.5;
    const wEnd = p.f * 0.07;
    const halfWidth = (y: number) => {
      const u = clamp((y - yTop) / Math.max(1, yEnd - yTop), 0, 1);
      return wEnd + (wStart - wEnd) * (1 - u) ** 2.8;
    };

    // the spine: a tapered body in the trunk's colour, sampled down its length
    const N = 40;
    const left: string[] = [], right: string[] = [];
    for (let i = 0; i <= N; i++) {
      const y = yTop + ((yEnd - yTop) * i) / N;
      const w = halfWidth(y);
      right.push(`${fx(p.cx + w)} ${fx(y)}`);
      left.unshift(`${fx(p.cx - w)} ${fx(y)}`);
    }
    shapes.push({ d: `M${right.join("L")}L${left.join("L")}Z`, fill: "trunk" });
    // a gold line down its middle, as on the trunk
    shapes.push({ d: `M${fx(p.cx)} ${fx(p.threadFrom)}V${fx(yEnd)}`, stroke: "goldLight", strokeWidth: p.f * 0.07 });
    if (!m.rest) shapes.push({ d: lozenge(p.cx, yEnd + p.f * 0.15, p.f * 0.22, p.f * 0.34), fill: "gold" });

    const ticks: string[] = [];
    const boxes = [{ x: p.cx - wStart, y: G, w: wStart * 2, h: m.headBottom }];
    for (const r of m.rows) {
      const y = G + r.y;
      const disc = discR(r.fs);
      const from = Math.max(halfWidth(y), disc);
      const tickEnd = p.cx + r.side * (from + r.fs * 1.0);
      ticks.push(`M${fx(p.cx + r.side * from)} ${fx(y)}H${fx(tickEnd)}`);
      shapes.push({ d: dot(tickEnd, y, r.fs * 0.08), fill: "gold" });
      // the name's near edge at the tick: which anchor that is depends on the script direction
      const nearX = tickEnd + r.side * r.fs * 0.3;
      const extendsRight = r.side === 1;
      texts.push({
        x: nearX, y: y + r.fs * 0.32, text: r.label, fontSize: r.fs, ink: "ink", font: "naskh", weight: 700, memberId: r.memberId,
        anchor: extendsRight === p.rtl ? "end" : "start",
      });
      const w = p.textWidth(r.label, r.fs);
      boxes.push({ x: extendsRight ? nearX : nearX - w, y: y - r.fs * 0.8, w, h: r.fs * 1.4 });
      if (r.generation !== null) {
        shapes.push({ d: dot(p.cx, y, disc), fill: "ivory", stroke: "gold", strokeWidth: p.f * 0.04 });
        texts.push({
          x: p.cx, y: y + r.fs * 0.2, text: numeral(r.generation, p.rtl), fontSize: r.fs * 0.6, anchor: "middle", ink: "muted", font: "naskh",
          annotation: true,
        });
      }
    }
    shapes.push({ d: ticks.join(""), stroke: "gold", strokeWidth: p.f * 0.05 });
    if (m.rest) {
      const pl = drawInscription(p, m.rest, G + m.headBottom);
      shapes.push(...pl.shapes);
      texts.push(...pl.texts);
      boxes.push(pl.box);
    }
    return {
      style: "spine",
      ground: null,
      roots: [],
      shapes,
      texts,
      fontSize: smallestName(texts, m.fsTop),
      box: unionBox(boxes),
      count: p.custom ? 0 : p.entries.length,
      custom: p.custom,
      trunkSpread: 0,
      trunkTaper: 0,
    };
  },
};
