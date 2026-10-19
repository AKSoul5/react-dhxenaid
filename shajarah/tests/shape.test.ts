// The poster reads as a tree in every theme: a trunk, and a crown rising
// from it (not names hanging level with the trunk's top, nor a crown swung
// to one side by one large branch), whatever the family's shape.
import { describe, expect, it } from "vitest";
import { computeGenerations } from "@/lib/genealogy";
import { computePosterLayout } from "@/lib/layout/botanical";
import { mulberry32 } from "@/lib/layout/random";
import { DROOP_LIMIT, measureShape } from "@/lib/layout/shape";
import * as F from "@/lib/samples/fixtures";
import { layoutOptionsFor, resolveTheme, THEME_PRESETS } from "@/lib/theme";
import type { MarriageDTO, MemberDTO, TreeDTO } from "@/lib/types";

/**
 * A family shaped like a real one that came out disfigured: 12 ancestors on
 * the trunk; under the canopy base 16 children, most of them without
 * children of their own; one son (أحمد) with two wives, four sons with
 * families and four daughters married into other families, holding most of
 * the canopy; three brothers with small families.
 */
export function dominantBranchFamily(): TreeDTO {
  const rand = mulberry32(5);
  const members: MemberDTO[] = [];
  const marriages: MarriageDTO[] = [];
  let n = 0;
  const add = (name: string, gender: MemberDTO["gender"], fatherId: string | null, motherId: string | null = null, order = 0): MemberDTO => {
    const m: MemberDTO = { id: `p${n++}`, name, laqab: null, gender, birthYear: null, deathYear: null, isDeceased: false, birthOrder: order, generation: 0, notes: null, fatherId, motherId };
    members.push(m);
    return m;
  };
  const marry = (a: MemberDTO, b: MemberDTO) => marriages.push({ id: `m${marriages.length}`, spouseAId: a.id, spouseBId: b.id, startYear: null, endYear: null });
  const SONS = ["محمد", "أحمد", "خالد", "عمر", "سالم", "فيصل", "طلال", "نايف", "حامد", "باسل", "ظافر", "نوفل"];
  const DAUGHTERS = ["منى", "هدى", "سارة", "دنى", "ريم", "نور", "منال", "لبنى"];
  const pick = (list: string[]) => list[Math.floor(rand() * list.length)];
  let top: MemberDTO | null = null;
  for (let i = 0; i < 12; i++) top = add(pick(SONS), "MALE", top?.id ?? null);
  const base = add("محمد", "MALE", top!.id);
  const kids = (father: MemberDTO, count: number, daughters = 0.4, mother: MemberDTO | null = null) =>
    Array.from({ length: count }, (_, i) => (rand() < daughters ? add(pick(DAUGHTERS), "FEMALE", father.id, mother?.id ?? null, i) : add(pick(SONS), "MALE", father.id, mother?.id ?? null, i)));
  // the canopy base's children: the large branch in the middle of the birth order
  for (let i = 0; i < 16; i++) {
    if (i === 6) {
      const ahmad = add("أحمد", "MALE", base.id, null, i);
      const w1 = add("نفيسة", "FEMALE", null), w2 = add("غمرة", "FEMALE", null);
      marry(ahmad, w1); marry(ahmad, w2);
      for (const [k, w] of [[0, w2], [1, w2], [2, w2], [3, w2], [4, w1], [5, w1], [6, w1], [7, w1]] as const) {
        if (k < 4) {
          const son = add(pick(SONS), "MALE", ahmad.id, w.id, k);
          for (const g of kids(son, 5 + Math.floor(rand() * 4))) if (g.gender === "MALE" && rand() < 0.4) kids(g, 1 + Math.floor(rand() * 3));
        } else {
          // a daughter married into another family, with her children by him
          const d = add(pick(DAUGHTERS), "FEMALE", ahmad.id, w.id, k);
          const h = add(`${pick(SONS)} ${["مليح", "شمس", "بهلول", "تميم"][k - 4]}`, "MALE", null);
          marry(d, h);
          for (let c = 0; c < 2 + Math.floor(rand() * 3); c++) add(pick(SONS), rand() < 0.5 ? "MALE" : "FEMALE", h.id, d.id, c);
        }
      }
    } else if (i === 2 || i === 9 || i === 13) {
      kids(add(pick(SONS), "MALE", base.id, null, i), 2 + Math.floor(rand() * 7));
    } else {
      add(rand() < 0.35 ? pick(DAUGHTERS) : pick(SONS), rand() < 0.35 ? "FEMALE" : "MALE", base.id, null, i);
    }
  }
  const gens = computeGenerations(members, "PATRILINEAL");
  for (const m of members) m.generation = gens.get(m.id) ?? 0;
  return {
    id: "dominant", name: "dominant", title: "شجرة العائلة", subtitle: null, lineage: "PATRILINEAL", rootMemberId: members[0].id,
    crownBaseId: base.id, trunkStartId: null, soilText: null, settings: { showFemales: true, seed: 7 },
    members, marriages, sources: [], citations: [], media: [],
  };
}

/** A trunk and a crown rising from it, centred over it, clear and legible. (Measured: droop at most 0.07, lean 0.10, sides 0.07, trunk at least 0.16.) */
function expectTreeLike(l: ReturnType<typeof computePosterLayout>, where: string) {
  const s = measureShape(l);
  expect(s.droop, `${where}: names hanging level with the trunk's top`).toBeLessThanOrEqual(DROOP_LIMIT);
  expect(s.lean, `${where}: crown swung to one side`).toBeLessThan(0.2);
  expect(s.sides, `${where}: one side heavier`).toBeLessThan(0.15);
  expect(s.trunk, `${where}: a stub of a trunk`).toBeGreaterThan(0.12);
  expect(l.clarity.issues, where).toEqual([]);
  expect(l.legibility.ok, where).toBe(true);
}

describe("a family with one dominant branch, in every theme", () => {
  const tree = dominantBranchFamily();
  const ahmad = tree.members.find((m) => m.name === "أحمد" && m.fatherId === tree.crownBaseId)!;
  const daughtersOfAhmad = tree.members.filter((m) => m.gender === "FEMALE" && m.fatherId === ahmad.id).map((m) => m.id);
  const variants: [string, Partial<NonNullable<TreeDTO["settings"]>>, boolean][] = [
    ["plain", {}, false],
    ["spouses", {}, true],
    ["daughters' families", { familiesThrough: daughtersOfAhmad }, false],
    ["spouses and daughters' families", { familiesThrough: daughtersOfAhmad }, true],
  ];
  for (const preset of Object.keys(THEME_PRESETS)) {
    it(preset, () => {
      for (const [label, extra, spouses] of variants) {
        const settings = { ...tree.settings, ...extra, theme: { preset, motherNames: spouses } } as TreeDTO["settings"];
        const l = computePosterLayout({ ...tree, settings }, layoutOptionsFor(resolveTheme(settings), "2A0"));
        const where = `${preset}, ${label}`;
        expectTreeLike(l, where);
        // the large branch is centred: it rises from the trunk as the crown
        const a = l.nodes.find((x) => x.member.id === ahmad.id)!;
        expect(Math.abs(a.x - l.origin.x) / l.width, where).toBeLessThan(0.01);
        // the trunk's names in proportion to the branches' (they once stood
        // nearly three times as large)
        const median = l.nodes.map((x) => x.fontSize).sort((x, y) => x - y)[l.nodes.length >> 1];
        expect(Math.max(...l.trunkLabels.map((t) => t.fontSize)) / median, where).toBeLessThan(1.3);
      }
    }, 120_000);
  }
});

describe("what the shape check catches", () => {
  it("the old layout (a flat-bottomed sweep, the large branch where its birth order puts it) hangs and leans", () => {
    const tree = dominantBranchFamily();
    const l = computePosterLayout(tree, { ...layoutOptionsFor(resolveTheme(tree.settings), "2A0"), sweepLift: -0.12, autoCenter: false });
    const s = measureShape(l);
    expect(s.droop > DROOP_LIMIT || s.lean >= 0.2 || s.sides >= 0.15).toBe(true);
  });
});

describe("the sample families, in every theme", () => {
  const families: [string, TreeDTO][] = [
    ["small", F.smallFamily()], ["marriages", F.marriagesFamily()], ["names", F.namesFamily()],
    ["several marriages", F.multiMarriageFamily()], ["crowded base", F.crowdedBaseFamily()],
  ];
  for (const preset of Object.keys(THEME_PRESETS)) {
    it(preset, () => {
      for (const [name, t] of families) {
        const settings = { ...t.settings, theme: { preset } } as TreeDTO["settings"];
        const l = computePosterLayout({ ...t, settings }, layoutOptionsFor(resolveTheme(settings), "A1"));
        expectTreeLike(l, `${preset}, ${name}`);
      }
    }, 120_000);
  }
});
