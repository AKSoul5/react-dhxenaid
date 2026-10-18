import { describe, expect, it } from "vitest";
import { computePosterLayout, type PosterNode } from "@/lib/layout/botanical";
import { givenAndFamilyName } from "@/lib/nasab";
import { multiMarriageFamily } from "@/lib/samples/fixtures";
import { layoutOptionsFor, resolveTheme } from "@/lib/theme";

// حمد has children by three wives, and some of his sons by two: with the
// option on, each of those children carries his mother's first and family
// names.
// (on round name holders a long second line is set on two)
const sub = (n: PosterNode) => n.subLabel?.replace(/\n/g, " ");

describe("naming the mothers of half-siblings", () => {
  const tree = multiMarriageFamily();
  const byId = new Map(tree.members.map((m) => [m.id, m]));
  const settings = { ...tree.settings, showFemales: true };
  const withNames = { ...tree, settings: { ...settings, theme: { motherNames: true } } };
  const opts = (t: typeof tree) => layoutOptionsFor(resolveTheme(t.settings), "A2");
  const wivesOf = (id: string) => new Set(tree.members.filter((c) => c.fatherId === id && c.motherId).map((c) => c.motherId));

  it("is off by default", () => {
    const t = { ...tree, settings };
    const l = computePosterLayout(t, opts(t));
    expect(l.nodes.some((n) => n.subLabel?.startsWith("أم"))).toBe(false);
  });

  it("names each child's mother when the father has more than one wife, and only then", () => {
    const l = computePosterLayout(withNames, opts(withNames));
    let named = 0;
    for (const n of l.nodes) {
      const m = n.member;
      const several = m.fatherId && m.motherId && wivesOf(m.fatherId).size > 1;
      if (several) {
        named++;
        expect(sub(n)).toBe(`${m.gender === "FEMALE" ? "أمها" : "أمه"} ${givenAndFamilyName(byId.get(m.motherId!)!.name)}`);
      } else {
        expect(n.subLabel ?? "").not.toMatch(/^أم/);
      }
    }
    expect(named).toBeGreaterThan(20);
    // her first and family names, without her father's
    const hamadKids = l.nodes.filter((n) => byId.get(n.member.fatherId ?? "")?.name === "حمد");
    expect(new Set(hamadKids.map((n) => sub(n)?.replace(/^أمها? /, "")))).toEqual(new Set(["فاطمة العتيبي", "عائشة القحطاني", "خديجة الدوسري"]));
  });

  for (const nodeShape of ["auto", "oval", "circle", "leaf"] as const) {
    it(`keeps the poster clear with ${nodeShape} names`, () => {
      const t = { ...withNames, settings: { ...withNames.settings, theme: { motherNames: true, nodeShape } } };
      const l = computePosterLayout(t, opts(t));
      expect(l.overlaps).toBe(0);
      expect(l.clarity.issues).toEqual([]);
      expect(l.legibility.ok).toBe(true);
    });
  }

  it("keeps the full names when two wives share first and family names", () => {
    const same = { ...withNames, members: withNames.members.map((m) => (m.name === "عائشة بنت علي القحطاني" ? { ...m, name: "فاطمة بنت علي العتيبي" } : m)) };
    const l = computePosterLayout(same, opts(same));
    const subs = new Set(l.nodes.filter((n) => byId.get(n.member.fatherId ?? "")?.name === "حمد").map((n) => sub(n)?.replace(/^أمها? /, "")));
    expect(subs).toEqual(new Set(["فاطمة بنت سعد العتيبي", "فاطمة بنت علي العتيبي", "خديجة الدوسري"]));
  });

  it("shortens a name to its first and family names", () => {
    expect(givenAndFamilyName("فاطمة بنت سعد العتيبي")).toBe("فاطمة العتيبي");
    expect(givenAndFamilyName("فاطمة بنت سعد بن ناصر آل سعود")).toBe("فاطمة آل سعود");
    expect(givenAndFamilyName("فاطمة بنت سعد")).toBe("فاطمة");
    expect(givenAndFamilyName("نورة السديري")).toBe("نورة السديري");
    expect(givenAndFamilyName("الجوهرة بنت عبدالعزيز")).toBe("الجوهرة");
    expect(givenAndFamilyName("Fatimah bint Saad Al-Otaibi")).toBe("Fatimah Al-Otaibi");
  });

  it("writes it in English for English names", () => {
    const en = { ...withNames, members: withNames.members.map((m, i) => ({ ...m, name: `Person ${i}` })) };
    const l = computePosterLayout(en, opts(en));
    const kid = l.nodes.find((n) => n.member.fatherId && wivesOf(n.member.fatherId).size > 1)!;
    expect(sub(kid)).toBe(`mother: Person ${en.members.findIndex((m) => m.id === kid.member.motherId)}`);
  });
});
