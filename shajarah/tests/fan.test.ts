// Each generation on one smooth fan round the canopy base: a crowded ring's
// end once had its last names (a man's two daughters after a brother with a
// son) step out of the arc to clear each other, a visible break in the fan.
import { describe, expect, it } from "vitest";
import { computePosterLayout, fanKink } from "@/lib/layout/botanical";
import { abdullahFamily, marriagesFamily, multiMarriageFamily, smallFamily } from "@/lib/samples/fixtures";
import { kalaliFilledTree } from "@/lib/samples/kalali";
import { layoutOptionsFor, resolveTheme } from "@/lib/theme";
import type { TreeDTO } from "@/lib/types";

const layoutOf = (tree: TreeDTO) => computePosterLayout(tree, layoutOptionsFor(resolveTheme(tree.settings), "A1"));

describe("the canopy's fan", () => {
  // (the largest change of step in distance between neighbours of one
  // generation, as a share of its typical distance: 0 on a perfect arc)
  const cases: [string, () => TreeDTO, number][] = [
    ["small family", smallFamily, 0.08],
    ["several marriages", multiMarriageFamily, 0.13],
    ["Abdullah's family", abdullahFamily, 0.13],
    ["marriages shown", marriagesFamily, 0.25],
    ["the Al-Kalali line, filled", kalaliFilledTree, 0.3],
  ];
  for (const [name, make, most] of cases) {
    it(`${name}: every generation on a smooth arc, still clean`, () => {
      const l = layoutOf(make());
      expect(fanKink(l)).toBeLessThan(most);
      expect(l.clarity.issues).toEqual([]);
      expect(l.overlaps).toBe(0);
    }, 60_000);
  }

  it("is measured as a break, not as the arc's own curve", () => {
    const at = (deg: number, r: number) => ({ x: 500 + r * Math.cos((deg * Math.PI) / 180), y: 500 - r * Math.sin((deg * Math.PI) / 180) });
    const ring = (rs: number[]) => rs.map((r, i) => ({ ...at(20 + i * 20, r), ray: ((20 + i * 20) * Math.PI) / 180, depth: 1 }));
    const origin = { x: 500, y: 500 };
    // an even arc and an even slope: no break
    expect(fanKink({ origin, nodes: ring([300, 300, 300, 300, 300, 300, 300]) } as never)).toBeCloseTo(0, 9);
    expect(fanKink({ origin, nodes: ring([300, 310, 320, 330, 340, 350, 360]) } as never)).toBeCloseTo(0, 9);
    // two names fallen inside it: a break
    expect(fanKink({ origin, nodes: ring([300, 300, 300, 300, 300, 250, 250]) } as never)).toBeGreaterThan(0.15);
  });
});
