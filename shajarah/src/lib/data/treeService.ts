import "server-only";
import { Prisma, type Member } from "@prisma/client";
import { computeGenerations, parentAssignmentError } from "../genealogy";
import type { MemberDTO, PosterSettings, TreeDTO, TreeSummary } from "../types";
import { parseNasab, planNasabImport, splitNasabLines } from "../nasab";
import type {
  CreateMarriageInput, CreateMemberInput, CreateTreeInput, ImportNasabInput, UpdateMemberInput, UpdateTreeInput,
} from "../validation";
import { prisma } from "./prisma";

export class DomainError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

const toMemberDTO = (m: Member): MemberDTO => ({
  id: m.id, name: m.name, laqab: m.laqab, gender: m.gender, birthYear: m.birthYear,
  deathYear: m.deathYear, isDeceased: m.isDeceased, birthOrder: m.birthOrder,
  generation: m.generation, notes: m.notes, fatherId: m.fatherId, motherId: m.motherId,
});

export async function listTrees(): Promise<TreeSummary[]> {
  const trees = await prisma.familyTree.findMany({
    orderBy: { updatedAt: "desc" },
    include: { _count: { select: { members: true } } },
  });
  return trees.map((t) => ({
    id: t.id, name: t.name, title: t.title, memberCount: t._count.members,
    updatedAt: t.updatedAt.toISOString(),
  }));
}

export async function getTree(treeId: string): Promise<TreeDTO> {
  const tree = await prisma.familyTree.findUnique({
    where: { id: treeId },
    include: { members: { orderBy: [{ generation: "asc" }, { birthOrder: "asc" }] }, marriages: true },
  });
  if (!tree) throw new DomainError("Tree not found", 404);
  return {
    id: tree.id, name: tree.name, title: tree.title, subtitle: tree.subtitle,
    lineage: tree.lineage, rootMemberId: tree.rootMemberId, crownBaseId: tree.crownBaseId,
    trunkStartId: tree.trunkStartId, soilText: tree.soilText,
    settings: (tree.settings as PosterSettings | null) ?? null,
    members: tree.members.map(toMemberDTO),
    marriages: tree.marriages.map((m) => ({
      id: m.id, spouseAId: m.spouseAId, spouseBId: m.spouseBId, startYear: m.startYear, endYear: m.endYear,
    })),
  };
}

export async function createTree(input: CreateTreeInput): Promise<TreeDTO> {
  const tree = await prisma.familyTree.create({ data: input });
  return getTree(tree.id);
}

export async function updateTree(treeId: string, input: UpdateTreeInput): Promise<TreeDTO> {
  const { settings, rootMemberId, crownBaseId, trunkStartId, ...rest } = input;
  if (rootMemberId) await assertMemberInTree(treeId, rootMemberId);
  if (crownBaseId) await assertMemberInTree(treeId, crownBaseId);
  if (trunkStartId) await assertMemberInTree(treeId, trunkStartId);
  await prisma.familyTree.update({
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
  if (input.lineage) await refreshGenerations(treeId);
  return getTree(treeId);
}

export async function deleteTree(treeId: string) {
  await prisma.familyTree.delete({ where: { id: treeId } });
}

export async function createMember(treeId: string, input: CreateMemberInput): Promise<TreeDTO> {
  const tree = await getTree(treeId);
  const { spouseOfId, ...fields } = input;
  assertParents(tree.members, null, fields.fatherId, fields.motherId);
  if (spouseOfId && !tree.members.some((m) => m.id === spouseOfId)) {
    throw new DomainError("Spouse is not in this tree.");
  }
  const birthOrder = fields.birthOrder ?? nextBirthOrder(tree.members, fields.fatherId, fields.motherId);
  await prisma.$transaction(async (tx) => {
    const member = await tx.member.create({
      data: { ...fields, birthOrder, isDeceased: fields.isDeceased ?? !!fields.deathYear, treeId },
    });
    if (spouseOfId) {
      await tx.marriage.create({ data: { treeId, spouseAId: spouseOfId, spouseBId: member.id } });
    }
    // The first member becomes the tree root by default.
    if (!tree.rootMemberId && tree.members.length === 0) {
      await tx.familyTree.update({ where: { id: treeId }, data: { rootMemberId: member.id } });
    }
  });
  return refreshGenerations(treeId);
}

export async function updateMember(memberId: string, input: UpdateMemberInput): Promise<TreeDTO> {
  const existing = await prisma.member.findUnique({ where: { id: memberId } });
  if (!existing) throw new DomainError("Member not found", 404);
  const tree = await getTree(existing.treeId);
  const fatherId = input.fatherId === undefined ? existing.fatherId : input.fatherId;
  const motherId = input.motherId === undefined ? existing.motherId : input.motherId;
  assertParents(tree.members, memberId, fatherId, motherId);
  // a recorded death year implies deceased, unless the caller says otherwise
  const isDeceased = input.isDeceased ?? (input.deathYear ? true : undefined);
  await prisma.member.update({ where: { id: memberId }, data: { ...input, ...(isDeceased !== undefined ? { isDeceased } : {}) } });
  return refreshGenerations(existing.treeId);
}

export async function deleteMember(memberId: string): Promise<TreeDTO> {
  const existing = await prisma.member.findUnique({ where: { id: memberId } });
  if (!existing) throw new DomainError("Member not found", 404);
  // Children keep existing; their parent link is nulled by the FK (SetNull),
  // and marriages cascade.
  await prisma.member.delete({ where: { id: memberId } });
  return refreshGenerations(existing.treeId);
}

export async function createMarriage(treeId: string, input: CreateMarriageInput): Promise<TreeDTO> {
  if (input.spouseAId === input.spouseBId) throw new DomainError("A member cannot marry themselves.");
  await assertMemberInTree(treeId, input.spouseAId);
  await assertMemberInTree(treeId, input.spouseBId);
  const dup = await prisma.marriage.findFirst({
    where: {
      OR: [
        { spouseAId: input.spouseAId, spouseBId: input.spouseBId },
        { spouseAId: input.spouseBId, spouseBId: input.spouseAId },
      ],
    },
  });
  if (dup) throw new DomainError("These two members are already married.");
  await prisma.marriage.create({ data: { ...input, treeId } });
  return getTree(treeId);
}

export async function deleteMarriage(marriageId: string): Promise<TreeDTO> {
  const m = await prisma.marriage.findUnique({ where: { id: marriageId } });
  if (!m) throw new DomainError("Marriage not found", 404);
  await prisma.marriage.delete({ where: { id: marriageId } });
  return getTree(m.treeId);
}

/**
 * Imports one nasab per line. Shared ancestors are reused, older ancestors
 * are added above an existing root, and only genuinely new people are
 * created, all in one transaction.
 */
export async function importNasab(treeId: string, input: ImportNasabInput): Promise<TreeDTO> {
  const lines = splitNasabLines(input.text);
  if (!lines.length) throw new DomainError("Paste at least one nasab.");
  await prisma.$transaction(async (tx) => {
    // Read once, then keep an in-memory copy up to date as rows are created,
    // so later lines see earlier imports without re-reading the tree.
    const tree = await getTreeWith(tx, treeId);
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
      const plan = planNasabImport(members, tree.lineage, entries);
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
  }, { timeout: 60_000 }); // long nasabs create ~100 rows sequentially
  return refreshGenerations(treeId);
}

async function getTreeWith(tx: Prisma.TransactionClient, treeId: string) {
  const tree = await tx.familyTree.findUnique({ where: { id: treeId }, include: { members: true } });
  if (!tree) throw new DomainError("Tree not found", 404);
  return { ...tree, members: tree.members.map(toMemberDTO) };
}

/** Recomputes the denormalised `generation` column and returns the fresh tree. */
export async function refreshGenerations(treeId: string): Promise<TreeDTO> {
  const tree = await getTree(treeId);
  const gens = computeGenerations(tree.members, tree.lineage);
  const changed = tree.members.filter((m) => gens.get(m.id) !== m.generation);
  if (changed.length) {
    await prisma.$transaction(
      changed.map((m) => prisma.member.update({ where: { id: m.id }, data: { generation: gens.get(m.id)! } })),
    );
    for (const m of tree.members) m.generation = gens.get(m.id)!;
  }
  return tree;
}

function assertParents(
  members: MemberDTO[], memberId: string | null, fatherId?: string | null, motherId?: string | null,
) {
  const err =
    parentAssignmentError(members, memberId, fatherId, "father") ??
    parentAssignmentError(members, memberId, motherId, "mother");
  if (err) throw new DomainError(err);
}

async function assertMemberInTree(treeId: string, memberId: string) {
  const m = await prisma.member.findFirst({ where: { id: memberId, treeId } });
  if (!m) throw new DomainError("Member is not in this tree.");
}

function nextBirthOrder(members: MemberDTO[], fatherId?: string | null, motherId?: string | null) {
  const siblings = members.filter(
    (m) => (fatherId && m.fatherId === fatherId) || (!fatherId && motherId && m.motherId === motherId),
  );
  return siblings.length ? Math.max(...siblings.map((s) => s.birthOrder)) + 1 : 0;
}
