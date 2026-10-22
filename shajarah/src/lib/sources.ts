// Sources across the tree: what each one supports, and merging duplicates
// (the same register entered twice, or imported from two files under
// slightly different titles).

import { normalizeName } from "./nasab";
import type { CitationDTO, MediaDTO, SourceDTO, TreeDTO } from "./types";

type Sourced = Pick<TreeDTO, "sources" | "citations" | "media">;

export interface SourceUsage {
  citations: number;
  /** Different people citing it. */
  people: number;
  media: number;
}

export function sourceUsage(tree: Sourced): Map<string, SourceUsage> {
  const usage = new Map<string, SourceUsage & { who: Set<string> }>(
    tree.sources.map((s) => [s.id, { citations: 0, people: 0, media: 0, who: new Set() }]),
  );
  for (const c of tree.citations) {
    const u = usage.get(c.sourceId);
    if (!u) continue;
    u.citations++;
    u.who.add(c.memberId);
  }
  for (const m of tree.media) {
    const u = m.sourceId ? usage.get(m.sourceId) : undefined;
    if (u) u.media++;
  }
  return new Map([...usage].map(([id, { who, ...u }]) => [id, { ...u, people: who.size }]));
}

/** Sources whose title and author look the same (spelling variants, spacing): likely duplicates. */
export function likelyDuplicates(tree: Pick<TreeDTO, "sources">, id: string): SourceDTO[] {
  const s = tree.sources.find((x) => x.id === id);
  if (!s) return [];
  const key = (x: SourceDTO) => `${normalizeName(x.title)}|${normalizeName(x.author ?? "")}`;
  return tree.sources.filter((x) => x.id !== id && (key(x) === key(s) || normalizeName(x.title) === normalizeName(s.title)));
}

export interface SourceMerge {
  /** The source that stays, with blanks filled from the other. */
  into: SourceDTO;
  /** Citations moved to it (with their new sourceId). */
  moveCitations: CitationDTO[];
  /** Citations dropped: the kept source already cites the same person, event and page. */
  dropCitationIds: string[];
  moveMedia: MediaDTO[];
  /** Media dropped: the kept source already has the same file. */
  dropMediaIds: string[];
  /** The source that goes. */
  removeSourceId: string;
}

/**
 * Merges `fromId` into `intoId`: every citation and file of the first moves
 * to the second, unless the second already has the same one; the second
 * keeps its own title, author, publication and notes, and takes the first's
 * only where its own are empty (notes are joined). Then the first is removed.
 */
export function planMergeSources(tree: Sourced, fromId: string, intoId: string): SourceMerge {
  if (fromId === intoId) throw new Error("A source cannot be merged into itself.");
  const from = tree.sources.find((x) => x.id === fromId);
  const into = tree.sources.find((x) => x.id === intoId);
  if (!from || !into) throw new Error("Source not found.");

  const citeKey = (c: CitationDTO) => [c.memberId, c.eventType ?? "", (c.page ?? "").trim()].join("|");
  const kept = new Set(tree.citations.filter((c) => c.sourceId === intoId).map(citeKey));
  const moveCitations: CitationDTO[] = [];
  const dropCitationIds: string[] = [];
  for (const c of tree.citations.filter((x) => x.sourceId === fromId)) {
    if (kept.has(citeKey(c))) dropCitationIds.push(c.id);
    else {
      kept.add(citeKey(c));
      moveCitations.push({ ...c, sourceId: intoId });
    }
  }

  const files = new Set(tree.media.filter((m) => m.sourceId === intoId).map((m) => m.url));
  const moveMedia: MediaDTO[] = [];
  const dropMediaIds: string[] = [];
  for (const m of tree.media.filter((x) => x.sourceId === fromId)) {
    if (files.has(m.url)) dropMediaIds.push(m.id);
    else {
      files.add(m.url);
      moveMedia.push({ ...m, sourceId: intoId });
    }
  }

  const notes = [into.notes, from.notes].map((n) => n?.trim()).filter(Boolean);
  return {
    into: {
      ...into,
      author: into.author || from.author,
      publication: into.publication || from.publication,
      notes: [...new Set(notes)].join("\n\n").slice(0, 2000) || null,
    },
    moveCitations, dropCitationIds, moveMedia, dropMediaIds, removeSourceId: fromId,
  };
}

/** The merge applied to the tree in memory (the demo, and the tests). */
export function applyMergeSources<T extends Sourced>(tree: T, m: SourceMerge): T {
  const moved = new Map(m.moveCitations.map((c) => [c.id, c]));
  const movedMedia = new Map(m.moveMedia.map((x) => [x.id, x]));
  return {
    ...tree,
    sources: tree.sources.filter((x) => x.id !== m.removeSourceId).map((x) => (x.id === m.into.id ? m.into : x)),
    citations: tree.citations.filter((c) => !m.dropCitationIds.includes(c.id)).map((c) => moved.get(c.id) ?? c),
    media: tree.media.filter((x) => !m.dropMediaIds.includes(x.id)).map((x) => movedMedia.get(x.id) ?? x),
  };
}
