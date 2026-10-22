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
import type { CitationDTO, Gender, MarriageDTO, MediaDTO, MemberDTO, SourceDTO, TreeDTO } from "./types";
import { looksLikeOutline, parseOutline } from "./outline";

/** Largest file the server accepts (characters of text, about the same in bytes). */
export const GEDCOM_MAX_CHARS = 20_000_000;
/** Most people one import may create. */
export const GEDCOM_MAX_PEOPLE = 20_000;

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
  citations: GedcomCitation[];
  media: GedcomMedia[];
}

/** A source record (0 @S1@ SOUR), or one written inline in a citation. */
export interface GedcomSource {
  xref: string;
  title: string;
  author: string | null;
  publication: string | null;
  notes: string | null;
  media: GedcomMedia[];
}

/** A citation of a source, on a person or a family, for one event or in general. */
export interface GedcomCitation {
  /** The source's xref (an inline source gets a made-up one). */
  source: string;
  /** "BIRT", "DEAT", "MARR" …: the EVEN of the citation, or the event it is written under. */
  eventType: string | null;
  page: string | null;
}

/** A multimedia link: the file a program recorded, its format and title. */
export interface GedcomMedia {
  file: string;
  fileType: string | null;
  caption: string | null;
}

export interface GedcomFamily {
  xref: string;
  husband: string | null;
  wife: string | null;
  /** In the file's order, which GEDCOM defines as birth order. */
  children: string[];
  marriedYear: number | null;
  divorcedYear: number | null;
  citations: GedcomCitation[];
  media: GedcomMedia[];
}

export interface GedcomFile {
  people: GedcomPerson[];
  families: GedcomFamily[];
  sources: GedcomSource[];
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

/** MIME type of a GEDCOM FORM ("jpg", "JPEG", "pdf") or of a file name's extension. */
export function mediaType(form: string | null | undefined, file = ""): string | null {
  const ext = (form?.trim() || /\.([a-z0-9]+)(?:[?#].*)?$/i.exec(file)?.[1] || "").toLowerCase();
  const types: Record<string, string> = {
    jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", gif: "image/gif", webp: "image/webp", bmp: "image/bmp",
    tif: "image/tiff", tiff: "image/tiff", svg: "image/svg+xml", pdf: "application/pdf", txt: "text/plain",
    mp3: "audio/mpeg", wav: "audio/wav", mp4: "video/mp4", mov: "video/quicktime",
  };
  return types[ext] ?? null;
}

/** GEDCOM FORM for a MIME type ("image/jpeg" → "jpeg"). */
const formOf = (fileType: string | null) => (fileType ? (fileType.split("/")[1] ?? "").replace(/\+.*$/, "") || null : null);

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
  // a family outline (plain text, one person per line: src/lib/outline.ts)
  // is read as the GEDCOM file it stands for
  if (looksLikeOutline(text)) {
    const o = parseOutline(text);
    const file = parseGedcom(exportGedcom({ name: "outline", members: o.members, marriages: o.marriages }));
    return { ...file, source: "Shajarah family outline", warnings: [...o.warnings, ...file.warnings] };
  }
  const warnings: string[] = [];
  const records = parseLines(text, warnings);
  if (!records.some((r) => r.tag === "INDI")) {
    if (!records.some((r) => r.tag === "HEAD")) warnings.push("This does not look like a GEDCOM file (no HEAD record).");
    return { people: [], families: [], sources: [], source: null, warnings: [...warnings, "No people (INDI records) found."] };
  }
  const head = records.find((r) => r.tag === "HEAD");
  const sour = head && child(head, "SOUR");
  const source = sour ? (child(sour, "NAME")?.value || sour.value || null) : null;
  const noteRecords = new Map(records.filter((r) => r.tag === "NOTE" && r.xref).map((r) => [r.xref!, textOf(r)]));
  const noteText = (n: GNode) => (/^@[^@]+@$/.test(n.value.trim()) ? noteRecords.get(n.value.trim()) ?? "" : textOf(n));
  let multiParents = 0, missingSources = 0, missingFiles = 0;

  // ── media: OBJE records, inline OBJE, and links to records
  const objeRecords = new Map(records.filter((r) => r.tag === "OBJE" && r.xref).map((r) => [r.xref!, r]));
  /** The files of one OBJE (5.5.1 puts FORM and TITL under FILE, 5.5 beside it). */
  const filesOf = (o: GNode): GedcomMedia[] => {
    const files = childrenOf(o, "FILE");
    if (!files.length) missingFiles++;
    return files
      .map((f) => {
        const file = textOf(f).trim();
        const form = child(f, "FORM")?.value ?? child(o, "FORM")?.value;
        const titl = child(f, "TITL") ?? child(o, "TITL");
        return { file, fileType: mediaType(form, file), caption: titl ? textOf(titl).trim() || null : null };
      })
      .filter((m) => m.file);
  };
  const mediaIn = (r: GNode): GedcomMedia[] => {
    const out: GedcomMedia[] = [];
    const visit = (n: GNode, depth: number) => {
      for (const c of n.children) {
        if (c.tag === "OBJE") {
          const ptr = c.value.trim();
          const rec = /^@[^@]+@$/.test(ptr) ? objeRecords.get(ptr) : c;
          if (rec) out.push(...filesOf(rec));
          else missingFiles++;
        } else if (depth === 0 && c.tag !== "SOUR") visit(c, 1); // OBJE under an event
      }
    };
    visit(r, 0);
    return out;
  };

  // ── sources: SOUR records, and inline sources written in a citation
  const sources = new Map<string, GedcomSource>();
  for (const r of records.filter((x) => x.tag === "SOUR" && x.xref)) {
    const titl = child(r, "TITL") ?? child(r, "ABBR");
    const notes = [...childrenOf(r, "NOTE").map(noteText), ...childrenOf(r, "TEXT").map(textOf)].map((x) => x.trim()).filter(Boolean);
    sources.set(r.xref!, {
      xref: r.xref!,
      title: (titl ? textOf(titl).trim() : "") || "Untitled source",
      author: child(r, "AUTH") ? textOf(child(r, "AUTH")!).trim() || null : null,
      publication: child(r, "PUBL") ? textOf(child(r, "PUBL")!).trim() || null : null,
      notes: notes.length ? notes.join("\n\n").slice(0, NOTES_MAX) : null,
      media: mediaIn(r),
    });
  }
  const citationOf = (c: GNode, event: string | null): GedcomCitation | null => {
    const ptr = c.value.trim();
    let xref: string;
    if (/^@[^@]+@$/.test(ptr)) {
      if (!sources.has(ptr)) {
        missingSources++;
        return null;
      }
      xref = ptr;
    } else {
      // "1 SOUR Parish register of …": a source with no record of its own
      const title = textOf(c).split("\n")[0].trim();
      if (!title) return null;
      xref = `inline:${normalizeName(title)}`;
      if (!sources.has(xref)) {
        const text = childrenOf(c, "TEXT").map(textOf).join("\n\n").trim();
        sources.set(xref, { xref, title: title.slice(0, 300), author: null, publication: null, notes: text || null, media: [] });
      }
    }
    const page = child(c, "PAGE") ? textOf(child(c, "PAGE")!).trim() || null : null;
    const even = child(c, "EVEN")?.value.trim().toUpperCase() || null;
    return { source: xref, eventType: even ?? event, page };
  };
  /** Citations on a record, and on its events (1 BIRT / 2 SOUR @S1@). */
  const citationsIn = (r: GNode): GedcomCitation[] => {
    const out: GedcomCitation[] = [];
    for (const c of r.children) {
      if (c.tag === "SOUR") {
        const cit = citationOf(c, null);
        if (cit) out.push(cit);
      } else {
        for (const g of childrenOf(c, "SOUR")) {
          const cit = citationOf(g, c.tag);
          if (cit) out.push(cit);
        }
      }
    }
    return out;
  };

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
      ...childrenOf(r, "NOTE").map(noteText),
    ].map((s) => s?.trim()).filter(Boolean).join("\n\n");
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
      citations: citationsIn(r),
      media: mediaIn(r),
    });
  }

  const families: GedcomFamily[] = records.filter((x) => x.tag === "FAM" && x.xref).map((r) => {
    const marr = child(r, "MARR"), div = child(r, "DIV");
    return {
      xref: r.xref!,
      husband: child(r, "HUSB")?.value.trim() || null,
      wife: child(r, "WIFE")?.value.trim() || null,
      children: childrenOf(r, "CHIL").map((c) => c.value.trim()),
      marriedYear: gedcomYear(marr && child(marr, "DATE")?.value),
      divorcedYear: gedcomYear(div && child(div, "DATE")?.value),
      // a citation on the family itself is about the marriage
      citations: citationsIn(r).map((c) => ({ ...c, eventType: c.eventType ?? "MARR" })),
      media: mediaIn(r),
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
  if (missingSources) {
    warnings.push(`${missingSources} citation${missingSources === 1 ? " refers" : "s refer"} to a source record that is not in the file and ${missingSources === 1 ? "was" : "were"} skipped.`);
  }
  if (missingFiles) {
    warnings.push(
      `${missingFiles} media link${missingFiles === 1 ? "" : "s"} could not be read (no file name, or a media record missing from the file) and ${missingFiles === 1 ? "was" : "were"} skipped.`,
    );
  }
  return { people, families, sources: [...sources.values()], source, warnings };
}

// ── 3. Planning the import ───────────────────────────────────────────────

export interface GedcomPlan {
  /** People in the file. */
  people: number;
  /** Members to create (ids already assigned, parents linked). */
  newMembers: MemberDTO[];
  /** Marriages to create. */
  newMarriages: MarriageDTO[];
  /** Sources to create (a source already in the tree, same title and author, is reused). */
  newSources: SourceDTO[];
  /** Sources in the file that were already in the tree. */
  reusedSources: number;
  /** Citations and media to create (ones already in the tree are not repeated). */
  newCitations: CitationDTO[];
  newMedia: MediaDTO[];
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
  tree: Pick<TreeDTO, "members" | "marriages" | "lineage" | "rootMemberId" | "sources" | "citations" | "media">,
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
  const byIdInTree = new Map(tree.members.map((m) => [m.id, m]));
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
    // at the top of the file's line, a member at the top of the tree's line
    // is the better match (a grandson of the same name is not the ancestor)
    if (!lp && cands.length > 1) {
      const tops = cands.filter((c) => !lineageParentId(c, lineage));
      if (tops.length) cands = tops;
    }
    // Brothers of the same name (half-brothers, often): tell them apart by
    // their other parent's name, then their children's names, then their
    // order. Each test only narrows the choice, never empties it.
    const narrow = (keep: (c: MemberDTO) => boolean) => {
      if (cands.length < 2) return;
      const kept = cands.filter(keep);
      if (kept.length) cands = kept;
    };
    const pr = parents.get(x)!;
    const otherParent = lineage === "MATRILINEAL" ? pr.father : pr.mother;
    if (otherParent) {
      const otherKey = normalizeName(people.get(otherParent)!.name);
      narrow((c) => {
        const o = lineage === "MATRILINEAL" ? c.fatherId : c.motherId;
        return !!o && normalizeName(byIdInTree.get(o)?.name ?? "") === otherKey;
      });
    }
    const kidKeys = new Set((fileChildren.get(x) ?? []).map((c) => normalizeName(people.get(c)!.name)));
    if (kidKeys.size) narrow((c) => (treeChildren.get(c.id) ?? []).some((k) => kidKeys.has(normalizeName(k.name))));
    if (p.order !== null) narrow((c) => c.birthOrder === p.order);
    let found: MemberDTO | null = null;
    if (cands.length === 1) found = cands[0];
    else if (cands.length > 1) ambiguous++;
    if (found) used.add(found.id);
    match.set(x, found);
    return found;
  };
  for (const p of file.people) matchOf(p.xref);
  // Second pass, for people who married into the line (no parent in the
  // line, no children counted in it): an unmatched spouse is the member of
  // the same name who is already married to their matched spouse, or is
  // already the other parent of their matched children.
  const spousesOf = new Map<string, Set<string>>();
  for (const x of tree.marriages) {
    spousesOf.set(x.spouseAId, (spousesOf.get(x.spouseAId) ?? new Set()).add(x.spouseBId));
    spousesOf.set(x.spouseBId, (spousesOf.get(x.spouseBId) ?? new Set()).add(x.spouseAId));
  }
  for (const f of file.families) {
    for (const [x, y] of [[f.husband, f.wife], [f.wife, f.husband]] as const) {
      if (!x || !people.has(x) || match.get(x)) continue;
      const key = normalizeName(people.get(x)!.name);
      const partner = y ? match.get(y) : null;
      const known = new Set<string>(partner ? spousesOf.get(partner.id) ?? [] : []);
      for (const c of f.children) {
        const kid = match.get(c);
        if (!kid) continue;
        for (const pid of [kid.fatherId, kid.motherId]) if (pid && pid !== partner?.id) known.add(pid);
      }
      const cands = [...known]
        .map((id) => byIdInTree.get(id))
        .filter((m): m is MemberDTO => !!m && !used.has(m.id) && normalizeName(m.name) === key);
      if (cands.length === 1) {
        match.set(x, cands[0]);
        used.add(cands[0].id);
      } else if (cands.length > 1) ambiguous++;
    }
  }

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

  // ── sources: one with the same title and author as a source in the tree is that source
  const sourceKey = (title: string, author: string | null) => `${normalizeName(title)}|${normalizeName(author ?? "")}`;
  const existingSource = new Map(tree.sources.map((x) => [sourceKey(x.title, x.author), x.id]));
  const sourceId = new Map<string, string>();
  const newSources: SourceDTO[] = [];
  let reusedSources = 0;
  for (const src of file.sources) {
    const key = sourceKey(src.title, src.author);
    const found = existingSource.get(key);
    if (found) {
      reusedSources++;
      sourceId.set(src.xref, found);
      continue;
    }
    const id = newId();
    existingSource.set(key, id); // two records with the same title in one file are one source
    sourceId.set(src.xref, id);
    newSources.push({ id, title: src.title, author: src.author, publication: src.publication, notes: src.notes });
  }

  // ── citations and media, never repeating one already in the tree
  const citationKey = (c: Pick<CitationDTO, "memberId" | "sourceId" | "eventType" | "page">) =>
    [c.memberId, c.sourceId, c.eventType ?? "", c.page ?? ""].join("|");
  const cited = new Set(tree.citations.map(citationKey));
  const newCitations: CitationDTO[] = [];
  const cite = (memberId: string, c: GedcomCitation) => {
    const sid = sourceId.get(c.source);
    if (!sid) return;
    const row = { id: "", sourceId: sid, memberId, eventType: c.eventType, page: c.page };
    if (cited.has(citationKey(row))) return;
    cited.add(citationKey(row));
    newCitations.push({ ...row, id: newId() });
  };
  const mediaKey = (m: Pick<MediaDTO, "memberId" | "sourceId" | "url">) => [m.memberId ?? "", m.sourceId ?? "", m.url].join("|");
  const shown = new Set(tree.media.map(mediaKey));
  const newMedia: MediaDTO[] = [];
  const attach = (owner: { memberId: string | null; sourceId: string | null }, m: GedcomMedia) => {
    const row = { id: "", ...owner, url: m.file, caption: m.caption, fileType: m.fileType };
    if (shown.has(mediaKey(row))) return;
    shown.add(mediaKey(row));
    newMedia.push({ ...row, id: newId() });
  };
  for (const p of file.people) {
    const id = idOf.get(p.xref)!;
    for (const c of p.citations) cite(id, c);
    for (const m of p.media) attach({ memberId: id, sourceId: null }, m);
  }
  for (const f of file.families) {
    // a marriage record has no row of its own: its sources go to both spouses, its media to the husband (or wife)
    const spouses = [f.husband, f.wife].filter((x): x is string => !!x && people.has(x)).map((x) => idOf.get(x)!);
    for (const c of f.citations) for (const id of spouses) cite(id, c);
    if (spouses.length) for (const m of f.media) attach({ memberId: spouses[0], sourceId: null }, m);
  }
  for (const src of file.sources) {
    const id = sourceId.get(src.xref)!;
    for (const m of src.media) attach({ memberId: null, sourceId: id }, m);
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
    newSources,
    reusedSources,
    newCitations,
    newMedia,
    relinks: [...relinked.values()],
    reused: file.people.length - created.length,
    ambiguous,
    rootMemberId,
    members,
    warnings,
  };
}

// ── 4. Export ────────────────────────────────────────────────────────────

/**
 * The tree as a GEDCOM 5.5.1 file (UTF-8, lineage-linked), with its sources
 * (SOUR records, cited with PAGE and the event in EVEN) and media links
 * (OBJE with FILE, FORM and TITL). `baseUrl` makes uploaded files' URLs
 * absolute, so another program can fetch them; files held only in the
 * browser (the demo) cannot be linked and are left out.
 */
export function exportGedcom(
  tree: Pick<TreeDTO, "name" | "members" | "marriages"> & Partial<Pick<TreeDTO, "sources" | "citations" | "media">>,
  opts: { baseUrl?: string } = {},
): string {
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
  const sources = tree.sources ?? [];
  const sref = new Map(sources.map((x, i) => [x.id, `@S${i + 1}@`]));
  const citationsOf = new Map<string, CitationDTO[]>();
  for (const c of tree.citations ?? []) if (sref.has(c.sourceId)) citationsOf.set(c.memberId, [...(citationsOf.get(c.memberId) ?? []), c]);
  const mediaOf = new Map<string, MediaDTO[]>();
  for (const m of tree.media ?? []) {
    const owner = m.memberId ?? m.sourceId;
    if (owner && !m.url.startsWith("data:")) mediaOf.set(owner, [...(mediaOf.get(owner) ?? []), m]);
  }
  const fileUrl = (url: string) => (opts.baseUrl && url.startsWith("/") ? opts.baseUrl.replace(/\/$/, "") + url : url);
  const outMedia = (level: number, list: MediaDTO[] | undefined) => {
    for (const m of list ?? []) {
      out(level, "OBJE");
      out(level + 1, "FILE", fileUrl(m.url).replace(/@/g, "@@"));
      const form = formOf(m.fileType);
      if (form) out(level + 2, "FORM", form);
      if (m.caption) outText(level + 1, "TITL", m.caption);
    }
  };

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
  for (const x of sources) {
    out(0, "SOUR", "", sref.get(x.id));
    outText(1, "TITL", x.title);
    if (x.author) outText(1, "AUTH", x.author);
    if (x.publication) outText(1, "PUBL", x.publication);
    if (x.notes) outText(1, "NOTE", x.notes);
    outMedia(1, mediaOf.get(x.id));
  }
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
    for (const c of citationsOf.get(m.id) ?? []) {
      out(1, "SOUR", sref.get(c.sourceId));
      if (c.page) outText(2, "PAGE", c.page);
      if (c.eventType) out(2, "EVEN", c.eventType);
    }
    outMedia(1, mediaOf.get(m.id));
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

