"use client";

import { useMemo, useState } from "react";
import { decodeGedcom, exportGedcom, parseGedcom, planGedcomImport } from "@/lib/gedcom";
import type { TreeDTO } from "@/lib/types";

interface Props {
  tree: TreeDTO;
  busy: boolean;
  /** Base name for the downloaded file (ASCII). */
  filename: string;
  onImport: (text: string, fileName: string) => void;
  onCancel: () => void;
}

/**
 * GEDCOM in and out. The file is read and matched in the browser first,
 * with the same planner the server uses, so the preview shows exactly what
 * the import will do before anything is saved.
 */
export function GedcomPanel({ tree, busy, filename, onImport, onCancel }: Props) {
  const [file, setFile] = useState<{ name: string; size: number; text: string; warnings: string[] } | null>(null);
  const [readError, setReadError] = useState<string | null>(null);

  const preview = useMemo(() => {
    if (!file) return null;
    const parsed = parseGedcom(file.text);
    let n = 0;
    const plan = planGedcomImport(tree, parsed, () => `preview-${n++}`);
    const root = plan.rootMemberId !== tree.rootMemberId ? plan.members.find((m) => m.id === plan.rootMemberId) : undefined;
    return { parsed, plan, root, warnings: [...file.warnings, ...plan.warnings] };
  }, [file, tree]);

  const choose = async (f: File | undefined) => {
    setReadError(null);
    if (!f) return;
    try {
      const { text, warnings } = decodeGedcom(new Uint8Array(await f.arrayBuffer()));
      setFile({ name: f.name, size: f.size, text, warnings });
    } catch (e) {
      setFile(null);
      setReadError(e instanceof Error ? e.message : String(e));
    }
  };

  const download = () => {
    const url = URL.createObjectURL(new Blob([exportGedcom(tree)], { type: "text/x-gedcom;charset=utf-8" }));
    const a = Object.assign(document.createElement("a"), { href: url, download: `${filename}.ged` });
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const p = preview?.plan;
  return (
    <div className="flex-1 space-y-4 overflow-auto p-4 text-sm">
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-bark-500">Import a GEDCOM file</h2>
        <p className="text-gray-600">
          GEDCOM (.ged) is the file other genealogy programs export: Ancestry, MyHeritage, FamilySearch,
          Gramps, MacFamilyTree… People already in this tree are matched by name and line and reused.
          Nothing is saved until you press Import.
        </p>
        <input
          type="file"
          accept=".ged,.gedcom,text/plain"
          aria-label="GEDCOM file"
          className="block w-full text-xs file:me-3 file:rounded-md file:border file:border-parchment-300 file:bg-parchment-50 file:px-3 file:py-1.5"
          onChange={(e) => void choose(e.target.files?.[0])}
        />
        {readError && <p className="text-red-700">Could not read the file: {readError}</p>}

        {preview && p && (
          <div className="space-y-2 rounded-md border border-parchment-200 bg-parchment-50 p-3" data-testid="gedcom-preview">
            <p className="text-xs text-gray-500">
              {file!.name} · {Math.max(1, Math.round(file!.size / 1024))} KB
              {preview.parsed.source && ` · from ${preview.parsed.source}`} · {p.people} people, {preview.parsed.families.length} families
            </p>
            {p.people > 0 && (
              <ul className="space-y-0.5">
                <li><b>{p.newMembers.length}</b> new {p.newMembers.length === 1 ? "member" : "members"}</li>
                <li><b>{p.reused}</b> already in this tree (reused, not changed)</li>
                {p.newMarriages.length > 0 && <li><b>{p.newMarriages.length}</b> new {p.newMarriages.length === 1 ? "marriage" : "marriages"}</li>}
                {p.relinks.length > 0 && (
                  <li><b>{p.relinks.length}</b> {p.relinks.length === 1 ? "member gets a parent" : "members get parents"} they did not have</li>
                )}
                {p.ambiguous > 0 && (
                  <li className="text-amber-800">
                    <b>{p.ambiguous}</b> matched more than one person here, so {p.ambiguous === 1 ? "was" : "were"} added as new: check for duplicates
                  </li>
                )}
                {preview.root && (
                  <li>The trunk will start at <b dir="auto">{preview.root.name}</b></li>
                )}
              </ul>
            )}
            {preview.warnings.length > 0 && (
              <ul className="list-disc space-y-0.5 ps-4 text-xs text-amber-800">
                {preview.warnings.map((w, i) => <li key={i}>{w}</li>)}
              </ul>
            )}
          </div>
        )}
        <div className="flex gap-2">
          <button
            type="button"
            className="btn-primary"
            disabled={busy || !file || !p || p.people === 0}
            onClick={() => file && onImport(file.text, file.name)}
          >
            {busy ? "Importing…" : p ? `Import ${p.newMembers.length} ${p.newMembers.length === 1 ? "person" : "people"}` : "Import"}
          </button>
          <button type="button" className="btn-ghost" onClick={onCancel}>Cancel</button>
        </div>
      </section>

      <section className="space-y-2 border-t border-parchment-200 pt-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-bark-500">Export</h2>
        <p className="text-gray-600">
          Download this family as a GEDCOM 5.5.1 file (UTF-8) to open it in any genealogy program,
          or to keep a copy.
        </p>
        <button type="button" className="btn-outline" disabled={tree.members.length === 0} onClick={download}>
          Download GEDCOM ({tree.members.length} {tree.members.length === 1 ? "person" : "people"})
        </button>
      </section>
    </div>
  );
}
