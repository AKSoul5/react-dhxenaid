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
  /** Smallest poster on which every line is clear and every name legible; null if none up to 2A0. */
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
 * Smallest poster on which one branch is clear. Tries A3 first; when that
 * is too small to be legible, skips straight to the size legibility needs.
 */
export function clearestPaper(tree: TreeDTO, id: string, optionsFor: (p: PaperSize) => LayoutOptions): PaperSize | null {
  // every size in turn: jumping ahead to the size the legibility estimate
  // suggests could skip a smaller size that is in fact clear
  for (const paper of PAPER_ORDER) {
    if (isClear(computePosterLayout(tree, { ...optionsFor(paper), focusId: id }))) return paper;
  }
  return null;
}

/** The branch that will actually work first: clear on the smallest paper, then the larger branch. */
export function rankBranches(options: BranchOption[]): BranchOption[] {
  const rank = (o: BranchOption) => (o.clearAt ? PAPER_ORDER.indexOf(o.clearAt) : PAPER_ORDER.length);
  return [...options].sort((a, b) => rank(a) - rank(b) || b.people - a.people);
}
