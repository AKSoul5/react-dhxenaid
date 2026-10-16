/**
 * Decorative foliage by space colonization (Runions et al., 2007).
 *
 * Attraction points are scattered through the canopy silhouette; twigs grow
 * step by step from seeds on the real (genealogical) branches toward the
 * attractors around them, killing attractors as they reach them. The result
 * is natural, ever-finer branching that fills the whole canopy evenly —
 * even when the family itself is small — and leaves are clustered on it.
 *
 * Foliage never covers a name: name boxes repel attractors, block growth
 * and keep leaves out.
 */
import type { Vec } from "./geometry";

export interface Box {
  x: number; // centre
  y: number;
  w: number;
  h: number;
}

export interface FoliageLeaf {
  x: number;
  y: number;
  angle: number;
  size: number;
  tone: number;
}

export interface Foliage {
  /** Twig polylines bucketed by stroke width (fewer SVG elements). */
  twigs: { d: string; w: number }[];
  leaves: FoliageLeaf[];
}

export interface FoliageInput {
  W: number;
  bounds: { x0: number; y0: number; x1: number; y1: number };
  inside: (p: Vec) => boolean;
  seeds: { p: Vec; dir: Vec }[];
  obstacles: Box[];
  /** Attractors are not placed in this region (e.g. the trunk). */
  excluded?: (p: Vec) => boolean;
  rand: () => number;
  attractors?: number;
}

interface GNode {
  p: Vec;
  dir: Vec;
  parent: number;
  seed: boolean;
  children: number;
}

const f = (n: number) => n.toFixed(1);

export function growFoliage(input: FoliageInput): Foliage {
  const { W, bounds, inside, seeds, obstacles, rand } = input;
  if (!seeds.length) return { twigs: [], leaves: [] };
  const Di = W * 0.09; // influence radius
  const Dk = W * 0.016; // kill distance
  const step = W * 0.0095;
  const hit = (p: Vec, pad: number) =>
    obstacles.some((b) => Math.abs(p.x - b.x) < b.w / 2 + pad && Math.abs(p.y - b.y) < b.h / 2 + pad);

  // ── attractors ───────────────────────────────────────────────────────
  const target = input.attractors ?? 1100;
  const attractors: Vec[] = [];
  for (let tries = 0; attractors.length < target && tries < target * 25; tries++) {
    const p = {
      x: bounds.x0 + rand() * (bounds.x1 - bounds.x0),
      y: bounds.y0 + rand() * (bounds.y1 - bounds.y0),
    };
    if (!inside(p) || hit(p, W * 0.012) || input.excluded?.(p)) continue;
    attractors.push(p);
  }

  // ── growth ───────────────────────────────────────────────────────────
  const nodes: GNode[] = seeds.map((s) => ({ p: s.p, dir: s.dir, parent: -1, seed: true, children: 0 }));
  const grid = new Map<string, number[]>();
  const key = (x: number, y: number) => `${Math.floor(x / Di)},${Math.floor(y / Di)}`;
  const addToGrid = (i: number) => {
    const k = key(nodes[i].p.x, nodes[i].p.y);
    const list = grid.get(k);
    if (list) list.push(i); else grid.set(k, [i]);
  };
  nodes.forEach((_, i) => addToGrid(i));
  const near = (p: Vec, r: number): number => {
    let best = -1;
    let bestD = r * r;
    const gx = Math.floor(p.x / Di), gy = Math.floor(p.y / Di);
    for (let ox = -1; ox <= 1; ox++) {
      for (let oy = -1; oy <= 1; oy++) {
        for (const i of grid.get(`${gx + ox},${gy + oy}`) ?? []) {
          const dx = nodes[i].p.x - p.x, dy = nodes[i].p.y - p.y;
          const d = dx * dx + dy * dy;
          if (d < bestD) {
            bestD = d;
            best = i;
          }
        }
      }
    }
    return best;
  };

  let live = attractors;
  for (let iter = 0; iter < 160 && live.length && nodes.length < 6000; iter++) {
    const pull = new Map<number, Vec>();
    for (const a of live) {
      const i = near(a, Di);
      if (i < 0) continue;
      const dx = a.x - nodes[i].p.x, dy = a.y - nodes[i].p.y;
      const l = Math.hypot(dx, dy) || 1;
      const acc = pull.get(i) ?? { x: 0, y: 0 };
      acc.x += dx / l;
      acc.y += dy / l;
      pull.set(i, acc);
    }
    if (!pull.size) break;
    const born: number[] = [];
    for (const [i, acc] of pull) {
      const n = nodes[i];
      let dx = acc.x + n.dir.x * 0.4 + (rand() - 0.5) * 0.35;
      let dy = acc.y + n.dir.y * 0.4 + (rand() - 0.5) * 0.35 - 0.12; // slight upward habit
      const l = Math.hypot(dx, dy) || 1;
      dx /= l;
      dy /= l;
      const p = { x: n.p.x + dx * step, y: n.p.y + dy * step };
      if (hit(p, W * 0.004)) continue;
      nodes.push({ p, dir: { x: dx, y: dy }, parent: i, seed: false, children: 0 });
      n.children++;
      addToGrid(nodes.length - 1);
      born.push(nodes.length - 1);
    }
    if (!born.length) break;
    live = live.filter((a) => near(a, Dk) < 0);
  }

  // ── pipe-model thickness (children always come after parents) ────────
  const weight = nodes.map(() => 1);
  for (let i = nodes.length - 1; i >= 0; i--) {
    const p = nodes[i].parent;
    if (p >= 0) weight[p] += weight[i];
  }
  const widthOf = (i: number) => Math.min(W * 0.013, W * 0.0007 + W * 0.00028 * Math.sqrt(weight[i]));

  // ── smooth twig chains as quadratic segments, bucketed by width ──────
  const buckets = new Map<number, string[]>();
  const mid = (a: Vec, b: Vec) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i];
    if (n.parent < 0) continue;
    const p = nodes[n.parent];
    const w = widthOf(i);
    const bucket = Math.round(w / (W * 0.0008));
    const start = p.parent >= 0 ? mid(nodes[p.parent].p, p.p) : p.p;
    const end = n.children ? mid(p.p, n.p) : n.p;
    const seg = `M${f(start.x)} ${f(start.y)}Q${f(p.p.x)} ${f(p.p.y)} ${f(end.x)} ${f(end.y)}`;
    const list = buckets.get(bucket);
    if (list) list.push(seg); else buckets.set(bucket, [seg]);
  }
  const twigs = [...buckets.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([b, segs]) => ({ w: b * W * 0.0008, d: segs.join("") }));

  // ── leaves: fans at the tips, alternating along the twigs ────────────
  const leaves: FoliageLeaf[] = [];
  const deg = (dx: number, dy: number) => (Math.atan2(dy, dx) * 180) / Math.PI;
  const place = (n: GNode, turn: number, size: number) => {
    const a = Math.atan2(n.dir.y, n.dir.x) + turn;
    const c = { x: n.p.x + Math.cos(a) * size * 0.5, y: n.p.y + Math.sin(a) * size * 0.5 };
    if (hit(c, size * 0.45) || !inside(c)) return;
    leaves.push({ x: c.x, y: c.y, angle: deg(Math.cos(a), Math.sin(a)), size, tone: Math.floor(rand() * 4) });
  };
  nodes.forEach((n, i) => {
    const size = W * (0.016 + rand() * 0.009);
    if (n.seed) {
      // a few leaves along the real branches too
      if (rand() < 0.7) place(n, (i % 2 ? 1 : -1) * (1 + rand() * 0.4), size);
      return;
    }
    if (!n.children) {
      // a lush fan at every tip
      for (const t of [-1.05, -0.5, 0, 0.5, 1.05]) place(n, t + (rand() - 0.5) * 0.3, size * (t === 0 ? 1.12 : 0.95));
    } else {
      place(n, (i % 2 ? 1 : -1) * (0.85 + rand() * 0.45), size);
      if (rand() < 0.45) place(n, (i % 2 ? -1 : 1) * (0.9 + rand() * 0.45), size * 0.9);
    }
  });
  return { twigs, leaves };
}
