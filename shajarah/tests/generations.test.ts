import { describe, expect, it } from "vitest";
import { computePosterLayout } from "@/lib/layout/botanical";
import { layoutOptionsFor, resolveTheme } from "@/lib/theme";
import { kalaliFilledTree, kalaliRealistic150 } from "@/lib/samples/kalali";
import { generateHypotheticalTree } from "@/lib/samples/al_kalali_hypo";
import { abdullahFamily, marriagesFamily } from "@/lib/samples/fixtures";

// The key numbers generations from the oldest one drawn: side branches lower
// on the trunk are older than the canopy base, and used to come out as
// "Generation -8".
describe("generation numbering", () => {
  const families = { kalaliFilledTree, kalaliRealistic150, generateHypotheticalTree, abdullahFamily, marriagesFamily };
  for (const [name, make] of Object.entries(families)) {
    for (const showFemales of [false, true]) {
      it(`${name}${showFemales ? " with daughters" : ""}: no generation before the first`, () => {
        const tree = make();
        const l = computePosterLayout(tree, { ...layoutOptionsFor(resolveTheme(tree.settings), "A1"), showFemales });
        for (const g of l.generationsPresent) expect(g - l.generationOffset).toBeGreaterThanOrEqual(0);
        for (const n of [...l.nodes, ...l.stubs]) expect(n.generation - l.generationOffset).toBeGreaterThanOrEqual(0);
      });
    }
  }
});
