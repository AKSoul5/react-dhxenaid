// Restoring a snapshot of a tree (undo/redo): what must change in the
// database to turn the tree as it is into the snapshot. A diff, not a
// delete-and-reinsert, so ids stay stable and an undo of one edit touches
// one row.

import type { MarriageDTO, MemberDTO, TreeDTO } from "./types";

export type TreeSnapshot = Pick<
  TreeDTO,
  "name" | "title" | "subtitle" | "lineage" | "rootMemberId" | "crownBaseId" | "trunkStartId" | "soilText" | "settings" | "members" | "marriages"
>;

const MEMBER_FIELDS = [
  "name", "laqab", "gender", "birthYear", "deathYear", "isDeceased", "birthOrder", "notes", "fatherId", "motherId",
] as const;
const MARRIAGE_FIELDS = ["spouseAId", "spouseBId", "startYear", "endYear"] as const;

/** Why a snapshot cannot be a tree (a reference to nobody, a cycle …), or null. */
export function snapshotError(s: TreeSnapshot): string | null {
  const byId = new Map<string, MemberDTO>();
  for (const m of s.members) {
    if (byId.has(m.id)) return `Member ${m.id} appears twice.`;
    byId.set(m.id, m);
  }
  for (const m of s.members) {
    for (const [role, pid] of [["father", m.fatherId], ["mother", m.motherId]] as const) {
      if (!pid) continue;
      const p = byId.get(pid);
      if (!p) return `${m.name}'s ${role} is not in the tree.`;
      if (pid === m.id) return `${m.name} cannot be their own ${role}.`;
      if (role === "father" && p.gender === "FEMALE") return `${m.name}'s father must not be female.`;
      if (role === "mother" && p.gender === "MALE") return `${m.name}'s mother must not be male.`;
    }
  }
  // no one may be their own ancestor (through fathers or mothers)
  const state = new Map<string, 1 | 2>(); // 1 visiting, 2 done
  for (const start of s.members) {
    if (state.get(start.id) === 2) continue;
    const stack: [MemberDTO, number][] = [[start, 0]];
    while (stack.length) {
      const [m, i] = stack[stack.length - 1];
      if (i === 0) state.set(m.id, 1);
      const parents = [m.fatherId, m.motherId].filter((p): p is string => !!p);
      if (i < parents.length) {
        stack[stack.length - 1][1]++;
        const p = parents[i];
        if (state.get(p) === 1) return `${byId.get(p)!.name} would be their own ancestor.`;
        if (!state.has(p)) stack.push([byId.get(p)!, 0]);
      } else {
        state.set(m.id, 2);
        stack.pop();
      }
    }
  }
  for (const [label, id] of [["root", s.rootMemberId], ["canopy start", s.crownBaseId], ["trunk start", s.trunkStartId]] as const) {
    if (id && !byId.has(id)) return `The ${label} is not in the tree.`;
  }
  const seen = new Set<string>();
  for (const x of s.marriages) {
    if (seen.has(x.id)) return `Marriage ${x.id} appears twice.`;
    seen.add(x.id);
    if (!byId.has(x.spouseAId) || !byId.has(x.spouseBId)) return "A marriage refers to someone not in the tree.";
    if (x.spouseAId === x.spouseBId) return "A member cannot marry themselves.";
  }
  return null;
}

export interface RestorePlan {
  /** Members to create, parents before children. */
  createMembers: MemberDTO[];
  /** Existing members whose fields differ (only the changed fields). */
  updateMembers: { id: string; data: Partial<MemberDTO> }[];
  deleteMemberIds: string[];
  createMarriages: MarriageDTO[];
  updateMarriages: { id: string; data: Partial<MarriageDTO> }[];
  deleteMarriageIds: string[];
  /** Tree fields that differ. */
  tree: Partial<Omit<TreeSnapshot, "members" | "marriages">>;
}

export function planRestore(current: TreeSnapshot, target: TreeSnapshot): RestorePlan {
  const now = new Map(current.members.map((m) => [m.id, m]));
  const want = new Map(target.members.map((m) => [m.id, m]));
  const fresh = target.members.filter((m) => !now.has(m.id));
  const freshIds = new Set(fresh.map((m) => m.id));
  // parents first, so every foreign key exists when a row is inserted
  const depth = new Map<string, number>();
  const depthOf = (id: string): number => {
    if (depth.has(id)) return depth.get(id)!;
    depth.set(id, 0);
    const m = want.get(id)!;
    const ps = [m.fatherId, m.motherId].filter((p): p is string => !!p && freshIds.has(p));
    const d = ps.length ? 1 + Math.max(...ps.map(depthOf)) : 0;
    depth.set(id, d);
    return d;
  };
  const createMembers = [...fresh].sort((a, b) => depthOf(a.id) - depthOf(b.id));

  const updateMembers: RestorePlan["updateMembers"] = [];
  for (const m of target.members) {
    const cur = now.get(m.id);
    if (!cur) continue;
    const data: Partial<MemberDTO> = {};
    for (const f of MEMBER_FIELDS) if (cur[f] !== m[f]) (data as Record<string, unknown>)[f] = m[f];
    if (Object.keys(data).length) updateMembers.push({ id: m.id, data });
  }

  const nowMar = new Map(current.marriages.map((x) => [x.id, x]));
  const wantMar = new Set(target.marriages.map((x) => x.id));
  const updateMarriages: RestorePlan["updateMarriages"] = [];
  for (const x of target.marriages) {
    const cur = nowMar.get(x.id);
    if (!cur) continue;
    const data: Partial<MarriageDTO> = {};
    for (const f of MARRIAGE_FIELDS) if (cur[f] !== x[f]) (data as Record<string, unknown>)[f] = x[f];
    if (Object.keys(data).length) updateMarriages.push({ id: x.id, data });
  }

  const tree: RestorePlan["tree"] = {};
  for (const f of ["name", "title", "subtitle", "lineage", "rootMemberId", "crownBaseId", "trunkStartId", "soilText"] as const) {
    if (current[f] !== target[f]) (tree as Record<string, unknown>)[f] = target[f];
  }
  if (JSON.stringify(current.settings ?? null) !== JSON.stringify(target.settings ?? null)) tree.settings = target.settings;

  return {
    createMembers,
    updateMembers,
    deleteMemberIds: current.members.filter((m) => !want.has(m.id)).map((m) => m.id),
    createMarriages: target.marriages.filter((x) => !nowMar.has(x.id)),
    updateMarriages,
    deleteMarriageIds: current.marriages.filter((x) => !wantMar.has(x.id)).map((x) => x.id),
    tree,
  };
}

/** The plan applied in memory (the demo's repository, and the tests' check of the plan). */
export function applyRestore(current: TreeSnapshot, plan: RestorePlan): TreeSnapshot {
  const gone = new Set(plan.deleteMemberIds);
  const updates = new Map(plan.updateMembers.map((u) => [u.id, u.data]));
  const members = [
    ...current.members.filter((m) => !gone.has(m.id)).map((m) => ({ ...m, ...updates.get(m.id) })),
    ...plan.createMembers,
  ];
  const goneMar = new Set(plan.deleteMarriageIds);
  const marUpdates = new Map(plan.updateMarriages.map((u) => [u.id, u.data]));
  const marriages = [
    ...current.marriages.filter((x) => !goneMar.has(x.id)).map((x) => ({ ...x, ...marUpdates.get(x.id) })),
    ...plan.createMarriages,
  ];
  return { ...current, ...plan.tree, members, marriages };
}

