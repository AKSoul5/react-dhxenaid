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
 *       roots), TRUNK (stacked medallions in one centred column, inside the
 *       bark; when the chain is long the oldest go to the soil), CANOPY.
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
import { childrenIndex, hiddenFromPoster, lineagePath, withAncestors } from "../genealogy";
import { givenAndFamilyName, nameLines } from "../nasab";
import type { MemberDTO, TreeDTO } from "../types";
import {
  add, circlePath, cubicPoint as cubicPointAt, cubicTangent, len, norm, ribbonPath, scale, sub,
  type Cubic, type Vec,
} from "./geometry";
import { validateRelationships, type ClarityReport } from "./clarity";
import { soilStyle, type SoilContext, type SoilGeometry, type SoilStyleId } from "./soil";
import { namesOf, shortenSoil, wordsOf } from "./soil/common";
import { mulberry32 } from "./random";

export type NodeShape = "leaf" | "circle" | "oval";

/**
 * With nodeShape "auto": leaves for a canopy of at most this many names,
 * ovals beyond. Leaves (tilted, pointed) are lovely on a sparse tree; on a
 * dense one they read as a web, and tilted Arabic is hard to read, while
 * upright ovals stay calm and classical.
 */
export const AUTO_LEAF_LIMIT = 50;
/** An oval's width beyond its name, and its height, in name sizes (slim enough for dense canopies). */
const OVAL_PAD = 1.2, OVAL_H = 1.6;
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
  /** People whose families are drawn through them, on dotted lines. Defaults to settings.familiesThrough. */
  familiesThrough?: string[];
  /** People left off the poster with their descendants. Defaults to settings.hiddenIds. */
  hiddenIds?: string[];
  /** Primary lineage: the branch to centre in the canopy. Defaults to settings.centerBranchId. */
  centerBranchId?: string | null;
  /** Where the canopy starts. Defaults to tree.crownBaseId, then automatic. */
  crownBaseId?: string | null;
  nodeShape?: NodeShape | "auto";
  labelMode?: LabelMode;
  showYears?: boolean;
  /**
   * Spouses on the branch: every recorded wife a man had children with is
   * a holder on his branch with her children growing from it (the
   * husbands, in a mother's-line tree). (The husbands of a daughter whose
   * family is shown are always on her line.)
   */
  motherNames?: boolean;
  /** How the foundation (the ancestors below the trunk) is drawn. Default: the inscribed panel. */
  soilStyle?: SoilStyleId;
  /** Where the trunk starts; older ancestors go into the soil. Defaults to tree.trunkStartId. */
  trunkStartId?: string | null;
  /** In automatic mode: ancestors on the trunk before the rest move into the soil. */
  maxTrunkLabels?: number;
  /** Branch thickness multiplier (line-art themes use thin branches). */
  branchScale?: number;
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
  /** A quieter second line (on round holders it may be two, split by "\n"). */
  subLabel: string | null;
  /** True for members without (visible) children. */
  terminal: boolean;
  /** Her children belong to another family (a daughter's, on dotted lines). */
  childrenOutside?: boolean;
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
  /**
   * A dotted line (a family shown through a daughter): `d` is then the
   * line's centre, to be stroked `w` wide, not a filled outline.
   */
  dotted?: boolean;
}

/**
 * A spouse's name holder (a cartouche) on the branch: a father's wife, with
 * the children she bore him growing from her holder, or the husband of a
 * daughter whose family is shown, on her dotted line.
 */
export interface SpouseHolder {
  /** "spouse:<partner id>:<spouse id>" (the drawn connections run partner → holder → child). */
  id: string;
  member: MemberDTO;
  partnerId: string;
  childIds: string[];
  label: string;
  /** The label as set: first name over family name. */
  lines: string[];
  x: number;
  y: number;
  w: number;
  h: number;
  fontSize: number;
  /** On a dotted line (a family shown through a daughter). */
  dotted: boolean;
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

/** The foundation below the trunk, as laid out by its soil style (see ./soil). */
export type SoilInscription = SoilGeometry;

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
  /** Spouses on the branches, between a partner and their children. */
  spouses: SpouseHolder[];
  /** Branch outlines (filled with bark), with an optional light-side highlight. */
  branches: Branch[];
  /** Centrelines of every drawn parent → child connection. */
  edges: Edge[];
  /** Soft silhouette around the canopy (balanced oval). */
  canopy: string | null;
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
  /**
   * More than CLARITY_LIMIT ambiguous connections even after setting the
   * canopy's names smaller: the family is too dense for this paper. The
   * editor then shows one clear warning (a larger size, or a smaller
   * branch) instead of circling dozens of places.
   */
  tooDense: boolean;
  /**
   * How full the fullest generation ring is: its names' extents (and the
   * corridors between them) over its length. Above 1 they stand in rows.
   */
  ringLoad: number;
  /** Set when the poster shows one branch only (see LayoutOptions.focusId). */
  focus: { id: string; label: string } | null;
  /** People whose children are drawn from them on dotted lines (see LayoutOptions.familiesThrough). */
  familiesThrough: string[];
  /** Oldest generation drawn on the canopy and its side branches; legend numbering and colours start here. */
  generationOffset: number;
  /** Generations present on crown / side-branch tags (for the legend). */
  generationsPresent: number[];
  stats: { total: number; males: number; females: number; placed: number; unplaced: number };
  /** The people on the poster's list who are not drawn on it (stats.unplaced of them), for the editor to show. */
  unplacedIds?: string[];
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
  const isClean = (l: PosterLayout) => l.overlaps === 0 && l.clarity.ok;
  // nothing clean: no overlapping names first, then legible text, then the
  // fewest ambiguities (and the editor recommends a larger size)
  const rank = (l: PosterLayout) => (l.overlaps > 0 ? 2e6 : 0) + (l.legibility.ok ? 0 : 1e6) + badness(l);
  // The size is searched for without the untangling (each attempt is then
  // quick); the untangling, the slow part, is spent afterwards on the few
  // attempts nearest to clean. (More of it for each family shown through a
  // daughter: holders and dotted lines leave the most to untangle.)
  const untangleChecks = CHECKS + 3 * (opts.familiesThrough ?? tree.settings?.familiesThrough ?? []).length;
  const search = (dense: boolean) => {
    const attempt = (scale: number, final = false, strict = false, untangle = 0, trunk = 1) => {
      const layout = layoutAttempt(tree, opts, scale, final, strict, dense, { checks: untangle, trunk });
      layout.clarity = validateRelationships(layout, tree);
      return layout;
    };
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
    if (dense) {
      // (legible sizes only: smaller names would be thinner than their lines)
      const legibleScale = clamp((full.legibility.minTextMm / Math.max(1e-6, full.legibility.smallestTextMm)) * 1.02, 0.35, 1);
      if (!isClean(full) && legibleScale < 0.999) {
        at(legibleScale);
        at((1 + legibleScale) / 2);
      }
      chosen = [...tried.entries()].filter(([, l]) => l.legibility.ok).sort((a, b) => rank(a[1]) - rank(b[1]) || b[0] - a[0])[0]?.[0] ?? 1;
      return { layout: at(chosen), chosen, strict: false, attempt, tried, dense };
    }
    // a crowded canopy first gets its names set a fifth smaller (when that
    // stays legible), so each has more room
    if (full.clarity.issues.length > CLARITY_LIMIT) at(0.8);
    if (!isClean(full)) {
      // the smallest scale at which the names are still legible (on a
      // larger paper the names can be smaller beside their lines, which is
      // what a larger paper is for)
      const legibleScale = clamp((full.legibility.minTextMm / Math.max(1e-6, full.legibility.smallestTextMm)) * 1.02, MIN_SCALE, 1);
      // and a size below it, to tell whether only illegible names would do
      const below = Math.min(0.35, legibleScale * 0.8);
      if (legibleScale < 0.999 && isClean(at(legibleScale))) chosen = bisect(legibleScale, 1);
      else if (isClean(at(below))) {
        chosen = bisect(below, legibleScale); // clean only below legible size?
        // The count of ambiguities does not fall evenly with the names' size:
        // before settling for illegible names, a few more sizes around the
        // most nearly clean legible one.
        if (!at(chosen).legibility.ok) {
          const legible = [...tried.entries()].filter(([, l]) => l.legibility.ok && l.overlaps === 0)
            .sort((a, b) => badness(a[1]) - badness(b[1]) || b[0] - a[0]);
          const near = legible[0]?.[0];
          if (near !== undefined && badness(legible[0][1]) <= 1) {
            for (const k of [-1, 1]) {
              const sc = clamp(near + k * 0.015, MIN_SCALE, 1);
              const l = at(sc);
              if (isClean(l) && l.legibility.ok) {
                chosen = sc;
                break;
              }
            }
          }
        }
      } else {
        chosen = [...tried.entries()].sort((a, b) => rank(a[1]) - rank(b[1]) || b[0] - a[0])[0][0];
        // nearly clean: a few sizes either side of the best (the count of
        // ambiguities does not fall evenly with the names' size)
        const near = at(chosen);
        if (near.overlaps === 0 && near.legibility.ok && near.clarity.issues.length <= 2) {
          for (const k of [1, -1]) {
            const sc = clamp(chosen + k * 0.01, MIN_SCALE, 1);
            const l = at(sc);
            if (isClean(l) && l.legibility.ok) {
              chosen = sc;
              break;
            }
          }
        }
      }
    }
    // A clean layout can still have lines crossing (at a clear angle, so the
    // check accepts them): typically many childless brothers and sisters
    // crowding the first ring push a father off his sector. Strict family
    // packing (fathers hold their place, every name keeps to its family's
    // side) is tried then, and kept only when it is clean, as legible and
    // crosses less. (Not by default: in dense canopies fathers must give way.)
    let strict = false;
    let layout = at(chosen);
    if (isClean(layout) && layout.clarity.clearCrossings > 0) {
      const alt = attempt(chosen, false, true);
      if (isClean(alt) && alt.clarity.clearCrossings < layout.clarity.clearCrossings && (alt.legibility.ok || !layout.legibility.ok)) {
        strict = true;
        layout = alt;
      } else {
        // or another clean, as legible size without crossings
        const calm = [...tried.entries()]
          .filter(([, l]) => isClean(l) && !l.clarity.clearCrossings && (l.legibility.ok || !layout.legibility.ok))
          .sort((a, b) => b[0] - a[0])[0];
        if (calm) {
          chosen = calm[0];
          layout = calm[1];
        }
      }
    }
    return { layout, chosen, strict, attempt, tried, dense };
  };
  type Found = { layout: PosterLayout; chosen: number; strict: boolean; attempt: (s: number, f?: boolean, st?: boolean, u?: number, t?: number) => PosterLayout; untangle?: number };
  let best: Found = search(false);
  const searches = [best as Found & { tried: Map<number, PosterLayout> }];
  // Dense packing, a second try for a family whose generations do not fit
  // around their rings side by side (rows of names hide each other's
  // lines): the canopy is sized for its fullest rings, which sit further
  // out, and everything comes out smaller. Kept when it does better.
  // (Clean comes first, as always: a clean poster with names too small for
  // its paper tells the editor to recommend a larger one.)
  // (Not for a clean poster whose names are too small: the larger paper
  // the editor then recommends is the answer.)
  if (!isClean(best.layout) && best.layout.ringLoad > 1) {
    const dense = search(true);
    searches.push(dense);
    const d = dense.layout, b = best.layout;
    if (d.legibility.ok && (isClean(d) || (!isClean(b) && rank(d) < rank(b)))) best = dense;
  }
  // Untangling: the attempts nearest to clean (no overlapping names, a few
  // ambiguities; legible ones first, then the largest) are laid out again,
  // untangled. One that comes out clean and legible is taken; failing that,
  // a clean one at a larger size than the best so far (it needs less of a
  // larger paper), or a better one when nothing so far is clean.
  if (!(isClean(best.layout) && best.layout.legibility.ok)) {
    const near = searches
      .flatMap((sr) => [...sr.tried.entries()].map(([scale, l]) => ({ sr, scale, l })))
      .filter(({ scale, l }) => l.overlaps === 0 && l.clarity.issues.length > 0 && l.clarity.issues.length <= 4
        && (l.legibility.ok || !isClean(best.layout) || scale > best.chosen))
      .sort((a, b) => Number(b.l.legibility.ok) - Number(a.l.legibility.ok)
        || a.l.clarity.issues.length - b.l.clarity.issues.length || b.scale - a.scale)
      // (two legible ones; one illegible one, which can only lower the
      // larger paper recommended)
      .filter((c, i, all) => i < 2 && (c.l.legibility.ok || !all.slice(0, i).some((x) => !x.l.legibility.ok))
        // (a second only when it is down to one ambiguity)
        && (i === 0 || c.l.clarity.issues.length === 1));
    for (const { sr, scale, l: before } of near) {
      // (half as much for an illegible one)
      const checks = before.legibility.ok ? untangleChecks : Math.ceil(untangleChecks / 2);
      const l = sr.attempt(scale, false, false, checks);
      const found = { layout: l, chosen: scale, strict: false, attempt: sr.attempt, untangle: checks };
      const b = best.layout;
      if (isClean(l) && l.legibility.ok) {
        best = found;
        break;
      }
      if (isClean(l) ? !isClean(b) || (!b.legibility.ok && scale > best.chosen) : !isClean(b) && rank(l) < rank(b)) best = found;
    }
    // one ambiguity left on a legible poster: a few sizes either side
    const one = near.find((c) => c.l.legibility.ok && c.l.clarity.issues.length === 1);
    if (one && !(isClean(best.layout) && best.layout.legibility.ok)) {
      for (const k of [-1, 1, -2, 2]) {
        const scale = clamp(one.scale + k * 0.015, MIN_SCALE, 1);
        const l = one.sr.attempt(scale, false, false, untangleChecks);
        if (isClean(l) && l.legibility.ok) {
          best = { layout: l, chosen: scale, strict: false, attempt: one.sr.attempt, untangle: untangleChecks };
          break;
        }
      }
    }
  }
  // Balance: when the canopy's names had to be set smaller to clear their
  // lines, the trunk's are set smaller with them, and the height that frees
  // goes to the canopy (a trunk of names two to five times the canopy's
  // took the height the canopy needed: a column with a small tree on it).
  // Tried once the size is chosen, at it or a little below, and kept only
  // when clean and as legible: it never makes a poster worse.
  // (only where the trunk is out of proportion: a few names on it, set
  // half again as large as the canopy's typical name, or more)
  const outOfProportion = (l: PosterLayout) => {
    if (l.trunkLabels.length < 2 || !l.nodes.length) return false;
    const sizes = l.nodes.map((n) => n.fontSize).sort((a, b) => a - b);
    return Math.max(...l.trunkLabels.map((t) => t.fontSize)) >= sizes[Math.floor(sizes.length / 2)] * BALANCE_RATIO;
  };
  if (best.chosen < BALANCE_BELOW && isClean(best.layout) && outOfProportion(best.layout)) {
    const trunk = clamp(best.chosen, TRUNK_FOLLOW_MIN, 1);
    let balanced = false;
    for (const k of [1, 0.95, 0.9]) {
      const scale = best.chosen * k;
      const l = best.attempt(scale, false, best.strict, best.untangle ?? 0, trunk);
      // (and crossing no more than before)
      if (isClean(l) && (l.legibility.ok || !best.layout.legibility.ok) && l.clarity.clearCrossings <= best.layout.clarity.clearCrossings) {
        best = { ...best, layout: l, chosen: scale };
        balanced = true;
        break;
      }
    }
    // with the trunk's height given back, the canopy may take larger names
    // again (the trunk following them)
    if (balanced && best.chosen < UPWARD_BELOW) {
      const base = best.chosen;
      for (const k of [2, 1.75, 1.5, 1.25]) {
        const scale = Math.min(1, base * k);
        const l = best.attempt(scale, false, best.strict, best.untangle ?? 0, clamp(scale, TRUNK_FOLLOW_MIN, 1));
        if (isClean(l) && (l.legibility.ok || !best.layout.legibility.ok) && l.clarity.clearCrossings <= best.layout.clarity.clearCrossings) {
          best = { ...best, layout: l, chosen: scale };
          break;
        }
      }
    }
  }
  const result = best.layout;
  result.tooDense = result.clarity.issues.length > CLARITY_LIMIT;
  return result;
}

/**
 * Most of the content height the foundation may take on a whole-family
 * poster: less when the canopy holds more people than trunk and foundation.
 */
const SOIL_SHARE = 0.4;
const SOIL_SHARE_SMALL = 0.25;
/**
 * On a branch poster: trunk and foundation together, and the trunk alone,
 * so the canopy (the descendants, the poster's subject) has at least 70%;
 * the trunk shows the nearest few ancestors, the rest go to the foundation.
 */
const LOWER_SHARE = 0.3;
/** The most a canopy grows past its natural height to fill spare paper. */
const CANOPY_GROWTH = 1.2;
const TRUNK_SHARE = 0.2;
const BRANCH_TRUNK_NAMES = 6;

/** Least height of a trunk without ancestors, below the canopy base, as a share of the content height. */
const BARE_TRUNK = 0.1;
/** Below this size, larger sizes are tried for a clean layout too (see search). */
const UPWARD_BELOW = 0.5;
/** Below this size the trunk's names are set smaller with the canopy's (see the balancing in computePosterLayout). */
const BALANCE_BELOW = 0.85;
/** A trunk name this many times the canopy's typical name is out of proportion. */
const BALANCE_RATIO = 1.5;
/** The least the trunk's names follow the canopy's when those are set smaller (see trunkFontFor). */
const TRUNK_FOLLOW_MIN = 0.55;
/** Canopies of at least this many names are as wide as the page allows. */
const WIDE_CANOPY = 30;

/** The canopy base's oval, as fractions of its round space's radius (wider than tall). */
const BASE_OVAL = { w: 1, h: 0.66 };

/** The least share of its father's span the primary lineage's branch takes, in the middle. */
const CENTER_SHARE = 0.3;

/** The least share of its father's space a child gets (see partition). */
const MIN_CHILD_SHARE = 0.1;

/**
 * The smallest the canopy's names are set, as a share of the size that
 * fits the page: far below what any paper up to 2A0 can print legibly, so
 * a larger paper always gives the names more room.
 */
const MIN_SCALE = 0.05;

/** The most relationship checks the untangling makes for one poster, over all its attempts (it redraws every line each time). */
const CHECKS = 30;
/** The most moves the untangling checks for one issue. */
const MOVES = 12;

/** Most ambiguous connections a poster may have before it counts as too dense for its paper. */
export const CLARITY_LIMIT = 5;


function layoutAttempt(
  tree: TreeDTO, opts: LayoutOptions, fontScale: number, final = true, strictFamilies = false, dense = false,
  budget: { checks: number; trunk?: number } = { checks: CHECKS },
): PosterLayout {
  const W = opts.width ?? 2400;
  const H = opts.height ?? Math.round(W * Math.SQRT2);
  const seed = opts.seed ?? tree.settings?.seed ?? 7;
  const showFemales = opts.showFemales ?? tree.settings?.showFemales ?? false;
  const labelMode = opts.labelMode ?? "name";
  const showYears = opts.showYears ?? false;
  const rand = mulberry32(seed);
  const rr = (a: number, b: number) => a + (b - a) * rand();

  // "Hide daughters" only applies where the line runs through fathers: in a
  // matrilineal tree the women ARE the line, and hiding them would detach
  // their children.
  const hideDaughters = !showFemales && tree.lineage !== "MATRILINEAL";
  let visible = hideDaughters ? tree.members.filter((m) => m.gender !== "FEMALE") : tree.members;
  const byMemberId = new Map(tree.members.map((m) => [m.id, m]));
  // Focus: one branch of the family on its own poster (for families too
  // large to draw clearly on one sheet): the person's ancestors and
  // descendants only, with the canopy starting at the person.
  const requestedFocus = opts.focusId !== undefined ? opts.focusId : (tree.settings?.focusId ?? null);
  const focusMember = requestedFocus ? byMemberId.get(requestedFocus) : undefined;
  // Hiding daughters hides their whole lines: a daughter's family (her
  // husband and children, on dotted lines) is shown only with daughters,
  // unless the poster is of her own branch.
  const through = new Set((opts.familiesThrough ?? tree.settings?.familiesThrough ?? [])
    .filter((id) => byMemberId.has(id) && (!hideDaughters || id === focusMember?.id)));
  if (through.size) {
    const shownNow = new Set(visible);
    visible = tree.members.filter((m) => shownNow.has(m) || through.has(m.id));
  }
  // People hidden from the poster, each with all their descendants; never
  // anyone the tree stands on (its root, trunk start, canopy start, the
  // focused person, or their ancestors).
  const hidden = hiddenFromPoster(
    tree.members,
    opts.hiddenIds ?? tree.settings?.hiddenIds ?? [],
    withAncestors(tree.members, [
      tree.rootMemberId, opts.crownBaseId !== undefined ? opts.crownBaseId : tree.crownBaseId,
      opts.trunkStartId !== undefined ? opts.trunkStartId : tree.trunkStartId, focusMember?.id,
    ]),
    tree.marriages,
  );
  if (hidden.size) {
    visible = visible.filter((m) => !hidden.has(m.id));
    for (const id of hidden) through.delete(id);
  }
  let counted = hidden.size ? tree.members.filter((m) => !hidden.has(m.id)) : tree.members;
  if (focusMember) {
    const { ancestors, descendants } = lineagePath(tree.members, tree.lineage, focusMember.id, through);
    const keep = new Set([focusMember.id, ...ancestors, ...descendants]);
    // the focused person is drawn even when daughters are otherwise hidden
    const shown = new Set(visible);
    visible = tree.members.filter((m) => keep.has(m.id) && (m.id === focusMember.id || shown.has(m)));
    counted = tree.members.filter((m) => keep.has(m.id) && !hidden.has(m.id));
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
    trunkLabels: [], soil: null, trunkZigzag: false, base: null, stubs: [], nodes: [], spouses: [],
    branches: [], edges: [], canopy: null, surfaceRoots: [], medallions: [],
    frame: place,
    legibility: { minTextMm, smallestTextMm: minTextMm, ok: true, scaleNeeded: 1 },
    overlaps: 0,
    clarity: { ok: true, expected: 0, drawn: 0, clearCrossings: 0, issues: [] },
    tooDense: false,
    ringLoad: 0,
    focus: null,
    familiesThrough: [...through],
    generationOffset: 0, generationsPresent: [], stats,
  };
  if (visible.length === 0) return empty;

  // ── 1. Lineage hierarchy ──────────────────────────────────────────────
  const index = childrenIndex(visible, tree.lineage, through);
  const seen = new Set<string>();
  const build = (m: MemberDTO): TNode => {
    seen.add(m.id); // guards against cycles
    // Half-siblings stay together: children are grouped by mother (in the
    // order the mothers first appear), keeping birth order within a group.
    // (a daughter whose family is shown: her children grouped by father)
    const own = (index.get(m.id) ?? []).filter((c) => !seen.has(c.id));
    const kids = groupByParent(own, through.has(m.id) && tree.lineage !== "MATRILINEAL" ? "fatherId" : "motherId");
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

  // Families through a daughter: her children (drawn from her, not from
  // their father) and all their descendants are relatives outside the
  // lineage, on dotted lines. Their generations are counted from her. That
  // includes a child whose father is not recorded: drawn from his mother,
  // he is still not of the line.
  const dotted = new Set<string>();
  const generationOf = new Map<string, number>();
  root.each((n) => {
    const m = n.data.member;
    const p = n.parent?.data.member;
    if (!m || !p) return;
    // (drawn from their mother in a father's-line tree, or the reverse)
    const throughHer = tree.lineage === "MATRILINEAL"
      ? m.fatherId === p.id && m.motherId !== p.id
      : m.motherId === p.id && m.fatherId !== p.id;
    if (dotted.has(p.id) || throughHer) {
      dotted.add(m.id);
      generationOf.set(m.id, (generationOf.get(p.id) ?? p.generation) + 1);
    }
  });
  const genOf = (m: MemberDTO) => generationOf.get(m.id) ?? m.generation;

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
  // the names' shape: "auto" chooses by how many names the branches carry
  const branchNames = crownNodes.length + offshoots.reduce((sum, o) => sum + o.node.descendants().length, 0);
  const requestedShape = opts.nodeShape ?? "auto";
  const nodeShape: NodeShape = requestedShape === "auto" ? (branchNames > AUTO_LEAF_LIMIT ? "oval" : "leaf") : requestedShape;

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
    if (nodeShape === "oval") return (textWidth(label, fs) + fs * OVAL_PAD) * fs * OVAL_H;
    return (textWidth(label, fs) + fs * 0.9) * fs * 1.45;
  };

  // Canopy: an egg whose area is the names' area times a packing factor
  // (room for branches and breathing space), as wide as the page allows.
  const PACK = 2.8;
  const ASPECT = 0.82;
  const EGG = 3.3; // area of the egg / (rx·ry)
  const rxMax = W / 2 - margin;
  // Generations are drawn on rings, so a deep family also needs radial
  // room: every ring a clear gap from the next, a name's height plus space
  // for the lines between them, however few names the family has.
  // (a generation growing from spouses' holders needs room for them too)
  const holderRoom = new Set<number>();
  {
    const matri = tree.lineage === "MATRILINEAL";
    const partners = new Map<string, Set<string>>();
    for (const c of tree.members) {
      const lineParent = matri ? c.motherId : c.fatherId, other = matri ? c.fatherId : c.motherId;
      if (lineParent && other) partners.set(lineParent, (partners.get(lineParent) ?? new Set()).add(other));
    }
    base.each((n) => {
      const id = n.data.member?.id;
      if (n.children && id && (through.has(id) || (opts.motherNames && partners.has(id)))) holderRoom.add(n.depth - base.depth + 1);
    });
  }
  const RING_GAP = 3.6;
  /** Dense packing grows the canopy until its outermost ring is at most this far out (1 = its rim). */
  const DENSE_TOP = 1;
  // Every generation's names must also fit around their own ring, side by
  // side (a crowded generation in two or three rows hides the lines to the
  // back rows behind the front ones). A name's extent across its ray, plus
  // a corridor each side for the lines that pass between neighbours (it
  // narrows with smaller names, never below what the lines need).
  // (lines keep their width when the names are set smaller, so the corridor does too)
  const corridorFor = (_fName: number, f: number) => f * 0.6;
  const extentOf = (n: HNode, fName: number, f: number) => {
    const a = estArea(n, fName);
    const d = n.depth - base.depth;
    const fs = fontFor(d, isMedallion(n, d, "crown"), fName);
    // a label's mean extent across a ray (its width at the top, its height on the sides)
    const h = Math.min(Math.sqrt(a), fs * 1.8);
    return 0.64 * (a / h + h) + 2 * corridorFor(fName, f);
  };
  const ringDemand = (fName: number, f: number) => {
    const demand: number[] = [];
    for (const n of crownNodes) {
      const d = n.depth - base.depth;
      demand[d] = (demand[d] ?? 0) + extentOf(n, fName, f);
    }
    return demand;
  };
  const ARC = Math.PI + 0.24; // the canopy's angular range (thetaStart - thetaEnd)
  const RING_FILL = 0.85; // families leave a little room between them
  // Where each ring must be at least (as a fraction of the way from r0 to
  // the canopy's mean reach M), for its names to fit around it, and no
  // closer than a ring gap to the one inside it.
  const ringChain = (demand: number[], r0: number, M: number, f: number) => {
    const span = Math.max(1, M - r0);
    const t = [0];
    for (let d = 1; d <= Math.max(1, base.height); d++) {
      const need = ((demand[d] ?? 0) / (ARC * RING_FILL) - r0) / span;
      const room = holderRoom.has(d) ? (f * 3.2) / span : 0;
      t.push(Math.max(need, d === 1 ? room : t[d - 1] + (f * 2.6) / span + room));
    }
    return t;
  };
  // the canopy's mean reach from the canopy base, for an egg of rx × ry
  const meanReachFor = (rx: number, ry: number) => {
    const cy = 0, oy = 0.8 * ry;
    const inside = (x: number, y: number) => {
      const ny = (y - cy) / ry;
      const k = 1 + 0.13 * Math.max(-1, Math.min(1, ny));
      return Math.abs(x / (rx * k)) ** 2.4 + Math.abs(ny) ** 2.4 <= 1;
    };
    let sum = 0;
    for (let i = 0; i <= 16; i++) {
      const th = -0.12 + (ARC * i) / 16;
      let lo = 0, hi = Math.max(rx, ry) * 2.5;
      for (let k = 0; k < 22; k++) {
        const mid = (lo + hi) / 2;
        if (inside(Math.cos(th) * mid, oy - Math.sin(th) * mid)) lo = mid; else hi = mid;
      }
      sum += lo * 0.95;
    }
    return sum / 17;
  };
  const crownDims = (f: number) => {
    const A = Math.max(crownNodes.reduce((sum, n) => sum + estArea(n, f), 0) * PACK, (f * 14) ** 2);
    const depthNeed = baseRFor(f) + f * 1.6 + Math.max(0, base.height - 1) * f * RING_GAP;
    // the rings' reach from the crown base: ~0.76·rx to the sides, ~1.7·ry upward
    const rx = Math.min(rxMax, Math.max(Math.sqrt(A / (EGG * ASPECT)), depthNeed / 0.76));
    const ry = Math.max(A / (EGG * rx), depthNeed / 1.7);
    return { rx, ry };
  };
  const baseText = base.data.member ? labelOf(base.data.member) : { label: "", subLabel: null };
  // The canopy base's space: a circle of radius baseRFor, which sets the
  // spacing of canopy, trunk and foundation. It is drawn as an oval inside
  // that space (BASE_OVAL), like the other names but larger, with the
  // scalloped double ring that marks the tree's anchor.
  const baseRFor = (f: number) => {
    const fb = f * 1.3;
    if (!base.data.member) return f;
    const sub = baseText.subLabel ? textWidth(baseText.subLabel, fb * 0.68) / 2 + fb * 0.7 : 0;
    return Math.max(fb * 1.75, textWidth(baseText.label, fb) / 2 + fb * 0.8, sub);
  };
  // Trunk: the ancestors in one centred column, one per row, inside the
  // bark (never two staggered columns: the trunk reads as one solid form).
  // budget.trunk < 1 sets the trunk's names smaller with the canopy's (see
  // the balancing in computePosterLayout).
  const trunkFontFor = (f: number) => Math.max(floorFor(f), f * 0.95 * clamp(budget.trunk ?? 1, TRUNK_FOLLOW_MIN, 1));
  const stepFor = (f: number) => trunkFontFor(f) * 1.75;
  const trunkSection = (count: number, f: number) => {
    // a bare trunk (no ancestors above the canopy base) still stands tall
    // enough to carry its canopy: at least BARE_TRUNK of the content height
    if (!count) return Math.max(f * 3.5, avail * BARE_TRUNK);
    const ft = trunkFontFor(f);
    return ft * 1.4 + (count - 1) * stepFor(f) + ft * 1.5;
  };
  // Foundation: the ancestors older than the trunk, drawn by the chosen
  // soil style. The style measures itself, so the whole poster is sized
  // with the foundation it will actually have.
  const joiner = rtl ? " بن " : " son of ";
  const soilW = Math.min(W * 0.78, W - 2 * margin);
  const soilDef = soilStyle(opts.soilStyle);
  const soilTextFor = (onTrunk: HNode[], soil: HNode[]) =>
    customSoil ?? [onTrunk[0], ...[...soil].reverse()].filter(Boolean).map((n) => withLaqab(n.data.member!, rtl)).join(joiner);
  const soilContextFor = (f: number, p: { onTrunk: HNode[]; soil: HNode[] }): SoilContext => ({
    // nearest the trunk first, the oldest last
    entries: [...p.soil].reverse().map((n) => ({
      id: n.data.member!.id, label: withLaqab(n.data.member!, rtl), generation: n.data.member!.generation + 1,
    })),
    text: soilTextFor(p.onTrunk, p.soil),
    custom: !!customSoil,
    trunkName: p.onTrunk[0]?.data.member?.name ?? null,
    rtl, joiner, f, floor: floorFor(f), maxFont, maxWidth: soilW, avail, textWidth,
  });

  type Plan = { onTrunk: HNode[]; soil: HNode[] };
  // The foundation has a height budget. Its names are never set below the
  // legible size: a lineage too long for its budget leaves names out of
  // its middle (shown as "…"), keeping the nearest and the last ones.
  // A branch poster is about the descendants: trunk and foundation together
  // take at most LOWER_SHARE of the page (the trunk at most TRUNK_SHARE),
  // leaving the canopy at least 60%.
  const branchMode = !!focusMember;
  // (a whole family's foundation gets less room when the canopy is the larger part)
  const soilShare = crownNodes.length > trunkChain.length ? SOIL_SHARE_SMALL : SOIL_SHARE;
  const soilBudget = (f: number, p: Plan) =>
    branchMode ? Math.max(f * 6, avail * LOWER_SHARE - trunkSection(p.onTrunk.length, f)) : avail * soilShare;
  const soilFor = (f: number, p: Plan): { ctx: SoilContext; height: number } => {
    const full = soilContextFor(f, p);
    const budget = soilBudget(f, p);
    const height = soilDef.height(full);
    if (height <= budget) return { ctx: full, height };
    const names = namesOf(full);
    let lo = 1, hi = Math.max(1, names.prose ? wordsOf(names.prose).length : names.entries.length);
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (soilDef.height(shortenSoil(full, mid)) <= budget) hi = mid; else lo = mid + 1;
    }
    const ctx = shortenSoil(full, lo);
    return { ctx, height: soilDef.height(ctx) };
  };
  const totalFor = (f: number, p: Plan) => {
    const trunkH = trunkSection(p.onTrunk.length, f);
    if (branchMode && trunkH > avail * TRUNK_SHARE) return Infinity;
    const useSoil = p.soil.length > 0 || !!customSoil;
    return 1.8 * crownDims(f).ry + baseRFor(f) + trunkH + (useSoil ? soilFor(f, p).height : f * 0.8);
  };
  const avail = contentBottom - contentTop;
  // Candidate arrangements, most faithful first.
  const plans: Plan[] = [];
  if (startIdx >= 0) {
    const onTrunk = trunkChain.slice(startIdx);
    const soil = trunkChain.slice(0, startIdx);
    plans.push({ onTrunk, soil });
    // a trunk too long for its share hands its oldest names to the foundation
    for (let k = startIdx + 1; k <= trunkChain.length - 4; k++) {
      plans.push({ onTrunk: trunkChain.slice(k), soil: trunkChain.slice(0, k) });
    }
  } else {
    // automatic: the nearest ancestors on the trunk, the rest in the foundation
    const most = Math.min(trunkChain.length, opts.maxTrunkLabels ?? (branchMode ? BRANCH_TRUNK_NAMES : 12));
    for (let k = most; k >= Math.min(most, 4); k--) {
      const onTrunk = trunkChain.slice(trunkChain.length - k), soil = trunkChain.slice(0, trunkChain.length - k);
      plans.push({ onTrunk, soil });
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
  // On a branch poster the trunk is context: its nearest few ancestors
  if (branchMode && plans.some((p) => p.onTrunk.length <= BRANCH_TRUNK_NAMES)) {
    plans.splice(0, plans.length, ...plans.filter((p) => p.onTrunk.length <= BRANCH_TRUNK_NAMES));
  }
  let plan = plans.find((p) => totalFor(minFont, p) <= avail);
  let f: number;
  if (plan) {
    f = bestF(plan);
  } else {
    // Cannot fit legibly on this paper: fit anyway, smaller, and report it.
    plan = plans[plans.length - 1];
    f = largestFitting(plan, minFont * 0.2, minFont);
  }
  // A retry (fontScale < 1) keeps the canopy the same size and sets the
  // canopy's names smaller, so each gets more room around it.
  // Dense packing (a second try, see computePosterLayout): the canopy is
  // made larger until every generation fits around its ring in one row,
  // and the names smaller to make room for it on the page, but never
  // below the legible size (a larger paper gives the rest).
  let denseCrown: { rx: number; ry: number } | null = null;
  if (dense) {
    const grow = (fd: number) => {
      let { rx, ry } = crownDims(fd);
      const cap = (avail - (totalFor(fd, plan!) - 1.8 * ry)) / 1.8;
      const demand = ringDemand(fd, fd);
      const r0d = baseRFor(fd) + fd * 1.6;
      for (let i = 0; i < 80; i++) {
        const t = ringChain(demand, r0d, meanReachFor(rx, ry), fd);
        if (t[t.length - 1] <= DENSE_TOP) return { rx, ry, fits: true };
        if (ry * 1.05 > cap) return { rx, ry, fits: false };
        rx = Math.min(rxMax, rx * 1.05);
        ry *= 1.05;
      }
      return { rx, ry, fits: false };
    };
    if (!grow(f).fits && f > minFont) {
      if (grow(minFont).fits) {
        let lo = minFont, hi = f;
        for (let i = 0; i < 12; i++) {
          const mid = (lo + hi) / 2;
          if (grow(mid).fits) lo = mid; else hi = mid;
        }
        f = lo;
      } else {
        f = minFont;
      }
    }
    const g = grow(f);
    denseCrown = { rx: g.rx, ry: g.ry };
  }
  const fl = f * fontScale;
  // The finest line. When the names are set smaller to give each more
  // room, the lines are finer too (down to a quarter), or they would crowd
  // each other where the names no longer do.
  const lineMin = Math.max(W * 0.0018, f * 0.1) * Math.max(0.25, Math.min(1, fontScale));
  const trunkZigzag = false;
  const shownTrunk = plan.onTrunk;
  const ancient = plan.soil;
  const shownSet = new Set(shownTrunk);
  const useSoil = ancient.length > 0 || !!customSoil;

  // Spare height lets the canopy breathe, then the whole is centred.
  let { rx, ry } = denseCrown ?? crownDims(f);
  // A canopy of more than a few dozen names spreads to the page's width:
  // the rings are longer, so the names keep their size (instead of being
  // set smaller to clear their lines) and the poster is filled, not a
  // narrow tree in a wide frame. (A small family keeps its natural width,
  // or its few names would sit at the ends of long bare stalks.)
  if (crownNodes.length >= WIDE_CANOPY) rx = Math.max(rx, Math.min(rxMax, ry * 1.7));
  let slack = avail - (totalFor(f, plan) - 1.8 * crownDims(f).ry + 1.8 * ry);
  // A small family's canopy spreads out (up to twice its natural height)
  // and its trunk grows taller, rather than floating in empty paper. A
  // branch poster's canopy stops at CANOPY_GROWTH × its natural height, or
  // a branch of two or three people is stretched into long bare stalks;
  // height it cannot use is shared above and below.
  const ryMax = ry * (branchMode ? CANOPY_GROWTH : 2);
  let stemExtra = 0;
  if (branchMode && slack > 0) {
    // a branch poster's canopy reaches for 70% of the page
    const grow = Math.min(slack / 1.8, Math.max(0, avail * (1 - LOWER_SHARE) - (1.8 * ry + baseRFor(f))) / 1.8, ryMax - ry);
    rx = Math.min(rxMax, rx * (1 + grow / ry));
    ry += grow;
    slack -= grow * 1.8;
  }
  if (slack > 0) {
    const grow = Math.min((slack * 0.7) / 1.8, Math.max(0, ryMax - ry));
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
  // the oval drawn inside the base's space
  const baseOval = { rx: baseMedallionR * BASE_OVAL.w, ry: baseMedallionR * (baseText.subLabel ? 0.85 : BASE_OVAL.h) };
  const trunkFont = trunkFontFor(f);
  const trunkStep = stepFor(f);
  const labelTop = origin.y + baseMedallionR + trunkFont * 1.4;
  const labelBottom = labelTop + Math.max(0, shownTrunk.length - 1) * trunkStep;
  groundY = shownTrunk.length ? labelBottom + trunkFont * 1.5 : origin.y + baseMedallionR + trunkSection(0, f) + stemExtra;
  const badgeW = (n: HNode) => Math.max(textWidth(n.data.member!.name, trunkFont) + trunkFont * 1.7, trunkFont * 3.4);
  const widest = Math.max(0, ...shownTrunk.map(badgeW));
  const medianBadge = shownTrunk.length ? shownTrunk.map(badgeW).sort((a, b) => a - b)[shownTrunk.length >> 1] : 0;
  const TW = clamp(medianBadge * 0.85, f * 2.6, W * 0.12);
  // the badges rest inside the bark: the trunk is the widest badge plus a margin of wood
  trunkWidth = shownTrunk.length ? clamp(widest + trunkFont * 1.6, TW, W * 0.22) : TW;

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
  const maxDepth = Math.max(1, base.height);
  const r0 = baseMedallionR + f * 1.6;
  // Where each generation's ring lies, as a fraction t of the way from r0
  // to the canopy's rim: evenly paced, but never closer than a name's
  // height plus room for the lines between two rings (crownDims sizes the
  // canopy for that; a retry with smaller names keeps the canopy's size).
  let meanCrownReach = 0;
  for (let i = 0; i <= 32; i++) meanCrownReach += (reach(thetaEnd + ((thetaStart - thetaEnd) * i) / 32) * 0.95) / 33;
  const ringT: number[] = (() => {
    // evenly paced, but a crowded generation further out, where its ring
    // is long enough for its names (crownDims sized the canopy for it)
    const span = Math.max(1, meanCrownReach - r0);
    const gap = (f * 2.6) / span;
    const room = (d: number) => (holderRoom.has(d) ? (f * 3.2) / span : 0);
    const need = ringChain(ringDemand(fl, f), r0, meanCrownReach, f);
    const t = [0];
    for (let d = 1; d <= maxDepth; d++) t.push(Math.max(d / maxDepth, dense ? need[d] ?? 0 : 0, (d === 1 ? 0 : t[d - 1] + gap) + room(d)));
    const top = t[maxDepth];
    return top > 1 ? t.map((v) => v / top) : t;
  })();
  // The angle a sub-branch needs on its most crowded ring: on each ring, the
  // sum of its names' extents across the ray, over the ring's radius. Inner
  // rings are short, so a father of many childless children (with daughters
  // shown, often) needs far more room there than his descendant count says.
  const ringR = ringT.map((t) => r0 + t * Math.max(1, meanCrownReach - r0));
  const extentAcross = (n: HNode) => {
    const a = estArea(n, fl);
    const d = n.depth - base.depth;
    const fs = fontFor(d, isMedallion(n, d, "crown"), fl);
    // a label's mean extent across a ray (its width at the top, its height on the sides)
    const h = Math.min(Math.sqrt(a), fs * 1.8);
    return 0.64 * (a / h + h) + 2 * corridorFor(fl, f);
  };
  const ringNeed = new Map<HNode, Map<number, number>>();
  const needOf = (n: HNode): Map<number, number> => {
    let m = ringNeed.get(n);
    if (m) return m;
    m = new Map([[n.depth, extentAcross(n) / Math.max(1, ringR[n.depth - base.depth] ?? 1)]]);
    for (const k of (n.children ?? []) as HNode[]) for (const [d, v] of needOf(k)) m.set(d, (m.get(d) ?? 0) + v);
    ringNeed.set(n, m);
    return m;
  };
  const angleNeed = (n: HNode) => Math.max(...needOf(n).values());
  const partition = (node: HNode, u0: number, u1: number, d0 = node.depth) => {
    node.u0 = u0;
    node.u1 = u1;
    node.u = (u0 + u1) / 2;
    const kids = (node.children ?? []) as HNode[];
    if (!kids.length) return;
    // Proportional to the angle each sub-branch needs: a name on an inner
    // ring takes a wider angle than one further out (rings grow with their
    // radius), so a father of many children claims a wider slice than a
    // sibling with as many descendants spread over later generations.
    // (Weighted by 1/√generations below, not 1/generations: outer rings are
    // also more crowded with their own cousins.)
    const rawWeights = kids.map((k) => k.descendants().reduce((sum, x) => sum + 1 / Math.sqrt(Math.max(1, x.depth - d0)), 0));
    const totalWeight = rawWeights.reduce((a, b) => a + b, 0);
    // Balance, at every level: every child with descendants of his own gets
    // at least a minimum share of the space, so a lineage much larger than
    // its brothers does not push them into a sliver at one edge and swing
    // the tree to one side. (Not for a childless child: one name needs one
    // place, and a floor for each of several would starve their brothers'
    // families. 10%, not more: 15% made dense families tangle.)
    const minWeight = totalWeight * MIN_CHILD_SHARE;
    const balanced = rawWeights.map((w, i) => (kids[i].children?.length ? Math.max(w, minWeight) : w));
    const balancedTotal = balanced.reduce((a, b) => a + b, 0);
    // With strict family packing, never less than the room its most crowded
    // ring needs, or ring packing pushes its names out of its sector and
    // their lines swing across a neighbouring family.
    const needs = kids.map(angleNeed);
    const needTotal = needs.reduce((a, b) => a + b, 0) || 1;
    const weights = strictFamilies ? balanced.map((w, i) => Math.max(w / balancedTotal, needs[i] / needTotal)) : balanced;
    const newTotal = weights.reduce((a, b) => a + b, 0);
    // Primary lineage: the child on the way to the centred branch takes the
    // middle of this span (at least CENTER_SHARE of it). His brothers keep
    // their birth order on either side, split where the two sides weigh
    // most alike (the elder ones on one side, the younger on the other),
    // so neither side is crammed while the other stays empty. Down the
    // whole way, the centred branch ends up straight above the trunk.
    const c = kids.findIndex((k) => centerPath.has(k));
    if (c >= 0) {
      const mid = (u0 + u1) / 2;
      const half = ((u1 - u0) * Math.max(CENTER_SHARE, weights[c] / newTotal)) / 2;
      const others = kids.map((_, i) => i).filter((i) => i !== c);
      const otherTotal = others.reduce((sum, i) => sum + weights[i], 0);
      let cut = 0, best = Infinity, acc = 0;
      for (let k = 0; k <= others.length; k++) {
        const diff = Math.abs(otherTotal - 2 * acc);
        if (diff < best) { best = diff; cut = k; }
        if (k < others.length) acc += weights[others[k]];
      }
      const spread = (from: number, to: number, list: number[]) => {
        const total = list.reduce((sum, i) => sum + weights[i], 0) || 1;
        let a = from;
        for (const i of list) {
          const span = ((to - from) * weights[i]) / total;
          partition(kids[i], a, a + span, d0);
          a += span;
        }
      };
      spread(u0, mid - half, others.slice(0, cut));
      partition(kids[c], mid - half, mid + half, d0);
      spread(mid + half, u1, others.slice(cut));
      return;
    }
    let a = u0;
    kids.forEach((k, i) => {
      const span = ((u1 - u0) * weights[i]) / newTotal;
      partition(k, a, a + span, d0);
      a += span;
    });
  };
  // the way from the canopy base to the centred branch (empty when none is
  // set, or it is not in the canopy)
  const centerId = opts.centerBranchId !== undefined ? opts.centerBranchId : (tree.settings?.centerBranchId ?? null);
  const centerNode = centerId ? (base.descendants() as HNode[]).find((n) => n !== base && n.data.member?.id === centerId) : undefined;
  const centerPath = new Set<HNode>(centerNode ? (centerNode.ancestors() as HNode[]).filter((n) => n !== base && n.depth > base.depth) : []);
  const centerIds = new Set([...centerPath].map((n) => n.data.member!.id));
  partition(base, 0.015, 0.985);

  const nodes: LiveNode[] = [];
  const byId = new Map<string, LiveNode>();

  const makeNode = (
    n: HNode, p: Vec, depth: number, from: Vec, region: Region, side: number,
  ): LiveNode => {
    const m = n.data.member!;
    const { label, subLabel: oneLine } = labelOf(m);
    const medallion = isMedallion(n, depth, region);
    const terminal = !n.children;
    let fs = fontFor(depth, medallion, fl);
    // a round name holder grows with its widest line: a second line much
    // wider than the name goes onto two ("أمها منيرة" / "المطيري")
    const round = medallion || (nodeShape === "circle" && !isLeaf(n));
    const subLabel = oneLine && round && textWidth(oneLine, fs * 0.7) > textWidth(label, fs) * 1.15
      ? splitInTwo(oneLine) : oneLine;
    const subLines = subLabel ? subLabel.split("\n") : [];
    const subW = Math.max(0, ...subLines.map((l) => textWidth(l, fs * 0.7)));
    const subH = subLabel ? fs * 0.8 * subLines.length : 0;
    let shape: PosterShape;
    let w: number, h: number, angle = 0, leafLength = 0, leafWidth = 0;
    if (medallion) {
      shape = "medallion";
      const tw = Math.max(textWidth(label, fs), subW);
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
        w = h = Math.max(fs * 2.55 + subH * 0.6, Math.max(textWidth(label, fs), subW) / 0.8);
      } else if (nodeShape === "oval") {
        shape = "oval";
        w = tw + fs * OVAL_PAD;
        h = fs * OVAL_H + subH;
      } else {
        shape = "pill";
        w = tw + fs * 0.9;
        h = fs * 1.45 + subH;
      }
    }
    const node: LiveNode = {
      id: m.id, member: m, x: p.x, y: p.y, tx: p.x, ty: p.y, depth,
      generation: genOf(m), w, h, fontSize: fs, shape, label, subLabel, terminal,
      childrenOutside: !terminal && !dotted.has(m.id) && n.children!.every((c) => dotted.has(c.data.member!.id)),
      angle, leafLength, leafWidth, leafCount: n.value ?? 1,
      parentId: n.parent?.data.member?.id ?? null,
      mass: medallion ? 4 : 1, region, side,
    };
    nodes.push(node);
    byId.set(node.id, node);
    return node;
  };

  // ── 4. Crown target positions ────────────────────────────────────────
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
    const t = ringT[d];
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

  let ringLoad = 0;
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
    // With strict family packing, a name also keeps to its side of every
    // name on an inner ring of another family (by family order: the sector
    // angle it was given). Order on
    // each ring alone is not enough: near the trunk the canopy is shallow,
    // so a name pushed far along an outer ring comes as close to the centre
    // as an inner one, and its line cuts across the neighbouring family.
    const familyOrder = new Map(crownLive.map((n) => [n.id, n.ray!]));
    const placed: { n: LiveNode; half: number }[] = [];
    const ancestorIds = (n: LiveNode) => {
      const ids = new Set<string>();
      for (let p = n.parentId; p; p = byId.get(p)?.parentId ?? null) ids.add(p);
      return ids;
    };
    for (const d of [...rings.keys()].sort((a, b) => a - b)) {
      const ring = rings.get(d)!;
      ring.sort((a, b) => b.ray! - a.ray!); // anticlockwise from the left
      const radiusAt = (th: number) => r0 + ringT[d] * Math.max(0, reach(th) * 0.95 - r0);
      // angular half-width of a label at angle th (its extent across the ray)
      const half = (n: LiveNode, th: number) =>
        // (+ a corridor so neighbouring lines stay clearly apart)
        (Math.abs((n.w / 2) * Math.sin(th)) + Math.abs((n.h / 2) * Math.cos(th)) + corridorFor(fl, f)) / Math.max(1, radiusAt(th));
      const target = ring.map((n) => n.ray!);
      // 1-D packing along the ring: neighbours pushed apart, kept in order,
      // with a gentle pull back to their targets. (Any overlap left is then
      // resolved by stepping out along the ray, which keeps each line close
      // to its parent's direction; pushing names further along the ring
      // slants lines across their neighbours.)
      // Strict family packing (a second try, see computePosterLayout): a
      // crowded ring gives way where it costs nothing. A childless name has
      // one line, straight back to its father, so it can slide along the
      // ring; a father moved off his sector would drag his children's lines
      // across his neighbours' families, so fathers hold their place.
      const bounds = ring.map((n) => {
        const own = familyOrder.get(n.id)!;
        const ancestors = ancestorIds(n);
        let b0 = lo, b1 = hi;
        for (const y of placed) {
          if (ancestors.has(y.n.id)) continue;
          const margin = half(n, y.n.ray!);
          if (familyOrder.get(y.n.id)! > own) b1 = Math.min(b1, y.n.ray! - margin);
          else b0 = Math.max(b0, y.n.ray! + margin);
        }
        // no room between them: unbounded (the clarity check judges the result)
        return b0 <= b1 && strictFamilies ? [b0, b1] : [lo, hi];
      });
      // (the primary lineage always holds its place: it is the centre)
      const mobility = ring.map((n) => (centerIds.has(n.id) ? 0.05 : n.terminal || !strictFamilies ? 1 : 0.12));
      const pull = ring.map((n) => (centerIds.has(n.id) ? 0.4 : n.terminal || !strictFamilies ? 0.02 : 0.15));
      const th = [...target];
      for (let it = 0; it < 200; it++) {
        let moved = false;
        for (let i = 1; i < th.length; i++) {
          const need = half(ring[i - 1], th[i - 1]) + half(ring[i], th[i]);
          const gap = th[i - 1] - th[i];
          if (gap < need) {
            const share = mobility[i - 1] / (mobility[i - 1] + mobility[i]);
            th[i - 1] += (need - gap) * share;
            th[i] -= (need - gap) * (1 - share);
            moved = true;
          }
        }
        for (let i = 0; i < th.length; i++) th[i] = clamp(th[i] + (target[i] - th[i]) * pull[i], bounds[i][0], bounds[i][1]);
        if (!moved) break;
      }
      ringLoad = Math.max(ringLoad, ring.reduce((a, n, i) => a + 2 * half(n, th[i]), 0) / (hi - lo));
      ring.forEach((n, i) => {
        n.ray = th[i];
        placed.push({ n, half: half(n, th[i]) });
        const p = add(origin, scale(dirOf(th[i]), Math.min(radiusAt(th[i]), rMaxOnPage(n, th[i]))));
        n.x = n.tx = p.x;
        n.y = n.ty = p.y;
      });
    }
  }

  // ── Trunk labels ─────────────────────────────────────────────────────
  // Bottom (eldest) to top, one per row, centred in the trunk, all one
  // width (the widest name's), so they read as a column inside the bark.
  const trunkLabels: TrunkLabel[] = shownTrunk.map((n, i) => {
    const m = n.data.member!;
    return {
      member: m, label: m.name, x: origin.x, fontSize: trunkFont,
      y: labelBottom - i * trunkStep,
      w: widest, h: trunkFont * 1.6,
    };
  });
  const labelY = new Map(trunkLabels.map((l) => [l.member.id, l.y]));

  // ── Offshoots: stubs (childless) and side branches (with descendants) ─
  const stubs: PosterNode[] = [];
  const branchesOut: Branch[] = [];
  const edges: Edge[] = [];
  const sample = (c: Cubic, n = 16): Vec[] => Array.from({ length: n + 1 }, (_, i) => cubicPointAt(c, i / n));
  /** A clean tapered branch with a rounded joint where it starts. */
  const shaded = (curve: Cubic, w0: number, w1: number, samples = 14, ease = 2): Branch => ({
    d: ribbonPath(curve, w0, w1, samples, ease) + circlePath(curve.p0, w0 / 2),
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
        generation: genOf(m), w: size, h: size, fontSize: fs, shape: "medallion", label,
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

  // Line widths (the pipe model, with fine twigs: a single leaf's stalk is
  // only 1.5 × the minimum line, so neighbouring twigs stay clearly apart).
  const totalLeaves = Math.max(1, base.value ?? 1);
  const bs = opts.branchScale ?? 1;
  const wMin = lineMin;
  const wK = Math.min((trunkWidth * 0.8 - wMin) / Math.sqrt(totalLeaves), W * 0.016) * bs;
  const widthOf = (leaves: number) => wMin * 1.5 + wK * (Math.sqrt(leaves) - 1);

  // ── 5b. Connections, and clearing them of unrelated names ─────────────
  // Each connection is a gentle cubic from parent to child that stays
  // close to the straight line, so it remains inside its sub-branch's
  // sector. A name sitting on someone else's line would look attached to
  // it, so such names are pushed off the line (and relaxed again).
  const growingNodes = nodes.filter((n) => n.region !== "fixed");
  const sideAnchor = new Map(visibleOffshoots.map((o) => [o.node.data.member!.id, o.anchor.data.member!.id]));
  const parentIdOf = (node: LiveNode) => node.parentId ?? sideAnchor.get(node.id) ?? base.data.member?.id ?? "";
  const curveOf = new Map<string, Cubic>();

  // Spouses on the branch: a father's wives (when the option is on), each a
  // cartouche on his branch with
  // the children she bore him growing from it; and the husbands of a
  // daughter whose family is shown, on her dotted line. Children whose
  // other parent is not recorded grow from the partner directly.
  // (lone: a spouse with no children on the poster, on a short line from
  // the partner; anchorOf is then the partner)
  type Holder = SpouseHolder & { anchorOf: LiveNode; kids: LiveNode[]; dir: Vec; clear: boolean; pin?: Vec; lone?: boolean };
  const holders: Holder[] = [];
  const holderOf = new Map<string, Holder>();
  {
    const matri = tree.lineage === "MATRILINEAL";
    const kidsOf = new Map<string, LiveNode[]>();
    for (const n of growingNodes) {
      const pid = parentIdOf(n);
      if (n.parentId && pid) kidsOf.set(pid, [...(kidsOf.get(pid) ?? []), n]);
    }
    // everyone whose children (in the line) have a recorded other parent
    const partners = new Map<string, Set<string>>();
    for (const c of tree.members) {
      const lineParent = matri ? c.motherId : c.fatherId, other = matri ? c.fatherId : c.motherId;
      if (lineParent && other) partners.set(lineParent, (partners.get(lineParent) ?? new Set()).add(other));
    }
    for (const [pid, kids] of kidsOf) {
      const throughHer = through.has(pid);
      if (!throughHer && !(opts.motherNames && partners.has(pid))) continue;
      const groups = new Map<string, LiveNode[]>();
      for (const k of kids) {
        // through a daughter: her children's fathers; otherwise a father's wives
        if (throughHer !== dotted.has(k.member.id)) continue;
        const other = throughHer ? (matri ? k.member.motherId : k.member.fatherId) : (matri ? k.member.fatherId : k.member.motherId);
        if (other && byMemberId.has(other)) groups.set(other, [...(groups.get(other) ?? []), k]);
      }
      const names = [...groups.keys()].map((id) => givenAndFamilyName(byMemberId.get(id)!.name));
      for (const [sid, group] of groups) {
        const spouse = byMemberId.get(sid)!;
        const short = givenAndFamilyName(spouse.name);
        const label = names.filter((x) => x === short).length > 1 ? spouse.name : short;
        const fs = Math.max(floorFor(fl), Math.min(...group.map((k) => k.fontSize)) * 0.9);
        const lineages = new Set(group.map((k) => k.lineage ?? null));
        const h: Holder = {
          id: `spouse:${pid}:${sid}`, member: spouse, partnerId: pid, childIds: group.map((k) => k.id),
          // (first name over family name: a narrower panel)
          label, lines: nameLines(label), fontSize: fs, w: 0, h: 0, x: 0, y: 0,
          dotted: throughHer || group.every((k) => dotted.has(k.member.id)),
          lineage: lineages.size === 1 ? [...lineages][0] : null,
          anchorOf: group[0], kids: group, dir: UP, clear: true,
        };
        h.w = Math.max(...h.lines.map((t) => textWidth(t, fs))) + fs * 2;
        h.h = fs * (1.6 + 1.05 * (h.lines.length - 1));
        holders.push(h);
        for (const k of group) holderOf.set(k.id, h);
      }
    }
    // Every other recorded spouse of someone on the poster (a wife with no
    // children yet, a daughter's husband) on a short line from them, when
    // spouses are shown. (Not one who is on the poster in her own right.)
    if (opts.motherNames) {
      const onPoster = new Set([...nodes.map((n) => n.id), ...(base.data.member ? [base.data.member.id] : [])]);
      for (const p of growingNodes) {
        const married = tree.marriages
          .filter((x) => x.spouseAId === p.id || x.spouseBId === p.id)
          .map((x) => (x.spouseAId === p.id ? x.spouseBId : x.spouseAId));
        for (const sid of new Set(married)) {
          const spouse = byMemberId.get(sid);
          if (!spouse || onPoster.has(sid) || holders.some((h) => h.partnerId === p.id && h.member.id === sid)) continue;
          const label = givenAndFamilyName(spouse.name);
          const fs = Math.max(floorFor(fl), p.fontSize * 0.85);
          // (a daughter's husband is of another family: a dotted line)
          const outside = dotted.has(p.id) || (matri ? p.member.gender === "MALE" : p.member.gender === "FEMALE");
          const h: Holder = {
            id: `spouse:${p.id}:${sid}`, member: spouse, partnerId: p.id, childIds: [],
            label, lines: nameLines(label), fontSize: fs, w: 0, h: 0, x: 0, y: 0,
            dotted: outside, lineage: p.lineage ?? null,
            anchorOf: p, kids: [], dir: UP, clear: true, lone: true,
          };
          h.w = Math.max(...h.lines.map((t) => textWidth(t, fs))) + fs * 2;
          h.h = fs * (1.6 + 1.05 * (h.lines.length - 1));
          holders.push(h);
        }
      }
    }
  }
  // The width of each drawn line at its start and end, as section 6 draws
  // it (the clarity check judges lines by their width).
  const nodeWidths = (node: LiveNode) => {
    if (dotted.has(node.member.id)) {
      const w = Math.max(wMin * 2.2, node.shape === "leaf" ? widthOf(1) : widthOf(node.leafCount) * 0.8);
      return { w0: w, w1: w };
    }
    if (node.shape === "leaf") return { w0: widthOf(1), w1: Math.max(wMin * 0.8, node.fontSize * 0.14) };
    const w = widthOf(node.leafCount);
    return { w0: node.depth === 1 && !holderOf.has(node.id) ? w * 1.15 : w, w1: w * 0.7 };
  };
  const holderWidths = (h: Holder) => {
    const w = widthOf(Math.max(1, h.kids.reduce((a, k) => a + (k.shape === "leaf" ? 1 : k.leafCount), 0)));
    if (h.dotted) {
      const wd = Math.max(wMin * 2.2, w * 0.8);
      return { w0: wd, w1: wd };
    }
    return { w0: !h.lone && h.anchorOf.region === "crown" && h.anchorOf.depth === 1 ? w * 1.15 : w, w1: w * 0.85 };
  };
  // Where a line to a child starts: its parent's name, or for a main limb
  // the canopy base (or the trunk, for a side branch).
  const startOf = (node: LiveNode): Vec => {
    const parent = node.parentId ? byId.get(node.parentId) : undefined;
    return parent && parent.region !== "fixed" ? { x: parent.x, y: parent.y } : (stemStart.get(node.id) ?? origin);
  };
  /** Where the line to a spouse's holder starts: the partner (as for the children's lines). */
  const fromOf = (h: Holder): Vec => (h.lone ? { x: h.anchorOf.x, y: h.anchorOf.y } : startOf(h.anchorOf));
  const baseBoxOf = () => (base.data.member ? { x: origin.x, y: origin.y, w: baseOval.rx * 2, h: baseOval.ry * 2 } : null);
  // A holder sits on the way from the partner to the children she bore,
  // nearer the partner, wherever it and the lines to and from it are clear
  // of every other name and holder.
  const placeHolders = () => {
    if (!holders.length) return;
    // the lines as last drawn, sampled once for this placement
    const drawn = [...curveOf, ...holderCurve].map(([id, c]) => {
      const pts = sample(c, 20);
      const xs = pts.map((q) => q.x), ys = pts.map((q) => q.y);
      return { id, pts, bb: [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)] };
    });
    type Rect = { x: number; y: number; w: number; h: number; id?: string };
    const obstacles: Rect[] = [...nodes, ...trunkLabels.map((l) => ({ ...l, id: l.member.id }))];
    const bb = baseBoxOf();
    if (bb) obstacles.push({ ...bb, id: base.data.member?.id });
    const placed: { h: Holder; from: Vec }[] = [];
    const within = (p: Vec, o: Rect, pad = 0) => Math.abs(p.x - o.x) < o.w / 2 + pad && Math.abs(p.y - o.y) < o.h / 2 + pad;
    // a straight line from a to b passing under r (outside a's and b's own boxes)
    const lineHits = (a: Vec, b: Vec, r: Rect, skip: Rect[]) => {
      if (r.x + r.w / 2 < Math.min(a.x, b.x) || r.x - r.w / 2 > Math.max(a.x, b.x)
        || r.y + r.h / 2 < Math.min(a.y, b.y) || r.y - r.h / 2 > Math.max(a.y, b.y)) return false;
      for (let i = 1; i < 12; i++) {
        const p = add(a, scale(sub(b, a), i / 12));
        if (skip.some((o) => within(p, o))) continue;
        if (within(p, r, -Math.min(r.w, r.h) * 0.08)) return true;
      }
      return false;
    };
    // A partner's spouses sit at the same distance from them (so no line to
    // one passes another), turned a little either way if that finds room.
    const byPartner = new Map<string, Holder[]>();
    // (a partner's spouses with no children on the poster: a group of their own)
    for (const h of holders) {
      const key = `${h.lone ? "lone:" : ""}${h.partnerId}`;
      byPartner.set(key, [...(byPartner.get(key) ?? []), h]);
    }
    for (const group of byPartner.values()) {
      const lone = !!group[0].lone;
      const P = fromOf(group[0]);
      const partnerBox = obstacles.find((o) => o.id === group[0].partnerId) ?? { x: P.x, y: P.y, w: 0, h: 0 };
      for (const h of group) {
        if (lone) {
          // outwards, the way the partner's own branch grows
          const a = h.anchorOf, from = startOf(a);
          h.dir = len(sub(a, from)) > 1e-6 ? norm(sub(a, from)) : UP;
          continue;
        }
        const G = h.kids.reduce((a, k) => add(a, scale({ x: k.x, y: k.y }, 1 / h.kids.length)), { x: 0, y: 0 } as Vec);
        h.dir = norm(sub(G, P));
      }
      const reach = Math.max(0, Math.min(...group.flatMap((h) => h.kids.map((k) => (k.x - P.x) * h.dir.x + (k.y - P.y) * h.dir.y))));
      // (holders placed in this pass are judged where they are going, J,
      // not where they were)
      const at = (q: { h: Holder; J?: Vec }) => (q.J ? { ...q.h, x: q.J.x, y: q.J.y } : q.h);
      const fits = (h: Holder, J: Vec, also: { h: Holder; from: Vec; J?: Vec }[], linesToo = true) => {
        const pad = h.fontSize * 0.25;
        const me = { x: J.x, y: J.y, w: h.w + pad * 2, h: h.h + pad * 2 };
        const others = [...obstacles, ...also.map(at)];
        if (others.some((o) => Math.abs(o.x - J.x) < (o.w + h.w) / 2 + pad && Math.abs(o.y - J.y) < (o.h + h.h) / 2 + pad)) return false;
        if (!linesToo) return true;
        // the partner's line to it, and its lines to the children
        if (others.some((o) => o !== partnerBox && lineHits(P, J, o, [partnerBox, me]))) return false;
        for (const k of h.kids) if (others.some((o) => o !== k && lineHits(J, k, o, [me, k]))) return false;
        // and no line already drawn to another holder runs under it, nor any
        // other line (as drawn last time round)
        if (also.some((q) => lineHits(q.from, at(q), me, [at(q)]))) return false;
        const mine = new Set(h.kids.map((k) => k.id));
        for (const d of drawn) {
          if (mine.has(d.id) || d.id === h.id) continue;
          if (d.bb[1] < me.x - me.w / 2 || d.bb[0] > me.x + me.w / 2 || d.bb[3] < me.y - me.h / 2 || d.bb[2] > me.y + me.h / 2) continue;
          if (d.pts.some((p) => within(p, me))) return false;
        }
        return true;
      };
      const turned = (d: Vec, deg: number) => {
        const a = (deg * Math.PI) / 180;
        return { x: d.x * Math.cos(a) - d.y * Math.sin(a), y: d.x * Math.sin(a) + d.y * Math.cos(a) };
      };
      const TS = [0.45, 0.38, 0.52, 0.31, 0.6, 0.25, 0.68, 0.2, 0.76, 0.84, 0.9, 0.14];
      const DEGS = [0, 8, -8, 16, -16, 24, -24, 32, -32, 42, -42];
      const spot = (h: Holder, ts: number[], also: { h: Holder; from: Vec; J?: Vec }[], linesToo = true, shared = true) => {
        // towards her children, turned a little either way, or towards one of them
        const dirs = [...DEGS.map((deg) => turned(h.dir, deg)), ...h.kids.map((k) => norm(sub(k, P)))];
        for (const t of ts) for (const d of dirs) {
          const along = Math.min(...h.kids.map((k) => (k.x - P.x) * d.x + (k.y - P.y) * d.y));
          if (along <= 0) continue;
          const c = add(P, scale(d, (shared ? Math.min(reach, along) : along) * t));
          if (fits(h, c, also, linesToo)) return c;
        }
        // children fanning out sideways from a large name (the founder at the
        // base), or on several sides of their father: every spot short of the
        // nearest child is still inside the partner's own name, so measured
        // from its edge instead (whether the lines back to the children are
        // clear, fits judges)
        for (const t of [1.15, 1.4, 1.8, 2.4, 3.2]) for (const d of dirs) {
          const c = beyond(h, d, t);
          if (fits(h, c, also, linesToo)) return c;
        }
        return null;
      };
      const edge = (d: Vec, w: number, hh: number) =>
        Math.min(Math.abs(d.x) > 1e-6 ? w / 2 / Math.abs(d.x) : Infinity, Math.abs(d.y) > 1e-6 ? hh / 2 / Math.abs(d.y) : Infinity);
      /** A spot along d just clear of the partner's name (t = 1: touching it). */
      const beyond = (h: Holder, d: Vec, t: number) =>
        add(P, scale(d, (edge(d, partnerBox.w, partnerBox.h) + edge(d, h.w + h.fontSize * 0.5, h.h + h.fontSize * 0.5)) * t));
      const tryAt = (ts: number[]) => {
        const got: { h: Holder; from: Vec; J: Vec }[] = [];
        for (const h of group) {
          const J = spot(h, ts, [...placed, ...got]);
          if (!J) return null;
          got.push({ h, from: P, J });
        }
        return got;
      };
      // a holder the untangling placed stays there (still judged: clear
      // only while it overlaps nothing)
      if (group.every((h) => h.pin)) {
        for (const h of group) {
          h.clear = fits(h, h.pin!, placed, false);
          h.x = h.pin!.x;
          h.y = h.pin!.y;
          placed.push({ h, from: P });
        }
        continue;
      }
      if (lone) {
        // a short line from the partner, beside them rather than straight
        // on (where a child would be), turned as far as it takes to find
        // room (clear of every name and line, else of every name)
        for (const h of group) {
          let J: Vec | null = null;
          for (const linesToo of [true, false]) {
            search: for (const t of [1.2, 1.6, 2.1, 2.8, 3.6]) for (const deg of [70, -70, 50, -50, 90, -90, 30, -30, 110, -110, 0, 135, -135, 180]) {
              const c = beyond(h, turned(h.dir, deg), t);
              if (fits(h, c, placed, linesToo)) { J = c; break search; }
            }
            if (J) break;
          }
          h.clear = !!J;
          const to = J ?? beyond(h, h.dir, 1.2);
          h.x = to.x;
          h.y = to.y;
          placed.push({ h, from: P });
        }
        continue;
      }
      // all at one distance; failing that, each where it finds room
      let got: { h: Holder; from: Vec; J: Vec }[] | null = null;
      for (const t of TS) if ((got = tryAt([t]))) break;
      if (!got) {
        got = [];
        // (where no spot keeps every line clear, one clear of every name:
        // the clarity check reports the line)
        for (const h of group) {
          const J = spot(h, TS, [...placed, ...got], true, false) ?? spot(h, TS, [...placed, ...got], false, false);
          if (J) got.push({ h, from: P, J });
        }
      }
      for (const h of group) {
        const J = got?.find((g) => g.h === h)?.J;
        h.clear = !!J;
        // (no room anywhere: towards her children, never on the partner's
        // name, and not on another spouse's holder)
        const others = [...placed, ...(got ?? [])].filter((q) => q.h !== h).map(at);
        const onOther = (c: Vec) => others.some((o) => Math.abs(o.x - c.x) < (o.w + h.w) / 2 && Math.abs(o.y - c.y) < (o.h + h.h) / 2);
        let to = J ?? (reach * 0.45 > edge(h.dir, partnerBox.w + h.w, partnerBox.h + h.h) ? add(P, scale(h.dir, reach * 0.45)) : beyond(h, h.dir, 1.15));
        if (!J && onOther(to)) {
          search: for (const t of [1.15, 1.6, 2.2, 3]) for (const deg of DEGS) {
            const c = beyond(h, turned(h.dir, deg), t);
            if (!onOther(c)) { to = c; break search; }
          }
        }
        h.x = to.x;
        h.y = to.y;
        placed.push({ h, from: P });
      }
    }
  };
  // A father of more than five children: his lines leave him heading for
  // each child (little of his own growth direction, an early first control
  // point), so they fan apart at once instead of running out together.
  const familySize = new Map<string, number>();
  for (const n of growingNodes) {
    const h = holderOf.get(n.id);
    const key = h ? h.id : n.parentId;
    if (key) familySize.set(key, (familySize.get(key) ?? 0) + 1);
  }
  for (const h of holders) familySize.set(h.partnerId, (familySize.get(h.partnerId) ?? 0) + 1);
  const fanOf = (parentId: string | null) => clamp(((parentId ? familySize.get(parentId) ?? 0 : 0) - 5) / 4, 0, 1);
  // Two touches that make branches read as wood rather than wire:
  //  - the main limbs (from the canopy base) rise out of the trunk before
  //    sweeping out to each son, instead of leaving it in a straight line;
  //  - an only child's line bends in a slight sideways S (alternating with
  //    the generation), so a chain of only children reaches up like a
  //    branch, not a pole.
  const SWEEP = 0.5, ONLY_S = 0.12;
  const organic = (node: LiveNode, c: Cubic): Cubic => {
    const d = sub(c.p1, c.p0);
    const L = len(d) || 1;
    const dv = scale(d, 1 / L);
    let { c1, c2 } = c;
    if (node.region === "crown" && node.depth === 1) {
      c1 = add(c.p0, scale(norm(add(scale(UP, SWEEP), scale(dv, 1 - SWEEP))), L * 0.45));
    }
    if (node.parentId && familySize.get(node.parentId) === 1 && node.region === "crown") {
      const side = node.depth % 2 === 0 ? 1 : -1;
      const perp = { x: -dv.y * side, y: dv.x * side };
      c1 = add(c1, scale(perp, L * ONLY_S));
      c2 = sub(c2, scale(perp, L * ONLY_S));
    }
    return { ...c, c1, c2 };
  };
  const holderCurve = new Map<string, Cubic>();
  // ── Lines that bend around names ──────────────────────────────────────
  // Every line is first drawn the usual way. A line that then passes behind
  // another name, crosses an unrelated line or runs along one (as the
  // clarity check judges them) tries a few other shapes: arriving more or
  // less along the child's ray, leaving more or less along the father's
  // growth, or bowed to either side. It keeps the shape with the fewest
  // such problems, judged against all the other lines; a poster without
  // such problems is drawn exactly as before.
  type LineBox = { id: string; x: number; y: number; w: number; h: number; leaf: boolean };
  let grid = new Map<string, LineBox[]>();
  const CELL = Math.max(40, f * 6);
  let boxById = new Map<string, LineBox>();
  const indexBoxes = () => {
    grid = new Map();
    boxById = new Map();
    const boxes: LineBox[] = [
      ...nodes.map((n) => ({ id: n.id, x: n.x, y: n.y, w: n.w, h: n.h, leaf: n.shape === "leaf" })),
      ...trunkLabels.map((l) => ({ id: l.member.id, x: l.x, y: l.y, w: l.w, h: l.h, leaf: false })),
      ...holders.map((h) => ({ id: h.id, x: h.x, y: h.y, w: h.w, h: h.h, leaf: false })),
    ];
    const bb = baseBoxOf();
    if (bb && base.data.member) boxes.push({ id: base.data.member.id, ...bb, leaf: false });
    for (const b of boxes) {
      boxById.set(b.id, b);
      for (let gx = Math.floor((b.x - b.w / 2) / CELL); gx <= Math.floor((b.x + b.w / 2) / CELL); gx++) {
        for (let gy = Math.floor((b.y - b.h / 2) / CELL); gy <= Math.floor((b.y + b.h / 2) / CELL); gy++) {
          const k = `${gx},${gy}`;
          grid.set(k, [...(grid.get(k) ?? []), b]);
        }
      }
    }
  };
  const inBox = (p: Vec, b: LineBox) => Math.abs(p.x - b.x) <= b.w / 2 && Math.abs(p.y - b.y) <= b.h / 2;
  /** Names a line passes behind (its own parent's and child's aside). */
  const hitsOf = (pts: Vec[], own: Set<string>, firstOnly = false) => {
    const ownBoxes: LineBox[] = [];
    const hitBoxes: LineBox[] = [];
    for (const id of own) { const b = boxById.get(id); if (b) ownBoxes.push(b); }
    for (const p of pts) {
      const cell = grid.get(`${Math.floor(p.x / CELL)},${Math.floor(p.y / CELL)}`);
      if (!cell) continue;
      let underOwn = false;
      for (const o of ownBoxes) if (inBox(p, o)) { underOwn = true; break; }
      if (underOwn) continue;
      for (const b of cell) {
        if (own.has(b.id) || hitBoxes.includes(b)) continue;
        // (the clarity check's test, a little stricter)
        const dx = (p.x - b.x) / (b.w / 2), dy = (p.y - b.y) / (b.h / 2);
        if (b.leaf ? dx * dx + dy * dy < 0.7 : Math.abs(dx) < 1 && Math.abs(dy) < 0.95) {
          hitBoxes.push(b);
          if (firstOnly) return 1;
        }
      }
    }
    return hitBoxes.length;
  };
  // [arrive, follow (null: the usual), bow sideways (a share of the length)]
  const SHAPES: [number, number | null, number][] = [
    [0.4, null, 0], [0.7, null, 0], [0.95, null, 0], [0.15, null, 0], [0.4, 0.1, 0], [0.95, 0.1, 0], [0.7, 0.9, 0],
    [0.4, null, 0.12], [0.4, null, -0.12], [0.7, null, 0.22], [0.7, null, -0.22], [0.95, 0.1, 0.3], [0.95, 0.1, -0.3],
    [0.95, 0.1, 0.45], [0.95, 0.1, -0.45],
  ];
  type Line = { id: string; from: string; to: string; pts: Vec[]; bb: number[]; w: number };
  const bbOf = (pts: Vec[]) => {
    const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y);
    return [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  };
  /** How a line is drawn, for each shape: its inputs, kept from the first drawing. */
  const lineSpec = new Map<string, { P: Vec; C: Vec; gP: Vec; rayDir: Vec; follow: number; reach0: number; leaf: boolean; organicOn: boolean; node: LiveNode }>();
  const shapeCurve = (id: string, [arrive, followAlt, bow]: [number, number | null, number]): { c: Cubic; e0: Vec } => {
    const sp = lineSpec.get(id)!;
    const L = len(sub(sp.C, sp.P)) || 1;
    const dv = scale(sub(sp.C, sp.P), 1 / L);
    const follow = followAlt ?? sp.follow;
    const s0 = norm(add(scale(sp.gP, follow), scale(dv, 1 - follow)));
    const e0 = norm(add(scale(dv, 1 - arrive), scale(sp.rayDir, arrive)));
    const side = scale({ x: -dv.y, y: dv.x }, L * bow);
    const raw = { p0: sp.P, c1: add(add(sp.P, scale(s0, L * (sp.leaf ? sp.reach0 - 0.03 : sp.reach0))), side), c2: add(sub(sp.C, scale(e0, L * 0.3)), side), p1: sp.C };
    return { c: sp.organicOn ? organic(sp.node, raw) : raw, e0 };
  };
  /** Bends the given lines (the ones the clarity check found a problem with) where another shape does better. */
  const refineLines = (targets: Set<string>) => {
    // every drawn connection, as the clarity check sees it
    const lines = new Map<string, Line>();
    for (const n of growingNodes) {
      const from = holderOf.get(n.id)?.id ?? parentIdOf(n);
      const pts = sample(curveOf.get(n.id)!, 24);
      lines.set(n.id, { id: n.id, from, to: n.id, pts, bb: bbOf(pts), w: nodeWidths(n).w0 });
    }
    for (const h of holders) {
      const pts = sample(holderCurve.get(h.id)!, 24);
      lines.set(h.id, { id: h.id, from: h.partnerId, to: h.id, pts, bb: bbOf(pts), w: holderWidths(h).w0 });
    }
    const segGrid = new Map<string, Set<string>>();
    const cellsOf = (pts: Vec[]) => {
      const keys = new Set<string>();
      for (const p of pts) keys.add(`${Math.floor(p.x / CELL)},${Math.floor(p.y / CELL)}`);
      return keys;
    };
    const addLine = (l: Line) => { for (const k of cellsOf(l.pts)) segGrid.set(k, (segGrid.get(k) ?? new Set()).add(l.id)); };
    const dropLine = (l: Line) => { for (const k of cellsOf(l.pts)) segGrid.get(k)?.delete(l.id); };
    for (const l of lines.values()) addLine(l);
    // (two lines touch within half their widths and a little: the check's test)
    const touchMax = widthOf(totalLeaves) * 1.2 + 2;
    const costOf = (l: Line, pts: Vec[], firstOnly = false) => {
      let cost = hitsOf(pts, new Set([l.from, l.to]), firstOnly);
      if (firstOnly && cost) return cost;
      const others = new Set<string>();
      for (const k of cellsOf(pts)) for (const id of segGrid.get(k) ?? []) if (id !== l.id) others.add(id);
      const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y);
      const bx0 = Math.min(...xs) - touchMax, bx1 = Math.max(...xs) + touchMax, by0 = Math.min(...ys) - touchMax, by1 = Math.max(...ys) + touchMax;
      for (const id of others) {
        const o = lines.get(id)!;
        if (o.bb[0] > bx1 || o.bb[1] < bx0 || o.bb[2] > by1 || o.bb[3] < by0) continue;
        // a line and its continuation meet at the person between them
        if (o.to === l.from || o.from === l.to) continue;
        const siblings = o.from === l.from;
        const a = siblings ? pts.slice(Math.floor(pts.length / 2)) : pts;
        const b = siblings ? o.pts.slice(Math.floor(o.pts.length / 2)) : o.pts;
        const [ox0, ox1, oy0, oy1] = siblings ? bbOf(b) : o.bb;
        const touch = (l.w + o.w) / 2 + 2;
        let crossed = false;
        for (let i = 1; i < a.length && !crossed; i++) {
          const p = a[i - 1], q = a[i];
          // (segments clear of the other line's bounds cannot cross it)
          if (Math.max(p.x, q.x) < ox0 || Math.min(p.x, q.x) > ox1 || Math.max(p.y, q.y) < oy0 || Math.min(p.y, q.y) > oy1) continue;
          for (let j = 1; j < b.length; j++) {
            const r = b[j - 1], t = b[j];
            if (Math.max(p.x, q.x) < Math.min(r.x, t.x) || Math.min(p.x, q.x) > Math.max(r.x, t.x)
              || Math.max(p.y, q.y) < Math.min(r.y, t.y) || Math.min(p.y, q.y) > Math.max(r.y, t.y)) continue;
            if (segmentsCross(p, q, r, t)) { crossed = true; break; }
          }
        }
        if (crossed) { cost++; if (firstOnly) return cost; continue; }
        let run = 0;
        for (const p of a.slice(2, -2)) {
          const near = p.x > ox0 - touch && p.x < ox1 + touch && p.y > oy0 - touch && p.y < oy1 + touch
            && b.some((q) => Math.abs(q.x - p.x) < touch && Math.abs(q.y - p.y) < touch && Math.hypot(q.x - p.x, q.y - p.y) < touch);
          run = near ? run + 1 : 0;
          if (run >= 3) { cost++; break; }
        }
        if (firstOnly && cost) return cost;
      }
      return cost;
    };
    for (let pass = 0; pass < 2; pass++) {
      let changed = false;
      for (const l of lines.values()) {
        if (!lineSpec.has(l.id) || !targets.has(l.id)) continue;
        const now = costOf(l, l.pts);
        if (!now) continue;
        let best: { c: Cubic; pts: Vec[]; cost: number } | null = null;
        for (const shape of SHAPES.slice(1)) {
          const { c } = shapeCurve(l.id, shape);
          const pts = sample(c, 24);
          const cost = costOf(l, pts);
          if (cost < (best?.cost ?? now)) best = { c, pts, cost };
          if (!cost) break;
        }
        if (!best) continue;
        dropLine(l);
        l.pts = best.pts;
        l.bb = bbOf(best.pts);
        addLine(l);
        curveOf.set(l.id, best.c);
        changed = true;
      }
      if (!changed) break;
    }
  };
  const buildCurves = () => {
    const growthDir = new Map<string, Vec>();
    placeHolders();
    indexBoxes();
    for (const node of growingNodes) {
      let P = startOf(node);
      let gP = (node.parentId && growthDir.get(node.parentId)) || stemDir.get(node.id) || norm(sub(node, origin));
      const holder = holderOf.get(node.id);
      if (holder) {
        // the partner's line to the spouse's holder (once), then the
        // children's lines from the holder onwards
        if (holder.kids[0] === node) {
          const S: Vec = { x: holder.x, y: holder.y };
          const L = len(sub(S, P)) || 1;
          const dv = scale(sub(S, P), 1 / L);
          const fan = fanOf(holder.partnerId);
          const follow = 0.5 * (1 - 0.8 * fan), reach0 = 0.38 - 0.16 * fan;
          const s0 = norm(add(scale(gP, follow), scale(dv, 1 - follow)));
          const e0 = norm(add(scale(dv, 0.6), scale(holder.dir, 0.4)));
          holderCurve.set(holder.id, organic({ ...node, parentId: null }, { p0: P, c1: add(P, scale(s0, L * reach0)), c2: sub(S, scale(e0, L * 0.3)), p1: S }));
          growthDir.set(holder.id, e0);
        }
        P = { x: holder.x, y: holder.y };
        gP = growthDir.get(holder.id) ?? holder.dir;
      }
      const fan = fanOf(holder ? holder.id : node.parentId);
      // Organic curves: a line leaves its father half along his own growth
      // direction and arrives partly along its own ray, so it bends in a
      // gentle S rather than shooting out straight (measured: no less clear).
      // A leaf's stalk aims at the leaf's centre (the leaf is drawn over it,
      // so it visibly meets the blade at its base); aiming at the base itself
      // would offset the line sideways past a sibling's and swap their
      // order. Every line arrives partly along its own ray, never hooking
      // back (arriving along a horizontal blade would swing the end sideways
      // across a sibling's line).
      const leaf = node.shape === "leaf";
      const C: Vec = { x: node.x, y: node.y };
      const dv = norm(sub(C, P));
      lineSpec.set(node.id, {
        P, C, gP, rayDir: node.ray !== undefined ? dirOf(node.ray) : leaf ? dv : UP,
        follow: 0.5 * (1 - 0.8 * fan), reach0: 0.38 - 0.16 * fan, leaf, organicOn: !holder, node,
      });
      const { c, e0 } = shapeCurve(node.id, SHAPES[0]);
      curveOf.set(node.id, c);
      if (!leaf) growthDir.set(node.id, e0);
    }
    // a spouse with no children here: a short, gently curved line from
    // the partner, leaving along the partner's growth
    for (const h of holders) {
      if (!h.lone) continue;
      const P = fromOf(h), S: Vec = { x: h.x, y: h.y };
      const L = len(sub(S, P)) || 1;
      const dv = scale(sub(S, P), 1 / L);
      const g = growthDir.get(h.partnerId) ?? h.dir;
      const s0 = norm(add(scale(g, 0.3), scale(dv, 0.7)));
      holderCurve.set(h.id, { p0: P, c1: add(P, scale(s0, L * 0.4)), c2: sub(S, scale(dv, L * 0.3)), p1: S });
    }
  };
  // A spouse's holder is placed clear of the lines as last drawn: when a
  // line bent around a name now passes under a holder, the holders are
  // placed again among the bent lines and everything is drawn again.
  const holderHit = () => holders.some((h) => {
    const box = { x: h.x, y: h.y, w: h.w, h: h.h };
    for (const [id, c] of curveOf) {
      if (h.childIds.includes(id)) continue;
      const xs = [c.p0.x, c.p1.x, c.c1.x, c.c2.x], ys = [c.p0.y, c.p1.y, c.c1.y, c.c2.y];
      if (Math.max(...xs) < box.x - box.w / 2 || Math.min(...xs) > box.x + box.w / 2 || Math.max(...ys) < box.y - box.h / 2 || Math.min(...ys) > box.y + box.h / 2) continue;
      if (sample(c, 20).some((p, i, a) => i > 0 && i < a.length - 1 && Math.abs(p.x - box.x) < box.w / 2 && Math.abs(p.y - box.y) < box.h / 2)) return true;
    }
    return false;
  });
  /** The lines named in the issues, as refineLines knows them. */
  const linesIn = (issues: { edge?: [string, string]; other?: [string, string] | string }[]) => {
    const ids = new Set<string>();
    for (const i of issues) {
      if (i.edge) ids.add(i.edge[1]);
      if (Array.isArray(i.other)) ids.add(i.other[1]);
    }
    return ids;
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
    const baseBox = base.data.member
      ? { id: base.data.member.id, member: base.data.member, x: origin.x, y: origin.y, w: baseOval.rx * 2, h: baseOval.ry * 2, shape: "medallion" }
      : null;
    // (each check redraws and validates every line: the untangling makes
    // at most CHECKS of them per attempt)
    // (whether the lines as drawn are those of the names as they stand)
    let fresh = false;
    const validate = () => {
      const drawnEdges: Edge[] = [
        ...edges,
        ...growingNodes.map((n) => ({ parentId: holderOf.get(n.id)?.id ?? parentIdOf(n), childId: n.id, points: sample(curveOf.get(n.id)!), ...nodeWidths(n) })),
        ...holders.map((h) => ({ parentId: h.partnerId, childId: h.id, points: sample(holderCurve.get(h.id)!), ...holderWidths(h) })),
      ];
      const provisional = {
        nodes: growingNodes, stubs, base: baseBox, trunkLabels, edges: drawnEdges, origin, trunkWidth, spouses: holders,
        familiesThrough: [...through],
      } as unknown as PosterLayout;
      return validateRelationships(provisional, tree).issues;
    };
    // Draws every line, checks the drawing, and bends the lines found
    // wanting around what is in their way (a crowded drawing is left as it
    // is: smaller names, the caller's retry, are the remedy for that).
    const check = (hint?: Set<string>) => {
      budget.checks--;
      fresh = true;
      buildCurves();
      if (hint) {
        // (the untangling knows which lines to bend: those of the issues
        // left, and of the name it moved; one validation then suffices)
        refineLines(hint);
        return validate();
      }
      let out = validate();
      if (out.length && out.length <= 30) {
        const targets = linesIn(out);
        refineLines(targets);
        // a holder a bent line now passes under is placed again
        if (holders.some((h) => !h.pin) && holderHit()) {
          buildCurves();
          refineLines(linesIn(validate()));
        }
        out = validate();
      }
      return out;
    };
    const overlapsAny = (n: LiveNode) =>
      [...nodes, ...holders].some((o) => o !== n && Math.abs(o.x - n.x) < (o.w + n.w) / 2 && Math.abs(o.y - n.y) < (o.h + n.h) / 2);
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
    // a spouse's holder with no room: her children move a little further
    // out along their rays (where that overlaps nothing), then try again
    for (let round = 0; round < 3 && holders.some((h) => !h.clear); round++) {
      for (const h of holders.filter((x) => !x.clear)) {
        for (const k of h.kids) {
          const saved = { x: k.x, y: k.y };
          outward(k, h.h * 1.6 + h.fontSize);
          if (overlapsAny(k)) Object.assign(k, saved);
        }
      }
      placeHolders();
    }
    let issues = check();
    // the holders stay where they are while names are moved (only a move
    // of a holder itself places it elsewhere)
    for (const h of holders) h.pin = { x: h.x, y: h.y };
    // only near-clean layouts are untangled; many issues mean crowding,
    // which more room (the caller's retry) solves
    if (issues.length > 15) issues = [];
    // (an issue no move could fix is not tried again)
    const sig = (i: (typeof issues)[number]) => `${i.kind}|${i.edge?.join(">")}|${Array.isArray(i.other) ? i.other.join(">") : i.other}`;
    const failed = new Set<string>();
    for (let round = 0; round < Math.min(40, issues.length * 3) && issues.length && budget.checks > 0; round++) {
      const issue = issues.find((i) => !failed.has(sig(i)));
      if (!issue) break;
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
      // a spouse's holder in the issue: tried a little nearer or further,
      // or turned, along the way from its partner to her children
      const holderIds = [issue.edge?.[0], issue.edge?.[1], ...(Array.isArray(issue.other) ? issue.other : [issue.other])]
        .filter((id): id is string => typeof id === "string" && id.startsWith("spouse:"));
      for (const hid of new Set(holderIds)) {
        const h = holders.find((x) => x.id === hid);
        if (!h || fixed) continue;
        const group = holders.filter((x) => x.partnerId === h.partnerId);
        const saved = group.map((x) => x.pin);
        const P = fromOf(h);
        const d0 = len(sub(h, P));
        for (const [k, deg] of [[0.7, 0], [1.35, 0], [1, 14], [1, -14], [0.7, 24], [0.7, -24]] as const) {
          if (budget.checks <= 0) break;
          for (const x of group) x.pin = x === h ? undefined : { x: x.x, y: x.y };
          const a = (deg * Math.PI) / 180;
          const d = norm(sub(h, P));
          h.pin = add(P, scale({ x: d.x * Math.cos(a) - d.y * Math.sin(a), y: d.x * Math.sin(a) + d.y * Math.cos(a) }, d0 * k));
          const next = check();
          if (holders.every((x) => x.clear) && next.length < issues.length) {
            issues = next;
            fixed = true;
            break;
          }
          group.forEach((x, i) => (x.pin = saved[i]));
          fresh = false;
        }
      }
      if (fixed) continue;
      // The moves, most promising first, across the names involved: a leaf
      // mirrored, a name further out or a little along its ring; then
      // further along it; a childless name back towards the centre; last,
      // a short step in any direction. (At most MOVES checks per issue.)
      const tiers: [LiveNode, () => void][][] = [[], [], [], []];
      for (const n of candidates) {
        if (n.shape === "leaf") tiers[0].push([n, () => { n.angle = n.angle > 0 ? 180 - n.angle : -180 - n.angle; }]);
        for (const k of [0.6, 1.5]) tiers[0].push([n, () => outward(n, (n.h + n.w * 0.3) * k)]);
        // (validation rejects any turn that would cross a neighbour's line)
        for (const k of [0.5, -0.5]) tiers[0].push([n, () => turn(n, k)]);
        for (const k of [1, -1]) tiers[1].push([n, () => turn(n, k)]);
        if (n.terminal) {
          tiers[2].push([n, () => outward(n, -(n.h + n.w * 0.3) * 0.6)]);
          for (const k of [1.6, -1.6, 2.4, -2.4]) tiers[2].push([n, () => turn(n, k)]);
        }
        for (let a = 0; a < 8; a++) {
          tiers[3].push([n, () => {
            n.x += Math.cos((a * Math.PI) / 4) * n.h * 0.8;
            n.y += Math.sin((a * Math.PI) / 4) * n.h * 0.8;
          }]);
        }
      }
      let tried = 0;
      for (const [n, move] of tiers.flat()) {
        if (budget.checks <= 0 || tried >= MOVES) break;
        const saved = { x: n.x, y: n.y, angle: n.angle, ray: n.ray };
        move();
        if (overlapsAny(n)) {
          Object.assign(n, saved);
          continue;
        }
        tried++;
        const hint = linesIn(issues);
        hint.add(n.id);
        for (const k of growingNodes) if (k.parentId === n.id || k.parentId === n.parentId) hint.add(k.id);
        const next = check(hint);
        if (next.length < issues.length) {
          issues = next;
          fixed = true;
          break;
        }
        Object.assign(n, saved);
        fresh = false;
      }
      if (!fixed) failed.add(sig(issue));
    }
    // (the final drawing, with lines bent around names where that helps,
    // unless the last check drew the names as they stand)
    if (!fresh) check();
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

  // a spouse's holder with no clear place counts as overlapping names, as
  // does one that came to overlap a name or another holder
  overlaps += holders.filter((h) => !h.clear).length;
  for (const h of holders) {
    for (const o of [...nodes, ...holders.filter((x) => x !== h && x.id > h.id)]) {
      if (Math.abs(o.x - h.x) < (o.w + h.w) / 2 - 0.5 && Math.abs(o.y - h.y) < (o.h + h.h) / 2 - 0.5) overlaps++;
    }
  }

  // ── 6. Branches ──────────────────────────────────────────────────────
  const growing = nodes.filter((n) => n.region !== "fixed");
  const branches: Branch[] = [...branchesOut];

  // The main limbs (the canopy base's sons with families of their own) grow
  // out of the trunk: together they start about as wide as it, then narrow
  // to their own width over the first stretch, instead of thin twigs
  // poking out of a broad trunk. (They start at the canopy base's centre,
  // inside the wood, under its oval.)
  // (a wife's holder on the canopy base's branch is one limb, carrying her sons)
  const baseHolder = (h: Holder) => !h.lone && h.anchorOf.region === "crown" && h.anchorOf.depth === 1;
  const mainLimbs = growing.filter((n) => n.region === "crown" && n.depth === 1 && !n.terminal && !holderOf.has(n.id)).length
    + holders.filter(baseHolder).length;
  const limbShare = mainLimbs ? clamp(1.05 / mainLimbs, 0.14, 0.4) : 0;
  for (const h of holders) {
    const c = holderCurve.get(h.id)!;
    const leaves = Math.max(1, h.kids.reduce((a, k) => a + (k.shape === "leaf" ? 1 : k.leafCount), 0));
    const w = widthOf(leaves);
    if (h.dotted) {
      const wd = Math.max(wMin * 2.2, w * 0.8);
      const p = (v: Vec) => `${v.x.toFixed(1)} ${v.y.toFixed(1)}`;
      branches.push({ d: `M${p(c.p0)}C${p(c.c1)} ${p(c.c2)} ${p(c.p1)}`, w: wd, lineage: h.lineage ?? null, dotted: true });
      edges.push({ parentId: h.partnerId, childId: h.id, points: sample(c), w0: wd, w1: wd, lineage: h.lineage ?? null });
    } else {
      const mainLimb = baseHolder(h);
      const w0 = mainLimb ? Math.max(w * 1.15, trunkWidth * limbShare) : w;
      branches.push({ ...shaded(c, w0, w * 0.85, 14, mainLimb ? 4 : 2), lineage: h.lineage ?? null });
      edges.push({ parentId: h.partnerId, childId: h.id, points: sample(c), w0: mainLimb ? w * 1.15 : w, w1: w * 0.85, lineage: h.lineage ?? null });
    }
  }
  for (const node of growing) {
    const c = curveOf.get(node.id)!;
    const holder = holderOf.get(node.id);
    const from = holder?.id ?? parentIdOf(node);
    if (dotted.has(node.member.id)) {
      // outside the lineage: an even dotted line, a little heavier than a
      // twig so the dots read
      const w = Math.max(wMin * 2.2, node.shape === "leaf" ? widthOf(1) : widthOf(node.leafCount) * 0.8);
      const p = (v: Vec) => `${v.x.toFixed(1)} ${v.y.toFixed(1)}`;
      branches.push({ d: `M${p(c.p0)}C${p(c.c1)} ${p(c.c2)} ${p(c.p1)}`, w, lineage: node.lineage ?? null, dotted: true });
      edges.push({ parentId: from, childId: node.id, points: sample(c), w0: w, w1: w, lineage: node.lineage ?? null });
        continue;
    }
    if (node.shape === "leaf") {
      // a thin stalk from the parent to the base of the leaf blade
      const tip = Math.max(wMin * 0.8, node.fontSize * 0.14);
      branches.push({ d: ribbonPath(c, widthOf(1), tip, 10), w: widthOf(1), lineage: node.lineage ?? null });
      edges.push({ parentId: from, childId: node.id, points: sample(c), w0: widthOf(1), w1: tip, lineage: node.lineage ?? null });
    } else {
      const w = widthOf(node.leafCount);
      const mainLimb = node.region === "crown" && node.depth === 1 && !node.terminal && !holder;
      const w0 = mainLimb ? Math.max(w * 1.15, trunkWidth * limbShare) : node.depth === 1 && !holder ? w * 1.15 : w;
      branches.push({ ...shaded(c, w0, w * 0.7, 14, mainLimb ? 4 : 2), lineage: node.lineage ?? null });
      // (the line's own width, for the clarity check: a main limb's wide
      // start lies under the canopy base's oval)
      edges.push({ parentId: from, childId: node.id, points: sample(c), w0: node.depth === 1 && !holder ? w * 1.15 : w, w1: w * 0.7, lineage: node.lineage ?? null });
    }
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
      w: baseOval.rx * 2, h: baseOval.ry * 2, fontSize: fs, shape: "medallion",
      label: m.name, subLabel, terminal: !base.children,
      angle: 0, leafLength: 0, leafWidth: 0, leafCount: base.value ?? 1,
      parentId: base.parent?.data.member?.id ?? null,
    };
  }

  // ── Foundation: the ancient ancestors, in the chosen soil style ───────
  const soil: SoilInscription | null = useSoil
    ? {
        ...soilDef.layout({
          ...soilFor(f, plan).ctx, cx: W / 2, groundY, trunkWidth, W,
          // the gold thread joining the trunk's ancestors continues from just below the lowest one
          threadFrom: shownTrunk.length ? labelBottom + trunkFont * 0.75 : groundY - f * 0.2,
        }),
        area: { x: W / 2 - soilW / 2, w: soilW },
      }
    : null;

  const gens = new Set<number>();
  for (const n of growing) if (n.shape !== "medallion") gens.add(n.generation);

  // Everyone drawn: names, trunk, soil, the canopy base, and spouses on
  // their branches (drawn even when not of the family); the rest are listed.
  const shownIds = new Set<string>([
    ...growing.map((n) => n.member.id), ...stubs.map((n) => n.member.id), ...trunkLabels.map((t) => t.member.id),
    ...ancient.map((n) => n.data.member!.id), ...(baseNode ? [baseNode.member.id] : []), ...holders.map((h) => h.member.id),
  ]);
  const unplacedIds = visible.filter((m) => !shownIds.has(m.id)).map((m) => m.id);
  stats.placed = visible.length - unplacedIds.length;
  stats.unplaced = unplacedIds.length;

  // Legibility: the smallest text anywhere on the genealogy, in print mm.
  const smallest = Math.min(
    ...growing.map((n) => n.fontSize), ...stubs.map((n) => n.fontSize),
    ...trunkLabels.map((l) => l.fontSize), ...(soil ? [soil.fontSize] : []), ...(baseNode ? [baseNode.fontSize] : []),
    ...holders.map((h) => h.fontSize),
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
    // flaring at the top to meet the canopy base, as a trunk divides into
    // its limbs (no wider than the medallion, which covers the top)
    trunkPath: trunkOutline(
      // (a collar: as wide as the canopy base, a little wider than the
      // trunk, so the limbs visibly grow out of it)
      origin, groundY, trunkWidth, TW, Math.max(trunkWidth * 1.3, baseOval.rx * 1.9),
      soil ? soil.trunkSpread : 1, soil?.trunkTaper ?? 0,
    ),
    trunkWidth,
    rtl,
    trunkLabels,
    soil,
    trunkZigzag,
    base: baseNode,
    stubs: stubs.map((s) => strip(s as LiveNode)),
    nodes: growing.map(strip),
    spouses: holders.map(({ anchorOf: _a, kids: _k, dir: _d, clear: _c, lone: _l, ...h }) => h),
    branches,
    edges,
    canopy,
    surfaceRoots,
    medallions,
    frame: place,
    // side branches lower on the trunk are older than the canopy base
    generationOffset: Math.min(base.data.member?.generation ?? 0, ...gens),
    generationsPresent: [...gens].sort((a, b) => a - b),
    unplacedIds,
    legibility,
    overlaps,
    clarity: { ok: true, expected: 0, drawn: 0, clearCrossings: 0, issues: [] },
    ringLoad,
    familiesThrough: [...through],
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
function groupByParent(kids: MemberDTO[], key: "motherId" | "fatherId"): MemberDTO[] {
  const order = new Map<string | null, number>();
  for (const k of kids) if (!order.has(k[key])) order.set(k[key], order.size);
  if (order.size < 2) return kids;
  return kids.map((k, i) => ({ k, i })).sort((a, b) => order.get(a.k[key])! - order.get(b.k[key])! || a.i - b.i).map((x) => x.k);
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
  // an honorific stays with the name: no-break spaces, so text wrapping never parts them
  if (HONORIFICS.test(m.laqab.trim())) return `${m.name}\u00A0${m.laqab.trim().replace(/ +/g, "\u00A0")}`;
  return rtl ? `${m.name} \uFD3F${m.laqab}\uFD3E` : `${m.name} (${m.laqab})`;
}

/**
 * Trunk silhouette: narrow under the crown (topW), swelling to its full
 * width w where the medallions sit, then flaring into roots at the ground.
 */
/**
 * The trunk as one solid form. At the top it flares out (to `topW`) to meet
 * the canopy base, like a trunk dividing into its limbs; below that it is
 * `w` wide, wide enough for the badges to rest inside the bark. At the
 * ground it either spreads into a root flare (`spread`, onto a mound or a
 * panel) or, with `taper` > 0, curves smoothly in to a fine point `taper`
 * below the ground line, where the foundation's gold thread carries on:
 * an S-curve, vertical where it leaves the trunk and where it ends, so
 * there is no pinch or corner.
 */
function trunkOutline(o: Vec, groundY: number, w: number, flareW = w, topW = w, spread = 1, taper = 0): string {
  const h = groundY - o.y;
  const f = (n: number) => n.toFixed(1);
  const L = (dx: number) => f(o.x - dx), R = (dx: number) => f(o.x + dx);
  // the flare under the canopy base: from topW wide to w, over a short height
  const flare = Math.min(h * 0.32, Math.max(topW, w) * 0.9);
  // the top is a low dome hidden under the canopy base's medallion
  const head = `M${L(topW * 0.5)} ${f(o.y - topW * 0.1)}`;
  const close = `C${R(topW * 0.5)} ${f(o.y + flare * 0.1)} ${R(topW * 0.5)} ${f(o.y)} ${R(topW * 0.5)} ${f(o.y - topW * 0.1)}Q${f(o.x)} ${f(o.y - topW * 0.45)} ${L(topW * 0.5)} ${f(o.y - topW * 0.1)}Z`;
  if (taper > 0) {
    const tip = Math.max(w * 0.02, 0.6);
    // the narrowing starts above the ground line and ends `taper` below it
    const y0 = Math.max(o.y + flare, groundY - taper * 0.6);
    const y1 = groundY + taper;
    const k = (y1 - y0) * 0.55;
    return [
      head,
      `C${L(topW * 0.5)} ${f(o.y)} ${L(topW * 0.5)} ${f(o.y + flare * 0.1)} ${L(topW * 0.5)} ${f(o.y + flare * 0.2)}`,
      `C${L(topW * 0.42)} ${f(o.y + flare * 0.4)} ${L(w * 0.5)} ${f(o.y + flare * 0.6)} ${L(w * 0.5)} ${f(o.y + flare)}`,
      `L${L(w * 0.5)} ${f(y0)}`,
      `C${L(w * 0.5)} ${f(y0 + k)} ${L(tip)} ${f(y1 - k)} ${L(tip)} ${f(y1)}`,
      `L${R(tip)} ${f(y1)}`,
      `C${R(tip)} ${f(y1 - k)} ${R(w * 0.5)} ${f(y0 + k)} ${R(w * 0.5)} ${f(y0)}`,
      `L${R(w * 0.5)} ${f(o.y + flare)}`,
      `C${R(w * 0.5)} ${f(o.y + flare * 0.6)} ${R(topW * 0.42)} ${f(o.y + flare * 0.4)} ${R(topW * 0.5)} ${f(o.y + flare * 0.2)}`,
      close,
    ].join("");
  }
  // root flare: `spread` < 1 keeps it inside a soil mound or on a panel.
  // The trunk starts widening well above the ground and spreads gradually
  // (a concave sweep, like the buttressed foot of an old tree), not in a
  // sudden kink at the ground line.
  const fl = (flareW + (w - flareW) * 0.35) * spread;
  const rise = Math.min(fl * 1.8, Math.max(0, groundY - (o.y + flare)) * 0.75);
  const yr = groundY - rise;
  return [
    head,
    `C${L(topW * 0.5)} ${f(o.y)} ${L(topW * 0.5)} ${f(o.y + flare * 0.1)} ${L(topW * 0.5)} ${f(o.y + flare * 0.2)}`,
    `C${L(topW * 0.42)} ${f(o.y + flare * 0.4)} ${L(w * 0.5)} ${f(o.y + flare * 0.6)} ${L(w * 0.5)} ${f(o.y + flare)}`,
    `L${L(w * 0.5)} ${f(yr)}`,
    `C${L(w * 0.5)} ${f(yr + rise * 0.45)} ${L(w * 0.5 + fl * 0.2)} ${f(groundY - rise * 0.12)} ${L(w * 0.5 + fl * 0.6)} ${f(groundY + fl * 0.04)}`,
    `C${L(w * 0.5 + fl * 0.95)} ${f(groundY + fl * 0.13)} ${L(w * 0.5 + fl * 1.4)} ${f(groundY + fl * 0.18)} ${L(w * 0.5 + fl * 1.9)} ${f(groundY + fl * 0.2)}`,
    `L${R(w * 0.5 + fl * 1.9)} ${f(groundY + fl * 0.2)}`,
    `C${R(w * 0.5 + fl * 1.4)} ${f(groundY + fl * 0.18)} ${R(w * 0.5 + fl * 0.95)} ${f(groundY + fl * 0.13)} ${R(w * 0.5 + fl * 0.6)} ${f(groundY + fl * 0.04)}`,
    `C${R(w * 0.5 + fl * 0.2)} ${f(groundY - rise * 0.12)} ${R(w * 0.5)} ${f(yr + rise * 0.45)} ${R(w * 0.5)} ${f(yr)}`,
    `L${R(w * 0.5)} ${f(o.y + flare)}`,
    `C${R(w * 0.5)} ${f(o.y + flare * 0.6)} ${R(topW * 0.42)} ${f(o.y + flare * 0.4)} ${R(topW * 0.5)} ${f(o.y + flare * 0.2)}`,
    close,
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
function segmentsCross(p: Vec, p2: Vec, q: Vec, q2: Vec): boolean {
  const d = (p2.x - p.x) * (q2.y - q.y) - (p2.y - p.y) * (q2.x - q.x);
  if (Math.abs(d) < 1e-9) return false;
  const t = ((q.x - p.x) * (q2.y - q.y) - (q.y - p.y) * (q2.x - q.x)) / d;
  const u = ((q.x - p.x) * (p2.y - p.y) - (q.y - p.y) * (p2.x - p.x)) / d;
  return t > 0 && t < 1 && u > 0 && u < 1;
}

/** Splits a line in two at the space nearest its middle (not leaving a word like "m." alone). */
function splitInTwo(text: string): string {
  const spaces = [...text.matchAll(/ /g)].map((m) => m.index!).filter((i) => i >= 4 && text.length - i - 1 >= 4);
  if (!spaces.length) return text;
  const at = spaces.reduce((a, b) => (Math.abs(b - text.length / 2) < Math.abs(a - text.length / 2) ? b : a));
  return `${text.slice(0, at)}\n${text.slice(at + 1)}`;
}

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
  // The grid's cells fit ordinary names; the few large bodies (the canopy
  // base, frame medallions, trunk badges) are checked against every name
  // instead, so they do not make every cell large and every pass quadratic.
  const sizes = nodes.map((n) => Math.max(n.w, n.h)).sort((a, b) => a - b);
  const cell = sizes[Math.min(sizes.length - 1, Math.floor(sizes.length * 0.9))] + gap;
  const big = nodes.map((n, i) => (Math.max(n.w, n.h) + gap > cell ? i : -1)).filter((i) => i >= 0);
  const isBig = new Set(big);
  const keyOf = (gx: number, gy: number) => (gx + 4096) * 8192 + (gy + 4096);
  const push = (i: number, j: number) => {
    const a = nodes[i], b = nodes[j];
    if (a.mass >= 1e6 && b.mass >= 1e6) return 0;
    const dx = b.x - a.x, dy = b.y - a.y;
    const px = (a.w + b.w) / 2 + gap - Math.abs(dx);
    const py = (a.h + b.h) / 2 + gap - Math.abs(dy);
    if (px <= 0 || py <= 0) return 0;
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
    return 1;
  };
  const separate = () => {
    const grid = new Map<number, number[]>();
    nodes.forEach((n, i) => {
      if (isBig.has(i)) return;
      const key = keyOf(Math.floor(n.x / cell), Math.floor(n.y / cell));
      const list = grid.get(key);
      if (list) list.push(i); else grid.set(key, [i]);
    });
    let moved = 0;
    nodes.forEach((a, i) => {
      if (isBig.has(i)) return;
      const gx = Math.floor(a.x / cell), gy = Math.floor(a.y / cell);
      for (let ox = -1; ox <= 1; ox++) {
        for (let oy = -1; oy <= 1; oy++) {
          for (const j of grid.get(keyOf(gx + ox, gy + oy)) ?? []) if (j > i) moved += push(i, j);
        }
      }
    });
    for (const i of big) for (let j = 0; j < nodes.length; j++) if (j !== i && (!isBig.has(j) || j > i)) moved += push(Math.min(i, j), Math.max(i, j));
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
