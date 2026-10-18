"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { nasab } from "@/lib/genealogy";
import { normalizeName } from "@/lib/nasab";
import { likelyDuplicates, planMergeSources, sourceUsage } from "@/lib/sources";
import type { SourceDTO, TreeDTO } from "@/lib/types";
import type { CreateSourceInput, UpdateSourceInput } from "@/lib/validation";
import { MediaList, NewSourceDialog, eventLabel, type MediaListProps } from "./MemberAttachments";

interface Props {
  tree: TreeDTO;
  busy: boolean;
  /** The source shown on the right (kept by the workspace, so it survives undo). */
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onCreate: (input: CreateSourceInput) => Promise<TreeDTO | null>;
  onUpdate: (id: string, input: UpdateSourceInput) => Promise<unknown>;
  onDelete: (id: string) => Promise<unknown>;
  onMerge: (fromId: string, intoId: string) => Promise<unknown>;
  onRemoveCitation: (id: string) => void;
  /** Shows a person in the side panel. */
  onOpenMember: (id: string) => void;
  media: Omit<MediaListProps, "files" | "ownerName" | "busy" | "onAddMedia"> & {
    onAddMedia: (sourceId: string, input: { url: string; fileType: string; caption: string | null }) => Promise<unknown>;
  };
}

type Sort = "title" | "most" | "unused";
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
/** A source as named in a confirmation: duplicates often differ only by author. */
const named = (s: SourceDTO) => `"${s.title}"${s.author ? ` (${s.author})` : ""}`;

/**
 * Every source of the family: what each one supports, its files, and the
 * tools to keep the list clean (edit, merge duplicates, delete). Each change
 * is one undo step, like any other edit.
 */
export function SourcesPage(props: Props) {
  const { tree, busy, selectedId, onSelect } = props;
  const uid = useId();
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<Sort>("title");
  const [creating, setCreating] = useState(false);
  const usage = useMemo(() => sourceUsage(tree), [tree]);

  const list = useMemo(() => {
    const q = normalizeName(query.trim());
    const matches = (s: SourceDTO) =>
      !q || [s.title, s.author, s.publication].some((f) => f && normalizeName(f).includes(q));
    const by: Record<Sort, (a: SourceDTO, b: SourceDTO) => number> = {
      title: (a, b) => a.title.localeCompare(b.title, "ar"),
      most: (a, b) => usage.get(b.id)!.citations - usage.get(a.id)!.citations || a.title.localeCompare(b.title, "ar"),
      unused: (a, b) => usage.get(a.id)!.citations - usage.get(b.id)!.citations || a.title.localeCompare(b.title, "ar"),
    };
    return tree.sources.filter(matches).sort(by[sort]);
  }, [tree.sources, query, sort, usage]);

  // keep a source selected: the first one, or the next after a delete or merge
  const selected = tree.sources.find((s) => s.id === selectedId) ?? null;
  useEffect(() => {
    if (!selected && list.length) onSelect(list[0].id);
  }, [selected, list, onSelect]);

  return (
    <div className="flex h-full min-h-0">
      <section aria-labelledby={`${uid}-h`} className="flex w-80 shrink-0 flex-col border-e border-parchment-300 bg-white">
        <div className="space-y-2 border-b border-parchment-200 p-3">
          <div className="flex items-center gap-2">
            <h2 id={`${uid}-h`} className="flex-1 text-sm font-semibold uppercase tracking-wide text-bark-500">
              Sources ({tree.sources.length})
            </h2>
            <button type="button" className="btn-primary py-1 text-sm" onClick={() => setCreating(true)}>＋ New source</button>
          </div>
          <input
            className="input py-1 text-sm" dir="auto" type="search" placeholder="Search title, author, publication…"
            aria-label="Search sources" value={query} onChange={(e) => setQuery(e.target.value)}
          />
          <label className="flex items-center gap-2 text-xs text-gray-600">
            Order
            <select className="input w-auto py-0.5 text-xs" value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
              <option value="title">by title</option>
              <option value="most">most cited first</option>
              <option value="unused">unused first</option>
            </select>
          </label>
        </div>
        <ul className="flex-1 overflow-auto" aria-label="Sources">
          {tree.sources.length === 0 && (
            <li className="p-6 text-center text-sm text-gray-500">
              No sources yet. Add one here, cite one from a person&apos;s panel, or import a GEDCOM file.
            </li>
          )}
          {tree.sources.length > 0 && list.length === 0 && <li className="p-4 text-sm text-gray-500">No source matches.</li>}
          {list.map((s) => {
            const u = usage.get(s.id)!;
            return (
              <li key={s.id}>
                <button
                  type="button"
                  aria-current={s.id === selectedId ? "true" : undefined}
                  onClick={() => onSelect(s.id)}
                  className={`block w-full border-b border-parchment-100 px-3 py-2 text-start hover:bg-parchment-50 ${s.id === selectedId ? "bg-parchment-100" : ""}`}
                >
                  <bdi className="block truncate font-medium">{s.title}</bdi>
                  {s.author && <bdi className="block truncate text-xs text-gray-600">{s.author}</bdi>}
                  <span className="mt-0.5 block text-xs text-gray-500">
                    {u.citations ? `${plural(u.citations, "citation")} · ${plural(u.people, "person", "people")}` : <span className="text-amber-700">not cited</span>}
                    {u.media > 0 && ` · ${plural(u.media, "file")}`}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      <div className="min-w-0 flex-1 overflow-auto bg-parchment-50 p-6">
        {selected ? <SourceDetail key={selected.id} {...props} source={selected} /> : (
          <p className="text-sm text-gray-500">Select a source to see what it supports.</p>
        )}
      </div>

      {creating && (
        <NewSourceDialog
          busy={busy}
          onCancel={() => setCreating(false)}
          onCreate={async (input) => {
            const before = new Set(tree.sources.map((x) => x.id));
            const next = await props.onCreate(input);
            const created = next?.sources.find((x) => !before.has(x.id));
            if (created) {
              onSelect(created.id);
              setCreating(false);
            }
          }}
        />
      )}
    </div>
  );
}

function SourceDetail({ tree, busy, source, onUpdate, onDelete, onMerge, onRemoveCitation, onOpenMember, onSelect, media }: Props & { source: SourceDTO }) {
  const uid = useId();
  const id = (f: string) => `${uid}-${f}`;
  const blank = { title: source.title, author: source.author ?? "", publication: source.publication ?? "", notes: source.notes ?? "" };
  const [d, setD] = useState(blank);
  // an undo or another change of this source shows its saved values again
  useEffect(() => setD({ title: source.title, author: source.author ?? "", publication: source.publication ?? "", notes: source.notes ?? "" }), [source]);
  const dirty = JSON.stringify(d) !== JSON.stringify(blank);
  const text = (v: string) => v.trim() || null;

  const citations = tree.citations
    .filter((c) => c.sourceId === source.id)
    .map((c) => ({ c, member: tree.members.find((m) => m.id === c.memberId) }))
    .sort((a, b) => (a.member?.generation ?? 0) - (b.member?.generation ?? 0) || (a.member?.name ?? "").localeCompare(b.member?.name ?? "", "ar"));
  const files = tree.media.filter((m) => m.sourceId === source.id);

  // merging: likely duplicates first
  const dupes = useMemo(() => likelyDuplicates(tree, source.id), [tree, source.id]);
  const others = useMemo(
    () => [...dupes, ...tree.sources.filter((x) => x.id !== source.id && !dupes.includes(x)).sort((a, b) => a.title.localeCompare(b.title, "ar"))],
    [tree.sources, dupes, source.id],
  );
  const [into, setInto] = useState("");
  useEffect(() => setInto(dupes[0]?.id ?? ""), [dupes]);

  const merge = () => {
    const target = tree.sources.find((x) => x.id === into);
    if (!target) return;
    const m = planMergeSources(tree, source.id, target.id);
    const dropped = m.dropCitationIds.length + m.dropMediaIds.length;
    const msg =
      `Merge ${named(source)} into ${named(target)}?\n\n` +
      `${plural(m.moveCitations.length, "citation")} and ${plural(m.moveMedia.length, "file")} move to the source you keep.` +
      (dropped ? ` ${plural(dropped, "repeat")} it already has ${dropped === 1 ? "is" : "are"} dropped.` : "") +
      `\n${named(source)} is then removed. You can undo this.`;
    if (confirm(msg)) void onMerge(source.id, target.id).then(() => onSelect(target.id));
  };
  const remove = () => {
    const msg =
      `Delete ${named(source)}?\n\n` +
      (citations.length || files.length
        ? `Its ${plural(citations.length, "citation")} and ${plural(files.length, "file link")} are removed too. The people stay.`
        : "It is not cited anywhere.") +
      " You can undo this.";
    if (confirm(msg)) void onDelete(source.id).then(() => onSelect(null));
  };

  return (
    <article className="mx-auto max-w-3xl space-y-6" aria-labelledby={id("h")}>
      <header>
        <h2 id={id("h")} className="text-xl font-bold text-bark-800"><bdi>{source.title}</bdi></h2>
        {source.author && <p className="text-sm text-gray-600"><bdi>{source.author}</bdi></p>}
        {dupes.length > 0 && (
          <p className="mt-1 rounded-md bg-amber-50 px-3 py-1.5 text-sm text-amber-900">
            Looks like the same source as <bdi className="font-medium">{dupes[0].title}</bdi>
            {dupes.length > 1 && ` and ${plural(dupes.length - 1, "other")}`}: merge them below.
          </p>
        )}
      </header>

      <form
        className="space-y-3 rounded-lg border border-parchment-200 bg-white p-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (!d.title.trim() || !dirty) return;
          void onUpdate(source.id, { title: d.title.trim(), author: text(d.author), publication: text(d.publication), notes: text(d.notes) });
        }}
      >
        <div>
          <label htmlFor={id("title")} className="mb-1 block text-xs font-medium text-bark-700">Title *</label>
          <input id={id("title")} className="input" dir="auto" required value={d.title} onChange={(e) => setD({ ...d, title: e.target.value })} />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor={id("author")} className="mb-1 block text-xs font-medium text-bark-700">Author</label>
            <input id={id("author")} className="input" dir="auto" value={d.author} onChange={(e) => setD({ ...d, author: e.target.value })} />
          </div>
          <div>
            <label htmlFor={id("pub")} className="mb-1 block text-xs font-medium text-bark-700">Publication</label>
            <input id={id("pub")} className="input" dir="auto" placeholder="publisher, place, year" value={d.publication} onChange={(e) => setD({ ...d, publication: e.target.value })} />
          </div>
        </div>
        <div>
          <label htmlFor={id("notes")} className="mb-1 block text-xs font-medium text-bark-700">Notes</label>
          <textarea id={id("notes")} className="input min-h-[70px]" dir="auto" value={d.notes} onChange={(e) => setD({ ...d, notes: e.target.value })} />
        </div>
        <div className="flex gap-2">
          <button type="submit" className="btn-primary" disabled={busy || !dirty || !d.title.trim()}>Save source</button>
          {dirty && <button type="button" className="btn-ghost" onClick={() => setD(blank)}>Discard changes</button>}
        </div>
      </form>

      <section aria-labelledby={id("cites")} className="space-y-2">
        <h3 id={id("cites")} className="section-title">
          Cited for {plural(new Set(citations.map((x) => x.c.memberId)).size, "person", "people")} ({plural(citations.length, "citation")})
        </h3>
        {citations.length === 0 ? (
          <p className="text-sm text-gray-500">Not cited yet. Cite it from a person&apos;s panel (Sources).</p>
        ) : (
          <table className="w-full overflow-hidden rounded-lg border border-parchment-200 bg-white text-sm">
            <thead className="bg-parchment-100 text-start text-xs text-bark-700">
              <tr>
                <th scope="col" className="px-3 py-1.5 text-start font-medium">Person</th>
                <th scope="col" className="px-3 py-1.5 text-start font-medium">For</th>
                <th scope="col" className="px-3 py-1.5 text-start font-medium">Page / detail</th>
                <th scope="col" className="w-8"><span className="sr-only">Remove</span></th>
              </tr>
            </thead>
            <tbody>
              {citations.map(({ c, member }) => (
                <tr key={c.id} className="border-t border-parchment-100" data-testid="source-citation">
                  <td className="px-3 py-1.5">
                    {member ? (
                      <button type="button" className="text-start font-naskh text-[15px] text-bark-800 underline-offset-2 hover:underline" onClick={() => onOpenMember(member.id)}>
                        <bdi>{nasab(tree.members, member.id, 3)}</bdi>
                      </button>
                    ) : "?"}
                  </td>
                  <td className="px-3 py-1.5">{eventLabel(c.eventType) ?? <span className="text-gray-400">in general</span>}</td>
                  <td className="px-3 py-1.5"><bdi>{c.page ?? ""}</bdi></td>
                  <td className="px-1">
                    <button type="button" className="btn-ghost px-1 text-xs" disabled={busy} aria-label={`Remove citation for ${member?.name ?? "this person"}`} onClick={() => onRemoveCitation(c.id)}>
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <div className="rounded-lg border border-parchment-200 bg-white p-4">
        <MediaList
          {...media}
          files={files}
          ownerName={source.title}
          busy={busy}
          onAddMedia={(input) => media.onAddMedia(source.id, input)}
        />
      </div>

      <section aria-labelledby={id("tidy")} className="space-y-3 rounded-lg border border-parchment-200 bg-white p-4">
        <h3 id={id("tidy")} className="section-title">Merge or delete</h3>
        {others.length > 0 && (
          <div className="flex flex-wrap items-end gap-2">
            <div className="min-w-0 flex-1">
              <label htmlFor={id("into")} className="mb-1 block text-xs font-medium text-bark-700">
                Merge this source into
              </label>
              <select id={id("into")} className="input py-1 text-sm" dir="auto" value={into} onChange={(e) => setInto(e.target.value)}>
                <option value="">Choose the source to keep…</option>
                {others.map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.title}{x.author ? ` — ${x.author}` : ""}{dupes.includes(x) ? " (looks the same)" : ""}
                  </option>
                ))}
              </select>
            </div>
            <button type="button" className="btn-outline" disabled={busy || !into} onClick={merge}>Merge</button>
          </div>
        )}
        <p className="text-xs text-gray-500">
          Merging moves every citation and file to the source you keep (repeats are dropped), fills its empty
          fields from this one, and removes this one.
        </p>
        <button type="button" className="btn-danger" disabled={busy} onClick={remove}>Delete source</button>
      </section>
    </article>
  );
}
