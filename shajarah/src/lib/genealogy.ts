import type { Lineage, MemberDTO } from "./types";

/** The parent whose branch a member grows from on the poster. */
export function lineageParentId(
  m: Pick<MemberDTO, "fatherId" | "motherId">,
  lineage: Lineage,
): string | null {
  return lineage === "MATRILINEAL"
    ? (m.motherId ?? m.fatherId)
    : (m.fatherId ?? m.motherId);
}

/** Map of parentId → children, ordered by birthOrder then birthYear. */
export function childrenIndex(members: MemberDTO[], lineage: Lineage) {
  const ids = new Set(members.map((m) => m.id));
  const index = new Map<string | null, MemberDTO[]>();
  for (const m of members) {
    let p = lineageParentId(m, lineage);
    if (p && !ids.has(p)) p = null;
    const list = index.get(p) ?? [];
    list.push(m);
    index.set(p, list);
  }
  for (const list of index.values()) list.sort(compareSiblings);
  return index;
}

export function compareSiblings(a: MemberDTO, b: MemberDTO) {
  return (
    a.birthOrder - b.birthOrder ||
    (a.birthYear ?? 1e9) - (b.birthYear ?? 1e9) ||
    a.name.localeCompare(b.name)
  );
}

/**
 * Generation number for every member: 0 for members without a lineage
 * parent, otherwise parent + 1. Iterative so very deep trees cannot blow the
 * stack, and cycle-safe (members caught in a cycle keep generation 0).
 */
export function computeGenerations(
  members: MemberDTO[],
  lineage: Lineage,
): Map<string, number> {
  const index = childrenIndex(members, lineage);
  const gen = new Map<string, number>();
  const queue: MemberDTO[] = [...(index.get(null) ?? [])];
  for (const m of queue) gen.set(m.id, 0);
  for (let i = 0; i < queue.length; i++) {
    const m = queue[i];
    for (const c of index.get(m.id) ?? []) {
      if (gen.has(c.id)) continue;
      gen.set(c.id, gen.get(m.id)! + 1);
      queue.push(c);
    }
  }
  for (const m of members) if (!gen.has(m.id)) gen.set(m.id, 0);
  return gen;
}

/** True when `ancestorId` appears among the ancestors of `memberId` (any parent). */
export function isAncestor(
  members: MemberDTO[],
  ancestorId: string,
  memberId: string,
): boolean {
  const byId = new Map(members.map((m) => [m.id, m]));
  const stack = [memberId];
  const seen = new Set<string>();
  while (stack.length) {
    const id = stack.pop()!;
    if (seen.has(id)) continue;
    seen.add(id);
    const m = byId.get(id);
    if (!m) continue;
    for (const p of [m.fatherId, m.motherId]) {
      if (!p) continue;
      if (p === ancestorId) return true;
      stack.push(p);
    }
  }
  return false;
}

/** Validates a proposed parent assignment; returns an error message or null. */
export function parentAssignmentError(
  members: MemberDTO[],
  memberId: string | null,
  parentId: string | null | undefined,
  role: "father" | "mother",
): string | null {
  if (!parentId) return null;
  const parent = members.find((m) => m.id === parentId);
  if (!parent) return `The selected ${role} is not in this tree.`;
  if (memberId && parentId === memberId) return "A member cannot be their own parent.";
  if (role === "father" && parent.gender === "FEMALE") return "The father must not be female.";
  if (role === "mother" && parent.gender === "MALE") return "The mother must not be male.";
  if (memberId && isAncestor(members, memberId, parentId)) {
    return `That ${role} is a descendant of this member, which would create a loop.`;
  }
  return null;
}

/** "نصار بن ثويني بن فارس" style patronymic chain (up to `depth` ancestors). */
export function nasab(members: MemberDTO[], id: string, depth = 4): string {
  const byId = new Map(members.map((m) => [m.id, m]));
  const parts: string[] = [];
  let cur = byId.get(id);
  const seen = new Set<string>();
  while (cur && parts.length <= depth && !seen.has(cur.id)) {
    seen.add(cur.id);
    parts.push(cur.name);
    cur = cur.fatherId ? byId.get(cur.fatherId) : undefined;
  }
  return parts.join(" بن ");
}
