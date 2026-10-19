"use client";

import Link from "next/link";
import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { computePosterLayout } from "@/lib/layout/botanical";
import { branchHeads, clearestPaper, rankBranches, smallestClearPaper, type BranchOption } from "@/lib/layout/branches";
import { generationColor } from "@/lib/layout/palette";
import { hiddenFromPoster, lineagePath, moveAmongSiblings, nasab, siblingsInOrder, withAncestors } from "@/lib/genealogy";
import type { Gender, MemberDTO, TreeDTO } from "@/lib/types";
import type { CreateMemberInput } from "@/lib/validation";
import { ExportMenu } from "../poster/ExportMenu";
import { PosterViewport } from "../poster/PosterViewport";
import { TreePoster } from "../poster/TreePoster";
import { MemberForm, emptyDraft, type MemberDraft } from "./MemberForm";
import { MemberAttachments } from "./MemberAttachments";
import { SourcesPage } from "./SourcesPage";
import { NasabImport } from "./NasabImport";
import { GedcomPanel } from "./GedcomPanel";
import { importReceipt, type ImportReceipt } from "@/lib/imports";
import { emptyHistory, forget, record, redo, undo, type History } from "@/lib/history";
import { RelationsPanel } from "./RelationsPanel";
import { StylePanel } from "./StylePanel";
import { layoutOptionsFor, resolveTheme } from "@/lib/theme";
import { isPaperSize, PAPER_ORDER, PAPER_SIZES, paperForScale, type PaperSize } from "@/lib/paper";
import { ConflictError, apiRepository, localRepository, type FamilyRepository } from "./repository";
import { readProjectFile, withNewIds } from "@/lib/project";
import { openProjectFile } from "../projectFiles";
import { mergePeople, spouseNamed } from "@/lib/merge";
import { normalizeName } from "@/lib/nasab";

interface Props {
  initialTree: TreeDTO;
  mode: "api" | "local";
}

/** Poster settings are saved this long after the last change (one save while dragging a slider). */
const SETTINGS_SAVE_MS = 400;

type Panel =
  | { kind: "list" }
  | { kind: "edit"; id: string }
  | { kind: "new"; draft: MemberDraft }
  | { kind: "import" }
  | { kind: "gedcom" }
  /** The people the poster could not draw, each to open and fix. */
  | { kind: "unplaced" };

export function TreeWorkspace({ initialTree, mode }: Props) {
  const [tree, setTree] = useState(initialTree);
  const repo = useMemo<FamilyRepository>(
    () => (mode === "api" ? apiRepository(initialTree.id, initialTree.version) : localRepository(initialTree)),
    [mode, initialTree],
  );
  const [panel, setPanel] = useState<Panel>({ kind: "list" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** The tree changed elsewhere (another tab): changes are refused until a reload. */
  const [conflict, setConflict] = useState(false);
  const [query, setQuery] = useState("");
  const svgRef = useRef<SVGSVGElement>(null);
  const frameSrc = useFrameArtwork();

  const showFemales = tree.settings?.showFemales ?? false;
  const seed = tree.settings?.seed ?? 7;
  // (a size this version does not know, from a newer app's file: A2)
  const savedSize = tree.settings?.posterSize;
  const posterSize: PaperSize = isPaperSize(savedSize) ? savedSize : "A2";
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

  // ── Undo/redo: snapshots of the whole tree (src/lib/history.ts). The
  // refs hold the latest values for callbacks that outlive a render.
  const treeRef = useRef(tree);
  treeRef.current = tree;
  const [history, setHistory] = useState<History>(emptyHistory);
  const historyRef = useRef(history);
  const commitHistory = useCallback((h: History) => {
    historyRef.current = h;
    setHistory(h);
  }, []);
  const busyRef = useRef(false);

  // The last bulk import, while it can still be undone exactly: any later
  // change to the people in the tree ends that (poster settings do not).
  const [lastImport, setLastImport] = useState<{ receipt: ImportReceipt; label: string; stepId: number } | null>(null);
  const lastStepId = useRef(0);
  /**
   * Runs one edit. Every edit returns the full tree; on success the tree as
   * it was before goes onto the undo stack (one step per edit, so a form
   * saved once is one step however much was typed).
   */
  const mutate = useCallback(
    async (
      fn: () => Promise<TreeDTO>,
      opts: { label?: string; keepImport?: boolean; record?: boolean; before?: TreeDTO } = {},
    ) => {
      const before = opts.before ?? treeRef.current;
      setBusy(true);
      busyRef.current = true;
      setError(null);
      if (!opts.keepImport) setLastImport(null);
      try {
        const next = await fn();
        setTree(next);
        treeRef.current = next;
        if (opts.record !== false) {
          const r = record(historyRef.current, before, opts.label ?? "Edit");
          commitHistory(r.history);
          lastStepId.current = r.id;
        }
        return next;
      } catch (e) {
        if (e instanceof ConflictError) setConflict(true);
        else setError(e instanceof Error ? e.message : String(e));
        return null;
      } finally {
        setBusy(false);
        busyRef.current = false;
      }
    },
    [commitHistory],
  );

  // Poster or sources page; #sources in the address keeps the choice on reload
  const [view, setView] = useState<"poster" | "sources">("poster");
  const [sourceId, setSourceId] = useState<string | null>(null);
  useEffect(() => {
    if (window.location.hash === "#sources") setView("sources");
  }, []);
  const showView = (v: "poster" | "sources") => {
    setView(v);
    window.history.replaceState(null, "", v === "sources" ? "#sources" : window.location.pathname + window.location.search);
  };

  const selectedId = panel.kind === "edit" ? panel.id : null;
  const selected = tree.members.find((m) => m.id === selectedId) ?? null;
  // The selected person's direct line, from the data (not from the drawing)
  const [trace, setTrace] = useState(true);
  // A poster too dense for its paper is replaced by its options, unless asked for
  const [showDense, setShowDense] = useState(false);
  const lineageIds = useMemo(() => {
    if (!selected || !trace) return undefined;
    const { ancestors, descendants } = lineagePath(tree.members, tree.lineage, selected.id);
    return new Set([...ancestors, ...descendants]);
  }, [selected, trace, tree.members, tree.lineage]);

  const select = useCallback((id: string) => setPanel({ kind: "edit", id }), []);

  const saveNew = async (input: CreateMemberInput) => {
    const before = new Set(tree.members.map((m) => m.id));
    const next = await mutate(() => repo.createMember(input), { label: `Add ${input.name}` });
    const created = next?.members.find((m) => !before.has(m.id));
    if (created) setPanel({ kind: "edit", id: created.id });
  };

  const quickAddChild = (name: string, gender: Gender, otherParentId?: string | null) => {
    if (!selected) return;
    const parentKey = selected.gender === "FEMALE" ? "motherId" : "fatherId";
    // The other parent: the one chosen (married more than once), else the
    // only spouse.
    const marriages = tree.marriages.filter((x) => x.spouseAId === selected.id || x.spouseBId === selected.id);
    const spouseId = otherParentId !== undefined
      ? otherParentId
      : marriages.length === 1
        ? marriages[0].spouseAId === selected.id ? marriages[0].spouseBId : marriages[0].spouseAId
        : null;
    const otherKey = parentKey === "fatherId" ? "motherId" : "fatherId";
    // A daughter's child (a son's, in a mother's-line tree) by a husband
    // from outside the line is of another family: the poster shows her
    // family on dotted lines from then on. (Not a wife who married in, nor
    // a daughter married to a cousin: their children are of the line.)
    const line = tree.rootMemberId ? lineagePath(tree.members, tree.lineage, tree.rootMemberId).descendants : [];
    const ofLine = (m: MemberDTO | undefined) => !!m && line.includes(m.id);
    const daughterOfLine = (tree.lineage === "MATRILINEAL" ? selected.gender === "MALE" : selected.gender === "FEMALE") && ofLine(selected);
    const through = tree.settings?.familiesThrough ?? [];
    const showHerFamily = daughterOfLine && !ofLine(tree.members.find((m) => m.id === spouseId)) && !through.includes(selected.id);
    void (async () => {
      const next = await mutate(() => repo.createMember({ name, gender, [parentKey]: selected.id, [otherKey]: spouseId }), { label: `Add ${name}` });
      if (next && showHerFamily) updateSettings({ familiesThrough: [...through, selected.id] });
    })();
  };

  // A spouse just added is shown on the poster: spouses are switched on
  // (the "Show spouses" box in the header) if they were off.
  const addSpouse = async (fn: () => Promise<TreeDTO>, label: string) => {
    const next = await mutate(fn, { label });
    if (next && !theme.motherNames) updateSettings({ theme: { ...theme, motherNames: true } });
  };

  // Poster settings change on screen at once and are saved shortly after
  // the last change: dragging a colour picker is one save and one undo step.
  const pendingSettings = useRef<{ timer: ReturnType<typeof setTimeout>; saved: TreeDTO["settings"]; stepId: number } | null>(null);
  const updateSettings = (patch: Partial<NonNullable<TreeDTO["settings"]>>) => {
    const base = treeRef.current;
    const settings = {
      ...base.settings, showFemales: base.settings?.showFemales ?? false, seed: base.settings?.seed ?? 7, ...patch,
    };
    const r = record(historyRef.current, base, "Change poster settings", { key: "settings" });
    commitHistory(r.history);
    const next = { ...base, settings };
    treeRef.current = next;
    setTree(next); // optimistic
    const pending = pendingSettings.current;
    if (pending) clearTimeout(pending.timer);
    const saved = pending ? pending.saved : base.settings;
    const timer = setTimeout(() => {
      pendingSettings.current = null;
      const toSave = treeRef.current.settings;
      void mutate(
        async () => ({ ...(await repo.updateTree({ settings: toSave })), settings: treeRef.current.settings }),
        { keepImport: true, record: false },
      ).then((ok) => {
        if (ok) return;
        // not saved: put the poster back as it was saved (the error is shown)
        const cur = treeRef.current;
        if (cur.settings === toSave) {
          treeRef.current = { ...cur, settings: saved };
          setTree(treeRef.current);
          commitHistory(forget(historyRef.current, r.id));
        }
      });
    }, SETTINGS_SAVE_MS);
    pendingSettings.current = { timer, saved, stepId: r.id };
  };

  /** Undo or redo one step: show it at once, then make the server match. */
  const travel = useCallback(
    async (dir: "undo" | "redo") => {
      if (busyRef.current) return;
      const pending = pendingSettings.current;
      if (pending) {
        // the snapshot sets the settings anyway: no separate save
        clearTimeout(pending.timer);
        pendingSettings.current = null;
      }
      const current = treeRef.current;
      const prev = historyRef.current;
      const step = dir === "undo" ? undo(prev, current) : redo(prev, current);
      if (!step) return;
      commitHistory(step.history);
      treeRef.current = step.tree;
      setTree(step.tree);
      const saved = await mutate(() => repo.restore(step.tree), { record: false, keepImport: true });
      if (!saved) {
        // the server refused: back to where we were, history included
        commitHistory(prev);
        treeRef.current = current;
        setTree(current);
      }
    },
    [commitHistory, mutate, repo],
  );
  const travelRef = useRef(travel);
  travelRef.current = travel;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.altKey) return;
      // inside a text field the browser's own undo edits the text
      const el = e.target as HTMLElement | null;
      if (el?.closest("textarea, [contenteditable=''], [contenteditable='true']")) return;
      if (el instanceof HTMLInputElement && !["checkbox", "radio", "button", "submit", "range", "color", "file"].includes(el.type)) return;
      const k = e.key.toLowerCase();
      if (k === "z" && !e.shiftKey) {
        e.preventDefault();
        void travelRef.current("undo");
      } else if ((k === "z" && e.shiftKey) || (k === "y" && !e.shiftKey)) {
        e.preventDefault();
        void travelRef.current("redo");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  // the selected person may not exist in the tree an undo went back to
  useEffect(() => {
    if (panel.kind === "edit" && !tree.members.some((m) => m.id === panel.id)) setPanel({ kind: "list" });
  }, [panel, tree.members]);
  const nextUndo = history.undo.at(-1);
  const nextRedo = history.redo.at(-1);

  // What to offer when no single poster size is enough for the whole family
  // (inside a branch poster: its sub-branches, so a branch can be narrowed again)
  const branches = useMemo(() => branchHeads(deferredTree, layout), [deferredTree, layout]);
  const nextPaper = PAPER_ORDER[PAPER_ORDER.indexOf(posterSize) + 1] ?? null;
  const fallbacks: Fallbacks = {
    branches,
    measure: (id) => clearestPaper(deferredTree, id, (p) => ({ showFemales, seed, ...layoutOptionsFor(theme, p) })),
    onFocus: (id, paper) => updateSettings({ focusId: id, ...(paper ? { posterSize: paper } : {}) }),
    onHideDaughters: showFemales && tree.lineage !== "MATRILINEAL" ? () => updateSettings({ showFemales: false }) : null,
    // (a larger paper, printed in tiles: there is always a larger one)
    onTiled: nextPaper ? () => updateSettings({ posterSize: nextPaper }) : null,
  };
  /** The smallest larger poster on which every connection is unambiguous. */
  const findClearSize = () =>
    nextPaper && smallestClearPaper((p) => computePosterLayout(deferredTree, { showFemales, seed, ...layoutOptionsFor(theme, p) }), nextPaper);
  // the options replace a too-dense poster again whenever the layout changes
  useEffect(() => setShowDense(false), [layout]);
  // a branch poster needs at least one descendant to be a branch
  // A daughter's own family (her children belong to their father's line):
  // the poster can show it through her, on dotted lines.
  const familiesThrough = tree.settings?.familiesThrough ?? [];
  // A child moved among their brothers and sisters (by dragging on the
  // poster, the arrows in a parent's list, or the place in the form): all of
  // them renumbered 0, 1, 2 …, as one change.
  const moveChild = (id: string, position: number) => {
    const t = treeRef.current;
    const changes = new Map(moveAmongSiblings(t.members, t.lineage, id, position).map((c) => [c.id, c.birthOrder]));
    if (!changes.size) return;
    const next = { ...t, members: t.members.map((m) => (changes.has(m.id) ? { ...m, birthOrder: changes.get(m.id)! } : m)) };
    void mutate(() => repo.restore(next), { label: `Move ${t.members.find((m) => m.id === id)?.name}` });
  };
  const moveRef = useRef(moveChild);
  moveRef.current = moveChild;
  // (stable between edits, so the poster is not redrawn for nothing)
  const reorder = useMemo(() => ({
    siblingsOf: (id: string) => siblingsInOrder(tree.members, tree.lineage, id).map((m) => m.id),
    onMove: (id: string, position: number) => moveRef.current(id, position),
  }), [tree.members, tree.lineage]);
  const selectedHasOwnFamily = !!selected && tree.members.some((c) =>
    tree.lineage === "MATRILINEAL" ? c.fatherId === selected.id : c.motherId === selected.id);
  // only a name drawn in the canopy (not the trunk or the soil) can be centred
  const canopyIds = useMemo(
    () => new Set(layout.base ? lineagePath(tree.members, tree.lineage, layout.base.member.id).descendants : []),
    [layout.base, tree.members, tree.lineage],
  );
  const selectedInCanopy = !!selected && canopyIds.has(selected.id);
  const selectedHasDescendants = useMemo(
    () => !!selected && lineagePath(tree.members, tree.lineage, selected.id).descendants.length > 0,
    [selected, tree.members, tree.lineage],
  );
  // People hidden from the poster with their descendants. Nobody the tree
  // stands on can be: its root, trunk and canopy start, their ancestors.
  const hiddenIds = useMemo(() => tree.settings?.hiddenIds ?? [], [tree.settings?.hiddenIds]);
  const standsOn = useMemo(
    () => withAncestors(tree.members, [
      tree.rootMemberId, tree.crownBaseId, tree.trunkStartId, tree.settings?.focusId,
      layout.base?.member.id, ...layout.trunkLabels.map((l) => l.member.id),
    ]),
    [tree.members, tree.rootMemberId, tree.crownBaseId, tree.trunkStartId, tree.settings?.focusId, layout.base, layout.trunkLabels],
  );
  /** Why someone is not on the poster, and what would bring them onto it. */
  const whyNotDrawn = (m: MemberDTO): string => {
    const byId = (id: string | null) => (id ? tree.members.find((x) => x.id === id) : undefined);
    const partners = tree.marriages
      .filter((x) => x.spouseAId === m.id || x.spouseBId === m.id)
      .map((x) => byId(x.spouseAId === m.id ? x.spouseBId : x.spouseAId)?.name)
      .filter(Boolean);
    const mother = byId(m.motherId), father = byId(m.fatherId);
    if (!father && !mother) {
      if (partners.length) {
        return theme.motherNames
          ? `Married to ${partners.join(" / ")}, with no children by them on the poster.`
          : `Married to ${partners.join(" / ")}: shown on the branch when Show spouses is on.`;
      }
      return tree.members.some((c) => c.fatherId === m.id || c.motherId === m.id)
        ? "No parents recorded, and not married to anyone on the poster."
        : "Not linked to anyone: no parents, spouse or children recorded. A leftover? It can be deleted.";
    }
    if (mother && (!father || !father.fatherId) && tree.lineage !== "MATRILINEAL") {
      return `A child of ${mother.name}${father ? ` and ${father.name}` : ""}: shown with “Show her husband and children” on ${mother.name}'s panel.`;
    }
    if (father) return `A child of ${father.name}, who is not on the poster.`;
    return "Not connected to the main lineage.";
  };
  /** How many of their descendants go with `id` when hidden (in-laws who married in aside). */
  const hiddenWith = (id: string) =>
    [...hiddenFromPoster(tree.members, [id], standsOn, tree.marriages)]
      .filter((x) => x !== id && tree.members.some((m) => m.id === x && (m.fatherId || m.motherId))).length;

  /**
   * Opens a project file: saved families become a new family (and the editor
   * moves to it); the demo, which saves nothing, shows it in place of the
   * current one, as one undoable step.
   */
  const openProject = async (file: File) => {
    if (mode === "api") {
      setBusy(true);
      try {
        window.location.assign(`/trees/${await openProjectFile(file)}`);
      } catch (e) {
        setError((e as Error).message);
        setBusy(false);
      }
      return;
    }
    let project;
    try {
      project = readProjectFile(await file.text());
    } catch (e) {
      setError((e as Error).message);
      return;
    }
    const snapshot = withNewIds(project.tree, () => `local-${Math.random().toString(36).slice(2, 12)}`);
    const next = await mutate(() => repo.restore({ ...treeRef.current, ...snapshot }), { label: `Open ${file.name}` });
    if (next) setPanel({ kind: "list" });
  };

  /** Runs a bulk import, remembering exactly what it added so it can be undone. */
  const runImport = async (fn: () => Promise<TreeDTO>, source: string) => {
    const before = treeRef.current;
    const next = await mutate(fn, { label: `Import from ${source}` });
    if (!next) return;
    const receipt = importReceipt(before, next);
    const n = receipt.memberIds.length;
    if (n || receipt.marriageIds.length || receipt.restore.length) {
      setLastImport({ receipt, label: `Imported ${n} ${n === 1 ? "person" : "people"} from ${source}.`, stepId: lastStepId.current });
    }
    setPanel({ kind: "list" });
  };
  // The banner is a shortcut: while the import is the last step, it is the
  // global undo (so redo brings it back); after poster-settings changes on
  // top of it, it removes exactly what the import added (one new step).
  const importUndoable = !!lastImport && history.undo.some((e) => e.id === lastImport.stepId);
  const undoLastImport = () => {
    if (!lastImport) return;
    if (history.undo.at(-1)?.id === lastImport.stepId) void travel("undo");
    else void mutate(() => repo.undoImport(lastImport.receipt), { label: "Undo import" });
  };

  const filtered = useMemo(() => {
    // (hamza forms, ى / ي, ة / ه, diacritics, spaces and case ignored: احمد finds أحمد)
    const q = normalizeName(query.trim());
    const list = q
      ? tree.members.filter((m) => normalizeName(nasab(tree.members, m.id, 3)).includes(q) || normalizeName(m.laqab ?? "").includes(q))
      : tree.members;
    return [...list].sort((a, b) => a.generation - b.generation || a.birthOrder - b.birthOrder).slice(0, 400);
  }, [tree.members, query]);

  return (
    <div className="relative flex h-screen flex-col overflow-hidden bg-parchment-100 text-bark-900">
      <header className="relative z-40 flex items-center gap-4 border-b border-parchment-300 bg-white/80 px-4 py-2.5 backdrop-blur">
        <Link href="/" className="font-naskh text-2xl font-bold text-bark-700">شجرة</Link>
        <div className="min-w-0">
          <h1 className="truncate font-naskh text-lg font-bold" dir="auto">{tree.name}</h1>
          <p className="text-xs text-gray-500">
            {tree.members.length} members · {tree.members.reduce((g, m) => Math.max(g, m.generation + 1), 0)} generations
            {mode === "local" && " · demo mode (changes are not saved)"}
          </p>
        </div>
        <div role="tablist" aria-label="View" className="flex overflow-hidden rounded-md border border-parchment-300 text-sm">
          {(["poster", "sources"] as const).map((v) => (
            <button
              key={v}
              type="button"
              role="tab"
              aria-selected={view === v}
              className={`px-3 py-1 ${view === v ? "bg-bark-700 text-parchment-50" : "bg-white text-bark-700 hover:bg-parchment-50"}`}
              onClick={() => showView(v)}
            >
              {v === "poster" ? "Poster" : `Sources (${tree.sources.length})`}
            </button>
          ))}
        </div>
        <div className="ms-auto flex items-center gap-3">
          {/* in a matrilineal tree the women are the line: they are always shown */}
          {tree.lineage !== "MATRILINEAL" && (
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={showFemales} onChange={(e) => updateSettings({ showFemales: e.target.checked })} />
              Show daughters
            </label>
          )}
          <label className="flex items-center gap-2 text-sm" title="Each wife (or husband) as a cartouche on the branch, her children growing from it">
            <input type="checkbox" checked={theme.motherNames} onChange={(e) => updateSettings({ theme: { ...theme, motherNames: e.target.checked } })} />
            Show spouses
          </label>
          <label className="flex items-center gap-2 text-sm" title="Select a person to highlight their ancestors and descendants">
            <input type="checkbox" checked={trace} onChange={(e) => setTrace(e.target.checked)} />
            Trace lineage
          </label>
          <div className="flex items-center" role="group" aria-label="Undo and redo">
            <button
              type="button"
              className="btn-ghost px-2 text-lg leading-none disabled:opacity-30"
              aria-label={nextUndo ? `Undo: ${nextUndo.label}` : "Undo"}
              title={nextUndo ? `Undo: ${nextUndo.label} (Ctrl/⌘+Z)` : "Nothing to undo"}
              disabled={!nextUndo || busy}
              onClick={() => void travel("undo")}
            >
              ↶
            </button>
            <button
              type="button"
              className="btn-ghost px-2 text-lg leading-none disabled:opacity-30"
              aria-label={nextRedo ? `Redo: ${nextRedo.label}` : "Redo"}
              title={nextRedo ? `Redo: ${nextRedo.label} (Ctrl/⌘+Shift+Z)` : "Nothing to redo"}
              disabled={!nextRedo || busy}
              onClick={() => void travel("redo")}
            >
              ↷
            </button>
          </div>
          <StylePanel
            theme={theme}
            onChange={(patch) => updateSettings({ theme: { ...theme, ...patch } })}
            soilText={tree.soilText}
            onSoilTextChange={(soilText) => void mutate(() => repo.updateTree({ soilText }), { label: "Edit the soil inscription" })}
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
      {conflict && (
        <div role="alert" className="flex items-center gap-3 border-b border-amber-300 bg-amber-50 px-4 py-2 text-sm text-amber-900">
          <span className="flex-1">
            <b>Another tab made changes to this family.</b> Your last change was not saved, so nothing was overwritten.
            Reload to see the latest version.
          </span>
          <button type="button" className="btn-primary py-1" onClick={() => window.location.reload()}>Reload</button>
        </div>
      )}

      <div className="flex min-h-0 flex-1">
        <aside className="relative flex min-h-0 w-[380px] shrink-0 flex-col overflow-hidden border-e border-parchment-300 bg-white">
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
                <button type="button" className="btn-outline px-2 text-xs" title="Save or open a project file; import or export GEDCOM" onClick={() => setPanel({ kind: "gedcom" })}>
                  Files
                </button>
              </div>
              {lastImport && importUndoable && (
                <div className="flex items-center gap-2 border-b border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-900" role="status">
                  <span className="flex-1">{lastImport.label}</span>
                  <button
                    type="button"
                    className="btn-outline whitespace-nowrap py-0.5 text-xs"
                    disabled={busy}
                    onClick={undoLastImport}
                  >
                    Undo this import
                  </button>
                  <button type="button" className="text-emerald-700" aria-label="Dismiss" onClick={() => setLastImport(null)}>×</button>
                </div>
              )}
              <ul className="min-h-0 flex-1 overflow-auto">
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

          {panel.kind === "unplaced" && (
            <div className="space-y-3 p-3">
              <div className="flex items-center gap-2">
                <button type="button" className="btn-ghost px-2" onClick={() => setPanel({ kind: "list" })}>← All</button>
                <h3 className="text-sm font-semibold text-bark-900">Not on the poster ({layout.unplacedIds?.length ?? 0})</h3>
              </div>
              <p className="text-xs text-bark-500">
                Recorded in the family but not connected to what the poster draws. Choose someone to link, fix or delete them.
              </p>
              <ul className="space-y-1" aria-label="People not on the poster">
                {(layout.unplacedIds ?? []).map((id) => {
                  const m = tree.members.find((x) => x.id === id);
                  if (!m) return null;
                  return (
                    <li key={id}>
                      <button type="button" className="w-full rounded-md border border-parchment-200 px-3 py-2 text-start hover:border-gilt-400 hover:bg-parchment-50" onClick={() => select(id)}>
                        <span className="block font-naskh text-base text-bark-900" dir="auto">{nasab(tree.members, id, 3)}</span>
                        <span className="block text-xs text-bark-500">{whyNotDrawn(m)}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
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
              opensAsNew={mode === "api"}
              onOpenProject={(file) => void openProject(file)}
            />
          )}

          {panel.kind === "new" && (
            <div className="min-h-0 flex-1 overflow-auto p-4">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-bark-500">New member</h2>
              <MemberForm tree={tree} member={null} initialDraft={panel.draft} busy={busy} onSave={saveNew} onCancel={() => setPanel({ kind: "list" })} />
            </div>
          )}

          {panel.kind === "edit" && selected && (
            <div className="min-h-0 flex-1 space-y-5 overflow-auto p-4">
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
                onQuickAddParent={(name, gender) => {
                  // the other parent is most likely married to the known one:
                  // a name already among their spouses is that person, not a new one
                  const known = selected.fatherId ?? selected.motherId;
                  const same = known ? spouseNamed(tree, known, name) : null;
                  if (same) {
                    void mutate(() => repo.updateMember(selected.id, { [same.gender === "FEMALE" ? "motherId" : "fatherId"]: same.id }), { label: `${same.name} as ${selected.name}'s parent` });
                    return;
                  }
                  // (a new mother is recorded as the father's wife too)
                  const spouseOfId = known && (gender === "FEMALE") !== (tree.members.find((m) => m.id === known)?.gender === "FEMALE") ? known : undefined;
                  void mutate(() => repo.createMember({ name, gender, parentOfId: selected.id, ...(spouseOfId ? { spouseOfId } : {}) }), { label: `Add ${name} above ${selected.name}` });
                }}
                onSetParent={(childId, role, parentId) => {
                  const child = tree.members.find((m) => m.id === childId);
                  const parent = parentId ? tree.members.find((m) => m.id === parentId) : null;
                  void mutate(() => repo.updateMember(childId, { [role]: parentId }), {
                    label: parent ? `${parent.name} as ${child?.name}'s ${role === "motherId" ? "mother" : "father"}` : `Clear ${child?.name}'s ${role === "motherId" ? "mother" : "father"}`,
                  });
                }}
                onMove={moveChild}
                onMerge={(keepId, dropIds) => {
                  const keep = tree.members.find((m) => m.id === keepId);
                  const merged = dropIds.reduce((t, id) => mergePeople(t, keepId, id), treeRef.current);
                  void mutate(() => repo.restore(merged), { label: `Merge the records of ${keep?.name}` });
                }}
                onAddSpouse={(sid) => void addSpouse(() => repo.createMarriage({ spouseAId: selected.id, spouseBId: sid }), "Add marriage")}
                onNewSpouse={(name) =>
                  void addSpouse(
                    () => repo.createMember({ name, gender: selected.gender === "FEMALE" ? "MALE" : "FEMALE", spouseOfId: selected.id }),
                    `Add spouse ${name}`,
                  )
                }
                onRemoveMarriage={(id) => void mutate(() => repo.deleteMarriage(id), { label: "Remove marriage" })}
              />
              <details className="rounded-md border border-parchment-200 p-3" open>
                <summary className="cursor-pointer text-sm font-semibold text-bark-700">Details</summary>
                <div className="mt-3">
                  <MemberForm
                    tree={tree}
                    member={selected}
                    busy={busy}
                    onSave={(input) => void mutate(() => repo.updateMember(selected.id, input), { label: `Edit ${selected.name}` })}
                    onMove={(position) => moveChild(selected.id, position)}
                    onDelete={async () => {
                      const next = await mutate(() => repo.deleteMember(selected.id), { label: `Delete ${selected.name}` });
                      if (next) setPanel({ kind: "list" });
                    }}
                    attachments={
                      <MemberAttachments
                        tree={tree}
                        member={selected}
                        busy={busy}
                        onUpload={(file) => repo.uploadMedia(file)}
                        onAddMedia={(m) => mutate(() => repo.createMedia({ ...m, memberId: selected.id }), { label: "Add photo or document" })}
                        onUpdateMedia={(id, input) => mutate(() => repo.updateMedia(id, input), { label: input.url ? "Upload file" : "Edit caption" })}
                        onRemoveMedia={(id) => void mutate(() => repo.deleteMedia(id), { label: "Remove photo or document" })}
                        onCite={(input) => mutate(() => repo.createCitation(input), { label: "Cite source" })}
                        onRemoveCitation={(id) => void mutate(() => repo.deleteCitation(id), { label: "Remove citation" })}
                        onCreateSource={(input) => mutate(() => repo.createSource(input), { label: `Add source ${input.title}` })}
                      />
                    }
                  />
                </div>
              </details>
              <div className="space-y-2 rounded-md border border-parchment-200 p-3 text-sm">
                <h4 className="section-title">Poster tiers</h4>
                <p className="text-gray-600">
                  Soil (ancient lineage) → trunk (medallions) → canopy (branches).
                </p>
                {tree.crownBaseId === selected.id ? (
                  <button type="button" className="btn-outline w-full" onClick={() => void mutate(() => repo.updateTree({ crownBaseId: null }), { label: "Reset the canopy start" })}>
                    ✓ Canopy starts here — reset to automatic
                  </button>
                ) : (
                  <button type="button" className="btn-outline w-full" onClick={() => void mutate(() => repo.updateTree({ crownBaseId: selected.id }), { label: "Set the canopy start" })}>
                    🌳 Start the canopy here
                  </button>
                )}
                {tree.trunkStartId === selected.id ? (
                  <button type="button" className="btn-outline w-full" onClick={() => void mutate(() => repo.updateTree({ trunkStartId: null }), { label: "Reset the trunk start" })}>
                    ✓ Trunk starts here — reset to automatic
                  </button>
                ) : (
                  <button type="button" className="btn-outline w-full" onClick={() => void mutate(() => repo.updateTree({ trunkStartId: selected.id }), { label: "Set the trunk start" })}>
                    🪵 Start the trunk here (older ancestors go in the soil)
                  </button>
                )}
                {tree.settings?.centerBranchId === selected.id ? (
                  <button type="button" className="btn-outline w-full" onClick={() => updateSettings({ centerBranchId: null })}>
                    ✓ Centered in canopy — reset
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn-outline w-full disabled:opacity-50"
                    disabled={!selectedInCanopy}
                    title={selectedInCanopy ? "Place this branch straight above the trunk, its brothers to either side" : "Only a branch in the canopy can be centred"}
                    onClick={() => updateSettings({ centerBranchId: selected.id })}
                  >
                    🎯 Center this branch in the tree
                  </button>
                )}
                {selectedHasOwnFamily && (
                  familiesThrough.includes(selected.id) ? (
                    <button type="button" className="btn-outline w-full" onClick={() => updateSettings({ familiesThrough: familiesThrough.filter((id) => id !== selected.id) })}>
                      ✓ {selected.gender === "FEMALE" ? "Her husband and children are" : "His wife and children are"} shown (dotted) — hide
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="btn-outline w-full"
                      title="Relatives outside the lineage: drawn from this person on dotted lines"
                      onClick={() => updateSettings({ familiesThrough: [...familiesThrough, selected.id] })}
                    >
                      ┈ Show {selected.gender === "FEMALE" ? "her husband and children" : "his wife and children"} (dotted lines)
                    </button>
                  )
                )}
                {selectedHasOwnFamily && !showFemales && tree.lineage !== "MATRILINEAL" && selected.gender === "FEMALE" && (
                  <p className="text-xs text-bark-500">Daughters are hidden, and their families with them: tick <b>Show daughters</b> to see hers.</p>
                )}
                {hiddenIds.includes(selected.id) ? (
                  <button type="button" className="btn-outline w-full" onClick={() => updateSettings({ hiddenIds: hiddenIds.filter((id) => id !== selected.id) })}>
                    ✓ Hidden from the poster — show again
                  </button>
                ) : !standsOn.has(selected.id) && (
                  <button
                    type="button"
                    className="btn-outline w-full"
                    title="Leave this person off the poster, with all their children and descendants (by every marriage). Nothing is deleted."
                    onClick={() => updateSettings({ hiddenIds: [...hiddenIds, selected.id] })}
                  >
                    🙈 Hide from the poster{hiddenWith(selected.id) > 0 && ` (and ${hiddenWith(selected.id)} ${selected.gender === "FEMALE" ? "of her" : "of his"} descendants)`}
                  </button>
                )}
                {tree.settings?.focusId === selected.id ? (
                  <button type="button" className="btn-outline w-full" onClick={() => updateSettings({ focusId: null })}>
                    ✓ Poster shows only this branch — show the whole family
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn-outline w-full flex-col disabled:opacity-50"
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
                <button type="button" className="btn-outline w-full" onClick={() => void mutate(() => repo.updateTree({ rootMemberId: selected.id }), { label: "Set the root" })}>
                  Make this the root of the trunk
                </button>
              )}
            </div>
          )}
        </aside>

        <main className="relative min-h-0 min-w-0 flex-1 overflow-hidden">
          {view === "sources" ? (
            <SourcesPage
              tree={tree}
              busy={busy}
              selectedId={sourceId}
              onSelect={setSourceId}
              onCreate={(input) => mutate(() => repo.createSource(input), { label: `Add source ${input.title}` })}
              onUpdate={(id, input) => mutate(() => repo.updateSource(id, input), { label: "Edit source" })}
              onDelete={(id) => mutate(() => repo.deleteSource(id), { label: `Delete source ${tree.sources.find((x) => x.id === id)?.title ?? ""}` })}
              onMerge={(from, into) =>
                mutate(() => repo.mergeSources(from, into), {
                  label: `Merge ${tree.sources.find((x) => x.id === from)?.title ?? "source"} into ${tree.sources.find((x) => x.id === into)?.title ?? "source"}`,
                })
              }
              onRemoveCitation={(id) => void mutate(() => repo.deleteCitation(id), { label: "Remove citation" })}
              onOpenMember={select}
              media={{
                onUpload: (file) => repo.uploadMedia(file),
                onAddMedia: (sid, m) => mutate(() => repo.createMedia({ ...m, sourceId: sid }), { label: "Add file to source" }),
                onUpdateMedia: (id, input) => mutate(() => repo.updateMedia(id, input), { label: input.url ? "Upload file" : "Edit caption" }),
                onRemoveMedia: (id) => void mutate(() => repo.deleteMedia(id), { label: "Remove file" }),
              }}
            />
          ) : (
            <>
            {layout.tooDense && !showDense && (
              <TooDensePanel
                issues={layout.clarity.issues.length}
                branch={!!layout.focus}
                paper={posterSize}
                fallbacks={fallbacks}
                findSize={findClearSize}
                onChoose={(p) => updateSettings({ posterSize: p })}
                onShowAnyway={() => setShowDense(true)}
              />
            )}
            {/* (kept in the page while hidden, so export still has the poster) */}
            <div className={layout.tooDense && !showDense ? "invisible" : "contents"}>
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
                reorder={reorder}
                frameSrc={frameSrc}
                className="block h-full w-full"
              />
            </PosterViewport>
            </div>
            {hiddenIds.length > 0 && (
              // (hidden people cannot be clicked on the poster: brought back from here)
              <div className="absolute bottom-4 start-4 z-10 flex max-w-[40%] flex-wrap items-center gap-1.5 rounded-xl border border-parchment-300 bg-white/95 px-3 py-1.5 text-xs shadow">
                <span className="text-bark-500">Hidden:</span>
                {hiddenIds.map((id) => {
                  const m = tree.members.find((x) => x.id === id);
                  if (!m) return null;
                  const more = hiddenWith(id);
                  return (
                    <span key={id} className="inline-flex items-center gap-1 rounded-full border border-parchment-300 bg-parchment-50 ps-2">
                      <button type="button" className="font-naskh text-sm" dir="auto" onClick={() => select(id)}>{m.name}</button>
                      {more > 0 && <span className="text-bark-500">+{more}</span>}
                      <button type="button" className="rounded-full px-1.5 text-bark-500 hover:bg-parchment-200 hover:text-bark-900"
                        aria-label={`Show ${m.name} on the poster again`} title="Show again"
                        onClick={() => updateSettings({ hiddenIds: hiddenIds.filter((x) => x !== id) })}>✕</button>
                    </span>
                  );
                })}
              </div>
            )}
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
            {!layout.clarity.ok && !(layout.tooDense && !showDense) && (
              <ClarityNotice
                issues={layout.clarity.issues.length}
                tooDense={layout.tooDense}
                paper={posterSize}
                fallbacks={fallbacks}
                findSize={findClearSize}
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
              <button
                type="button"
                className="absolute start-4 top-4 rounded-md bg-white/90 px-3 py-2 text-start text-xs shadow outline-none hover:bg-white focus-visible:ring-2 focus-visible:ring-gilt-500"
                onClick={() => setPanel({ kind: "unplaced" })}
              >
                {layout.stats.unplaced} {layout.stats.unplaced === 1 ? "member is" : "members are"} not connected to the main lineage and not drawn
                (e.g. in-laws without recorded parents). <span className="font-medium text-gilt-600 underline">Show who →</span>
              </button>
            )}
            </>
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
  issues, tooDense, paper, fallbacks, findSize, onChoose,
}: {
  issues: number;
  /** Shown anyway although too dense: the lines are not circled (there are too many). */
  tooDense: boolean;
  paper: PaperSize;
  fallbacks: Fallbacks;
  findSize: () => PaperSize | null;
  onChoose: (p: PaperSize) => void;
}) {
  const [state, setState] = useState<"idle" | "searching" | PaperSize | "none">("idle");
  useEffect(() => setState("idle"), [issues, paper]);
  return (
    <div className="absolute end-4 top-4 z-10 max-w-sm rounded-md border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-900 shadow">
      <p className="font-semibold">{tooDense ? `Too dense for ${paper}: shown for reference only` : `Some connections are ambiguous on ${paper}`}</p>
      <p className="mt-1">
        {tooDense
          ? `${issues} connections could be misread at this size. Do not print it on ${paper}.`
          : `${issues} place${issues === 1 ? "" : "s"} (circled) where a line passes under another name, crosses too shallowly or runs into another line, so a reader could misread who descends from whom.`}
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

/**
 * Replaces a poster too dense for its paper (more than CLARITY_LIMIT
 * ambiguous connections even with smaller names): no tangled poster, just
 * the ways to a clear one.
 */
function TooDensePanel({
  issues, branch, paper, fallbacks, findSize, onChoose, onShowAnyway,
}: {
  issues: number;
  branch: boolean;
  paper: PaperSize;
  fallbacks: Fallbacks;
  findSize: () => PaperSize | null;
  onChoose: (p: PaperSize) => void;
  onShowAnyway: () => void;
}) {
  const [state, setState] = useState<"idle" | "searching" | PaperSize | "none">("idle");
  useEffect(() => setState("idle"), [issues, paper]);
  const larger = PAPER_ORDER.slice(PAPER_ORDER.indexOf(paper) + 1);
  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center overflow-auto p-6">
      <div role="alert" className="w-full max-w-xl rounded-2xl border-2 border-red-300 bg-white px-8 py-7 text-red-950 shadow-xl">
        <p className="text-2xl font-bold">This {branch ? "branch" : "family"} is too dense for {paper}.</p>
        <p className="mt-2 text-lg">Please use a larger poster size or focus on a smaller sub-branch.</p>
        <p className="mt-2 text-sm text-red-800">
          {issues} connections could be misread at this size, even with the names set smaller, so the poster is not shown.
        </p>
        {larger.length > 0 && (
          <div className="mt-5">
            <p className="text-sm font-semibold">A larger poster</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {larger.map((p) => (
                <button key={p} type="button" className="btn-outline py-1.5 text-sm" onClick={() => onChoose(p)}>
                  {p}
                </button>
              ))}
              {state === "idle" && (
                <button
                  type="button"
                  className="btn-primary py-1.5 text-sm"
                  onClick={() => {
                    setState("searching");
                    setTimeout(() => setState(findSize() ?? "none"), 30);
                  }}
                >
                  Find the smallest size where every line is clear
                </button>
              )}
              {state === "searching" && <span className="text-sm">Checking larger sizes…</span>}
              {state === "none" && <span className="text-sm">No single poster up to 2A0 is clear: use a sub-branch.</span>}
              {state !== "idle" && state !== "searching" && state !== "none" && (
                <button type="button" className="btn-primary py-1.5 text-sm" onClick={() => onChoose(state)}>
                  Use {state}: every line clear
                </button>
              )}
            </div>
          </div>
        )}
        <div className="mt-5 text-sm">
          <p className="font-semibold">A smaller sub-branch</p>
          <FallbackActions {...fallbacks} />
        </div>
        <button type="button" className="mt-5 text-xs text-red-800 underline" onClick={onShowAnyway}>
          Show the poster anyway (for reference, not for printing)
        </button>
      </div>
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
          <select className="input w-full py-0.5 text-xs" value={choice} onChange={(e) => setChoice(e.target.value)} dir="ltr">
            {ranked.map((b) => (
              <option key={b.id} value={b.id}>
                {/* the name isolated (U+2068 … U+2069), so an Arabic name does not reorder the English around it */}
                {`\u2068${b.name}\u2069`} — {b.people} people — {b.clearAt ? `clear on ${b.clearAt}` : "not clear even on 2A0"}
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
          Use the next size up, printed as a Tiled PDF
        </button>
      )}
    </div>
  );
}
