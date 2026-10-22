// The Sultan: 40 sons, 200 grandsons. Extreme fan-out on one ring.
// Measured: A2 and A1 are too small for 200 names on the outer ring at the
// legible minimum (1.9 and 2.3 mm); A0 is clean and legible; 2A0 too.
import { describe, expect, it } from "vitest";
import { computePosterLayout, AUTO_LEAF_LIMIT } from "@/lib/layout/botanical";
import { generateSultanTree } from "@/lib/samples/sultan";
import { layoutOptionsFor, resolveTheme } from "@/lib/theme";
import { paperForScale } from "@/lib/paper";

describe("The Sultan Topology (40 children, 200 grandchildren)", () => {
  const tree = generateSultanTree();

  // Force ovals since 241 > 50
  const options = (paper: "A1" | "A0" | "2A0") => ({
    ...layoutOptionsFor(resolveTheme(tree.settings), paper),
    showFemales: false,
  });

  it("generates exactly 241 nodes", () => {
    expect(tree.members).toHaveLength(241);
  });

  it("switches to compact ovals automatically because of the canopy size", () => {
    const layout = computePosterLayout(tree, options("A0"));
    expect(layout.nodes.length).toBeGreaterThan(AUTO_LEAF_LIMIT);
    // Every node must be an oval or medallion, never a leaf
    for (const node of layout.nodes) {
      expect(["oval", "medallion"]).toContain(node.shape);
    }
  });

  it("exhausts horizontal capacity on A1: too small to be legible, and A0 is recommended", () => {
    const a1 = computePosterLayout(tree, options("A1"));

    const depth1 = a1.nodes.filter(n => n.depth === 1);
    expect(depth1).toHaveLength(40);

    // 200 names on the outer ring do not fit A1 at the legible minimum
    expect(a1.legibility.ok).toBe(false);
    expect(a1.legibility.scaleNeeded).toBeGreaterThan(1);
    expect(paperForScale("A1", a1.legibility.scaleNeeded)).toBe("A0");
  });

  it("is clean and legible on A0", () => {
    const a0 = computePosterLayout(tree, options("A0"));
    expect(a0.legibility.ok).toBe(true);
    expect(a0.overlaps).toBe(0);
    expect(a0.clarity.ok).toBe(true);
    expect(a0.tooDense).toBe(false);
  });

  it("finds a clean, legible layout on a massive 2A0 canvas", () => {
    const a20 = computePosterLayout(tree, options("2A0"));
    expect(a20.legibility.ok).toBe(true);
    expect(a20.overlaps).toBe(0);
    expect(a20.clarity.issues.filter(i => i.kind === "missing" || i.kind === "misattached")).toEqual([]);
    expect(a20.tooDense).toBe(false);
  });

  it("spreads the 40 main limbs evenly over the canopy's arc", () => {
    const layout = computePosterLayout(tree, options("2A0"));
    const root = layout.base!;
    const limbs = layout.nodes.filter(n => n.depth === 1);

    // angle above the horizontal: 0 = right, π = left; the canopy's arc dips
    // a little below the horizontal on both sides, so angles just below the
    // left are mapped past π instead of wrapping round to −π
    const angles = limbs
      .map(n => Math.atan2(root.y - n.y, n.x - root.x))
      .map(a => (a < -Math.PI / 2 ? a + 2 * Math.PI : a))
      .sort((a, b) => a - b);

    // the whole arc is used: from below the horizontal on one side to the other
    expect(angles[0]).toBeLessThan(0);
    expect(angles.at(-1)!).toBeGreaterThan(Math.PI);
    // and no two limbs bunch up or leave a hole (measured: 3–8.5°)
    for (let i = 1; i < angles.length; i++) {
      const gap = angles[i] - angles[i - 1];
      expect(gap).toBeGreaterThan((2 * Math.PI) / 180);
      expect(gap).toBeLessThan((12 * Math.PI) / 180);
    }
  }, 60000);
});
