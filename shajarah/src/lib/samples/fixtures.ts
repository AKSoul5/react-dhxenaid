// Representative families used to validate the poster layout (tests and
// /demo?sample=…): a small three-generation family, a family with several
// marriages and many daughters, and one with long names and honorifics.
// The large family is generateSampleTree(); the long chain is kalaliTree().

import { computeGenerations } from "../genealogy";
import { applyNasabLines } from "../nasab";
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
    members, marriages, sources: [], citations: [], media: [],
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

const SONS = ["محمد", "عبدالله", "عبدالرحمن", "سليمان", "إبراهيم", "صالح", "فهد", "سعد", "ناصر", "خالد", "فيصل", "سلطان", "تركي", "بندر", "منصور", "حمد", "علي", "عمر", "يوسف", "أحمد", "زيد", "راشد"];
const DAUGHTERS = ["نورة", "سارة", "هيا", "منيرة", "لطيفة", "الجوهرة", "مها", "ريم", "العنود", "حصة", "موضي", "لولوة", "دلال", "أمل", "هند"];

function familyFrom(id: string, title: string, subtitle: string, members: MemberDTO[], marriages: MarriageDTO[] = []): TreeDTO {
  const gens = computeGenerations(members, "PATRILINEAL");
  for (const m of members) m.generation = gens.get(m.id) ?? 0;
  return {
    id, name: title, title, subtitle, lineage: "PATRILINEAL", rootMemberId: members[0].id,
    crownBaseId: null, trunkStartId: null, soilText: null,
    settings: { showFemales: true, seed: 7, theme: {} },
    members, marriages, sources: [], citations: [], media: [],
  };
}

/**
 * Deliberately dense: every father has many children (7–11 in the first two
 * generations), so many sibling branches compete for the same space.
 */
export function denseFamily(): TreeDTO {
  const members: MemberDTO[] = [];
  let n = 0, k = 0;
  const add = (gender: Gender, fatherId: string | null, order: number): MemberDTO => {
    const pool = gender === "MALE" ? SONS : DAUGHTERS;
    const m: MemberDTO = {
      id: `dense-${++n}`, name: pool[(k++ * 7) % pool.length], laqab: null, gender, birthYear: null, deathYear: null,
      isDeceased: false, birthOrder: order, generation: 0, notes: null, fatherId, motherId: null,
    };
    members.push(m);
    return m;
  };
  const root = add("MALE", null, 0);
  root.name = "عبدالعزيز";
  const grow = (father: MemberDTO, kids: number, depth: number) => {
    for (let i = 0; i < kids; i++) {
      const daughter = i % 3 === 2;
      const c = add(daughter ? "FEMALE" : "MALE", father.id, i);
      if (!daughter && depth < 3) grow(c, depth === 1 ? 7 + (i % 3) : 2 + (i % 4), depth + 1);
    }
  };
  grow(root, 11, 1);
  return familyFrom("dense", "أسرة كثيفة الفروع", "اختبار وضوح الصلات", members);
}

/**
 * Three wives with children born interleaved (half-siblings alternate by
 * birth order), daughters throughout, and sons who themselves have two
 * wives — so mothers and lines must be kept apart correctly.
 */
const WIVES = ["نورة", "هيا", "منيرة", "لولوة", "حصة", "مضاوي", "شيخة", "بدرية", "وضحى", "سلمى", "جواهر", "مزنة"];
const WIFE_FAMILIES = ["السديري", "الشمري", "المطيري", "الحربي", "الزهراني", "الغامدي", "السبيعي"];

export function multiMarriageFamily(): TreeDTO {
  const members: MemberDTO[] = [];
  const marriages: MarriageDTO[] = [];
  let n = 0, k = 0;
  const add = (name: string, gender: Gender, fatherId: string | null, motherId: string | null, order: number): MemberDTO => {
    const m: MemberDTO = {
      id: `mm-${++n}`, name, laqab: null, gender, birthYear: null, deathYear: null,
      isDeceased: false, birthOrder: order, generation: 0, notes: null, fatherId, motherId,
    };
    members.push(m);
    return m;
  };
  const marry = (husband: MemberDTO, wifeName: string) => {
    const w = add(wifeName, "FEMALE", null, null, 0);
    marriages.push({ id: `mm-mar-${w.id}`, spouseAId: husband.id, spouseBId: w.id, startYear: null, endYear: null });
    return w;
  };
  // wives from other families, by first and family name (or in full)
  let w = 0;
  const wife = () => `${WIVES[w % WIVES.length]} ${WIFE_FAMILIES[w++ % WIFE_FAMILIES.length]}`;
  const root = add("حمد", "MALE", null, null, 0);
  const wives = [marry(root, "فاطمة بنت سعد العتيبي"), marry(root, "عائشة بنت علي القحطاني"), marry(root, "خديجة بنت ناصر الدوسري")];
  // 12 children, mothers interleaved by birth order: 1,2,3,1,2,3,…
  for (let i = 0; i < 12; i++) {
    const daughter = i % 4 === 1;
    const c = add(daughter ? DAUGHTERS[k++ % DAUGHTERS.length] : SONS[k++ % SONS.length], daughter ? "FEMALE" : "MALE", root.id, wives[i % 3].id, i);
    if (daughter) continue;
    // every other son has two wives himself, again interleaved
    const own = i % 2 === 0 ? [marry(c, wife()), marry(c, wife())] : [marry(c, wife())];
    const kids = 3 + (i % 4);
    for (let j = 0; j < kids; j++) {
      const d = j % 3 === 1;
      const g = add(d ? DAUGHTERS[k++ % DAUGHTERS.length] : SONS[k++ % SONS.length], d ? "FEMALE" : "MALE", c.id, own[j % own.length].id, j);
      if (!d && j === 0) for (let q = 0; q < 3; q++) add(SONS[k++ % SONS.length], q === 1 ? "FEMALE" : "MALE", g.id, null, q);
    }
  }
  return familyFrom("multi", "ذرية حمد من زوجاته الثلاث", "أبناء غير أشقاء وبنات", members, marriages);
}

/**
 * A family pasted as nasab lines (as with the editor's "بن…" import): one
 * founder, عبدالله, whose sons have very different families: محمد a large
 * one, سعود and عمر medium ones, خالد sons and daughters. Built by the
 * importer itself, so it also checks that every line joins the one founder.
 */
export const ABDULLAH_NASAB = `عبدالعزيز بن محمد بن عبدالله
سليمان بن محمد بن عبدالله
نورة بنت محمد بن عبدالله
يوسف بن عبدالعزيز بن محمد بن عبدالله
بدر بن عبدالعزيز بن محمد بن عبدالله
سارة بنت عبدالعزيز بن محمد بن عبدالله
ريم بنت عبدالعزيز بن محمد بن عبدالله
فيصل بن سليمان بن محمد بن عبدالله
عمر بن سليمان بن محمد بن عبدالله
هند بنت سليمان بن محمد بن عبدالله
صالح بن عمر بن عبدالله
عبدالرحمن بن عمر بن عبدالله
حمود بن صالح بن عمر بن عبدالله
خالد بن صالح بن عمر بن عبدالله
مها بنت صالح بن عمر بن عبدالله
تركي بن عبدالرحمن بن عمر بن عبدالله
منصور بن عبدالرحمن بن عمر بن عبدالله
فهد بن سعود بن عبدالله
عبدالله بن فهد بن سعود بن عبدالله
هذال بن فهد بن سعود بن عبدالله
ناصر بن فهد بن سعود بن عبدالله
سلطان بن تركي بن سعود بن عبدالله
عبدالعزيز بن تركي بن سعود بن عبدالله
مشعل بن منصور بن سعود بن عبدالله
علي بن خالد بن عبدالله
حسين بن خالد بن عبدالله
فاطمة بنت خالد بن عبدالله
عائشة بنت خالد بن عبدالله`;

export function abdullahFamily(): TreeDTO {
  let n = 0;
  const { members } = applyNasabLines([], "PATRILINEAL", ABDULLAH_NASAB, () => `abdullah-${++n}`);
  return familyFrom("abdullah", "شجرة آل عبدالله", "أسرة تجريبية من نصّ النسب", members);
}

/**
 * A balanced three-branch family pasted as nasab lines: founder شعلان, his
 * sons أحمد، علي and سالم, and two further generations under each. Built by
 * the importer itself, like abdullahFamily().
 */
export const SHAALAN_NASAB = `أحمد بن شعلان
علي بن شعلان
سالم بن شعلان
عبدالله بن أحمد بن شعلان
محمد بن أحمد بن شعلان
حسن بن علي بن شعلان
مبارك بن سالم بن شعلان
فهد بن سالم بن شعلان
عبدالعزيز بن عبدالله بن أحمد بن شعلان
سعود بن عبدالله بن أحمد بن شعلان
نورة بنت عبدالله بن أحمد بن شعلان
فيصل بن محمد بن أحمد بن شعلان
خالد بن محمد بن أحمد بن شعلان
يوسف بن حسن بن علي بن شعلان
عمر بن حسن بن علي بن شعلان
بدر بن مبارك بن سالم بن شعلان
تركي بن مبارك بن سالم بن شعلان
هند بنت مبارك بن سالم بن شعلان`;

export function shaalanFamily(): TreeDTO {
  let n = 0;
  const { members } = applyNasabLines([], "PATRILINEAL", SHAALAN_NASAB, () => `shaalan-${++n}`);
  return familyFrom("shaalan", "شجرة آل شعلان", "أسرة تجريبية من نصّ النسب", members);
}

/**
 * Shaped like a real family that tangled once daughters were shown: a long
 * trunk, then a canopy base with eleven childless sons and daughters, one
 * son with one child, one with four, one with a large family (three sons,
 * nine children each) and one with three. The childless children crowd the
 * first ring and used to push the fathers off their sectors, so their
 * lines crossed the neighbouring families'.
 */
export function crowdedBaseFamily(): TreeDTO {
  const members: MemberDTO[] = [];
  let n = 0;
  const add = (name: string, gender: Gender, fatherId: string | null, order = 0) => {
    const m: MemberDTO = {
      id: `crowded-${++n}`, name, laqab: null, gender, birthYear: null, deathYear: null,
      isDeceased: false, birthOrder: order, generation: 0, notes: null, fatherId, motherId: null,
    };
    members.push(m);
    return m;
  };
  let line = add("عبدكلال", "MALE", null);
  for (const name of ["الحارث", "عبدالله", "أسعد", "محمد", "يحيى", "زكريا", "أسعد", "محمد", "عبدالله", "إبراهيم", "محمد",
    "عبدالرحمن", "عبدالله", "أبو بكر", "إسحاق", "أسعد", "أحمد", "شعلان", "عقيل", "فضل", "رجب", "عقيل", "فضل", "عمر",
    "سالم", "محمد", "عمر", "سالم", "محمد", "علي", "محمد", "مبارك", "سالم"]) line = add(name, "MALE", line.id);
  const base = add("محمد", "MALE", line.id);
  let order = 0;
  for (const name of ["عائشة", "قمر", "بدرية", "حميدة", "رقية"]) add(name, "FEMALE", base.id, order++);
  for (const name of ["نافع", "عبدالله", "عقيل", "فضل", "سالم", "عوض"]) add(name, "MALE", base.id, order++);
  const one = add("حامد", "MALE", base.id, order++);
  add("حيدر", "MALE", one.id);
  const four = add("ناصر", "MALE", base.id, order++);
  ["طلال", "تايف", "محمد", "ممدوح"].forEach((name, i) => add(name, "MALE", four.id, i));
  const large = add("مبارك", "MALE", base.id, order++);
  const kids = [["سارة", "FEMALE"], ["أحمد", "MALE"], ["حمزة", "MALE"], ["ماجدة", "FEMALE"], ["أسعد", "MALE"],
    ["عوض", "MALE"], ["الجوهرة", "FEMALE"], ["سيف", "MALE"], ["نافع", "MALE"]] as const;
  ["سعيد", "خالد", "فهد"].forEach((name, k) => {
    const son = add(name, "MALE", large.id, k);
    kids.forEach(([kid, gender], j) => add(kid, gender, son.id, j));
  });
  const three = add("عبدالمعين", "MALE", base.id, order++);
  ["أسعد", "عبدالمعين", "عوض"].forEach((name, i) => add(name, "MALE", three.id, i));
  const tree = familyFrom("crowded", "شجرة عائلة الكلالي", "أسرة تجريبية", members);
  return { ...tree, crownBaseId: base.id };
}
