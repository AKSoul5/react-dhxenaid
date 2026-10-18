// Nasab (patronymic chain) import.
//
// Arabic genealogies are usually written as one line, newest first:
//   "أحمد بن نوفل بن أحمد بن محمد … بن شيث بن آدم عليه السلام"
// parseNasab() turns that into an ordered chain and planNasabImport()
// matches it against the existing tree, so pasting several family members'
// nasabs one after another builds a single connected tree without
// duplicating shared ancestors.

import { childrenIndex, lineageParentId } from "./genealogy";
import type { Gender, Lineage, MemberDTO } from "./types";

export interface NasabEntry {
  name: string;
  laqab: string | null;
}

export interface ParsedNasab {
  /** Oldest ancestor first. */
  entries: NasabEntry[];
  /** Gender of the person the nasab belongs to (newest entry). */
  gender: Gender;
}

const SEPARATOR = /\s+(بن|ابن|بنت|bin|ibn|bint|son of|daughter of)\s+/i;
const HONORIFIC = /\s+(عليه السلام|عليها السلام|رضي الله عنه|رضي الله عنها|رحمه الله|رحمها الله)\s*$/;

export function parseNasab(text: string): ParsedNasab {
  const clean = text.replace(/[.۔،,]+\s*$/, "").replace(/\s+/g, " ").trim();
  if (!clean) return { entries: [], gender: "MALE" };
  const parts = clean.split(SEPARATOR);
  // split() with a capture group interleaves names and separators
  const names = parts.filter((_, i) => i % 2 === 0);
  const firstSep = (parts[1] ?? "").toLowerCase();
  const gender: Gender = ["بنت", "bint", "daughter of"].includes(firstSep) ? "FEMALE" : "MALE";
  const entries = names.map(splitLaqab).filter((e) => e.name);
  return { entries: entries.reverse(), gender };
}

/** Lifts "(laqab)" and a closing honorific (رحمه الله …) out of a name. */
export function splitLaqab(raw: string): NasabEntry {
  let name = raw.trim();
  const laqabs: string[] = [];
  name = name.replace(/\(([^)]*)\)/g, (_, inner: string) => {
    laqabs.push(inner.trim());
    return " ";
  });
  const hon = name.match(HONORIFIC);
  if (hon) {
    laqabs.push(hon[1]);
    name = name.slice(0, hon.index);
  }
  name = name.replace(/\s+/g, " ").trim();
  return { name, laqab: laqabs.filter(Boolean).join(" — ") || null };
}

/** Comparison key tolerant of spelling variants (أ/إ/آ/ا, ى/ي, ة/ه, spaces, diacritics). */
export function normalizeName(name: string): string {
  return name
    .replace(/[ً-ْٰـ]/g, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/\s+/g, "")
    .toLowerCase();
}

export interface NasabPlan {
  /** Existing members reused for the chain, oldest first (contiguous). */
  matched: MemberDTO[];
  /** New ancestors to create ABOVE an existing parentless member (oldest first). */
  ancestorsToCreate: NasabEntry[];
  /** Existing parentless member that the new ancestors will adopt. */
  adoptedRootId: string | null;
  /** New members to create BELOW the last matched member (oldest first). */
  descendantsToCreate: NasabEntry[];
  /** Another, equally good place in the tree also matched. */
  ambiguous: boolean;
}

/**
 * Finds where a parsed chain (oldest first) fits into the tree. Every member
 * whose name matches some entry is tried as an anchor:
 *  - walking UP its real ancestors must agree with the older entries; when
 *    the walk reaches a member without a father, the remaining older
 *    entries are created above it (e.g. the tree starts at شعلان and the
 *    pasted nasab reaches آدم);
 *  - walking DOWN, children with the next names are reused; the rest of the
 *    chain is created below.
 * The anchor reusing the most members wins. At least two consecutive names
 * must agree, so a lone common name like "محمد" never joins lines by chance,
 * except at the very top: a line ending in the family's founder (the only
 * member of that name without a father) joins him.
 */
export function planNasabImport(members: MemberDTO[], lineage: Lineage, entries: NasabEntry[]): NasabPlan {
  const none: NasabPlan = {
    matched: [], ancestorsToCreate: [], adoptedRootId: null, descendantsToCreate: entries, ambiguous: false,
  };
  if (!entries.length || !members.length) return none;
  const index = childrenIndex(members, lineage);
  const byId = new Map(members.map((m) => [m.id, m]));
  const keys = entries.map((e) => normalizeName(e.name));

  type Candidate = {
    score: number; k: number; anchor: MemberDTO; up: MemberDTO[]; down: MemberDTO[]; olderLeft: number;
  };
  let best: Candidate | null = null;
  // Anchoring at different names of the SAME path finds the same match;
  // only a different path with an equal score is a genuine ambiguity.
  const pathKey = (c: Candidate) => [...c.up, c.anchor, ...c.down].map((m) => m.id).join(">");
  const tiedPaths = new Set<string>();
  for (const anchor of members) {
    const key = normalizeName(anchor.name);
    for (let k = 0; k < keys.length; k++) {
      if (keys[k] !== key) continue;
      // walk up
      const up: MemberDTO[] = [];
      let cur = anchor;
      let i = k - 1;
      let conflict = false;
      for (; i >= 0; i--) {
        const pid = lineageParentId(cur, lineage);
        const p = pid ? byId.get(pid) : undefined;
        if (!p) break; // reached the top: entries[0..i] go above
        if (normalizeName(p.name) !== keys[i]) {
          conflict = true;
          break;
        }
        up.unshift(p);
        cur = p;
      }
      if (conflict) continue;
      // walk down
      const down: MemberDTO[] = [];
      let node = anchor;
      for (let j = k + 1; j < keys.length; j++) {
        const next = (index.get(node.id) ?? []).find((c) => normalizeName(c.name) === keys[j]);
        if (!next) break;
        down.push(next);
        node = next;
      }
      const score = up.length + 1 + down.length;
      const cand = { score, k, anchor, up, down, olderLeft: i + 1 };
      if (!best || score > best.score) {
        best = cand;
        tiedPaths.clear();
        tiedPaths.add(pathKey(cand));
      } else if (score === best.score) tiedPaths.add(pathKey(cand));
    }
  }
  if (best && best.score < 2 && entries.length > 1) {
    // One exception to the two-name rule: a line whose oldest name is the
    // family's founder (the one member of that name without a father) joins
    // him, as when every son's line is pasted ending in the same patriarch
    // ("صالح بن عمر بن عبدالله", "علي بن خالد بن عبدالله" …).
    const founders = members.filter((m) => !lineageParentId(m, lineage) && normalizeName(m.name) === keys[0]);
    if (founders.length === 1) {
      return {
        matched: [founders[0]], ancestorsToCreate: [], adoptedRootId: null, descendantsToCreate: entries.slice(1), ambiguous: false,
      };
    }
  }
  if (!best || (best.score < 2 && entries.length > 1)) return none;
  const matched = [...best.up, best.anchor, ...best.down];
  const older = entries.slice(0, best.olderLeft);
  return {
    matched,
    ancestorsToCreate: older,
    adoptedRootId: older.length ? matched[0].id : null,
    descendantsToCreate: entries.slice(best.k + 1 + best.down.length),
    ambiguous: tiedPaths.size > 1,
  };
}

export interface NasabLineResult {
  newest: string;
  oldest: string;
  total: number;
  reused: number;
  created: number;
  ambiguous: boolean;
}

/**
 * Applies pasted nasab lines to an in-memory member list, in order, so each
 * line can build on people created by the lines before it. Used by the
 * import preview and by the database-free demo.
 */
export function applyNasabLines(
  members: MemberDTO[],
  lineage: Lineage,
  text: string,
  newId: () => string,
): { members: MemberDTO[]; results: NasabLineResult[]; newRootId: string | null } {
  let list = [...members];
  let newRootId: string | null = null;
  const results: NasabLineResult[] = [];
  const make = (e: NasabEntry, fatherId: string | null, gender: Gender): MemberDTO => ({
    id: newId(), name: e.name, laqab: e.laqab, gender, birthYear: null, deathYear: null,
    isDeceased: false, birthOrder: list.filter((m) => fatherId && m.fatherId === fatherId).length,
    generation: 0, notes: null, fatherId, motherId: null,
  });
  for (const line of splitNasabLines(text)) {
    const { entries, gender } = parseNasab(line);
    if (!entries.length) continue;
    const plan = planNasabImport(list, lineage, entries);
    let parentId: string | null = null;
    let top: string | null = null;
    for (const e of plan.ancestorsToCreate) {
      const m = make(e, parentId, "MALE");
      list.push(m);
      top ??= m.id;
      parentId = m.id;
    }
    if (plan.adoptedRootId) {
      list = list.map((m) => (m.id === plan.adoptedRootId ? { ...m, fatherId: parentId } : m));
      newRootId = top;
    }
    parentId = plan.matched.at(-1)?.id ?? null;
    plan.descendantsToCreate.forEach((e, i) => {
      const m = make(e, parentId, i === plan.descendantsToCreate.length - 1 ? gender : "MALE");
      list.push(m);
      if (!members.length && !newRootId) newRootId = m.id;
      parentId = m.id;
    });
    results.push({
      newest: entries.at(-1)!.name, oldest: entries[0].name, total: entries.length,
      reused: plan.matched.length, created: plan.ancestorsToCreate.length + plan.descendantsToCreate.length,
      ambiguous: plan.ambiguous,
    });
  }
  return { members: list, results, newRootId };
}

/** Splits pasted text into one nasab per non-empty line. */
export function splitNasabLines(text: string): string[] {
  return text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
}
