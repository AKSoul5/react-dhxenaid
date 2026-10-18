// Shared pieces of the soil styles: sizes, wrapping, the ground and roots,
// and the inscribed plaque that carries the oldest names once a style's
// column is full.

import { normalizeName } from "../../nasab";
import { add, ribbonPath, type Cubic, type Vec } from "../geometry";
import type { SoilContext, SoilPlacement, SoilShape, SoilText } from "./types";

export const fx = (n: number) => n.toFixed(1);
export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Aref Ruqaa sets wider than the Amiri metrics textWidth is tuned for. */
export const RUQAA_WIDTH = 1.15;

/** Space between the ground line and the foundation. */
export const gapBelowGround = (ctx: SoilContext) => ctx.f * 0.9;

/** The running-text size (paragraph and plaque): as before the styles existed. */
export const runningFont = (ctx: SoilContext) => Math.max(ctx.floor, Math.min(ctx.f * 0.85, ctx.maxFont * 0.75));

/** Words of running text. Only ordinary spaces break: a name and its honorific are joined by no-break spaces. */
export const wordsOf = (text: string) => text.split(/[ \t\n]+/).filter(Boolean);

/** Greedy word wrap at a width, never leaving a single word alone on the last line. */
export function wrapWords(ctx: SoilContext, text: string, width: number, fs: number): string[] {
  const lines: string[] = [];
  let cur = "";
  for (const word of wordsOf(text)) {
    const next = cur ? `${cur} ${word}` : word;
    if (cur && ctx.textWidth(next, fs) > width) {
      lines.push(cur);
      cur = word;
    } else cur = next;
  }
  if (cur) lines.push(cur);
  return avoidWidow(ctx, lines, width, fs);
}

/** A last line of one word takes the previous line's last word with it, when that still fits. */
export function avoidWidow(ctx: SoilContext, lines: string[], width: number, fs: number): string[] {
  if (lines.length < 2) return lines;
  const last = wordsOf(lines[lines.length - 1]);
  const prev = wordsOf(lines[lines.length - 2]);
  if (last.length !== 1 || prev.length < 3) return lines;
  const moved = [prev[prev.length - 1], ...last].join(" ");
  if (ctx.textWidth(moved, fs) > width) return lines;
  return [...lines.slice(0, -2), prev.slice(0, -1).join(" "), moved];
}

/**
 * The names a structured style lays out, and any text it inscribes instead.
 * A custom inscription is split into names when it is a nasab ("X بن Y …"),
 * leaving out a first name that is the trunk's own first ancestor; any
 * other custom text is inscribed as written.
 */
export function namesOf(ctx: SoilContext): { entries: SoilContext["entries"]; prose: string | null } {
  if (!ctx.custom) return { entries: ctx.entries, prose: null };
  const parts = ctx.text.split(/\s+(?:بن|ابن|بنت|bin|ibn|son of|daughter of)\s+/i).map((p) => p.trim()).filter(Boolean);
  if (parts.length < 3) return { entries: [], prose: ctx.text };
  if (ctx.trunkName && normalizeName(parts[0]) === normalizeName(ctx.trunkName)) parts.shift();
  return { entries: parts.map((label) => ({ id: null, label, generation: null })), prose: null };
}

/** "بن X بن Y … بن آدم": the names from `from` on, continuing a chain shown above them (or the prose). */
export function restAsText(ctx: SoilContext, names: ReturnType<typeof namesOf>, from: number): string {
  if (names.prose) return names.prose;
  const rest = names.entries.slice(from);
  return rest.length ? `${ctx.joiner.trim()} ${rest.map((e) => e.label).join(ctx.joiner)}` : "";
}

/** How many names fit a height budget, given each name's step. */
export function fitCount(n: number, budget: number, heightOf: (k: number) => number): number {
  let k = Math.min(n, 1);
  while (k < n && heightOf(k + 1) <= budget) k++;
  return k;
}

// ── The ground and roots ─────────────────────────────────────────────────

/** A fine ground arc under the trunk. */
export function groundArc(p: SoilPlacement, halfWidth: number): string {
  const { cx, groundY, f } = p;
  return `M${fx(cx - halfWidth)} ${fx(groundY + f * 0.15)}Q${fx(cx)} ${fx(groundY - f * 0.25)} ${fx(cx + halfWidth)} ${fx(groundY + f * 0.15)}`;
}

/** Fine roots from the trunk base, reaching down to `toY`, `count` per side. */
export function rootsTo(p: SoilPlacement, toY: number, spread: number, perSide = 3, weight = 1): string[] {
  const { cx, groundY, trunkWidth, f } = p;
  const roots: string[] = [];
  for (let i = 0; i < perSide * 2; i++) {
    const side = i % 2 === 0 ? 1 : -1;
    const k = Math.floor(i / 2);
    const start: Vec = { x: cx + side * trunkWidth * (0.15 + 0.12 * k), y: groundY };
    const end: Vec = { x: cx + side * (trunkWidth * 0.7 + spread * (0.2 + 0.28 * k)), y: toY - f * 0.05 };
    const curve: Cubic = {
      p0: start, c1: add(start, { x: 0, y: (end.y - start.y) * 0.6 }),
      c2: add(end, { x: -side * (end.x - start.x) * 0.5, y: -f * 0.1 }), p1: end,
    };
    roots.push(ribbonPath(curve, trunkWidth * (0.12 - 0.025 * k) * weight, 1.2, 12));
  }
  return roots;
}

// ── Shapes ───────────────────────────────────────────────────────────────

export const rectPath = (x: number, y: number, w: number, h: number, r = 0) =>
  r > 0
    ? `M${fx(x + r)} ${fx(y)}H${fx(x + w - r)}Q${fx(x + w)} ${fx(y)} ${fx(x + w)} ${fx(y + r)}V${fx(y + h - r)}Q${fx(x + w)} ${fx(y + h)} ${fx(x + w - r)} ${fx(y + h)}H${fx(x + r)}Q${fx(x)} ${fx(y + h)} ${fx(x)} ${fx(y + h - r)}V${fx(y + r)}Q${fx(x)} ${fx(y)} ${fx(x + r)} ${fx(y)}Z`
    : `M${fx(x)} ${fx(y)}H${fx(x + w)}V${fx(y + h)}H${fx(x)}Z`;

/** A lozenge (diamond) centred at (x, y). */
export const lozenge = (x: number, y: number, rx: number, ry = rx * 1.4) =>
  `M${fx(x)} ${fx(y - ry)}L${fx(x + rx)} ${fx(y)}L${fx(x)} ${fx(y + ry)}L${fx(x - rx)} ${fx(y)}Z`;

/** A small dot (a circle as two arcs). */
export const dot = (x: number, y: number, r: number) =>
  `M${fx(x - r)} ${fx(y)}a${fx(r)} ${fx(r)} 0 1 0 ${fx(2 * r)} 0a${fx(r)} ${fx(r)} 0 1 0 ${fx(-2 * r)} 0Z`;

/** A lozenge flanked by two dots: the separator between names in a manuscript. */
export const separatorMark = (x: number, y: number, s: number) =>
  [lozenge(x, y, s * 0.32, s * 0.42), dot(x - s * 0.85, y, s * 0.13), dot(x + s * 0.85, y, s * 0.13)].join("");

// ── The plaque: the oldest names, inscribed under a style's column ───────

export interface Plaque {
  fs: number;
  width: number;
  lines: string[];
  /** Including the space above it. */
  height: number;
}

/** Measures the inscription of `text`, at most `maxWidth` wide. */
export function plaqueFor(ctx: SoilContext, text: string, maxWidth = ctx.maxWidth * 0.82): Plaque | null {
  if (!text) return null;
  const fs = runningFont(ctx);
  const natural = ctx.textWidth(text, fs) + fs * 3;
  // a few balanced lines rather than one long one
  const width = clamp(Math.sqrt(natural * fs * 14), Math.min(maxWidth, fs * 12), maxWidth);
  const lines = wrapWords(ctx, text, width - fs * 2.4, fs);
  return { fs, width, lines, height: fs * 0.9 + fs * 1.5 + lines.length * fs * 1.65 };
}

/** Draws a measured plaque with its top at `top` (the space above included). */
export function drawPlaque(p: SoilPlacement, pl: Plaque, top: number): { shapes: SoilShape[]; texts: SoilText[]; box: { x: number; y: number; w: number; h: number } } {
  const { fs, width, lines } = pl;
  const y = top + fs * 0.9;
  const h = pl.height - fs * 0.9;
  const x = p.cx - width / 2;
  const inset = fs * 0.28;
  const shapes: SoilShape[] = [
    { d: rectPath(x, y, width, h, fs * 0.5), fill: "ivory", stroke: "gold", strokeWidth: p.W * 0.0012, opacity: 0.95 },
    { d: rectPath(x + inset, y + inset, width - 2 * inset, h - 2 * inset, fs * 0.35), stroke: "gold", strokeWidth: p.W * 0.0005 },
  ];
  const texts: SoilText[] = lines.map((line, k) => ({
    x: p.cx, y: y + fs * 1.55 + k * fs * 1.65, text: line, fontSize: fs, anchor: "middle", ink: "ink", font: "naskh",
  }));
  return { shapes, texts, box: { x, y, w: width, h } };
}

/** The smallest name size among texts (annotations aside). */
export const smallestName = (texts: SoilText[], fallback: number) =>
  Math.min(fallback, ...texts.filter((t) => !t.annotation).map((t) => t.fontSize));

/** Bounds of a set of boxes. */
export function unionBox(boxes: { x: number; y: number; w: number; h: number }[]) {
  const x0 = Math.min(...boxes.map((b) => b.x)), y0 = Math.min(...boxes.map((b) => b.y));
  const x1 = Math.max(...boxes.map((b) => b.x + b.w)), y1 = Math.max(...boxes.map((b) => b.y + b.h));
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}
