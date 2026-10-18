"use client";

import { blobIdOf, makeProjectFile, projectFileName, type ProjectBlob } from "@/lib/project";
import type { TreeDTO } from "@/lib/types";

function toBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}

/**
 * Saves the family as a project file. Uploaded photos and documents are
 * put inside it, so the file is complete on its own. (In the desktop app
 * the download asks where to save it.)
 */
export async function saveProjectFile(tree: TreeDTO) {
  const files: Record<string, ProjectBlob> = {};
  for (const m of tree.media) {
    const id = blobIdOf(m.url);
    if (!id || files[id]) continue;
    const res = await fetch(m.url);
    if (!res.ok) continue;
    files[id] = { type: res.headers.get("content-type") ?? m.fileType ?? "application/octet-stream", data: toBase64(await res.arrayBuffer()) };
  }
  const blob = new Blob([JSON.stringify(makeProjectFile(tree, files))], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement("a"), { href: url, download: projectFileName(tree.name) });
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/** Opens a project file as a new family on the server; returns its id. */
export async function openProjectFile(file: File): Promise<string> {
  const res = await fetch("/api/trees/open-project", { method: "POST", body: await file.text() });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error ?? "The project file could not be opened.");
  return body.id as string;
}
