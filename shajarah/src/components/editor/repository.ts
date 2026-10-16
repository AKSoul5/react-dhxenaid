import { computeGenerations, parentAssignmentError } from "@/lib/genealogy";
import type { MemberDTO, TreeDTO } from "@/lib/types";
import { applyNasabLines } from "@/lib/nasab";
import type {
  CreateMarriageInput, CreateMemberInput, UpdateMemberInput, UpdateTreeInput,
} from "@/lib/validation";

/** Every mutation resolves to the full, updated tree. */
export interface FamilyRepository {
  createMember(input: CreateMemberInput): Promise<TreeDTO>;
  updateMember(id: string, input: UpdateMemberInput): Promise<TreeDTO>;
  deleteMember(id: string): Promise<TreeDTO>;
  createMarriage(input: CreateMarriageInput): Promise<TreeDTO>;
  deleteMarriage(id: string): Promise<TreeDTO>;
  updateTree(input: UpdateTreeInput): Promise<TreeDTO>;
  /** One nasab per line ("أحمد بن نوفل بن …"); reuses existing ancestors. */
  importNasab(text: string): Promise<TreeDTO>;
}

async function call(url: string, method: string, body?: unknown): Promise<TreeDTO> {
  const res = await fetch(url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? `Request failed (${res.status})`);
  return data as TreeDTO;
}

export function apiRepository(treeId: string): FamilyRepository {
  return {
    createMember: (input) => call(`/api/trees/${treeId}/members`, "POST", input),
    updateMember: (id, input) => call(`/api/members/${id}`, "PATCH", input),
    deleteMember: (id) => call(`/api/members/${id}`, "DELETE"),
    createMarriage: (input) => call(`/api/trees/${treeId}/marriages`, "POST", input),
    deleteMarriage: (id) => call(`/api/marriages/${id}`, "DELETE"),
    updateTree: (input) => call(`/api/trees/${treeId}`, "PATCH", input),
    importNasab: (text) => call(`/api/trees/${treeId}/import-nasab`, "POST", { text }),
  };
}

/** In-memory repository for the database-free demo; enforces the same rules. */
export function localRepository(initial: TreeDTO): FamilyRepository {
  let tree = structuredClone(initial);
  let seq = 0;
  const commit = (next: TreeDTO) => {
    const gens = computeGenerations(next.members, next.lineage);
    next.members = next.members.map((m) => ({ ...m, generation: gens.get(m.id) ?? 0 }));
    tree = next;
    return Promise.resolve(structuredClone(tree));
  };
  const check = (memberId: string | null, f?: string | null, m?: string | null) => {
    const err =
      parentAssignmentError(tree.members, memberId, f, "father") ??
      parentAssignmentError(tree.members, memberId, m, "mother");
    if (err) throw new Error(err);
  };
  return {
    async createMember({ spouseOfId, ...input }) {
      check(null, input.fatherId, input.motherId);
      const siblings = tree.members.filter((m) => input.fatherId && m.fatherId === input.fatherId);
      const member: MemberDTO = {
        id: `local-${Date.now()}-${seq++}`, name: input.name, laqab: input.laqab ?? null,
        gender: input.gender ?? "MALE", birthYear: input.birthYear ?? null, deathYear: input.deathYear ?? null,
        isDeceased: input.isDeceased ?? !!input.deathYear,
        birthOrder: input.birthOrder ?? (siblings.length ? Math.max(...siblings.map((s) => s.birthOrder)) + 1 : 0),
        generation: 0, notes: input.notes ?? null, fatherId: input.fatherId ?? null, motherId: input.motherId ?? null,
      };
      const marriages = spouseOfId
        ? [...tree.marriages, { id: `mar-${seq++}`, spouseAId: spouseOfId, spouseBId: member.id, startYear: null, endYear: null }]
        : tree.marriages;
      return commit({
        ...tree, members: [...tree.members, member], marriages,
        rootMemberId: tree.rootMemberId ?? (tree.members.length ? null : member.id),
      });
    },
    async updateMember(id, input) {
      const cur = tree.members.find((m) => m.id === id);
      if (!cur) throw new Error("Member not found");
      const next = { ...cur, ...input } as MemberDTO;
      check(id, next.fatherId, next.motherId);
      return commit({ ...tree, members: tree.members.map((m) => (m.id === id ? next : m)) });
    },
    async deleteMember(id) {
      return commit({
        ...tree,
        rootMemberId: tree.rootMemberId === id ? null : tree.rootMemberId,
        crownBaseId: tree.crownBaseId === id ? null : tree.crownBaseId,
        members: tree.members
          .filter((m) => m.id !== id)
          .map((m) => ({
            ...m, fatherId: m.fatherId === id ? null : m.fatherId, motherId: m.motherId === id ? null : m.motherId,
          })),
        marriages: tree.marriages.filter((x) => x.spouseAId !== id && x.spouseBId !== id),
      });
    },
    async createMarriage(input) {
      if (input.spouseAId === input.spouseBId) throw new Error("A member cannot marry themselves.");
      const dup = tree.marriages.some(
        (x) =>
          (x.spouseAId === input.spouseAId && x.spouseBId === input.spouseBId) ||
          (x.spouseAId === input.spouseBId && x.spouseBId === input.spouseAId),
      );
      if (dup) throw new Error("These two members are already married.");
      return commit({
        ...tree,
        marriages: [...tree.marriages, { id: `mar-${seq++}`, startYear: null, endYear: null, ...input } as TreeDTO["marriages"][number]],
      });
    },
    async deleteMarriage(id) {
      return commit({ ...tree, marriages: tree.marriages.filter((x) => x.id !== id) });
    },
    async importNasab(text) {
      const { members, newRootId } = applyNasabLines(tree.members, tree.lineage, text, () => `local-${Date.now()}-${seq++}`);
      const rootMemberId =
        newRootId && (!tree.rootMemberId || members.find((m) => m.id === tree.rootMemberId)?.fatherId)
          ? newRootId
          : tree.rootMemberId;
      return commit({ ...tree, members, rootMemberId });
    },
    async updateTree(input) {
      return commit({
        ...tree, ...input,
        settings: input.settings === undefined ? tree.settings : input.settings,
      } as TreeDTO);
    },
  };
}
