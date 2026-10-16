// Vector / Bézier helpers used by the botanical layout.

export interface Vec {
  x: number;
  y: number;
}

export const add = (a: Vec, b: Vec): Vec => ({ x: a.x + b.x, y: a.y + b.y });
export const sub = (a: Vec, b: Vec): Vec => ({ x: a.x - b.x, y: a.y - b.y });
export const scale = (a: Vec, k: number): Vec => ({ x: a.x * k, y: a.y * k });
export const len = (a: Vec) => Math.hypot(a.x, a.y);
export const norm = (a: Vec): Vec => {
  const l = len(a) || 1;
  return { x: a.x / l, y: a.y / l };
};
export const rotate = (a: Vec, rad: number): Vec => ({
  x: a.x * Math.cos(rad) - a.y * Math.sin(rad),
  y: a.x * Math.sin(rad) + a.y * Math.cos(rad),
});
export const perp = (a: Vec): Vec => ({ x: -a.y, y: a.x });

export interface Cubic {
  p0: Vec;
  c1: Vec;
  c2: Vec;
  p1: Vec;
}

export function cubicPoint({ p0, c1, c2, p1 }: Cubic, t: number): Vec {
  const u = 1 - t;
  const a = u * u * u, b = 3 * u * u * t, c = 3 * u * t * t, d = t * t * t;
  return { x: a * p0.x + b * c1.x + c * c2.x + d * p1.x, y: a * p0.y + b * c1.y + c * c2.y + d * p1.y };
}

export function cubicTangent({ p0, c1, c2, p1 }: Cubic, t: number): Vec {
  const u = 1 - t;
  const a = 3 * u * u, b = 6 * u * t, c = 3 * t * t;
  return norm({
    x: a * (c1.x - p0.x) + b * (c2.x - c1.x) + c * (p1.x - c2.x),
    y: a * (c1.y - p0.y) + b * (c2.y - c1.y) + c * (p1.y - c2.y),
  });
}

export function cubicLength(curve: Cubic, steps = 12): number {
  let total = 0;
  let prev = curve.p0;
  for (let i = 1; i <= steps; i++) {
    const p = cubicPoint(curve, i / steps);
    total += len(sub(p, prev));
    prev = p;
  }
  return total;
}

const f = (n: number) => (Math.round(n * 10) / 10).toString();

/**
 * Turns a Bézier spine into a filled, tapered "ribbon" outline — a branch
 * whose width goes from `w0` at the start to `w1` at the end. Filled shapes
 * (rather than stroked paths) give the organic taper of hand-drawn branches
 * and export cleanly to every vector format.
 */
export function ribbonPath(curve: Cubic, w0: number, w1: number, samples = 14): string {
  const left: Vec[] = [];
  const right: Vec[] = [];
  for (let i = 0; i <= samples; i++) {
    const t = i / samples;
    const p = cubicPoint(curve, t);
    const n = perp(cubicTangent(curve, t));
    // ease-out taper reads more natural than a linear one
    const w = (w0 + (w1 - w0) * (1 - (1 - t) * (1 - t))) / 2;
    left.push(add(p, scale(n, w)));
    right.push(add(p, scale(n, -w)));
  }
  const pts = [...left, ...right.reverse()];
  return `M${pts.map((p) => `${f(p.x)} ${f(p.y)}`).join("L")}Z`;
}

export function fmt(n: number): string {
  return f(n);
}
