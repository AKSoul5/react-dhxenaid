import { describe, expect, it } from "vitest";
import { isPaperSize, PAPER_ORDER, PAPER_SIZES, paperForScale } from "@/lib/paper";
import { updateTreeSchema } from "@/lib/validation";

// Paper has no practical limit: beyond A0 the sizes keep doubling.
describe("paper sizes", () => {
  it("follows ISO 216 up to A0, then doubles: 2A0, 4A0 … 1024A0", () => {
    expect(PAPER_SIZES.A0).toEqual({ w: 841, h: 1189 });
    expect(PAPER_SIZES["2A0"]).toEqual({ w: 1189, h: 1682 });
    expect(PAPER_SIZES["4A0"]).toEqual({ w: 1682, h: 2378 });
    expect(PAPER_ORDER.at(-1)).toBe("1024A0");
    for (let i = 4; i < PAPER_ORDER.length; i++) {
      const a = PAPER_SIZES[PAPER_ORDER[i - 1]], b = PAPER_SIZES[PAPER_ORDER[i]];
      expect((b.w * b.h) / (a.w * a.h)).toBeCloseTo(2, 1);
    }
  });

  it("recommends a size beyond 2A0 when that is what it takes", () => {
    expect(paperForScale("2A0", 1.3)).toBe("4A0");
    expect(paperForScale("A2", 12)).toBe("64A0"); // 420 mm × 12 = 5040 mm; 64A0 is 6728 mm wide
  });

  it("accepts every size in saved settings, and nothing else", () => {
    for (const p of ["A3", "2A0", "8A0", "1024A0"]) expect(isPaperSize(p)).toBe(true);
    for (const p of ["A5", "3A0", "", "2048A0", undefined]) expect(isPaperSize(p)).toBe(false);
    expect(updateTreeSchema.safeParse({ settings: { posterSize: "16A0" } }).success).toBe(true);
    expect(updateTreeSchema.safeParse({ settings: { posterSize: "3A0" } }).success).toBe(false);
  });
});
