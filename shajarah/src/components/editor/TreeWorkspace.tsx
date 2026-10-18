"use client";

import Link from "next/link";
import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { computePosterLayout } from "@/lib/layout/botanical";
import { branchHeads, clearestPaper, isClear, rankBranches, type BranchOption } from "@/lib/layout/branches";
import { generationColor } from "@/lib/layout/palette";
import { lineagePath, nasab } from "@/lib/genealogy";
import type { Gender, TreeDTO } from "@/lib/types";
import type { CreateMemberInput } from "@/lib/validation";
import { ExportMenu } from "../poster/ExportMenu";
import { PosterViewport } from "../poster/PosterViewport";
import { TreePoster } from "../poster/TreePoster";
import { MemberForm, emptyDraft, type MemberDraft } from "./MemberForm";
import { NasabImport } from "./NasabImport";
import { GedcomPanel } from "./GedcomPanel";
import { importReceipt, type ImportReceipt } from "@/lib/imports";
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
  | { kind: "import" }
  | { kind: "gedcom" };

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

  // The last bulk import, while it can still be undone exactly: any later
  // change to the people in the tree ends that (poster settings do not).
  const [lastImport, setLastImport] = useState<{ receipt: ImportReceipt; label: string } | null>(null);
  const mutate = useCallback(async (fn: () => Promise<TreeDTO>, opts: { keepImport?: boolean } = {}) => {
    setBusy(true);
    setError(null);
    if (!opts.keepImport) setLastImport(null);
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
  // The selected person's direct line, from the data (not from the drawing)
  const [trace, setTrace] = useState(true);
  const lineageIds = useMemo(() => {
    if (!selected || !trace) return undefined;
    const { ancestors, descendants } = lineagePath(tree.members, tree.lineage, selected.id);
    return new Set([...ancestors, ...descendants]);
  }, [selected, trace, tree.members, tree.lineage]);

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
    const previous = tree.settings;
    const settings = { ...tree.settings, showFemales, seed, ...patch };
    setTree((t) => ({ ...t, settings })); // optimistic
    void mutate(() => repo.updateTree({ settings }), { keepImport: true }).then((saved) => {
      // not saved: put the poster back as it was (the error is shown)
      if (!saved) setTree((t) => (t.settings === settings ? { ...t, settings: previous } : t));
    });
  };

  // What to offer when no single poster size is enough for the whole family
  // (inside a branch poster: its sub-branches, so a branch can be narrowed again)
  const branches = useMemo(() => branchHeads(deferredTree, layout), [deferredTree, layout]);
  const fallbacks: Fallbacks = {
    branches,
    measure: (id) => clearestPaper(deferredTree, id, (p) => ({ showFemales, seed, ...layoutOptionsFor(theme, p) })),
    onFocus: (id, paper) => updateSettings({ focusId: id, ...(paper ? { posterSize: paper } : {}) }),
    onHideDaughters: showFemales && tree.lineage !== "MATRILINEAL" ? () => updateSettings({ showFemales: false }) : null,
    onTiled: posterSize !== "2A0" ? () => updateSettings({ posterSize: "2A0" }) : null,
  };
  // a branch poster needs at least one descendant to be a branch
  const selectedHasDescendants = useMemo(
    () => !!selected && lineagePath(tree.members, tree.lineage, selected.id).descendants.length > 0,
    [selected, tree.members, tree.lineage],
  );

  /** Runs a bulk import, remembering exactly what it added so it can be undone. */
  const runImport = async (fn: () => Promise<TreeDTO>, source: string) => {
    const before = tree;
    const next = await mutate(fn);
    if (!next) return;
    const receipt = importReceipt(before, next);
    const n = receipt.memberIds.length;
    if (n || receipt.marriageIds.length || receipt.restore.length) {
      setLastImport({ receipt, label: `Imported ${n} ${n === 1 ? "person" : "people"} from ${source}.` });
    }
    setPanel({ kind: "list" });
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
          {/* in a matrilineal tree the women are the line: they are always shown */}
          {tree.lineage !== "MATRILINEAL" && (
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={showFemales} onChange={(e) => updateSettings({ showFemales: e.target.checked })} />
              Show daughters
            </label>
          )}
          <label className="flex items-center gap-2 text-sm" title="Select a person to highlight their ancestors and descendants">
            <input type="checkbox" checked={trace} onChange={(e) => setTrace(e.target.checked)} />
            Trace lineage
          </label>
          {theme.foliage && (
            <button type="button" className="btn-ghost" title="Grow the decorative foliage anew" onClick={() => updateSettings({ seed: seed + 1 })}>
              ↻ Re-grow foliage
            </button>
          )}
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
                <button type="button" className="btn-outline px-2 text-xs" title="Import or export a GEDCOM file" onClick={() => setPanel({ kind: "gedcom" })}>
                  GEDCOM
                </button>
              </div>
              {lastImport && (
                <div className="flex items-center gap-2 border-b border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-900" role="status">
                  <span className="flex-1">{lastImport.label}</span>
                  <button
                    type="button"
                    className="btn-outline whitespace-nowrap py-0.5 text-xs"
                    disabled={busy}
                    onClick={() => void mutate(() => repo.undoImport(lastImport.receipt))}
                  >
                    Undo this import
                  </button>
                  <button type="button" className="text-emerald-700" aria-label="Dismiss" onClick={() => setLastImport(null)}>×</button>
                </div>
              )}
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
              onImport={(text) => void runImport(() => repo.importNasab(text), "the pasted nasab")}
            />
          )}

          {panel.kind === "gedcom" && (
            <GedcomPanel
              tree={tree}
              busy={busy}
              filename={exportName(tree.name)}
              onCancel={() => setPanel({ kind: "list" })}
              onImport={(text, fileName) => void runImport(() => repo.importGedcom(text), fileName)}
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
                {tree.settings?.focusId === selected.id ? (
                  <button type="button" className="btn-outline w-full" onClick={() => updateSettings({ focusId: null })}>
                    ✓ Poster shows only this branch — show the whole family
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn-outline w-full disabled:opacity-50"
                    disabled={!selectedHasDescendants}
                    title={selectedHasDescendants ? undefined : "No descendants recorded yet: there is no branch to show"}
                    onClick={() => updateSettings({ focusId: selected.id })}
                  >
                    🌿 Poster of this branch only (their ancestors and descendants)
                    {!selectedHasDescendants && <span className="block text-xs text-gray-500">No descendants recorded yet</span>}
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
              lineageIds={lineageIds}
              showIssues
              onSelect={select}
              frameSrc={frameSrc}
              className="block h-full w-full"
            />
          </PosterViewport>
          {layout.focus && (
            <div className="absolute bottom-4 start-1/2 z-10 flex -translate-x-1/2 items-center gap-3 rounded-full border border-parchment-300 bg-white/95 px-4 py-1.5 text-xs shadow">
              <span>
                Showing only the branch of <b dir="auto">{layout.focus.label}</b> ({layout.stats.total} of {tree.members.length} members)
              </span>
              <button type="button" className="btn-ghost whitespace-nowrap py-0.5 text-xs" onClick={() => updateSettings({ focusId: null })}>
                Show the whole family
              </button>
            </div>
          )}
          {!layout.clarity.ok && (
            <ClarityNotice
              issues={layout.clarity.issues.length}
              paper={posterSize}
              fallbacks={fallbacks}
              findSize={() => {
                // try each larger poster until the connections are unambiguous
                for (const p of PAPER_ORDER.slice(PAPER_ORDER.indexOf(posterSize) + 1)) {
                  const l = computePosterLayout(deferredTree, { showFemales, seed, ...layoutOptionsFor(theme, p) });
                  if (isClear(l)) return p;
                }
                return null;
              }}
              onChoose={(p) => updateSettings({ posterSize: p })}
            />
          )}
          {layout.clarity.ok && !layout.legibility.ok && (
            <LegibilityNotice
              smallestMm={layout.legibility.smallestTextMm}
              minMm={layout.legibility.minTextMm}
              paper={posterSize}
              suggestion={paperForScale(posterSize, layout.legibility.scaleNeeded)}
              fallbacks={fallbacks}
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
  smallestMm, minMm, paper, suggestion, fallbacks, onChoose,
}: {
  smallestMm: number;
  minMm: number;
  paper: PaperSize;
  suggestion: PaperSize | null;
  fallbacks: Fallbacks;
  onChoose: (p: PaperSize) => void;
}) {
  return (
    <div className="absolute end-4 top-4 z-10 max-w-sm rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900 shadow">
      <p className="font-semibold">Too dense for {paper}</p>
      <p className="mt-1">
        The smallest names would print at {smallestMm.toFixed(1)} mm (minimum {minMm.toFixed(1)} mm).
        {suggestion
          ? ` On ${suggestion} every name stays readable.`
          : " Even 2A0 is too small for the whole family on one sheet."}
      </p>
      {suggestion && (
        <button type="button" className="btn-outline mt-2 py-1 text-xs" onClick={() => onChoose(suggestion)}>
          Use {suggestion}
        </button>
      )}
      {!suggestion && <FallbackActions {...fallbacks} />}
    </div>
  );
}

/**
 * Shown when some connections could still be misread (a line under an
 * unrelated name, a shallow crossing, two lines running together). The
 * spots are circled on the poster; a larger poster usually resolves them.
 */
function ClarityNotice({
  issues, paper, fallbacks, findSize, onChoose,
}: {
  issues: number;
  paper: PaperSize;
  fallbacks: Fallbacks;
  findSize: () => PaperSize | null;
  onChoose: (p: PaperSize) => void;
}) {
  const [state, setState] = useState<"idle" | "searching" | PaperSize | "none">("idle");
  useEffect(() => setState("idle"), [issues, paper]);
  return (
    <div className="absolute end-4 top-4 z-10 max-w-sm rounded-md border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-900 shadow">
      <p className="font-semibold">Some connections are ambiguous on {paper}</p>
      <p className="mt-1">
        {issues} place{issues === 1 ? "" : "s"} (circled) where a line passes under another name, crosses
        too shallowly or runs into another line, so a reader could misread who descends from whom.
      </p>
      {state === "idle" && (
        <button
          type="button"
          className="btn-outline mt-2 py-1 text-xs"
          onClick={() => {
            setState("searching");
            // let the button repaint before the (blocking) layout runs
            setTimeout(() => setState(findSize() ?? "none"), 30);
          }}
        >
          Find a poster size where every line is clear
        </button>
      )}
      {state === "searching" && <p className="mt-2">Checking larger sizes…</p>}
      {state === "none" && (
        <>
          <p className="mt-2">
            No single poster up to 2A0 keeps every line clear for the whole family. The circled places
            stay marked here (they never print). Instead:
          </p>
          <FallbackActions {...fallbacks} />
        </>
      )}
      {state !== "idle" && state !== "searching" && state !== "none" && (
        <button type="button" className="btn-outline mt-2 py-1 text-xs" onClick={() => onChoose(state)}>
          Use {state}: every line clear
        </button>
      )}
    </div>
  );
}

type Fallbacks = {
  branches: Omit<BranchOption, "clearAt">[];
  /** Smallest clear poster for one branch (runs layouts: slow on big families). */
  measure: (id: string) => PaperSize | null;
  onFocus: (id: string, paper: PaperSize | null) => void;
  onHideDaughters: (() => void) | null;
  onTiled: (() => void) | null;
};

/**
 * The ways out when a family is too big for one clear poster: a poster of
 * one branch, fewer names, or the largest size printed in tiles. Branches
 * are listed by the smallest poster each is clear on (the one that will
 * actually work first), with the number of people on each.
 */
function FallbackActions({ branches, measure, onFocus, onHideDaughters, onTiled }: Fallbacks) {
  const [ranked, setRanked] = useState<BranchOption[] | null>(null);
  const [done, setDone] = useState(0);
  const [choice, setChoice] = useState("");
  const key = branches.map((b) => b.id).join(",");
  useEffect(() => {
    let live = true;
    setRanked(null);
    setDone(0);
    const results: BranchOption[] = [];
    // one branch per tick, so the notice can show progress between layouts
    const next = (i: number) => {
      if (!live) return;
      if (i === branches.length) {
        const r = rankBranches(results);
        setRanked(r);
        setChoice(r[0]?.id ?? "");
        return;
      }
      results.push({ ...branches[i], clearAt: measure(branches[i].id) });
      setDone(i + 1);
      setTimeout(() => next(i + 1), 0);
    };
    const t = setTimeout(() => next(0), 30);
    return () => {
      live = false;
      clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-measure only when the branches change
  }, [key]);
  const chosen = ranked?.find((b) => b.id === choice);
  return (
    <div className="mt-2 space-y-1.5">
      {branches.length > 0 && !ranked && (
        <p>Checking which poster size each branch fits… {done} of {branches.length}</p>
      )}
      {ranked && ranked.length > 0 && (
        <div className="space-y-1">
          <select className="input w-full py-0.5 text-xs" value={choice} onChange={(e) => setChoice(e.target.value)} dir="auto">
            {ranked.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name} — {b.people} people — {b.clearAt ? `clear on ${b.clearAt}` : "not clear even on 2A0"}
              </option>
            ))}
          </select>
          {chosen && (
            <button type="button" className="btn-outline py-1 text-xs" onClick={() => onFocus(chosen.id, chosen.clearAt)}>
              {chosen.clearAt ? `Poster of this branch on ${chosen.clearAt}` : "Poster of this branch (then narrow it further)"}
            </button>
          )}
        </div>
      )}
      {onHideDaughters && (
        <button type="button" className="btn-outline block py-1 text-xs" onClick={onHideDaughters}>
          Hide daughters
        </button>
      )}
      {onTiled && (
        <button type="button" className="btn-outline block py-1 text-xs" onClick={onTiled}>
          Use 2A0, printed as a Tiled PDF
        </button>
      )}
    </div>
  );
}
