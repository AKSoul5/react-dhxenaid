// Branch posters for families too large for one clear sheet: which
// branches to offer, how many people each holds, and the smallest poster
// on which each one is clear.

import { lineagePath } from "../genealogy";
import { PAPER_ORDER, paperForScale, type PaperSize } from "../paper";
import type { TreeDTO } from "../types";
import { computePosterLayout, type LayoutOptions, type PosterLayout } from "./botanical";

export interface BranchOption {
  id: string;
  name: string;
  /** People on the branch poster: the person, their ancestors and descendants. */
  people: number;
  /** Smallest poster on which every line is clear and every name legible; null if none (see smallestClearPaper). */
  clearAt: PaperSize | null;
}

/** Clear enough to print: no ambiguous line, no name below the legible size, no overlap. */
export const isClear = (l: PosterLayout) => l.clarity.ok && l.legibility.ok && l.overlaps === 0;

/**
 * The branches of the poster as drawn: the heads of the first ring that
 * have descendants (on a branch poster, its sub-branches).
 */
export function branchHeads(tree: TreeDTO, layout: PosterLayout): Omit<BranchOption, "clearAt">[] {
  return layout.nodes
    .filter((n) => n.depth === 1 && !n.terminal)
    .map((n) => {
      const { ancestors, descendants } = lineagePath(tree.members, tree.lineage, n.id);
      return { id: n.id, name: n.member.name, people: 1 + ancestors.length + descendants.length };
    });
}

/**
 * The smallest paper from `from` up on which the layout is clear. Every
 * size in turn (jumping ahead to the size the legibility estimate suggests
 * could skip a smaller size that is in fact clear), but paper has no
 * practical limit: once the names are legible, a layout whose problems
 * have not lessened over three larger sizes is not one more paper fixes,
 * and the search stops there.
 */
export function smallestClearPaper(layoutAt: (p: PaperSize) => PosterLayout, from: PaperSize = PAPER_ORDER[0]): PaperSize | null {
  let best = Infinity, stale = 0;
  for (const paper of PAPER_ORDER.slice(Math.max(0, PAPER_ORDER.indexOf(from)))) {
    const l = layoutAt(paper);
    if (isClear(l)) return paper;
    if (!l.legibility.ok) continue;
    const problems = l.clarity.issues.length + l.overlaps;
    if (problems < best) [best, stale] = [problems, 0];
    else if (++stale >= 3) return null;
  }
  return null;
}

/** Smallest poster on which one branch is clear. */
export function clearestPaper(tree: TreeDTO, id: string, optionsFor: (p: PaperSize) => LayoutOptions): PaperSize | null {
  return smallestClearPaper((paper) => computePosterLayout(tree, { ...optionsFor(paper), focusId: id }));
}

/** The branch that will actually work first: clear on the smallest paper, then the larger branch. */
export function rankBranches(options: BranchOption[]): BranchOption[] {
  const rank = (o: BranchOption) => (o.clearAt ? PAPER_ORDER.indexOf(o.clearAt) : PAPER_ORDER.length);
  return [...options].sort((a, b) => rank(a) - rank(b) || b.people - a.people);
}
