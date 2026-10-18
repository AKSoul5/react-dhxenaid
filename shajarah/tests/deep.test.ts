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

  it("places children further out from the canopy base than their parents", () => {
    const l = layoutAt("A2");
    const o = l.origin;
    const r = new Map(l.nodes.map((n) => [n.id, Math.hypot(n.x - o.x, n.y - o.y)]));
    let checked = 0, outward = 0;
    for (const n of l.nodes) {
      const parent = n.parentId ? r.get(n.parentId) : undefined;
      if (parent === undefined) continue;
      checked++;
      if (r.get(n.id)! > parent) outward++;
    }
    expect(checked).toBeGreaterThan(50);
    // (a few near the base are moved by the separation of the names)
    expect(outward / checked).toBeGreaterThan(0.9);
  }, 60000);
});
