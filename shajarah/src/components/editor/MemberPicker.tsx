"use client";

import { useId, useMemo, useState } from "react";
import { nasab } from "@/lib/genealogy";
import type { Gender, MemberDTO } from "@/lib/types";

interface Props {
  label: string;
  members: MemberDTO[];
  value: string | null;
  onChange: (id: string | null) => void;
  /** Hide members of this gender (e.g. no women in the "father" picker). */
  excludeGender?: Gender;
  excludeIds?: Set<string>;
  placeholder?: string;
}

/** Searchable member combobox; options show the patronymic chain to disambiguate namesakes. */
export function MemberPicker({ label, members, value, onChange, excludeGender, excludeIds, placeholder }: Props) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const selected = members.find((m) => m.id === value) ?? null;
  const inputId = useId();

  const options = useMemo(() => {
    const q = query.trim();
    return members
      .filter((m) => m.gender !== excludeGender && !excludeIds?.has(m.id))
      .map((m) => ({ m, label: nasab(members, m.id, 3) }))
      .filter((o) => !q || o.label.includes(q))
      .slice(0, 40);
  }, [members, query, excludeGender, excludeIds]);

  return (
    <div className="relative">
      <label htmlFor={inputId} className="mb-1 block text-xs font-medium text-bark-700">{label}</label>
      <div className="flex gap-1">
        <input
          id={inputId}
          className="input flex-1"
          dir="auto"
          value={open ? query : selected ? nasab(members, selected.id, 2) : ""}
          placeholder={placeholder ?? "Search…"}
          onFocus={() => {
            setQuery("");
            setOpen(true);
          }}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onChange={(e) => setQuery(e.target.value)}
        />
        {selected && (
          <button type="button" className="btn-ghost px-2" onClick={() => onChange(null)} title={`Clear ${label.toLowerCase()}`} aria-label={`Clear ${label.toLowerCase()}`}>
            ✕
          </button>
        )}
      </div>
      {open && (
        <ul className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-md border border-parchment-300 bg-white shadow-lg">
          {options.length === 0 && <li className="px-3 py-2 text-sm text-gray-500">No matches</li>}
          {options.map(({ m, label: l }) => (
            <li key={m.id}>
              <button
                type="button"
                dir="auto"
                className="block w-full px-3 py-1.5 text-start font-naskh text-[15px] hover:bg-parchment-100"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onChange(m.id);
                  setOpen(false);
                }}
              >
                {l}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
