// GEDCOM 5.5.1 import and export.
//
// GEDCOM is the exchange format of genealogy software (Ancestry, MyHeritage,
// Gramps, MacFamilyTree …). Import runs in three steps, all pure so the
// editor can preview exactly what the server will do:
//   decodeGedcom()      bytes → text (UTF-8 / UTF-16, BOM or not)
//   parseGedcom()       text → people and families
//   planGedcomImport()  people and families → new members, reused members,
//                       new marriages, matched against the existing tree
//                       with the same spelling-tolerant names as the nasab
//                       importer.
// exportGedcom() writes a tree back out, so nobody is locked in.

import { childrenIndex, computeGenerations, lineageParentId } from "./genealogy";
import { normalizeName, parseNasab, splitLaqab } from "./nasab";
import type { Gender, MarriageDTO, MemberDTO, TreeDTO } from "./types";

// ── 1. Decoding ──────────────────────────────────────────────────────────

/** Text of a GEDCOM file, honouring a byte-order mark; warns where characters may be wrong. */
export function decodeGedcom(bytes: Uint8Array): { text: string; warnings: string[] } {
  const warnings: string[] = [];
  const decode = (enc: string, data: Uint8Array, fatal = false) => new TextDecoder(enc, { fatal }).decode(data);
  if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) return { text: decode("utf-8", bytes.subarray(3)), warnings };
  if (bytes[0] === 0xff && bytes[1] === 0xfe) return { text: decode("utf-16le", bytes.subarray(2)), warnings };
  if (bytes[0] === 0xfe && bytes[1] === 0xff) return { text: decode("utf-16be", bytes.subarray(2)), warnings };
  // UTF-16 without a BOM: "0 HEAD" with zero bytes between the letters
  if (bytes[0] === 0x30 && bytes[1] === 0x00) return { text: decode("utf-16le", bytes), warnings };
  if (bytes[0] === 0x00 && bytes[1] === 0x30) return { text: decode("utf-16be", bytes), warnings };
  try {
    return { text: decode("utf-8", bytes, true), warnings };
  } catch {
    // ANSEL or a Windows code page: Latin-1 keeps ASCII names intact
    const text = decode("latin1", bytes);
    const charset = /\n\s*1\s+CHAR\s+(\S+)/.exec(text)?.[1] ?? "unknown";
    warnings.push(
      `The file is not UTF-8 (character set: ${charset}). Names with accents or non-Latin letters may be garbled; ` +
        "export it again as UTF-8 if your software offers it.",
    );
    return { text, warnings };
  }
}

// ── 2. Parsing ───────────────────────────────────────────────────────────

interface GNode {
  level: number;
  xref: string | null;
  tag: string;
  value: string;
  children: GNode[];
}

export interface GedcomPerson {
  xref: string;
  name: string;
  laqab: string | null;
  gender: Gender;
  birthYear: number | null;
  deathYear: number | null;
  deceased: boolean;
  notes: string | null;
  /** Families this person is a child of (the first one is used). */
  famc: string[];
  /** Families this person is a spouse in, in order. */
  fams: string[];
  /** Shajarah's own sibling order (_SHAJARAH_ORDER), when the file came from Shajarah. */
  order: number | null;
}

export interface GedcomFamily {
  xref: string;
  husband: string | null;
  wife: string | null;
  /** In the file's order, which GEDCOM defines as birth order. */
  children: string[];
  marriedYear: number | null;
  divorcedYear: number | null;
}

export interface GedcomFile {
  people: GedcomPerson[];
  families: GedcomFamily[];
  /** The program that wrote the file, if it says. */
  source: string | null;
  warnings: string[];
}

const LINE = /^\s*(\d{1,2})\s+(?:(@[^@\s][^@]*@)\s+)?([A-Za-z0-9_]+)(?: (.*))?$/;
const NOTES_MAX = 2000;
/**
 * Extension tag (GEDCOM allows tags starting with "_"; other programs
 * ignore them) carrying the sibling order across a father's marriages,
 * which GEDCOM's per-family CHIL order cannot express without birth dates.
 */
const ORDER_TAG = "_SHAJARAH_ORDER";
const NAME_MAX = 120;

function parseLines(text: string, warnings: string[]): GNode[] {
  const roots: GNode[] = [];
  const stack: GNode[] = [];
  let bad = 0;
  for (const raw of text.replace(/^﻿/, "").split(/\r\n|\r|\n/)) {
    if (!raw.trim()) continue;
    const m = LINE.exec(raw);
    if (!m) {
      bad++;
      continue;
    }
    const node: GNode = { level: Number(m[1]), xref: m[2] ?? null, tag: m[3].toUpperCase(), value: m[4] ?? "", children: [] };
    while (stack.length && stack[stack.length - 1].level >= node.level) stack.pop();
    if (node.level === 0) roots.push(node);
    else if (stack.length) stack[stack.length - 1].children.push(node);
    else {
      bad++;
      continue;
    }
    stack.push(node);
  }
  if (bad) warnings.push(`${bad} line${bad === 1 ? "" : "s"} could not be read and ${bad === 1 ? "was" : "were"} skipped.`);
  return roots;
}

const child = (n: GNode, tag: string) => n.children.find((c) => c.tag === tag);
const childrenOf = (n: GNode, tag: string) => n.children.filter((c) => c.tag === tag);
const unescape = (s: string) => s.replace(/@@/g, "@");

/** A value with its CONC / CONT continuation lines joined. */
function textOf(n: GNode): string {
  let s = n.value;
  for (const c of n.children) {
    if (c.tag === "CONC") s += c.value;
    else if (c.tag === "CONT") s += "\n" + c.value;
  }
  return unescape(s);
}

/**
 * The year of a GEDCOM date: "12 JAN 1901", "ABT 1900", "BET 1850 AND 1860"
 * (the first), "1700/01" (the first), "@#DJULIAN@ 1066", "1320" in a
 * Hijri-dated file. Days are one or two digits, so the first number of
 * three or four digits is the year.
 */
export function gedcomYear(date: string | undefined): number | null {
  const m = date ? /(?:^|\D)(\d{3,4})(?!\d)/.exec(date.replace(/@#D[^@]*@/g, " ")) : null;
  if (!m) return null;
  const y = Number(m[1]);
  return y >= 1 && y <= 3000 ? y : null;
}

/** "Born 12 JAN 1901, Sanaa": kept in the notes when there is more than a year. */
function factLine(label: string, ev: GNode | undefined): string | null {
  if (!ev) return null;
  const date = child(ev, "DATE")?.value.trim() ?? "";
  const place = child(ev, "PLAC") ? textOf(child(ev, "PLAC")!).trim() : "";
  const detailed = date && !/^\d{3,4}$/.test(date);
  if (!detailed && !place) return null;
  return `${label} ${[detailed ? date : "", place].filter(Boolean).join(", ")}`;
}

export function parseGedcom(text: string): GedcomFile {
  const warnings: string[] = [];
  const records = parseLines(text, warnings);
  if (!records.some((r) => r.tag === "INDI")) {
    if (!records.some((r) => r.tag === "HEAD")) warnings.push("This does not look like a GEDCOM file (no HEAD record).");
    return { people: [], families: [], source: null, warnings: [...warnings, "No people (INDI records) found."] };
  }
  const head = records.find((r) => r.tag === "HEAD");
  const sour = head && child(head, "SOUR");
  const source = sour ? (child(sour, "NAME")?.value || sour.value || null) : null;
  const noteRecords = new Map(records.filter((r) => r.tag === "NOTE" && r.xref).map((r) => [r.xref!, textOf(r)]));
  let citations = 0, media = 0, multiParents = 0;

  const people: GedcomPerson[] = [];
  for (const r of records.filter((x) => x.tag === "INDI" && x.xref)) {
    const nameNode = child(r, "NAME");
    const raw = nameNode ? unescape(nameNode.value) : "";
    const surname = /\/([^/]*)\//.exec(raw)?.[1].trim() ?? "";
    const givn = nameNode && child(nameNode, "GIVN") ? textOf(child(nameNode, "GIVN")!) : "";
    let given = (givn || raw.replace(/\/[^/]*\/?/g, " ")).replace(/\s+/g, " ").trim();
    if (!given) given = surname;
    const own = splitLaqab(given);
    const laqabs = [
      own.laqab,
      ...(nameNode ? ["NPFX", "NICK", "NSFX"].map((t) => (child(nameNode, t) ? textOf(child(nameNode, t)!) : "")) : []),
      ...childrenOf(r, "NICK").map(textOf),
    ].map((s) => s?.trim()).filter((s): s is string => !!s);
    const sex = child(r, "SEX")?.value.trim().toUpperCase();
    const birt = child(r, "BIRT") ?? child(r, "CHR") ?? child(r, "BAPM");
    const deat = child(r, "DEAT") ?? child(r, "BURI");
    const notes = [
      factLine("Born", birt),
      factLine("Died", deat),
      ...childrenOf(r, "OCCU").map((o) => `Occupation: ${textOf(o)}`),
      ...childrenOf(r, "NOTE").map((n) => (/^@[^@]+@$/.test(n.value.trim()) ? noteRecords.get(n.value.trim()) ?? "" : textOf(n))),
    ].map((s) => s?.trim()).filter(Boolean).join("\n\n");
    citations += countTags(r, "SOUR");
    media += countTags(r, "OBJE");
    const famc = childrenOf(r, "FAMC").map((f) => f.value.trim());
    if (famc.length > 1) multiParents++;
    people.push({
      xref: r.xref!,
      name: (own.name || "Unknown").slice(0, NAME_MAX),
      laqab: [...new Set(laqabs)].join(" — ").slice(0, NAME_MAX) || null,
      gender: sex === "M" ? "MALE" : sex === "F" ? "FEMALE" : "UNKNOWN",
      birthYear: gedcomYear(birt && child(birt, "DATE")?.value),
      deathYear: gedcomYear(deat && child(deat, "DATE")?.value),
      deceased: !!deat,
      notes: notes ? notes.slice(0, NOTES_MAX) : null,
      famc,
      fams: childrenOf(r, "FAMS").map((f) => f.value.trim()),
      order: /^\d+$/.test(child(r, ORDER_TAG)?.value.trim() ?? "") ? Number(child(r, ORDER_TAG)!.value) : null,
    });
  }

  const families: GedcomFamily[] = records.filter((x) => x.tag === "FAM" && x.xref).map((r) => {
    citations += countTags(r, "SOUR");
    media += countTags(r, "OBJE");
    const marr = child(r, "MARR"), div = child(r, "DIV");
    return {
      xref: r.xref!,
      husband: child(r, "HUSB")?.value.trim() || null,
      wife: child(r, "WIFE")?.value.trim() || null,
      children: childrenOf(r, "CHIL").map((c) => c.value.trim()),
      marriedYear: gedcomYear(marr && child(marr, "DATE")?.value),
      divorcedYear: gedcomYear(div && child(div, "DATE")?.value),
    };
  });

  // People listed only from the family side, or only from the person side,
  // are linked both ways (files from different programs differ here).
  const byXref = new Map(people.map((p) => [p.xref, p]));
  for (const f of families) {
    for (const c of f.children) {
      const p = byXref.get(c);
      if (p && !p.famc.includes(f.xref)) p.famc.push(f.xref);
    }
    for (const s of [f.husband, f.wife]) {
      const p = s ? byXref.get(s) : undefined;
      if (p && !p.fams.includes(f.xref)) p.fams.push(f.xref);
    }
  }
  // A name written as a nasab ("أحمد بن نوفل") is the person's own name
  // when the file links their parents: the chain then comes from the links.
  // Without a parent in the file the whole name is kept, so "عائشة بنت حمد"
  // does not lose her father's name.
  for (const p of people) {
    if (!p.famc.length) continue;
    const newest = parseNasab(p.name).entries.at(-1);
    if (newest?.name) p.name = newest.name;
  }
  if (multiParents) {
    warnings.push(`${multiParents} ${multiParents === 1 ? "person has" : "people have"} more than one set of parents (e.g. adoption); the first is used.`);
  }
  const skipped = [
    citations && `${citations} source citation${citations === 1 ? "" : "s"}`,
    media && `${media} media link${media === 1 ? "" : "s"}`,
  ].filter(Boolean);
  if (skipped.length) warnings.push(`${skipped.join(" and ")} were not imported: Shajarah does not store sources or media yet.`);
  return { people, families, source, warnings };
}

function countTags(n: GNode, tag: string): number {
  return n.children.reduce((k, c) => k + (c.tag === tag ? 1 : 0) + countTags(c, tag), 0);
}

// ── 3. Planning the import ───────────────────────────────────────────────

export interface GedcomPlan {
  /** People in the file. */
  people: number;
  /** Members to create (ids already assigned, parents linked). */
  newMembers: MemberDTO[];
  /** Marriages to create. */
  newMarriages: MarriageDTO[];
  /** Existing members the file gives a parent they did not have. */
  relinks: { id: string; fatherId: string | null; motherId: string | null }[];
  /** People in the file that are already in the tree (not created again). */
  reused: number;
  /** People that matched more than one member of the tree, and were imported as new. */
  ambiguous: number;
  /** The tree's root after the import. */
  rootMemberId: string | null;
  /** Every member after the import, generations recomputed. */
  members: MemberDTO[];
  warnings: string[];
}

/**
 * Plans the import of a parsed file into a tree. A person in the file is
 * the same as a member of the tree when their names agree (spelling
 * variants allowed, as for nasabs) and their line agrees:
 *  - their lineage parent was matched, and that parent has exactly one
 *    child of this name; or
 *  - at the top of the file's line, the member has a child whose name
 *    agrees with one of the person's children (two names in a row, so a
 *    common name never joins two families by chance). If the person has
 *    a parent in the file, the member must have none: the file then adds
 *    older ancestors above them.
 * Everyone else is created. Nothing already in the tree is changed, except
 * that a member without a recorded parent gets the one from the file.
 */
export function planGedcomImport(
  tree: Pick<TreeDTO, "members" | "marriages" | "lineage" | "rootMemberId">,
  file: GedcomFile,
  newId: () => string,
): GedcomPlan {
  const { lineage } = tree;
  const warnings = [...file.warnings];
  const people = new Map(file.people.map((p) => [p.xref, p]));
  const families = new Map(file.families.map((f) => [f.xref, f]));

  // Parents from the first family each person is a child of. The father is
  // the parent who is not female, the mother the one who is not male.
  const parents = new Map<string, { father: string | null; mother: string | null }>();
  let unplacedParents = 0;
  for (const p of file.people) {
    const fam = p.famc.map((x) => families.get(x)).find(Boolean);
    const pair = { father: null as string | null, mother: null as string | null };
    for (const s of fam ? [fam.husband, fam.wife] : []) {
      const sp = s ? people.get(s) : undefined;
      if (!sp || sp.xref === p.xref) continue;
      if (sp.gender !== "FEMALE" && !pair.father) pair.father = sp.xref;
      else if (sp.gender !== "MALE" && !pair.mother) pair.mother = sp.xref;
      else unplacedParents++;
    }
    parents.set(p.xref, pair);
  }
  if (unplacedParents) warnings.push(`${unplacedParents} parent link${unplacedParents === 1 ? "" : "s"} could not be recorded (two fathers or two mothers).`);
  const lineParent = (x: string) => {
    const pr = parents.get(x)!;
    return lineageParentId({ fatherId: pr.father, motherId: pr.mother }, lineage);
  };
  const fileChildren = new Map<string, string[]>();
  for (const p of file.people) {
    const lp = lineParent(p.xref);
    if (lp) fileChildren.set(lp, [...(fileChildren.get(lp) ?? []), p.xref]);
  }

  // ── matching against the tree
  const treeChildren = childrenIndex(tree.members, lineage);
  const byName = new Map<string, MemberDTO[]>();
  for (const m of tree.members) {
    const k = normalizeName(m.name);
    byName.set(k, [...(byName.get(k) ?? []), m]);
  }
  const used = new Set<string>();
  const match = new Map<string, MemberDTO | null>();
  let ambiguous = 0;
  const matchOf = (x: string): MemberDTO | null => {
    if (match.has(x)) return match.get(x)!;
    match.set(x, null); // guards against cycles in the file
    const p = people.get(x)!;
    const key = normalizeName(p.name);
    const lp = lineParent(x);
    const parentMatch = lp ? matchOf(lp) : null;
    let cands: MemberDTO[];
    if (parentMatch) {
      cands = (treeChildren.get(parentMatch.id) ?? []).filter((c) => normalizeName(c.name) === key);
    } else {
      const kidKeys = new Set((fileChildren.get(x) ?? []).map((c) => normalizeName(people.get(c)!.name)));
      cands = (byName.get(key) ?? []).filter(
        (m) =>
          (!lp || !lineageParentId(m, lineage)) &&
          (treeChildren.get(m.id) ?? []).some((c) => kidKeys.has(normalizeName(c.name))),
      );
    }
    cands = cands.filter((c) => !used.has(c.id));
    let found: MemberDTO | null = null;
    if (cands.length === 1) found = cands[0];
    else if (cands.length > 1) ambiguous++;
    if (found) used.add(found.id);
    match.set(x, found);
    return found;
  };
  for (const p of file.people) matchOf(p.xref);

  // ── members
  const idOf = new Map<string, string>();
  for (const p of file.people) idOf.set(p.xref, match.get(p.xref)?.id ?? newId());
  const existing = new Map(tree.members.map((m) => [m.id, { ...m }]));
  const created: MemberDTO[] = [];
  for (const p of file.people) {
    if (match.get(p.xref)) continue;
    created.push({
      id: idOf.get(p.xref)!, name: p.name, laqab: p.laqab, gender: p.gender, birthYear: p.birthYear,
      deathYear: p.deathYear, isDeceased: p.deceased || p.deathYear !== null, birthOrder: 0, generation: 0,
      notes: p.notes, fatherId: null, motherId: null,
    });
  }
  const all = new Map<string, MemberDTO>([...existing, ...created.map((m) => [m.id, m] as const)]);
  /** Would `parentId` become an ancestor of itself through `childId`? */
  const isAncestorOf = (childId: string, parentId: string) => {
    const seen = new Set<string>();
    const stack = [parentId];
    while (stack.length) {
      const id = stack.pop()!;
      if (id === childId) return true;
      if (seen.has(id)) continue;
      seen.add(id);
      const m = all.get(id);
      if (m?.fatherId) stack.push(m.fatherId);
      if (m?.motherId) stack.push(m.motherId);
    }
    return false;
  };
  const relinked = new Map<string, { id: string; fatherId: string | null; motherId: string | null }>();
  let cycles = 0;
  for (const p of file.people) {
    const m = all.get(idOf.get(p.xref)!)!;
    const reused = !!match.get(p.xref);
    const pr = parents.get(p.xref)!;
    for (const role of ["fatherId", "motherId"] as const) {
      const x = role === "fatherId" ? pr.father : pr.mother;
      if (!x || m[role]) continue; // never overwrite a parent already recorded
      const pid = idOf.get(x)!;
      if (pid === m.id || isAncestorOf(m.id, pid)) {
        cycles++;
        continue;
      }
      m[role] = pid;
      if (reused) relinked.set(m.id, { id: m.id, fatherId: m.fatherId, motherId: m.motherId });
    }
  }
  if (cycles) warnings.push(`${cycles} parent link${cycles === 1 ? "" : "s"} would make someone their own ancestor and ${cycles === 1 ? "was" : "were"} left out.`);

  // Birth order: the file lists children in birth order, family by family
  // in the order of the parent's marriages; after any children already
  // recorded in the tree.
  const orderKey = (p: GedcomPerson) => {
    if (p.order !== null) return p.order;
    const lp = lineParent(p.xref);
    const famIdx = lp ? people.get(lp)!.fams.indexOf(p.famc[0]) : 0;
    const fam = families.get(p.famc[0]);
    return Math.max(famIdx, 0) * 10_000 + (fam ? fam.children.indexOf(p.xref) : 0);
  };
  const newByParent = new Map<string, GedcomPerson[]>();
  for (const p of file.people) {
    if (match.get(p.xref)) continue;
    const parentId = lineageParentId(all.get(idOf.get(p.xref)!)!, lineage);
    if (parentId) newByParent.set(parentId, [...(newByParent.get(parentId) ?? []), p]);
  }
  for (const [parentId, kids] of newByParent) {
    const before = (treeChildren.get(parentId) ?? []).map((c) => c.birthOrder);
    const base = before.length ? Math.max(...before) + 1 : 0;
    kids.sort((a, b) => orderKey(a) - orderKey(b) || (a.birthYear ?? 0) - (b.birthYear ?? 0));
    kids.forEach((k, i) => (all.get(idOf.get(k.xref)!)!.birthOrder = base + i));
  }

  // ── marriages
  const pairKey = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`);
  const married = new Set(tree.marriages.map((m) => pairKey(m.spouseAId, m.spouseBId)));
  const newMarriages: MarriageDTO[] = [];
  for (const f of file.families) {
    if (!f.husband || !f.wife || !people.has(f.husband) || !people.has(f.wife)) continue;
    const a = idOf.get(f.husband)!, b = idOf.get(f.wife)!;
    if (a === b || married.has(pairKey(a, b))) continue;
    married.add(pairKey(a, b));
    newMarriages.push({ id: newId(), spouseAId: a, spouseBId: b, startYear: f.marriedYear, endYear: f.divorcedYear });
  }

  // ── generations and the root
  const members = [...all.values()];
  const gens = computeGenerations(members, lineage);
  for (const m of members) m.generation = gens.get(m.id) ?? 0;
  let rootMemberId = tree.rootMemberId && all.has(tree.rootMemberId) ? tree.rootMemberId : null;
  if (rootMemberId) {
    // the file may add older ancestors above the root: the trunk starts at the oldest
    const seen = new Set<string>();
    let cur = all.get(rootMemberId)!;
    for (let pid = lineageParentId(cur, lineage); pid && all.has(pid) && !seen.has(pid); pid = lineageParentId(cur, lineage)) {
      seen.add(pid);
      cur = all.get(pid)!;
    }
    rootMemberId = cur.id;
  } else if (members.length) {
    // no root yet: the ancestor with the most descendants in the line
    const kids = childrenIndex(members, lineage);
    const size = (id: string): number => (kids.get(id) ?? []).reduce((n, c) => n + 1 + size(c.id), 0);
    rootMemberId = (kids.get(null) ?? []).reduce<{ id: string | null; n: number }>(
      (best, m) => {
        const n = size(m.id);
        return n > best.n ? { id: m.id, n } : best;
      },
      { id: null, n: -1 },
    ).id;
  }

  return {
    people: file.people.length,
    newMembers: created.map((m) => all.get(m.id)!),
    newMarriages,
    relinks: [...relinked.values()],
    reused: file.people.length - created.length,
    ambiguous,
    rootMemberId,
    members,
    warnings,
  };
}

// ── 4. Export ────────────────────────────────────────────────────────────

/** The tree as a GEDCOM 5.5.1 file (UTF-8, lineage-linked). */
export function exportGedcom(tree: Pick<TreeDTO, "name" | "members" | "marriages">): string {
  const lines: string[] = [];
  const out = (level: number, tag: string, value = "", xref?: string) =>
    lines.push([level, xref, tag, value].filter((v) => v !== undefined && v !== "").join(" "));
  /** Long or multi-line text: CONT per line, CONC so no line exceeds the 255-character limit. */
  const outText = (level: number, tag: string, text: string) => {
    text.replace(/@/g, "@@").split(/\r?\n/).forEach((line, i) => {
      const chars = Array.from(line);
      const chunks: string[] = [];
      for (let k = 0; k < chars.length; k += 200) chunks.push(chars.slice(k, k + 200).join(""));
      if (!chunks.length) chunks.push("");
      chunks.forEach((c, j) => out(i === 0 && j === 0 ? level : level + 1, i === 0 && j === 0 ? tag : j === 0 ? "CONT" : "CONC", c));
    });
  };
  const ref = new Map(tree.members.map((m, i) => [m.id, `@I${i + 1}@`]));

  // Families: every couple, and every (father, mother) pair with children
  type Fam = { xref: string; husband: string | null; wife: string | null; children: MemberDTO[]; marriage?: MarriageDTO };
  const fams = new Map<string, Fam>();
  const byId = new Map(tree.members.map((m) => [m.id, m]));
  const famFor = (husband: string | null, wife: string | null) => {
    const key = `${husband ?? ""}|${wife ?? ""}`;
    let f = fams.get(key);
    if (!f) fams.set(key, (f = { xref: `@F${fams.size + 1}@`, husband, wife, children: [] }));
    return f;
  };
  for (const m of tree.marriages) {
    const a = byId.get(m.spouseAId), b = byId.get(m.spouseBId);
    if (!a || !b) continue;
    const [h, w] = a.gender === "FEMALE" && b.gender !== "FEMALE" ? [b, a] : [a, b];
    famFor(h.id, w.id).marriage = m;
  }
  const sorted = [...tree.members].sort((a, b) => a.birthOrder - b.birthOrder || (a.birthYear ?? 0) - (b.birthYear ?? 0));
  for (const m of sorted) {
    const f = m.fatherId && byId.has(m.fatherId) ? m.fatherId : null;
    const mo = m.motherId && byId.has(m.motherId) ? m.motherId : null;
    if (f || mo) famFor(f, mo).children.push(m);
  }

  out(0, "HEAD");
  out(1, "SOUR", "SHAJARAH");
  out(2, "NAME", "Shajarah");
  out(1, "SUBM", "@U1@");
  out(1, "GEDC");
  out(2, "VERS", "5.5.1");
  out(2, "FORM", "LINEAGE-LINKED");
  out(1, "CHAR", "UTF-8");
  outText(1, "NOTE", `Family: ${tree.name}`);
  out(0, "SUBM", "", "@U1@");
  out(1, "NAME", "Shajarah");
  const famList = [...fams.values()];
  for (const m of tree.members) {
    out(0, "INDI", "", ref.get(m.id));
    outText(1, "NAME", m.name);
    if (m.laqab) outText(1, "NICK", m.laqab);
    out(1, "SEX", m.gender === "MALE" ? "M" : m.gender === "FEMALE" ? "F" : "U");
    out(1, ORDER_TAG, String(m.birthOrder));
    if (m.birthYear) {
      out(1, "BIRT");
      out(2, "DATE", String(m.birthYear));
    }
    if (m.deathYear) {
      out(1, "DEAT");
      out(2, "DATE", String(m.deathYear));
    } else if (m.isDeceased) out(1, "DEAT", "Y");
    if (m.notes) outText(1, "NOTE", m.notes);
    for (const f of famList) if (f.children.includes(m)) out(1, "FAMC", f.xref);
    for (const f of famList) if (f.husband === m.id || f.wife === m.id) out(1, "FAMS", f.xref);
  }
  for (const f of famList) {
    out(0, "FAM", "", f.xref);
    if (f.husband) out(1, "HUSB", ref.get(f.husband));
    if (f.wife) out(1, "WIFE", ref.get(f.wife));
    if (f.marriage) {
      out(1, "MARR", f.marriage.startYear ? "" : "Y");
      if (f.marriage.startYear) out(2, "DATE", String(f.marriage.startYear));
      if (f.marriage.endYear) {
        out(1, "DIV");
        out(2, "DATE", String(f.marriage.endYear));
      }
    }
    for (const c of f.children) out(1, "CHIL", ref.get(c.id));
  }
  out(0, "TRLR");
  return lines.join("\n") + "\n";
}

