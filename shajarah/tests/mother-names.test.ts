import { describe, expect, it } from "vitest";
import { computePosterLayout } from "@/lib/layout/botanical";
import { givenAndFamilyName } from "@/lib/nasab";
import { multiMarriageFamily } from "@/lib/samples/fixtures";
import { nouriFamily } from "@/lib/samples/nouri";
import { layoutOptionsFor, resolveTheme } from "@/lib/theme";
import type { TreeDTO } from "@/lib/types";

// حمد has children by three wives, and some of his sons by two: with the
// option on, each of those wives is a cartouche on her husband's branch,
// and the children she bore him grow from it.
describe("wives on the branch (fathers with several)", () => {
  const tree = multiMarriageFamily();
  const byId = new Map(tree.members.map((m) => [m.id, m]));
  const withWives = (t: TreeDTO, theme = {}) => ({ ...t, settings: { ...t.settings, showFemales: true, theme: { motherNames: true, ...theme } } });
  const opts = (t: TreeDTO) => layoutOptionsFor(resolveTheme(t.settings), "A2");
  const wivesOf = (id: string) => new Set(tree.members.filter((c) => c.fatherId === id && c.motherId).map((c) => c.motherId));

  it("is off by default", () => {
    const t = { ...tree, settings: { ...tree.settings, showFemales: true } };
    expect(computePosterLayout(t, opts(t)).spouses).toEqual([]);
  });

  it("puts each wife between her husband and the children she bore him, and only for several wives", () => {
    const t = withWives(tree);
    const l = computePosterLayout(t, opts(t));
    const drawn = new Map(l.nodes.map((n) => [n.id, n]));
    let children = 0;
    for (const n of l.nodes) {
      const m = n.member;
      const several = m.fatherId && m.motherId && wivesOf(m.fatherId).size > 1;
      const holder = l.spouses.find((s) => s.childIds.includes(n.id));
      if (!several) {
        expect(holder).toBeUndefined();
        continue;
      }
      children++;
      expect(holder!.member.id).toBe(m.motherId);
      expect(holder!.partnerId).toBe(m.fatherId);
      expect(l.edges.some((e) => e.parentId === holder!.id && e.childId === n.id)).toBe(true);
      expect(l.edges.some((e) => e.parentId === m.fatherId && e.childId === n.id)).toBe(false);
      expect(n.subLabel ?? "").not.toMatch(/^أم/);
    }
    expect(children).toBeGreaterThan(30);
    for (const s of l.spouses) {
      expect(s.label).toBe(givenAndFamilyName(s.member.name));
      expect(l.edges.some((e) => e.parentId === s.partnerId && e.childId === s.id)).toBe(true);
      // nearer the husband than any of her children
      const p = drawn.get(s.partnerId) ?? l.base!;
      for (const c of s.childIds) expect(Math.hypot(s.x - p.x, s.y - p.y)).toBeLessThan(Math.hypot(drawn.get(c)!.x - p.x, drawn.get(c)!.y - p.y));
    }
    // حمد's three wives, by first and family names
    expect(new Set(l.spouses.filter((s) => byId.get(s.partnerId)?.name === "حمد").map((s) => s.label)))
      .toEqual(new Set(["فاطمة العتيبي", "عائشة القحطاني", "خديجة الدوسري"]));
    // drawn: the warning about people left off counts only the others
    const without = { ...t, settings: { ...t.settings, theme: {} } };
    expect(l.stats.unplaced).toBeLessThan(computePosterLayout(without, opts(without)).stats.unplaced);
  });

  for (const nodeShape of ["auto", "oval", "circle", "leaf"] as const) {
    for (const showFemales of [true, false]) {
      it(`keeps the poster clear with ${nodeShape} names${showFemales ? "" : ", daughters hidden"}`, () => {
        const t = withWives({ ...tree, settings: { ...tree.settings } }, { nodeShape });
        const l = computePosterLayout({ ...t, settings: { ...t.settings, showFemales } }, opts(t));
        expect(l.spouses.length).toBeGreaterThan(10);
        expect(l.overlaps).toBe(0);
        expect(l.clarity.issues).toEqual([]);
        expect(l.legibility.ok).toBe(true);
      });
    }
  }

  it("works for the Al-Nouri family's two wives, and with a daughter's family shown", () => {
    const n = nouriFamily();
    const amina = n.members.find((m) => m.name === "Amina" && m.fatherId === n.rootMemberId)!;
    const t = { ...withWives(n), settings: { ...withWives(n).settings, familiesThrough: [amina.id] } };
    const l = computePosterLayout(t, opts(t));
    expect(l.spouses.map((s) => s.label).sort()).toEqual(["Fatimah", "Hassan", "Mariam"]);
    expect(l.spouses.find((s) => s.label === "Hassan")!.dotted).toBe(true);
    expect(l.spouses.find((s) => s.label === "Fatimah")!.dotted).toBe(false);
    expect(l.clarity.issues).toEqual([]);
    expect(l.overlaps).toBe(0);
  });

  it("keeps the full names when two wives share first and family names", () => {
    const same = withWives({ ...tree, members: tree.members.map((m) => (m.name === "عائشة بنت علي القحطاني" ? { ...m, name: "فاطمة بنت علي العتيبي" } : m)) });
    const l = computePosterLayout(same, opts(same));
    expect(new Set(l.spouses.filter((s) => byId.get(s.partnerId)?.name === "حمد").map((s) => s.label)))
      .toEqual(new Set(["فاطمة بنت سعد العتيبي", "فاطمة بنت علي العتيبي", "خديجة الدوسري"]));
  });

  it("shortens a name to its first and family names", () => {
    expect(givenAndFamilyName("فاطمة بنت سعد العتيبي")).toBe("فاطمة العتيبي");
    expect(givenAndFamilyName("فاطمة بنت سعد بن ناصر آل سعود")).toBe("فاطمة آل سعود");
    expect(givenAndFamilyName("فاطمة بنت سعد")).toBe("فاطمة");
    expect(givenAndFamilyName("نورة السديري")).toBe("نورة السديري");
    expect(givenAndFamilyName("الجوهرة بنت عبدالعزيز")).toBe("الجوهرة");
    expect(givenAndFamilyName("Fatimah bint Saad Al-Otaibi")).toBe("Fatimah Al-Otaibi");
  });
});
