// Project files (.shajarah): a whole family in one file, to keep a copy,
// move it to another computer, or send it to someone. It holds everything
// the editor saves (people, marriages, poster settings and tiers, sources,
// citations) and the uploaded photos and documents themselves, so the file
// opens anywhere as the same family.

import type { MemberDTO, TreeDTO } from "./types";
import type { TreeSnapshot } from "./restore";

export const PROJECT_FORMAT = "shajarah-project";
export const PROJECT_VERSION = 1;
export const PROJECT_EXTENSION = ".shajarah";

/** An uploaded file, keyed by its SHA-256 (the id in /api/media/blob/<id>). */
export interface ProjectBlob {
  type: string;
  /** base64 */
  data: string;
}

export interface ProjectFile {
  format: typeof PROJECT_FORMAT;
  version: number;
  savedAt: string;
  tree: TreeSnapshot;
  files: Record<string, ProjectBlob>;
}

/** The SHA-256 of an uploaded file from its URL, or null for other URLs. */
export function blobIdOf(url: string): string | null {
  const m = url.match(/^\/api\/media\/blob\/([0-9a-f]{64})$/);
  return m ? m[1] : null;
}

export function snapshotOf(tree: TreeDTO): TreeSnapshot {
  const { name, title, subtitle, lineage, rootMemberId, crownBaseId, trunkStartId, soilText, settings,
    members, marriages, sources, citations, media } = tree;
  return { name, title, subtitle, lineage, rootMemberId, crownBaseId, trunkStartId, soilText, settings,
    members, marriages, sources, citations, media };
}

export function makeProjectFile(tree: TreeDTO, files: Record<string, ProjectBlob> = {}, now = new Date()): ProjectFile {
  return { format: PROJECT_FORMAT, version: PROJECT_VERSION, savedAt: now.toISOString(), tree: snapshotOf(tree), files };
}

/** Reads a project file, with a plain message for anything that is not one. */
export function readProjectFile(text: string): ProjectFile {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error("This is not a Shajarah project file.");
  }
  const file = data as Partial<ProjectFile> | null;
  if (!file || file.format !== PROJECT_FORMAT || typeof file.tree !== "object" || !file.tree) {
    throw new Error("This is not a Shajarah project file.");
  }
  if (typeof file.version !== "number" || file.version > PROJECT_VERSION) {
    throw new Error("This project file was saved by a newer version of Shajarah. Update the app to open it.");
  }
  const t = file.tree as Partial<TreeSnapshot>;
  for (const key of ["members", "marriages", "sources", "citations", "media"] as const) {
    if (!Array.isArray(t[key])) throw new Error("This project file is damaged (its family is incomplete).");
  }
  return { ...(file as ProjectFile), files: file.files ?? {} };
}

/**
 * The same family with new ids for every record, so a file can be opened
 * as a new family any number of times, even beside the family it was
 * saved from.
 */
export function withNewIds(s: TreeSnapshot, newId: () => string): TreeSnapshot {
  const ids = new Map<string, string>();
  const map = (id: string) => {
    let n = ids.get(id);
    if (!n) ids.set(id, (n = newId()));
    return n;
  };
  const opt = (id: string | null) => (id ? map(id) : null);
  const members: MemberDTO[] = s.members.map((m) => ({ ...m, id: map(m.id), fatherId: opt(m.fatherId), motherId: opt(m.motherId) }));
  const settings = s.settings
    ? { ...s.settings,
      ...(s.settings.focusId !== undefined ? { focusId: opt(s.settings.focusId ?? null) } : {}),
      ...(s.settings.centerBranchId !== undefined ? { centerBranchId: opt(s.settings.centerBranchId ?? null) } : {}),
      ...(s.settings.familiesThrough ? { familiesThrough: s.settings.familiesThrough.map(map) } : {}) }
    : s.settings;
  return {
    ...s,
    settings,
    rootMemberId: opt(s.rootMemberId),
    crownBaseId: opt(s.crownBaseId),
    trunkStartId: opt(s.trunkStartId),
    members,
    marriages: s.marriages.map((r) => ({ ...r, id: map(r.id), spouseAId: map(r.spouseAId), spouseBId: map(r.spouseBId) })),
    sources: s.sources.map((x) => ({ ...x, id: map(x.id) })),
    citations: s.citations.map((c) => ({ ...c, id: map(c.id), sourceId: map(c.sourceId), memberId: map(c.memberId) })),
    media: s.media.map((x) => ({ ...x, id: map(x.id), memberId: opt(x.memberId), sourceId: opt(x.sourceId) })),
  };
}

/**
 * A file name for the project ("shajarah-alkalali.shajarah"), in plain
 * letters like the other exports: browsers drop a download name with
 * Arabic letters and save the file as "download".
 */
export function projectFileName(name: string): string {
  const slug = name.normalize("NFKD").replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "-").toLowerCase();
  return `${slug ? `shajarah-${slug}` : "shajarah-family"}${PROJECT_EXTENSION}`;
}
