// A daughter with several husbands, her children shown through her: the
// husbands' boxes stand around her in the order of their children (one
// turned aside to find room once passed another and sent its dotted lines
// across the other's). And circular badges: one height for every name, a
// long name stretched into a capsule rather than set in a larger circle.
import { describe, expect, it } from "vitest";
import { computeGenerations } from "@/lib/genealogy";
import { computePosterLayout, textWidth } from "@/lib/layout/botanical";
import { kalaliTree } from "@/lib/samples/kalali";
import { layoutOptionsFor, resolveTheme, THEME_PRESETS } from "@/lib/theme";
import type { MarriageDTO, MemberDTO, TreeDTO } from "@/lib/types";

/** The Al-Kalali line; under the canopy base a son with a daughter of four husbands (two children each), and his brothers' families around. */
function daughterOfFourHusbands(): { tree: TreeDTO; daughter: string } {
  const base = kalaliTree();
  const members: MemberDTO[] = base.members.slice(0, 82).map((m) => ({ ...m }));
  const crown = members[81];
  let n = 0;
  const add = (name: string, fatherId: string | null, gender: "MALE" | "FEMALE" = "MALE", motherId: string | null = null) => {
    const m: MemberDTO = { ...members[0], id: `h${n++}`, name, laqab: null, gender, fatherId, motherId, birthOrder: n };
    members.push(m);
    return m;
  };
  const marriages: MarriageDTO[] = [];
  const sons = ["أحمد", "عمر", "باسل", "نوفل", "ظافر"].map((x) => add(x, crown.id));
  sons.forEach((s, i) => { for (let k = 0; k < 3 + i; k++) add(["طلال", "خالد", "فيصل", "مهند", "بدر", "هتان", "حسام"][k], s.id); });
  const daughter = add("ماجدة", sons[3].id, "FEMALE");
  ["عمر الجروان", "وائل فتوح", "محمد عسيري", "سامي لاذقاني"].forEach((x, i) => {
    const h = add(x, null);
    marriages.push({ id: `hm${i}`, spouseAId: h.id, spouseBId: daughter.id, startYear: null, endYear: null });
    for (const c of [["محبة", "غاية"], ["فيصل", "يوسف"], ["عبدالمحسن", "آية"], ["محمد", "نور"]][i]) add(c, h.id, c === "محبة" || c === "غاية" || c === "آية" || c === "نور" ? "FEMALE" : "MALE", daughter.id);
  });
  const gens = computeGenerations(members, "PATRILINEAL");
  for (const m of members) m.generation = gens.get(m.id) ?? 0;
  return { tree: { ...base, members, marriages, trunkStartId: members[69].id, crownBaseId: crown.id, settings: { showFemales: true, familiesThrough: [daughter.id] } }, daughter: daughter.id };
}

describe("a daughter's several husbands", () => {
  const { tree, daughter } = daughterOfFourHusbands();
  for (const preset of Object.keys(THEME_PRESETS)) {
    it(`${preset}: their boxes in the order of their children, no line across another's`, () => {
      for (const shape of ["auto", "circle", "oval"] as const) for (const paper of ["A1", "A0"] as const) {
        const settings = { ...tree.settings, theme: { preset, motherNames: true, nodeShape: shape } } as TreeDTO["settings"];
        const l = computePosterLayout({ ...tree, settings }, layoutOptionsFor(resolveTheme(settings), paper));
        const where = `${preset}, ${shape}, ${paper}`;
        const d = l.nodes.find((x) => x.id === daughter)!;
        const boxes = l.spouses.filter((s) => s.partnerId === daughter);
        expect(boxes.length, where).toBe(4);
        // around her, the boxes and their children's centres turn the same way
        const kidsOf = (boxId: string) => l.nodes.filter((x) => l.edges.some((e) => e.parentId === boxId && e.childId === x.id));
        const ref = Math.atan2(boxes.reduce((a, b) => a + b.y - d.y, 0), boxes.reduce((a, b) => a + b.x - d.x, 0));
        const ang = (x: number, y: number) => { let a = Math.atan2(y - d.y, x - d.x) - ref; while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; };
        const byBox = [...boxes].sort((a, b) => ang(a.x, a.y) - ang(b.x, b.y)).map((b) => b.id);
        const centre = (id: string) => { const k = kidsOf(id); return ang(k.reduce((a, x) => a + x.x, 0) / k.length, k.reduce((a, x) => a + x.y, 0) / k.length); };
        const byKids = [...boxes].sort((a, b) => centre(a.id) - centre(b.id)).map((b) => b.id);
        expect(byBox, where).toEqual(byKids);
        // and no line of her family crosses another of it
        const mine = new Set([daughter, ...boxes.map((b) => b.id)]);
        const crossing = (l.clarity.crossings ?? []).filter((c) => mine.has(c.edge[0]) && mine.has(c.other[0]));
        expect(crossing, where).toEqual([]);
        expect(l.clarity.issues, where).toEqual([]);
      }
    }, 120_000);
  }
});

describe("circular badges", () => {
  it("are one height for every name: a long name stretches into a capsule hugging it", () => {
    const { tree } = daughterOfFourHusbands();
    const settings = { ...tree.settings, theme: { preset: "refined", nodeShape: "circle" } } as TreeDTO["settings"];
    const l = computePosterLayout({ ...tree, settings }, layoutOptionsFor(resolveTheme(settings), "A1"));
    const round = l.nodes.filter((x) => x.shape === "circle" && !x.subLabel);
    expect(round.length).toBeGreaterThan(10);
    for (const x of round) {
      // as tall as a circle at its size, never taller
      expect(x.h, x.label).toBeCloseTo(x.fontSize * 2.55, 6);
      expect(x.w, x.label).toBeGreaterThanOrEqual(x.h - 1e-6);
      // a long name: the badge hugs it (a circle round it would be wider still)
      const tw = textWidth(x.label, x.fontSize);
      if (tw + x.fontSize * 1.1 > x.h) expect(x.w, x.label).toBeCloseTo(tw + x.fontSize * 1.1, 6);
      else expect(x.w, x.label).toBeCloseTo(x.h, 6);
    }
    expect(round.some((x) => x.w > x.h + 1)).toBe(true);
  });
});
