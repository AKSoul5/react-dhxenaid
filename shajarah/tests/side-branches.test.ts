// Side branches: a brother of a trunk ancestor with a family of his own
// grows out of the trunk beside it. One from the badge nearest the crown
// once fanned up into the canopy's lowest names and tangled with the canopy
// base's wife and daughters (and his own sons sat on each other's lines);
// it now turns out and down into the free room beside the trunk, as far
// out as its names need.
import { describe, expect, it } from "vitest";
import { computeGenerations } from "@/lib/genealogy";
import { computePosterLayout } from "@/lib/layout/botanical";
import { kalaliTree } from "@/lib/samples/kalali";
import { layoutOptionsFor, resolveTheme, THEME_PRESETS } from "@/lib/theme";
import type { MarriageDTO, MemberDTO, TreeDTO } from "@/lib/types";

/** The Al-Kalali trunk; the canopy base's brother with a son of six sons; the canopy base with two wives, daughters and sons' families. */
function sideBranchFamily(): TreeDTO {
  const base = kalaliTree();
  const members: MemberDTO[] = base.members.slice(0, 82).map((m) => ({ ...m }));
  const crown = members[81], father = members.find((m) => m.id === crown.fatherId)!;
  let n = 0;
  const add = (name: string, fatherId: string | null, gender: "MALE" | "FEMALE" = "MALE", motherId: string | null = null) => {
    const m: MemberDTO = { ...members[0], id: `s${n++}`, name, laqab: null, gender, fatherId, motherId, birthOrder: n };
    members.push(m);
    return m;
  };
  // the brother, his son, and six grandsons (two with sons of their own)
  const brother = add("عوض", father.id);
  const son = add("سالم", brother.id);
  const grandsons = ["عبدالرحمن", "نعمان", "حسن", "محمد", "جمال", "عبدالحكيم"].map((x) => add(x, son.id));
  add("خالد", grandsons[0].id);
  add("فهد", grandsons[3].id);
  // the canopy base's family: two wives, sons with families, daughters
  const w1 = add("نور", null, "FEMALE"), w2 = add("مريم", null, "FEMALE");
  const marriages: MarriageDTO[] = [w1, w2].map((w, i) => ({ id: `mm${i}`, spouseAId: crown.id, spouseBId: w.id, startYear: null, endYear: null }));
  const sons = ["أحمد", "عمر", "أسعد", "حامد", "عبدالمعين"].map((x) => add(x, crown.id, "MALE", w2.id));
  ["سالم", "فضل", "عقيل", "عبدالله", "نافع"].forEach((x) => add(x, crown.id, "MALE", w2.id));
  ["عائشة", "حميدة", "رقية"].forEach((x) => add(x, crown.id, "FEMALE", w2.id));
  ["قمر", "بدرية"].forEach((x) => add(x, crown.id, "FEMALE", w1.id));
  sons.forEach((s, i) => {
    for (let k = 0; k < 6 - i; k++) {
      const g = add(["باسل", "ظافر", "هدى", "منى", "طلال", "مدى"][k], s.id, k === 2 || k === 3 || k === 5 ? "FEMALE" : "MALE");
      if (g.gender === "MALE" && k < 2) for (let j = 0; j < 3; j++) add(["فيصل", "خالد", "بدر"][j], g.id);
    }
  });
  const gens = computeGenerations(members, "PATRILINEAL");
  for (const m of members) m.generation = gens.get(m.id) ?? 0;
  return { ...base, members, marriages, trunkStartId: members[69].id, crownBaseId: crown.id, settings: { showFemales: true } };
}

describe("a side branch from the badge nearest the crown", () => {
  const tree = sideBranchFamily();
  // the brother and everyone descended from him
  const branch = new Set<string>([tree.members.find((m) => m.name === "عوض")!.id]);
  for (let grew = true; grew;) {
    grew = false;
    for (const m of tree.members) if (m.fatherId && branch.has(m.fatherId) && !branch.has(m.id)) { branch.add(m.id); grew = true; }
  }
  for (const preset of Object.keys(THEME_PRESETS)) {
    it(`${preset}: beside the trunk, below the crown, every line clear`, () => {
      for (const [paper, spouses] of [["A1", false], ["A1", true], ["2A0", true]] as const) {
        const settings = { ...tree.settings, theme: { preset, motherNames: spouses } } as TreeDTO["settings"];
        const l = computePosterLayout({ ...tree, settings }, layoutOptionsFor(resolveTheme(settings), paper));
        const where = `${preset}, ${paper}${spouses ? ", spouses" : ""}`;
        const side = l.nodes.filter((x) => branch.has(x.id));
        expect(side.length, where).toBe(branch.size);
        // never up in the crown: every name of it below the canopy base
        for (const s of side) expect(s.y, `${where}: ${s.label}`).toBeGreaterThan(l.origin.y);
        // and nothing unclear anywhere
        expect(l.clarity.issues, where).toEqual([]);
        expect(l.overlaps, where).toBe(0);
      }
    }, 120_000);
  }
});
