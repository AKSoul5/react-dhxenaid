// Undo/redo: the snapshot history, and restoring a snapshot as a diff.
import { describe, expect, it } from "vitest";
import { localRepository } from "@/components/editor/repository";
import { exportGedcom } from "@/lib/gedcom";
import { COALESCE_MS, HISTORY_LIMIT, emptyHistory, forget, record, redo, undo } from "@/lib/history";
import { applyRestore, planRestore, snapshotError, type TreeSnapshot } from "@/lib/restore";
import { kalaliTree } from "@/lib/samples/kalali";
import { multiMarriageFamily, smallFamily } from "@/lib/samples/fixtures";
import type { TreeDTO } from "@/lib/types";

const tree = (n: number): TreeDTO => ({ ...smallFamily(), name: `v${n}` });

describe("history", () => {
  it("undo and redo walk back and forth through the snapshots", () => {
    let h = emptyHistory();
    h = record(h, tree(0), "a", { now: 0 }).history;
    h = record(h, tree(1), "b", { now: 10_000 }).history;
    const u1 = undo(h, tree(2))!;
    expect(u1.tree.name).toBe("v1");
    expect(u1.entry.label).toBe("b");
    const u2 = undo(u1.history, u1.tree)!;
    expect(u2.tree.name).toBe("v0");
    expect(undo(u2.history, u2.tree)).toBeNull();
    const r1 = redo(u2.history, u2.tree)!;
    expect(r1.tree.name).toBe("v1");
    const r2 = redo(r1.history, r1.tree)!;
    expect(r2.tree.name).toBe("v2");
    expect(redo(r2.history, r2.tree)).toBeNull();
  });

  it("a new edit ends the redo", () => {
    let h = record(emptyHistory(), tree(0), "a", { now: 0 }).history;
    h = undo(h, tree(1))!.history;
    expect(h.redo).toHaveLength(1);
    h = record(h, tree(0), "c", { now: 10_000 }).history;
    expect(h.redo).toHaveLength(0);
  });

  it(`keeps only the last ${HISTORY_LIMIT} steps`, () => {
    let h = emptyHistory();
    for (let i = 0; i < 80; i++) h = record(h, tree(i), `s${i}`, { now: i * 10_000 }).history;
    expect(h.undo).toHaveLength(HISTORY_LIMIT);
    expect(h.undo[0].tree.name).toBe("v30");
  });

  it("edits with the same key in quick succession are one step, with the oldest snapshot", () => {
    let h = emptyHistory();
    // dragging a colour picker: many changes, a few hundred ms apart
    for (let i = 0; i < 10; i++) h = record(h, tree(i), "Change style", { key: "settings", now: i * 300 }).history;
    expect(h.undo).toHaveLength(1);
    expect(h.undo[0].tree.name).toBe("v0");
    // a pause longer than the window starts a new step
    h = record(h, tree(10), "Change style", { key: "settings", now: 9 * 300 + COALESCE_MS + 1 }).history;
    expect(h.undo).toHaveLength(2);
    // a different kind of edit never joins
    h = record(h, tree(11), "Add member", { now: 9 * 300 + COALESCE_MS + 2 }).history;
    expect(h.undo).toHaveLength(3);
  });

  it("forgets a step whose save failed", () => {
    const { history, id } = record(emptyHistory(), tree(0), "a");
    expect(forget(history, id).undo).toHaveLength(0);
  });
});

describe("restoring a snapshot", () => {
  const snap = (t: TreeDTO): TreeSnapshot => t;
  /** Order-insensitive comparison of two trees. */
  const norm = (s: TreeSnapshot) => ({
    ...s,
    members: [...s.members].map((m) => ({ ...m, generation: 0 })).sort((a, b) => a.id.localeCompare(b.id)),
    marriages: [...s.marriages].sort((a, b) => a.id.localeCompare(b.id)),
  });

  it("undoes and redoes every kind of edit (diff in both directions gives the other tree)", async () => {
    const start = multiMarriageFamily();
    const repo = localRepository(start);
    const states: TreeDTO[] = [start];
    const root = start.members[0];
    const son = start.members.find((m) => m.fatherId === root.id && m.gender === "MALE")!;
    states.push(await repo.createMember({ name: "جديد", gender: "MALE", fatherId: son.id }));
    states.push(await repo.updateMember(son.id, { name: "اسم آخر", birthYear: 1950 }));
    const wife = states.at(-1)!.members.find((m) => m.gender === "FEMALE")!;
    states.push(await repo.createMarriage({ spouseAId: son.id, spouseBId: wife.id }));
    states.push(await repo.deleteMember(son.id)); // his children lose their father, his marriages go
    states.push(await repo.updateTree({ crownBaseId: root.id, soilText: "نص", settings: { showFemales: true, seed: 3 } }));
    states.push(await repo.importGedcom(exportGedcom(kalaliTree())));
    for (let i = 1; i < states.length; i++) {
      const [a, b] = [snap(states[i - 1]), snap(states[i])];
      expect(norm(applyRestore(b, planRestore(b, a))), `undo step ${i}`).toEqual(norm(a));
      expect(norm(applyRestore(a, planRestore(a, b))), `redo step ${i}`).toEqual(norm(b));
    }
  });

  it("touches only what changed", () => {
    const a = snap(smallFamily());
    const b = { ...a, members: a.members.map((m, i) => (i === 2 ? { ...m, name: "x" } : m)) };
    const plan = planRestore(a, b);
    expect(plan.updateMembers).toEqual([{ id: a.members[2].id, data: { name: "x" } }]);
    expect(plan.createMembers).toEqual([]);
    expect(plan.deleteMemberIds).toEqual([]);
    expect(plan.tree).toEqual({});
  });

  it("creates parents before their children", () => {
    const k = snap(kalaliTree());
    const empty = { ...k, members: [], marriages: [], rootMemberId: null, crownBaseId: null, trunkStartId: null };
    const order = planRestore(empty, k).createMembers.map((m) => m.id);
    const at = new Map(order.map((id, i) => [id, i]));
    for (const m of k.members) if (m.fatherId) expect(at.get(m.fatherId)!).toBeLessThan(at.get(m.id)!);
  });

  it("refuses a snapshot that is not a tree", () => {
    const s = snap(smallFamily());
    expect(snapshotError(s)).toBeNull();
    const [a, b] = s.members;
    const cyc = { ...s, members: s.members.map((m) => (m.id === a.id ? { ...m, fatherId: b.id } : m)) };
    expect(b.fatherId).toBe(a.id);
    expect(snapshotError(cyc)).toMatch(/own ancestor/);
    expect(snapshotError({ ...s, members: [...s.members, s.members[0]] })).toMatch(/twice/);
    expect(snapshotError({ ...s, rootMemberId: "nobody" })).toMatch(/root/);
    expect(snapshotError({ ...s, members: s.members.map((m, i) => (i === 1 ? { ...m, fatherId: "ghost" } : m)) })).toMatch(/not in the tree/);
    const female = s.members.find((m) => m.gender === "FEMALE")!;
    expect(snapshotError({ ...s, members: s.members.map((m, i) => (i === 1 ? { ...m, fatherId: female.id } : m)) })).toMatch(/female/);
  });
});
