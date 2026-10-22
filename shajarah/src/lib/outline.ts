// A family outline: the whole family as plain text, one person per line,
// indented under their parent. Easy to read, to write by hand, to send in a
// message, and to read back in (it is imported through the GEDCOM import,
// with its preview and undo).
//
//   عقيل
//     فضل | wife: فاطمة بنت سعد العتيبي; عائشة القحطاني
//       محمد | mother: فاطمة بنت سعد العتيبي | born: 1950
//       سارة (F) | mother: عائشة القحطاني | husband: سعد الشمري
//         قصي | father: سعد الشمري
//
// - Two spaces of indent per generation: a person is the child of the
//   nearest line above with less indent. (A tab counts as two spaces.)
// - "(F)" or "♀" after the name: a woman ("(M)"/"♂" a man, "(?)" not
//   known; men by default). "(بنت)" / "(ابن)" work too.
// - After " | ", details: wife / husband / spouse (several with ";"),
//   mother / father (the child's other parent, by name: one of the parent's
//   spouses, or someone new), born, died, laqab, note. Arabic keys work
//   too (زوجة، زوج، أم، أب، مواليد، وفاة، لقب، ملاحظة).
// - Under a woman, her children (a daughter's family: "father:" names
//   their father). Under a man, his.
// - "#7" after a name labels that person; "#7" in place of a name refers
//   to them (a cousin who married into the line is one person, not two).
// - Lines starting with "#" are comments.

import { lineageParentId } from "./genealogy";
import type { Gender, MarriageDTO, MemberDTO, TreeDTO } from "./types";

export const OUTLINE_EXTENSION = ".txt";

const INDENT = "  ";

/** The family as an outline (see the top of this file). */
export function exportOutline(tree: Pick<TreeDTO, "name" | "title" | "lineage" | "rootMemberId" | "members" | "marriages">, now = new Date()): string {
  const byId = new Map(tree.members.map((m) => [m.id, m]));
  // someone on a line of their own: with a parent, or the tree's root
  const attached = (m: MemberDTO | undefined) => !!m && (!!m.fatherId || !!m.motherId || m.id === tree.rootMemberId);
  // the line a person is written under: the lineage parent, unless that
  // parent is only a spouse from outside (a daughter's husband): then the
  // other parent, who is of the family
  const parentOf = (m: MemberDTO): string | null => {
    const line = lineageParentId(m, tree.lineage);
    const other = line === m.fatherId ? m.motherId : m.fatherId;
    if (line && attached(byId.get(line))) return line;
    if (other && attached(byId.get(other))) return other;
    return line ?? other ?? null;
  };
  const children = new Map<string | null, MemberDTO[]>();
  for (const m of tree.members) {
    const p = parentOf(m);
    children.set(p, [...(children.get(p) ?? []), m]);
  }
  for (const list of children.values()) list.sort((a, b) => a.birthOrder - b.birthOrder || (a.birthYear ?? 0) - (b.birthYear ?? 0));
  const spousesOf = (id: string) => tree.marriages
    .filter((x) => x.spouseAId === id || x.spouseBId === id)
    .map((x) => (x.spouseAId === id ? x.spouseBId : x.spouseAId));
  // who has a line: everyone reached from the tops (people with no parent
  // who have children or no spouse; a parentless spouse is written with
  // their partner instead)
  const tops = (children.get(null) ?? []).filter((m) => m.id === tree.rootMemberId || children.has(m.id) || !spousesOf(m.id).length);
  tops.sort((a, b) => (a.id === tree.rootMemberId ? -1 : b.id === tree.rootMemberId ? 1 : 0));
  const hasLine = new Set<string>();
  const visit = (m: MemberDTO) => {
    if (hasLine.has(m.id)) return;
    hasLine.add(m.id);
    for (const c of children.get(m.id) ?? []) visit(c);
  };
  tops.forEach(visit);
  // labels: for people with a line who are named elsewhere, and for
  // spouses named under more than one person
  const named = new Map<string, Set<string>>();
  const mention = (id: string, by: string) => named.set(id, (named.get(id) ?? new Set()).add(by));
  for (const id of hasLine) {
    for (const s of spousesOf(id)) mention(s, id);
    const m = byId.get(id)!;
    const p = parentOf(m);
    const other = p === m.fatherId ? m.motherId : m.fatherId;
    if (other) mention(other, p ?? id);
  }
  const tag = new Map<string, number>();
  for (const [id, by] of named) if (hasLine.has(id) || by.size > 1) tag.set(id, tag.size + 1);
  const defined = new Set<string>();
  const ref = (id: string) => {
    const m = byId.get(id);
    if (!m) return "";
    const t = tag.get(id);
    if (!t) return m.name;
    // an outsider's label is given where they are first named
    if (hasLine.has(id) || defined.has(id)) return `#${t}`;
    defined.add(id);
    return `${m.name} #${t}`;
  };

  // an Arabic family's outline is written with Arabic marks and keys, so
  // it reads in order in a right-to-left text editor
  const arabic = tree.members.filter((m) => ARABIC.test(m.name)).length * 2 > tree.members.length;
  const word = arabic ? AR : EN;
  const lines: string[] = [];
  const write = (m: MemberDTO, depth: number) => {
    let head = m.name;
    if (m.gender === "FEMALE") head += ` ${word.female}`;
    else if (m.gender === "UNKNOWN") head += ` ${word.unknown}`;
    if (tag.has(m.id)) head += ` #${tag.get(m.id)}`;
    const fields: string[] = [];
    const p = parentOf(m);
    const other = p === m.fatherId ? m.motherId : m.fatherId;
    if (p && other) fields.push(`${other === m.motherId ? word.mother : word.father}: ${ref(other)}`);
    const sp = spousesOf(m.id);
    if (sp.length) {
      const genders = new Set(sp.map((s) => byId.get(s)?.gender));
      const key = genders.size === 1 && genders.has("FEMALE") ? word.wife : genders.size === 1 && genders.has("MALE") ? word.husband : word.spouse;
      fields.push(`${key}: ${sp.map(ref).filter(Boolean).join("; ")}`);
    }
    if (m.laqab) fields.push(`${word.laqab}: ${m.laqab}`);
    if (m.birthYear != null) fields.push(`${word.born}: ${m.birthYear}`);
    if (m.deathYear != null) fields.push(`${word.died}: ${m.deathYear}`);
    else if (m.isDeceased) fields.push(`${word.died}: ?`);
    if (m.notes) fields.push(`${word.note}: ${m.notes.replace(/\s*\n\s*/g, " ")}`);
    lines.push(INDENT.repeat(depth) + [head, ...fields].join(" | "));
    for (const c of children.get(m.id) ?? []) write(c, depth + 1);
  };
  tops.forEach((t) => write(t, 0));
  // anyone not reached (a separate family recorded alongside): at the end
  const rest = tree.members.filter((m) => !hasLine.has(m.id) && !named.has(m.id));
  rest.forEach((m) => write(m, 0));

  return [
    "# Shajarah family outline",
    `# Family: ${tree.name}${tree.title && tree.title !== tree.name ? ` · ${tree.title}` : ""}`,
    `# Lineage: ${tree.lineage === "MATRILINEAL" ? "matrilineal" : "patrilineal"} · ${tree.members.length} people · ${now.toISOString().slice(0, 10)}`,
    "#",
    "# One person per line, two spaces of indent per generation, under their parent.",
    ...(arabic ? [
      "# (بنت) امرأة، (؟) غير معروف (والرجال بلا علامة). بعد \" | \": زوجة / زوج (وأكثر من واحد بـ \";\")،",
      "# أم / أب (الوالد الآخر)، مواليد، وفاة، لقب، ملاحظة. و #7 علامة لشخص يُذكر مرتين.",
    ] : [
      "# (F) a woman, (?) not known (men by default). After \" | \": wife / husband (several with \";\"),",
      "# mother / father (the child's other parent), born, died, laqab, note. #7 labels someone named twice.",
    ]),
    "",
    ...lines,
    "",
  ].join("\n");
}

const ARABIC = /[\u0600-\u06FF]/;
const EN = { female: "(F)", unknown: "(?)", wife: "wife", husband: "husband", spouse: "spouse", mother: "mother", father: "father", born: "born", died: "died", laqab: "laqab", note: "note" };
const AR = { female: "(بنت)", unknown: "(؟)", wife: "زوجة", husband: "زوج", spouse: "زوج", mother: "أم", father: "أب", born: "مواليد", died: "وفاة", laqab: "لقب", note: "ملاحظة" };

const KEYS: Record<string, "spouse" | "mother" | "father" | "born" | "died" | "laqab" | "note"> = {
  wife: "spouse", wives: "spouse", husband: "spouse", husbands: "spouse", spouse: "spouse", spouses: "spouse",
  "زوجة": "spouse", "زوجات": "spouse", "زوجاته": "spouse", "زوج": "spouse", "زوجها": "spouse", "زوجته": "spouse",
  mother: "mother", "أم": "mother", "ام": "mother", "الأم": "mother", "أمه": "mother", "أمها": "mother",
  father: "father", "أب": "father", "اب": "father", "الأب": "father", "أبوه": "father", "أبوها": "father",
  born: "born", birth: "born", b: "born", "مواليد": "born", "ولد": "born", "ولادة": "born",
  died: "died", death: "died", d: "died", "توفي": "died", "وفاة": "died", "الوفاة": "died",
  laqab: "laqab", nickname: "laqab", "لقب": "laqab", "اللقب": "laqab",
  note: "note", notes: "note", "ملاحظة": "note", "ملاحظات": "note",
};

export interface OutlineFamily {
  members: MemberDTO[];
  marriages: MarriageDTO[];
  /** The first top-level person (the root of the trunk). */
  rootMemberId: string | null;
  warnings: string[];
}

/**
 * Whether a text is a family outline rather than a GEDCOM file: names on
 * short lines, nothing of a GEDCOM record, nor of code or markup (a JSON
 * project file or a web page is reported as not GEDCOM, not read as names).
 */
export function looksLikeOutline(text: string): boolean {
  if (/^﻿?\s*0\s+(HEAD|@)/m.test(text)) return false;
  const rows = text.split(/\r?\n/).filter((l) => l.trim() && !l.trim().startsWith("#"));
  // (a line's length without its indent: a lineage down from آدم is
  // indented 170 spaces and more)
  return rows.length > 0 && rows.every((l) => l.trim().length <= 500 && !/[{}<>=]/.test(l));
}

const year = (v: string): number | null => {
  const western = v.replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));
  const m = western.match(/\d{3,4}/);
  return m ? Number(m[0]) : null;
};

/** Reads a family outline (see the top of this file) into people and marriages. */
export function parseOutline(text: string): OutlineFamily {
  const warnings: string[] = [];
  const members: MemberDTO[] = [];
  const marriages: MarriageDTO[] = [];
  let n = 0;
  const person = (name: string, gender: Gender): MemberDTO => {
    const m: MemberDTO = {
      id: `outline-${++n}`, name, laqab: null, gender, birthYear: null, deathYear: null, isDeceased: false,
      birthOrder: 0, generation: 0, notes: null, fatherId: null, motherId: null,
    };
    members.push(m);
    return m;
  };
  const spouses = new Map<string, MemberDTO[]>();
  const marry = (a: MemberDTO, b: MemberDTO) => {
    if ((spouses.get(a.id) ?? []).includes(b)) return;
    spouses.set(a.id, [...(spouses.get(a.id) ?? []), b]);
    spouses.set(b.id, [...(spouses.get(b.id) ?? []), a]);
    const [h, w] = a.gender === "FEMALE" ? [b, a] : [a, b];
    marriages.push({ id: `outline-m${marriages.length + 1}`, spouseAId: h.id, spouseBId: w.id, startYear: null, endYear: null });
  };
  const tags = new Map<string, MemberDTO>();
  const pending: { child: MemberDTO; key: "mother" | "father"; value: string; parent: MemberDTO; line: number }[] = [];
  const pendingSpouses: { of: MemberDTO; value: string; line: number }[] = [];
  const stack: { indent: number; m: MemberDTO; kids: number }[] = [];
  let tops = 0;
  const found: { top: MemberDTO | null } = { top: null };

  const rows = text.replace(/^﻿/, "").split(/\r?\n/);
  rows.forEach((raw, i) => {
    const lineNo = i + 1;
    if (!raw.trim() || raw.trim().startsWith("#")) return;
    const indent = (raw.match(/^[ \t ]*/)?.[0] ?? "").replace(/\t/g, "  ").replace(/ /g, " ").length;
    const [first, ...rest] = raw.trim().split(/\s*\|\s*/);
    // the name, its gender mark and label
    let name = first;
    let gender: Gender = "MALE";
    const mark = (re: RegExp, g: Gender) => {
      if (re.test(name)) { gender = g; name = name.replace(re, " "); }
    };
    mark(/\((?:F|f|أنثى|بنت|ابنة)\)|♀/, "FEMALE");
    mark(/\((?:M|m|ذكر|ابن)\)|♂/, "MALE");
    mark(/\((?:\?|؟)\)/, "UNKNOWN");
    let label: string | null = null;
    name = name.replace(/#(\d+)/, (_, t) => { label = t; return " "; }).replace(/\s+/g, " ").trim();
    if (!name) { warnings.push(`Line ${lineNo}: no name.`); return; }
    const m = person(name, gender);
    if (label) {
      if (tags.has(label)) warnings.push(`Line ${lineNo}: #${label} is used twice.`);
      tags.set(label, m);
    }
    // its parent: the nearest line above with less indent
    while (stack.length && stack[stack.length - 1].indent >= indent) stack.pop();
    const parent = stack[stack.length - 1];
    if (parent) {
      m.birthOrder = parent.kids++;
      if (parent.m.gender === "FEMALE") m.motherId = parent.m.id; else m.fatherId = parent.m.id;
    } else {
      m.birthOrder = tops++;
      found.top ??= m;
    }
    stack.push({ indent, m, kids: 0 });
    for (const field of rest) {
      const at = field.search(/[:：]/);
      const key = at > 0 ? KEYS[field.slice(0, at).trim().toLowerCase()] : undefined;
      const value = at > 0 ? field.slice(at + 1).trim() : field.trim();
      if (!key) { if (field.trim()) warnings.push(`Line ${lineNo}: "${field.trim()}" is not a known detail.`); continue; }
      if (!value) continue;
      if (key === "spouse") pendingSpouses.push({ of: m, value, line: lineNo });
      else if (key === "mother" || key === "father") {
        if (parent) pending.push({ child: m, key, value, parent: parent.m, line: lineNo });
        else warnings.push(`Line ${lineNo}: a ${key} is given for someone with no parent above them.`);
      } else if (key === "born") m.birthYear = year(value);
      else if (key === "died") { m.deathYear = year(value); m.isDeceased = true; }
      else if (key === "laqab") m.laqab = value;
      else if (key === "note") m.notes = value;
    }
  });

  // a name or "#7": the labelled person, one of `of`'s spouses by that
  // name, or someone new (married to `of`)
  const resolve = (value: string, of: MemberDTO, line: number): MemberDTO => {
    let label: string | null = null;
    const name = value.replace(/#(\d+)/, (_, t) => { label = t; return " "; }).replace(/\s+/g, " ").trim();
    if (label && tags.has(label)) return tags.get(label)!;
    if (label && !name) warnings.push(`Line ${line}: #${label} is not given to anyone.`);
    const known = (spouses.get(of.id) ?? []).find((s) => s.name === name);
    if (known) {
      if (label) tags.set(label, known);
      return known;
    }
    const s = person(name || `#${label}`, of.gender === "FEMALE" ? "MALE" : of.gender === "MALE" ? "FEMALE" : "UNKNOWN");
    if (label) tags.set(label, s);
    return s;
  };
  for (const p of pendingSpouses) {
    for (const v of p.value.split(/\s*[;؛،]\s*/).filter(Boolean)) {
      const s = resolve(v, p.of, p.line);
      if (s !== p.of) marry(p.of, s);
    }
  }
  for (const p of pending) {
    const other = resolve(p.value, p.parent, p.line);
    if (p.key === "mother") p.child.motherId = other.id; else p.child.fatherId = other.id;
    if (other !== p.parent) marry(p.parent, other);
  }
  if (!members.length) warnings.push("No people found: write one name per line.");
  return { members, marriages, rootMemberId: found.top?.id ?? null, warnings };
}
