// The family outline: the family as plain text (one person per line,
// indented under the parent), written out and read back through the
// GEDCOM import.
import { describe, expect, it } from "vitest";
import { parseGedcom, planGedcomImport } from "@/lib/gedcom";
import { exportOutline, looksLikeOutline, parseOutline } from "@/lib/outline";
import { kalaliTree } from "@/lib/samples/kalali";
import { nouriFamily } from "@/lib/samples/nouri";
import { stressFamily } from "@/lib/samples/stress";
import type { MarriageDTO, MemberDTO, TreeDTO } from "@/lib/types";

/** Each person by name, gender, years and whole line of fathers and mothers; each marriage by both names. */
const shape = (members: MemberDTO[], marriages: MarriageDTO[]) => {
  const by = new Map(members.map((m) => [m.id, m]));
  const path = (m: MemberDTO | undefined, d = 0): string =>
    m && d < 60 ? `${m.name}${m.gender === "FEMALE" ? "♀" : ""}<${path(by.get(m.fatherId!), d + 1)}|${by.get(m.motherId!)?.name ?? ""}>` : "";
  return {
    people: members.map((m) => `${path(m)} ${m.birthYear ?? ""}-${m.deathYear ?? ""} ${m.laqab ?? ""}`).sort(),
    marriages: marriages.map((x) => [by.get(x.spouseAId)?.name, by.get(x.spouseBId)?.name].sort().join(" + ")).sort(),
  };
};

const roundTrip = (tree: TreeDTO) => {
  const text = exportOutline(tree);
  const read = parseOutline(text);
  expect(read.warnings).toEqual([]);
  expect(shape(read.members, read.marriages)).toEqual(shape(tree.members, tree.marriages));
  return { text, read };
};

describe("family outline", () => {
  it("writes the Al-Nouri family (two wives, daughters' families, unknown fathers) and reads it back the same", () => {
    const { text } = roundTrip(nouriFamily());
    expect(text).toContain("Ibrahim Al-Nouri | wife:");
    // a daughter's children under her, with their father named
    expect(text).toMatch(/\n {2}Amina \(F\) \| mother: .* \| husband: Hassan\n {4}Yusuf \| father: Hassan/);
  });

  it("writes the 85-name Al-Kalali line and reads it back the same", () => {
    const { text } = roundTrip(kalaliTree());
    expect(text.split("\n").filter((l) => l && !l.startsWith("#"))).toHaveLength(kalaliTree().members.length);
  });

  it("a 656-person family with several wives, remarried daughters and their families: the same people, parents and marriages", () => {
    roundTrip(stressFamily({ size: 300, seed: 4 }).tree);
  });

  it("is imported like a GEDCOM file: preview, new members, the trunk's root", () => {
    const tree = nouriFamily();
    const text = exportOutline(tree);
    expect(looksLikeOutline(text)).toBe(true);
    const file = parseGedcom(text);
    expect(file.source).toBe("Shajarah family outline");
    let n = 0;
    const empty = { members: [], marriages: [], lineage: tree.lineage, rootMemberId: null, sources: [], citations: [], media: [] };
    const plan = planGedcomImport(empty, file, () => `i${n++}`);
    expect(shape(plan.members, plan.newMarriages)).toEqual(shape(tree.members, tree.marriages));
    expect(plan.members.find((m) => m.id === plan.rootMemberId)?.name).toBe("Ibrahim Al-Nouri");
    // and a GEDCOM file is still read as GEDCOM
    expect(looksLikeOutline("0 HEAD\n1 GEDC\n0 @I1@ INDI\n1 NAME A\n0 TRLR")).toBe(false);
  });

  it("reads one written by hand: Arabic keys, tabs, a cousin married into the line, years in Arabic digits", () => {
    const read = parseOutline([
      "# آل حقيل",
      "عبدالله | لقب: الكبير | مواليد: ١٣٢٠ | وفاة: ١٣٩٠",
      "\tمحمد | زوجة: نورة بنت سعد; #1",
      "\t\tخالد | أم: نورة بنت سعد",
      "\t\tهند (بنت) | أم: #1 | زوج: فهد الشمري",
      "\t\t\tسلمان | أب: فهد الشمري",
      "\tسارة (F) #1",
      "",
    ].join("\n"));
    expect(read.warnings).toEqual([]);
    const by = (name: string) => read.members.find((m) => m.name === name)!;
    expect(by("عبدالله")).toMatchObject({ laqab: "الكبير", birthYear: 1320, deathYear: 1390, isDeceased: true });
    expect(by("محمد").fatherId).toBe(by("عبدالله").id);
    expect(by("خالد")).toMatchObject({ fatherId: by("محمد").id, motherId: by("نورة بنت سعد").id, gender: "MALE" });
    // the cousin: one person, his wife and the mother of his daughter
    expect(read.members.filter((m) => m.name === "سارة")).toHaveLength(1);
    expect(by("هند")).toMatchObject({ gender: "FEMALE", motherId: by("سارة").id });
    expect(by("سلمان")).toMatchObject({ motherId: by("هند").id, fatherId: by("فهد الشمري").id });
    expect(read.marriages).toHaveLength(3);
    expect(read.rootMemberId).toBe(by("عبدالله").id);
  });

  it("says what it could not read", () => {
    const read = parseOutline("أحمد | color: blue\n  علي | mother: #4");
    expect(read.warnings).toEqual(['Line 1: "color: blue" is not a known detail.', "Line 2: #4 is not given to anyone."]);
  });
});
