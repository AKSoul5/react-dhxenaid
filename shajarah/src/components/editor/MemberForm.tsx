"use client";

import { useEffect, useMemo, useState } from "react";
import { nasab } from "@/lib/genealogy";
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
  birthOrder: string;
  notes: string;
  fatherId: string | null;
  motherId: string | null;
}

export const emptyDraft = (over: Partial<MemberDraft> = {}): MemberDraft => ({
  name: "", laqab: "", gender: "MALE", birthYear: "", deathYear: "", isDeceased: false,
  birthOrder: "", notes: "", fatherId: null, motherId: null, ...over,
});

const toDraft = (m: MemberDTO): MemberDraft => ({
  name: m.name, laqab: m.laqab ?? "", gender: m.gender,
  birthYear: m.birthYear?.toString() ?? "", deathYear: m.deathYear?.toString() ?? "",
  isDeceased: m.isDeceased, birthOrder: m.birthOrder.toString(), notes: m.notes ?? "",
  fatherId: m.fatherId, motherId: m.motherId,
});

const num = (s: string) => (s.trim() === "" ? null : Number.parseInt(s, 10));

export function draftToInput(d: MemberDraft): CreateMemberInput {
  return {
    name: d.name.trim(), laqab: d.laqab.trim() || null, gender: d.gender,
    birthYear: num(d.birthYear), deathYear: num(d.deathYear),
    isDeceased: d.isDeceased || !!d.deathYear.trim(),
    birthOrder: d.birthOrder.trim() === "" ? undefined : Number.parseInt(d.birthOrder, 10),
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
}

export function MemberForm({ tree, member, initialDraft, busy, onSave, onCancel, onDelete }: Props) {
  const [d, setD] = useState<MemberDraft>(member ? toDraft(member) : (initialDraft ?? emptyDraft()));
  useEffect(() => {
    setD(member ? toDraft(member) : (initialDraft ?? emptyDraft()));
  }, [member, initialDraft]);
  const set = <K extends keyof MemberDraft>(k: K, v: MemberDraft[K]) => setD((p) => ({ ...p, [k]: v }));

  const self = useMemo(() => new Set(member ? [member.id] : []), [member]);
  const yearError =
    num(d.birthYear) !== null && num(d.deathYear) !== null && num(d.deathYear)! < num(d.birthYear)!
      ? "Death year is before birth year."
      : null;

  return (
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
          <label className="mb-1 block text-xs font-medium text-bark-700">Name *</label>
          <input className="input font-naskh text-base" dir="auto" autoFocus={!member} required value={d.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. عبدالله" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-bark-700">Gender</label>
          <div className="flex overflow-hidden rounded-md border border-parchment-300">
            {(["MALE", "FEMALE"] as const).map((g) => (
              <button
                key={g} type="button"
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
        <label className="mb-1 block text-xs font-medium text-bark-700">Laqab / nickname</label>
        <input className="input font-naskh" dir="auto" value={d.laqab} onChange={(e) => set("laqab", e.target.value)} placeholder="e.g. الملقب بلقمان" />
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-bark-700">Born</label>
          <input className="input" inputMode="numeric" value={d.birthYear} onChange={(e) => set("birthYear", e.target.value.replace(/[^\d-]/g, ""))} placeholder="year" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-bark-700">Died</label>
          <input className="input" inputMode="numeric" value={d.deathYear} onChange={(e) => set("deathYear", e.target.value.replace(/[^\d-]/g, ""))} placeholder="year" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-bark-700" title="Order among siblings">Sibling #</label>
          <input className="input" inputMode="numeric" value={d.birthOrder} onChange={(e) => set("birthOrder", e.target.value.replace(/\D/g, ""))} placeholder="auto" />
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm text-bark-700">
        <input type="checkbox" checked={d.isDeceased} onChange={(e) => set("isDeceased", e.target.checked)} />
        Deceased (رحمه الله)
      </label>
      {yearError && <p className="text-sm text-red-700">{yearError}</p>}

      <MemberPicker label="Father" members={tree.members} value={d.fatherId} onChange={(v) => set("fatherId", v)} excludeGender="FEMALE" excludeIds={self} />
      <MemberPicker label="Mother" members={tree.members} value={d.motherId} onChange={(v) => set("motherId", v)} excludeGender="MALE" excludeIds={self} />

      <div>
        <label className="mb-1 block text-xs font-medium text-bark-700">Notes</label>
        <textarea className="input min-h-[60px]" dir="auto" value={d.notes} onChange={(e) => set("notes", e.target.value)} />
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
  );
}
