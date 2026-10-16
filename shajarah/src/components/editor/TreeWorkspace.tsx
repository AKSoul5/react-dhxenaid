"use client";

import Link from "next/link";
import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { computePosterLayout } from "@/lib/layout/botanical";
import { generationColor } from "@/lib/layout/palette";
import { nasab } from "@/lib/genealogy";
import type { Gender, TreeDTO } from "@/lib/types";
import type { CreateMemberInput } from "@/lib/validation";
import { ExportMenu } from "../poster/ExportMenu";
import { PosterViewport } from "../poster/PosterViewport";
import { TreePoster } from "../poster/TreePoster";
import { MemberForm, emptyDraft, type MemberDraft } from "./MemberForm";
import { NasabImport } from "./NasabImport";
import { RelationsPanel } from "./RelationsPanel";
import { StylePanel } from "./StylePanel";
import { layoutOptionsFor, resolveTheme } from "@/lib/theme";
import { PAPER_ORDER, PAPER_SIZES, paperForScale, type PaperSize } from "@/lib/paper";
import { apiRepository, localRepository, type FamilyRepository } from "./repository";

interface Props {
  initialTree: TreeDTO;
  mode: "api" | "local";
}

type Panel =
  | { kind: "list" }
  | { kind: "edit"; id: string }
  | { kind: "new"; draft: MemberDraft }
  | { kind: "import" };

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
  const frameSrc = useFrameArtwork();

  const showFemales = tree.settings?.showFemales ?? false;
  const seed = tree.settings?.seed ?? 7;
  const posterSize: PaperSize = tree.settings?.posterSize ?? "A2";
  const theme = useMemo(() => resolveTheme(tree.settings), [tree.settings]);
  // Layout is recomputed on every edit; deferring keeps typing responsive.
  const deferredTree = useDeferredValue(tree);
  const layout = useMemo(
    () =>
      computePosterLayout(deferredTree, {
        showFemales, seed,
        ...layoutOptionsFor(theme, posterSize),
      }),
    [deferredTree, showFemales, seed, theme, posterSize],
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
    const settings = { ...tree.settings, showFemales, seed, ...patch };
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
          <StylePanel
            theme={theme}
            onChange={(patch) => updateSettings({ theme: { ...theme, ...patch } })}
            soilText={tree.soilText}
            onSoilTextChange={(soilText) => void mutate(() => repo.updateTree({ soilText }))}
            frameAvailable={frameSrc !== null}
          />
          <label className="flex items-center gap-2 text-sm" title="The printed size the poster is designed for">
            Poster
            <select className="input w-auto py-1" value={posterSize} onChange={(e) => updateSettings({ posterSize: e.target.value as PaperSize })}>
              {PAPER_ORDER.map((p) => (
                <option key={p} value={p}>{p} — {PAPER_SIZES[p].w}×{PAPER_SIZES[p].h} mm</option>
              ))}
            </select>
          </label>
          <ExportMenu key={posterSize} svgRef={svgRef} filename={exportName(tree.name)} defaultPaper={posterSize} />
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
                <button type="button" className="btn-outline" title="Paste a nasab: أحمد بن نوفل بن …" onClick={() => setPanel({ kind: "import" })}>
                  بن…
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

          {panel.kind === "import" && (
            <NasabImport
              tree={tree}
              busy={busy}
              onCancel={() => setPanel({ kind: "list" })}
              onImport={async (text) => {
                const next = await mutate(() => repo.importNasab(text));
                if (next) setPanel({ kind: "list" });
              }}
            />
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
              <div className="space-y-2 rounded-md border border-parchment-200 p-3 text-sm">
                <h4 className="section-title">Poster tiers</h4>
                <p className="text-gray-600">
                  Soil (ancient lineage) → trunk (medallions) → canopy (branches).
                </p>
                {tree.crownBaseId === selected.id ? (
                  <button type="button" className="btn-outline w-full" onClick={() => void mutate(() => repo.updateTree({ crownBaseId: null }))}>
                    ✓ Canopy starts here — reset to automatic
                  </button>
                ) : (
                  <button type="button" className="btn-outline w-full" onClick={() => void mutate(() => repo.updateTree({ crownBaseId: selected.id }))}>
                    🌳 Start the canopy here
                  </button>
                )}
                {tree.trunkStartId === selected.id ? (
                  <button type="button" className="btn-outline w-full" onClick={() => void mutate(() => repo.updateTree({ trunkStartId: null }))}>
                    ✓ Trunk starts here — reset to automatic
                  </button>
                ) : (
                  <button type="button" className="btn-outline w-full" onClick={() => void mutate(() => repo.updateTree({ trunkStartId: selected.id }))}>
                    🪵 Start the trunk here (older ancestors go in the soil)
                  </button>
                )}
              </div>
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
              theme={theme}
              selectedId={selectedId}
              highlightIds={highlightIds}
              onSelect={select}
              frameSrc={frameSrc}
              className="block h-full w-full"
            />
          </PosterViewport>
          {!layout.legibility.ok && (
            <LegibilityNotice
              smallestMm={layout.legibility.smallestTextMm}
              minMm={layout.legibility.minTextMm}
              paper={posterSize}
              suggestion={paperForScale(posterSize, layout.legibility.scaleNeeded)}
              onChoose={(p) => updateSettings({ posterSize: p })}
            />
          )}
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

/** The frame artwork's URL, or null when neither public/poster-frame.jpg nor .png exists. */
const FRAME_URLS = ["/poster-frame.jpg", "/poster-frame.png"];
function useFrameArtwork(): string | null | undefined {
  const [src, setSrc] = useState<string | null | undefined>(undefined);
  useEffect(() => {
    let live = true;
    (async () => {
      for (const url of FRAME_URLS) {
        try {
          const r = await fetch(url, { method: "HEAD" });
          if (r.ok && (r.headers.get("content-type") ?? "").startsWith("image/")) return url;
        } catch {
          // try the next one
        }
      }
      return null;
    })().then((url) => live && setSrc(url));
    return () => {
      live = false;
    };
  }, []);
  return src;
}

/**
 * Shown when the family cannot be set legibly on the chosen poster size:
 * offers the size that fits, or tiled printing when even A0 is too small.
 */
function LegibilityNotice({
  smallestMm, minMm, paper, suggestion, onChoose,
}: {
  smallestMm: number;
  minMm: number;
  paper: PaperSize;
  suggestion: PaperSize | null;
  onChoose: (p: PaperSize) => void;
}) {
  return (
    <div className="absolute end-4 top-4 z-10 max-w-sm rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900 shadow">
      <p className="font-semibold">Too dense for {paper}</p>
      <p className="mt-1">
        The smallest names would print at {smallestMm.toFixed(1)} mm (minimum {minMm.toFixed(1)} mm).
        {suggestion
          ? ` On ${suggestion} every name stays readable.`
          : " Even 2A0 is too small: hide daughters, or set where the trunk starts so older ancestors move into the foundation."}
      </p>
      {suggestion && (
        <button type="button" className="btn-outline mt-2 py-1 text-xs" onClick={() => onChoose(suggestion)}>
          Use {suggestion}
        </button>
      )}
    </div>
  );
}
