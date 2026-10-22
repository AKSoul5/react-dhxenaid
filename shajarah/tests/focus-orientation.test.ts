import { describe, expect, it } from "vitest";
import { computePosterLayout } from "@/lib/layout/botanical";
import { lineagePath } from "@/lib/genealogy";
import { layoutOptionsFor, resolveTheme } from "@/lib/theme";
import { shaalanFamily } from "@/lib/samples/fixtures";
import { generateHypotheticalTree } from "@/lib/samples/al_kalali_hypo";
import type { TreeDTO } from "@/lib/types";

// A branch poster is anchored at the focused person: ancestors run down the
// trunk (and into the soil), descendants grow up into the canopy.
function check(tree: TreeDTO, focusName: string) {
  const focus = tree.members.find((m) => m.name === focusName && tree.members.some((c) => c.fatherId === m.id))!;
  const l = computePosterLayout(tree, {
    ...layoutOptionsFor(resolveTheme(tree.settings), "A2"),
    showFemales: tree.settings?.showFemales, focusId: focus.id,
  });
  const { ancestors, descendants } = lineagePath(tree.members, tree.lineage, focus.id);
  const up = new Set(descendants), down = new Set(ancestors);
  expect(l.base?.member.id).toBe(focus.id);
  const baseY = l.base!.y;
  for (const n of l.nodes) {
    expect(down.has(n.member.id), `${n.member.name} is an ancestor in the canopy`).toBe(false);
    if (up.has(n.member.id)) expect(n.y, `${n.member.name} below the anchor`).toBeLessThan(baseY);
  }
  for (const t of l.trunkLabels) {
    expect(up.has(t.member.id), `${t.member.name} is a descendant on the trunk`).toBe(false);
    expect(t.y).toBeGreaterThan(baseY);
  }
  return l;
}

describe("branch poster orientation", () => {
  it("شعلان family: أحمد's branch grows up from أحمد, شعلان on the trunk", () => {
    const l = check(shaalanFamily(), "أحمد");
    expect(l.trunkLabels.map((t) => t.member.name)).toEqual(["شعلان"]);
  });
  it("شعلان family: a grandson's branch keeps both ancestors below him", () => {
    const l = check(shaalanFamily(), "عبدالله");
    expect(l.trunkLabels.map((t) => t.member.name).sort()).toEqual(["أحمد", "شعلان"].sort());
  });
  it("hypothetical Kalali branch: نوفل anchors the canopy, the ancient line stays in the soil", () => {
    const l = check(generateHypotheticalTree(), "نوفل");
    expect(l.soil).not.toBeNull();
  });

  it("a small branch is not stretched to fill the page", () => {
    // نوفل has two sons: before CANOPY_GROWTH, their branches were drawn as
    // long bare stalks reaching across three quarters of the sheet
    const l = check(generateHypotheticalTree(), "نوفل");
    const xs = l.nodes.map((n) => n.x);
    const width = Math.max(...xs) - Math.min(...xs);
    const height = l.base!.y - Math.min(...l.nodes.map((n) => n.y - n.h / 2));
    expect(height).toBeLessThanOrEqual(width * 5);
    expect(height / l.height).toBeLessThan(0.2);
    expect(width / l.width).toBeLessThan(0.5);
  });
});
