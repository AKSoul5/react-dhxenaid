// A wife recorded twice (once as a spouse, once as a child's mother):
// found by name among a man's spouses and his children's mothers, and
// merged into one record.
import { describe, expect, it } from "vitest";
import { duplicateSpouses, mergePeople, spouseNamed } from "@/lib/merge";
import type { MarriageDTO, MemberDTO, TreeDTO } from "@/lib/types";

const person = (id: string, name: string, gender: MemberDTO["gender"], over: Partial<MemberDTO> = {}): MemberDTO => ({
  id, name, laqab: null, gender, birthYear: null, deathYear: null, isDeceased: false, birthOrder: 0,
  generation: 0, notes: null, fatherId: null, motherId: null, ...over,
});
const marriage = (id: string, a: string, b: string): MarriageDTO => ({ id, spouseAId: a, spouseBId: b, startYear: null, endYear: null });

const family = (): TreeDTO => ({
  id: "t", name: "t", title: null, subtitle: null, lineage: "PATRILINEAL", rootMemberId: "f", crownBaseId: null,
  trunkStartId: null, soilText: null,
  settings: { familiesThrough: ["w2"], centerBranchId: "w2" },
  members: [
    person("f", "أحمد", "MALE"),
    person("w1", "هند العتيبي", "FEMALE"), // added as his wife
    person("w2", "هند  العتيبي", "FEMALE", { birthYear: 1960 }), // added again, as a child's mother
    person("w3", "سارة", "FEMALE"),
    person("a", "محمد", "MALE", { fatherId: "f", motherId: "w1" }),
    person("b", "فاتن", "FEMALE", { fatherId: "f", motherId: "w2" }),
    person("c", "خالد", "MALE", { fatherId: "f", motherId: "w2" }),
    person("d", "علي", "MALE", { fatherId: "f", motherId: "w3" }),
  ],
  // (the copy, made as a mother, has no marriage of its own)
  marriages: [marriage("m1", "f", "w1"), marriage("m3", "f", "w3")],
  sources: [], media: [{ id: "p", memberId: "w2", sourceId: null, url: "data:x", caption: null, fileType: null }],
  citations: [{ id: "c1", sourceId: "s", memberId: "w2", eventType: null, page: null }],
});

describe("a spouse recorded twice", () => {
  it("is found among a man's wives and his children's mothers, the married record first", () => {
    const groups = duplicateSpouses(family(), "f");
    expect(groups.map((g) => g.map((m) => m.id))).toEqual([["w1", "w2"]]);
    expect(duplicateSpouses(family(), "a")).toEqual([]);
  });

  it("is merged: her children, marriages, photos, sources and settings all with one record", () => {
    const t = mergePeople(family(), "w1", "w2");
    expect(t.members.some((m) => m.id === "w2")).toBe(false);
    expect(t.members.filter((m) => m.motherId === "w1").map((m) => m.name).sort()).toEqual(["خالد", "فاتن", "محمد"]);
    expect(t.members.find((m) => m.id === "w1")!.birthYear).toBe(1960); // a detail only the copy had
    expect(t.marriages.map((x) => [x.spouseAId, x.spouseBId])).toEqual([["f", "w1"], ["f", "w3"]]);
    expect(t.media[0].memberId).toBe("w1");
    expect(t.citations[0].memberId).toBe("w1");
    expect(t.settings?.familiesThrough).toEqual(["w1"]);
    expect(t.settings?.centerBranchId).toBe("w1");
    expect(duplicateSpouses(t, "f")).toEqual([]);
  });

  it("a mother typed by name is one of the father's wives (hamza forms and spaces aside)", () => {
    const t = family();
    expect(spouseNamed(t, "f", "سارة")?.id).toBe("w3");
    expect(spouseNamed(t, "f", "  ساره ")?.id).toBe("w3");
    expect(spouseNamed(t, "f", "نورة")).toBeNull();
  });
});
