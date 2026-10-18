// "Undo this import": everything a bulk import (GEDCOM or nasab) changed,
// worked out by comparing the tree before and after, so one undo removes
// exactly what that import added and nothing else.

import type { TreeDTO } from "./types";

export interface ImportReceipt {
  /** Members the import created. */
  memberIds: string[];
  /** Marriages the import created. */
  marriageIds: string[];
  /** Existing members whose parents the import filled in, as they were before. */
  restore: { id: string; fatherId: string | null; motherId: string | null }[];
  /** The tree's root before the import. */
  rootMemberId: string | null;
}

export function importReceipt(before: TreeDTO, after: TreeDTO): ImportReceipt {
  const old = new Map(before.members.map((m) => [m.id, m]));
  const oldMarriages = new Set(before.marriages.map((m) => m.id));
  return {
    memberIds: after.members.filter((m) => !old.has(m.id)).map((m) => m.id),
    marriageIds: after.marriages.filter((m) => !oldMarriages.has(m.id)).map((m) => m.id),
    restore: after.members
      .filter((m) => {
        const o = old.get(m.id);
        return o && (o.fatherId !== m.fatherId || o.motherId !== m.motherId);
      })
      .map((m) => ({ id: m.id, fatherId: old.get(m.id)!.fatherId, motherId: old.get(m.id)!.motherId })),
    rootMemberId: before.rootMemberId,
  };
}

/** The tree with an import undone (used by the database-free demo; the server does the same in SQL). */
export function undoImportLocally(tree: TreeDTO, r: ImportReceipt): TreeDTO {
  const gone = new Set(r.memberIds);
  const restore = new Map(r.restore.map((x) => [x.id, x]));
  const clear = (id: string | null) => (id && !gone.has(id) ? id : null);
  return {
    ...tree,
    rootMemberId: r.rootMemberId && !gone.has(r.rootMemberId) ? r.rootMemberId : null,
    crownBaseId: clear(tree.crownBaseId),
    trunkStartId: clear(tree.trunkStartId),
    members: tree.members
      .filter((m) => !gone.has(m.id))
      .map((m) => {
        const back = restore.get(m.id);
        return { ...m, fatherId: clear(back ? back.fatherId : m.fatherId), motherId: clear(back ? back.motherId : m.motherId) };
      }),
    marriages: tree.marriages.filter((x) => !r.marriageIds.includes(x.id) && !gone.has(x.spouseAId) && !gone.has(x.spouseBId)),
  };
}
