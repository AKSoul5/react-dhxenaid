"use client";

import { useState } from "react";
import { compareSiblings, nasab } from "@/lib/genealogy";
import type { Gender, MemberDTO, TreeDTO } from "@/lib/types";
import { MemberPicker } from "./MemberPicker";

interface Props {
  tree: TreeDTO;
  member: MemberDTO;
  busy: boolean;
  onSelect: (id: string) => void;
  /** `otherParentId`: the child's other parent (a spouse), when chosen. */
  onQuickAddChild: (name: string, gender: Gender, otherParentId?: string | null) => void;
  /** Adds a new father (MALE) or mother (FEMALE) above this member. */
  onQuickAddParent: (name: string, gender: Gender) => void;
  onAddSpouse: (spouseId: string) => void;
  onNewSpouse: (name: string) => void;
  onRemoveMarriage: (marriageId: string) => void;
}

/** Fast relationship entry: type a name, press Enter, and the child is linked. */
export function RelationsPanel({
  tree, member, busy, onSelect, onQuickAddChild, onQuickAddParent, onAddSpouse, onNewSpouse, onRemoveMarriage,
}: Props) {
  const [parentName, setParentName] = useState("");
  // the missing parent (the father first)
  const missing: Gender[] = [...(member.fatherId ? [] : ["MALE" as const]), ...(member.motherId ? [] : ["FEMALE" as const])];
  const [parentChoice, setParentChoice] = useState<Gender | null>(null);
  const parentGender = parentChoice && missing.includes(parentChoice) ? parentChoice : missing[0];
  const [childName, setChildName] = useState("");
  const [childGender, setChildGender] = useState<Gender>("MALE");
  const [spouseName, setSpouseName] = useState("");

  const children = tree.members
    .filter((m) => m.fatherId === member.id || m.motherId === member.id)
    .sort(compareSiblings);
  const marriages = tree.marriages.filter((x) => x.spouseAId === member.id || x.spouseBId === member.id);
  const spouseIds = new Set(marriages.map((x) => (x.spouseAId === member.id ? x.spouseBId : x.spouseAId)));
  const byId = new Map(tree.members.map((m) => [m.id, m]));
  const parents = [member.fatherId, member.motherId].filter(Boolean).map((id) => byId.get(id!)!).filter(Boolean);

  // Married more than once: the new child's other parent is chosen (the
  // latest marriage by default), so half-siblings are recorded correctly.
  const spouses = [...spouseIds].map((id) => byId.get(id)).filter((m): m is MemberDTO => !!m);
  const [otherParent, setOtherParent] = useState<string | null>(null);
  const chosenOther = otherParent && spouseIds.has(otherParent) ? otherParent : spouses[spouses.length - 1]?.id ?? null;
  const submitChild = () => {
    if (!childName.trim()) return;
    onQuickAddChild(childName.trim(), childGender, spouses.length > 1 ? chosenOther : undefined);
    setChildName("");
  };

  const submitSpouse = () => {
    if (!spouseName.trim()) return;
    onNewSpouse(spouseName.trim());
    setSpouseName("");
  };

  const submitParent = () => {
    if (!parentName.trim() || !parentGender) return;
    onQuickAddParent(parentName.trim(), parentGender);
    setParentName("");
  };

  return (
    <div className="space-y-4">
      <section>
        <h4 className="section-title">Parents</h4>
        {parents.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-1.5">
            {parents.map((p) => <Chip key={p.id} m={p} onClick={() => onSelect(p.id)} />)}
          </div>
        )}
        {parentGender && (
          // grows the tree upward: the new person becomes this one's parent
          <div className="flex gap-1">
            <input
              className="input flex-1 font-naskh text-base"
              dir="auto"
              placeholder={`Add ${member.gender === "FEMALE" ? "her" : "his"} ${parentGender === "MALE" ? "father" : "mother"} — type name, press Enter`}
              value={parentName}
              onChange={(e) => setParentName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  submitParent();
                }
              }}
            />
            {missing.length > 1 && (
              <button
                type="button"
                className="btn-ghost px-2"
                title="Toggle father / mother"
                onClick={() => setParentChoice(parentGender === "MALE" ? "FEMALE" : "MALE")}
              >
                {parentGender === "MALE" ? "♂" : "♀"}
              </button>
            )}
            <button type="button" className="btn-primary px-3" disabled={busy || !parentName.trim()} onClick={submitParent}>
              +
            </button>
          </div>
        )}
      </section>

      <section>
        <h4 className="section-title">Children ({children.length})</h4>
        <div className="mb-2 flex flex-wrap gap-1.5">
          {children.map((c) => <Chip key={c.id} m={c} onClick={() => onSelect(c.id)} />)}
          {children.length === 0 && <span className="text-sm text-gray-500">None yet</span>}
        </div>
        <div className="flex gap-1">
          <input
            className="input flex-1 font-naskh text-base"
            dir="auto"
            placeholder={`Add a ${childGender === "MALE" ? "son" : "daughter"} — type name, press Enter`}
            value={childName}
            onChange={(e) => setChildName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                submitChild();
              }
            }}
          />
          <button
            type="button"
            className="btn-ghost px-2"
            title="Toggle son / daughter"
            onClick={() => setChildGender((g) => (g === "MALE" ? "FEMALE" : "MALE"))}
          >
            {childGender === "MALE" ? "♂" : "♀"}
          </button>
          <button type="button" className="btn-primary px-3" disabled={busy || !childName.trim()} onClick={submitChild}>
            +
          </button>
        </div>
        {spouses.length > 1 && (
          <label className="mt-1 flex items-center gap-2 text-xs text-gray-600">
            {member.gender === "FEMALE" ? "Father" : "Mother"} of the new child
            <select className="input flex-1 py-1 font-naskh text-sm" dir="auto" value={chosenOther ?? ""} onChange={(e) => setOtherParent(e.target.value)}>
              {spouses.map((sp) => <option key={sp.id} value={sp.id}>{sp.name}</option>)}
            </select>
          </label>
        )}
      </section>

      <section>
        <h4 className="section-title">Spouses ({marriages.length})</h4>
        <ul className="mb-2 space-y-1">
          {marriages.map((x) => {
            const s = byId.get(x.spouseAId === member.id ? x.spouseBId : x.spouseAId);
            if (!s) return null;
            return (
              <li key={x.id} className="flex items-center gap-2">
                <Chip m={s} onClick={() => onSelect(s.id)} />
                <button type="button" className="text-xs text-red-700 hover:underline" onClick={() => onRemoveMarriage(x.id)}>
                  unlink
                </button>
              </li>
            );
          })}
        </ul>
        {/* the same as adding a child: type the name, press Enter or + */}
        <div className="flex gap-1">
          <input
            className="input flex-1 font-naskh text-base"
            dir="auto"
            placeholder={`Add a ${member.gender === "FEMALE" ? "husband" : "wife"} — type name, press Enter`}
            value={spouseName}
            onChange={(e) => setSpouseName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                submitSpouse();
              }
            }}
          />
          <button type="button" className="btn-primary px-3" disabled={busy || !spouseName.trim()} onClick={submitSpouse}>
            +
          </button>
        </div>
        <div className="mt-2">
          <MemberPicker
            label="…or link someone already in the tree"
            members={tree.members}
            value={null}
            onChange={(id) => id && onAddSpouse(id)}
            excludeGender={member.gender === "UNKNOWN" ? undefined : member.gender}
            excludeIds={new Set([member.id, ...spouseIds])}
          />
        </div>
      </section>
      <p className="text-xs text-gray-500" dir="auto">
        {nasab(tree.members, member.id, 8)}
      </p>
    </div>
  );
}

function Chip({ m, onClick }: { m: MemberDTO; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      dir="auto"
      className={`rounded-full border px-2.5 py-0.5 font-naskh text-[15px] hover:shadow ${
        m.gender === "FEMALE" ? "border-rose-300 bg-rose-50" : "border-parchment-300 bg-parchment-50"
      }`}
    >
      {m.name}
    </button>
  );
}
