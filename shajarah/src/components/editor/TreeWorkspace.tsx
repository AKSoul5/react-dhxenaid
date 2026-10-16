"use client";

import Link from "next/link";
import { useCallback, useDeferredValue, useMemo, useRef, useState } from "react";
import { computePosterLayout } from "@/lib/layout/botanical";
import { generationColor } from "@/lib/layout/palette";
import { nasab } from "@/lib/genealogy";
import type { Gender, TreeDTO } from "@/lib/types";
import type { CreateMemberInput } from "@/lib/validation";
import { ExportMenu } from "../poster/ExportMenu";
import { PosterViewport } from "../poster/PosterViewport";
import { TreePoster } from "../poster/TreePoster";
import { MemberForm, emptyDraft, type MemberDraft } from "./MemberForm";
import { RelationsPanel } from "./RelationsPanel";
import { apiRepository, localRepository, type FamilyRepository } from "./repository";

interface Props {
  initialTree: TreeDTO;
  mode: "api" | "local";
}

type Panel = { kind: "list" } | { kind: "edit"; id: string } | { kind: "new"; draft: MemberDraft };

export function TreeWorkspace({ initialTree, mode }: Props) {
  const [tree, setTree] = useState(initialTree);
  const repo = useMemo<FamilyRepository>(
    () => (mode === "api" ? apiRepository(initialTree.id) : localRepository(initialTree)),
    [mode, initialTree],
  );
  const [panel, setPanel] = useState<Panel>({ kind: "list" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const svgRef = useRef<SVGSVGElement>(null);

  const showFemales = tree.settings?.showFemales ?? false;
  const seed = tree.settings?.seed ?? 7;
  // Layout is recomputed on every edit; deferring keeps typing responsive.
  const deferredTree = useDeferredValue(tree);
  const layout = useMemo(
    () => computePosterLayout(deferredTree, { showFemales, seed }),
    [deferredTree, showFemales, seed],
  );

  const mutate = useCallback(async (fn: () => Promise<TreeDTO>) => {
    setBusy(true);
    setError(null);
    try {
      const next = await fn();
      setTree(next);
      return next;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      return null;
    } finally {
      setBusy(false);
    }
  }, []);

  const selectedId = panel.kind === "edit" ? panel.id : null;
  const selected = tree.members.find((m) => m.id === selectedId) ?? null;
  const highlightIds = useMemo(() => {
    const ids = new Set<string>();
    const byId = new Map(tree.members.map((m) => [m.id, m]));
    let cur = selected ? byId.get(selected.fatherId ?? selected.motherId ?? "") : undefined;
    while (cur && !ids.has(cur.id)) {
      ids.add(cur.id);
      cur = byId.get(cur.fatherId ?? cur.motherId ?? "");
    }
    return ids;
  }, [selected, tree.members]);

  const select = useCallback((id: string) => setPanel({ kind: "edit", id }), []);

  const saveNew = async (input: CreateMemberInput) => {
    const before = new Set(tree.members.map((m) => m.id));
    const next = await mutate(() => repo.createMember(input));
    const created = next?.members.find((m) => !before.has(m.id));
    if (created) setPanel({ kind: "edit", id: created.id });
  };

  const quickAddChild = (name: string, gender: Gender) => {
    if (!selected) return;
    const parentKey = selected.gender === "FEMALE" ? "motherId" : "fatherId";
    // If the parent has exactly one spouse, link the other parent too.
    const marriages = tree.marriages.filter((x) => x.spouseAId === selected.id || x.spouseBId === selected.id);
    const spouseId =
      marriages.length === 1
        ? marriages[0].spouseAId === selected.id ? marriages[0].spouseBId : marriages[0].spouseAId
        : null;
    const otherKey = parentKey === "fatherId" ? "motherId" : "fatherId";
    void mutate(() => repo.createMember({ name, gender, [parentKey]: selected.id, [otherKey]: spouseId }));
  };

  const updateSettings = (patch: Partial<NonNullable<TreeDTO["settings"]>>) => {
    const settings = { showFemales, seed, ...patch };
    setTree((t) => ({ ...t, settings })); // optimistic
    void mutate(() => repo.updateTree({ settings }));
  };

  const filtered = useMemo(() => {
    const q = query.trim();
    const list = q ? tree.members.filter((m) => m.name.includes(q) || nasab(tree.members, m.id, 3).includes(q)) : tree.members;
    return [...list].sort((a, b) => a.generation - b.generation || a.birthOrder - b.birthOrder).slice(0, 400);
  }, [tree.members, query]);

  return (
    <div className="flex h-screen flex-col bg-parchment-100 text-bark-900">
      <header className="relative z-40 flex items-center gap-4 border-b border-parchment-300 bg-white/80 px-4 py-2.5 backdrop-blur">
        <Link href="/" className="font-naskh text-2xl font-bold text-bark-700">شجرة</Link>
        <div className="min-w-0">
          <h1 className="truncate font-naskh text-lg font-bold" dir="auto">{tree.name}</h1>
          <p className="text-xs text-gray-500">
            {tree.members.length} members · {tree.members.reduce((g, m) => Math.max(g, m.generation + 1), 0)} generations
            {mode === "local" && " · demo mode (changes are not saved)"}
          </p>
        </div>
        <div className="ms-auto flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={showFemales} onChange={(e) => updateSettings({ showFemales: e.target.checked })} />
            Show daughters
          </label>
          <button type="button" className="btn-ghost" title="Re-grow the branches with a new random seed" onClick={() => updateSettings({ seed: seed + 1 })}>
            ↻ Re-grow
          </button>
          <ExportMenu svgRef={svgRef} filename={exportName(tree.name)} />
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <aside className="flex w-[380px] shrink-0 flex-col border-e border-parchment-300 bg-white">
          {error && (
            <div className="m-3 rounded-md border border-red-200 bg-red-50 p-2 text-sm text-red-800">
              {error} <button className="ms-2 underline" onClick={() => setError(null)}>dismiss</button>
            </div>
          )}

          {panel.kind === "list" && (
            <>
              <div className="flex gap-2 border-b border-parchment-200 p-3">
                <input className="input flex-1" dir="auto" placeholder="Search members…" value={query} onChange={(e) => setQuery(e.target.value)} />
                <button type="button" className="btn-primary" onClick={() => setPanel({ kind: "new", draft: emptyDraft() })}>
                  + Person
                </button>
              </div>
              <ul className="flex-1 overflow-auto">
                {tree.members.length === 0 && (
                  <li className="p-6 text-center text-sm text-gray-500">
                    Start with the eldest known ancestor — the root of the trunk.
                  </li>
                )}
                {filtered.map((m) => (
                  <li key={m.id}>
                    <button
                      type="button"
                      onClick={() => select(m.id)}
                      className="flex w-full items-center gap-2 border-b border-parchment-100 px-3 py-1.5 text-start hover:bg-parchment-50"
                    >
                      <span className="h-3 w-3 shrink-0 rounded-full border border-black/20" style={{ background: generationColor(m.generation).fill }} />
                      <span className="flex-1 truncate font-naskh text-[15px]" dir="auto">{nasab(tree.members, m.id, 2)}</span>
                      <span className="text-xs text-gray-400">G{m.generation + 1}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}

          {panel.kind === "new" && (
            <div className="flex-1 overflow-auto p-4">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-bark-500">New member</h2>
              <MemberForm tree={tree} member={null} initialDraft={panel.draft} busy={busy} onSave={saveNew} onCancel={() => setPanel({ kind: "list" })} />
            </div>
          )}

          {panel.kind === "edit" && selected && (
            <div className="flex-1 space-y-5 overflow-auto p-4">
              <div className="flex items-center gap-2">
                <button type="button" className="btn-ghost px-2" onClick={() => setPanel({ kind: "list" })}>← All</button>
                <h2 className="truncate font-naskh text-xl font-bold" dir="auto">{selected.name}</h2>
                <span className="ms-auto rounded-full px-2 py-0.5 text-xs" style={{ background: generationColor(selected.generation).fill, color: generationColor(selected.generation).text }}>
                  Generation {selected.generation + 1}
                </span>
              </div>
              <RelationsPanel
                tree={tree}
                member={selected}
                busy={busy}
                onSelect={select}
                onQuickAddChild={quickAddChild}
                onAddSpouse={(sid) => void mutate(() => repo.createMarriage({ spouseAId: selected.id, spouseBId: sid }))}
                onNewSpouse={(name) =>
                  void mutate(() =>
                    repo.createMember({ name, gender: selected.gender === "FEMALE" ? "MALE" : "FEMALE", spouseOfId: selected.id }),
                  )
                }
                onRemoveMarriage={(id) => void mutate(() => repo.deleteMarriage(id))}
              />
              <details className="rounded-md border border-parchment-200 p-3" open>
                <summary className="cursor-pointer text-sm font-semibold text-bark-700">Details</summary>
                <div className="mt-3">
                  <MemberForm
                    tree={tree}
                    member={selected}
                    busy={busy}
                    onSave={(input) => void mutate(() => repo.updateMember(selected.id, input))}
                    onDelete={async () => {
                      const next = await mutate(() => repo.deleteMember(selected.id));
                      if (next) setPanel({ kind: "list" });
                    }}
                  />
                </div>
              </details>
              {tree.rootMemberId !== selected.id && !selected.fatherId && !selected.motherId && (
                <button type="button" className="btn-outline w-full" onClick={() => void mutate(() => repo.updateTree({ rootMemberId: selected.id }))}>
                  Make this the root of the trunk
                </button>
              )}
            </div>
          )}
        </aside>

        <main className="relative min-w-0 flex-1">
          <PosterViewport width={layout.width} height={layout.height}>
            <TreePoster
              ref={svgRef}
              layout={layout}
              meta={{ title: tree.title, subtitle: tree.subtitle, name: tree.name }}
              selectedId={selectedId}
              highlightIds={highlightIds}
              onSelect={select}
              className="block h-full w-full"
            />
          </PosterViewport>
          {layout.stats.unplaced > 0 && (
            <div className="absolute start-4 top-4 rounded-md bg-white/90 px-3 py-2 text-xs shadow">
              {layout.stats.unplaced} member(s) are not connected to the main lineage and are not drawn
              (e.g. in-laws without recorded parents).
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

/** ASCII-only file name: some browsers drop non-Latin download names. */
function exportName(name: string) {
  const slug = name
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .toLowerCase();
  return slug ? `shajarah-${slug}` : "shajarah-poster";
}
