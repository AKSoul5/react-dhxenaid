import { describe, expect, it } from "vitest";
import { computePosterLayout } from "@/lib/layout/botanical";
import { layoutOptionsFor, resolveTheme } from "@/lib/theme";
import { nouriFamily } from "@/lib/samples/nouri";
import type { TreeDTO } from "@/lib/types";

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

  it("is not drawn unless chosen", () => {
    const l = computePosterLayout(tree, opts);
    expect(l.nodes.some((n) => theirs.has(n.member.id))).toBe(false);
    expect(l.branches.some((b) => b.dotted)).toBe(false);
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
    expect(l.branches.filter((b) => b.dotted)).toHaveLength(theirs.size);
    expect(l.clarity.issues).toEqual([]);
    expect(l.overlaps).toBe(0);
    // the husbands are not people of the lineage: named with their wives, not drawn
    const hassan = tree.members.find((m) => m.name === "Hassan" && !m.fatherId)!;
    expect(drawn.has(hassan.id)).toBe(false);
    expect(l.nodes.find((n) => n.member.id === amina.id)!.subLabel).toBe("m. Hassan");
    // generations count through her: Ibrahim 0, Amina 1, her children 2
    const yusuf = l.nodes.find((n) => n.member.name === "Yusuf" && n.parentId === amina.id)!;
    expect(yusuf.generation).toBe(2);
    expect(l.stats.unplaced).toBe(computePosterLayout(tree, opts).stats.unplaced - 11);
  });

  it("shows her family even when daughters are hidden", () => {
    const l = computePosterLayout(throughHer(tree, [amina.id]), { ...opts, showFemales: false });
    const drawn = new Set(l.nodes.map((n) => n.member.id));
    expect(drawn.has(amina.id)).toBe(true);
    expect(drawn.has(layla.id)).toBe(false);
    expect(l.nodes.some((n) => n.parentId === amina.id)).toBe(true);
    expect(l.clarity.issues).toEqual([]);
  });

  it("a mother with children from two husbands: grouped by father, each child naming his father", () => {
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
    expect(kids.find((k) => k.member.name === "Rania")!.subLabel).toBe("daughter of Fahd Al-Otaibi");
    expect(kids.find((k) => k.member.name === "Yusuf")!.subLabel).toBe("son of Hassan");
    expect(kids.find((k) => k.member.name === "Hamza")!.subLabel).toBe("son of Hassan");
    // no single husband on her own label
    expect(l.nodes.find((n) => n.member.id === amina.id)!.subLabel ?? null).toBeNull();
    // the two husbands' children side by side, not interleaved
    const order = [...kids].sort((a, b) => (a.ray ?? 0) - (b.ray ?? 0)).map((k) => k.member.name);
    expect(Math.abs(order.indexOf("Yusuf") - order.indexOf("Hamza"))).toBe(1);
    expect(l.clarity.issues).toEqual([]);
    expect(l.branches.filter((b) => b.dotted).length).toBe(7);
  });
});
