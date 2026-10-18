"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { CitationDTO, MediaDTO, MemberDTO, TreeDTO } from "@/lib/types";
import type { CreateCitationInput, CreateSourceInput } from "@/lib/validation";

interface Props {
  tree: TreeDTO;
  member: MemberDTO;
  busy: boolean;
  /** Stores the file and returns its URL (server upload, or a data: URL in the demo). */
  onUpload: (file: File) => Promise<{ url: string; fileType: string }>;
  onAddMedia: (input: { url: string; fileType: string; caption: string | null }) => Promise<unknown>;
  onUpdateMedia: (id: string, input: { url?: string; fileType?: string; caption?: string | null }) => Promise<unknown>;
  onRemoveMedia: (id: string) => void;
  onCite: (input: CreateCitationInput) => Promise<unknown>;
  onRemoveCitation: (id: string) => void;
  /** Creates a source and resolves to the updated tree (to pick the new source). */
  onCreateSource: (input: CreateSourceInput) => Promise<TreeDTO | null>;
}

export const EVENTS: [string, string][] = [
  ["", "In general"], ["BIRT", "Birth"], ["DEAT", "Death"], ["MARR", "Marriage"], ["BURI", "Burial"],
  ["OCCU", "Occupation"], ["RESI", "Residence"], ["EDUC", "Education"],
];
export const eventLabel = (tag: string | null) => (tag ? EVENTS.find(([t]) => t === tag)?.[1] ?? tag : null);

/** A file this page can show or open: uploaded here, on the web, or (demo) held in the page. */
const reachable = (url: string) => /^(https?:\/\/|\/api\/media\/blob\/|data:)/i.test(url);
const isImage = (m: MediaDTO) =>
  reachable(m.url) && (m.fileType ? m.fileType.startsWith("image/") : /\.(jpe?g|png|gif|webp)(\?|$)/i.test(m.url));
const fileName = (url: string) => url.split(/[\\/]/).pop() || url;

/**
 * Photos, documents and sources of one person. Each change is saved at
 * once (and is one undo step); none of it waits for the form's Save.
 */
export function MemberAttachments(props: Props) {
  return (
    <div className="space-y-4 border-t border-parchment-200 pt-4">
      <MediaList {...props} files={props.tree.media.filter((m) => m.memberId === props.member.id)} ownerName={props.member.name} />
      <SourcesSection {...props} />
    </div>
  );
}

export interface MediaListProps {
  /** The files to show (of one person, or of one source). */
  files: MediaDTO[];
  /** Whose files: for the images' alternative text. */
  ownerName: string;
  busy: boolean;
  onUpload: Props["onUpload"];
  onAddMedia: Props["onAddMedia"];
  onUpdateMedia: Props["onUpdateMedia"];
  onRemoveMedia: Props["onRemoveMedia"];
}

/** Photos and documents of a person or a source: thumbnails, captions, upload, remove. */
export function MediaList({ files: media, ownerName, busy, onUpload, onAddMedia, onUpdateMedia, onRemoveMedia }: MediaListProps) {
  const uid = useId();
  const [uploading, setUploading] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);

  const upload = async (file: File | undefined, replace?: MediaDTO) => {
    if (!file) return;
    setProblem(null);
    setUploading(file.name);
    try {
      const { url, fileType } = await onUpload(file);
      if (replace) await onUpdateMedia(replace.id, { url, fileType });
      else await onAddMedia({ url, fileType, caption: null });
    } catch (e) {
      setProblem(e instanceof Error ? e.message : String(e));
    } finally {
      setUploading(null);
    }
  };

  return (
    <section aria-labelledby={`${uid}-media`} className="space-y-2">
      <h4 id={`${uid}-media`} className="section-title">Photos and documents</h4>
      {media.length === 0 && <p className="text-xs text-gray-500">None yet.</p>}
      <ul className="space-y-2">
        {media.map((m) => (
          <li key={m.id} className="flex items-start gap-2 rounded-md border border-parchment-200 p-2" data-testid="media-item">
            {isImage(m) ? (
              <a href={m.url} target="_blank" rel="noreferrer" className="shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element -- user files, any origin, any size */}
                <img src={m.url} alt={m.caption ?? `Photo of ${ownerName}`} className="h-16 w-16 rounded object-cover" loading="lazy" />
              </a>
            ) : (
              <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded bg-parchment-100 text-2xl" aria-hidden>
                📄
              </span>
            )}
            <div className="min-w-0 flex-1 space-y-1">
              <CaptionField media={m} busy={busy} onSave={(caption) => onUpdateMedia(m.id, { caption })} />
              {reachable(m.url) ? (
                !isImage(m) && (
                  <a href={m.url} target="_blank" rel="noreferrer" className="block truncate text-xs text-bark-700 underline" download={m.url.startsWith("data:") ? "document" : undefined}>
                    Open {m.fileType === "application/pdf" ? "PDF" : "file"}
                  </a>
                )
              ) : (
                // a GEDCOM file names the file on the other program's computer, without its contents
                <p className="text-xs text-amber-800">
                  <span className="font-mono">{fileName(m.url)}</span>: only the name came with the imported file.{" "}
                  <label className="cursor-pointer underline">
                    Upload it
                    <input type="file" accept="image/*,application/pdf" className="sr-only" disabled={busy || !!uploading} onChange={(e) => void upload(e.target.files?.[0], m)} />
                  </label>
                </p>
              )}
            </div>
            <button type="button" className="btn-ghost px-2 text-sm" disabled={busy} aria-label={`Remove ${m.caption ?? fileName(m.url)}`} onClick={() => onRemoveMedia(m.id)}>
              ✕
            </button>
          </li>
        ))}
      </ul>
      <label className={`btn-outline inline-flex cursor-pointer py-1 text-sm ${busy || uploading ? "pointer-events-none opacity-60" : ""}`}>
        {uploading ? `Uploading ${uploading}…` : "＋ Add photo or document"}
        <input
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp,application/pdf"
          className="sr-only"
          disabled={busy || !!uploading}
          onChange={(e) => {
            void upload(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      </label>
      <p className="text-xs text-gray-500">JPEG, PNG, GIF, WebP or PDF, up to 5 MB.</p>
      {problem && <p className="text-xs text-red-700" role="alert">{problem}</p>}
    </section>
  );
}

function CaptionField({ media, busy, onSave }: { media: MediaDTO; busy: boolean; onSave: (caption: string | null) => unknown }) {
  const [value, setValue] = useState(media.caption ?? "");
  useEffect(() => setValue(media.caption ?? ""), [media.caption]);
  const save = () => {
    const next = value.trim() || null;
    if (next !== (media.caption ?? null)) onSave(next);
  };
  return (
    <input
      className="input py-1 text-sm"
      dir="auto"
      aria-label="Caption"
      placeholder="Caption"
      value={value}
      disabled={busy}
      onChange={(e) => setValue(e.target.value)}
      onBlur={save}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        if (e.key === "Escape") setValue(media.caption ?? "");
      }}
    />
  );
}

function SourcesSection({ tree, member, busy, onCite, onRemoveCitation, onCreateSource }: Props) {
  const uid = useId();
  const id = (f: string) => `${uid}-${f}`;
  const citations = tree.citations.filter((c) => c.memberId === member.id);
  const [sourceId, setSourceId] = useState("");
  const [eventType, setEventType] = useState("");
  const [page, setPage] = useState("");
  const [creating, setCreating] = useState(false);
  useEffect(() => {
    if (sourceId && !tree.sources.some((x) => x.id === sourceId)) setSourceId("");
  }, [tree.sources, sourceId]);

  const cite = async () => {
    if (!sourceId) return;
    await onCite({ sourceId, memberId: member.id, eventType: eventType || null, page: page.trim() || null });
    setPage("");
  };
  const titleOf = (c: CitationDTO) => tree.sources.find((x) => x.id === c.sourceId)?.title ?? "?";

  return (
    <section aria-labelledby={id("sources")} className="space-y-2">
      <h4 id={id("sources")} className="section-title">Sources</h4>
      {citations.length === 0 && <p className="text-xs text-gray-500">No sources cited yet.</p>}
      <ul className="space-y-1">
        {citations.map((c) => (
          <li key={c.id} className="flex items-start gap-2 rounded-md bg-parchment-50 px-2 py-1 text-sm" data-testid="citation">
            <span className="min-w-0 flex-1">
              {/* bdi: an Arabic title next to a Latin page number keeps each in its own direction */}
              <bdi className="font-medium">{titleOf(c)}</bdi>
              {c.page && <> · <bdi>{c.page}</bdi></>}
              {c.eventType && <span className="ms-1 rounded bg-parchment-200 px-1 text-xs">{eventLabel(c.eventType)}</span>}
            </span>
            <button type="button" className="btn-ghost px-1 text-xs" disabled={busy} aria-label={`Remove citation of ${titleOf(c)}`} onClick={() => onRemoveCitation(c.id)}>
              ✕
            </button>
          </li>
        ))}
      </ul>

      <div className="space-y-2 rounded-md border border-parchment-200 p-2">
        <div>
          <label htmlFor={id("source")} className="mb-1 block text-xs font-medium text-bark-700">Source</label>
          <div className="flex gap-1">
            <select id={id("source")} className="input min-w-0 flex-1 py-1 text-sm" dir="auto" value={sourceId} onChange={(e) => setSourceId(e.target.value)}>
              <option value="">{tree.sources.length ? "Choose a source…" : "No sources yet: create one"}</option>
              {tree.sources.map((x) => (
                <option key={x.id} value={x.id}>{x.title}{x.author ? ` — ${x.author}` : ""}</option>
              ))}
            </select>
            <button type="button" className="btn-outline whitespace-nowrap px-2 py-1 text-xs" onClick={() => setCreating(true)}>
              ＋ New source
            </button>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label htmlFor={id("event")} className="mb-1 block text-xs font-medium text-bark-700">For</label>
            <select id={id("event")} className="input py-1 text-sm" value={eventType} onChange={(e) => setEventType(e.target.value)}>
              {EVENTS.map(([tag, label]) => <option key={tag} value={tag}>{label}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor={id("page")} className="mb-1 block text-xs font-medium text-bark-700">Page / detail</label>
            <input
              id={id("page")} className="input py-1 text-sm" dir="auto" placeholder="e.g. p. 42, roll 3"
              value={page} onChange={(e) => setPage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void cite();
                }
              }}
            />
          </div>
        </div>
        <button type="button" className="btn-outline py-1 text-sm" disabled={busy || !sourceId} onClick={() => void cite()}>
          Cite this source
        </button>
      </div>

      {creating && (
        <NewSourceDialog
          busy={busy}
          onCancel={() => setCreating(false)}
          onCreate={async (input) => {
            const before = new Set(tree.sources.map((x) => x.id));
            const next = await onCreateSource(input);
            const created = next?.sources.find((x) => !before.has(x.id));
            if (created) {
              setSourceId(created.id);
              setCreating(false);
            }
          }}
        />
      )}
    </section>
  );
}

/** A small modal: title (required), author, publication, notes. */
export function NewSourceDialog({ busy, onCreate, onCancel }: { busy: boolean; onCreate: (input: CreateSourceInput) => void; onCancel: () => void }) {
  const uid = useId();
  const id = (f: string) => `${uid}-${f}`;
  const [d, setD] = useState({ title: "", author: "", publication: "", notes: "" });
  const first = useRef<HTMLInputElement>(null);
  const opener = useRef<Element | null>(null);
  useEffect(() => {
    opener.current = document.activeElement;
    first.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onCancel();
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      (opener.current as HTMLElement | null)?.focus?.();
    };
  }, [onCancel]);
  const text = (v: string) => v.trim() || null;
  const field = (key: keyof typeof d, label: string, multiline = false) => (
    <div>
      <label htmlFor={id(key)} className="mb-1 block text-xs font-medium text-bark-700">{label}</label>
      {multiline ? (
        <textarea id={id(key)} className="input min-h-[60px] text-sm" dir="auto" value={d[key]} onChange={(e) => setD({ ...d, [key]: e.target.value })} />
      ) : (
        <input
          id={id(key)} ref={key === "title" ? first : undefined} className="input text-sm" dir="auto" required={key === "title"}
          value={d[key]} onChange={(e) => setD({ ...d, [key]: e.target.value })}
        />
      )}
    </div>
  );
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onMouseDown={(e) => e.target === e.currentTarget && onCancel()}>
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby={id("title-h")}
        className="w-full max-w-sm space-y-3 rounded-lg bg-white p-4 shadow-xl"
        onSubmit={(e) => {
          // a portal still bubbles through React's tree: keep this away from the member form
          e.preventDefault();
          e.stopPropagation();
          if (d.title.trim()) onCreate({ title: d.title.trim(), author: text(d.author), publication: text(d.publication), notes: text(d.notes) });
        }}
      >
        <h3 id={id("title-h")} className="font-semibold text-bark-700">New source</h3>
        {field("title", "Title *")}
        {field("author", "Author")}
        {field("publication", "Publication (publisher, place, year)")}
        {field("notes", "Notes", true)}
        <div className="flex gap-2">
          <button type="submit" className="btn-primary" disabled={busy || !d.title.trim()}>Create source</button>
          <button type="button" className="btn-ghost" onClick={onCancel}>Cancel</button>
        </div>
      </form>
    </div>,
    document.body,
  );
}
