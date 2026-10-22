import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { Prisma, type Citation, type Media, type Member, type Source } from "@prisma/client";
import { computeGenerations, parentAssignmentError } from "../genealogy";
import type { CitationDTO, MediaDTO, MemberDTO, PosterSettings, SourceDTO, TreeDTO, TreeSummary } from "../types";
import { parseNasab, planNasabImport, splitNasabLines } from "../nasab";
import { GEDCOM_MAX_PEOPLE, parseGedcom, planGedcomImport } from "../gedcom";
import { planRestore, snapshotError } from "../restore";
import { planMergeSources } from "../sources";
import { readProjectFile, withNewIds } from "../project";
import { restoreTreeSchema } from "../validation";
import type {
  CreateCitationInput, CreateMarriageInput, CreateMediaInput, CreateMemberInput, CreateSourceInput, CreateTreeInput,
  ImportGedcomInput, ImportNasabInput, RestoreTreeInput, UndoImportInput, UpdateMediaInput, UpdateMemberInput, UpdateSourceInput,
  UpdateTreeInput,
} from "../validation";
import { prisma } from "./prisma";

export class DomainError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

/** Shown when a change was made from a copy of the tree that is no longer current. */
export const CONFLICT_MESSAGE = "This family was changed in another tab or window. Please reload to see the latest version.";

type Db = Prisma.TransactionClient | typeof prisma;

const toMemberDTO = (m: Member): MemberDTO => ({
  id: m.id, name: m.name, laqab: m.laqab, gender: m.gender, birthYear: m.birthYear,
  deathYear: m.deathYear, isDeceased: m.isDeceased, birthOrder: m.birthOrder,
  generation: m.generation, notes: m.notes, fatherId: m.fatherId, motherId: m.motherId,
});
const toSourceDTO = (s: Source): SourceDTO => ({ id: s.id, title: s.title, author: s.author, publication: s.publication, notes: s.notes });
const toCitationDTO = (c: Citation): CitationDTO => ({ id: c.id, sourceId: c.sourceId, memberId: c.memberId, eventType: c.eventType, page: c.page });
const toMediaDTO = (m: Media): MediaDTO => ({
  id: m.id, memberId: m.memberId, sourceId: m.sourceId, url: m.url, caption: m.caption, fileType: m.fileType,
});

export async function listTrees(): Promise<TreeSummary[]> {
  const trees = await prisma.familyTree.findMany({
    orderBy: { updatedAt: "desc" },
    include: { _count: { select: { members: true } } },
  });
  return trees.map((t) => ({
    id: t.id, name: t.name, title: t.title, memberCount: t._count.members,
    updatedAt: t.updatedAt.toISOString(),
    pinned: !!(t.settings as { pinned?: unknown } | null)?.pinned,
  }));
}

/**
 * Pins a family to the top of the start page's list (or unpins it). Its
 * other settings stay as they are, and so does its "last edited" time:
 * pinning is not an edit of the family.
 */
export async function setPinned(treeId: string, pinned: boolean): Promise<{ id: string; pinned: boolean }> {
  const tree = await prisma.familyTree.findUnique({ where: { id: treeId }, select: { settings: true, updatedAt: true } });
  if (!tree) throw new DomainError("Tree not found.", 404);
  const settings = { ...((tree.settings as Record<string, unknown> | null) ?? {}), pinned };
  await prisma.familyTree.update({ where: { id: treeId }, data: { settings: settings as Prisma.InputJsonValue, updatedAt: tree.updatedAt } });
  return { id: treeId, pinned };
}

/** The whole tree, with its version (see TreeDTO.version). */
async function loadTree(db: Db, treeId: string): Promise<TreeDTO> {
  const tree = await db.familyTree.findUnique({
    where: { id: treeId },
    include: {
      members: { orderBy: [{ generation: "asc" }, { birthOrder: "asc" }] },
      marriages: true,
      sources: { orderBy: { createdAt: "asc" } },
      media: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!tree) throw new DomainError("Tree not found", 404);
  const citations = await db.citation.findMany({ where: { member: { treeId } }, orderBy: { createdAt: "asc" } });
  return {
    id: tree.id, name: tree.name, title: tree.title, subtitle: tree.subtitle,
    lineage: tree.lineage, rootMemberId: tree.rootMemberId, crownBaseId: tree.crownBaseId,
    trunkStartId: tree.trunkStartId, soilText: tree.soilText,
    settings: (tree.settings as PosterSettings | null) ?? null,
    members: tree.members.map(toMemberDTO),
    marriages: tree.marriages.map((m) => ({
      id: m.id, spouseAId: m.spouseAId, spouseBId: m.spouseBId, startYear: m.startYear, endYear: m.endYear,
    })),
    sources: tree.sources.map(toSourceDTO),
    citations: citations.map(toCitationDTO),
    media: tree.media.map(toMediaDTO),
    version: tree.updatedAt.toISOString(),
  };
}

export const getTree = (treeId: string) => loadTree(prisma, treeId);

/**
 * Every change to a tree goes through here, in one transaction:
 *  1. the tree's row is locked (concurrent changes wait their turn);
 *  2. if the caller says which version it saw (If-Match) and the tree has
 *     changed since, nothing is written: 409, "changed in another tab";
 *  3. the change runs, generations are recomputed, and the version moves on.
 * Without step 2 a second tab's undo would silently overwrite the first's
 * work; with it, the second tab is told to reload.
 */
async function changeTree(
  treeId: string,
  expectedVersion: string | undefined,
  work: (tx: Prisma.TransactionClient, tree: TreeDTO) => Promise<void>,
  timeout = 20_000,
): Promise<TreeDTO> {
  await prisma.$transaction(
    async (tx) => {
      const rows = await tx.$queryRaw<{ updatedAt: Date }[]>`SELECT "updatedAt" FROM "FamilyTree" WHERE "id" = ${treeId} FOR UPDATE`;
      if (!rows.length) throw new DomainError("Tree not found", 404);
      const seen = rows[0].updatedAt;
      if (expectedVersion !== undefined && seen.toISOString() !== expectedVersion) throw new DomainError(CONFLICT_MESSAGE, 409);
      await work(tx, await loadTree(tx, treeId));
      await refreshGenerations(tx, treeId);
      // strictly later than the version just checked, even within one millisecond
      await tx.familyTree.update({ where: { id: treeId }, data: { updatedAt: new Date(Math.max(Date.now(), seen.getTime() + 1)) } });
    },
    { timeout },
  );
  return getTree(treeId);
}

/** The tree a member, marriage, citation or media row belongs to. */
async function treeOf(kind: "member" | "marriage" | "citation" | "media" | "source", id: string): Promise<string> {
  const row =
    kind === "member" ? await prisma.member.findUnique({ where: { id }, select: { treeId: true } })
    : kind === "source" ? await prisma.source.findUnique({ where: { id }, select: { treeId: true } })
    : kind === "marriage" ? await prisma.marriage.findUnique({ where: { id }, select: { treeId: true } })
    : kind === "media" ? await prisma.media.findUnique({ where: { id }, select: { treeId: true } })
    : await prisma.citation.findUnique({ where: { id }, select: { member: { select: { treeId: true } } } }).then((c) => c && { treeId: c.member.treeId });
  if (!row) throw new DomainError(`${kind[0].toUpperCase()}${kind.slice(1)} not found`, 404);
  return row.treeId;
}

export async function createTree(input: CreateTreeInput): Promise<TreeDTO> {
  const tree = await prisma.familyTree.create({ data: input });
  return getTree(tree.id);
}

export async function updateTree(treeId: string, input: UpdateTreeInput, version?: string): Promise<TreeDTO> {
  const { settings, rootMemberId, crownBaseId, trunkStartId, ...rest } = input;
  return changeTree(treeId, version, async (tx, tree) => {
    for (const id of [rootMemberId, crownBaseId, trunkStartId]) {
      if (id && !tree.members.some((m) => m.id === id)) throw new DomainError("Member is not in this tree.");
    }
    await tx.familyTree.update({
      where: { id: treeId },
      data: {
        ...rest,
        ...(rootMemberId !== undefined ? { rootMemberId } : {}),
        ...(crownBaseId !== undefined ? { crownBaseId } : {}),
        ...(trunkStartId !== undefined ? { trunkStartId } : {}),
        // null clears the settings (a JSON null), undefined leaves them as they are
        ...(settings !== undefined ? { settings: settings === null ? Prisma.JsonNull : (settings as Prisma.InputJsonValue) } : {}),
      },
    });
  });
}

export async function deleteTree(treeId: string) {
  await prisma.familyTree.delete({ where: { id: treeId } });
}

export async function createMember(treeId: string, input: CreateMemberInput, version?: string): Promise<TreeDTO> {
  const { spouseOfId, parentOfId, ...fields } = input;
  return changeTree(treeId, version, async (tx, tree) => {
    assertParents(tree.members, null, fields.fatherId, fields.motherId);
    if (spouseOfId && !tree.members.some((m) => m.id === spouseOfId)) throw new DomainError("Spouse is not in this tree.");
    const up = parentOfId ? parentSlot(tree, parentOfId, fields.gender) : null;
    const birthOrder = fields.birthOrder ?? nextBirthOrder(tree.members, fields.fatherId, fields.motherId);
    const member = await tx.member.create({
      data: { ...fields, birthOrder, isDeceased: fields.isDeceased ?? !!fields.deathYear, treeId },
    });
    if (spouseOfId) await tx.marriage.create({ data: { treeId, spouseAId: spouseOfId, spouseBId: member.id } });
    if (up) {
      await tx.member.update({ where: { id: up.childId }, data: { [up.role]: member.id } });
      if (up.newRoot) await tx.familyTree.update({ where: { id: treeId }, data: { rootMemberId: member.id } });
    }
    // The first member becomes the tree root by default.
    if (!tree.rootMemberId && tree.members.length === 0) {
      await tx.familyTree.update({ where: { id: treeId }, data: { rootMemberId: member.id } });
    }
  });
}

/**
 * Where a new parent of `childId` goes: the father's place (the mother's,
 * for a woman), which must be empty. When the child is the tree's root and
 * the new parent is on the line (the father in a patrilineal tree), the
 * root moves up to the parent, so the poster grows upward with him.
 */
function parentSlot(tree: TreeDTO, childId: string, gender: string | undefined) {
  const child = tree.members.find((m) => m.id === childId);
  if (!child) throw new DomainError("That person is not in this tree.");
  const role = gender === "FEMALE" ? ("motherId" as const) : ("fatherId" as const);
  if (child[role]) throw new DomainError(`${child.name} already has a ${role === "fatherId" ? "father" : "mother"}.`);
  const onLine = (tree.lineage === "MATRILINEAL") === (role === "motherId");
  return { childId, role, newRoot: onLine && tree.rootMemberId === childId };
}

export async function updateMember(memberId: string, input: UpdateMemberInput, version?: string): Promise<TreeDTO> {
  return changeTree(await treeOf("member", memberId), version, async (tx, tree) => {
    const existing = tree.members.find((m) => m.id === memberId)!;
    const fatherId = input.fatherId === undefined ? existing.fatherId : input.fatherId;
    const motherId = input.motherId === undefined ? existing.motherId : input.motherId;
    assertParents(tree.members, memberId, fatherId, motherId);
    // a recorded death year implies deceased, unless the caller says otherwise
    const isDeceased = input.isDeceased ?? (input.deathYear ? true : undefined);
    await tx.member.update({ where: { id: memberId }, data: { ...input, ...(isDeceased !== undefined ? { isDeceased } : {}) } });
  });
}

export async function deleteMember(memberId: string, version?: string): Promise<TreeDTO> {
  // Children keep existing; their parent link is nulled by the FK (SetNull).
  // Marriages, citations and media of the person cascade.
  return changeTree(await treeOf("member", memberId), version, async (tx) => {
    await tx.member.delete({ where: { id: memberId } });
  });
}

export async function createMarriage(treeId: string, input: CreateMarriageInput, version?: string): Promise<TreeDTO> {
  if (input.spouseAId === input.spouseBId) throw new DomainError("A member cannot marry themselves.");
  return changeTree(treeId, version, async (tx, tree) => {
    for (const id of [input.spouseAId, input.spouseBId]) {
      if (!tree.members.some((m) => m.id === id)) throw new DomainError("Member is not in this tree.");
    }
    const dup = tree.marriages.some(
      (x) =>
        (x.spouseAId === input.spouseAId && x.spouseBId === input.spouseBId) ||
        (x.spouseAId === input.spouseBId && x.spouseBId === input.spouseAId),
    );
    if (dup) throw new DomainError("These two members are already married.");
    await tx.marriage.create({ data: { ...input, treeId } });
  });
}

export async function deleteMarriage(marriageId: string, version?: string): Promise<TreeDTO> {
  return changeTree(await treeOf("marriage", marriageId), version, async (tx) => {
    await tx.marriage.delete({ where: { id: marriageId } });
  });
}

// ── Sources, citations, media ──────────────────────────────────────────────

export async function createSource(treeId: string, input: CreateSourceInput, version?: string): Promise<TreeDTO> {
  return changeTree(treeId, version, async (tx) => {
    await tx.source.create({
      data: { treeId, title: input.title, author: input.author ?? null, publication: input.publication ?? null, notes: input.notes ?? null },
    });
  });
}

export async function updateSource(sourceId: string, input: UpdateSourceInput, version?: string): Promise<TreeDTO> {
  return changeTree(await treeOf("source", sourceId), version, async (tx) => {
    await tx.source.update({ where: { id: sourceId }, data: input });
  });
}

/** Removes a source with its citations and its files' links (the people stay). */
export async function deleteSource(sourceId: string, version?: string): Promise<TreeDTO> {
  return changeTree(await treeOf("source", sourceId), version, async (tx) => {
    await tx.source.delete({ where: { id: sourceId } });
  });
}

/**
 * Merges one source into another (duplicates): citations and files move,
 * ones the kept source already has are dropped, its blanks are filled, and
 * the merged source is removed. The plan is the same pure function the
 * demo and the tests use (src/lib/sources.ts).
 */
export async function mergeSources(fromId: string, intoId: string, version?: string): Promise<TreeDTO> {
  return changeTree(await treeOf("source", fromId), version, async (tx, tree) => {
    if (!tree.sources.some((x) => x.id === intoId)) throw new DomainError("Both sources must belong to this family.");
    let m;
    try {
      m = planMergeSources(tree, fromId, intoId);
    } catch (e) {
      throw new DomainError(e instanceof Error ? e.message : String(e));
    }
    const { id, ...fields } = m.into;
    await tx.source.update({ where: { id }, data: fields });
    if (m.dropCitationIds.length) await tx.citation.deleteMany({ where: { id: { in: m.dropCitationIds } } });
    if (m.moveCitations.length) await tx.citation.updateMany({ where: { id: { in: m.moveCitations.map((c) => c.id) } }, data: { sourceId: intoId } });
    if (m.dropMediaIds.length) await tx.media.deleteMany({ where: { treeId: tree.id, id: { in: m.dropMediaIds } } });
    if (m.moveMedia.length) await tx.media.updateMany({ where: { treeId: tree.id, id: { in: m.moveMedia.map((x) => x.id) } }, data: { sourceId: intoId } });
    await tx.source.delete({ where: { id: m.removeSourceId } });
  });
}

export async function createCitation(treeId: string, input: CreateCitationInput, version?: string): Promise<TreeDTO> {
  return changeTree(treeId, version, async (tx, tree) => {
    if (!tree.sources.some((x) => x.id === input.sourceId)) throw new DomainError("Source is not in this tree.");
    if (!tree.members.some((m) => m.id === input.memberId)) throw new DomainError("Member is not in this tree.");
    await tx.citation.create({
      data: { sourceId: input.sourceId, memberId: input.memberId, eventType: input.eventType ?? null, page: input.page ?? null },
    });
  });
}

export async function deleteCitation(citationId: string, version?: string): Promise<TreeDTO> {
  return changeTree(await treeOf("citation", citationId), version, async (tx) => {
    await tx.citation.delete({ where: { id: citationId } });
  });
}

export async function createMedia(treeId: string, input: CreateMediaInput, version?: string): Promise<TreeDTO> {
  return changeTree(treeId, version, async (tx, tree) => {
    if (input.memberId && !tree.members.some((m) => m.id === input.memberId)) throw new DomainError("Member is not in this tree.");
    if (input.sourceId && !tree.sources.some((x) => x.id === input.sourceId)) throw new DomainError("Source is not in this tree.");
    await tx.media.create({
      data: {
        treeId, memberId: input.memberId ?? null, sourceId: input.sourceId ?? null,
        url: input.url, caption: input.caption ?? null, fileType: input.fileType ?? null,
      },
    });
  });
}

export async function updateMedia(mediaId: string, input: UpdateMediaInput, version?: string): Promise<TreeDTO> {
  return changeTree(await treeOf("media", mediaId), version, async (tx) => {
    await tx.media.update({ where: { id: mediaId }, data: input });
  });
}

export async function deleteMedia(mediaId: string, version?: string): Promise<TreeDTO> {
  return changeTree(await treeOf("media", mediaId), version, async (tx) => {
    await tx.media.delete({ where: { id: mediaId } });
  });
}

/** Largest uploaded file. */
export const MEDIA_MAX_BYTES = 5 * 1024 * 1024;
export const MEDIA_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp", "application/pdf"];

/**
 * Stores an uploaded file under its SHA-256 and returns the URL to put in a
 * Media row. The same file uploaded twice is stored once. Files are never
 * deleted with their Media row, so undoing "remove photo" brings it back.
 */
export async function saveMediaBlob(data: Uint8Array, fileType: string): Promise<{ url: string; fileType: string; size: number }> {
  if (!MEDIA_TYPES.includes(fileType)) throw new DomainError("Upload a JPEG, PNG, GIF or WebP image, or a PDF.", 415);
  if (data.byteLength === 0) throw new DomainError("The file is empty.");
  if (data.byteLength > MEDIA_MAX_BYTES) throw new DomainError("Files up to 5 MB can be uploaded.", 413);
  const id = createHash("sha256").update(data).digest("hex");
  await prisma.mediaBlob.upsert({
    where: { id },
    create: { id, data: Buffer.from(data), fileType, size: data.byteLength },
    update: {},
  });
  return { url: `/api/media/blob/${id}`, fileType, size: data.byteLength };
}

export async function getMediaBlob(id: string) {
  if (!/^[0-9a-f]{64}$/.test(id)) return null;
  return prisma.mediaBlob.findUnique({ where: { id } });
}

// ── Imports, undo, restore ─────────────────────────────────────────────────

/**
 * Imports one nasab per line. Shared ancestors are reused, older ancestors
 * are added above an existing root, and only genuinely new people are
 * created, all in one transaction.
 */
export async function importNasab(treeId: string, input: ImportNasabInput, version?: string): Promise<TreeDTO> {
  const lines = splitNasabLines(input.text);
  if (!lines.length) throw new DomainError("Paste at least one nasab.");
  return changeTree(
    treeId,
    version,
    async (tx, tree) => {
      // Keep an in-memory copy up to date as rows are created, so later
      // lines see earlier imports without re-reading the tree.
      const members: MemberDTO[] = [...tree.members];
      let rootMemberId = tree.rootMemberId;
      const create = async (e: { name: string; laqab: string | null }, fatherId: string | null, female: boolean) => {
        const row = await tx.member.create({
          data: { treeId, name: e.name, laqab: e.laqab, gender: female ? "FEMALE" : "MALE", fatherId },
        });
        members.push(toMemberDTO(row));
        return row.id;
      };
      for (const line of lines) {
        const { entries, gender } = parseNasab(line);
        if (entries.length === 0) continue;
        const plan = planNasabImport(members, tree.lineage, entries, rootMemberId);
        // 1. older ancestors above an existing root
        let parentId: string | null = null;
        let top: string | null = null;
        for (const e of plan.ancestorsToCreate) {
          parentId = await create(e, parentId, false);
          top ??= parentId;
        }
        if (plan.adoptedRootId) {
          await tx.member.update({ where: { id: plan.adoptedRootId }, data: { fatherId: parentId } });
          const adopted = members.find((m) => m.id === plan.adoptedRootId);
          if (adopted) adopted.fatherId = parentId;
          if (top && (rootMemberId === plan.adoptedRootId || !rootMemberId)) {
            await tx.familyTree.update({ where: { id: treeId }, data: { rootMemberId: top } });
            rootMemberId = top;
          }
        }
        // 2. new descendants below the matched chain
        const hadMembers = members.length > 0;
        parentId = plan.matched.at(-1)?.id ?? null;
        let firstCreated: string | null = null;
        for (const [i, e] of plan.descendantsToCreate.entries()) {
          const female = gender === "FEMALE" && i === plan.descendantsToCreate.length - 1;
          parentId = await create(e, parentId, female);
          firstCreated ??= parentId;
        }
        if (!rootMemberId && !hadMembers && firstCreated) {
          await tx.familyTree.update({ where: { id: treeId }, data: { rootMemberId: firstCreated } });
          rootMemberId = firstCreated;
        }
      }
    },
    60_000, // long nasabs create ~100 rows one by one
  );
}

/** New members, parents before children, one statement per generation. */
async function insertMembers(tx: Prisma.TransactionClient, treeId: string, members: MemberDTO[]) {
  const fresh = new Map(members.map((m) => [m.id, m]));
  const level = new Map<string, number>();
  const levelOf = (id: string): number => {
    if (level.has(id)) return level.get(id)!;
    level.set(id, 0); // plans have no cycles; this only guards the recursion
    const m = fresh.get(id)!;
    const parents = [m.fatherId, m.motherId].filter((p): p is string => !!p && fresh.has(p));
    const l = parents.length ? 1 + Math.max(...parents.map(levelOf)) : 0;
    level.set(id, l);
    return l;
  };
  const byLevel: MemberDTO[][] = [];
  for (const m of members) (byLevel[levelOf(m.id)] ??= []).push(m);
  for (const batch of byLevel) {
    if (!batch?.length) continue;
    await tx.member.createMany({
      data: batch.map(({ id, name, laqab, gender, birthYear, deathYear, isDeceased, birthOrder, generation, notes, fatherId, motherId }) => ({
        id, treeId, name, laqab, gender, birthYear, deathYear, isDeceased, birthOrder, generation, notes, fatherId, motherId,
      })),
    });
  }
}

/**
 * Imports a GEDCOM file: people, sources, citations and media already in the
 * tree are reused, the rest are created, all in one transaction. The plan is
 * the same pure function the editor's preview runs.
 */
export async function importGedcom(treeId: string, input: ImportGedcomInput, version?: string): Promise<TreeDTO> {
  const file = parseGedcom(input.text);
  if (!file.people.length) throw new DomainError(file.warnings.at(-1) ?? "No people found in the file.");
  if (file.people.length > GEDCOM_MAX_PEOPLE) {
    throw new DomainError(`The file has ${file.people.length} people; the limit is ${GEDCOM_MAX_PEOPLE}.`);
  }
  return changeTree(
    treeId,
    version,
    async (tx, tree) => {
      const plan = planGedcomImport(tree, file, () => randomUUID());
      if (plan.newSources.length) await tx.source.createMany({ data: plan.newSources.map((x) => ({ ...x, treeId })) });
      await insertMembers(tx, treeId, plan.newMembers);
      for (const r of plan.relinks) {
        await tx.member.update({ where: { id: r.id }, data: { fatherId: r.fatherId, motherId: r.motherId } });
      }
      if (plan.newMarriages.length) await tx.marriage.createMany({ data: plan.newMarriages.map((m) => ({ ...m, treeId })) });
      if (plan.newCitations.length) await tx.citation.createMany({ data: plan.newCitations });
      if (plan.newMedia.length) await tx.media.createMany({ data: plan.newMedia.map((m) => ({ ...m, treeId })) });
      if (plan.rootMemberId !== tree.rootMemberId) {
        await tx.familyTree.update({ where: { id: treeId }, data: { rootMemberId: plan.rootMemberId } });
      }
    },
    120_000,
  );
}

/**
 * Undoes one bulk import: deletes the members, marriages, sources, citations
 * and media it created and gives the members it relinked their parents back.
 * Only touches this tree.
 */
export async function undoImport(treeId: string, input: UndoImportInput, version?: string): Promise<TreeDTO> {
  return changeTree(
    treeId,
    version,
    async (tx, tree) => {
      const inTree = new Set(tree.members.map((m) => m.id));
      const gone = new Set(input.memberIds.filter((id) => inTree.has(id)));
      const keep = (id: string | null) => (id && inTree.has(id) && !gone.has(id) ? id : null);
      await tx.marriage.deleteMany({ where: { treeId, id: { in: input.marriageIds } } });
      await tx.citation.deleteMany({ where: { id: { in: input.citationIds }, member: { treeId } } });
      await tx.media.deleteMany({ where: { treeId, id: { in: input.mediaIds } } });
      for (const r of input.restore) {
        if (!inTree.has(r.id) || gone.has(r.id)) continue;
        await tx.member.update({ where: { id: r.id }, data: { fatherId: keep(r.fatherId), motherId: keep(r.motherId) } });
      }
      // children of removed people lose that parent (SetNull), as they had no such parent before
      await tx.member.deleteMany({ where: { treeId, id: { in: [...gone] } } });
      await tx.source.deleteMany({ where: { treeId, id: { in: input.sourceIds } } });
      await tx.familyTree.update({ where: { id: treeId }, data: { rootMemberId: keep(input.rootMemberId) } });
    },
    120_000,
  );
}

/**
 * Puts the tree back to a snapshot the editor held (undo/redo), as a diff in
 * one transaction: only rows that differ are written, and ids stay the same,
 * so undoing one edit touches one row and redoing an import re-creates the
 * same people, sources and media links. Refused if the snapshot is not a
 * valid tree, or (409) if the tree changed since the editor last saw it.
 */
export async function restoreTree(treeId: string, input: RestoreTreeInput, version?: string): Promise<TreeDTO> {
  const err = snapshotError(input);
  if (err) throw new DomainError(`Cannot restore: ${err}`);
  return changeTree(
    treeId,
    version,
    async (tx, current) => {
      // A restored id that lives in ANOTHER tree would be moved here: refuse.
      const [foreignMember, foreignSource, foreignMedia] = await Promise.all([
        tx.member.findFirst({ where: { id: { in: input.members.map((m) => m.id) }, NOT: { treeId } }, select: { id: true } }),
        tx.source.findFirst({ where: { id: { in: input.sources.map((x) => x.id) }, NOT: { treeId } }, select: { id: true } }),
        tx.media.findFirst({ where: { id: { in: input.media.map((x) => x.id) }, NOT: { treeId } }, select: { id: true } }),
      ]);
      if (foreignMember || foreignSource || foreignMedia) {
        throw new DomainError("Cannot restore: the snapshot refers to another family's records.");
      }
      const plan = planRestore(current, input);
      // 1. tier pointers off members that may go (they are @unique); rows that are gone
      await tx.familyTree.update({ where: { id: treeId }, data: { rootMemberId: null, crownBaseId: null, trunkStartId: null } });
      if (plan.marriages.delete.length) await tx.marriage.deleteMany({ where: { treeId, id: { in: plan.marriages.delete } } });
      if (plan.citations.delete.length) await tx.citation.deleteMany({ where: { id: { in: plan.citations.delete }, member: { treeId } } });
      if (plan.media.delete.length) await tx.media.deleteMany({ where: { treeId, id: { in: plan.media.delete } } });
      // 2. sources first (citations and media point at them), then people, parents first
      if (plan.sources.create.length) await tx.source.createMany({ data: plan.sources.create.map((x) => ({ ...x, treeId })) });
      for (const u of plan.sources.update) await tx.source.update({ where: { id: u.id }, data: u.data });
      await insertMembers(tx, treeId, plan.createMembers);
      // 3. changed people (their new parents exist now), then the ones that are gone
      for (const u of plan.updateMembers) await tx.member.update({ where: { id: u.id }, data: u.data });
      if (plan.deleteMemberIds.length) await tx.member.deleteMany({ where: { treeId, id: { in: plan.deleteMemberIds } } });
      if (plan.sources.delete.length) await tx.source.deleteMany({ where: { treeId, id: { in: plan.sources.delete } } });
      // 4. marriages, citations, media
      if (plan.marriages.create.length) await tx.marriage.createMany({ data: plan.marriages.create.map((x) => ({ ...x, treeId })) });
      for (const u of plan.marriages.update) await tx.marriage.update({ where: { id: u.id }, data: u.data });
      if (plan.citations.create.length) await tx.citation.createMany({ data: plan.citations.create });
      for (const u of plan.citations.update) await tx.citation.update({ where: { id: u.id }, data: u.data });
      if (plan.media.create.length) await tx.media.createMany({ data: plan.media.create.map((x) => ({ ...x, treeId })) });
      for (const u of plan.media.update) await tx.media.update({ where: { id: u.id }, data: u.data });
      // 5. the tree's own fields
      const { settings, ...fields } = plan.tree;
      await tx.familyTree.update({
        where: { id: treeId },
        data: {
          ...fields,
          rootMemberId: input.rootMemberId,
          crownBaseId: input.crownBaseId,
          trunkStartId: input.trunkStartId,
          ...(settings !== undefined ? { settings: settings === null ? Prisma.JsonNull : (settings as Prisma.InputJsonValue) } : {}),
        },
      });
    },
    120_000,
  );
}

/** Recomputes the denormalised `generation` column inside the change's transaction. */
async function refreshGenerations(tx: Prisma.TransactionClient, treeId: string) {
  const tree = await tx.familyTree.findUnique({ where: { id: treeId }, select: { lineage: true } });
  if (!tree) return;
  const members = (await tx.member.findMany({ where: { treeId } })).map(toMemberDTO);
  const gens = computeGenerations(members, tree.lineage);
  for (const m of members) {
    const g = gens.get(m.id) ?? 0;
    if (g !== m.generation) await tx.member.update({ where: { id: m.id }, data: { generation: g } });
  }
}

function assertParents(
  members: MemberDTO[], memberId: string | null, fatherId?: string | null, motherId?: string | null,
) {
  const err =
    parentAssignmentError(members, memberId, fatherId, "father") ??
    parentAssignmentError(members, memberId, motherId, "mother");
  if (err) throw new DomainError(err);
}

function nextBirthOrder(members: MemberDTO[], fatherId?: string | null, motherId?: string | null) {
  const siblings = members.filter(
    (m) => (fatherId && m.fatherId === fatherId) || (!fatherId && motherId && m.motherId === motherId),
  );
  return siblings.length ? Math.max(...siblings.map((s) => s.birthOrder)) + 1 : 0;
}

/**
 * Opens a project file (.shajarah) as a new family: its photos and
 * documents are stored, every record gets a new id (the same file can be
 * opened twice), and the family is rebuilt in one restore. If that fails,
 * the half-made family is removed again.
 */
export async function openProject(text: string): Promise<TreeDTO> {
  let file;
  try {
    file = readProjectFile(text);
  } catch (err) {
    throw new DomainError((err as Error).message);
  }
  for (const blob of Object.values(file.files)) {
    await saveMediaBlob(Buffer.from(blob.data, "base64"), blob.type);
  }
  // photos kept inside the family itself (saved from the demo) become uploads
  const media = [];
  for (const m of file.tree.media) {
    const inline = m.url.match(/^data:([^;,]+);base64,(.*)$/s);
    if (!inline) media.push(m);
    else media.push({ ...m, url: (await saveMediaBlob(Buffer.from(inline[2], "base64"), inline[1])).url });
  }
  const parsed = restoreTreeSchema.safeParse(withNewIds({ ...file.tree, media }, randomUUID));
  if (!parsed.success) throw new DomainError("This project file is damaged and cannot be opened.");
  const snapshot = parsed.data;
  const err = snapshotError(snapshot);
  if (err) throw new DomainError(`This project file cannot be opened: ${err}`);
  const tree = await createTree({ name: snapshot.name, title: snapshot.title, subtitle: snapshot.subtitle, lineage: snapshot.lineage });
  try {
    return await restoreTree(tree.id, snapshot);
  } catch (e) {
    await deleteTree(tree.id).catch(() => {});
    throw e;
  }
}
