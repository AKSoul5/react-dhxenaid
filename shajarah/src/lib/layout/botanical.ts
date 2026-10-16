/**
 * Botanical poster layout engine.
 *
 * Turns a family (members + lineage edges) into the geometry of a
 * traditional nasab poster: a trunk carrying the ancestral chain, a crown
 * (canopy) growing from the branching ancestor, side branches for brothers
 * of trunk ancestors, curved tapered branches, and name tags that never
 * overlap.
 *
 * Pipeline
 *  1. Build the lineage hierarchy (d3-hierarchy) from father/mother links.
 *  2. Split it into the TRUNK (the ancestral chain from the root to the
 *     crown base) and the CROWN (the crown base's descendants). The crown
 *     base is chosen by the user (FamilyTree.crownBaseId); otherwise it is
 *     the first ancestor with more than one line of descent.
 *     - Trunk members are therefore derived, never stored: a member is on
 *       the trunk exactly when they are an ancestor of the crown base.
 *     - Very long chains (e.g. back to Adam) show the nearest ancestors on
 *       the trunk; older ones go into an engraved "lineage" text panel.
 *     - Brothers of trunk ancestors become stubs (no descendants) or side
 *       branches with their own small canopy (with descendants).
 *  3. Partition layout: every crown node gets a slice of a 0..1 "u" axis
 *     proportional to (leaf count)^0.8. u is mapped to an angle around the
 *     crown base by ARC LENGTH of the crown outline, so the rim fills
 *     evenly. Sibling order is preserved, so branches never cross.
 *  4. Radius: a blend of generation depth and "how far this sub-branch
 *     still has to grow", scaled to the crown outline in that direction.
 *  5. Collision relaxation over every tag (crown, side branches, fixed
 *     trunk obstacles): overlaps are resolved along the axis of least
 *     penetration with springs back to the targets.
 *  6. Branch geometry: each edge is a cubic Bézier whose start continues
 *     the parent's growth direction and whose end leans upward. Width ∝
 *     sqrt(descendant leaves) (pipe model), drawn as a filled taper.
 *  7. Every childless member is a "leaf" node (leaf blade, circle or oval,
 *     per the chosen shape) with the name on it; members with descendants
 *     sit at their branch forks. No decorative leaves: each leaf is a person.
 *
 * All coordinates are in abstract poster units (default 2400 × 3394, the
 * ISO-216 aspect ratio), so the same layout scales to any A-size paper.
 */
import { hierarchy, type HierarchyNode } from "d3-hierarchy";
import { childrenIndex } from "../genealogy";
import type { MemberDTO, TreeDTO } from "../types";
import { add, len, norm, ribbonPath, scale, sub, type Cubic, type Vec } from "./geometry";
import { mulberry32 } from "./random";

export type NodeShape = "leaf" | "circle" | "oval";
export type LabelMode = "name" | "withFather";

export interface LayoutOptions {
  width?: number;
  height?: number;
  showFemales?: boolean;
  seed?: number;
  /** Eldest on the right (Arabic reading order). Auto-detected when omitted. */
  rtl?: boolean;
  /** Where the canopy starts. Defaults to tree.crownBaseId, then automatic. */
  crownBaseId?: string | null;
  nodeShape?: NodeShape;
  labelMode?: LabelMode;
  showYears?: boolean;
  /** Ancestors written on the trunk before the rest move to the lineage panel. */
  maxTrunkLabels?: number;
  /** Branch thickness multiplier (line-art themes use thin branches). */
  branchScale?: number;
}

export type PosterShape = "medallion" | "pill" | "leaf" | "circle" | "oval";

export interface PosterNode {
  id: string;
  member: MemberDTO;
  x: number;
  y: number;
  /** Depth below the crown base (1 = main limbs, 0 = base / trunk items). */
  depth: number;
  generation: number;
  w: number;
  h: number;
  fontSize: number;
  shape: PosterShape;
  label: string;
  subLabel: string | null;
  /** True for members without (visible) children. */
  terminal: boolean;
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
  label: string;
  x: number;
  y: number;
  w: number;
  h: number;
  fontSize: number;
}

export interface LineagePanel {
  lines: string[];
  x: number;
  y: number;
  width: number;
  fontSize: number;
  lineHeight: number;
  /** Number of ancestors written in the panel. */
  count: number;
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
  lineage: LineagePanel | null;
  base: PosterNode | null;
  stubs: PosterNode[];
  nodes: PosterNode[];
  branches: { d: string; w: number }[];
  /** Generation of the crown base; legend numbering and colours start here. */
  generationOffset: number;
  /** Generations present on crown / side-branch tags (for the legend). */
  generationsPresent: number[];
  stats: { total: number; males: number; females: number; placed: number; unplaced: number };
}

interface TNode {
  member: MemberDTO | null; // null = virtual root joining several roots
  children: TNode[];
}

type HNode = HierarchyNode<TNode> & { u?: number; u0?: number; u1?: number };

type Region = "crown" | "side" | "fixed";
type LiveNode = PosterNode & {
  tx: number; ty: number; mass: number; region: Region; side: number;
};

const ARABIC = /[؀-ۿ]/;
const UP: Vec = { x: 0, y: -1 };
const HONORIFICS = /^(عليه السلام|رضي الله عنه|رحمه الله|صلى الله عليه وسلم)$/;

export function computePosterLayout(tree: TreeDTO, opts: LayoutOptions = {}): PosterLayout {
  const W = opts.width ?? 2400;
  const H = opts.height ?? Math.round(W * Math.SQRT2);
  const seed = opts.seed ?? tree.settings?.seed ?? 7;
  const showFemales = opts.showFemales ?? tree.settings?.showFemales ?? false;
  const nodeShape = opts.nodeShape ?? "leaf";
  const labelMode = opts.labelMode ?? "name";
  const showYears = opts.showYears ?? false;
  const rand = mulberry32(seed);
  const rr = (a: number, b: number) => a + (b - a) * rand();

  const visible = showFemales ? tree.members : tree.members.filter((m) => m.gender !== "FEMALE");
  const byMemberId = new Map(tree.members.map((m) => [m.id, m]));
  const stats = {
    total: tree.members.length,
    males: tree.members.filter((m) => m.gender === "MALE").length,
    females: tree.members.filter((m) => m.gender === "FEMALE").length,
    placed: 0,
    unplaced: 0,
  };

  // ── Geometry of the poster ────────────────────────────────────────────
  // A long ancestral chain needs a taller base band for the lineage panel.
  const geometry = (tallBase: boolean) => {
    const c = tallBase
      ? { cx: W / 2, cy: H * 0.37, rx: W * 0.44, ry: H * 0.275, exponent: 2.4 }
      : { cx: W / 2, cy: H * 0.39, rx: W * 0.44, ry: H * 0.295, exponent: 2.4 };
    return { crown: c, origin: { x: c.cx, y: c.cy + c.ry * 0.8 } as Vec, groundY: H * (tallBase ? 0.79 : 0.835) };
  };
  let { crown, origin, groundY } = geometry(false);
  const trunkWidth = W * 0.075;
  const margin = W * 0.045;

  const empty: PosterLayout = {
    width: W, height: H, rtl: true, crown, origin, groundY,
    trunkPath: trunkOutline(origin, groundY, trunkWidth), trunkWidth,
    barkLines: [], trunkLabels: [], lineage: null, base: null, stubs: [], nodes: [],
    branches: [], generationOffset: 0, generationsPresent: [], stats,
  };
  if (visible.length === 0) return empty;

  // ── 1. Lineage hierarchy ──────────────────────────────────────────────
  const index = childrenIndex(visible, tree.lineage);
  const seen = new Set<string>();
  const build = (m: MemberDTO): TNode => {
    seen.add(m.id); // guards against cycles
    const kids = (index.get(m.id) ?? []).filter((c) => !seen.has(c.id));
    return { member: m, children: kids.map(build) };
  };
  const explicitRoot = visible.find((m) => m.id === tree.rootMemberId);
  let rootT: TNode;
  if (explicitRoot) {
    rootT = build(explicitRoot);
  } else {
    // Largest connected lineage wins; parentless in-laws stay off the poster.
    const candidates = (index.get(null) ?? []).map((r) => {
      const t = build(r);
      return { t, size: countNodes(t) };
    });
    candidates.sort((a, b) => b.size - a.size);
    rootT = candidates[0]?.t ?? build(visible[0]);
  }
  const root = hierarchy<TNode>(rootT, (d) => d.children).count() as HNode;

  const rtl = opts.rtl ?? ARABIC.test(root.data.member?.name ?? tree.title ?? "");
  // Children are in sibling order (eldest first); on RTL posters the eldest
  // sits on the right, i.e. at the end of the u axis.
  if (rtl) root.each((n) => n.children?.reverse());

  // Label text for a member, honouring the label mode and years option.
  const labelOf = (m: MemberDTO) => {
    let label = m.name;
    if (labelMode === "withFather") {
      const f = m.fatherId ? byMemberId.get(m.fatherId) : undefined;
      if (f) label = ARABIC.test(m.name) ? `${m.name} ${m.gender === "FEMALE" ? "بنت" : "بن"} ${f.name}` : `${m.name} ${f.name}`;
    }
    let subLabel: string | null = null;
    if (showYears && (m.birthYear || m.deathYear)) {
      const fmt = (y: number | null) => (y == null ? "" : rtl ? y.toLocaleString("ar-SA", { useGrouping: false }) : String(y));
      subLabel = m.deathYear ? `${fmt(m.birthYear)}–${fmt(m.deathYear)}` : fmt(m.birthYear);
    }
    return { label, subLabel };
  };

  // ── 2. Trunk chain, crown base and offshoots ─────────────────────────
  const crownBaseId = opts.crownBaseId !== undefined ? opts.crownBaseId : tree.crownBaseId;
  const explicitBase = crownBaseId
    ? (root.descendants() as HNode[]).find((n) => n.data.member?.id === crownBaseId)
    : undefined;
  let chain: HNode[];
  let base: HNode;
  if (explicitBase) {
    base = explicitBase;
    chain = base.ancestors().reverse() as HNode[];
  } else {
    chain = [root];
    base = root;
    while (base.children?.length) {
      const kids = base.children as HNode[];
      const main = kids.reduce((a, b) => ((b.value ?? 0) > (a.value ?? 0) ? b : a));
      const others = kids.filter((k) => k !== main);
      if (kids.length === 1 || (others.every((k) => !k.children) && others.length <= 2 && main.children)) {
        chain.push(main);
        base = main;
      } else break;
    }
  }
  const chainSet = new Set(chain);

  // Trunk capacity: the nearest ancestors are written on the trunk, older
  // ones move to the lineage panel.
  const baseMedallionR = trunkWidth * 0.62;
  const trunkChain = chain.filter((n) => n !== base && n.data.member);
  const capacityFor = () =>
    opts.maxTrunkLabels ??
    Math.max(2, Math.floor((groundY - trunkWidth * 0.55 - (origin.y + baseMedallionR + trunkWidth * 0.4)) / 40) + 1);
  if (trunkChain.length > capacityFor()) ({ crown, origin, groundY } = geometry(true));
  const labelTop = origin.y + baseMedallionR + trunkWidth * 0.4;
  const labelBottom = groundY - trunkWidth * 0.55;
  const capacity = capacityFor();
  const ancient = trunkChain.slice(0, Math.max(0, trunkChain.length - capacity));
  const shownTrunk = trunkChain.slice(ancient.length);
  const shownSet = new Set(shownTrunk);

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
  const thetaStart = Math.PI + 0.32;
  const thetaEnd = -0.32;
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

  // ── Node sizing (shared by crown and side branches) ──────────────────
  const crownNodes = (base.descendants() as HNode[]).filter((n) => n !== base);
  const offshoots: { node: HNode; anchor: HNode }[] = [];
  for (const c of chain) {
    if (c === base) continue;
    for (const k of (c.children ?? []) as HNode[]) if (!chainSet.has(k)) offshoots.push({ node: k, anchor: c });
  }
  const sideCount = offshoots
    .filter((o) => o.node.children && shownSet.has(o.anchor))
    .reduce((s, o) => s + o.node.descendants().length, 0);
  const placedCount = crownNodes.length + sideCount;
  const baseFont = clamp(30 * Math.sqrt(300 / Math.max(placedCount, 40)), 13, 40);

  const nodes: LiveNode[] = [];
  const byId = new Map<string, LiveNode>();

  const makeNode = (
    n: HNode, p: Vec, depth: number, from: Vec, region: Region, side: number,
  ): LiveNode => {
    const m = n.data.member!;
    const { label, subLabel } = labelOf(m);
    const medallion = depth === 1 && region === "crown";
    const terminal = !n.children;
    let fs = medallion ? baseFont * 1.15 : baseFont * Math.max(0.62, 1 - 0.07 * Math.max(0, depth - 2));
    const subH = subLabel ? fs * 0.8 : 0;
    let shape: PosterShape;
    let w: number, h: number, angle = 0, leafLength = 0, leafWidth = 0;
    if (medallion) {
      shape = "medallion";
      const tw = Math.max(textWidth(label, fs), subLabel ? textWidth(subLabel, fs * 0.7) : 0);
      w = h = Math.max(fs * 2.7, tw + fs * 0.9) + subH * 0.5;
    } else if (terminal && nodeShape === "leaf") {
      // Point the leaf away from its parent, leaning slightly upward.
      shape = "leaf";
      fs *= 0.9;
      const e = norm(add(scale(norm(sub(p, from)), 0.8), scale(UP, 0.2)));
      angle = deg(e);
      const tw = Math.max(textWidth(label, fs), subLabel ? textWidth(subLabel, fs * 0.7) : 0);
      leafLength = tw + fs * 1.9;
      leafWidth = Math.max(fs * 1.6 + subH, leafLength * 0.36);
      const c = Math.abs(e.x), sn = Math.abs(e.y);
      w = leafLength * c + leafWidth * sn;
      h = leafLength * sn + leafWidth * c;
    } else {
      const tw = Math.max(textWidth(label, fs), subLabel ? textWidth(subLabel, fs * 0.7) : 0);
      if (nodeShape === "circle") {
        shape = "circle";
        w = h = Math.max(tw + fs * 0.8, fs * 2.1 + subH);
      } else if (nodeShape === "oval") {
        shape = "oval";
        w = tw + fs * 1.5;
        h = fs * 1.75 + subH;
      } else {
        shape = "pill";
        w = tw + fs * 0.9;
        h = fs * 1.45 + subH;
      }
    }
    const node: LiveNode = {
      id: m.id, member: m, x: p.x, y: p.y, tx: p.x, ty: p.y, depth,
      generation: m.generation, w, h, fontSize: fs, shape, label, subLabel, terminal,
      angle, leafLength, leafWidth, leafCount: n.value ?? 1,
      parentId: n.parent?.data.member?.id ?? null,
      mass: medallion ? 4 : 1, region, side,
    };
    nodes.push(node);
    byId.set(node.id, node);
    return node;
  };

  // ── 4. Crown target positions ────────────────────────────────────────
  const maxDepth = Math.max(1, base.height);
  // Small families get a smaller crown instead of a few long bare limbs.
  const crownScale = clamp(0.3 + 0.7 * Math.sqrt(crownNodes.length / 120), 0.4, 1);
  const r0 = W * 0.1;
  for (const n of crownNodes) {
    const d = n.depth - base.depth;
    const halfSpan = ((n.u1 ?? 0) - (n.u0 ?? 0)) / 2;
    const u = (n.u ?? 0.5) + (d >= 2 ? (rand() - 0.5) * 0.5 * halfSpan : 0);
    const theta = uToTheta(u);
    const t = 0.55 * (d / maxDepth) + 0.45 * (d / (d + n.height));
    const R = reach(theta) * 0.95 * crownScale;
    const p = add(origin, scale(dirOf(theta), r0 + t * Math.max(0, R - r0)));
    const parent = byId.get(n.parent?.data.member?.id ?? "");
    makeNode(n, p, d, parent ? { x: parent.tx, y: parent.ty } : origin, "crown", 0);
  }

  // ── Trunk labels ─────────────────────────────────────────────────────
  const slots = shownTrunk.length;
  const spacing = slots > 1 ? (labelBottom - labelTop) / (slots - 1) : 0;
  const trunkFont = clamp(Math.min(trunkWidth * 0.36, spacing * 0.7 || trunkWidth * 0.36), 14, 60);
  const trunkLabels: TrunkLabel[] = shownTrunk.map((n, i) => {
    const m = n.data.member!;
    const fs = i === 0 && !ancient.length ? trunkFont * 1.2 : trunkFont;
    const label = m.name;
    return {
      member: m, label, x: origin.x, fontSize: fs,
      y: slots > 1 ? labelBottom - i * spacing : (labelTop + labelBottom) / 2,
      w: textWidth(label, fs) + fs * 1.2, h: fs * 1.5,
    };
  });
  const labelY = new Map(trunkLabels.map((l) => [l.member.id, l.y]));

  // ── Offshoots: stubs (childless) and side branches (with descendants) ─
  const stubs: PosterNode[] = [];
  const branchesOut: { d: string; w: number }[] = [];
  const stemStart = new Map<string, Vec>();
  const stemDir = new Map<string, Vec>();
  const visibleOffshoots = offshoots.filter((o) => shownSet.has(o.anchor));
  // Alternate sides, starting on the side of the eldest (right in RTL).
  const sideUse = { [-1]: 0, [1]: 0 } as Record<number, number>;
  visibleOffshoots.forEach((o, i) => {
    const y = labelY.get(o.anchor.data.member!.id)!;
    const side = (i % 2 === 0) === rtl ? 1 : -1;
    const stack = sideUse[side]++;
    const m = o.node.data.member!;
    if (!o.node.children) {
      // Stub: a short knob off the trunk carrying one name.
      const y0 = y - trunkFont * 0.6 - (stack % 3) * trunkFont * 0.4;
      const start: Vec = { x: origin.x + side * trunkWidth * 0.42, y: y0 };
      const reachX = trunkWidth * (1.45 + Math.floor(stack / 3) * 0.9);
      const end: Vec = { x: origin.x + side * reachX, y: y0 - trunkWidth * 0.55 };
      const curve: Cubic = {
        p0: start, c1: add(start, { x: side * trunkWidth * 0.5, y: 0 }),
        c2: add(end, { x: -side * trunkWidth * 0.2, y: trunkWidth * 0.25 }), p1: end,
      };
      branchesOut.push({ d: ribbonPath(curve, trunkWidth * 0.2, trunkWidth * 0.1), w: trunkWidth });
      const fs = trunkFont * 0.62;
      const { label, subLabel } = labelOf(m);
      const size = Math.max(fs * 3.2, textWidth(label, fs) + fs);
      const stub: LiveNode = {
        id: m.id, member: m, x: end.x, y: end.y, tx: end.x, ty: end.y, depth: 0,
        generation: m.generation, w: size, h: size, fontSize: fs, shape: "medallion", label,
        subLabel, terminal: true, angle: 0, leafLength: 0, leafWidth: 0, leafCount: 1,
        parentId: o.anchor.data.member!.id, mass: 1e6, region: "fixed", side,
      };
      stubs.push(stub);
      nodes.push(stub); // fixed obstacle for the relaxation
      return;
    }
    // Side branch: a small canopy fanning outward-upward from the trunk.
    const sub0 = o.node.descendants() as HNode[];
    const leaves = o.node.value ?? 1;
    const reachR = clamp(W * 0.06 * Math.sqrt(leaves), W * 0.1, W * 0.3);
    const A: Vec = { x: origin.x + side * trunkWidth * 0.45, y: y - trunkFont * 0.3 };
    const depthMax = Math.max(1, o.node.height + 1);
    const a0 = side > 0 ? 1.25 : Math.PI - 1.25; // up-and-out
    const a1 = side > 0 ? -0.3 : Math.PI + 0.3;  // out-and-slightly-down
    partition(o.node, 0, 1);
    stemStart.set(m.id, A);
    stemDir.set(m.id, norm({ x: side * 0.8, y: -0.6 }));
    for (const n of sub0) {
      const d = n.depth - o.node.depth + 1;
      const theta = a0 + (a1 - a0) * (n.u ?? 0.5);
      const r = reachR * (0.3 + 0.7 * (d / depthMax));
      let p = add(A, scale(dirOf(theta), r));
      p = { x: clamp(p.x, margin, W - margin), y: Math.min(p.y, groundY - W * 0.03) };
      const parent = byId.get(n.parent?.data.member?.id ?? "");
      makeNode(n, p, d + 1, parent ? { x: parent.tx, y: parent.ty } : A, "side", side);
    }
  });

  // Trunk labels and the base medallion are fixed obstacles too.
  for (const l of trunkLabels) {
    nodes.push({
      ...fixedObstacle(l.member, l.x, l.y, Math.max(l.w, trunkWidth * 0.9), l.h),
    });
  }

  // ── 5. Collision relaxation ──────────────────────────────────────────
  const constrain = (n: LiveNode) => {
    if (n.region === "fixed") return;
    const half = Math.max(n.w, n.h) / 2;
    // keep clear of the base medallion
    const d = { x: n.x - origin.x, y: n.y - origin.y };
    const dist = Math.hypot(d.x, d.y);
    const minD = baseMedallionR + half + 4;
    if (dist < minD) {
      const k = minD / (dist || 1);
      n.x = origin.x + d.x * k;
      n.y = origin.y + (dist ? d.y * k : -minD);
    }
    const trunkClear = trunkWidth * 0.6 + n.w / 2;
    if (n.region === "crown") {
      if (n.y > origin.y && Math.abs(n.x - origin.x) < trunkClear) n.y = origin.y;
      if (!insideCrown(n, -half * 0.6)) {
        n.x += (origin.x - n.x) * 0.04;
        n.y += (crown.cy - n.y) * 0.04;
      }
    } else {
      // side branches stay on their side of the trunk, on the page, above ground
      if (n.y > origin.y - trunkWidth && (n.x - origin.x) * n.side < trunkClear) {
        n.x = origin.x + n.side * trunkClear;
      }
      n.y = Math.min(n.y, groundY - n.h / 2 - W * 0.01);
    }
    n.x = clamp(n.x, margin + n.w / 2, W - margin - n.w / 2);
    n.y = Math.max(n.y, H * 0.1 + n.h / 2);
  };
  relax(nodes, constrain);

  // ── 6. Branches ──────────────────────────────────────────────────────
  const growing = nodes.filter((n) => n.region !== "fixed");
  const totalLeaves = Math.max(1, base.value ?? 1);
  const bs = opts.branchScale ?? 1;
  const wMin = W * 0.0018;
  const wK = Math.min((trunkWidth * 0.8 - wMin) / Math.sqrt(totalLeaves), W * 0.016) * bs;
  const widthOf = (leaves: number) => wMin + wK * Math.sqrt(leaves);
  const growth = new Map<string, Vec>();
  const branches: { d: string; w: number }[] = [...branchesOut];

  for (const node of growing) {
    const parent = node.parentId ? byId.get(node.parentId) : undefined;
    const P: Vec = parent && parent.region !== "fixed" ? parent : (stemStart.get(node.id) ?? origin);
    const gP = (node.parentId && growth.get(node.parentId)) || stemDir.get(node.id) || UP;
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
    const limb = node.depth === 1;
    const s = norm(add(scale(gP, limb ? 0.55 : 0.6), scale(dv, limb ? 0.45 : 0.4)));
    const e = norm(add(scale(dv, 0.72), scale(UP, 0.28)));
    const curve: Cubic = { p0: P, c1: add(P, scale(s, L * 0.42)), c2: sub(C, scale(e, L * 0.33)), p1: C };
    growth.set(node.id, e);
    const w = widthOf(node.leafCount);
    branches.push({ d: ribbonPath(curve, limb ? w * 1.15 : w, w * 0.7), w });
  }
  // Thick limbs first so thin branches (and their junctions) sit on top.
  branches.sort((a, b) => b.w - a.w);

  // ── Base medallion ───────────────────────────────────────────────────
  let baseNode: PosterNode | null = null;
  if (base.data.member) {
    const m = base.data.member;
    const fs = clamp(trunkWidth * 0.36, 16, 64);
    const { label, subLabel } = labelOf(m);
    baseNode = {
      id: m.id, member: m, x: origin.x, y: origin.y, depth: 0, generation: m.generation,
      w: baseMedallionR * 2, h: baseMedallionR * 2, fontSize: fs, shape: "medallion",
      label: m.name, subLabel: label === m.name ? subLabel : null, terminal: !base.children,
      angle: 0, leafLength: 0, leafWidth: 0, leafCount: base.value ?? 1,
      parentId: base.parent?.data.member?.id ?? null,
    };
  }

  // ── Lineage panel for ancestors that do not fit on the trunk ─────────
  let lineage: LineagePanel | null = null;
  if (ancient.length) {
    const names = [shownTrunk[0], ...[...ancient].reverse()]
      .filter(Boolean)
      .map((n) => withLaqab(n.data.member!));
    const joiner = rtl ? " بن " : " son of ";
    const width = W * 0.36;
    const top = groundY + W * 0.075;
    const avail = H - W * 0.065 - top;
    let fs = 30;
    let lines: string[] = [];
    for (; fs > 12; fs -= 1) {
      lines = wrapWords(names.join(joiner).split(" "), width - fs, fs);
      if (lines.length * fs * 1.55 + fs * 2.4 <= avail) break;
    }
    lineage = { lines, x: W / 2, y: top, width, fontSize: fs, lineHeight: fs * 1.55, count: ancient.length };
  }

  // ── Bark texture ─────────────────────────────────────────────────────
  const barkLines: string[] = [];
  for (let i = 0; i < 9; i++) {
    const x = origin.x + (rand() - 0.5) * trunkWidth * 0.75;
    const y0 = origin.y + rr(0.05, 0.4) * (groundY - origin.y);
    const y1 = y0 + rr(0.15, 0.4) * (groundY - origin.y);
    const wob = (rand() - 0.5) * trunkWidth * 0.12;
    barkLines.push(`M${x.toFixed(1)} ${y0.toFixed(1)}Q${(x + wob).toFixed(1)} ${((y0 + y1) / 2).toFixed(1)} ${x.toFixed(1)} ${Math.min(y1, groundY).toFixed(1)}`);
  }

  const gens = new Set<number>();
  for (const n of growing) if (n.shape !== "medallion") gens.add(n.generation);

  const placed = growing.length + stubs.length + trunkLabels.length + ancient.length + (baseNode ? 1 : 0);
  stats.placed = placed;
  stats.unplaced = Math.max(0, visible.length - placed);

  const strip = ({ tx: _tx, ty: _ty, mass: _m, region: _r, side: _s, ...rest }: LiveNode): PosterNode => rest;
  return {
    ...empty,
    // geometry may have switched to the tall-base variant
    crown, origin, groundY,
    trunkPath: trunkOutline(origin, groundY, trunkWidth),
    rtl,
    trunkLabels,
    lineage,
    barkLines,
    base: baseNode,
    stubs: stubs.map((s) => strip(s as LiveNode)),
    nodes: growing.map(strip),
    branches,
    generationOffset: base.data.member?.generation ?? 0,
    generationsPresent: [...gens].sort((a, b) => a - b),
  };
}

// ── helpers ─────────────────────────────────────────────────────────────

function fixedObstacle(m: MemberDTO, x: number, y: number, w: number, h: number): LiveNode {
  return {
    id: `trunk:${m.id}`, member: m, x, y, tx: x, ty: y, depth: 0, generation: m.generation,
    w, h, fontSize: 0, shape: "pill", label: m.name, subLabel: null, terminal: false,
    angle: 0, leafLength: 0, leafWidth: 0, leafCount: 1, parentId: null,
    mass: 1e6, region: "fixed", side: 0,
  };
}

function withLaqab(m: MemberDTO): string {
  if (!m.laqab) return m.name;
  return HONORIFICS.test(m.laqab.trim()) ? `${m.name} ${m.laqab}` : `${m.name} (${m.laqab})`;
}

/** Greedy word wrap using the label width estimator. */
function wrapWords(words: string[], width: number, fs: number): string[] {
  const lines: string[] = [];
  let cur = "";
  for (const word of words) {
    const next = cur ? `${cur} ${word}` : word;
    if (cur && textWidth(next, fs) > width) {
      lines.push(cur);
      cur = word;
    } else cur = next;
  }
  if (cur) lines.push(cur);
  return lines;
}

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

type Body = { x: number; y: number; tx: number; ty: number; w: number; h: number; mass: number };

/**
 * Pushes overlapping label boxes apart. Uses a uniform grid for neighbour
 * lookup (O(n) per sweep) and resolves each overlap along its axis of least
 * penetration, mass-weighted so medallions and fixed obstacles barely move.
 * Springs pull nodes back toward their targets so branch order is kept.
 */
export function relax<T extends Body>(nodes: T[], constrain: (n: T) => void, iterations = 120) {
  if (nodes.length === 0) return;
  const gap = 3;
  const cell = Math.max(...nodes.map((n) => Math.max(n.w, n.h))) + gap;
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
            if (a.mass >= 1e6 && b.mass >= 1e6) continue;
            const dx = b.x - a.x, dy = b.y - a.y;
            const px = (a.w + b.w) / 2 + gap - Math.abs(dx);
            const py = (a.h + b.h) / 2 + gap - Math.abs(dy);
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
