"use client";

import { useMemo, useState } from "react";
import { applyNasabLines } from "@/lib/nasab";
import type { TreeDTO } from "@/lib/types";

interface Props {
  tree: TreeDTO;
  busy: boolean;
  onImport: (text: string) => void;
  onCancel: () => void;
}

/** Paste "أحمد بن نوفل بن …" lines; shows what will be reused vs created. */
export function NasabImport({ tree, busy, onImport, onCancel }: Props) {
  const [text, setText] = useState("");
  // Simulate the lines in order, so later lines see people added by earlier ones.
  const preview = useMemo(() => {
    let n = 0;
    return applyNasabLines(tree.members, tree.lineage, text, () => `preview-${n++}`, tree.rootMemberId).results;
  }, [text, tree.members, tree.lineage]);

  return (
    <div className="min-h-0 flex-1 space-y-3 overflow-auto p-4">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-bark-500">Import nasab</h2>
      <p className="text-sm text-gray-600">
        Paste one lineage per line, newest name first. Names already in the tree are reused, so you
        can paste each family member&apos;s nasab and they join up automatically.
      </p>
      <textarea
        className="input min-h-[220px] font-naskh text-base leading-relaxed"
        dir="rtl"
        placeholder="أحمد بن نوفل بن أحمد بن محمد بن سالم … بن آدم عليه السلام"
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      {preview.length > 0 && (
        <ul className="space-y-1 text-sm">
          {preview.map((p, i) => (
            <li key={i} className="rounded-md bg-parchment-50 px-2 py-1">
              <span className="font-naskh" dir="rtl">{p.newest} … {p.oldest}</span>
              <span className="ms-2 text-xs text-gray-600">
                {p.total} names · {p.reused} already in tree · <b>{p.created} new</b>
              </span>
              {p.ambiguous && (
                <span className="block text-xs text-amber-700">
                  This matches more than one place in the tree; add more ancestors to the line to be sure.
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
      <div className="flex gap-2">
        <button type="button" className="btn-primary" disabled={busy || preview.length === 0} onClick={() => onImport(text)}>
          {busy ? "Importing…" : "Import"}
        </button>
        <button type="button" className="btn-ghost" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}
