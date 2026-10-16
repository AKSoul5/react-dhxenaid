// Ornament geometry for the poster: scalloped medallions, baroque corner
// scrollwork, and text set inside circles. Pure functions returning SVG
// path data, so everything stays vector.

import { textWidth } from "@/lib/layout/botanical";

type P = { x: number; y: number };
const f = (n: number) => n.toFixed(1);

/** Closed filled ribbon along a polyline, tapering from w0 to w1. */
export function polyRibbon(pts: P[], w0: number, w1: number): string {
  if (pts.length < 2) return "";
  const left: P[] = [];
  const right: P[] = [];
  pts.forEach((p, i) => {
    const a = pts[Math.max(0, i - 1)];
    const b = pts[Math.min(pts.length - 1, i + 1)];
    const dx = b.x - a.x, dy = b.y - a.y;
    const l = Math.hypot(dx, dy) || 1;
    const t = i / (pts.length - 1);
    const w = (w0 + (w1 - w0) * t) / 2;
    left.push({ x: p.x - (dy / l) * w, y: p.y + (dx / l) * w });
    right.push({ x: p.x + (dy / l) * w, y: p.y - (dx / l) * w });
  });
  const all = [...left, ...right.reverse()];
  return `M${all.map((p) => `${f(p.x)} ${f(p.y)}`).join("L")}Z`;
}

/** Ellipse with a scalloped ("sun") edge of n bumps. */
export function scallopPath(cx: number, cy: number, rx: number, ry: number, n = 18, depth = 0.07): string {
  const pt = (a: number, k: number) => ({ x: cx + Math.cos(a) * rx * k, y: cy + Math.sin(a) * ry * k });
  let d = "";
  for (let i = 0; i < n; i++) {
    const a0 = (i / n) * Math.PI * 2;
    const a1 = ((i + 1) / n) * Math.PI * 2;
    const p0 = pt(a0, 1);
    const c = pt((a0 + a1) / 2, 1 + depth * 2);
    const p1 = pt(a1, 1);
    if (i === 0) d += `M${f(p0.x)} ${f(p0.y)}`;
    d += `Q${f(c.x)} ${f(c.y)} ${f(p1.x)} ${f(p1.y)}`;
  }
  return `${d}Z`;
}

/** Logarithmic spiral points, curling inwards. */
function spiral(c: P, r0: number, a0: number, turns: number, dir: 1 | -1, k = 0.32, steps = 40): P[] {
  const out: P[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * turns * Math.PI * 2;
    const r = r0 * Math.exp(-k * t);
    const a = a0 + dir * t;
    out.push({ x: c.x + Math.cos(a) * r, y: c.y + Math.sin(a) * r });
  }
  return out;
}

function cubicPts(p0: P, c1: P, c2: P, p1: P, steps = 24): P[] {
  const out: P[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps, u = 1 - t;
    out.push({
      x: u * u * u * p0.x + 3 * u * u * t * c1.x + 3 * u * t * t * c2.x + t * t * t * p1.x,
      y: u * u * u * p0.y + 3 * u * u * t * c1.y + 3 * u * t * t * c2.y + t * t * t * p1.y,
    });
  }
  return out;
}

/** An acanthus-like leaf: base at p, pointing at angle a (radians). */
function acanthus(p: P, a: number, len: number, wid: number, curl: number): string {
  const tip = { x: p.x + Math.cos(a) * len, y: p.y + Math.sin(a) * len };
  const n = { x: -Math.sin(a), y: Math.cos(a) };
  const m1 = { x: p.x + Math.cos(a) * len * 0.35 + n.x * wid, y: p.y + Math.sin(a) * len * 0.35 + n.y * wid };
  const m2 = { x: p.x + Math.cos(a) * len * 0.6 - n.x * wid * 0.7, y: p.y + Math.sin(a) * len * 0.6 - n.y * wid * 0.7 };
  const t2 = { x: tip.x + n.x * curl, y: tip.y + n.y * curl };
  return `M${f(p.x)} ${f(p.y)}Q${f(m1.x)} ${f(m1.y)} ${f(t2.x)} ${f(t2.y)}Q${f(m2.x)} ${f(m2.y)} ${f(p.x)} ${f(p.y)}Z`;
}

/**
 * Baroque corner scrollwork in a 300×300 box anchored at the top-left
 * corner (0,0). Mirror with scale(-1,1) / scale(1,-1) for other corners.
 */
export function baroqueCorner(): string[] {
  const paths: string[] = [];
  // one arm along the top edge; the other is its mirror across y = x
  const arm = (swap: boolean) => {
    const S = (p: P): P => (swap ? { x: p.y, y: p.x } : p);
    const main = [
      ...cubicPts({ x: 30, y: 26 }, { x: 100, y: 0 }, { x: 175, y: 50 }, { x: 236, y: 22 }),
      ...spiral({ x: 248, y: 50 }, 28, -Math.PI * 0.62, 1.35, 1, 0.26, 56).slice(1),
    ].map(S);
    paths.push(polyRibbon(main, 18, 3));
    // inner counter-scroll
    const inner = [
      ...cubicPts({ x: 48, y: 48 }, { x: 86, y: 70 }, { x: 128, y: 40 }, { x: 156, y: 62 }),
      ...spiral({ x: 146, y: 78 }, 17, -Math.PI * 0.3, 1.2, 1, 0.3, 44).slice(1),
    ].map(S);
    paths.push(polyRibbon(inner, 10, 2.2));
    // acanthus leaves sprouting from the scrolls
    const leaves: [P, number, number, number, number][] = [
      [{ x: 78, y: 14 }, -2.75, 46, 16, -9],
      [{ x: 122, y: 18 }, -2.45, 44, 15, -8],
      [{ x: 172, y: 36 }, -2.1, 38, 13, -7],
      [{ x: 204, y: 36 }, 0.25, 36, 12, 7],
      [{ x: 104, y: 38 }, 0.6, 32, 11, 6],
      [{ x: 150, y: 46 }, 0.95, 26, 9, 5],
    ];
    for (const [p, a, l, w, c] of leaves) {
      const q = S(p);
      const ang = swap ? Math.PI / 2 - a : a;
      paths.push(acanthus(q, ang, l, w, c));
    }
  };
  arm(false);
  arm(true);
  // corner rosette and fan of leaves
  for (let i = 0; i < 7; i++) {
    const a = (Math.PI / 2) * (i / 6);
    paths.push(acanthus({ x: 28, y: 28 }, a, i % 2 ? 30 : 44, i % 2 ? 9 : 14, 0));
  }
  paths.push(scallopPath(28, 28, 17, 17, 12, 0.1));
  return paths;
}

export interface CircleText {
  lines: { text: string; y: number; bold?: boolean; size: number }[];
}

/**
 * Sets a heading, a body and a footer inside a circle of radius r: lines
 * are as wide as the circle's chord at their height. Picks the largest
 * font that fits.
 */
export function textInCircle(r: number, heading: string, body: string, footer: string): CircleText {
  const words = body.split(/\s+/).filter(Boolean);
  for (let fs = r * 0.17; fs > r * 0.06; fs *= 0.95) {
    const lh = fs * 1.5;
    const hs = fs * 0.9;
    const lines: CircleText["lines"] = [];
    // estimate how many body lines we need, then centre the block
    const fill = (top: number) => {
      lines.length = 0;
      let y = top;
      lines.push({ text: heading, y, bold: true, size: hs });
      y += lh * 1.05;
      let cur = "";
      const chordAt = (yy: number) => 2 * Math.sqrt(Math.max(0, r * r - (Math.abs(yy) + fs * 0.6) ** 2)) * 0.86;
      let i = 0;
      while (i < words.length) {
        const width = chordAt(y);
        if (width <= fs * 3) return false;
        cur = words[i];
        i++;
        while (i < words.length && textWidth(`${cur} ${words[i]}`, fs) <= width) {
          cur = `${cur} ${words[i]}`;
          i++;
        }
        lines.push({ text: cur, y, size: fs });
        y += lh;
      }
      lines.push({ text: footer, y: y + lh * 0.1, size: fs * 0.75 });
      return Math.abs(y + lh * 0.1) + fs * 0.6 < r * 0.92;
    };
    // try a few vertical offsets so the block is roughly centred
    for (const top of [-r * 0.62, -r * 0.55, -r * 0.48, -r * 0.4]) {
      if (fill(top)) {
        const span = lines[lines.length - 1].y - lines[0].y;
        const shift = -(lines[0].y + span / 2);
        return { lines: lines.map((l) => ({ ...l, y: l.y + shift })) };
      }
    }
  }
  return { lines: [{ text: heading, y: 0, bold: true, size: r * 0.12 }] };
}

// Al-Hujurat 49:13 and the hadith from Sunan al-Tirmidhi (1979).
export const VERSE = {
  heading: "قال الله تعالى:",
  body: "﴿يا أيها الناس إنا خلقناكم من ذكر وأنثى وجعلناكم شعوبا وقبائل لتعارفوا إن أكرمكم عند الله أتقاكم إن الله عليم خبير﴾",
  footer: "سورة الحجرات (١٣)",
};
export const HADITH = {
  heading: "قال رسول الله ﷺ:",
  body: "«تعلموا من أنسابكم ما تصلون به أرحامكم، فإن صلة الرحم محبة في الأهل، مثراة في المال، منسأة في الأثر»",
  footer: "رواه الترمذي",
};
