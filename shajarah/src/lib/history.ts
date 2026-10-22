// Undo/redo as immutable snapshots of the whole tree.
//
// Every edit already returns the full tree, so instead of an inverse
// operation per kind of edit (a bug farm), the editor keeps the tree as it
// was before each edit. Undo puts that snapshot back, on the server too
// (POST /api/trees/:id/restore). A 300-person tree is about 50 KB, so 50
// steps cost a few megabytes at most.

import type { TreeDTO } from "./types";

export interface HistoryEntry {
  /** The tree before (undo stack) or after (redo stack) the step. */
  tree: TreeDTO;
  /** What the step did, for the Undo/Redo tooltips: "Add member", "Import 6 people". */
  label: string;
  /** Unique per step, so a shortcut (the import banner) can tell whether it is still on top. */
  id: number;
  /** Steps with the same key in quick succession are one step (dragging a colour picker). */
  key: string | null;
  /** When the step last grew (ms). */
  at: number;
}

export interface History {
  undo: HistoryEntry[];
  redo: HistoryEntry[];
}

export const HISTORY_LIMIT = 50;
/** Edits with the same coalescing key within this many ms of each other are one undo step. */
export const COALESCE_MS = 1500;

export const emptyHistory = (): History => ({ undo: [], redo: [] });

let nextId = 1;

/**
 * Records an edit: `before` is the tree before it. A new edit ends any
 * redo. An edit with the same key as the last one, soon after it, joins
 * that step, which keeps its older snapshot.
 */
export function record(
  h: History,
  before: TreeDTO,
  label: string,
  opts: { key?: string | null; now?: number; limit?: number } = {},
): { history: History; id: number } {
  const now = opts.now ?? Date.now();
  const key = opts.key ?? null;
  const top = h.undo.at(-1);
  if (key && top && top.key === key && now - top.at < COALESCE_MS) {
    return { history: { undo: [...h.undo.slice(0, -1), { ...top, at: now }], redo: [] }, id: top.id };
  }
  const entry: HistoryEntry = { tree: before, label, id: nextId++, key, at: now };
  const undo = [...h.undo, entry].slice(-(opts.limit ?? HISTORY_LIMIT));
  return { history: { undo, redo: [] }, id: entry.id };
}

/** Takes the last step back: returns the tree to show, with `current` kept for redo. */
export function undo(h: History, current: TreeDTO): { history: History; tree: TreeDTO; entry: HistoryEntry } | null {
  const entry = h.undo.at(-1);
  if (!entry) return null;
  return {
    tree: entry.tree,
    entry,
    history: { undo: h.undo.slice(0, -1), redo: [...h.redo, { ...entry, tree: current }] },
  };
}

/** Does the last undone step again. */
export function redo(h: History, current: TreeDTO): { history: History; tree: TreeDTO; entry: HistoryEntry } | null {
  const entry = h.redo.at(-1);
  if (!entry) return null;
  return {
    tree: entry.tree,
    entry,
    history: { undo: [...h.undo, { ...entry, tree: current, key: null }], redo: h.redo.slice(0, -1) },
  };
}

/** Drops a step that turned out not to happen (its save failed). */
export function forget(h: History, id: number): History {
  return { undo: h.undo.filter((e) => e.id !== id), redo: h.redo };
}
