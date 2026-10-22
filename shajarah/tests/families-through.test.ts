import { describe, expect, it } from "vitest";
import { computePosterLayout } from "@/lib/layout/botanical";
import { layoutOptionsFor, resolveTheme } from "@/lib/theme";
import { kalaliRealistic150 } from "@/lib/samples/kalali";
import { nouriFamily } from "@/lib/samples/nouri";
import type { MemberDTO, TreeDTO } from "@/lib/types";

// The Al-Nouri test family: Amina's and Layla's children belong to their
// fathers' lines (Hassan, Sami), so a patrilineal poster leaves them out,
// unless their families are shown through them, on dotted lines.
describe("a daughter's family on dotted lines", () => {
  const tree = nouriFamily();
  const byName = (name: string, fatherName = "Ibrahim Al-Nouri") =>
    tree.members.find((m) => m.name === name && tree.members.find((f) => f.id === m.fatherId)?.name === fatherName)!;
  const amina = byName("Amina"), layla = byName("Layla");
  const throughHer = (t: TreeDTO, ids: string[]) => ({ ...t, settings: { ...t.settings, familiesThrough: ids } });
  const descendantsOf = (id: string): string[] => {
    const kids = tree.members.filter((m) => m.motherId === id || m.fatherId === id);
    return kids.flatMap((k) => [k.id, ...descendantsOf(k.id)]);
  };
  const theirs = new Set([...descendantsOf(amina.id), ...descendantsOf(layla.id)]);
  const opts = { ...layoutOptionsFor(resolveTheme(tree.settings), "A2"), showFemales: true };
  // Noura's two children have no father recorded: always drawn from her,
  // on dotted lines (they are not of the line either)
  const NOURA = 2;

  it("is not drawn unless chosen", () => {
    const l = computePosterLayout(tree, opts);
    expect(l.nodes.some((n) => theirs.has(n.member.id))).toBe(false);
    expect(l.branches.filter((b) => b.dotted)).toHaveLength(NOURA);
  });

  it("draws their children and grandchildren from them, every line dotted, and stays clear", () => {
    const l = computePosterLayout(throughHer(tree, [amina.id, layla.id]), opts);
    const drawn = new Set(l.nodes.map((n) => n.member.id));
    expect([...theirs].filter((id) => !drawn.has(id))).toEqual([]);
    expect(theirs.size).toBe(11);
    // from the mother, not the father
    for (const n of l.nodes.filter((x) => tree.members.find((m) => m.id === x.member.id)!.motherId === amina.id)) {
      expect(n.parentId).toBe(amina.id);
    }
    expect(l.clarity.issues).toEqual([]);
    expect(l.overlaps).toBe(0);
    // the husbands are not people of the lineage: each is a cartouche on his
    // wife's dotted line, their children growing from it
    const hassan = tree.members.find((m) => m.name === "Hassan" && !m.fatherId)!;
    expect(drawn.has(hassan.id)).toBe(false);
    const holders = l.spouses.map((s) => [s.label, s.partnerId, s.childIds.length, s.dotted]);
    expect(holders).toEqual(expect.arrayContaining([["Hassan", amina.id, 3, true], ["Sami", layla.id, 2, true]]));
    expect(l.spouses).toHaveLength(2);
    for (const s of l.spouses) {
      expect(l.edges.some((e) => e.parentId === s.partnerId && e.childId === s.id)).toBe(true);
      for (const c of s.childIds) expect(l.edges.some((e) => e.parentId === s.id && e.childId === c)).toBe(true);
    }
    // every line of theirs dotted: to each husband and to each descendant
    expect(l.branches.filter((b) => b.dotted)).toHaveLength(theirs.size + 2 + NOURA);
    expect(l.nodes.find((n) => n.member.id === amina.id)!.subLabel ?? null).toBeNull();
    // generations count through her: Ibrahim 0, Amina 1, her children 2
    const yusuf = l.nodes.find((n) => n.member.name === "Yusuf" && n.parentId === amina.id)!;
    expect(yusuf.generation).toBe(2);
    // (the husbands are drawn too, on their cartouches)
    expect(l.stats.unplaced).toBe(computePosterLayout(tree, opts).stats.unplaced - 11 - 2);
  });

  it("hides her whole line with the daughters (and shows it again with them)", () => {
    const shown = throughHer(tree, [amina.id]);
    // (the people her family adds: her sons and their descendants)
    const without = new Set(computePosterLayout(tree, opts).nodes.map((n) => n.member.id));
    const theirs = new Set(computePosterLayout(shown, opts).nodes.map((n) => n.member.id).filter((id) => !without.has(id)));
    expect(theirs.size).toBeGreaterThan(0);
    const l = computePosterLayout(shown, { ...opts, showFemales: false });
    const drawn = new Set(l.nodes.map((n) => n.member.id));
    expect(drawn.has(amina.id)).toBe(false);
    expect(drawn.has(layla.id)).toBe(false);
    expect([...drawn].filter((id) => theirs.has(id))).toEqual([]); // not her sons, nor theirs
    expect(l.spouses).toHaveLength(0); // nor her husband
    expect(l.familiesThrough).toEqual([]);
    expect(l.clarity.issues).toEqual([]);
    // a poster of her own branch still shows her family
    const hers = computePosterLayout(shown, { ...opts, showFemales: false, focusId: amina.id });
    expect(hers.nodes.some((n) => n.parentId === amina.id)).toBe(true);
  });

  it("a mother with children from two husbands: each husband on her line with his own children", () => {
    // Amina remarried: Rania (born between her brothers) is the daughter of
    // her second husband
    const second = { ...amina, id: "second-husband", name: "Fahd Al-Otaibi", gender: "MALE" as const, fatherId: null, motherId: null, birthOrder: 0 };
    const members = [...tree.members.map((m) => (m.name === "Rania" && m.motherId === amina.id ? { ...m, fatherId: second.id } : m)), second];
    const remarried: TreeDTO = {
      ...tree, members,
      marriages: [...tree.marriages, { id: "m-second", spouseAId: second.id, spouseBId: amina.id, startYear: null, endYear: null }],
    };
    const l = computePosterLayout(throughHer(remarried, [amina.id]), opts);
    const kids = l.nodes.filter((n) => n.parentId === amina.id);
    expect(kids.map((k) => k.member.name).sort()).toEqual(["Hamza", "Rania", "Yusuf"]);
    const byName = (name: string) => kids.find((k) => k.member.name === name)!.id;
    const holder = (label: string) => l.spouses.find((s) => s.label === label)!;
    expect(holder("Fahd Al-Otaibi").childIds).toEqual([byName("Rania")]);
    expect(holder("Hassan").childIds.sort()).toEqual([byName("Hamza"), byName("Yusuf")].sort());
    expect(kids.every((k) => k.subLabel == null)).toBe(true);
    // the two husbands' children side by side, not interleaved
    const order = [...kids].sort((a, b) => a.x - b.x).map((k) => k.member.name);
    expect(Math.abs(order.indexOf("Yusuf") - order.indexOf("Hamza"))).toBe(1);
    expect(l.clarity.issues).toEqual([]);
    expect(l.overlaps).toBe(0);
    expect(l.branches.filter((b) => b.dotted).length).toBe(7 + 2 + NOURA);
  });
});

describe("a daughter's child whose father is not recorded", () => {
  // (he was drawn from her on a solid line, as one of the line, and she
  // turned ivory like the line's fathers)
  it("hangs from her on a dotted line, counted from her, and she keeps her colour", () => {
    const tree = kalaliRealistic150();
    const settings = { ...tree.settings, showFemales: true };
    const options = layoutOptionsFor(resolveTheme(settings), "A1");
    const before = computePosterLayout({ ...tree, settings }, options);
    const her = before.nodes.find((n) => n.member.gender === "FEMALE" && n.terminal && n.depth >= 2)!;
    const son: MemberDTO = { ...her.member, id: "her-son", name: "قصي", gender: "MALE", fatherId: null, motherId: her.member.id, birthOrder: 0 };
    const l = computePosterLayout({ ...tree, settings, members: [...tree.members, son] }, options);
    const mother = l.nodes.find((n) => n.member.id === her.member.id)!;
    const kid = l.nodes.find((n) => n.member.id === son.id)!;
    expect(kid.parentId).toBe(her.member.id);
    expect(mother.terminal).toBe(false);
    expect(mother.childrenOutside).toBe(true);
    expect(kid.generation).toBe(mother.generation + 1);
    expect(l.branches.filter((b) => b.dotted)).toHaveLength(1);
    // a father of the line is still drawn as one
    expect(l.nodes.filter((n) => !n.terminal && n.member.gender === "MALE").every((n) => !n.childrenOutside)).toBe(true);
  });
});
