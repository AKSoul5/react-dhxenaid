// Two records of one person (a wife added as a spouse, then again as a
// child's mother): found, and merged into one.

import { normalizeName } from "./nasab";
import type { MemberDTO, TreeDTO } from "./types";

/**
 * The spouses of `personId` and the other parents of their children,
 * grouped where two or more have the same name: most likely one person
 * recorded twice. The first of each group is the one to keep (the one the
 * marriage is recorded with, else the one with most children).
 */
export function duplicateSpouses(tree: Pick<TreeDTO, "members" | "marriages">, personId: string): MemberDTO[][] {
  const byId = new Map(tree.members.map((m) => [m.id, m]));
  const married = new Set(tree.marriages
    .filter((x) => x.spouseAId === personId || x.spouseBId === personId)
    .map((x) => (x.spouseAId === personId ? x.spouseBId : x.spouseAId)));
  const others = new Set(married);
  const kids = new Map<string, number>();
  for (const c of tree.members) {
    const other = c.fatherId === personId ? c.motherId : c.motherId === personId ? c.fatherId : null;
    if (other) {
      others.add(other);
      kids.set(other, (kids.get(other) ?? 0) + 1);
    }
  }
  const groups = new Map<string, MemberDTO[]>();
  for (const id of others) {
    const m = byId.get(id);
    if (!m) continue;
    const key = normalizeName(m.name);
    groups.set(key, [...(groups.get(key) ?? []), m]);
  }
  return [...groups.values()]
    .filter((g) => g.length > 1)
    .map((g) => g.sort((a, b) => Number(married.has(b.id)) - Number(married.has(a.id)) || (kids.get(b.id) ?? 0) - (kids.get(a.id) ?? 0)));
}

/**
 * The family with `dropId` merged into `keepId`: their children, marriages,
 * sources and photos become the kept person's, details the kept record
 * lacks (laqab, years, notes, parents) are taken from the other, and every
 * setting that named the dropped record names the kept one.
 */
export function mergePeople<T extends Pick<TreeDTO, "members" | "marriages" | "citations" | "media" | "rootMemberId" | "crownBaseId" | "trunkStartId" | "settings">>(
  tree: T, keepId: string, dropId: string,
): T {
  const keep = tree.members.find((m) => m.id === keepId);
  const drop = tree.members.find((m) => m.id === dropId);
  if (!keep || !drop || keepId === dropId) return tree;
  const swap = (id: string | null) => (id === dropId ? keepId : id);
  const merged: MemberDTO = {
    ...keep,
    laqab: keep.laqab ?? drop.laqab,
    birthYear: keep.birthYear ?? drop.birthYear,
    deathYear: keep.deathYear ?? drop.deathYear,
    isDeceased: keep.isDeceased || drop.isDeceased,
    notes: keep.notes && drop.notes && keep.notes !== drop.notes ? `${keep.notes}\n${drop.notes}` : keep.notes ?? drop.notes,
    fatherId: keep.fatherId ?? drop.fatherId,
    motherId: keep.motherId ?? drop.motherId,
  };
  const members = tree.members
    .filter((m) => m.id !== dropId)
    .map((m) => (m.id === keepId ? merged : { ...m, fatherId: swap(m.fatherId), motherId: swap(m.motherId) }));
  // marriages: the dropped record's become the kept one's, without repeats
  const seen = new Set<string>();
  const marriages = tree.marriages
    .map((x) => ({ ...x, spouseAId: swap(x.spouseAId)!, spouseBId: swap(x.spouseBId)! }))
    .filter((x) => {
      const key = [x.spouseAId, x.spouseBId].sort().join("|");
      if (x.spouseAId === x.spouseBId || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  const s = tree.settings;
  return {
    ...tree,
    members,
    marriages,
    citations: tree.citations.map((c) => (c.memberId === dropId ? { ...c, memberId: keepId } : c)),
    media: tree.media.map((m) => (m.memberId === dropId ? { ...m, memberId: keepId } : m)),
    rootMemberId: swap(tree.rootMemberId),
    crownBaseId: swap(tree.crownBaseId),
    trunkStartId: swap(tree.trunkStartId),
    settings: s && {
      ...s,
      ...(s.focusId !== undefined ? { focusId: swap(s.focusId) } : {}),
      ...(s.centerBranchId !== undefined ? { centerBranchId: swap(s.centerBranchId) } : {}),
      ...(s.familiesThrough ? { familiesThrough: [...new Set(s.familiesThrough.map((id) => swap(id)!))] } : {}),
    },
  };
}

/** One of `fatherOrMother`'s spouses whose name is `name` (ignoring hamza forms, spaces, diacritics), if any. */
export function spouseNamed(tree: Pick<TreeDTO, "members" | "marriages">, personId: string, name: string): MemberDTO | null {
  const key = normalizeName(name);
  const ids = tree.marriages
    .filter((x) => x.spouseAId === personId || x.spouseBId === personId)
    .map((x) => (x.spouseAId === personId ? x.spouseBId : x.spouseAId));
  return tree.members.find((m) => ids.includes(m.id) && normalizeName(m.name) === key) ?? null;
}
