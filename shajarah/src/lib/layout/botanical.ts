/**
 * Botanical poster layout engine.
 *
 * Turns a family (members + lineage edges) into the geometry of a
 * traditional nasab poster: a trunk carrying the ancestral chain, a crown
 * whose limbs are the sons of the first branching ancestor, curved tapered
 * branches, leaves, and colour-coded name tags that never overlap.
 *
 * Pipeline
 *  1. Build the lineage hierarchy (d3-hierarchy) from father/mother links.
 *  2. Split it into TRUNK (the single-child ancestral chain, with childless
 *     siblings drawn as small stubs) and CROWN (everything above the first
 *     real fork).
 *  3. Partition layout: every crown node gets a slice of a 0..1 "u" axis
 *     proportional to (leaf count)^0.8. u is mapped to an angle around the
 *     crown base by ARC LENGTH of the crown outline, so the outer rim is
 *     filled evenly even though the crown is not a circle. Sibling order is
 *     preserved, so branches can never cross.
 *  4. Radius: a blend of absolute generation depth and "how far this
 *     sub-branch still has to grow", scaled to the crown outline in that
 *     direction — short lineages still reach out, long ones get room.
 *  5. Collision relaxation: label boxes are pushed apart (axis of least
 *     overlap) with springs back to their targets, kept inside the crown.
 *  6. Branch geometry: each edge is a cubic Bézier whose start tangent
 *     continues the parent's growth direction and whose end tangent leans
 *     upward — this produces the "rise, then spread" look of a real tree.
 *     Width ∝ sqrt(descendant leaves) (pipe model), drawn as a filled taper.
 *  7. Leaves: every childless crown member is drawn as a leaf with the
 *     name written along it, pointing away from its parent. Members with
 *     descendants appear as tags at their branch forks. There are no
 *     decorative leaves — every leaf on the poster is a person.
 *
 * All coordinates are in abstract poster units (default 2400 × 3394, the
 * ISO-216 aspect ratio), so the same layout scales to any A-size paper.
 */
import { hierarchy, type HierarchyNode } from "d3-hierarchy";
import { childrenIndex } from "../genealogy";
import type { MemberDTO, TreeDTO } from "../types";
import {
  add, cubicLength, cubicPoint, cubicTangent, len, norm, perp, ribbonPath,
  rotate, scale, sub, type Cubic, type Vec,
} from "./geometry";
import { mulberry32 } from "./random";

export interface LayoutOptions {
  width?: number;
  height?: number;
  showFemales?: boolean;
  seed?: number;
  /** Eldest on the right (Arabic reading order). Auto-detected when omitted. */
  rtl?: boolean;
}

export interface PosterNode {
  id: string;
  member: MemberDTO;
  x: number;
  y: number;
  /** Depth below the crown base (1 = main limbs). 0 for the base itself. */
  depth: number;
  generation: number;
  w: number;
  h: number;
  fontSize: number;
  shape: "medallion" | "pill" | "leaf";
  /** Leaf orientation in degrees (leaf points along +x before rotation). */
  angle: number;
  /** Leaf blade size; w/h are the axis-aligned bounds used for collisions. */
  leafLength: number;
  leafWidth: number;
  leafCount: number;
  parentId: string | null;
}

export interface TrunkLabel {
  member: MemberDTO;
  x: number;
  y: number;
  fontSize: number;
}

export interface PosterLayout {
  width: number;
  height: number;
  rtl: boolean;
  crown: { cx: number; cy: number; rx: number; ry: number; exponent: number };
  origin: Vec;
  groundY: number;
  trunkPath: string;
  trunkWidth: number;
  barkLines: string[];
  trunkLabels: TrunkLabel[];
  base: PosterNode | null;
  stubs: PosterNode[];
  nodes: PosterNode[];
  branches: string[];
  /** Generations whose colour appears on crown name tags (for the legend). */
  generationsPresent: number[];
  stats: { total: number; males: number; females: number; placed: number; unplaced: number };
}

interface TNode {
  member: MemberDTO | null; // null = virtual root joining several roots
  children: TNode[];
}

type HNode = HierarchyNode<TNode> & {
  u?: number;
  u0?: number;
  u1?: number;
};

const ARABIC = /[؀-ۿ]/;
const UP: Vec = { x: 0, y: -1 };

export function computePosterLayout(tree: TreeDTO, opts: LayoutOptions = {}): PosterLayout {
  const W = opts.width ?? 2400;
  const H = opts.height ?? Math.round(W * Math.SQRT2);
  const seed = opts.seed ?? tree.settings?.seed ?? 7;
  const showFemales = opts.showFemales ?? tree.settings?.showFemales ?? false;
  const rand = mulberry32(seed);
  const rr = (a: number, b: number) => a + (b - a) * rand();

  const visible = showFemales ? tree.members : tree.members.filter((m) => m.gender !== "FEMALE");
  const stats = {
    total: tree.members.length,
    males: tree.members.filter((m) => m.gender === "MALE").length,
    females: tree.members.filter((m) => m.gender === "FEMALE").length,
    placed: 0,
    unplaced: 0,
  };

  // ── Geometry of the poster ────────────────────────────────────────────
  const crown = { cx: W / 2, cy: H * 0.39, rx: W * 0.44, ry: H * 0.295, exponent: 2.4 };
  const origin: Vec = { x: crown.cx, y: crown.cy + crown.ry * 0.8 };
  const groundY = H * 0.835;
  const trunkWidth = W * 0.075;

  const empty: PosterLayout = {
    width: W, height: H, rtl: true, crown, origin, groundY,
    trunkPath: trunkOutline(origin, groundY, trunkWidth), trunkWidth,
    barkLines: [], trunkLabels: [], base: null, stubs: [], nodes: [],
    branches: [], generationsPresent: [], stats,
  };
  if (visible.length === 0) return empty;

  // ── 1. Lineage hierarchy ──────────────────────────────────────────────
  const index = childrenIndex(visible, tree.lineage);
  const seen = new Set<string>();
  const build = (m: MemberDTO): TNode => {
    // iterative-safe enough for genealogies; `seen` guards against cycles
    seen.add(m.id);
    const kids = (index.get(m.id) ?? []).filter((c) => !seen.has(c.id));
    return { member: m, children: kids.map(build) };
  };
  const roots = index.get(null) ?? [];
  const explicitRoot = visible.find((m) => m.id === tree.rootMemberId);
  let rootT: TNode;
  if (explicitRoot) {
    rootT = build(explicitRoot);
  } else {
    // Largest connected lineage wins; parentless in-laws stay off the poster.
    const candidates = roots.map((r) => {
      const t = build(r);
      return { t, size: countNodes(t) };
    });
    candidates.sort((a, b) => b.size - a.size);
    rootT = candidates[0]?.t ?? build(visible[0]);
  }
  const root = hierarchy<TNode>(rootT, (d) => d.children).count() as HNode;
  stats.placed = root.descendants().length;
  stats.unplaced = visible.length - stats.placed;

  const rtl = opts.rtl ?? ARABIC.test(root.data.member?.name ?? tree.title ?? "");
  // hierarchy children are in sibling order (eldest first); for RTL posters
  // the eldest sits on the right, i.e. at the end of the u axis.
  if (rtl) root.each((n) => n.children?.reverse());

  // ── 2. Trunk chain and stubs ──────────────────────────────────────────
  const chain: HNode[] = [root];
  const stubNodes: HNode[] = [];
  let base: HNode = root;
  while (base.children?.length) {
    const kids = base.children as HNode[];
    const main = kids.reduce((a, b) => ((b.value ?? 0) > (a.value ?? 0) ? b : a));
    const others = kids.filter((k) => k !== main);
    const othersAreTwigs = others.every((k) => !k.children);
    if (kids.length === 1 || (othersAreTwigs && others.length <= 2 && main.children)) {
      stubNodes.push(...others);
      chain.push(main);
      base = main;
    } else break;
  }

  // ── 3. Arc-length parameterisation of the crown outline ──────────────
  const insideCrown = (p: Vec, inflate = 0) =>
    Math.abs((p.x - crown.cx) / (crown.rx + inflate)) ** crown.exponent +
      Math.abs((p.y - crown.cy) / (crown.ry + inflate)) ** crown.exponent <= 1;
  const dirOf = (theta: number): Vec => ({ x: Math.cos(theta), y: -Math.sin(theta) });
  const reach = (theta: number) => {
    let lo = 0, hi = Math.max(crown.rx, crown.ry) * 2.5;
    const d = dirOf(theta);
    for (let i = 0; i < 30; i++) {
      const mid = (lo + hi) / 2;
      if (insideCrown(add(origin, scale(d, mid)))) lo = mid; else hi = mid;
    }
    return lo;
  };
  const thetaStart = Math.PI + 0.32; // left, slightly drooping
  const thetaEnd = -0.32;            // right, slightly drooping
  const SAMPLES = 360;
  const thetas: number[] = [];
  const cum: number[] = [0];
  let prevPt: Vec | null = null;
  for (let i = 0; i <= SAMPLES; i++) {
    const th = thetaStart + (thetaEnd - thetaStart) * (i / SAMPLES);
    const pt = add(origin, scale(dirOf(th), reach(th)));
    thetas.push(th);
    if (prevPt) cum.push(cum[cum.length - 1] + len(sub(pt, prevPt)));
    prevPt = pt;
  }
  const total = cum[cum.length - 1];
  const uToTheta = (u: number) => {
    const target = Math.min(1, Math.max(0, u)) * total;
    let lo = 0, hi = cum.length - 1;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (cum[mid] < target) lo = mid; else hi = mid;
    }
    const t = (target - cum[lo]) / (cum[hi] - cum[lo] || 1);
    return thetas[lo] + (thetas[hi] - thetas[lo]) * t;
  };

  // ── Partition the u axis ─────────────────────────────────────────────
  const partition = (node: HNode, u0: number, u1: number) => {
    node.u0 = u0;
    node.u1 = u1;
    node.u = (u0 + u1) / 2;
    const kids = (node.children ?? []) as HNode[];
    if (!kids.length) return;
    const weights = kids.map((k) => Math.pow(k.value ?? 1, 0.8) + 0.35);
    const sum = weights.reduce((a, b) => a + b, 0);
    let a = u0;
    kids.forEach((k, i) => {
      const span = ((u1 - u0) * weights[i]) / sum;
      partition(k, a, a + span);
      a += span;
    });
  };
  partition(base, 0.015, 0.985);

  // ── 4. Target positions + label sizes ────────────────────────────────
  const crownNodes = (base.descendants() as HNode[]).filter((n) => n !== base);
  const maxDepth = Math.max(1, base.height);
  // Small families get a smaller crown instead of a few long bare limbs.
  const crownScale = clamp(0.3 + 0.7 * Math.sqrt(crownNodes.length / 120), 0.4, 1);
  const baseFont = clamp(30 * Math.sqrt(300 / Math.max(crownNodes.length, 40)), 13, 40);
  const r0 = W * 0.1;
  const baseMedallionR = trunkWidth * 0.62;

  const nodes: (PosterNode & { tx: number; ty: number; mass: number })[] = [];
  const byId = new Map<string, (typeof nodes)[number]>();
  for (const n of crownNodes) {
    const m = n.data.member!;
    const d = n.depth - base.depth;
    const halfSpan = ((n.u1 ?? 0) - (n.u0 ?? 0)) / 2;
    const u = (n.u ?? 0.5) + (d >= 2 ? (rand() - 0.5) * 0.5 * halfSpan : 0);
    const theta = uToTheta(u);
    const tA = d / maxDepth;
    const tB = d / (d + n.height);
    const t = 0.55 * tA + 0.45 * tB;
    const R = reach(theta) * 0.95 * crownScale;
    const r = r0 + t * Math.max(0, R - r0);
    const p = add(origin, scale(dirOf(theta), r));
    const medallion = d === 1;
    const isLeaf = !medallion && !n.children;
    let fs = d === 1 ? baseFont * 1.15 : baseFont * Math.max(0.62, 1 - 0.07 * (d - 2));
    let w: number, h: number, angle = 0, leafLength = 0, leafWidth = 0;
    if (isLeaf) {
      // Point the leaf away from its parent, leaning slightly upward.
      fs *= 0.9;
      const parentT = byId.get(n.parent?.data.member?.id ?? "");
      const from: Vec = parentT ? { x: parentT.tx, y: parentT.ty } : origin;
      const e = norm(add(scale(norm(sub(p, from)), 0.8), scale(UP, 0.2)));
      angle = deg(e);
      leafLength = textWidth(m.name, fs) + fs * 1.9;
      leafWidth = Math.max(fs * 1.6, leafLength * 0.36);
      const c = Math.abs(e.x), sn = Math.abs(e.y);
      w = leafLength * c + leafWidth * sn;
      h = leafLength * sn + leafWidth * c;
    } else {
      const tw = textWidth(m.name, fs);
      w = medallion ? Math.max(fs * 2.7, tw + fs * 0.9) : tw + fs * 0.9;
      h = medallion ? w : fs * 1.45;
    }
    const node = {
      id: m.id, member: m, x: p.x, y: p.y, tx: p.x, ty: p.y, depth: d,
      generation: m.generation, w, h, fontSize: fs,
      shape: (medallion ? "medallion" : isLeaf ? "leaf" : "pill") as PosterNode["shape"],
      angle, leafLength, leafWidth,
      leafCount: n.value ?? 1, parentId: n.parent?.data.member?.id ?? null,
      mass: medallion ? 4 : 1,
    };
    nodes.push(node);
    byId.set(node.id, node);
  }

  // ── 5. Collision relaxation ──────────────────────────────────────────
  relax(nodes, { origin, baseR: baseMedallionR, trunkWidth, insideCrown, crown });

  // ── 6. Branches ──────────────────────────────────────────────────────
  const totalLeaves = Math.max(1, base.value ?? 1);
  const wMin = W * 0.0018;
  const wK = Math.min((trunkWidth * 0.8 - wMin) / Math.sqrt(totalLeaves), W * 0.016);
  const widthOf = (leaves: number) => wMin + wK * Math.sqrt(leaves);
  const growth = new Map<string | null, Vec>();
  const baseId = base.data.member?.id ?? null;
  growth.set(baseId, UP);

  const branches: { d: string; w: number }[] = [];

  const posOf = (id: string | null): Vec =>
    id === baseId || id === null ? origin : (byId.get(id) as Vec);

  for (const n of crownNodes) {
    const node = byId.get(n.data.member!.id)!;
    const P = posOf(node.parentId);
    const gP = growth.get(node.parentId) ?? UP;
    if (node.shape === "leaf") {
      // A thin stalk from the parent to the base of the leaf blade.
      const a = (node.angle * Math.PI) / 180;
      const dir: Vec = { x: Math.cos(a), y: Math.sin(a) };
      const B = sub(node, scale(dir, node.leafLength / 2 - node.fontSize * 0.1));
      const L = len(sub(B, P)) || 1;
      const s = norm(add(scale(gP, 0.5), scale(norm(sub(B, P)), 0.5)));
      const curve: Cubic = { p0: P, c1: add(P, scale(s, L * 0.4)), c2: sub(B, scale(dir, L * 0.3)), p1: B };
      branches.push({ d: ribbonPath(curve, widthOf(1), wMin * 0.8, 10), w: widthOf(1) });
      continue;
    }
    const C: Vec = node;
    const v = sub(C, P);
    const L = len(v) || 1;
    const dv = scale(v, 1 / L);
    const s = norm(add(scale(gP, node.depth === 1 ? 0.55 : 0.6), scale(dv, node.depth === 1 ? 0.45 : 0.4)));
    const e = norm(add(scale(dv, 0.72), scale(UP, 0.28)));
    const curve: Cubic = { p0: P, c1: add(P, scale(s, L * 0.42)), c2: sub(C, scale(e, L * 0.33)), p1: C };
    growth.set(node.id, e);
    const w = widthOf(node.leafCount);
    const wStart = node.depth === 1 ? w * 1.15 : w;
    branches.push({ d: ribbonPath(curve, wStart, w * 0.7), w });
  }
  // Thick limbs first so thin branches (and their junctions) sit on top.
  branches.sort((a, b) => b.w - a.w);

  // ── Trunk, ancestral chain labels and stubs ──────────────────────────
  const trunkChain = chain.filter((n) => n !== base && n.data.member);
  const trunkLabels: TrunkLabel[] = [];
  const labelTop = origin.y + baseMedallionR + trunkWidth * 0.35;
  const labelBottom = groundY - trunkWidth * 0.55;
  const slots = trunkChain.length;
  const spacing = slots > 1 ? (labelBottom - labelTop) / (slots - 1) : 0;
  const trunkFont = clamp(Math.min(trunkWidth * 0.36, spacing * 0.72 || trunkWidth * 0.36), 14, 60);
  // chain[0] is the eldest ancestor → bottom of the trunk
  trunkChain.forEach((n, i) => {
    const y = slots > 1 ? labelBottom - i * spacing : (labelTop + labelBottom) / 2;
    trunkLabels.push({ member: n.data.member!, x: origin.x, y, fontSize: i === 0 ? trunkFont * 1.25 : trunkFont });
  });

  const stubs: PosterNode[] = [];
  stubNodes.forEach((s, i) => {
    const parentId = s.parent?.data.member?.id;
    const anchor = trunkLabels.find((l) => l.member.id === parentId);
    const side = (i % 2 === 0) === rtl ? 1 : -1;
    const y0 = (anchor?.y ?? labelBottom) - trunkFont * 0.6 - Math.floor(i / 2) * trunkFont * 2.4;
    const start: Vec = { x: origin.x + side * trunkWidth * 0.42, y: y0 };
    const end: Vec = { x: origin.x + side * trunkWidth * 1.45, y: y0 - trunkWidth * 0.55 };
    const curve: Cubic = {
      p0: start, c1: add(start, { x: side * trunkWidth * 0.5, y: 0 }),
      c2: add(end, { x: -side * trunkWidth * 0.2, y: trunkWidth * 0.25 }), p1: end,
    };
    branches.push({ d: ribbonPath(curve, trunkWidth * 0.2, trunkWidth * 0.1), w: trunkWidth });
    const m = s.data.member!;
    const fs = trunkFont * 0.62;
    const size = Math.max(fs * 3.2, textWidth(m.name, fs) + fs);
    stubs.push({
      id: m.id, member: m, x: end.x, y: end.y, depth: 0, generation: m.generation,
      w: size, h: size, fontSize: fs, shape: "medallion", angle: 0, leafLength: 0, leafWidth: 0, leafCount: 1, parentId: parentId ?? null,
    });
  });

  let baseNode: PosterNode | null = null;
  if (base.data.member) {
    const m = base.data.member;
    const fs = clamp(trunkWidth * 0.36, 16, 64);
    baseNode = {
      id: m.id, member: m, x: origin.x, y: origin.y, depth: 0, generation: m.generation,
      w: baseMedallionR * 2, h: baseMedallionR * 2, fontSize: fs, shape: "medallion",
      angle: 0, leafLength: 0, leafWidth: 0,
      leafCount: base.value ?? 1, parentId: base.parent?.data.member?.id ?? null,
    };
  }

  const barkLines: string[] = [];
  for (let i = 0; i < 9; i++) {
    const x = origin.x + (rand() - 0.5) * trunkWidth * 0.75;
    const y0 = origin.y + rr(0.05, 0.4) * (groundY - origin.y);
    const y1 = y0 + rr(0.15, 0.4) * (groundY - origin.y);
    const wob = (rand() - 0.5) * trunkWidth * 0.12;
    barkLines.push(`M${x.toFixed(1)} ${y0.toFixed(1)}Q${(x + wob).toFixed(1)} ${((y0 + y1) / 2).toFixed(1)} ${x.toFixed(1)} ${Math.min(y1, groundY).toFixed(1)}`);
  }

  // Only crown tags are colour-coded, so the legend lists crown generations.
  const gens = new Set<number>();
  for (const n of nodes) if (n.depth > 1) gens.add(n.generation);

  return {
    ...empty,
    rtl,
    trunkLabels,
    barkLines,
    base: baseNode,
    stubs,
    nodes: nodes.map(({ tx: _tx, ty: _ty, mass: _m, ...rest }) => rest),
    branches: branches.map((b) => b.d),
    generationsPresent: [...gens].sort((a, b) => a - b),
  };
}

// ── helpers ─────────────────────────────────────────────────────────────

/** Trunk silhouette: narrow under the crown, flaring into roots at the ground. */
function trunkOutline(o: Vec, groundY: number, w: number): string {
  const h = groundY - o.y;
  const f = (n: number) => n.toFixed(1);
  const L = (dx: number) => f(o.x - dx);
  const R = (dx: number) => f(o.x + dx);
  return [
    `M${L(w * 0.62)} ${f(o.y - w * 0.15)}`,
    `C${L(w * 0.5)} ${f(o.y + h * 0.35)} ${L(w * 0.5)} ${f(o.y + h * 0.7)} ${L(w * 0.85)} ${f(groundY - w * 0.08)}`,
    `C${L(w * 1.05)} ${f(groundY)} ${L(w * 1.6)} ${f(groundY + w * 0.12)} ${L(w * 2.0)} ${f(groundY + w * 0.18)}`,
    `L${R(w * 2.0)} ${f(groundY + w * 0.18)}`,
    `C${R(w * 1.6)} ${f(groundY + w * 0.12)} ${R(w * 1.05)} ${f(groundY)} ${R(w * 0.85)} ${f(groundY - w * 0.08)}`,
    `C${R(w * 0.5)} ${f(o.y + h * 0.7)} ${R(w * 0.5)} ${f(o.y + h * 0.35)} ${R(w * 0.62)} ${f(o.y - w * 0.15)}`,
    `Q${f(o.x)} ${f(o.y - w * 0.7)} ${L(w * 0.62)} ${f(o.y - w * 0.15)}Z`,
  ].join("");
}

function countNodes(t: TNode): number {
  let n = 0;
  const stack = [t];
  while (stack.length) {
    const cur = stack.pop()!;
    n++;
    stack.push(...cur.children);
  }
  return n;
}

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

const deg = (v: Vec) => (Math.atan2(v.y, v.x) * 180) / Math.PI;

/** Approximate rendered width of a label in Amiri (naskh) or Latin text. */
export function textWidth(text: string, fontSize: number): number {
  let w = 0;
  for (const ch of text) w += ARABIC.test(ch) ? 0.46 : ch === " " ? 0.28 : 0.52;
  return Math.max(w, 1.2) * fontSize;
}

interface RelaxCtx {
  origin: Vec;
  baseR: number;
  trunkWidth: number;
  crown: { cx: number; cy: number; rx: number; ry: number };
  insideCrown: (p: Vec, inflate?: number) => boolean;
}

/**
 * Pushes overlapping label boxes apart. Uses a uniform grid for neighbour
 * lookup (O(n) per sweep) and resolves each overlap along its axis of least
 * penetration, mass-weighted so main-limb medallions barely move. Springs
 * pull nodes back toward their ideal targets so branch order is preserved.
 */
export function relax(
  nodes: { x: number; y: number; tx: number; ty: number; w: number; h: number; mass: number }[],
  ctx: RelaxCtx,
  iterations = 120,
) {
  if (nodes.length === 0) return;
  const margin = 3;
  const cell = Math.max(...nodes.map((n) => Math.max(n.w, n.h))) + margin;
  const constrain = (n: (typeof nodes)[number]) => {
    // keep clear of the base medallion
    const d = { x: n.x - ctx.origin.x, y: n.y - ctx.origin.y };
    const dist = Math.hypot(d.x, d.y);
    const minD = ctx.baseR + Math.max(n.w, n.h) / 2 + 4;
    if (dist < minD) {
      const k = minD / (dist || 1);
      n.x = ctx.origin.x + d.x * k;
      n.y = ctx.origin.y + (dist ? d.y * k : -minD);
    }
    // keep out of the trunk below the crown base
    if (n.y > ctx.origin.y && Math.abs(n.x - ctx.origin.x) < ctx.trunkWidth + n.w / 2) {
      n.y = ctx.origin.y;
    }
    // stay inside the crown outline
    if (!ctx.insideCrown(n, -Math.max(n.w, n.h) * 0.3)) {
      n.x += (ctx.origin.x - n.x) * 0.04;
      n.y += (ctx.crown.cy - n.y) * 0.04;
    }
  };
  const separate = () => {
    const grid = new Map<string, number[]>();
    nodes.forEach((n, i) => {
      const key = `${Math.floor(n.x / cell)},${Math.floor(n.y / cell)}`;
      const list = grid.get(key);
      if (list) list.push(i); else grid.set(key, [i]);
    });
    let moved = 0;
    nodes.forEach((a, i) => {
      const gx = Math.floor(a.x / cell), gy = Math.floor(a.y / cell);
      for (let ox = -1; ox <= 1; ox++) {
        for (let oy = -1; oy <= 1; oy++) {
          for (const j of grid.get(`${gx + ox},${gy + oy}`) ?? []) {
            if (j <= i) continue;
            const b = nodes[j];
            const dx = b.x - a.x, dy = b.y - a.y;
            const px = (a.w + b.w) / 2 + margin - Math.abs(dx);
            const py = (a.h + b.h) / 2 + margin - Math.abs(dy);
            if (px <= 0 || py <= 0) continue;
            moved++;
            const ma = b.mass / (a.mass + b.mass);
            const mb = a.mass / (a.mass + b.mass);
            if (px < py) {
              const s = dx === 0 ? (i % 2 ? 1 : -1) : Math.sign(dx);
              a.x -= s * px * ma;
              b.x += s * px * mb;
            } else {
              const s = dy === 0 ? (j % 2 ? 1 : -1) : Math.sign(dy);
              a.y -= s * py * ma;
              b.y += s * py * mb;
            }
          }
        }
      }
    });
    return moved;
  };

  for (let it = 0; it < iterations; it++) {
    const spring = it < iterations * 0.6 ? 0.06 : 0.015;
    for (const n of nodes) {
      n.x += (n.tx - n.x) * spring;
      n.y += (n.ty - n.y) * spring;
      constrain(n);
    }
    separate();
  }
  // Final clean-up: pure separation until no overlaps remain.
  for (let it = 0; it < 200 && separate() > 0; it++);
}
