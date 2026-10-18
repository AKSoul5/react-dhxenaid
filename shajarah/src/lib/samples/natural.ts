// A natural, balanced family of an exact size, for stress tests and demos:
// the founder has a large family (7 children) and one grandson another
// (6), most men have 2–4 children in the early generations and 0–2 later,
// many lines end, and each man passes his share of the family on to his
// sons about evenly, so no branch explodes while its brothers have two.
// Grown somewhat larger than asked, then the youngest childless people of
// the largest branches are removed until exactly `size` remain.

import { computeGenerations } from "../genealogy";
import { mulberry32 } from "../layout/random";
import type { MemberDTO, TreeDTO } from "../types";

const SONS = [
  "محمد", "أحمد", "عبدالله", "عبدالرحمن", "علي", "حسن", "حسين", "عمر", "خالد", "سعد", "فهد", "سلطان", "ناصر", "فيصل",
  "تركي", "بدر", "مشعل", "سليمان", "يوسف", "إبراهيم", "صالح", "منصور", "راشد", "ماجد", "حمد", "عثمان", "عبدالعزيز", "سعود",
];
const DAUGHTERS = ["فاطمة", "عائشة", "مريم", "نورة", "سارة", "هند", "خديجة", "لطيفة", "ريم", "مها", "حصة", "منيرة"];

export function naturalFamily(size = 350, seed = 23): TreeDTO {
  for (let headroom = 1.4; ; headroom += 0.2) {
    const members = grow(Math.round(size * headroom), seed);
    if (members.length >= size || headroom > 4) return finish(trim(members, size), size);
  }
}

function grow(budget: number, seed: number): MemberDTO[] {
  const rand = mulberry32(seed);
  const between = (lo: number, hi: number) => lo + Math.floor(rand() * (hi - lo + 1));
  const members: MemberDTO[] = [];
  let n = 0;
  const add = (name: string, female: boolean, fatherId: string | null, order: number) => {
    const m: MemberDTO = {
      id: `nat-${++n}`, name, laqab: null, gender: female ? "FEMALE" : "MALE", birthYear: null, deathYear: null,
      isDeceased: false, birthOrder: order, generation: 0, notes: null, fatherId, motherId: null,
    };
    members.push(m);
    return m;
  };
  // one grandson of the founder also has a large family
  let bigGrandson: string | null = null;
  const visit = (father: MemberDTO, d: number, share: number) => {
    if (d >= 7 || share < 1) return;
    // later on, a man with a large share of the family still has 2–3 children
    const late = share >= 8 ? between(2, 3) : rand() < 0.35 ? 0 : between(1, 2);
    let count = d === 0 ? 7 : d === 1 ? between(2, 4) : d === 2 ? between(1, 3) : late;
    if (d === 2 && !bigGrandson && rand() < 0.3) {
      bigGrandson = father.id;
      count = 6;
    }
    count = Math.min(count, Math.max(1, Math.floor(share)));
    if (share >= 4) count = Math.max(count, 1);
    const used = new Set<string>();
    const kids: MemberDTO[] = [];
    for (let i = 0; i < count; i++) {
      const female = i > 0 && rand() < 0.2;
      const pool = female ? DAUGHTERS : SONS;
      let name = pool[Math.floor(rand() * pool.length)];
      for (let k = 0; used.has(name) && k < pool.length; k++) name = pool[(pool.indexOf(name) + 1) % pool.length];
      used.add(name);
      kids.push(add(name, female, father.id, i));
    }
    // the rest of his share to his sons, about evenly
    const sons = kids.filter((k) => k.gender === "MALE");
    const jitter = sons.map(() => 0.75 + rand() * 0.5);
    const sum = jitter.reduce((a, b) => a + b, 0) || 1;
    const rest = Math.max(0, share - kids.length);
    sons.forEach((k, i) => visit(k, d + 1, (rest * jitter[i]) / sum));
  };
  visit(add("عبدالله", false, null, 0), 0, budget - 1);
  return members;
}

/** Removes the youngest childless people of the largest branches until `size` remain. */
function trim(members: MemberDTO[], size: number): MemberDTO[] {
  let list = [...members];
  const gens = computeGenerations(list, "PATRILINEAL");
  const root = list[0];
  const branchOf = (m: MemberDTO): string => {
    let cur = m;
    while (cur.fatherId && cur.fatherId !== root.id) cur = list.find((x) => x.id === cur.fatherId)!;
    return cur.id;
  };
  while (list.length > size) {
    const parents = new Set(list.map((m) => m.fatherId));
    const branchSize = new Map<string, number>();
    for (const m of list) if (m !== root) branchSize.set(branchOf(m), (branchSize.get(branchOf(m)) ?? 0) + 1);
    const leaves = list.filter((m) => m !== root && !parents.has(m.id));
    leaves.sort((a, b) => (branchSize.get(branchOf(b))! - branchSize.get(branchOf(a))!) || (gens.get(b.id)! - gens.get(a.id)!));
    const out = leaves[0].id;
    list = list.filter((m) => m.id !== out);
  }
  return list;
}

function finish(members: MemberDTO[], size: number): TreeDTO {
  const gens = computeGenerations(members, "PATRILINEAL");
  for (const m of members) m.generation = gens.get(m.id) ?? 0;
  return {
    id: `natural-${size}`, name: "آل عبدالله", title: "شجرة آل عبدالله", subtitle: `أسرة تجريبية من ${size} شخصًا`,
    lineage: "PATRILINEAL", rootMemberId: members[0].id, crownBaseId: null, trunkStartId: null, soilText: null,
    settings: { showFemales: true, seed: 7, theme: {} },
    members, marriages: [], sources: [], citations: [], media: [],
  };
}
