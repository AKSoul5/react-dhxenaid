// The GEDCOM preview's work (decode, parse, match against the tree), shared
// by the Web Worker and the fallback that runs on the page. Returns only
// what the preview shows, so little is copied back from the worker.

import { GEDCOM_MAX_CHARS, GEDCOM_MAX_PEOPLE, decodeGedcom, parseGedcom, planGedcomImport } from "@/lib/gedcom";
import type { TreeDTO } from "@/lib/types";

export type PreviewTree = Pick<TreeDTO, "members" | "marriages" | "lineage" | "rootMemberId" | "sources" | "citations" | "media">;

export interface GedcomPreview {
  /** The decoded file, sent to the server on Import. */
  text: string;
  source: string | null;
  people: number;
  families: number;
  newMembers: number;
  reused: number;
  newMarriages: number;
  relinks: number;
  newSources: number;
  reusedSources: number;
  newCitations: number;
  newMedia: number;
  ambiguous: number;
  /** The new start of the trunk, when the import changes it. */
  newRootName: string | null;
  warnings: string[];
  /** Why this file cannot be imported (too large), or null. */
  blocked: string | null;
  ms: number;
}

export function previewGedcom(bytes: ArrayBuffer, tree: PreviewTree): GedcomPreview {
  const t0 = performance.now();
  const { text, warnings: decodeWarnings } = decodeGedcom(new Uint8Array(bytes));
  const parsed = parseGedcom(text);
  let n = 0;
  const plan = planGedcomImport(tree, parsed, () => `preview-${n++}`);
  const root = plan.rootMemberId !== tree.rootMemberId ? plan.members.find((m) => m.id === plan.rootMemberId) : undefined;
  const blocked =
    text.length > GEDCOM_MAX_CHARS
      ? "This file is larger than 20 MB, the most one import accepts."
      : plan.people > GEDCOM_MAX_PEOPLE
        ? `This file has ${plan.people.toLocaleString("en")} people; one import accepts up to ${GEDCOM_MAX_PEOPLE.toLocaleString("en")}.`
        : null;
  return {
    text, source: parsed.source, people: plan.people, families: parsed.families.length,
    newMembers: plan.newMembers.length, reused: plan.reused, newMarriages: plan.newMarriages.length,
    relinks: plan.relinks.length, ambiguous: plan.ambiguous,
    newSources: plan.newSources.length, reusedSources: plan.reusedSources,
    newCitations: plan.newCitations.length, newMedia: plan.newMedia.length, newRootName: root?.name ?? null,
    warnings: [...decodeWarnings, ...plan.warnings], blocked, ms: performance.now() - t0,
  };
}
