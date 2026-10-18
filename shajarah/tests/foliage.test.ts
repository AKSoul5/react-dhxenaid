import { describe, expect, it } from "vitest";
import { computePosterLayout } from "@/lib/layout/botanical";
import { generateSampleTree } from "@/lib/sampleData";
import { kalaliTree } from "@/lib/samples/kalali";

describe("decorative foliage", () => {
  for (const [name, tree] of [["large family", generateSampleTree()], ["sparse Al-Kalali canopy", kalaliTree()]] as const) {
    it(`fills the canopy of the ${name} without covering any name`, () => {
      const layout = computePosterLayout(tree, { nodeShape: "circle", foliage: true, cornerMedallions: true, headerBand: 0.125 });
      const f = layout.foliage!;
      // the whole family is laid out (shape, not speed: see tests/bench/)
      expect(layout.nodes.length).toBeGreaterThan(name === "large family" ? 150 : 2);
      expect(layout.edges.length).toBeGreaterThan(name === "large family" ? 100 : 1);
      // the canopy is sized to its names, so a three-person crown is small
      expect(f.leaves.length).toBeGreaterThan(name === "large family" ? 300 : 100);
      expect(f.twigs.length).toBeGreaterThan(0);
      for (const leaf of f.leaves) {
        for (const n of layout.nodes) {
          const inside = Math.abs(leaf.x - n.x) < n.w / 2 && Math.abs(leaf.y - n.y) < n.h / 2;
          expect(inside, `leaf on ${n.label}`).toBe(false);
        }
        for (const m of layout.medallions) expect(Math.hypot(leaf.x - m.x, leaf.y - m.y)).toBeGreaterThan(m.r);
      }
    });
  }

  it("is off when names are leaves (every leaf stays a person)", () => {
    const layout = computePosterLayout(generateSampleTree(), { nodeShape: "leaf", foliage: true });
    expect(layout.foliage).toBeNull();
  });
});
