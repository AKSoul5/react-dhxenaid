import { describe, expect, it } from "vitest";
import { computePosterLayout } from "@/lib/layout/botanical";
import { layoutOptionsFor, resolveTheme } from "@/lib/theme";
import { crowdedBaseFamily, marriagesFamily, multiMarriageFamily } from "@/lib/samples/fixtures";
import { kalaliFilledTree, kalaliRealistic150 } from "@/lib/samples/kalali";

// Showing daughters adds childless names to the first rings. They must not
// push fathers off their sectors so that lines cross other families'.
describe("showing daughters", () => {
  const families = { crowdedBaseFamily, marriagesFamily, multiMarriageFamily, kalaliFilledTree, kalaliRealistic150 };
  for (const [name, make] of Object.entries(families)) {
    for (const paper of ["A1", "A0"] as const) {
      it(`${name} on ${paper}: clean, and no line crosses another`, () => {
        const tree = make();
        const l = computePosterLayout(tree, { ...layoutOptionsFor(resolveTheme(tree.settings), paper), showFemales: true });
        expect(l.overlaps).toBe(0);
        expect(l.clarity.issues).toEqual([]);
        expect(l.clarity.clearCrossings).toBe(0);
        expect(l.nodes.some((n) => n.member.gender === "FEMALE")).toBe(true);
      });
    }
  }
});
