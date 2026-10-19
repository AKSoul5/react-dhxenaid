"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { TreeSummary } from "@/lib/types";

/** "3 hours ago", "yesterday", "12 Oct 2026". */
function ago(iso: string, now = Date.now()): string {
  const s = Math.max(0, (now - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  if (s < 2 * 86400) return "yesterday";
  if (s < 7 * 86400) return `${Math.floor(s / 86400)} days ago`;
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

/** The families on this computer, most recently edited first; each opens, or can be deleted after asking. */
export function TreeCards({ trees }: { trees: TreeSummary[] }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const remove = async (t: TreeSummary) => {
    setBusy(t.id);
    setError(null);
    const res = await fetch(`/api/trees/${t.id}`, { method: "DELETE" }).catch(() => null);
    setBusy(null);
    setConfirming(null);
    if (!res?.ok) return setError(`Could not delete ${t.name}.`);
    router.refresh();
  };

  return (
    <div className="space-y-3">
      <ul className="grid gap-3 sm:grid-cols-2">
        {trees.map((t) => (
          <li key={t.id} className="group relative rounded-xl border border-parchment-300 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-gilt-400 hover:shadow-md">
            <Link href={`/trees/${t.id}`} className="block p-4">
              <div className="flex items-start gap-3">
                <span aria-hidden className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-parchment-100 text-xl text-leaf-700">🌳</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-naskh text-xl font-bold text-bark-900" dir="auto">{t.name}</span>
                  {t.title && t.title !== t.name && <span className="block truncate font-naskh text-sm text-bark-500" dir="auto">{t.title}</span>}
                  <span className="mt-1 block text-xs text-gray-500">
                    {t.memberCount.toLocaleString("en")} {t.memberCount === 1 ? "person" : "people"} · edited {ago(t.updatedAt)}
                  </span>
                </span>
              </div>
            </Link>
            {confirming === t.id ? (
              <div className="flex items-center justify-end gap-2 border-t border-parchment-200 px-4 py-2 text-xs">
                <span className="me-auto text-red-800">Delete <b dir="auto">{t.name}</b> and everyone in it?</span>
                <button type="button" className="btn-ghost py-0.5 text-xs" onClick={() => setConfirming(null)}>Keep</button>
                <button type="button" className="btn-danger py-0.5 text-xs" disabled={busy === t.id} onClick={() => void remove(t)}>
                  {busy === t.id ? "Deleting…" : "Delete"}
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="absolute end-2 top-2 rounded px-1.5 text-xs text-gray-400 opacity-0 transition hover:bg-red-50 hover:text-red-700 focus:opacity-100 group-hover:opacity-100"
                title={`Delete ${t.name}`}
                onClick={() => setConfirming(t.id)}
              >
                Delete
              </button>
            )}
          </li>
        ))}
      </ul>
      {error && <p className="text-sm text-red-700">{error}</p>}
      <p className="text-xs text-gray-500">
        Tip: <b>Files → Save project file</b> in a family keeps a copy you can open anywhere.
      </p>
    </div>
  );
}
