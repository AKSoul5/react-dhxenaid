// Representative families used to validate the poster layout (tests and
// /demo?sample=…): a small three-generation family, a family with several
// marriages and many daughters, and one with long names and honorifics.
// The large family is generateSampleTree(); the long chain is kalaliTree().

import { computeGenerations } from "../genealogy";
import type { Gender, MarriageDTO, MemberDTO, TreeDTO } from "../types";

/** [name, gender, children?, extra?] — a compact way to write a family. */
type Spec = [string, Gender, Spec[]?, { laqab?: string; mother?: string; born?: number; died?: number }?];

function buildTree(
  id: string, title: string, subtitle: string | null, root: Spec,
  wives: { key: string; name: string; husband: string }[] = [],
): TreeDTO {
  const members: MemberDTO[] = [];
  const marriages: MarriageDTO[] = [];
  const keyToId = new Map<string, string>();
  let n = 0;
  const make = (name: string, gender: Gender, fatherId: string | null, order: number, extra: Spec[3] = {}): MemberDTO => {
    const m: MemberDTO = {
      id: `${id}-${++n}`, name, laqab: extra.laqab ?? null, gender,
      birthYear: extra.born ?? null, deathYear: extra.died ?? null, isDeceased: !!extra.died,
      birthOrder: order, generation: 0, notes: null, fatherId, motherId: null,
    };
    members.push(m);
    return m;
  };
  const pendingMothers: [MemberDTO, string][] = [];
  const walk = ([name, gender, kids = [], extra = {}]: Spec, fatherId: string | null, order: number) => {
    const m = make(name, gender, fatherId, order, extra);
    keyToId.set(name, keyToId.get(name) ?? m.id);
    if (extra.mother) pendingMothers.push([m, extra.mother]);
    kids.forEach((k, i) => walk(k, m.id, i));
  };
  walk(root, null, 0);
  for (const w of wives) {
    const wife = make(w.name, "FEMALE", null, 0);
    keyToId.set(w.key, wife.id);
    marriages.push({ id: `${id}-mar-${w.key}`, spouseAId: keyToId.get(w.husband)!, spouseBId: wife.id, startYear: null, endYear: null });
  }
  for (const [m, key] of pendingMothers) m.motherId = keyToId.get(key) ?? null;
  const gens = computeGenerations(members, "PATRILINEAL");
  for (const m of members) m.generation = gens.get(m.id) ?? 0;
  return {
    id, name: title, title, subtitle, lineage: "PATRILINEAL", rootMemberId: members[0].id,
    crownBaseId: null, trunkStartId: null, soilText: null,
    settings: { showFemales: true, seed: 7, theme: {} },
    members, marriages,
  };
}

/** Three generations, eleven people, sons and daughters. */
export function smallFamily(): TreeDTO {
  return buildTree("small", "أسرة صالح بن حمد", "ثلاثة أجيال", ["صالح", "MALE", [
    ["عبدالله", "MALE", [["فيصل", "MALE"], ["سارة", "FEMALE"], ["خالد", "MALE"]]],
    ["نورة", "FEMALE"],
    ["محمد", "MALE", [["يوسف", "MALE"], ["ريم", "FEMALE"], ["عمر", "MALE"]]],
    ["هيا", "FEMALE"],
  ]]);
}

/** A grandfather with two wives, many daughters, four generations. */
export function marriagesFamily(): TreeDTO {
  const w1 = { mother: "w1" }, w2 = { mother: "w2" };
  return buildTree("marriages", "ذرية سعيد بن ناصر", "من زوجتيه فاطمة وعائشة", ["سعيد", "MALE", [
    ["ناصر", "MALE", [
      ["سعيد", "MALE", [["ناصر", "MALE"], ["لطيفة", "FEMALE"], ["حمد", "MALE"]]],
      ["منيرة", "FEMALE"], ["الجوهرة", "FEMALE"],
      ["تركي", "MALE", [["مها", "FEMALE"], ["العنود", "FEMALE"], ["سلطان", "MALE"]]],
    ], w1],
    ["حصة", "FEMALE", [], w1],
    ["موضي", "FEMALE", [], w1],
    ["عبدالعزيز", "MALE", [
      ["فهد", "MALE", [["عبدالعزيز", "MALE"], ["دلال", "FEMALE"]]],
      ["شيخة", "FEMALE"], ["أمل", "FEMALE"], ["هند", "FEMALE"],
    ], w1],
    ["إبراهيم", "MALE", [
      ["بدر", "MALE"], ["رقية", "FEMALE"],
      ["مشعل", "MALE", [["فاطمة", "FEMALE"], ["سعيد", "MALE"], ["عائشة", "FEMALE"]]],
    ], w2],
    ["لولوة", "FEMALE", [], w2],
    ["سليمان", "MALE", [["حمود", "MALE"], ["نورة", "FEMALE"], ["سارة", "FEMALE"], ["ريم", "FEMALE"]], w2],
    ["فاطمة", "FEMALE", [], w2],
  ]], [
    { key: "w1", name: "فاطمة بنت علي", husband: "سعيد" },
    { key: "w2", name: "عائشة بنت حمد", husband: "سعيد" },
  ]);
}

/** Names of very different lengths, compound names, laqabs and honorifics. */
export function namesFamily(): TreeDTO {
  return buildTree("names", "شجرة آل عبد الرحمن الأنصاري", "أسماء وألقاب متنوعة", ["عبد الرحمن", "MALE", [
    ["علي", "MALE", [
      ["عبد المحسن", "MALE", [["زيد", "MALE"], ["عبد الكريم", "MALE"], ["أم كلثوم", "FEMALE"]]],
      ["عمر", "MALE", [["عبد الله الأكبر", "MALE"], ["عبد الله الأصغر", "MALE"]]],
    ], { laqab: "رحمه الله", died: 1950 }],
    ["محمد الأمين", "MALE", [
      ["أبو بكر", "MALE", [["عبد الرحمن", "MALE"], ["صالح", "MALE"], ["عائشة", "FEMALE"]]],
      ["عبد العزيز", "MALE", [["عبد الإله", "MALE", [], { laqab: "الشيخ" }], ["نوف", "FEMALE"]]],
    ], { laqab: "الشيخ" }],
    ["خديجة", "FEMALE"],
    ["سليمان", "MALE", [
      ["حمد", "MALE", [["عبد المجيد", "MALE"], ["مي", "FEMALE"], ["ريما", "FEMALE"]]],
      ["عبد الرحمن", "MALE"],
    ]],
  ], { laqab: "رضي الله عنه" }]);
}
