"use client";

import { useEffect, useRef, useState } from "react";
import { GEDCOM_MAX_CHARS, exportGedcom } from "@/lib/gedcom";
import { exportOutline } from "@/lib/outline";
import type { TreeDTO } from "@/lib/types";
import { previewGedcom, type GedcomPreview } from "./gedcomPreview";
import { PROJECT_EXTENSION } from "@/lib/project";
import { saveProjectFile } from "../projectFiles";

interface Props {
  tree: TreeDTO;
  busy: boolean;
  /** Base name for the downloaded file (ASCII). */
  filename: string;
  onImport: (text: string, fileName: string) => void;
  /** Opens a project file (as a new family, or in the demo in place of this one). */
  onOpenProject: (file: File) => void;
  /** Where an opened project goes: a new family, or this demo. */
  opensAsNew: boolean;
  onCancel: () => void;
}

type Status =
  | { kind: "idle" }
  | { kind: "reading" }
  | { kind: "ready"; preview: GedcomPreview }
  | { kind: "error"; message: string };

/** Above this many bytes no encoding can fit the server's limit: refused before reading. */
const REFUSE_BYTES = GEDCOM_MAX_CHARS * 2;

const formatSize = (bytes: number) =>
  bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;

/**
 * GEDCOM in and out. The file is read and matched against the tree with the
 * same planner the server uses, so the preview shows exactly what the import
 * will do before anything is saved. That work runs in a Web Worker: a large
 * file never freezes the editor, and choosing another file cancels it.
 */
export function GedcomPanel({ tree, busy, filename, onImport, onOpenProject, opensAsNew, onCancel }: Props) {
  const projectInput = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const saveProject = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      await saveProjectFile(tree);
    } catch (e) {
      setSaveError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };
  const [file, setFile] = useState<{ name: string; size: number; bytes: ArrayBuffer } | null>(null);
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const worker = useRef<Worker | null>(null);
  const request = useRef(0);

  useEffect(() => () => worker.current?.terminate(), []);

  useEffect(() => {
    if (!file) return;
    const id = ++request.current;
    if (file.size > REFUSE_BYTES) {
      setStatus({ kind: "error", message: `This file is ${formatSize(file.size)}; one import accepts up to 20 MB of text.` });
      return;
    }
    setStatus({ kind: "reading" });
    const input = {
      members: tree.members, marriages: tree.marriages, lineage: tree.lineage, rootMemberId: tree.rootMemberId,
      sources: tree.sources, citations: tree.citations, media: tree.media,
    };
    const done = (s: Status) => request.current === id && setStatus(s);
    if (typeof Worker === "undefined") {
      // no workers (very old browsers): let the spinner paint, then read here
      const t = setTimeout(() => {
        try {
          done({ kind: "ready", preview: previewGedcom(file.bytes, input) });
        } catch (e) {
          done({ kind: "error", message: e instanceof Error ? e.message : String(e) });
        }
      }, 30);
      return () => clearTimeout(t);
    }
    // a file still being read is abandoned, not waited for
    worker.current?.terminate();
    const w = new Worker(new URL("./gedcom.worker.ts", import.meta.url));
    worker.current = w;
    w.onmessage = (e: MessageEvent<{ id: number; ok: boolean; preview?: GedcomPreview; error?: string }>) => {
      if (e.data.id !== id) return;
      done(e.data.ok ? { kind: "ready", preview: e.data.preview! } : { kind: "error", message: e.data.error ?? "Could not read the file." });
      w.terminate();
      if (worker.current === w) worker.current = null;
    };
    w.onerror = (e) => done({ kind: "error", message: e.message || "Could not read the file." });
    const bytes = file.bytes.slice(0); // the copy is moved to the worker
    w.postMessage({ id, bytes, tree: input }, [bytes]);
  }, [file, tree.members, tree.marriages, tree.lineage, tree.rootMemberId, tree.sources, tree.citations, tree.media]);

  const choose = async (f: File | undefined) => {
    if (!f) return;
    setStatus({ kind: "reading" });
    // a file too large to import is not even read into memory
    setFile({ name: f.name, size: f.size, bytes: f.size > REFUSE_BYTES ? new ArrayBuffer(0) : await f.arrayBuffer() });
  };

  const save = (text: string, type: string, name: string) => {
    const url = URL.createObjectURL(new Blob([text], { type }));
    const a = Object.assign(document.createElement("a"), { href: url, download: name });
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const download = () => save(exportGedcom(tree), "text/x-gedcom;charset=utf-8", `${filename}.ged`);
  // (a byte-order mark, so Notepad and phones read the Arabic as UTF-8)
  const downloadOutline = () => save(`\uFEFF${exportOutline(tree)}`, "text/plain;charset=utf-8", `${filename}-family.txt`);

  const p = status.kind === "ready" ? status.preview : null;
  return (
    <div className="min-h-0 flex-1 space-y-4 overflow-auto p-4 text-sm">
      <section className="space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-bark-500">Project file</h2>
        <p className="text-gray-600">
          The whole family in one <code>{PROJECT_EXTENSION}</code> file: everyone, the poster settings, sources and
          photos. Keep it as a copy, open it on another computer, or send it to someone.
        </p>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn-primary" disabled={busy || saving} onClick={() => void saveProject()}>
            {saving ? "Saving…" : "Save project file"}
          </button>
          <button type="button" className="btn-outline" disabled={busy} onClick={() => projectInput.current?.click()}>
            Open project file…
          </button>
          <input ref={projectInput} type="file" accept={`${PROJECT_EXTENSION},application/json`} className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) onOpenProject(f); }} />
        </div>
        <p className="text-xs text-gray-500">
          {opensAsNew ? "A project you open becomes a new family; this one stays as it is." : "In the demo, an opened project replaces this family (Undo brings it back)."}
        </p>
        {saveError && <p className="text-red-700">{saveError}</p>}
      </section>

      <section className="space-y-3 border-t border-parchment-200 pt-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-bark-500">Import a GEDCOM file or family outline</h2>
        <p className="text-gray-600">
          GEDCOM (.ged) is the file other genealogy programs export: Ancestry, MyHeritage, FamilySearch,
          Gramps, MacFamilyTree… A family outline (.txt) is plain text, one name per line, indented under the
          parent (see below). People already in this tree are matched by name and line and reused. Nothing is
          saved until you press Import.
        </p>
        <input
          type="file"
          accept=".ged,.gedcom,.txt,text/plain"
          aria-label="GEDCOM file or family outline"
          className="block w-full text-xs file:me-3 file:rounded-md file:border file:border-parchment-300 file:bg-parchment-50 file:px-3 file:py-1.5"
          onChange={(e) => void choose(e.target.files?.[0])}
        />
        {status.kind === "reading" && (
          <p className="flex items-center gap-2 text-gray-600" role="status">
            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-bark-300 border-t-bark-700" aria-hidden />
            Reading {file ? `${file.name} (${formatSize(file.size)})` : "the file"} and matching it against this tree…
          </p>
        )}
        {status.kind === "error" && <p className="text-red-700">Could not import this file: {status.message}</p>}

        {p && file && (
          <div className="space-y-2 rounded-md border border-parchment-200 bg-parchment-50 p-3" data-testid="gedcom-preview">
            <p className="text-xs text-gray-500">
              {file.name} · {formatSize(file.size)}
              {p.source && ` · from ${p.source}`} · {p.people.toLocaleString("en")} people, {p.families.toLocaleString("en")} families
            </p>
            {p.blocked && <p className="font-semibold text-red-700">{p.blocked} Split it, or export one branch from your genealogy program.</p>}
            {p.people > 0 && !p.blocked && (
              <ul className="space-y-0.5">
                <li><b>{p.newMembers}</b> new {p.newMembers === 1 ? "member" : "members"}</li>
                <li><b>{p.reused}</b> already in this tree (reused, not changed)</li>
                {p.newMarriages > 0 && <li><b>{p.newMarriages}</b> new {p.newMarriages === 1 ? "marriage" : "marriages"}</li>}
                {(p.newSources > 0 || p.newCitations > 0 || p.newMedia > 0) && (
                  <li>
                    Importing <b>{p.newSources}</b> {p.newSources === 1 ? "source" : "sources"}
                    {p.reusedSources > 0 && ` (${p.reusedSources} already here)`}, <b>{p.newCitations}</b>{" "}
                    {p.newCitations === 1 ? "citation" : "citations"} and <b>{p.newMedia}</b> media {p.newMedia === 1 ? "link" : "links"}
                  </li>
                )}
                {p.newMedia > 0 && (
                  <li className="text-xs text-gray-600">
                    A GEDCOM file names its photos and documents but does not contain them: upload each file on the
                    person to show it.
                  </li>
                )}
                {p.relinks > 0 && (
                  <li><b>{p.relinks}</b> {p.relinks === 1 ? "member gets a parent" : "members get parents"} they did not have</li>
                )}
                {p.ambiguous > 0 && (
                  <li className="text-amber-800">
                    <b>{p.ambiguous}</b> matched more than one person here, so {p.ambiguous === 1 ? "was" : "were"} added as new: check for duplicates
                  </li>
                )}
                {p.newRootName && (
                  <li>The trunk will start at <b dir="auto">{p.newRootName}</b></li>
                )}
              </ul>
            )}
            {p.warnings.length > 0 && (
              <ul className="list-disc space-y-0.5 ps-4 text-xs text-amber-800">
                {p.warnings.map((w, i) => <li key={i}>{w}</li>)}
              </ul>
            )}
          </div>
        )}
        <div className="flex gap-2">
          <button
            type="button"
            className="btn-primary"
            disabled={busy || !p || !file || p.people === 0 || !!p.blocked}
            onClick={() => p && file && onImport(p.text, file.name)}
          >
            {busy ? "Importing…" : p && !p.blocked ? `Import ${p.newMembers} ${p.newMembers === 1 ? "person" : "people"}` : "Import"}
          </button>
          <button type="button" className="btn-ghost" onClick={onCancel}>Cancel</button>
        </div>
      </section>

      <section className="space-y-2 border-t border-parchment-200 pt-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-bark-500">Export GEDCOM</h2>
        <p className="text-gray-600">
          Download this family as a GEDCOM 5.5.1 file (UTF-8) to open it in any genealogy program,
          or to keep a copy.
        </p>
        <button type="button" className="btn-outline" disabled={tree.members.length === 0} onClick={download}>
          Download GEDCOM ({tree.members.length} {tree.members.length === 1 ? "person" : "people"})
        </button>
      </section>

      <section className="space-y-2 border-t border-parchment-200 pt-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-bark-500">Family outline (.txt)</h2>
        <p className="text-gray-600">
          The whole family as plain text: one person per line, indented under their parent, with wives, mothers,
          years and laqab after a <code>|</code>. Easy to read, check, correct or send in a message, and it can be
          imported back (above), here or into a new family.
        </p>
        <pre className="overflow-x-auto rounded-md bg-parchment-50 p-2 text-xs leading-relaxed" dir="rtl">{`عبدالله | زوجة: نورة بنت سعد
  محمد | أم: نورة بنت سعد | مواليد: 1950
  سارة (بنت) | زوج: فهد الشمري
    سلمان | أب: فهد الشمري`}</pre>
        <button type="button" className="btn-outline" disabled={tree.members.length === 0} onClick={downloadOutline}>
          Download family outline (.txt)
        </button>
      </section>
    </div>
  );
}
