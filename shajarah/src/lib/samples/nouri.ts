// The Al-Nouri Family — Layout Stress Test. A fictional family written for
// diagnosing the genealogy logic and the poster: a founder with two wives,
// names repeated across branches and generations, daughters whose children
// belong to their husbands' lines, and childless people throughout.
// No dates or other details are recorded: only people and relationships.

import type { Gender, MarriageDTO, MemberDTO, TreeDTO } from "../types";

/** [name, gender, children?] — a blood descendant and their children. */
type Person = [string, Gender, Person[]?];
/** A child of Ibrahim: [name, gender, spouse (or null), children, mother]. */
type Child = { name: string; gender: Gender; mother: "fatimah" | "mariam"; spouse: string | null; children: Person[] };

const M: Gender = "MALE", F: Gender = "FEMALE";

// Generation 2 with their spouses and descendants, exactly as specified.
// Third-generation people with children have no spouse recorded; their
// children's other parent is left unknown rather than invented.
const CHILDREN: Child[] = [
  { name: "Khalid", gender: M, mother: "fatimah", spouse: "Huda", children: [
    ["Abdullah", M, [["Faisal", M], ["Nasser", M], ["Sara", F]]],
    ["Omar", M, [["Khalid", M]]],
    ["Maryam", F],
    ["Noura", F, [["Ibrahim", M], ["Layan", F]]],
    ["Zayd", M],
  ] },
  { name: "Rashid", gender: M, mother: "fatimah", spouse: "Reem", children: [
    ["Khalid", M, [["Abdullah", M], ["Omar", M], ["Fatimah", F]]],
    ["Salma", F],
  ] },
  { name: "Amina", gender: F, mother: "fatimah", spouse: "Hassan", children: [
    ["Yusuf", M, [["Khalid", M], ["Mariam", F]]],
    ["Rania", F],
    // Noor is used for sons and daughters alike: the gender is not given
    ["Hamza", M, [["Abdullah", M], ["Noor", "UNKNOWN"]]],
  ] },
  { name: "Abdullah", gender: M, mother: "mariam", spouse: "Dalia", children: [
    ["Yusuf", M, [["Ibrahim", M]]],
    ["Maryam", F],
    ["Abdullah", M, [["Sami", M], ["Layla", F]]],
  ] },
  { name: "Layla", gender: F, mother: "mariam", spouse: "Sami", children: [
    ["Hamza", M, [["Omar", M], ["Rania", F]]],
    ["Rania", F],
  ] },
];

export function nouriFamily(): TreeDTO {
  const members: MemberDTO[] = [];
  const marriages: MarriageDTO[] = [];
  let n = 0;
  const add = (name: string, gender: Gender, fatherId: string | null, motherId: string | null, order: number, generation: number) => {
    const m: MemberDTO = {
      id: `nouri-${String(++n).padStart(2, "0")}`, name, laqab: null, gender, birthYear: null, deathYear: null,
      isDeceased: false, birthOrder: order, generation, notes: null, fatherId, motherId,
    };
    members.push(m);
    return m;
  };
  // A spouse who married into the family: no parents recorded, and the same
  // generation as their partner.
  const marry = (partner: MemberDTO, name: string, gender: Gender) => {
    const s = add(name, gender, null, null, 0, partner.generation);
    const [a, b] = partner.gender === "FEMALE" ? [s, partner] : [partner, s];
    marriages.push({ id: `nouri-mar-${marriages.length + 1}`, spouseAId: a.id, spouseBId: b.id, startYear: null, endYear: null });
    return s;
  };
  // Children of `parent` (and of `spouse`, when one is recorded).
  const grow = (parent: MemberDTO, spouse: MemberDTO | null, kids: Person[]) => {
    kids.forEach(([name, gender, own = []], i) => {
      const father = parent.gender === "FEMALE" ? spouse : parent;
      const mother = parent.gender === "FEMALE" ? parent : spouse;
      const c = add(name, gender, father?.id ?? null, mother?.id ?? null, i, parent.generation + 1);
      grow(c, null, own);
    });
  };

  const ibrahim = add("Ibrahim Al-Nouri", M, null, null, 0, 0);
  const wives = {
    fatimah: marry(ibrahim, "Fatimah bint Hassan", F),
    mariam: marry(ibrahim, "Mariam bint Saleh", F),
  };
  CHILDREN.forEach((c, i) => {
    const child = add(c.name, c.gender, ibrahim.id, wives[c.mother].id, i, 1);
    const spouse = c.spouse ? marry(child, c.spouse, c.gender === "FEMALE" ? M : F) : null;
    grow(child, spouse, c.children);
  });

  return {
    id: "nouri", name: "The Al-Nouri Family — Layout Stress Test",
    title: "The Al-Nouri Family — Layout Stress Test", subtitle: "Fictional test family",
    lineage: "PATRILINEAL", rootMemberId: ibrahim.id, crownBaseId: null, trunkStartId: null, soilText: null,
    settings: { showFemales: true, seed: 7, theme: {} },
    members, marriages, sources: [], citations: [], media: [],
  };
}
