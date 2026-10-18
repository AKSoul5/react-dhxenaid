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
});
