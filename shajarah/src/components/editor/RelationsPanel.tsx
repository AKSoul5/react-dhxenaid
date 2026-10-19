"use client";

import { useState } from "react";
import { compareSiblings, lineageParentId, nasab } from "@/lib/genealogy";
import { duplicateSpouses } from "@/lib/merge";
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
  /** Sets a child's father or mother to someone already in the tree (null: not known). */
  onSetParent: (childId: string, role: "fatherId" | "motherId", parentId: string | null) => void;
  /** Merges records of one person (each of `dropIds` into `keepId`), as one change. */
  onMerge: (keepId: string, dropIds: string[]) => void;
  /** Moves a child to `position` (0 = eldest) among their brothers and sisters. */
  onMove: (childId: string, position: number) => void;
}

/** Fast relationship entry: type a name, press Enter, and the child is linked. */
export function RelationsPanel({
  tree, member, busy, onSelect, onQuickAddChild, onQuickAddParent, onAddSpouse, onNewSpouse, onRemoveMarriage,
  onSetParent, onMerge, onMove,
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
  // the children whose order is this person's to set (a wife's children
  // are ordered among their father's)
  const ordered = children.filter((c) => lineageParentId(c, tree.lineage) === member.id);
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

  // The missing parent is most likely one of the known parent's spouses
  // (his mother is one of his father's wives): offered with one click.
  const known = member.fatherId ? byId.get(member.fatherId) : member.motherId ? byId.get(member.motherId) : undefined;
  const missingRole = member.fatherId && !member.motherId ? "motherId" as const : member.motherId && !member.fatherId ? "fatherId" as const : null;
  const spousesOf = (id: string) => tree.marriages
    .filter((x) => x.spouseAId === id || x.spouseBId === id)
    .map((x) => byId.get(x.spouseAId === id ? x.spouseBId : x.spouseAId))
    .filter((m): m is MemberDTO => !!m && m.id !== member.id);
  const likelyParents = known && missingRole ? spousesOf(known.id) : [];
  // the same person recorded twice among this person's spouses and the
  // other parents of their children
  const duplicates = duplicateSpouses(tree, member.id);
  const otherRole = member.gender === "FEMALE" ? "fatherId" as const : "motherId" as const;

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
        {likelyParents.length > 0 && (
          <div className="mb-2 flex flex-wrap items-center gap-1.5 text-sm">
            <span className="text-xs text-gray-600">
              {member.gender === "FEMALE" ? "Her" : "His"} {missingRole === "motherId" ? "mother" : "father"}:
            </span>
            {likelyParents.map((p) => (
              <button key={p.id} type="button" className="btn-outline py-0.5 font-naskh text-[15px]" dir="auto" disabled={busy}
                title={`${p.name} is the ${missingRole === "motherId" ? "mother" : "father"}`}
                onClick={() => onSetParent(member.id, missingRole!, p.id)}>
                {p.name}
              </button>
            ))}
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
        {(spouses.length > 0 || ordered.length > 1) && children.length > 0 ? (
          // each child's place among them (eldest first), and with spouses
          // recorded, each child's other parent, set right here
          <ul className="mb-2 space-y-1" aria-label={`Children of ${member.name}, eldest first`}>
            {children.map((c) => {
              const at = ordered.indexOf(c);
              return (
                <li key={c.id} className="flex items-center gap-1">
                  {ordered.length > 1 && (
                    <span className="flex shrink-0 flex-col leading-none">
                      <button type="button" className="px-1 text-[10px] text-bark-500 hover:text-bark-900 disabled:opacity-25" disabled={busy || at <= 0}
                        aria-label={`Move ${c.name} earlier (elder)`} title="Earlier (elder)" onClick={() => onMove(c.id, at - 1)}>▲</button>
                      <button type="button" className="px-1 text-[10px] text-bark-500 hover:text-bark-900 disabled:opacity-25" disabled={busy || at < 0 || at >= ordered.length - 1}
                        aria-label={`Move ${c.name} later (younger)`} title="Later (younger)" onClick={() => onMove(c.id, at + 1)}>▼</button>
                    </span>
                  )}
                  <Chip m={c} onClick={() => onSelect(c.id)} />
                  {spouses.length > 0 && (
                    <select
                      className="input ms-auto w-40 py-0.5 font-naskh text-sm"
                      dir="auto"
                      aria-label={`${member.gender === "FEMALE" ? "Father" : "Mother"} of ${c.name}`}
                      value={c[otherRole] ?? ""}
                      disabled={busy}
                      onChange={(e) => onSetParent(c.id, otherRole, e.target.value || null)}
                    >
                      <option value="">{member.gender === "FEMALE" ? "father" : "mother"} not set</option>
                      {spouses.map((sp) => <option key={sp.id} value={sp.id}>{sp.name}</option>)}
                      {c[otherRole] && !spouseIds.has(c[otherRole]!) && <option value={c[otherRole]!}>{byId.get(c[otherRole]!)?.name}</option>}
                    </select>
                  )}
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="mb-2 flex flex-wrap gap-1.5">
            {children.map((c) => <Chip key={c.id} m={c} onClick={() => onSelect(c.id)} />)}
            {children.length === 0 && <span className="text-sm text-gray-500">None yet</span>}
          </div>
        )}
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
        {duplicates.map(([keep, ...copies]) => (
          <div key={keep.id} className="mb-2 rounded-md border border-amber-300 bg-amber-50 p-2 text-xs text-amber-900" role="status">
            <b className="font-naskh text-sm" dir="auto">{keep.name}</b> is recorded {copies.length + 1} times
            (as a spouse and as a parent of {member.gender === "FEMALE" ? "her" : "his"} children).
            <button type="button" className="btn-outline ms-2 py-0.5 text-xs" disabled={busy}
              onClick={() => onMerge(keep.id, copies.map((c) => c.id))}>
              Merge into one
            </button>
          </div>
        ))}
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
