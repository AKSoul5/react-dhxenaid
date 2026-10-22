// The tree's shape, measured: does the poster read as a tree (a trunk with
// a crown rising from it) or as something disfigured (a fan of names hanging
// level with the trunk top, a crown swung to one side, a stub of a trunk)?

import type { PosterLayout } from "./botanical";

export interface TreeShape {
  /** Share of the canopy's names level with the canopy base or below it (a crown hangs, it does not rise). Tree-like: at most 0.15. */
  droop: number;
  /** The trunk's share of the tree's height, ground to the crown's top. */
  trunk: number;
  /** How far the canopy's weight sits to one side of the trunk, as a share of its half-width (0 = centred). */
  lean: number;
  /** The share of the canopy's names on its heavier side, beyond half (0 = even). */
  sides: number;
}

/** A crown hangs when more than this share of its names sit level with the base or below. */
export const DROOP_LIMIT = 0.15;

export function measureShape(l: Pick<PosterLayout, "nodes" | "spouses" | "origin" | "groundY">): TreeShape {
  const items = [...l.nodes.map((n) => ({ x: n.x, y: n.y })), ...l.spouses.map((s) => ({ x: s.x, y: s.y }))];
  if (!items.length) return { droop: 0, trunk: 1, lean: 0, sides: 0 };
  const { x: x0, y: y0 } = l.origin;
  const top = Math.min(...items.map((p) => p.y));
  const height = Math.max(1, y0 - top);
  // "level with the base": within an eighth of the crown's height above it
  const droop = items.filter((p) => p.y > y0 - 0.12 * height).length / items.length;
  const trunk = (l.groundY - y0) / Math.max(1, l.groundY - top);
  const half = Math.max(1, ...items.map((p) => Math.abs(p.x - x0)));
  const lean = Math.abs(items.reduce((s, p) => s + (p.x - x0), 0) / items.length / half);
  const left = items.filter((p) => p.x < x0).length;
  const sides = Math.abs(left - (items.length - left)) / items.length / 2;
  return { droop, trunk, lean, sides };
}
