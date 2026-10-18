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
 *     - Three tiers along the ancestral chain: SOIL (ancestors older than
 *       FamilyTree.trunkStartId, inscribed as text in the soil among the
 *       roots), TRUNK (stacked medallions — one column, or a zigzag of two
 *       when the chain is long, with the canopy giving up height), CANOPY.
 *       Without a trunk start, the nearest ancestors go on the trunk and
 *       the rest into the soil.
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
import { childrenIndex, lineagePath } from "../genealogy";
import type { MemberDTO, TreeDTO } from "../types";
import {
  add, circlePath, cubicPoint as cubicPointAt, cubicTangent, len, norm, ribbonPath, scale, sub,
  type Cubic, type Vec,
} from "./geometry";
import { validateRelationships, type ClarityReport } from "./clarity";
import { growFoliage, type Box, type Foliage } from "./foliage";
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
  /**
   * Focus on one branch: only this person, their ancestors (on the trunk)
   * and their descendants (the canopy). Defaults to settings.focusId.
   */
  focusId?: string | null;
  /** Where the canopy starts. Defaults to tree.crownBaseId, then automatic. */
  crownBaseId?: string | null;
  nodeShape?: NodeShape;
  labelMode?: LabelMode;
  showYears?: boolean;
  /** Where the trunk starts; older ancestors go into the soil. Defaults to tree.trunkStartId. */
  trunkStartId?: string | null;
  /** In automatic mode: ancestors on the trunk before the rest move into the soil. */
  maxTrunkLabels?: number;
  /** Branch thickness multiplier (line-art themes use thin branches). */
  branchScale?: number;
  /** Decorative twigs and leaves filling the canopy (roundel/oval names only). */
  foliage?: boolean;
  /** Reserve the top corners for the verse / hadith medallions. */
  cornerMedallions?: boolean;
  /** Top of the canopy as a fraction of the height (room for a header). */
  headerBand?: number;
  /**
   * The poster sits inside a frame artwork: keep the tree, header and
   * panels clear of its corner flourishes and mid-side rosettes.
   */
  framed?: boolean;
  /** Daughters are drawn as capsules even where sons are leaves. */
  femaleCapsule?: boolean;
  /** Printed width of the poster (mm); legibility is judged at this size. Default A2 (420). */
  paperWidthMm?: number;
  /** Smallest acceptable printed text size (mm, font size). Default 3.2 mm ≈ 9 pt. */
  minTextMm?: number;
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
  /**
   * Which major lineage this person belongs to (index, in order around the
   * canopy), for branch colouring; null for the trunk, the crown base and
   * childless sons of the crown base.
   */
  lineage?: number | null;
}

/**
 * One drawn parent → child connection, as its centreline (sampled), so the
 * relationship-clarity check can verify where every line starts, ends and
 * what it passes.
 */
export interface Edge {
  parentId: string;
  childId: string;
  points: Vec[];
  /** Stroke width at the start and the end. */
  w0: number;
  w1: number;
  /** The child's lineage (see PosterNode.lineage). */
  lineage?: number | null;
}

export interface Branch {
  d: string;
  w: number;
  lineage?: number | null;
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

/** Ancient ancestors inscribed in the foundation panel below the trunk. */
export interface SoilInscription {
  /** The ground line the trunk stands on (an open path, stroked). */
  ground: string;
  /** Fine roots from the trunk base down to the panel. */
  roots: string[];
  /** One baseline per line of text (render with <textPath>). */
  lines: { path: string; text: string }[];
  fontSize: number;
  /** Bounds of the panel that carries the text. */
  box: { x: number; y: number; w: number; h: number };
  /** Ancestors inscribed (0 when a custom soil text is used). */
  count: number;
  custom: boolean;
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
  trunkLabels: TrunkLabel[];
  soil: SoilInscription | null;
  /** Trunk medallions are staggered in two columns (long trunks). */
  trunkZigzag: boolean;
  base: PosterNode | null;
  stubs: PosterNode[];
  nodes: PosterNode[];
  /** Branch outlines (filled with bark), with an optional light-side highlight. */
  branches: Branch[];
  /** Centrelines of every drawn parent → child connection. */
  edges: Edge[];
  /** Soft silhouette around the canopy (balanced oval). */
  canopy: string | null;
  /** Decorative twigs and leaves (null when names are leaves themselves). */
  foliage: Foliage | null;
  /** Roots spreading over the ground from the trunk base. */
  surfaceRoots: Branch[];
  /** Circular corner medallions (verse / hadith), when reserved. */
  medallions: { x: number; y: number; r: number }[];
  /** Placement of the header and the footer line (key and counts). */
  frame: {
    framed: boolean;
    /** y of the basmala and title baselines, and the widest title allowed. */
    header: { basmala: number; title: number; maxTitleWidth: number };
    footerY: number;
  };
  /**
   * Whether every name prints at least `minTextMm` high on the chosen paper.
   * When not, `scaleNeeded` is how much larger the paper must be.
   */
  legibility: { minTextMm: number; smallestTextMm: number; ok: boolean; scaleNeeded: number };
  /** Name tags still overlapping after relaxation (0 for a valid layout). */
  overlaps: number;
  /** Relationship-clarity check of the drawn connections (see clarity.ts). */
  clarity: ClarityReport;
  /** Set when the poster shows one branch only (see LayoutOptions.focusId). */
  focus: { id: string; label: string } | null;
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
  /** Crown nodes: the angular sector (around the crown base) of their sub-branch. */
  sector?: [number, number];
  /** Crown nodes: the ray (angle from the crown base) the name sits on. */
  ray?: number;
};

const ARABIC = /[؀-ۿ]/;
const UP: Vec = { x: 0, y: -1 };
const HONORIFICS = /^(عليه السلام|رضي الله عنه|رحمه الله|صلى الله عليه وسلم)$/;

/**
 * Lays out the poster, then verifies it: the space estimate can be
 * optimistic for very dense families, so if any names still overlap after
 * relaxation the layout is redone with slightly smaller type. Legibility is
 * reported from the type actually used, so a family that only fits by going
 * below the minimum is flagged rather than silently shrunk.
 */
export function computePosterLayout(tree: TreeDTO, opts: LayoutOptions = {}): PosterLayout {
  // Each attempt is verified for overlapping names AND for relationship
  // clarity (every line from the right parent to the right child, none
  // hidden under another name, no ambiguous crossings). Ambiguity means the
  // names are too crowded, so the next attempt gives each one more room.
  const badness = (l: PosterLayout) => l.overlaps * 10 + l.clarity.issues.length;
  const attempt = (scale: number, final = false) => {
    const layout = layoutAttempt(tree, opts, scale, final);
    layout.clarity = validateRelationships(layout, tree);
    return layout;
  };
  const isClean = (l: PosterLayout) => l.overlaps === 0 && l.clarity.ok;
  const tried = new Map<number, PosterLayout>();
  const at = (scale: number) => {
    const key = Math.round(scale * 1000) / 1000;
    if (!tried.has(key)) tried.set(key, attempt(key));
    return tried.get(key)!;
  };
  // the largest clean scale in (lo, hi], given that lo is clean
  const bisect = (lo: number, hi: number) => {
    for (let i = 0; i < 2; i++) {
      const mid = (lo + hi) / 2;
      if (isClean(at(mid))) lo = mid; else hi = mid;
    }
    return lo;
  };
  let chosen = 1;
  const full = at(1);
  if (!isClean(full)) {
    // the smallest scale at which the names are still legible
    const legibleScale = clamp((full.legibility.minTextMm / Math.max(1e-6, full.legibility.smallestTextMm)) * 1.02, 0.35, 1);
    if (legibleScale < 0.999 && isClean(at(legibleScale))) chosen = bisect(legibleScale, 1);
    else if (isClean(at(0.35))) chosen = bisect(0.35, legibleScale); // clean only below legible size
    else {
      // nothing is clean: prefer no overlapping names, then legible text,
      // then the fewest ambiguities (and the editor recommends a larger size)
      const rank = (l: PosterLayout) => (l.overlaps > 0 ? 2e6 : 0) + (l.legibility.ok ? 0 : 1e6) + badness(l);
      chosen = [...tried.entries()].sort((a, b) => rank(a[1]) - rank(b[1]) || b[0] - a[0])[0][0];
    }
  }
  // decorative foliage is only grown for the chosen layout
  if (opts.foliage) return attempt(chosen, true);
  return at(chosen);
}


function layoutAttempt(tree: TreeDTO, opts: LayoutOptions, fontScale: number, final = true): PosterLayout {
  const W = opts.width ?? 2400;
  const H = opts.height ?? Math.round(W * Math.SQRT2);
  const seed = opts.seed ?? tree.settings?.seed ?? 7;
  const showFemales = opts.showFemales ?? tree.settings?.showFemales ?? false;
  const nodeShape = opts.nodeShape ?? "leaf";
  const labelMode = opts.labelMode ?? "name";
  const showYears = opts.showYears ?? false;
  const rand = mulberry32(seed);
  const rr = (a: number, b: number) => a + (b - a) * rand();

  // "Hide daughters" only applies where the line runs through fathers: in a
  // matrilineal tree the women ARE the line, and hiding them would detach
  // their children.
  let visible = showFemales || tree.lineage === "MATRILINEAL"
    ? tree.members
    : tree.members.filter((m) => m.gender !== "FEMALE");
  const byMemberId = new Map(tree.members.map((m) => [m.id, m]));
  // Focus: one branch of the family on its own poster (for families too
  // large to draw clearly on one sheet): the person's ancestors and
  // descendants only, with the canopy starting at the person.
  const requestedFocus = opts.focusId !== undefined ? opts.focusId : (tree.settings?.focusId ?? null);
  const focusMember = requestedFocus ? byMemberId.get(requestedFocus) : undefined;
  let counted = tree.members;
  if (focusMember) {
    const { ancestors, descendants } = lineagePath(tree.members, tree.lineage, focusMember.id);
    const keep = new Set([focusMember.id, ...ancestors, ...descendants]);
    // the focused person is drawn even when daughters are otherwise hidden
    const shown = new Set(visible);
    visible = tree.members.filter((m) => keep.has(m.id) && (m.id === focusMember.id || shown.has(m)));
    counted = tree.members.filter((m) => keep.has(m.id));
  }
  const stats = {
    total: counted.length,
    males: counted.filter((m) => m.gender === "MALE").length,
    females: counted.filter((m) => m.gender === "FEMALE").length,
    placed: 0,
    unplaced: 0,
  };

  // ── Page budget and legibility ────────────────────────────────────────
  // The genealogy is sized from its content: the largest name size at
  // which canopy, trunk and foundation fit between the header and the
  // footer, and never below the legible minimum for the paper size.
  const framed = !!opts.framed;
  const margin = W * (framed ? 0.1 : 0.05);
  const place = framePlacement(W, H, framed);
  const contentTop = H * (opts.headerBand ?? 0.095);
  // the footer key and counts take ~3.5 lines of W·0.012 text above footerY
  const contentBottom = place.footerY - W * 0.056;
  const unitMm = (opts.paperWidthMm ?? 420) / W;
  const minTextMm = opts.minTextMm ?? 3.2;
  const minFont = minTextMm / unitMm;
  const maxFont = Math.max(minFont * 1.25, W * 0.026);
  let crown = { cx: W / 2, cy: contentTop + H * 0.2, rx: W * 0.4, ry: H * 0.2, exponent: 2.4 };
  let origin: Vec = { x: W / 2, y: contentTop + H * 0.36 };
  let groundY = contentBottom - H * 0.1;
  let trunkWidth = W * 0.06;

  const empty: PosterLayout = {
    width: W, height: H, rtl: true, crown, origin, groundY,
    trunkPath: trunkOutline(origin, groundY, trunkWidth), trunkWidth,
    trunkLabels: [], soil: null, trunkZigzag: false, base: null, stubs: [], nodes: [],
    branches: [], edges: [], canopy: null, foliage: null, surfaceRoots: [], medallions: [],
    frame: place,
    legibility: { minTextMm, smallestTextMm: minTextMm, ok: true, scaleNeeded: 1 },
    overlaps: 0,
    clarity: { ok: true, expected: 0, drawn: 0, clearCrossings: 0, issues: [] },
    focus: null,
    generationOffset: 0, generationsPresent: [], stats,
  };
  if (visible.length === 0) return empty;

  // ── 1. Lineage hierarchy ──────────────────────────────────────────────
  const index = childrenIndex(visible, tree.lineage);
  const seen = new Set<string>();
  const build = (m: MemberDTO): TNode => {
    seen.add(m.id); // guards against cycles
    // Half-siblings stay together: children are grouped by mother (in the
    // order the mothers first appear), keeping birth order within a group.
    const kids = groupByMother((index.get(m.id) ?? []).filter((c) => !seen.has(c.id)));
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
    // A laqab or honorific (الشيخ، رحمه الله …) is a quiet second line.
    const laqab = m.laqab?.trim();
    if (laqab) subLabel = subLabel ? `${laqab} · ${subLabel}` : laqab;
    return { label, subLabel };
  };

  // ── 2. Trunk chain, crown base and offshoots ─────────────────────────
  const crownBaseId = focusMember ? focusMember.id : opts.crownBaseId !== undefined ? opts.crownBaseId : tree.crownBaseId;
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

  // ── Tiers: soil / trunk ──────────────────────────────────────────────
  const trunkChain = chain.filter((n) => n !== base && n.data.member);
  const trunkStartId = opts.trunkStartId !== undefined ? opts.trunkStartId : tree.trunkStartId;
  const startIdx = trunkStartId ? trunkChain.findIndex((n) => n.data.member!.id === trunkStartId) : -1;
  // A custom soil inscription is written for the tree's own trunk start.
  // A branch poster whose ancestry does not pass through it (the person is
  // older than the trunk start) gets its soil from the data instead, so it
  // never repeats ancestors already on its trunk.
  const customSoil = focusMember && trunkStartId && startIdx < 0 ? null : tree.soilText?.trim() || null;

  const crownNodes = (base.descendants() as HNode[]).filter((n) => n !== base);
  const offshoots: { node: HNode; anchor: HNode }[] = [];
  for (const c of chain) {
    if (c === base) continue;
    for (const k of (c.children ?? []) as HNode[]) if (!chainSet.has(k)) offshoots.push({ node: k, anchor: c });
  }

  // Label sizing, shared by the space estimate and the real nodes.
  // Branch heads (sons with descendants on the first ring) are medallions.
  const isMedallion = (n: HNode, depth: number, region: Region) => depth === 1 && region === "crown" && !!n.children?.length;
  const isLeaf = (n: HNode) =>
    !n.children && nodeShape === "leaf" && !(opts.femaleCapsule && n.data.member!.gender === "FEMALE");
  const floorFor = (f: number) => Math.min(f, minFont);
  const fontFor = (depth: number, medallion: boolean, f: number) =>
    medallion ? f * 1.15 : Math.max(floorFor(f), f * Math.max(0.72, 1 - 0.06 * Math.max(0, depth - 2)));
  const estArea = (n: HNode, f: number) => {
    const d = n.depth - base.depth;
    const med = isMedallion(n, d, "crown");
    let fs = fontFor(d, med, f);
    const label = labelOf(n.data.member!).label;
    if (med) return Math.max(fs * 2.7, textWidth(label, fs) + fs * 0.9) ** 2;
    if (isLeaf(n)) {
      fs = Math.max(floorFor(f), fs * 0.9);
      const L = textWidth(label, fs) + fs * 1.9;
      return L * Math.max(fs * 1.6, L * 0.36) * 1.15;
    }
    if (nodeShape === "circle") return (fs * 2.55) ** 2;
    if (nodeShape === "oval") return (textWidth(label, fs) + fs * 1.5) * fs * 1.75;
    return (textWidth(label, fs) + fs * 0.9) * fs * 1.45;
  };

  // Canopy: an egg whose area is the names' area times a packing factor
  // (room for branches and breathing space), as wide as the page allows.
  const PACK = 2.8;
  const ASPECT = 0.82;
  const EGG = 3.3; // area of the egg / (rx·ry)
  const rxMax = W / 2 - margin;
  const crownDims = (f: number) => {
    const A = Math.max(crownNodes.reduce((sum, n) => sum + estArea(n, f), 0) * PACK, (f * 14) ** 2);
    const rx = Math.min(rxMax, Math.sqrt(A / (EGG * ASPECT)));
    return { rx, ry: A / (EGG * rx) };
  };
  const baseText = base.data.member ? labelOf(base.data.member) : { label: "", subLabel: null };
  const baseRFor = (f: number) => {
    const fb = f * 1.3;
    if (!base.data.member) return f;
    const sub = baseText.subLabel ? textWidth(baseText.subLabel, fb * 0.68) / 2 + fb * 0.7 : 0;
    return Math.max(fb * 1.75, textWidth(baseText.label, fb) / 2 + fb * 0.8, sub);
  };
  // Trunk: ancestors stacked one per row at (nearly) the names' size; a
  // two-column zigzag only when one column cannot fit legibly.
  const trunkFontFor = (f: number) => Math.max(floorFor(f), f * 0.95);
  const stepFor = (f: number, zig: boolean) => trunkFontFor(f) * (zig ? 1.05 : 1.75);
  const trunkSection = (count: number, f: number, zig: boolean) => {
    if (!count) return f * 3.5;
    const ft = trunkFontFor(f);
    return ft * 1.4 + (count - 1) * stepFor(f, zig) + ft * 1.5;
  };
  // Foundation: the ancestors older than the trunk, as a paragraph.
  const joiner = rtl ? " بن " : " son of ";
  const soilW = Math.min(W * 0.78, W - 2 * margin);
  const soilTextFor = (onTrunk: HNode[], soil: HNode[]) =>
    customSoil ?? [onTrunk[0], ...[...soil].reverse()].filter(Boolean).map((n) => withLaqab(n.data.member!, rtl)).join(joiner);
  const soilFontFor = (f: number) => Math.max(floorFor(f), Math.min(f * 0.85, maxFont * 0.75));
  const soilLinesFor = (text: string, fs: number) => wrapWords(text.split(" "), soilW - fs * 3, fs);
  const soilHeight = (text: string, f: number) => {
    const fs = soilFontFor(f);
    return f * 0.9 + soilLinesFor(text, fs).length * fs * 1.65 + fs * 1.5;
  };

  type Plan = { onTrunk: HNode[]; soil: HNode[]; zig: boolean };
  const totalFor = (f: number, p: Plan) => {
    const useSoil = p.soil.length > 0 || !!customSoil;
    return 1.8 * crownDims(f).ry + baseRFor(f) + trunkSection(p.onTrunk.length, f, p.zig)
      + (useSoil ? soilHeight(soilTextFor(p.onTrunk, p.soil), f) : f * 0.8);
  };
  const avail = contentBottom - contentTop;
  // Candidate arrangements, most faithful first.
  const plans: Plan[] = [];
  if (startIdx >= 0) {
    const onTrunk = trunkChain.slice(startIdx);
    const soil = trunkChain.slice(0, startIdx);
    plans.push({ onTrunk, soil, zig: false });
    if (onTrunk.length >= 6) plans.push({ onTrunk, soil, zig: true });
  } else {
    // automatic: the nearest ancestors on the trunk, the rest in the foundation
    const most = Math.min(trunkChain.length, opts.maxTrunkLabels ?? 12);
    for (let k = most; k >= Math.min(most, 4); k--) {
      plans.push({ onTrunk: trunkChain.slice(trunkChain.length - k), soil: trunkChain.slice(0, trunkChain.length - k), zig: false });
    }
  }
  const largestFitting = (p: Plan, lo: number, hi: number) => {
    for (let i = 0; i < 28; i++) {
      const mid = (lo + hi) / 2;
      if (totalFor(mid, p) <= avail) lo = mid; else hi = mid;
    }
    return lo;
  };
  const bestF = (p: Plan) => (totalFor(maxFont, p) <= avail ? maxFont : largestFitting(p, minFont, maxFont));
  let plan = plans.find((p) => totalFor(minFont, p) <= avail);
  let f: number;
  if (plan) {
    f = bestF(plan);
    // Two staggered columns (joined by a thread) beat one column when they
    // let every name be set clearly larger.
    const zig = plans.find((p) => p.zig && p.onTrunk === plan!.onTrunk);
    if (zig && !plan.zig) {
      const fz = bestF(zig);
      if (fz > f * 1.25) {
        plan = zig;
        f = fz;
      }
    }
  } else {
    // Cannot fit legibly on this paper: fit anyway, smaller, and report it.
    plan = plans[plans.length - 1];
    f = largestFitting(plan, minFont * 0.2, minFont);
  }
  // A retry (fontScale < 1) keeps the canopy the same size and sets the
  // canopy's names smaller, so each gets more room around it.
  const fl = f * fontScale;
  const trunkZigzag = plan.zig;
  const shownTrunk = plan.onTrunk;
  const ancient = plan.soil;
  const shownSet = new Set(shownTrunk);
  const useSoil = ancient.length > 0 || !!customSoil;

  // Spare height lets the canopy breathe, then the whole is centred.
  let { rx, ry } = crownDims(f);
  let slack = avail - totalFor(f, plan);
  // A small family's canopy spreads out (up to twice its size) and its
  // trunk grows taller, rather than floating in empty paper.
  let stemExtra = 0;
  if (slack > 0) {
    const grow = Math.min((slack * 0.7) / 1.8, ry);
    rx = Math.min(rxMax, rx * (1 + grow / ry));
    ry += grow;
    slack -= grow * 1.8;
    if (!plan.onTrunk.length) {
      stemExtra = Math.min(slack * 0.6, f * 5);
      slack -= stemExtra;
    }
  }
  const top0 = contentTop + Math.max(0, slack) / 2;
  crown = { cx: W / 2, cy: top0 + ry, rx, ry, exponent: 2.4 };
  origin = { x: W / 2, y: crown.cy + 0.8 * ry };
  const baseMedallionR = baseRFor(f);
  const trunkFont = trunkFontFor(f);
  const trunkStep = stepFor(f, trunkZigzag);
  const labelTop = origin.y + baseMedallionR + trunkFont * 1.4;
  const labelBottom = labelTop + Math.max(0, shownTrunk.length - 1) * trunkStep;
  groundY = shownTrunk.length ? labelBottom + trunkFont * 1.5 : origin.y + baseMedallionR + f * 3.5 + stemExtra;
  const badgeW = (n: HNode) => Math.max(textWidth(n.data.member!.name, trunkFont) + trunkFont * 1.7, trunkFont * 3.4);
  const widest = Math.max(0, ...shownTrunk.map(badgeW));
  const medianBadge = shownTrunk.length ? shownTrunk.map(badgeW).sort((a, b) => a - b)[shownTrunk.length >> 1] : 0;
  const TW = clamp(medianBadge * 0.85, f * 2.6, W * 0.12);
  trunkWidth = trunkZigzag ? clamp(widest * 1.3, TW, W * 0.2) : TW;

  // ── 3. Arc-length parameterisation of the crown outline ──────────────
  // Egg-shaped crown, a little narrower at the top than at the bottom.
  const insideCrown = (p: Vec, inflate = 0) => {
    const ny = (p.y - crown.cy) / (crown.ry + inflate);
    const k = 1 + 0.13 * Math.max(-1, Math.min(1, ny));
    return Math.abs((p.x - crown.cx) / ((crown.rx + inflate) * k)) ** crown.exponent + Math.abs(ny) ** crown.exponent <= 1;
  };
  const dirOf = (theta: number): Vec => ({ x: Math.cos(theta), y: -Math.sin(theta) });
  const reachExact = (theta: number) => {
    let lo = 0, hi = Math.max(crown.rx, crown.ry) * 2.5;
    const d = dirOf(theta);
    for (let i = 0; i < 30; i++) {
      const mid = (lo + hi) / 2;
      if (insideCrown(add(origin, scale(d, mid)))) lo = mid; else hi = mid;
    }
    return lo;
  };
  // a little below horizontal on each side, not into the corner by the trunk
  const thetaStart = Math.PI + 0.12;
  const thetaEnd = -0.12;
  // reach() is called very often (ring packing): a lookup table over the
  // crown's angular range, interpolated, instead of a bisection per call
  const REACH_N = 720;
  const reachTable = Array.from({ length: REACH_N + 1 }, (_, i) => reachExact(thetaEnd + ((thetaStart - thetaEnd) * i) / REACH_N));
  const reach = (theta: number) => {
    const t = ((theta - thetaEnd) / (thetaStart - thetaEnd)) * REACH_N;
    if (t <= 0 || t >= REACH_N) return reachExact(theta);
    const i = Math.floor(t);
    return reachTable[i] + (reachTable[i + 1] - reachTable[i]) * (t - i);
  };
  const SAMPLES = 360;
  const thetas: number[] = [];
  const cum: number[] = [0];
  let prevPt: Vec | null = null;
  // u is spread by CAPACITY: how many horizontal names fit side by side
  // along the rim at each angle. At the top a name takes its full width
  // across the ring, on the sides only its height, so the sides take more
  // names and the narrow top is not overfilled.
  let prevCap = 0;
  for (let i = 0; i <= SAMPLES; i++) {
    const th = thetaStart + (thetaEnd - thetaStart) * (i / SAMPLES);
    const R = reach(th);
    const cap = R / (4.2 * Math.abs(Math.sin(th)) + 1.7 * Math.abs(Math.cos(th)));
    thetas.push(th);
    if (prevPt) cum.push(cum[cum.length - 1] + (cap + prevCap) / 2);
    prevPt = add(origin, scale(dirOf(th), R));
    prevCap = cap;
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
    // proportional to the names in each sub-branch, so big families get room
    const weights = kids.map((k) => k.descendants().length);
    const sum = weights.reduce((a, b) => a + b, 0);
    let a = u0;
    kids.forEach((k, i) => {
      const span = ((u1 - u0) * weights[i]) / sum;
      partition(k, a, a + span);
      a += span;
    });
  };
  partition(base, 0.015, 0.985);

  const nodes: LiveNode[] = [];
  const byId = new Map<string, LiveNode>();

  const makeNode = (
    n: HNode, p: Vec, depth: number, from: Vec, region: Region, side: number,
  ): LiveNode => {
    const m = n.data.member!;
    const { label, subLabel } = labelOf(m);
    const medallion = isMedallion(n, depth, region);
    const terminal = !n.children;
    let fs = fontFor(depth, medallion, fl);
    const subH = subLabel ? fs * 0.8 : 0;
    let shape: PosterShape;
    let w: number, h: number, angle = 0, leafLength = 0, leafWidth = 0;
    if (medallion) {
      shape = "medallion";
      const tw = Math.max(textWidth(label, fs), subLabel ? textWidth(subLabel, fs * 0.7) : 0);
      w = h = Math.max(fs * 2.7, tw + fs * 0.9) + subH * 0.5;
    } else if (isLeaf(n)) {
      // The leaf points away from its parent but stays close to horizontal
      // (at most 30° up, 12° down), so the name on it always reads easily.
      shape = "leaf";
      fs = Math.max(floorFor(fl), fs * 0.9);
      const out = norm(add(scale(norm(sub(p, from)), 0.8), scale(UP, 0.2)));
      const dir = Math.abs(out.x) < 0.05 ? (p.x >= origin.x ? 1 : -1) : Math.sign(out.x);
      const tilt = clamp((Math.atan2(-out.y, Math.abs(out.x)) * 180) / Math.PI, -12, 30);
      angle = dir > 0 ? -tilt : 180 + tilt;
      const e = { x: Math.cos((angle * Math.PI) / 180), y: Math.sin((angle * Math.PI) / 180) };
      const tw = Math.max(textWidth(label, fs), subLabel ? textWidth(subLabel, fs * 0.7) : 0);
      leafLength = tw + fs * 1.9;
      leafWidth = Math.max(fs * 1.6 + subH, leafLength * 0.36);
      const c = Math.abs(e.x), sn = Math.abs(e.y);
      w = leafLength * c + leafWidth * sn;
      h = leafLength * sn + leafWidth * c;
    } else {
      const tw = Math.max(textWidth(label, fs), subLabel ? textWidth(subLabel, fs * 0.7) : 0);
      if (nodeShape === "circle") {
        // Uniform roundels (like engraved family charts); long names shrink to fit.
        // (long names widen the roundel rather than shrink below legibility)
        shape = "circle";
        w = h = Math.max(fs * 2.55 + subH * 0.6, tw / 0.8);
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
  const r0 = baseMedallionR + f * 1.6;
  for (const n of crownNodes) {
    const d = n.depth - base.depth;
    const halfSpan = ((n.u1 ?? 0) - (n.u0 ?? 0)) / 2;
    // ("re-grow" no longer moves names: their place is fixed by the genealogy)
    void halfSpan;
    const u = n.u ?? 0.5;
    const theta = uToTheta(u);
    // Strictly by generation (rings): siblings share a ring and all their
    // descendants lie further out in their own sector, so no line ever has
    // to pass a sibling's place on its way out.
    const t = d / maxDepth;
    const R = reach(theta) * 0.95;
    const p = add(origin, scale(dirOf(theta), r0 + t * Math.max(0, R - r0)));
    const parent = byId.get(n.parent?.data.member?.id ?? "");
    const node = makeNode(n, p, d, parent ? { x: parent.tx, y: parent.ty } : origin, "crown", 0);
    const a0 = uToTheta(n.u0 ?? 0), a1 = uToTheta(n.u1 ?? 1);
    node.sector = [Math.min(a0, a1), Math.max(a0, a1)];
    node.ray = theta;
  }

  /** Furthest a label can sit along a ray and still be fully on the page. */
  const rMaxOnPage = (n: { w: number; h: number }, th: number) => {
    const d = dirOf(th);
    let r = Infinity;
    if (d.x > 1e-6) r = Math.min(r, (W - margin - n.w / 2 - origin.x) / d.x);
    if (d.x < -1e-6) r = Math.min(r, (margin + n.w / 2 - origin.x) / d.x);
    if (d.y < -1e-6) r = Math.min(r, (contentTop + n.h / 2 - origin.y) / d.y);
    return r;
  };

  // ── 4b. Ring packing ────────────────────────────────────────────────
  // Names on the same generation ring are spaced along the ring, keeping
  // the family order (the partition's DFS order). With the order the same
  // on every ring, lines between consecutive rings cannot cross, and
  // siblings never sit behind one another on a line.
  {
    const crownLive = nodes.filter((n) => n.region === "crown" && n.ray !== undefined);
    const rings = new Map<number, LiveNode[]>();
    for (const n of crownLive) {
      const list = rings.get(n.depth);
      if (list) list.push(n); else rings.set(n.depth, [n]);
    }
    const lo = thetaEnd, hi = thetaStart;
    for (const [d, ring] of rings) {
      ring.sort((a, b) => b.ray! - a.ray!); // anticlockwise from the left
      const radiusAt = (th: number) => r0 + (d / maxDepth) * Math.max(0, reach(th) * 0.95 - r0);
      // angular half-width of a label at angle th (its extent across the ray)
      const half = (n: LiveNode, th: number) =>
        // (+ a corridor so neighbouring lines stay clearly apart)
        (Math.abs((n.w / 2) * Math.sin(th)) + Math.abs((n.h / 2) * Math.cos(th)) + f * 0.6) / Math.max(1, radiusAt(th));
      const target = ring.map((n) => n.ray!);
      // 1-D packing along the ring: neighbours pushed apart, kept in order,
      // with a gentle pull back to their targets. (Any overlap left is then
      // resolved by stepping out along the ray, which keeps each line close
      // to its parent's direction; pushing names further along the ring
      // slants lines across their neighbours.)
      const th = [...target];
      for (let it = 0; it < 200; it++) {
        let moved = false;
        for (let i = 1; i < th.length; i++) {
          const need = half(ring[i - 1], th[i - 1]) + half(ring[i], th[i]);
          const gap = th[i - 1] - th[i];
          if (gap < need) {
            const push = (need - gap) / 2;
            th[i - 1] += push;
            th[i] -= push;
            moved = true;
          }
        }
        for (let i = 0; i < th.length; i++) th[i] = clamp(th[i] + (target[i] - th[i]) * 0.02, lo, hi);
        if (!moved) break;
      }
      ring.forEach((n, i) => {
        n.ray = th[i];
        const p = add(origin, scale(dirOf(th[i]), Math.min(radiusAt(th[i]), rMaxOnPage(n, th[i]))));
        n.x = n.tx = p.x;
        n.y = n.ty = p.y;
      });
    }
  }

  // ── Trunk labels ─────────────────────────────────────────────────────
  // Bottom (eldest) to top, one per row; a zigzag alternates sides,
  // starting on the right in RTL posters.
  // the columns stand apart so the thread joining each ancestor to the
  // next (alternating sides) stays visible between them
  const zigOffset = widest / 2 + trunkFont * 1.1;
  const trunkLabels: TrunkLabel[] = shownTrunk.map((n, i) => {
    const m = n.data.member!;
    const side = trunkZigzag ? ((i % 2 === 0) === rtl ? 1 : -1) : 0;
    return {
      member: m, label: m.name, x: origin.x + side * zigOffset, fontSize: trunkFont,
      y: labelBottom - i * trunkStep,
      // each badge fits its name; zigzag badges share one width so the columns line up
      w: trunkZigzag ? widest : badgeW(n), h: trunkFont * 1.6,
    };
  });
  const labelY = new Map(trunkLabels.map((l) => [l.member.id, l.y]));

  // ── Offshoots: stubs (childless) and side branches (with descendants) ─
  const stubs: PosterNode[] = [];
  const branchesOut: Branch[] = [];
  const edges: Edge[] = [];
  const sample = (c: Cubic, n = 16): Vec[] => Array.from({ length: n + 1 }, (_, i) => cubicPointAt(c, i / n));
  /** A clean tapered branch with a rounded joint where it starts. */
  const shaded = (curve: Cubic, w0: number, w1: number, samples = 14): Branch => ({
    d: ribbonPath(curve, w0, w1, samples) + circlePath(curve.p0, w0 / 2),
    w: w0,
  });
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
      branchesOut.push({ ...shaded(curve, TW * 0.2, TW * 0.1), w: trunkWidth });
      edges.push({ parentId: o.anchor.data.member!.id, childId: m.id, points: sample(curve), w0: TW * 0.2, w1: TW * 0.1 });
      const fs = Math.max(floorFor(f), trunkFont * 0.8);
      const { label, subLabel } = labelOf(m);
      const size = Math.max(fs * 3.2, textWidth(label, fs) + fs, subLabel ? textWidth(subLabel, fs * 0.68) + fs * 1.4 : 0);
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
    const reachR = clamp(f * 4.8 * Math.sqrt(leaves), f * 4, W * 0.3);
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

  // ── Lineages ─────────────────────────────────────────────────────────
  // A major lineage is a son of the crown base who has descendants (in
  // order around the canopy, left to right), or a side branch growing from
  // the trunk; everyone descended from it carries its index.
  {
    const limbs = nodes
      .filter((n) => n.region === "crown" && n.depth === 1 && !n.terminal)
      .sort((a, b) => (b.ray ?? 0) - (a.ray ?? 0));
    const index = new Map<string, number>();
    limbs.forEach((n, i) => index.set(n.id, i));
    let next = limbs.length;
    for (const n of nodes) {
      if (n.region === "side" && !(n.parentId && byId.get(n.parentId)?.region === "side")) index.set(n.id, next++);
    }
    const lineageOf = (n: LiveNode): number | null => {
      let cur: LiveNode | undefined = n;
      for (let guard = 0; cur && guard < 200; guard++) {
        const hit = index.get(cur.id);
        if (hit !== undefined) return hit;
        cur = cur.parentId ? byId.get(cur.parentId) : undefined;
        if (cur && cur.region === "fixed") return null;
      }
      return null;
    };
    for (const n of nodes) if (n.region !== "fixed") n.lineage = lineageOf(n);
  }

  // Trunk labels and the base medallion are fixed obstacles too.
  for (const l of trunkLabels) {
    nodes.push({
      ...fixedObstacle(l.member, l.x, l.y, l.w, l.h),
    });
  }

  // ── Corner medallions (verse / hadith) ──────────────────────────────
  const medallions = opts.cornerMedallions
    ? framed
      ? [{ x: W * 0.205, y: H * 0.205, r: W * 0.07 }, { x: W * 0.795, y: H * 0.205, r: W * 0.07 }]
      : [{ x: W * 0.18, y: H * 0.112, r: W * 0.094 }, { x: W * 0.82, y: H * 0.112, r: W * 0.094 }]
    : [];
  // The crown base medallion is a fixed obstacle too.
  if (base.data.member) {
    nodes.push({ ...fixedObstacle(base.data.member, origin.x, origin.y, baseMedallionR * 2, baseMedallionR * 2), id: "base:obstacle" });
  }
  // The medallions are fixed obstacles for the final separation.
  medallions.forEach((m, i) => {
    nodes.push({ ...fixedObstacle(tree.members[0], m.x, m.y, m.r * 2, m.r * 2), id: `frame:${i}` });
  });

  // ── 5. Collision relaxation ──────────────────────────────────────────
  const constrain = (n: LiveNode) => {
    if (n.region === "fixed") return;
    for (const m of medallions) {
      const half = Math.hypot(n.w, n.h) / 2;
      const d = { x: n.x - m.x, y: n.y - m.y };
      const dist = Math.hypot(d.x, d.y);
      const minD = m.r * 1.04 + half;
      if (dist < minD) {
        const k = minD / (dist || 1);
        n.x = m.x + d.x * k;
        n.y = m.y + (dist ? d.y * k : minD);
      }
    }
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
    if (n.region === "crown" && n.ray !== undefined) {
      // Clarity: a name only ever moves along its own ray (outward from the
      // crown base), never sideways into a neighbouring family's sector, and
      // always stays further out than its parent.
      const dir = dirOf(n.ray);
      let r = (n.x - origin.x) * dir.x + (n.y - origin.y) * dir.y;
      const parent = n.parentId ? byId.get(n.parentId) : undefined;
      if (parent && parent.region === "crown") {
        const rp = (parent.x - origin.x) * dir.x + (parent.y - origin.y) * dir.y;
        r = Math.max(r, rp + (parent.h + n.h) * 0.3);
      }
      r = Math.max(r, baseMedallionR + Math.max(n.w, n.h) / 2);
      // on the page, by moving along the ray (never off it)
      r = Math.min(r, rMaxOnPage(n, n.ray));
      n.x = origin.x + dir.x * r;
      n.y = origin.y + dir.y * r;
      return;
    }
    if (n.region === "crown" && n.ray === undefined) {
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
    onPage(n);
  };
  const onPage = (n: LiveNode) => {
    if (n.region === "fixed") return;
    n.x = clamp(n.x, margin + n.w / 2, W - margin - n.w / 2);
    n.y = Math.max(n.y, contentTop + n.h / 2);
    if (n.region !== "crown") n.y = Math.min(n.y, groundY - n.h / 2 - W * 0.01);
  };
  relax(nodes, constrain, undefined, onPage);

  // ── 5b. Connections, and clearing them of unrelated names ─────────────
  // Each connection is a gentle cubic from parent to child that stays
  // close to the straight line, so it remains inside its sub-branch's
  // sector. A name sitting on someone else's line would look attached to
  // it, so such names are pushed off the line (and relaxed again).
  const growingNodes = nodes.filter((n) => n.region !== "fixed");
  const sideAnchor = new Map(visibleOffshoots.map((o) => [o.node.data.member!.id, o.anchor.data.member!.id]));
  const parentIdOf = (node: LiveNode) => node.parentId ?? sideAnchor.get(node.id) ?? base.data.member?.id ?? "";
  const curveOf = new Map<string, Cubic>();
  const buildCurves = () => {
    const growthDir = new Map<string, Vec>();
    for (const node of growingNodes) {
      const parent = node.parentId ? byId.get(node.parentId) : undefined;
      const P: Vec = parent && parent.region !== "fixed" ? { x: parent.x, y: parent.y } : (stemStart.get(node.id) ?? origin);
      const gP = (node.parentId && growthDir.get(node.parentId)) || stemDir.get(node.id) || norm(sub(node, origin));
      if (node.shape === "leaf") {
        const a = (node.angle * Math.PI) / 180;
        const dir: Vec = { x: Math.cos(a), y: Math.sin(a) };
        // The stalk aims at the leaf's centre (the leaf is drawn over it, so
        // it visibly meets the blade at its base). Aiming at the base itself
        // would offset the line sideways past a sibling's and swap their order.
        const B: Vec = { x: node.x, y: node.y };
        const L = len(sub(B, P)) || 1;
        const dv = norm(sub(B, P));
        const s0 = norm(add(scale(gP, 0.3), scale(dv, 0.7)));
        // arrive along the leaf's own ray, like every other line; arriving
        // along the (horizontal) blade would swing the end sideways across
        // a sibling's line
        void dir;
        const rayDirL = node.ray !== undefined ? dirOf(node.ray) : dv;
        const e0 = norm(add(scale(dv, 0.8), scale(rayDirL, 0.2)));
        curveOf.set(node.id, { p0: P, c1: add(P, scale(s0, L * 0.35)), c2: sub(B, scale(e0, L * 0.3)), p1: B });
        continue;
      }
      const C: Vec = { x: node.x, y: node.y };
      const L = len(sub(C, P)) || 1;
      const dv = scale(sub(C, P), 1 / L);
      const s0 = norm(add(scale(gP, 0.3), scale(dv, 0.7)));
      // arrive along the child's own ray (outward), never hooking back
      const rayDir = node.ray !== undefined ? dirOf(node.ray) : UP;
      const e0 = norm(add(scale(dv, 0.8), scale(rayDir, 0.2)));
      curveOf.set(node.id, { p0: P, c1: add(P, scale(s0, L * 0.38)), c2: sub(C, scale(e0, L * 0.3)), p1: C });
      growthDir.set(node.id, e0);
    }
  };
  // Leaves point away from where their parent actually ended up (a mirror
  // keeps the same footprint, so no new overlaps).
  for (const node of growingNodes) {
    if (node.shape !== "leaf") continue;
    const parent = node.parentId ? byId.get(node.parentId) : undefined;
    const from = parent && parent.region !== "fixed" ? parent : (stemStart.get(node.id) ?? origin);
    const pointsRight = Math.cos((node.angle * Math.PI) / 180) > 0;
    if (Math.abs(node.x - from.x) > node.fontSize && (node.x > from.x) !== pointsRight) {
      node.angle = 180 - node.angle;
      if (node.angle > 180) node.angle -= 360;
    }
  }
  buildCurves();

  // ── 5c. Untangling ───────────────────────────────────────────────────
  // The relationship check runs on the provisional drawing; each remaining
  // ambiguity gets a small local fix that keeps every name on its own ray
  // (so family order is untouched): mirror the leaf in the way, or move a
  // name further out along its ray. A fix is kept only if the number of
  // ambiguities drops and no names come to overlap.
  {
    const lineW = Math.max(W * 0.0018, f * 0.1) * 1.5;
    const baseBox = base.data.member
      ? { id: base.data.member.id, member: base.data.member, x: origin.x, y: origin.y, w: baseMedallionR * 2, h: baseMedallionR * 2, shape: "medallion" }
      : null;
    const check = () => {
      buildCurves();
      const drawnEdges: Edge[] = [
        ...edges,
        ...growingNodes.map((n) => ({ parentId: parentIdOf(n), childId: n.id, points: sample(curveOf.get(n.id)!), w0: lineW, w1: lineW / 2 })),
      ];
      const provisional = {
        nodes: growingNodes, stubs, base: baseBox, trunkLabels, edges: drawnEdges, origin, trunkWidth,
      } as unknown as PosterLayout;
      return validateRelationships(provisional, tree).issues;
    };
    const overlapsAny = (n: LiveNode) =>
      nodes.some((o) => o !== n && Math.abs(o.x - n.x) < (o.w + n.w) / 2 && Math.abs(o.y - n.y) < (o.h + n.h) / 2);
    const nodeById = (id: string) => growingNodes.find((n) => n.id === id);
    const outward = (n: LiveNode, by: number) => {
      if (n.ray === undefined) return;
      const d = dirOf(n.ray);
      const parent = n.parentId ? byId.get(n.parentId) : undefined;
      const rp = parent && parent.region === "crown" ? (parent.x - origin.x) * d.x + (parent.y - origin.y) * d.y + (parent.h + n.h) * 0.3 : 0;
      const r = Math.max(rp, Math.min((n.x - origin.x) * d.x + (n.y - origin.y) * d.y + by, rMaxOnPage(n, n.ray)));
      n.x = origin.x + d.x * r;
      n.y = origin.y + d.y * r;
    };
    const turn = (n: LiveNode, k: number) => {
      if (n.ray === undefined) return;
      const d0 = dirOf(n.ray);
      const r = (n.x - origin.x) * d0.x + (n.y - origin.y) * d0.y;
      const th = clamp(n.ray + (k * (n.h + f * 0.3)) / Math.max(r, 1), thetaEnd, thetaStart);
      const d = dirOf(th);
      const rr = Math.min(r, rMaxOnPage(n, th));
      n.ray = th;
      n.x = origin.x + d.x * rr;
      n.y = origin.y + d.y * rr;
    };
    let issues = check();
    // only near-clean layouts are untangled; many issues mean crowding,
    // which more room (the caller's retry) solves
    if (issues.length > 15) issues = [];
    for (let round = 0; round < Math.min(24, issues.length * 3) && issues.length; round++) {
      const issue = issues[round % issues.length];
      const candidates: LiveNode[] = [];
      if (issue.kind === "occlusion" && typeof issue.other === "string") {
        const o = nodeById(issue.other);
        if (o) candidates.push(o);
      }
      for (const id of [issue.edge?.[1], Array.isArray(issue.other) ? issue.other[1] : undefined]) {
        const c = id ? nodeById(id) : undefined;
        if (c) candidates.push(c);
      }
      let fixed = false;
      for (const n of candidates) {
        const moves: (() => void)[] = [];
        if (n.shape === "leaf") moves.push(() => { n.angle = n.angle > 0 ? 180 - n.angle : -180 - n.angle; });
        for (const k of [0.6, 1.5]) moves.push(() => outward(n, (n.h + n.w * 0.3) * k));
        // a small turn along the ring, either way (validation rejects any
        // turn that would cross a neighbour's line)
        for (const k of [0.5, -0.5, 1, -1]) moves.push(() => turn(n, k));
        for (const move of moves) {
          const saved = { x: n.x, y: n.y, angle: n.angle, ray: n.ray };
          move();
          const next = overlapsAny(n) ? null : check();
          if (next && next.length < issues.length) {
            issues = next;
            fixed = true;
            break;
          }
          Object.assign(n, saved);
        }
        if (fixed) break;
      }
      if (!fixed && round >= issues.length) break;
    }
    buildCurves();
  }
  // Verification: overlapping names left after relaxation (fixed obstacles
  // never move, so only pairs with a movable name count).
  let overlaps = 0;
  for (let i = 0; i < nodes.length; i++) {
    const a = nodes[i];
    for (let j = i + 1; j < nodes.length; j++) {
      const b = nodes[j];
      if (a.region === "fixed" && b.region === "fixed") continue;
      if (Math.abs(a.x - b.x) < (a.w + b.w) / 2 - 0.5 && Math.abs(a.y - b.y) < (a.h + b.h) / 2 - 0.5) overlaps++;
    }
  }

  // ── 6. Branches ──────────────────────────────────────────────────────
  const growing = nodes.filter((n) => n.region !== "fixed");
  const totalLeaves = Math.max(1, base.value ?? 1);
  const bs = opts.branchScale ?? 1;
  const wMin = Math.max(W * 0.0018, f * 0.1);
  const wK = Math.min((trunkWidth * 0.8 - wMin) / Math.sqrt(totalLeaves), W * 0.016) * bs;
  // pipe model, with fine twigs: a single leaf's stalk is only 1.5 × the
  // minimum line, so neighbouring twigs stay clearly apart
  const widthOf = (leaves: number) => wMin * 1.5 + wK * (Math.sqrt(leaves) - 1);
  const branches: Branch[] = [...branchesOut];
  const seeds: { p: Vec; dir: Vec }[] = [];
  const seedFrom = (curve: Cubic) => {
    for (const t of [0.25, 0.45, 0.65, 0.85, 1]) seeds.push({ p: cubicPointAt(curve, t), dir: cubicTangent(curve, t) });
  };

  for (const node of growing) {
    const c = curveOf.get(node.id)!;
    if (node.shape === "leaf") {
      // a thin stalk from the parent to the base of the leaf blade
      const tip = Math.max(wMin * 0.8, node.fontSize * 0.14);
      branches.push({ d: ribbonPath(c, widthOf(1), tip, 10), w: widthOf(1), lineage: node.lineage ?? null });
      edges.push({ parentId: parentIdOf(node), childId: node.id, points: sample(c), w0: widthOf(1), w1: tip, lineage: node.lineage ?? null });
    } else {
      const w = widthOf(node.leafCount);
      const w0 = node.depth === 1 ? w * 1.15 : w;
      branches.push({ ...shaded(c, w0, w * 0.7), lineage: node.lineage ?? null });
      edges.push({ parentId: parentIdOf(node), childId: node.id, points: sample(c), w0, w1: w * 0.7, lineage: node.lineage ?? null });
    }
    seedFrom(c);
  }
  // Thick limbs first so thin branches (and their junctions) sit on top.
  branches.sort((a, b) => b.w - a.w);

  // ── Canopy silhouette: a balanced oval around the crown, centred on the
  // trunk, so even a sparse canopy reads as a full tree shape.
  let canopy: string | null = null;
  const crownLive = growing.filter((n) => n.region === "crown");
  if (crownLive.length) {
    const pad = W * 0.05;
    const halfW = Math.max(W * 0.16, ...crownLive.map((n) => Math.abs(n.x - origin.x) + n.w / 2 + pad));
    const top = Math.max(contentTop, Math.min(...crownLive.map((n) => n.y - n.h / 2)) - pad);
    const bottom = origin.y + baseMedallionR * 0.6;
    const cy = (top + bottom) / 2;
    const ry = Math.max(H * 0.06, (bottom - top) / 2);
    const rx = Math.min(halfW, W * 0.47);
    const pts: string[] = [];
    for (let i = 0; i < 96; i++) {
      const a = (i / 96) * Math.PI * 2;
      const c = Math.cos(a), sn = Math.sin(a);
      // superellipse, slightly narrower towards the bottom (teardrop)
      const k = sn > 0 ? 1 - 0.18 * sn : 1;
      pts.push(`${(origin.x + rx * k * Math.sign(c) * Math.abs(c) ** (2 / 2.6)).toFixed(1)} ${(cy + ry * Math.sign(sn) * Math.abs(sn) ** (2 / 2.6)).toFixed(1)}`);
    }
    canopy = `M${pts.join("L")}Z`;
  }

  // ── Decorative foliage ───────────────────────────────────────────────
  let foliage: Foliage | null = null;
  if (opts.foliage && nodeShape !== "leaf" && final) {
    const obstacles: Box[] = [
      ...nodes.map((n) => ({ x: n.x, y: n.y, w: n.w + W * 0.006, h: n.h + W * 0.006 })),
      { x: origin.x, y: origin.y, w: baseMedallionR * 2.3, h: baseMedallionR * 2.3 },
      ...medallions.map((m) => ({ x: m.x, y: m.y, w: m.r * 2.2, h: m.r * 2.2 })),
    ];
    if (!seeds.length) seeds.push({ p: origin, dir: UP });
    seeds.push({ p: { x: origin.x, y: origin.y - baseMedallionR }, dir: UP });
    foliage = growFoliage({
      W, rand, seeds, obstacles,
      bounds: { x0: crown.cx - crown.rx * 1.15, y0: crown.cy - crown.ry, x1: crown.cx + crown.rx * 1.15, y1: crown.cy + crown.ry },
      inside: (p) => insideCrown(p),
      // keep the trunk column and the space under the crown base clear
      excluded: (p) => p.y > origin.y - baseMedallionR && Math.abs(p.x - origin.x) < trunkWidth * 1.2,
    });
  }

  // ── Surface roots spreading from the trunk base ─────────────────────
  // (with a soil tier the roots are underground, drawn as part of the soil)
  const surfaceRoots: Branch[] = [];
  for (let i = 0; i < (useSoil ? 0 : 8); i++) {
    const side = i % 2 === 0 ? 1 : -1;
    const k = Math.floor(i / 2);
    const start: Vec = { x: origin.x + side * trunkWidth * (0.2 + 0.08 * k), y: groundY - TW * (0.35 - 0.05 * k) };
    const end: Vec = {
      x: origin.x + side * (trunkWidth * 0.6 + TW * (1.3 + k * 0.75 + rand() * 0.3)),
      y: groundY + TW * (0.12 + 0.06 * k + rand() * 0.06),
    };
    const curve: Cubic = {
      p0: start,
      c1: { x: start.x + side * TW * 0.25, y: start.y + TW * 0.35 },
      c2: { x: end.x - side * TW * 0.7, y: end.y - TW * (0.18 + rand() * 0.1) },
      p1: end,
    };
    surfaceRoots.push(shaded(curve, TW * (0.42 - k * 0.07), TW * 0.03, 16));
  }

  // ── Base medallion ───────────────────────────────────────────────────
  let baseNode: PosterNode | null = null;
  if (base.data.member) {
    const m = base.data.member;
    const fs = f * 1.3;
    const { label, subLabel } = labelOf(m);
    baseNode = {
      id: m.id, member: m, x: origin.x, y: origin.y, depth: 0, generation: m.generation,
      w: baseMedallionR * 2, h: baseMedallionR * 2, fontSize: fs, shape: "medallion",
      label: m.name, subLabel, terminal: !base.children,
      angle: 0, leafLength: 0, leafWidth: 0, leafCount: base.value ?? 1,
      parentId: base.parent?.data.member?.id ?? null,
    };
  }

  // ── Foundation: ancient ancestors as a paragraph below the trunk ─────
  let soil: SoilInscription | null = null;
  if (useSoil) {
    const text = soilTextFor(shownTrunk, ancient);
    const fs = soilFontFor(f);
    const lines = soilLinesFor(text, fs);
    const lh = fs * 1.65;
    const cx = W / 2;
    const x0 = cx - soilW / 2, x1 = cx + soilW / 2;
    const boxTop = groundY + f * 0.9;
    const box = { x: x0, y: boxTop, w: soilW, h: lines.length * lh + fs * 1.5 };
    const fx = (n: number) => n.toFixed(1);
    const linePaths = lines.map((line, k) => {
      const y = boxTop + fs * 1.55 + k * lh;
      return { path: `M${fx(x0 + fs)} ${fx(y)}L${fx(x1 - fs)} ${fx(y)}`, text: line };
    });
    // a fine ground line, and a few roots reaching down to the panel
    const gw = clamp(trunkWidth * 1.4, soilW * 0.22, soilW * 0.32);
    const ground = `M${fx(cx - gw)} ${fx(groundY + f * 0.15)}Q${fx(cx)} ${fx(groundY - f * 0.25)} ${fx(cx + gw)} ${fx(groundY + f * 0.15)}`;
    const roots: string[] = [];
    for (let i = 0; i < 6; i++) {
      const side = i % 2 === 0 ? 1 : -1;
      const k = Math.floor(i / 2);
      const start: Vec = { x: cx + side * trunkWidth * (0.15 + 0.12 * k), y: groundY };
      const end: Vec = { x: cx + side * (trunkWidth * 0.7 + gw * (0.2 + 0.28 * k)), y: boxTop - f * 0.05 };
      const curve: Cubic = {
        p0: start, c1: add(start, { x: 0, y: (end.y - start.y) * 0.6 }),
        c2: add(end, { x: -side * (end.x - start.x) * 0.5, y: -f * 0.1 }), p1: end,
      };
      roots.push(ribbonPath(curve, trunkWidth * (0.12 - 0.025 * k), 1.2, 12));
    }
    soil = { ground, roots, lines: linePaths, fontSize: fs, box, count: customSoil ? 0 : ancient.length, custom: !!customSoil };
  }

  const gens = new Set<number>();
  for (const n of growing) if (n.shape !== "medallion") gens.add(n.generation);

  const placed = growing.length + stubs.length + trunkLabels.length + ancient.length + (baseNode ? 1 : 0);
  stats.placed = placed;
  stats.unplaced = Math.max(0, visible.length - placed);

  // Legibility: the smallest text anywhere on the genealogy, in print mm.
  const smallest = Math.min(
    ...growing.map((n) => n.fontSize), ...stubs.map((n) => n.fontSize),
    ...trunkLabels.map((l) => l.fontSize), ...(soil ? [soil.fontSize] : []), ...(baseNode ? [baseNode.fontSize] : []),
  );
  const legibility = {
    minTextMm,
    smallestTextMm: smallest * unitMm,
    ok: smallest >= minFont * 0.99,
    scaleNeeded: Math.max(1, minFont / smallest),
  };

  const strip = ({ tx: _tx, ty: _ty, mass: _m, region: _r, side: _s, ...rest }: LiveNode): PosterNode => rest;
  return {
    ...empty,
    // geometry may have switched to the tall-base variant
    crown, origin, groundY,
    trunkPath: trunkOutline(origin, groundY, trunkWidth, TW, TW, soil ? 0.55 : 1),
    trunkWidth,
    rtl,
    trunkLabels,
    soil,
    trunkZigzag,
    base: baseNode,
    stubs: stubs.map((s) => strip(s as LiveNode)),
    nodes: growing.map(strip),
    branches,
    edges,
    canopy,
    foliage,
    surfaceRoots,
    medallions,
    frame: place,
    generationOffset: base.data.member?.generation ?? 0,
    generationsPresent: [...gens].sort((a, b) => a - b),
    legibility,
    overlaps,
    clarity: { ok: true, expected: 0, drawn: 0, clearCrossings: 0, issues: [] },
    focus: focusMember
      ? {
        id: focusMember.id,
        label: (() => {
          const father = focusMember.fatherId ? byMemberId.get(focusMember.fatherId) : undefined;
          return father ? `${focusMember.name} ${focusMember.gender === "FEMALE" ? "بنت" : "بن"} ${father.name}` : focusMember.name;
        })(),
      }
      : null,
  };
}

// ── helpers ─────────────────────────────────────────────────────────────

/**
 * Where the header and the footer line go. Inside a frame artwork they keep
 * clear of the top and bottom centre rosettes.
 */
function framePlacement(W: number, H: number, framed: boolean): PosterLayout["frame"] {
  if (!framed) {
    return { framed, header: { basmala: H * 0.041, title: H * 0.078, maxTitleWidth: W * 0.6 }, footerY: H - W * 0.04 };
  }
  return { framed, header: { basmala: H * 0.112, title: H * 0.145, maxTitleWidth: W * 0.42 }, footerY: H * 0.905 };
}

/** Stable grouping of siblings by mother, mothers in order of first appearance. */
function groupByMother(kids: MemberDTO[]): MemberDTO[] {
  const order = new Map<string | null, number>();
  for (const k of kids) if (!order.has(k.motherId)) order.set(k.motherId, order.size);
  if (order.size < 2) return kids;
  return kids.map((k, i) => ({ k, i })).sort((a, b) => order.get(a.k.motherId)! - order.get(b.k.motherId)! || a.i - b.i).map((x) => x.k);
}

function fixedObstacle(m: MemberDTO, x: number, y: number, w: number, h: number): LiveNode {
  return {
    id: `trunk:${m.id}`, member: m, x, y, tx: x, ty: y, depth: 0, generation: m.generation,
    w, h, fontSize: 0, shape: "pill", label: m.name, subLabel: null, terminal: false,
    angle: 0, leafLength: 0, leafWidth: 0, leafCount: 1, parentId: null,
    mass: 1e6, region: "fixed", side: 0,
  };
}

/** Name with laqab; Arabic uses ornate brackets ﴿…﴾, which never mirror. */
function withLaqab(m: MemberDTO, rtl: boolean): string {
  if (!m.laqab) return m.name;
  if (HONORIFICS.test(m.laqab.trim())) return `${m.name} ${m.laqab}`;
  return rtl ? `${m.name} \uFD3F${m.laqab}\uFD3E` : `${m.name} (${m.laqab})`;
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

/**
 * Trunk silhouette: narrow under the crown (topW), swelling to its full
 * width w where the medallions sit, then flaring into roots at the ground.
 */
function trunkOutline(o: Vec, groundY: number, w: number, flareW = w, topW = w, spread = 1): string {
  const h = groundY - o.y;
  const f = (n: number) => n.toFixed(1);
  // root flare: widens with the base trunk, only partly with a zigzag trunk;
  // `spread` < 1 keeps it inside a soil mound
  const fl = (flareW + (w - flareW) * 0.35) * spread;
  const side = (s: 1 | -1) => (dx: number) => f(o.x + s * dx);
  const L = side(-1);
  const R = side(1);
  return [
    `M${L(topW * 0.62)} ${f(o.y - topW * 0.15)}`,
    `C${L(topW * 0.52)} ${f(o.y + h * 0.08)} ${L(w * 0.5)} ${f(o.y + h * 0.1)} ${L(w * 0.5)} ${f(o.y + h * 0.28)}`,
    `C${L(w * 0.5)} ${f(o.y + h * 0.62)} ${L(w * 0.52)} ${f(o.y + h * 0.82)} ${L(w * 0.5 + fl * 0.35)} ${f(groundY - fl * 0.08)}`,
    `C${L(w * 0.5 + fl * 0.55)} ${f(groundY)} ${L(w * 0.5 + fl * 1.1)} ${f(groundY + fl * 0.12)} ${L(w * 0.5 + fl * 1.5)} ${f(groundY + fl * 0.18)}`,
    `L${R(w * 0.5 + fl * 1.5)} ${f(groundY + fl * 0.18)}`,
    `C${R(w * 0.5 + fl * 1.1)} ${f(groundY + fl * 0.12)} ${R(w * 0.5 + fl * 0.55)} ${f(groundY)} ${R(w * 0.5 + fl * 0.35)} ${f(groundY - fl * 0.08)}`,
    `C${R(w * 0.52)} ${f(o.y + h * 0.82)} ${R(w * 0.5)} ${f(o.y + h * 0.62)} ${R(w * 0.5)} ${f(o.y + h * 0.28)}`,
    `C${R(w * 0.5)} ${f(o.y + h * 0.1)} ${R(topW * 0.52)} ${f(o.y + h * 0.08)} ${R(topW * 0.62)} ${f(o.y - topW * 0.15)}`,
    `Q${f(o.x)} ${f(o.y - topW * 0.7)} ${L(topW * 0.62)} ${f(o.y - topW * 0.15)}Z`,
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
export function relax<T extends Body>(nodes: T[], constrain: (n: T) => void, iterations = 120, bound?: (n: T) => void) {
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
  // Final clean-up: separation until no overlaps remain, then the hard
  // bounds (on the page, above the ground) once more, since separation can
  // push a name past them. The softer constraints (a name on its ray) are
  // not re-applied: in dense canopies they push names back together, and
  // the separation would never settle.
  for (let it = 0; it < 200 && separate() > 0; it++);
  if (bound) for (const n of nodes) bound(n);
}
