// The sources page: usage counts, likely duplicates, and merging.
import { describe, expect, it } from "vitest";
import { localRepository } from "@/components/editor/repository";
import { applyRestore, planRestore } from "@/lib/restore";
import { applyMergeSources, likelyDuplicates, planMergeSources, sourceUsage } from "@/lib/sources";
import { smallFamily } from "@/lib/samples/fixtures";
import type { TreeDTO } from "@/lib/types";

const tree = (): TreeDTO => {
  const t = smallFamily();
  const [a, b, c] = t.members;
  return {
    ...t,
    sources: [
      { id: "s1", title: "سجل المواليد", author: "وزارة الداخلية", publication: null, notes: "نسخة مصورة" },
      { id: "s2", title: "سجل  المواليد", author: "وزارة الداخليه", publication: "صنعاء 1950", notes: "الجزء الثاني" },
      { id: "s3", title: "Family Bible", author: null, publication: null, notes: null },
    ],
    citations: [
      { id: "c1", sourceId: "s1", memberId: a.id, eventType: "BIRT", page: "12" },
      { id: "c2", sourceId: "s2", memberId: a.id, eventType: "BIRT", page: "12" }, // same as c1: dropped on merge
      { id: "c3", sourceId: "s2", memberId: b.id, eventType: "DEAT", page: null },
      { id: "c4", sourceId: "s2", memberId: b.id, eventType: null, page: "40" },
      { id: "c5", sourceId: "s3", memberId: c.id, eventType: null, page: null },
    ],
    media: [
      { id: "m1", memberId: null, sourceId: "s1", url: "/api/media/blob/x", caption: "cover", fileType: "image/jpeg" },
      { id: "m2", memberId: null, sourceId: "s2", url: "/api/media/blob/x", caption: "cover again", fileType: "image/jpeg" },
      { id: "m3", memberId: null, sourceId: "s2", url: "/api/media/blob/y", caption: "page 40", fileType: "image/jpeg" },
      { id: "m4", memberId: a.id, sourceId: null, url: "/api/media/blob/z", caption: null, fileType: null },
    ],
  };
};

describe("source usage", () => {
  it("counts citations, different people and files per source", () => {
    const u = sourceUsage(tree());
    expect(u.get("s1")).toEqual({ citations: 1, people: 1, media: 1 });
    expect(u.get("s2")).toEqual({ citations: 3, people: 2, media: 2 });
    expect(u.get("s3")).toEqual({ citations: 1, people: 1, media: 0 });
  });

  it("finds likely duplicates despite spelling variants and spacing", () => {
    expect(likelyDuplicates(tree(), "s1").map((x) => x.id)).toEqual(["s2"]);
    expect(likelyDuplicates(tree(), "s3")).toEqual([]);
  });
});

describe("merging sources", () => {
  const t = tree();
  const plan = planMergeSources(t, "s2", "s1");
  const merged = applyMergeSources(t, plan);

  it("moves citations and files, dropping the ones the kept source already has", () => {
    expect(plan.dropCitationIds).toEqual(["c2"]);
    expect(plan.moveCitations.map((c) => c.id)).toEqual(["c3", "c4"]);
    expect(plan.dropMediaIds).toEqual(["m2"]);
    expect(plan.moveMedia.map((m) => m.id)).toEqual(["m3"]);
    expect(merged.sources.map((x) => x.id)).toEqual(["s1", "s3"]);
    expect(merged.citations.filter((c) => c.sourceId === "s1").map((c) => c.id).sort()).toEqual(["c1", "c3", "c4"]);
    expect(merged.media.filter((m) => m.sourceId === "s1").map((m) => m.id).sort()).toEqual(["m1", "m3"]);
    // nothing else is touched
    expect(merged.citations.find((c) => c.id === "c5")).toEqual(t.citations[4]);
    expect(merged.media.find((m) => m.id === "m4")).toEqual(t.media[3]);
  });

  it("keeps the kept source's fields, fills its blanks, and joins the notes", () => {
    expect(plan.into).toEqual({
      id: "s1", title: "سجل المواليد", author: "وزارة الداخلية", publication: "صنعاء 1950", notes: "نسخة مصورة\n\nالجزء الثاني",
    });
  });

  it("refuses to merge a source into itself or into one that does not exist", () => {
    expect(() => planMergeSources(t, "s1", "s1")).toThrow(/itself/);
    expect(() => planMergeSources(t, "s1", "nope")).toThrow(/not found/);
  });

  it("edit, merge and delete are each one undo step", async () => {
    const repo = localRepository(tree());
    const states: TreeDTO[] = [tree()];
    states.push(await repo.updateSource("s3", { title: "Family Bible (1890)", publication: "Private" }));
    states.push(await repo.mergeSources("s2", "s1"));
    states.push(await repo.deleteSource("s3")); // its citation goes with it
    expect(states[3].citations.some((c) => c.sourceId === "s3")).toBe(false);
    const sorted = (x: TreeDTO) => ({
      sources: [...x.sources].sort((a, b) => a.id.localeCompare(b.id)),
      citations: [...x.citations].sort((a, b) => a.id.localeCompare(b.id)),
      media: [...x.media].sort((a, b) => a.id.localeCompare(b.id)),
    });
    for (let i = 1; i < states.length; i++) {
      const [a, b] = [states[i - 1], states[i]];
      expect(sorted(applyRestore(b, planRestore(b, a)) as TreeDTO), `undo ${i}`).toEqual(sorted(a));
    }
  });
});
