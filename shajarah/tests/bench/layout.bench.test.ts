// Layout speed budgets. NOT part of the normal test run, on purpose:
// a wall-clock assertion inside a parallel suite measures the machine's
// scheduler, not the code (it failed at 2.5 s under load while the same
// layout takes ~1.6 s alone). Do not move these back into the correctness
// suite, and do not "fix" a failure here by raising a timeout.
// Run them alone, before a release: `npm run bench`.
import { describe, expect, it } from "vitest";
import { computePosterLayout } from "@/lib/layout/botanical";
import { generateSampleTree } from "@/lib/sampleData";
import { denseFamily } from "@/lib/samples/fixtures";
import { naturalFamily } from "@/lib/samples/natural";
import { layoutOptionsFor, resolveTheme } from "@/lib/theme";

/** Median of several runs, after one warm-up, so a single hiccup does not decide. */
function medianMs(run: () => void, runs = 5) {
  run();
  const times: number[] = [];
  for (let i = 0; i < runs; i++) {
    const t0 = performance.now();
    run();
    times.push(performance.now() - t0);
  }
  return times.sort((a, b) => a - b)[Math.floor(runs / 2)];
}

describe.runIf(process.env.BENCH)("layout speed", () => {
  it("a natural family of 350 on A1 (ovals): under 2 s on average, none over 2.5 s", () => {
    // (measured: 1.4–1.6 s for four of these families; family 31 about
    // 2.1 s, as its retries try text sizes that turn out not to be legible)
    const times: number[] = [];
    for (const seed of [7, 11, 23, 31, 42]) {
      const tree = naturalFamily(350, seed);
      const ms = medianMs(() => computePosterLayout(tree, { ...layoutOptionsFor(resolveTheme(tree.settings), "A1"), showFemales: true }), 3);
      console.log(`natural 350 (family ${seed}) on A1: ${ms.toFixed(0)} ms`);
      times.push(ms);
      expect(ms).toBeLessThan(2500);
    }
    expect(times.reduce((a, b) => a + b, 0) / times.length).toBeLessThan(2000);
  }, 120000);

  it("large family with foliage: under 2.5 s", () => {
    const tree = generateSampleTree();
    const ms = medianMs(() => computePosterLayout(tree, { nodeShape: "circle", foliage: true, cornerMedallions: true, headerBand: 0.125 }));
    console.log(`large + foliage: ${ms.toFixed(0)} ms`);
    expect(ms).toBeLessThan(2500);
  });

  it("dense family on A1: under 2.5 s", () => {
    const tree = denseFamily();
    const ms = medianMs(() => computePosterLayout(tree, { ...layoutOptionsFor(resolveTheme(tree.settings), "A1"), showFemales: true }));
    console.log(`dense A1: ${ms.toFixed(0)} ms`);
    expect(ms).toBeLessThan(2500);
  });
});
