// Why the people a poster leaves out are not on it, sorted by what would
// bring them on: a daughter's family (shown through her), a spouse (shown
// with "Show spouses"), someone linked to no one (often a leftover), or
// anyone else not connected to the line.

import type { MemberDTO, TreeDTO } from "./types";

export type NotDrawnKind = "daughter" | "spouse" | "unlinked" | "other";

export interface NotDrawn {
  id: string;
  kind: NotDrawnKind;
  /** For a daughter's family: the daughter (or, in a mother's-line tree, the son) it is shown through. */
  throughId?: string;
  /** Spouses by marriage or by a child together. */
  partnerIds: string[];
}

export function explainNotDrawn(tree: Pick<TreeDTO, "members" | "marriages" | "lineage">, ids: readonly string[]): NotDrawn[] {
  const byId = new Map(tree.members.map((m) => [m.id, m]));
  const partners = new Map<string, Set<string>>();
  const link = (a: string | null, b: string | null) => {
    if (!a || !b || a === b) return;
    partners.set(a, (partners.get(a) ?? new Set()).add(b));
    partners.set(b, (partners.get(b) ?? new Set()).add(a));
  };
  for (const x of tree.marriages) link(x.spouseAId, x.spouseBId);
  for (const m of tree.members) link(m.fatherId, m.motherId);
  const hasChildren = (id: string) => tree.members.some((c) => c.fatherId === id || c.motherId === id);
  const matri = tree.lineage === "MATRILINEAL";
  // a daughter of the family (a son, in a mother's-line tree), whose children belong to another family
  const ofLine = (m: MemberDTO | undefined) => !!m && m.gender === (matri ? "MALE" : "FEMALE") && !!(m.fatherId || m.motherId);
  // the parent a child is drawn from, and the other one
  const lineParent = (m: MemberDTO) => byId.get((matri ? m.motherId : m.fatherId) ?? "");
  const otherParent = (m: MemberDTO) => byId.get((matri ? m.fatherId : m.motherId) ?? "");

  return ids.flatMap((id): NotDrawn[] => {
    const m = byId.get(id);
    if (!m) return [];
    const partnerIds = [...(partners.get(id) ?? [])];
    if (!m.fatherId && !m.motherId) {
      // a husband (or wife) who married a daughter of the family is shown with her family
      const daughter = partnerIds.map((p) => byId.get(p)).find(ofLine);
      if (daughter) return [{ id, kind: "daughter", throughId: daughter.id, partnerIds }];
      if (partnerIds.length) return [{ id, kind: "spouse", partnerIds }];
      return [{ id, kind: hasChildren(id) ? "other" : "unlinked", partnerIds }];
    }
    // a daughter's child (their own parent outside the line, or not
    // recorded), or anyone further down a daughter's family
    for (let cur: MemberDTO | undefined = m, guard = 0; cur && guard < 500; guard++) {
      const own = lineParent(cur), through = otherParent(cur);
      if (ofLine(through) && (!own || (!own.fatherId && !own.motherId))) return [{ id, kind: "daughter", throughId: through!.id, partnerIds }];
      cur = own;
    }
    return [{ id, kind: "other", partnerIds }];
  });
}
