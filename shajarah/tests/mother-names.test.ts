import { describe, expect, it } from "vitest";
import { computePosterLayout } from "@/lib/layout/botanical";
import { multiMarriageFamily } from "@/lib/samples/fixtures";
import { layoutOptionsFor, resolveTheme } from "@/lib/theme";

// حمد has children by three wives, and some of his sons by two: with the
// option on, each of those children carries his mother's name. (The
// sons' wives get real names: the fixture's "زوجة يوسف الثانية" stand-ins
// are far longer than names people record.)
const NAMES = ["نورة", "هيا", "منيرة", "لولوة", "الجوهرة", "حصة", "مضاوي", "شيخة", "العنود", "بدرية", "وضحى", "سلمى"];

describe("naming the mothers of half-siblings", () => {
  const fixture = multiMarriageFamily();
  let k = 0;
  const tree = { ...fixture, members: fixture.members.map((m) => (m.name.startsWith("زوجة") ? { ...m, name: NAMES[k++ % NAMES.length] } : m)) };
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
        const [word, ...name] = n.subLabel!.split(" ");
        expect(word).toBe(m.gender === "FEMALE" ? "أمها" : "أمه");
        expect(byId.get(m.motherId!)!.name.startsWith(name.join(" "))).toBe(true);
      } else {
        expect(n.subLabel ?? "").not.toMatch(/^أم/);
      }
    }
    expect(named).toBeGreaterThan(20);
    // her own name, without her father's ("فاطمة" for "فاطمة بنت سعد")
    const hamadKids = l.nodes.filter((n) => byId.get(n.member.fatherId ?? "")?.name === "حمد");
    expect(new Set(hamadKids.map((n) => n.subLabel?.replace(/^أمها? /, "")))).toEqual(new Set(["فاطمة", "عائشة", "خديجة"]));
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

  it("keeps the full names when two wives share a first name", () => {
    const same = { ...withNames, members: withNames.members.map((m) => (m.name === "عائشة بنت علي" ? { ...m, name: "فاطمة بنت علي" } : m)) };
    const l = computePosterLayout(same, opts(same));
    const subs = new Set(l.nodes.filter((n) => byId.get(n.member.fatherId ?? "")?.name === "حمد").map((n) => n.subLabel?.replace(/^أمها? /, "")));
    expect(subs).toEqual(new Set(["فاطمة بنت سعد", "فاطمة بنت علي", "خديجة"]));
  });

  it("writes it in English for English names", () => {
    const en = { ...withNames, members: withNames.members.map((m, i) => ({ ...m, name: `Person ${i}` })) };
    const l = computePosterLayout(en, opts(en));
    const kid = l.nodes.find((n) => n.member.fatherId && wivesOf(n.member.fatherId).size > 1)!;
    expect(kid.subLabel).toBe(`mother: Person ${en.members.findIndex((m) => m.id === kid.member.motherId)}`);
  });
});
