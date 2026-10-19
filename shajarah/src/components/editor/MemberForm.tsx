"use client";

import { useEffect, useId, useMemo, useState, type ReactNode } from "react";
import { nasab, siblingsInOrder } from "@/lib/genealogy";
import type { Gender, MemberDTO, TreeDTO } from "@/lib/types";
import type { CreateMemberInput } from "@/lib/validation";
import { MemberPicker } from "./MemberPicker";

export interface MemberDraft {
  name: string;
  laqab: string;
  gender: Gender;
  birthYear: string;
  deathYear: string;
  isDeceased: boolean;
  notes: string;
  fatherId: string | null;
  motherId: string | null;
}

export const emptyDraft = (over: Partial<MemberDraft> = {}): MemberDraft => ({
  name: "", laqab: "", gender: "MALE", birthYear: "", deathYear: "", isDeceased: false,
  notes: "", fatherId: null, motherId: null, ...over,
});

const toDraft = (m: MemberDTO): MemberDraft => ({
  name: m.name, laqab: m.laqab ?? "", gender: m.gender,
  birthYear: m.birthYear?.toString() ?? "", deathYear: m.deathYear?.toString() ?? "",
  isDeceased: m.isDeceased, notes: m.notes ?? "",
  fatherId: m.fatherId, motherId: m.motherId,
});

const num = (s: string) => (s.trim() === "" ? null : Number.parseInt(s, 10));

export function draftToInput(d: MemberDraft): CreateMemberInput {
  return {
    name: d.name.trim(), laqab: d.laqab.trim() || null, gender: d.gender,
    birthYear: num(d.birthYear), deathYear: num(d.deathYear),
    isDeceased: d.isDeceased || !!d.deathYear.trim(),
    notes: d.notes.trim() || null, fatherId: d.fatherId, motherId: d.motherId,
  };
}

interface Props {
  tree: TreeDTO;
  /** Existing member being edited, or null when creating. */
  member: MemberDTO | null;
  initialDraft?: MemberDraft;
  busy: boolean;
  onSave: (input: CreateMemberInput) => void;
  onCancel?: () => void;
  onDelete?: () => void;
  /** Moves the member to `position` (0 = eldest) among their brothers and sisters, at once (not by Save). */
  onMove?: (position: number) => void;
  /** Shown below the form (photos, documents, sources): saved on their own, not by Save. */
  attachments?: ReactNode;
}

export function MemberForm({ tree, member, initialDraft, busy, onSave, onCancel, onDelete, onMove, attachments }: Props) {
  const [d, setD] = useState<MemberDraft>(member ? toDraft(member) : (initialDraft ?? emptyDraft()));
  useEffect(() => {
    setD(member ? toDraft(member) : (initialDraft ?? emptyDraft()));
  }, [member, initialDraft]);
  const set = <K extends keyof MemberDraft>(k: K, v: MemberDraft[K]) => setD((p) => ({ ...p, [k]: v }));
  // every label names its field, for screen readers and click-to-focus
  const uid = useId();
  const id = (field: string) => `${uid}-${field}`;

  const self = useMemo(() => new Set(member ? [member.id] : []), [member]);
  // the spouses of a parent already chosen, listed first in the other parent's picker
  const spousesOf = (id: string | null, as: "wife" | "husband") => {
    const p = id ? tree.members.find((m) => m.id === id) : undefined;
    if (!p) return undefined;
    const ids = tree.marriages.filter((x) => x.spouseAId === p.id || x.spouseBId === p.id).map((x) => (x.spouseAId === p.id ? x.spouseBId : x.spouseAId));
    return ids.length ? { ids, note: `${as} of ${p.name}` } : undefined;
  };
  // brothers and sisters, eldest first (a new member is added as the youngest)
  const siblings = member ? siblingsInOrder(tree.members, tree.lineage, member.id) : [];
  const place = siblings.findIndex((m) => m.id === member?.id);
  const yearError =
    num(d.birthYear) !== null && num(d.deathYear) !== null && num(d.deathYear)! < num(d.birthYear)!
      ? "Death year is before birth year."
      : null;

  return (
    <>
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (!d.name.trim() || yearError) return;
          onSave(draftToInput(d));
        }}
      >
        <div className="grid grid-cols-[1fr_auto] gap-2">
          <div>
            <label htmlFor={id("name")} className="mb-1 block text-xs font-medium text-bark-700">Name *</label>
            <input id={id("name")} className="input font-naskh text-base" dir="auto" autoFocus={!member} required value={d.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. عبدالله" />
          </div>
          <div>
            <span id={id("gender")} className="mb-1 block text-xs font-medium text-bark-700">Gender</span>
            <div className="flex overflow-hidden rounded-md border border-parchment-300" role="group" aria-labelledby={id("gender")}>
              {(["MALE", "FEMALE"] as const).map((g) => (
                <button
                  key={g} type="button" aria-pressed={d.gender === g}
                  className={`px-3 py-1.5 text-sm ${d.gender === g ? "bg-bark-700 text-parchment-50" : "bg-white text-bark-700"}`}
                  onClick={() => set("gender", g)}
                >
                  {g === "MALE" ? "♂ Male" : "♀ Female"}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div>
          <label htmlFor={id("laqab")} className="mb-1 block text-xs font-medium text-bark-700">Laqab / nickname</label>
          <input id={id("laqab")} className="input font-naskh" dir="auto" value={d.laqab} onChange={(e) => set("laqab", e.target.value)} placeholder="e.g. الملقب بلقمان" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label htmlFor={id("born")} className="mb-1 block text-xs font-medium text-bark-700">Born</label>
            <input id={id("born")} className="input" inputMode="numeric" value={d.birthYear} onChange={(e) => set("birthYear", e.target.value.replace(/[^\d-]/g, ""))} placeholder="year" />
          </div>
          <div>
            <label htmlFor={id("died")} className="mb-1 block text-xs font-medium text-bark-700">Died</label>
            <input id={id("died")} className="input" inputMode="numeric" value={d.deathYear} onChange={(e) => set("deathYear", e.target.value.replace(/[^\d-]/g, ""))} placeholder="year" />
          </div>
        </div>
        {onMove && siblings.length > 1 && (
          <div>
            <label htmlFor={id("order")} className="mb-1 block text-xs font-medium text-bark-700">Place among brothers and sisters</label>
            <select id={id("order")} className="input" value={place} disabled={busy} onChange={(e) => onMove(Number(e.target.value))}>
              {siblings.map((_, i) => (
                <option key={i} value={i}>
                  {i + 1} of {siblings.length}{i === 0 ? " — eldest" : i === siblings.length - 1 ? " — youngest" : ""}
                </option>
              ))}
            </select>
            <p className="mt-1 font-naskh text-xs text-bark-500" dir="auto">
              {siblings.map((m) => m.name).join(" · ")}
            </p>
          </div>
        )}
        <label className="flex items-center gap-2 text-sm text-bark-700">
          <input type="checkbox" checked={d.isDeceased} onChange={(e) => set("isDeceased", e.target.checked)} />
          Deceased (رحمه الله)
        </label>
        {yearError && <p className="text-sm text-red-700">{yearError}</p>}

        {/* a parent's spouses come first: the other parent is most likely one of them */}
        <MemberPicker label="Father" members={tree.members} value={d.fatherId} onChange={(v) => set("fatherId", v)} excludeGender="FEMALE" excludeIds={self}
          suggested={spousesOf(d.motherId, "husband")} />
        <MemberPicker label="Mother" members={tree.members} value={d.motherId} onChange={(v) => set("motherId", v)} excludeGender="MALE" excludeIds={self}
          suggested={spousesOf(d.fatherId, "wife")} />

        <div>
          <label htmlFor={id("notes")} className="mb-1 block text-xs font-medium text-bark-700">Notes</label>
          <textarea id={id("notes")} className="input min-h-[60px]" dir="auto" value={d.notes} onChange={(e) => set("notes", e.target.value)} />
        </div>

        <div className="flex flex-wrap gap-2 pt-1">
          <button type="submit" className="btn-primary" disabled={busy || !d.name.trim() || !!yearError}>
            {member ? "Save changes" : "Add member"}
          </button>
          {onCancel && <button type="button" className="btn-ghost" onClick={onCancel}>Cancel</button>}
          {onDelete && (
            <button
              type="button"
              className="btn-danger ms-auto"
              disabled={busy}
              onClick={() => {
                if (confirm(`Delete ${member ? nasab(tree.members, member.id, 2) : "this member"}? Their children stay in the tree without this parent.`)) onDelete();
              }}
            >
              Delete
            </button>
          )}
        </div>
      </form>
      {attachments}
    </>
  );
}
