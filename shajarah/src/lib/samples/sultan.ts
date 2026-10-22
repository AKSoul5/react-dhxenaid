// The Sultan: one founder with 40 sons, each with 5 sons (241 people, three
// generations). A stress test of extreme fan-out: the widest family a
// single canopy ring can be asked to carry.
import { computeGenerations } from "../genealogy";
import type { MemberDTO, TreeDTO } from "../types";

export function generateSultanTree(): TreeDTO {
  const members: MemberDTO[] = [];
  let counter = 0;

  const add = (name: string, fatherId: string | null, order: number) => {
    const m: MemberDTO = {
      id: `sultan-${++counter}`,
      name,
      laqab: null,
      gender: "MALE",
      birthYear: null,
      deathYear: null,
      isDeceased: false,
      birthOrder: order,
      generation: 0,
      notes: null,
      fatherId,
      motherId: null,
    };
    members.push(m);
    return m;
  };

  // Gen 0: The Sultan
  const root = add("السلطان", null, 0);

  // Gen 1: 40 Children
  const children: MemberDTO[] = [];
  for (let i = 0; i < 40; i++) {
    children.push(add(`الابن ${i + 1}`, root.id, i));
  }

  // Gen 2: 200 Grandchildren (5 per child)
  for (const [i, child] of children.entries()) {
    for (let j = 0; j < 5; j++) {
      add(`الحفيد ${i + 1}.${j + 1}`, child.id, j);
    }
  }

  const gens = computeGenerations(members, "PATRILINEAL");
  for (const m of members) m.generation = gens.get(m.id) ?? 0;

  return {
    id: "sultan",
    name: "عائلة السلطان",
    title: "شجرة عائلة السلطان (اختبار التحمل)",
    subtitle: "٤٠ ابنًا و ٢٠٠ حفيد",
    lineage: "PATRILINEAL",
    rootMemberId: root.id,
    crownBaseId: root.id, // The root is the canopy base
    trunkStartId: null,
    soilText: null,
    settings: { showFemales: false, seed: 7 },
    members,
    marriages: [],
    sources: [],
    citations: [],
    media: [],
  };
}
