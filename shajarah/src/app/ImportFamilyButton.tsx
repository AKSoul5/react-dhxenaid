"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { decodeGedcom } from "@/lib/gedcom";
import { looksLikeOutline } from "@/lib/outline";

/** A family's name from the file: an outline's "# Family:" line, else the file name. */
function familyName(text: string, fileName: string): string {
  const fromOutline = text.match(/^#\s*Family:\s*(.+?)(?:\s+·.*)?$/m)?.[1]?.trim();
  return fromOutline || fileName.replace(/\.[^.]+$/, "").replace(/[-_]+(family|tree)$/i, "").replace(/[-_]+/g, " ").trim() || "Imported family";
}

/**
 * Starts a family from a file: a GEDCOM file from another genealogy program,
 * or a family outline (.txt, one person per line). A new family is created
 * and the file imported into it; if the import fails, the empty family is
 * removed again.
 */
export function ImportFamilyButton() {
  const input = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const start = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    setBusy(`Reading ${file.name}…`);
    let treeId: string | null = null;
    try {
      const { text } = decodeGedcom(new Uint8Array(await file.arrayBuffer()));
      const outline = looksLikeOutline(text);
      const post = async (url: string, body: unknown) => {
        const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error ?? `The server answered ${res.status}`);
        return data;
      };
      const tree = await post("/api/trees", { name: familyName(text, file.name), title: null, lineage: "PATRILINEAL" });
      treeId = tree.id;
      setBusy(`Importing ${outline ? "the family outline" : "the GEDCOM file"}…`);
      await post(`/api/trees/${tree.id}/import-gedcom`, { text });
      router.push(`/trees/${tree.id}`);
    } catch (e) {
      if (treeId) await fetch(`/api/trees/${treeId}`, { method: "DELETE" }).catch(() => undefined);
      setError(`Could not import ${file.name}: ${(e as Error).message}`);
      setBusy(null);
    } finally {
      if (input.current) input.current.value = "";
    }
  };

  return (
    <div className="space-y-2">
      <input ref={input} type="file" accept=".ged,.gedcom,.txt,text/plain" className="hidden" onChange={(e) => void start(e.target.files?.[0])} />
      <button type="button" className="btn-outline w-full justify-center" disabled={!!busy} onClick={() => input.current?.click()}>
        {busy ?? "Choose a GEDCOM or family outline…"}
      </button>
      {error && <p className="text-sm text-red-700">{error}</p>}
    </div>
  );
}
