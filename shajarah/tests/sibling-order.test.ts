// The order of brothers and sisters: the poster follows it (eldest at the
// start of the canopy's sweep, half-siblings together by mother), and moving
// one renumbers them all 0, 1, 2 … so the change always shows.
import { describe, expect, it } from "vitest";
import { moveAmongSiblings, siblingsInOrder } from "@/lib/genealogy";
import { computePosterLayout } from "@/lib/layout/botanical";
import * as F from "@/lib/samples/fixtures";
import type { MemberDTO, TreeDTO } from "@/lib/types";

/** Each parent's children on the poster, in the order of the canopy's sweep. */
function posterOrder(l: ReturnType<typeof computePosterLayout>): Map<string, string[]> {
  const byParent = new Map<string, { id: string; ray: number }[]>();
  for (const n of l.nodes) {
    const ray = (n as { ray?: number }).ray;
    if (n.parentId && ray != null) byParent.set(n.parentId, [...(byParent.get(n.parentId) ?? []), { id: n.id, ray }]);
  }
  return new Map([...byParent].map(([p, kids]) => [p, kids.sort((a, b) => a.ray - b.ray).map((k) => k.id)]));
}

/** Birth order, with half-siblings kept together by mother (in the order the mothers first appear). */
function expected(t: TreeDTO, ids: string[]): string[] {
  const shown = new Set(ids);
  const kids = siblingsInOrder(t.members, t.lineage, ids[0]).filter((m) => shown.has(m.id));
  const mothers = new Map<string | null, number>();
  for (const k of kids) if (!mothers.has(k.motherId)) mothers.set(k.motherId, mothers.size);
  return [...kids].sort((a, b) => mothers.get(a.motherId)! - mothers.get(b.motherId)!).map((m) => m.id);
}

const apply = (t: TreeDTO, changes: { id: string; birthOrder: number }[]): TreeDTO => {
  const by = new Map(changes.map((c) => [c.id, c.birthOrder]));
  return { ...t, members: t.members.map((m): MemberDTO => (by.has(m.id) ? { ...m, birthOrder: by.get(m.id)! } : m)) };
};

describe("the order of brothers and sisters", () => {
  const families: [string, TreeDTO][] = [
    ["small", F.smallFamily()], ["marriages", F.marriagesFamily()], ["dense", F.denseFamily()], ["several marriages", F.multiMarriageFamily()],
  ];
  for (const [name, t] of families) {
    it(`${name}: the poster follows it`, () => {
      const order = posterOrder(computePosterLayout(t, { width: 2400, showFemales: true }));
      expect(order.size).toBeGreaterThan(0);
      for (const ids of order.values()) expect(ids).toEqual(expected(t, ids));
    }, 30_000);
  }

  it("moving the youngest to eldest puts him first on the poster, and back again", () => {
    let t = F.smallFamily();
    const root = t.members[0];
    const kids = () => siblingsInOrder(t.members, t.lineage, t.members.find((m) => m.fatherId === root.id)!.id);
    const youngest = kids().at(-1)!;
    t = apply(t, moveAmongSiblings(t.members, t.lineage, youngest.id, 0));
    expect(kids()[0].id).toBe(youngest.id);
    expect(kids().map((m) => m.birthOrder)).toEqual(kids().map((_, i) => i));
    const order = posterOrder(computePosterLayout(t, { width: 2400, showFemales: true }));
    expect(order.get(root.id)![0]).toBe(youngest.id);
    t = apply(t, moveAmongSiblings(t.members, t.lineage, youngest.id, 99));
    expect(kids().at(-1)!.id).toBe(youngest.id);
  });

  it("tidies repeated numbers (all 0 after an import) into one order, changing only what moves", () => {
    const t = F.smallFamily();
    const root = t.members[0];
    const flat: TreeDTO = { ...t, members: t.members.map((m) => (m.fatherId === root.id ? { ...m, birthOrder: 0 } : m)) };
    const before = siblingsInOrder(flat.members, flat.lineage, flat.members.find((m) => m.fatherId === root.id)!.id);
    const changes = moveAmongSiblings(flat.members, flat.lineage, before[1].id, 1); // (stays where it is)
    expect(changes.map((c) => c.birthOrder).sort()).toEqual(before.slice(1).map((_, i) => i + 1));
    const eldest = siblingsInOrder(t.members, t.lineage, before[0].id)[0];
    expect(moveAmongSiblings(t.members, t.lineage, eldest.id, 0)).toEqual([]); // nothing to change
  });
});
