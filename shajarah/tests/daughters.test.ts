import { describe, expect, it } from "vitest";
import { computePosterLayout } from "@/lib/layout/botanical";
import { layoutOptionsFor, resolveTheme } from "@/lib/theme";
import { crowdedBaseFamily, marriagesFamily, multiMarriageFamily } from "@/lib/samples/fixtures";
import { computeGenerations } from "@/lib/genealogy";
import type { Gender, MemberDTO, TreeDTO } from "@/lib/types";
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

  // Five sons with families and five daughters, born alternately: the
  // daughters sit between their brothers' families. With them shown the
  // poster must stay as clear as with sons only.
  it("five fathers and five daughters: as clear as the sons alone", () => {
    const members: MemberDTO[] = [];
    let n = 0;
    const add = (name: string, gender: Gender, fatherId: string | null, order = 0) => {
      const m: MemberDTO = { id: `mix-${++n}`, name, laqab: null, gender, birthYear: null, deathYear: null, isDeceased: false, birthOrder: order, generation: 0, notes: null, fatherId, motherId: null };
      members.push(m);
      return m;
    };
    const root = add("عبدالله", "MALE", null);
    const sons = ["محمد", "أحمد", "خالد", "سعود", "فهد"], daughters = ["نورة", "سارة", "هند", "ريم", "مها"];
    const names = ["سلمان", "عمر", "ناصر", "تركي", "بدر", "فيصل", "يوسف", "سالم"];
    for (let i = 0; i < 10; i++) {
      const daughter = i % 2 === 1;
      const c = add(daughter ? daughters[i >> 1] : sons[i >> 1], daughter ? "FEMALE" : "MALE", root.id, i);
      if (daughter) continue;
      for (let j = 0; j < 3 + (i % 3); j++) {
        const g = add(names[(i + j) % names.length], "MALE", c.id, j);
        if (j === 0) for (let k = 0; k < 3; k++) add(names[(k + i) % names.length], k === 1 ? "FEMALE" : "MALE", g.id, k);
      }
    }
    const gens = computeGenerations(members, "PATRILINEAL");
    for (const m of members) m.generation = gens.get(m.id) ?? 0;
    const tree: TreeDTO = { id: "mix", name: "mix", title: "شجرة آل عبدالله", subtitle: null, lineage: "PATRILINEAL", rootMemberId: root.id, crownBaseId: null, trunkStartId: null, soilText: null, settings: { showFemales: true, seed: 7, theme: {} }, members, marriages: [], sources: [], citations: [], media: [] };
    for (const paper of ["A2", "A1"] as const) {
      for (const showFemales of [false, true]) {
        const l = computePosterLayout(tree, { ...layoutOptionsFor(resolveTheme(tree.settings), paper), showFemales });
        expect(l.overlaps, `${paper} ${showFemales}`).toBe(0);
        expect(l.clarity.issues, `${paper} ${showFemales}`).toEqual([]);
        expect(l.clarity.clearCrossings, `${paper} ${showFemales}`).toBe(0);
        expect(l.legibility.ok).toBe(true);
      }
    }
  });
});
