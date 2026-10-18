import { computeGenerations, parentAssignmentError } from "@/lib/genealogy";
import type { MediaDTO, MemberDTO, TreeDTO } from "@/lib/types";
import { applyNasabLines } from "@/lib/nasab";
import { parseGedcom, planGedcomImport } from "@/lib/gedcom";
import { undoImportLocally, type ImportReceipt } from "@/lib/imports";
import { snapshotError } from "@/lib/restore";
import { applyMergeSources, planMergeSources } from "@/lib/sources";
import type {
  CreateCitationInput, CreateMarriageInput, CreateMediaInput, CreateMemberInput, CreateSourceInput, UpdateMediaInput,
  UpdateMemberInput, UpdateSourceInput, UpdateTreeInput,
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
  /** The text of a GEDCOM file; reuses people already in the tree. */
  importGedcom(text: string): Promise<TreeDTO>;
  /** Removes what one import added (see importReceipt). */
  undoImport(receipt: ImportReceipt): Promise<TreeDTO>;
  /** Puts the whole tree back to a snapshot (undo/redo). */
  restore(snapshot: TreeDTO): Promise<TreeDTO>;
  createSource(input: CreateSourceInput): Promise<TreeDTO>;
  updateSource(id: string, input: UpdateSourceInput): Promise<TreeDTO>;
  /** Removes a source with its citations and file links. */
  deleteSource(id: string): Promise<TreeDTO>;
  /** Moves everything of `fromId` to `intoId` (dropping repeats) and removes `fromId`. */
  mergeSources(fromId: string, intoId: string): Promise<TreeDTO>;
  createCitation(input: CreateCitationInput): Promise<TreeDTO>;
  deleteCitation(id: string): Promise<TreeDTO>;
  /** Stores a file and returns the URL to attach (does not change the tree). */
  uploadMedia(file: File): Promise<{ url: string; fileType: string }>;
  createMedia(input: CreateMediaInput): Promise<TreeDTO>;
  updateMedia(id: string, input: UpdateMediaInput): Promise<TreeDTO>;
  deleteMedia(id: string): Promise<TreeDTO>;
}

/** The tree changed on the server since this editor loaded it (another tab, another device). */
export class ConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConflictError";
  }
}

const MEDIA_MAX_BYTES = 5 * 1024 * 1024;
const MEDIA_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp", "application/pdf"];
const checkUpload = (file: File) => {
  if (!MEDIA_TYPES.includes(file.type)) throw new Error("Upload a JPEG, PNG, GIF or WebP image, or a PDF.");
  if (file.size > MEDIA_MAX_BYTES) throw new Error(`${file.name} is larger than 5 MB.`);
};

/**
 * The server-backed repository. Every change carries the tree version this
 * editor last received (If-Match): if another tab changed the tree since,
 * the server refuses with 409 and this throws ConflictError. Changes are
 * sent one at a time, each with the version the previous one returned, so
 * the editor never conflicts with itself (a settings save racing an edit).
 */
export function apiRepository(treeId: string, initialVersion?: string): FamilyRepository {
  let version = initialVersion;
  let queue: Promise<unknown> = Promise.resolve();
  const call = (url: string, method: string, body?: unknown): Promise<TreeDTO> => {
    const run = async () => {
      const headers: Record<string, string> = {};
      if (body) headers["Content-Type"] = "application/json";
      if (version) headers["If-Match"] = version;
      const res = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : undefined });
      const data = await res.json().catch(() => ({}));
      if (res.status === 409) throw new ConflictError(data.error ?? "This family was changed elsewhere. Reload to see the latest version.");
      if (!res.ok) throw new Error(data.error ?? `Request failed (${res.status})`);
      const tree = data as TreeDTO;
      if (tree.version) version = tree.version;
      return tree;
    };
    const next = queue.then(run, run);
    queue = next.catch(() => undefined);
    return next;
  };
  return {
    createMember: (input) => call(`/api/trees/${treeId}/members`, "POST", input),
    updateMember: (id, input) => call(`/api/members/${id}`, "PATCH", input),
    deleteMember: (id) => call(`/api/members/${id}`, "DELETE"),
    createMarriage: (input) => call(`/api/trees/${treeId}/marriages`, "POST", input),
    deleteMarriage: (id) => call(`/api/marriages/${id}`, "DELETE"),
    updateTree: (input) => call(`/api/trees/${treeId}`, "PATCH", input),
    importNasab: (text) => call(`/api/trees/${treeId}/import-nasab`, "POST", { text }),
    importGedcom: (text) => call(`/api/trees/${treeId}/import-gedcom`, "POST", { text }),
    undoImport: (receipt) => call(`/api/trees/${treeId}/undo-import`, "POST", receipt),
    restore: ({ id: _id, version: _v, ...snapshot }) => call(`/api/trees/${treeId}/restore`, "POST", snapshot),
    createSource: (input) => call(`/api/trees/${treeId}/sources`, "POST", input),
    updateSource: (id, input) => call(`/api/sources/${id}`, "PATCH", input),
    deleteSource: (id) => call(`/api/sources/${id}`, "DELETE"),
    mergeSources: (fromId, intoId) => call(`/api/sources/${fromId}/merge`, "POST", { intoId }),
    createCitation: (input) => call(`/api/trees/${treeId}/citations`, "POST", input),
    deleteCitation: (id) => call(`/api/citations/${id}`, "DELETE"),
    uploadMedia: async (file) => {
      checkUpload(file);
      const res = await fetch("/api/media/blob", { method: "POST", headers: { "Content-Type": file.type }, body: file });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? `Upload failed (${res.status})`);
      return { url: data.url as string, fileType: data.fileType as string };
    },
    createMedia: (input) => call(`/api/trees/${treeId}/media`, "POST", input),
    updateMedia: (id, input) => call(`/api/media/${id}`, "PATCH", input),
    deleteMedia: (id) => call(`/api/media/${id}`, "DELETE"),
  };
}

/** In-memory repository for the database-free demo; enforces the same rules. */
export function localRepository(initial: TreeDTO): FamilyRepository {
  let tree = structuredClone(initial);
  let seq = 0;
  const localId = () => `local-${Date.now()}-${seq++}`;
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
    async createMember({ spouseOfId, parentOfId, ...input }) {
      check(null, input.fatherId, input.motherId);
      const child = parentOfId ? tree.members.find((m) => m.id === parentOfId) : undefined;
      if (parentOfId && !child) throw new Error("That person is not in this tree.");
      const role = input.gender === "FEMALE" ? ("motherId" as const) : ("fatherId" as const);
      if (child?.[role]) throw new Error(`${child.name} already has a ${role === "fatherId" ? "father" : "mother"}.`);
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
      const onLine = (tree.lineage === "MATRILINEAL") === (role === "motherId");
      const members = child
        ? [...tree.members.map((m) => (m.id === child.id ? { ...m, [role]: member.id } : m)), member]
        : [...tree.members, member];
      return commit({
        ...tree, members, marriages,
        rootMemberId: child && onLine && tree.rootMemberId === child.id
          ? member.id
          : tree.rootMemberId ?? (tree.members.length ? null : member.id),
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
        trunkStartId: tree.trunkStartId === id ? null : tree.trunkStartId,
        members: tree.members
          .filter((m) => m.id !== id)
          .map((m) => ({
            ...m, fatherId: m.fatherId === id ? null : m.fatherId, motherId: m.motherId === id ? null : m.motherId,
          })),
        marriages: tree.marriages.filter((x) => x.spouseAId !== id && x.spouseBId !== id),
        // their citations and media go with them, as in the database
        citations: tree.citations.filter((c) => c.memberId !== id),
        media: tree.media.filter((x) => x.memberId !== id),
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
    async importGedcom(text) {
      const file = parseGedcom(text);
      if (!file.people.length) throw new Error(file.warnings.at(-1) ?? "No people found in the file.");
      const plan = planGedcomImport(tree, file, () => `local-${Date.now()}-${seq++}`);
      return commit({
        ...tree, members: plan.members, marriages: [...tree.marriages, ...plan.newMarriages], rootMemberId: plan.rootMemberId,
        sources: [...tree.sources, ...plan.newSources], citations: [...tree.citations, ...plan.newCitations],
        media: [...tree.media, ...plan.newMedia],
      });
    },
    async restore(snapshot) {
      const err = snapshotError(snapshot);
      if (err) throw new Error(`Cannot restore: ${err}`);
      return commit(structuredClone({ ...snapshot, id: tree.id }));
    },
    async createSource(input) {
      const source = { id: localId(), title: input.title, author: input.author ?? null, publication: input.publication ?? null, notes: input.notes ?? null };
      return commit({ ...tree, sources: [...tree.sources, source] });
    },
    async updateSource(id, input) {
      return commit({ ...tree, sources: tree.sources.map((x) => (x.id === id ? { ...x, ...input } : x)) });
    },
    async deleteSource(id) {
      return commit({
        ...tree,
        sources: tree.sources.filter((x) => x.id !== id),
        citations: tree.citations.filter((c) => c.sourceId !== id),
        media: tree.media.filter((x) => x.sourceId !== id),
      });
    },
    async mergeSources(fromId, intoId) {
      return commit(applyMergeSources(tree, planMergeSources(tree, fromId, intoId)));
    },
    async createCitation(input) {
      if (!tree.sources.some((x) => x.id === input.sourceId)) throw new Error("Source is not in this tree.");
      if (!tree.members.some((m) => m.id === input.memberId)) throw new Error("Member is not in this tree.");
      const citation = { id: localId(), sourceId: input.sourceId, memberId: input.memberId, eventType: input.eventType ?? null, page: input.page ?? null };
      return commit({ ...tree, citations: [...tree.citations, citation] });
    },
    async deleteCitation(id) {
      return commit({ ...tree, citations: tree.citations.filter((c) => c.id !== id) });
    },
    async uploadMedia(file) {
      // no server in the demo: the file lives in the page as a data: URL
      checkUpload(file);
      const url = await new Promise<string>((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(String(r.result));
        r.onerror = () => reject(r.error ?? new Error("Could not read the file"));
        r.readAsDataURL(file);
      });
      return { url, fileType: file.type };
    },
    async createMedia(input) {
      const media: MediaDTO = {
        id: localId(), memberId: input.memberId ?? null, sourceId: input.sourceId ?? null,
        url: input.url, caption: input.caption ?? null, fileType: input.fileType ?? null,
      };
      return commit({ ...tree, media: [...tree.media, media] });
    },
    async updateMedia(id, input) {
      return commit({ ...tree, media: tree.media.map((x) => (x.id === id ? { ...x, ...input } : x)) });
    },
    async deleteMedia(id) {
      return commit({ ...tree, media: tree.media.filter((x) => x.id !== id) });
    },
    async undoImport(receipt) {
      return commit(undoImportLocally(tree, receipt));
    },
    async updateTree(input) {
      return commit({
        ...tree, ...input,
        settings: input.settings === undefined ? tree.settings : input.settings,
      } as TreeDTO);
    },
  };
}
