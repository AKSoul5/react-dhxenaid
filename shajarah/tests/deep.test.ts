import { describe, expect, it } from "vitest";
import { computePosterLayout } from "@/lib/layout/botanical";
import { kalaliFilledTree } from "@/lib/samples/kalali";
import { layoutOptionsFor, resolveTheme } from "@/lib/theme";

// A deep, narrow family (14 generations of 6–7 people): the canopy must be
// sized for its depth, not only for its number of names, or the rings of
// generations crowd together and lines run under names.
describe("deep families", () => {
  const tree = kalaliFilledTree();
  const layoutAt = (paper: "A2" | "A0") =>
    computePosterLayout(tree, { ...layoutOptionsFor(resolveTheme(tree.settings), paper), showFemales: tree.settings?.showFemales });

  it("gives every generation ring room, so a large sheet is nearly clear", () => {
    const l = layoutAt("A0");
    expect(l.overlaps).toBe(0);
    expect(l.legibility.ok).toBe(true);
    expect(l.clarity.issues.length).toBeLessThanOrEqual(5);
  });

  it("places generations on rings that move outward", () => {
    const l = layoutAt("A2");
    const o = l.origin;
    const byDepth = new Map<number, number[]>();
    for (const n of l.nodes) if (n.region === "crown") byDepth.set(n.depth, [...(byDepth.get(n.depth) ?? []), Math.hypot(n.x - o.x, n.y - o.y)]);
    const median = (v: number[]) => [...v].sort((a, b) => a - b)[v.length >> 1];
    const depths = [...byDepth.keys()].sort((a, b) => a - b);
    for (let i = 1; i < depths.length; i++) expect(median(byDepth.get(depths[i])!)).toBeGreaterThan(median(byDepth.get(depths[i - 1])!));
  }, 60000);
});
