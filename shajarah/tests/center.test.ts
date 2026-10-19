import { describe, expect, it } from "vitest";
import { computePosterLayout } from "@/lib/layout/botanical";
import { layoutOptionsFor, resolveTheme } from "@/lib/theme";
import { kalaliFilledTree } from "@/lib/samples/kalali";
import { makeProjectFile, withNewIds } from "@/lib/project";

// Primary lineage: a branch chosen by the user sits straight above the
// trunk, its brothers to either side.
describe("centring a branch", () => {
  const tree = kalaliFilledTree();
  // (on A1 the whole 65-name foundation would leave the canopy, centred,
  // just under the legible size: this is about centring, so it is shortened)
  const opts = { ...layoutOptionsFor(resolveTheme(tree.settings), "A1"), soilShorten: true };
  const plain = computePosterLayout(tree, opts);
  const base = plain.base!;
  const families = plain.nodes.filter((n) => n.parentId === base.member.id && !n.terminal);
  // the family furthest from the centre, and one of its grandsons
  const far = [...families].sort((a, b) => Math.abs(b.x - plain.origin.x) - Math.abs(a.x - plain.origin.x))[0];
  const grandson = plain.nodes.find((n) => n.parentId === far.member.id && !n.terminal)!;

  for (const [label, target] of [["a son of the canopy base", far], ["a grandson", grandson]] as const) {
    it(`puts ${label} straight above the trunk, and stays clean`, () => {
      expect(Math.abs(target.x - plain.origin.x)).toBeGreaterThan(plain.width * 0.05);
      const l = computePosterLayout(tree, { ...opts, centerBranchId: target.member.id });
      const n = l.nodes.find((x) => x.member.id === target.member.id)!;
      expect(Math.abs(n.x - l.origin.x)).toBeLessThan(l.width * 0.01);
      expect(n.y).toBeLessThan(l.origin.y);
      expect(l.clarity.issues).toEqual([]);
      expect(l.legibility.ok).toBe(true);
      // his brothers on both sides
      const brothers = l.nodes.filter((x) => x.parentId === n.parentId && x.id !== n.id);
      expect(brothers.some((b) => b.x < n.x) && brothers.some((b) => b.x > n.x)).toBe(true);
    });
  }

  it("is read from the tree's settings, and ignored for someone outside the canopy", () => {
    const set = computePosterLayout({ ...tree, settings: { ...tree.settings, centerBranchId: far.member.id } }, opts);
    expect(Math.abs(set.nodes.find((x) => x.member.id === far.member.id)!.x - set.origin.x)).toBeLessThan(set.width * 0.01);
    const trunk = computePosterLayout(tree, { ...opts, centerBranchId: plain.trunkLabels[0].member.id });
    expect(trunk.nodes.map((n) => [n.member.id, Math.round(n.x)])).toEqual(plain.nodes.map((n) => [n.member.id, Math.round(n.x)]));
  });

  it("follows the branch when a project file is opened", () => {
    const saved = makeProjectFile({ ...tree, settings: { ...tree.settings, centerBranchId: far.member.id } });
    let k = 0;
    const opened = withNewIds(saved.tree, () => `n${++k}`);
    const id = opened.settings!.centerBranchId!;
    expect(opened.members.find((m) => m.id === id)!.name).toBe(far.member.name);
  });
});
