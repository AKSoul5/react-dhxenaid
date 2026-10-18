import { describe, expect, it } from "vitest";
import { computePosterLayout } from "@/lib/layout/botanical";
import { kalaliFilledTree, kalaliRealistic150 } from "@/lib/samples/kalali";
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

describe("realistic test families", () => {
  const tree = kalaliRealistic150();
  const base = tree.members.find((m) => m.id === tree.crownBaseId)!;
  const kidsOf = (id: string) => tree.members.filter((m) => m.fatherId === id);

  it("have a natural shape: 4–6, then 2–4, then 1–3, then 0–2 children, with lines ending", () => {
    const canopy = tree.members.filter((m) => m.generation > base.generation);
    expect(canopy.length).toBeGreaterThanOrEqual(148);
    expect(canopy.length).toBeLessThanOrEqual(155);
    const ranges = [[4, 6], [2, 4], [1, 3]];
    let childless = 0;
    for (const m of [base, ...canopy]) {
      if (m.gender === "FEMALE") {
        expect(kidsOf(m.id)).toHaveLength(0);
        continue;
      }
      const d = m.generation - base.generation;
      const [lo, hi] = ranges[d] ?? [0, 2];
      const n = kidsOf(m.id).length;
      if (d < 6) expect(n >= lo && n <= hi, `${m.name} (generation ${d}): ${n} children`).toBe(true);
      if (n === 0 && d < 6) childless++;
    }
    expect(childless).toBeGreaterThan(10);
  });

  it("are too dense for A2 (one clear warning) and nearly clear on A1", () => {
    const at = (paper: "A2" | "A1") => computePosterLayout(tree, { ...layoutOptionsFor(resolveTheme(tree.settings), paper), showFemales: true });
    expect(at("A2").tooDense).toBe(true);
    const a1 = at("A1");
    expect(a1.tooDense).toBe(false);
    expect(a1.legibility.ok).toBe(true);
  }, 60000);
});
