// Large, dense families with the add-on features switched on: daughters on
// the poster, their own families shown through them on dotted lines, every
// wife on the branch in a cartouche, men with several wives, daughters who
// remarried. Each such family must come out fully clear (no ambiguous
// connection, no overlapping name, legible text) on some paper size;
// paper has no limit, so a family that needs 8A0 gets 8A0, and the
// editor's search for that size finds it.
//
// The normal suite runs a small family; `STRESS=1 npx vitest run
// tests/stress.test.ts` runs the full sweep (300 people, six seeds, every
// combination of the add-ons), which takes several minutes.
import { describe, expect, it } from "vitest";
import { exportGedcom, parseGedcom, planGedcomImport } from "@/lib/gedcom";
import { computePosterLayout } from "@/lib/layout/botanical";
import { branchHeads, clearestPaper, smallestClearPaper } from "@/lib/layout/branches";
import type { PaperSize } from "@/lib/paper";
import { makeProjectFile, readProjectFile, withNewIds } from "@/lib/project";
import { stressFamily } from "@/lib/samples/stress";
import { layoutOptionsFor, resolveTheme } from "@/lib/theme";
import type { MemberDTO } from "@/lib/types";

const FULL = !!process.env.STRESS;
const MODES = ["daughters", "through", "spouses", "through+spouses"] as const;
type Mode = (typeof MODES)[number];

function clearPaper(size: number, seed: number, mode: Mode, from: PaperSize) {
  const { tree, mothers } = stressFamily({ size, seed });
  const settings = {
    ...tree.settings,
    showFemales: true,
    familiesThrough: mode.includes("through") ? mothers : [],
    theme: { motherNames: mode.includes("spouses") },
  };
  const t = { ...tree, settings };
  // (the editor's search: it must not give up before the size that is clear)
  const at = (paper: PaperSize) => computePosterLayout(t, layoutOptionsFor(resolveTheme(settings), paper));
  const paper = smallestClearPaper(at, from);
  return paper ? { paper, layout: at(paper), tree: t } : null;
}

describe("dense families with every add-on are clear on some paper", () => {
  const cases: [number, number][] = FULL ? [1, 2, 3, 4, 5, 6].map((s) => [300, s]) : [[90, 1]];
  for (const [size, seed] of cases) {
    for (const mode of MODES) {
      it(`${size} people, seed ${seed}, ${mode}`, () => {
        const found = clearPaper(size, seed, mode, FULL ? "A1" : "A2");
        expect(found, "no paper size is clear").not.toBeNull();
        const { layout, tree } = found!;
        // everyone the settings ask for is on the poster
        const shown = new Set(layout.nodes.map((n) => n.member.id));
        for (const m of tree.members) {
          if (!m.fatherId && m.id !== tree.rootMemberId) continue; // wives and husbands from outside
          const viaMother = !!m.motherId && tree.settings.familiesThrough!.includes(m.motherId);
          const inLine = tree.members.find((f) => f.id === m.fatherId)?.id === tree.rootMemberId || shown.has(m.fatherId!);
          if (inLine || viaMother) expect(shown.has(m.id), m.name).toBe(true);
        }
        if (mode.includes("spouses")) expect(layout.spouses.length).toBeGreaterThan(0);
        else if (mode === "daughters") expect(layout.spouses).toHaveLength(0);
      }, FULL ? 600_000 : 60_000);
    }
  }
});

describe("a dense family survives GEDCOM and project files intact", () => {
  const { tree, mothers } = stressFamily({ size: 300, seed: 4 });
  // each person by their name, gender and whole line of fathers and mothers
  const lines = (ms: MemberDTO[]) => {
    const by = new Map(ms.map((m) => [m.id, m]));
    const path = (m: MemberDTO | undefined): string => (m ? `${m.name}<${path(by.get(m.fatherId!))}|${by.get(m.motherId!)?.name ?? ""}>` : "");
    return ms.map((m) => `${m.gender}:${path(m)}`).sort();
  };

  it("GEDCOM: exported and imported, every person, parent and marriage; imported again, nothing new", () => {
    const file = parseGedcom(exportGedcom(tree));
    expect(file.warnings).toEqual([]);
    let n = 0;
    const empty = { members: [], marriages: [], lineage: tree.lineage, rootMemberId: null, sources: [], citations: [], media: [] };
    const plan = planGedcomImport(empty, file, () => `i${n++}`);
    expect(plan.newMembers).toHaveLength(tree.members.length);
    expect(plan.newMarriages).toHaveLength(tree.marriages.length);
    expect(lines(plan.members)).toEqual(lines(tree.members));
    const again = planGedcomImport(tree, file, () => `j${n++}`);
    expect([again.newMembers.length, again.newMarriages.length]).toEqual([0, 0]);
  });

  it("project file: the family and its poster settings, under new ids", () => {
    const settings = { ...tree.settings, familiesThrough: mothers, posterSize: "8A0" as const, theme: { motherNames: true } };
    const read = readProjectFile(JSON.stringify(makeProjectFile({ ...tree, settings })));
    let n = 0;
    const fresh = withNewIds(read.tree, () => `p${n++}`);
    expect(lines(fresh.members)).toEqual(lines(tree.members));
    const ids = new Set(fresh.members.map((m) => m.id));
    expect(fresh.settings?.familiesThrough).toHaveLength(mothers.length);
    expect(fresh.settings?.familiesThrough?.every((id) => ids.has(id))).toBe(true);
    expect(fresh.settings?.posterSize).toBe("8A0");
    expect(ids.has(fresh.rootMemberId!)).toBe(true);
  });
});

describe("branch posters of a dense family with every add-on are clear on some paper", () => {
  const { tree, mothers } = stressFamily({ size: 300, seed: 2 });
  const settings = { ...tree.settings, showFemales: true, familiesThrough: mothers, theme: { motherNames: true } };
  const t = { ...tree, settings };
  const optionsFor = (paper: PaperSize) => layoutOptionsFor(resolveTheme(settings), paper);
  const heads = branchHeads(t, computePosterLayout(t, optionsFor("A1")));
  // (حسين: his wife's cartouche once sat on his name, his children being on
  // several sides of him)
  for (const h of FULL ? heads : heads.filter((x) => x.id === "st2-10")) {
    it(`${h.name} (${h.people} people)`, () => {
      expect(clearestPaper(t, h.id, optionsFor)).not.toBeNull();
    }, FULL ? 600_000 : 60_000);
  }
});
