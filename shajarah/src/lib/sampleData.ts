// Deterministic sample family used by the database seed and the /demo page.
// The trunk mirrors the attached example poster: نصار بن ثويني بن فارس بن كنعان
// بن فاضل بن حمود بن غزي بن سعد بن قشعم, with five sons forming the main limbs.

import { computeGenerations } from "./genealogy";
import { mulberry32 } from "./layout/random";
import type { MemberDTO, TreeDTO } from "./types";

const MALE_NAMES = [
  "محمد", "عبدالله", "عبدالرحمن", "عبدالعزيز", "سليمان", "إبراهيم", "صالح", "فهد",
  "سعد", "ناصر", "خالد", "فيصل", "سلطان", "تركي", "بندر", "منصور", "حمد", "علي",
  "عمر", "يوسف", "أحمد", "زيد", "راشد", "مساعد", "عثمان", "حمود", "مشعل", "نايف",
  "سعود", "ماجد", "طلال", "بدر", "عادل", "وليد", "مسفر", "فايز", "غازي", "هزاع",
  "ثامر", "رياض", "عبدالمحسن", "عبدالكريم", "عبدالإله", "مبارك", "متعب", "حسن",
];
const FEMALE_NAMES = [
  "نورة", "سارة", "هيا", "منيرة", "لطيفة", "الجوهرة", "مها", "ريم", "العنود",
  "حصة", "موضي", "لولوة", "دلال", "أمل", "هند", "شيخة", "رقية", "فاطمة",
];

const TRUNK = ["قشعم", "سعد", "غزي", "حمود", "فاضل", "كنعان", "فارس", "ثويني", "نصار"];
const LIMBS = ["عبدالله", "سليمان", "عبدالعزيز", "مسفر", "فايز"];

export function generateSampleTree(seed = 11, targetSize = 320): TreeDTO {
  const rand = mulberry32(seed);
  const members: MemberDTO[] = [];
  let counter = 0;
  const add = (
    name: string, gender: "MALE" | "FEMALE", fatherId: string | null, birthYear: number | null, order: number,
  ): MemberDTO => {
    const m: MemberDTO = {
      id: `m${++counter}`, name, laqab: null, gender, birthYear,
      deathYear: null, isDeceased: birthYear !== null && birthYear < 1950,
      birthOrder: order, generation: 0, notes: null, fatherId, motherId: null,
    };
    members.push(m);
    return m;
  };

  // Ancestral chain (years are illustrative)
  let parent: MemberDTO | null = null;
  TRUNK.forEach((name, i) => {
    parent = add(name, "MALE", parent?.id ?? null, null, 0);
    if (i === 0) {
      // childless brothers drawn as stubs on the trunk, like غانم and قتيبع
      add("غانم", "MALE", parent.id, null, 1);
      add("قتيبع", "MALE", parent.id, null, 2);
    }
  });
  const nassar = parent!;

  const limbs = LIMBS.map((n, i) => add(n, "MALE", nassar.id, 1790 + i * 4, i));
  // Grow each limb breadth-first so all limbs get a fair share of members.
  const queue: { m: MemberDTO; depth: number }[] = limbs.map((m) => ({ m, depth: 1 }));
  const weights = [1.3, 1.1, 1.0, 0.8, 0.6];
  while (queue.length && members.length < targetSize) {
    const { m, depth } = queue.shift()!;
    if (depth >= 7) continue;
    const limbIndex = limbs.findIndex((l) => isDescendantOrSelf(members, l.id, m.id));
    const fertility = (weights[limbIndex] ?? 1) * (depth < 3 ? 1.4 : 1);
    const sons = Math.max(0, Math.round((rand() * 3.2 + (depth < 2 ? 1.5 : 0)) * fertility - 0.6));
    const daughters = Math.round(rand() * 2.2);
    const by = (m.birthYear ?? 1800) + 24 + Math.floor(rand() * 10);
    const used = new Set<string>();
    for (let i = 0; i < sons + daughters; i++) {
      const female = i >= sons;
      const pool = female ? FEMALE_NAMES : MALE_NAMES;
      let name = pool[Math.floor(rand() * pool.length)];
      for (let g = 0; used.has(name) && g < 5; g++) name = pool[Math.floor(rand() * pool.length)];
      used.add(name);
      const child = add(name, female ? "FEMALE" : "MALE", m.id, by + i * 2, i);
      if (!female) queue.push({ m: child, depth: depth + 1 });
    }
  }

  const gens = computeGenerations(members, "PATRILINEAL");
  for (const m of members) m.generation = gens.get(m.id) ?? 0;

  return {
    id: "demo",
    name: "آل نصار",
    title: "شجرة توضيحية لنسب أبناء نصار بن ثويني بن فارس",
    subtitle: "نموذج تجريبي — بيانات افتراضية",
    lineage: "PATRILINEAL",
    rootMemberId: members[0].id,
    crownBaseId: null,
    trunkStartId: null,
    soilText: null,
    settings: { showFemales: false, seed: 7 },
    members,
    marriages: [],
  };
}

function isDescendantOrSelf(members: MemberDTO[], ancestorId: string, id: string) {
  const byId = new Map(members.map((m) => [m.id, m]));
  let cur = byId.get(id);
  while (cur) {
    if (cur.id === ancestorId) return true;
    cur = cur.fatherId ? byId.get(cur.fatherId) : undefined;
  }
  return false;
}
