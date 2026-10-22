// Hiding a person from the poster: they and all their descendants, through
// either parent (a mother's children by every husband), are left off; the
// family's data is untouched, and nobody the tree stands on can be hidden.
import { describe, expect, it } from "vitest";
import { hiddenFromPoster, withAncestors } from "@/lib/genealogy";
import { computePosterLayout } from "@/lib/layout/botanical";
import { smallFamily } from "@/lib/samples/fixtures";
import type { MemberDTO, TreeDTO } from "@/lib/types";

/** smallFamily with نورة married twice: a son by each husband, a grandson, and a son with no father recorded. */
function withRemarriedDaughter(): TreeDTO {
  const t = smallFamily();
  const noura = t.members.find((m) => m.name === "نورة")!;
  const p = (id: string, name: string, over: Partial<MemberDTO>): MemberDTO => ({ ...t.members[0], id, name, laqab: null, birthOrder: 0, fatherId: null, motherId: null, ...over });
  const members = [
    ...t.members,
    p("h1", "سعد العتيبي", {}), p("h2", "فهد الشمري", {}),
    p("s1", "خالد العتيبي", { fatherId: "h1", motherId: noura.id }),
    p("s2", "ماجد الشمري", { fatherId: "h2", motherId: noura.id }),
    p("g1", "تركي", { fatherId: "s2" }),
    p("s3", "يوسف", { motherId: noura.id }),
  ];
  return {
    ...t, members,
    marriages: [...t.marriages, { id: "x1", spouseAId: noura.id, spouseBId: "h1", startYear: null, endYear: null }, { id: "x2", spouseAId: noura.id, spouseBId: "h2", startYear: null, endYear: null }],
    settings: { ...t.settings, showFemales: true, familiesThrough: [noura.id] },
  };
}

describe("hiding a person from the poster", () => {
  const tree = withRemarriedDaughter();
  const noura = tree.members.find((m) => m.name === "نورة")!;
  const drawn = (l: ReturnType<typeof computePosterLayout>) => new Set([...l.nodes, ...l.stubs].map((n) => n.member.id).concat(l.spouses.map((s) => s.member.id)));

  it("takes her children by every husband and their descendants with her", () => {
    // (and the husbands who married in only through her)
    expect([...hiddenFromPoster(tree.members, [noura.id], new Set(), tree.marriages)].sort()).toEqual([noura.id, "g1", "h1", "h2", "s1", "s2", "s3"].sort());
    // a husband with a family of his own in the tree stays
    const own = tree.members.map((m) => (m.id === "h1" ? { ...m, fatherId: tree.members[0].id } : m));
    expect(hiddenFromPoster(own, [noura.id], new Set(), tree.marriages).has("h1")).toBe(false);
  });

  it("leaves her and her line off the poster, and brings them back when shown again", () => {
    const shown = computePosterLayout(tree, { width: 2400 });
    for (const id of [noura.id, "s1", "s2", "s3", "g1"]) expect(drawn(shown).has(id)).toBe(true);
    const settings = { ...tree.settings, hiddenIds: [noura.id] };
    const l = computePosterLayout({ ...tree, settings }, { width: 2400 });
    for (const id of [noura.id, "s1", "s2", "s3", "g1", "h1", "h2"]) expect(drawn(l).has(id), id).toBe(false);
    // her brothers' families are all still there
    expect(drawn(l).has(tree.members.find((m) => m.name === "يوسف" && m.fatherId)!.id)).toBe(true);
    expect(l.clarity.issues).toEqual([]);
    // not counted as part of the poster, nor reported as unconnected
    expect(l.stats.total).toBe(shown.stats.total - 7);
    expect(l.stats.unplaced).toBeLessThanOrEqual(shown.stats.unplaced);
    expect(l.familiesThrough).toEqual([]);
  });

  it("never hides anyone the tree stands on", () => {
    const root = tree.members[0];
    const l = computePosterLayout({ ...tree, settings: { ...tree.settings, hiddenIds: [root.id] } }, { width: 2400 });
    expect(l.nodes.length).toBe(computePosterLayout(tree, { width: 2400 }).nodes.length);
    // nor what is reached only through them (a hidden root's family stays)
    const keep = withAncestors(tree.members, [root.id]);
    expect(hiddenFromPoster(tree.members, [root.id], keep).size).toBe(0);
  });
});
