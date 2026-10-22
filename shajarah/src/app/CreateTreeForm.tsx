"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function CreateTreeForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [lineage, setLineage] = useState("PATRILINEAL");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  return (
    <form
      className="space-y-3"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError(null);
        const res = await fetch("/api/trees", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, title: title || null, lineage }),
        });
        const data = await res.json().catch(() => ({}));
        setBusy(false);
        if (!res.ok) return setError(data.error ?? "Could not create the tree");
        router.push(`/trees/${data.id}`);
      }}
    >
      <input className="input font-naskh text-base" dir="auto" required aria-label="Family name" placeholder="Family name, e.g. آل حقيل" value={name} onChange={(e) => setName(e.target.value)} />
      <input className="input font-naskh text-base" dir="auto" aria-label="Poster title" placeholder="Poster title (optional), e.g. شجرة أسرة آل حقيل" value={title} onChange={(e) => setTitle(e.target.value)} />
      <select className="input" aria-label="Lineage" value={lineage} onChange={(e) => setLineage(e.target.value)}>
        <option value="PATRILINEAL">Patrilineal (branches follow fathers)</option>
        <option value="MATRILINEAL">Matrilineal (branches follow mothers)</option>
      </select>
      {error && <p className="text-sm text-red-700">{error}</p>}
      <button className="btn-primary w-full justify-center" disabled={busy || !name.trim()}>{busy ? "Creating…" : "Create the family"}</button>
    </form>
  );
}
