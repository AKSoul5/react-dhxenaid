// GEDCOM 5.5.1 import and export: the file formats other genealogy software
// writes, matching against an existing tree, and round trips.
import { describe, expect, it } from "vitest";
import { previewGedcom } from "@/components/editor/gedcomPreview";
import { GEDCOM_MAX_PEOPLE, decodeGedcom, exportGedcom, gedcomYear, parseGedcom, planGedcomImport } from "@/lib/gedcom";
import { lineageParentId } from "@/lib/genealogy";
import { importReceipt, undoImportLocally } from "@/lib/imports";
import { applyNasabLines } from "@/lib/nasab";
import { generateSampleTree } from "@/lib/sampleData";
import { kalaliTree } from "@/lib/samples/kalali";
import { marriagesFamily, multiMarriageFamily, namesFamily } from "@/lib/samples/fixtures";
import type { MemberDTO, TreeDTO } from "@/lib/types";

let idSpace = 0;
/** Fresh ids, never the same as another generator's (tree ids vs. import ids). */
const ids = () => {
  const prefix = `g${idSpace++}-`;
  let n = 0;
  return () => `${prefix}${n++}`;
};
const emptyTree = (lineage: TreeDTO["lineage"] = "PATRILINEAL"): TreeDTO => ({
  id: "t", name: "t", title: null, subtitle: null, lineage, rootMemberId: null, crownBaseId: null,
  trunkStartId: null, soilText: null, settings: null, members: [], marriages: [],
});
const named = (members: MemberDTO[], name: string) => members.filter((m) => m.name === name);
const one = (members: MemberDTO[], name: string) => {
  const found = named(members, name);
  expect(found, name).toHaveLength(1);
  return found[0];
};

// A file in the style of desktop genealogy programs: CRLF, a BOM, a shared
// NOTE record, CONC/CONT, two marriages, sources and media, and a child
// listed only on the family side.
const ENGLISH = [
  "﻿0 HEAD",
  "1 SOUR GRAMPS",
  "2 NAME Gramps",
  "1 GEDC",
  "2 VERS 5.5.1",
  "2 FORM LINEAGE-LINKED",
  "1 CHAR UTF-8",
  "0 @I1@ INDI",
  "1 NAME John /Smith/",
  "2 GIVN John",
  "2 SURN Smith",
  "2 NICK Jack",
  "1 SEX M",
  "1 BIRT",
  "2 DATE ABT 1850",
  "2 PLAC Leeds, England",
  "1 DEAT Y",
  "1 OCCU Weaver",
  "1 NOTE @N1@",
  "1 SOUR @S1@",
  "1 OBJE @O1@",
  "1 FAMS @F1@",
  "1 FAMS @F2@",
  "0 @I2@ INDI",
  "1 NAME Mary /Brown/",
  "1 SEX F",
  "1 FAMS @F1@",
  "0 @I3@ INDI",
  "1 NAME Ann /Green/",
  "1 SEX F",
  "1 FAMS @F2@",
  "0 @I4@ INDI",
  "1 NAME William /Smith/",
  "1 SEX M",
  "1 BIRT",
  "2 DATE 12 MAR 1875",
  "1 DEAT",
  "2 DATE BET 1940 AND 1945",
  "1 FAMC @F1@",
  "0 @I5@ INDI",
  "1 NAME Elizabeth /Smith/",
  "1 SEX F",
  "1 BIRT",
  "2 DATE 1873",
  "1 FAMC @F1@",
  "0 @I6@ INDI",
  "1 NAME Thomas /Smith/",
  "1 SEX M",
  "1 NOTE Moved to York.",
  "2 CONT Kept the mill",
  "2 CONC  until 1920 & sold it for 100 @@ 3%.",
  "0 @F1@ FAM",
  "1 HUSB @I1@",
  "1 WIFE @I2@",
  "1 MARR",
  "2 DATE 1870",
  "1 CHIL @I5@",
  "1 CHIL @I4@",
  "0 @F2@ FAM",
  "1 HUSB @I1@",
  "1 WIFE @I3@",
  "1 DIV",
  "2 DATE 1890",
  "1 CHIL @I6@",
  "0 @N1@ NOTE A weaver all his life.",
  "1 CONT Buried at St Mary's.",
  "0 @S1@ SOUR",
  "1 TITL Parish register",
  "0 TRLR",
].join("\r\n");

describe("reading GEDCOM files", () => {
  const file = parseGedcom(ENGLISH);
  const plan = planGedcomImport(emptyTree(), file, ids());
  const m = plan.members;

  it("reads people, names, nicknames, sex, years and notes", () => {
    expect(file.source).toBe("Gramps");
    expect(file.people).toHaveLength(6);
    const john = one(m, "John");
    expect(john.laqab).toBe("Jack");
    expect(john.gender).toBe("MALE");
    expect(john.birthYear).toBe(1850);
    expect(john.isDeceased).toBe(true);
    expect(john.deathYear).toBeNull();
    // the place and the inexact date are kept in the notes, with the shared NOTE record
    expect(john.notes).toContain("Born ABT 1850, Leeds, England");
    expect(john.notes).toContain("Occupation: Weaver");
    expect(john.notes).toContain("A weaver all his life.\nBuried at St Mary's.");
    const william = one(m, "William");
    expect(william.birthYear).toBe(1875);
    expect(william.deathYear).toBe(1940);
    expect(william.isDeceased).toBe(true);
    // CONT is a new line, CONC joins as written, @@ is a literal @
    expect(one(m, "Thomas").notes).toBe("Moved to York.\nKept the mill until 1920 & sold it for 100 @ 3%.");
  });

  it("links parents, keeps half-siblings with their own mothers, and the file's birth order", () => {
    const john = one(m, "John"), mary = one(m, "Mary"), ann = one(m, "Ann");
    const [eliz, william, thomas] = ["Elizabeth", "William", "Thomas"].map((n) => one(m, n));
    expect(eliz.fatherId).toBe(john.id);
    expect(eliz.motherId).toBe(mary.id);
    // Thomas has no FAMC line: the family's CHIL line is enough
    expect(thomas.fatherId).toBe(john.id);
    expect(thomas.motherId).toBe(ann.id);
    // CHIL order (Elizabeth before William), then the second marriage
    expect([eliz, william, thomas].map((x) => x.birthOrder)).toEqual([0, 1, 2]);
    expect(plan.newMarriages).toHaveLength(2);
    const second = plan.newMarriages.find((x) => x.spouseBId === ann.id)!;
    expect(second.endYear).toBe(1890);
    expect(plan.newMarriages.find((x) => x.spouseBId === mary.id)!.startYear).toBe(1870);
    expect(plan.rootMemberId).toBe(john.id);
    expect(william.generation).toBe(1);
  });

  it("says what it did not import", () => {
    expect(file.warnings.join(" ")).toMatch(/1 source citation and 1 media link were not imported/);
  });

  it("finds the year in the date forms GEDCOM allows", () => {
    expect(gedcomYear("12 JAN 1901")).toBe(1901);
    expect(gedcomYear("ABT 1900")).toBe(1900);
    expect(gedcomYear("BET 1850 AND 1860")).toBe(1850);
    expect(gedcomYear("FROM 1 MAR 1720 TO 1730")).toBe(1720);
    expect(gedcomYear("1700/01")).toBe(1700);
    expect(gedcomYear("@#DJULIAN@ 14 OCT 1066")).toBe(1066);
    expect(gedcomYear("@#DHIJRI@ 1320")).toBe(1320);
    expect(gedcomYear("(unknown)")).toBeNull();
    expect(gedcomYear("5 MAY")).toBeNull();
    expect(gedcomYear(undefined)).toBeNull();
  });

  it("decodes UTF-8, UTF-16 and, with a warning, legacy character sets", () => {
    const text = "0 HEAD\n1 CHAR UTF-8\n0 @I1@ INDI\n1 NAME أحمد\n0 TRLR\n";
    const utf8 = new Uint8Array([0xef, 0xbb, 0xbf, ...new TextEncoder().encode(text)]);
    expect(decodeGedcom(utf8).text).toBe(text);
    const utf16 = new Uint8Array(2 + text.length * 2);
    utf16.set([0xff, 0xfe]);
    for (let i = 0; i < text.length; i++) utf16.set([text.charCodeAt(i) & 0xff, text.charCodeAt(i) >> 8], 2 + i * 2);
    expect(decodeGedcom(utf16).text).toBe(text);
    const ansel = new Uint8Array([...new TextEncoder().encode("0 HEAD\n1 CHAR ANSEL\n0 @I1@ INDI\n1 NAME Jos"), 0xe2, 0x65]);
    const r = decodeGedcom(ansel);
    expect(r.text).toContain("NAME Jos");
    expect(r.warnings[0]).toMatch(/not UTF-8 \(character set: ANSEL\)/);
  });

  it("reports a file that is not GEDCOM instead of importing nothing silently", () => {
    const r = parseGedcom("hello\nworld");
    expect(r.people).toHaveLength(0);
    expect(r.warnings.join(" ")).toMatch(/does not look like a GEDCOM file/);
  });
});

describe("Arabic names in GEDCOM", () => {
  const file = parseGedcom([
    "0 HEAD", "1 CHAR UTF-8",
    "0 @I1@ INDI", "1 NAME محمد بن سالم /الكلالي/", "1 SEX M", "1 FAMS @F1@",
    "0 @I2@ INDI", "1 NAME عبد الله (أبو أحمد) رحمه الله", "1 SEX M", "1 FAMC @F1@",
    "0 @I3@ INDI", "1 NAME /الكلالي/", "1 SEX F", "1 FAMC @F1@",
    "0 @F1@ FAM", "1 HUSB @I1@", "1 CHIL @I2@", "1 CHIL @I3@",
    "0 TRLR",
  ].join("\n"));
  const m = planGedcomImport(emptyTree(), file, ids()).members;

  it("a nasab in the name is the person's own name when the file links the parents; laqab and honorific move to the laqab", () => {
    // محمد has no parents in the file: his whole name is kept
    expect(named(m, "محمد بن سالم")).toHaveLength(1);
    const abdullah = one(m, "عبد الله");
    expect(abdullah.laqab).toBe("أبو أحمد — رحمه الله");
    expect(abdullah.fatherId).toBe(one(m, "محمد بن سالم").id);
  });

  it("a person with only a surname keeps it as the name rather than becoming nameless", () => {
    expect(named(m, "الكلالي")).toHaveLength(1);
  });
});

describe("importing into an existing tree", () => {
  /** A tree built from a nasab: نوفل → أحمد → خالد (oldest first). */
  const existing = (): TreeDTO => {
    const t = emptyTree();
    const r = applyNasabLines([], t.lineage, "خالد بن أحمد بن نوفل", ids());
    return { ...t, members: r.members, rootMemberId: r.newRootId };
  };
  const family = (lines: string[]) => parseGedcom(["0 HEAD", ...lines, "0 TRLR"].join("\n"));

  it("reuses people already in the tree (spelling variants too), adds the rest, and older ancestors above the root", () => {
    const tree = existing();
    const file = family([
      "0 @A@ INDI", "1 NAME علي", "1 SEX M", "1 FAMS @F0@",
      "0 @N@ INDI", "1 NAME نوفل", "1 SEX M", "1 FAMC @F0@", "1 FAMS @F1@",
      "0 @H@ INDI", "1 NAME احمد", "1 SEX M", "1 FAMC @F1@", "1 FAMS @F2@", // no hamza: still أحمد
      "0 @K@ INDI", "1 NAME خالد", "1 SEX M", "1 FAMC @F2@",
      "0 @S@ INDI", "1 NAME سعيد", "1 SEX M", "1 FAMC @F2@",
      "0 @F0@ FAM", "1 HUSB @A@", "1 CHIL @N@",
      "0 @F1@ FAM", "1 HUSB @N@", "1 CHIL @H@",
      "0 @F2@ FAM", "1 HUSB @H@", "1 CHIL @K@", "1 CHIL @S@",
    ]);
    const plan = planGedcomImport(tree, file, ids());
    expect(plan.reused).toBe(3);
    expect(plan.newMembers.map((x) => x.name).sort()).toEqual(["سعيد", "علي"]);
    const ali = one(plan.members, "علي");
    const nawfal = one(plan.members, "نوفل");
    // the old root gains the father from the file, and the trunk now starts above it
    expect(plan.relinks).toEqual([{ id: nawfal.id, fatherId: ali.id, motherId: null }]);
    expect(plan.rootMemberId).toBe(ali.id);
    // the new son joins the existing father, after his existing brother
    const saeed = one(plan.members, "سعيد");
    expect(saeed.fatherId).toBe(one(plan.members, "أحمد").id);
    expect(saeed.birthOrder).toBeGreaterThan(one(plan.members, "خالد").birthOrder);
    expect(named(plan.members, "خالد")).toHaveLength(1);
  });

  it("never joins on a lone common name", () => {
    const plan = planGedcomImport(existing(), family(["0 @X@ INDI", "1 NAME نوفل", "1 SEX M"]), ids());
    expect(plan.reused).toBe(0);
    expect(plan.newMembers).toHaveLength(1);
  });

  it("imports as new, and counts, a person who matches two places in the tree", () => {
    const t = emptyTree();
    const r = applyNasabLines([], t.lineage, "علي بن محمد بن سالم\nعلي بن محمد بن سعيد", ids());
    const file = family([
      "0 @M@ INDI", "1 NAME محمد", "1 SEX M", "1 FAMS @F@",
      "0 @A@ INDI", "1 NAME علي", "1 SEX M", "1 FAMC @F@",
      "0 @F@ FAM", "1 HUSB @M@", "1 CHIL @A@",
    ]);
    const plan = planGedcomImport({ ...t, members: r.members, rootMemberId: r.newRootId }, file, ids());
    expect(plan.ambiguous).toBe(1);
    expect(plan.reused).toBe(0);
  });

  it("never overwrites a parent already recorded in the tree", () => {
    const tree = existing();
    const khalid = one(tree.members, "خالد");
    const mother: MemberDTO = { ...khalid, id: "mother-1", name: "مريم", gender: "FEMALE", fatherId: null, motherId: null };
    tree.members = [...tree.members.map((m) => (m.id === khalid.id ? { ...m, motherId: mother.id } : m)), mother];
    // the file agrees on the line but names another mother
    const file = family([
      "0 @N@ INDI", "1 NAME نوفل", "1 SEX M", "1 FAMS @F1@",
      "0 @H@ INDI", "1 NAME أحمد", "1 SEX M", "1 FAMC @F1@", "1 FAMS @F2@",
      "0 @W@ INDI", "1 NAME فاطمة", "1 SEX F", "1 FAMS @F2@",
      "0 @K@ INDI", "1 NAME خالد", "1 SEX M", "1 FAMC @F2@",
      "0 @F1@ FAM", "1 HUSB @N@", "1 CHIL @H@",
      "0 @F2@ FAM", "1 HUSB @H@", "1 WIFE @W@", "1 CHIL @K@",
    ]);
    const plan = planGedcomImport(tree, file, ids());
    expect(plan.reused).toBe(3);
    expect(one(plan.members, "خالد").motherId).toBe(mother.id);
    expect(plan.relinks).toEqual([]);
    // فاطمة is still added, as أحمد's wife
    expect(plan.newMembers.map((m) => m.name)).toEqual(["فاطمة"]);
    expect(plan.newMarriages).toHaveLength(1);
  });

  it("a person with a different father in the file is a different person", () => {
    const tree = existing();
    const file = family([
      "0 @X@ INDI", "1 NAME عمر", "1 SEX M", "1 FAMS @F@",
      "0 @K@ INDI", "1 NAME خالد", "1 SEX M", "1 FAMC @F@",
      "0 @F@ FAM", "1 HUSB @X@", "1 CHIL @K@",
    ]);
    const plan = planGedcomImport(tree, file, ids());
    expect(plan.reused).toBe(0);
    expect(named(plan.members, "خالد")).toHaveLength(2);
  });

  it("leaves out links that would make someone their own ancestor", () => {
    const file = family([
      "0 @A@ INDI", "1 NAME A", "1 SEX M", "1 FAMC @F2@", "1 FAMS @F1@",
      "0 @B@ INDI", "1 NAME B", "1 SEX M", "1 FAMC @F1@", "1 FAMS @F2@",
      "0 @F1@ FAM", "1 HUSB @A@", "1 CHIL @B@",
      "0 @F2@ FAM", "1 HUSB @B@", "1 CHIL @A@",
    ]);
    const plan = planGedcomImport(emptyTree(), file, ids());
    expect(plan.members).toHaveLength(2);
    expect(plan.members.filter((x) => x.fatherId)).toHaveLength(1);
    expect(plan.warnings.join(" ")).toMatch(/1 parent link would make someone their own ancestor/);
  });

  it("records the father and mother by sex, and says when a link has no place", () => {
    const file = family([
      "0 @P@ INDI", "1 NAME P", "1 SEX M", "1 FAMS @F@",
      "0 @Q@ INDI", "1 NAME Q", "1 SEX M", "1 FAMS @F@",
      "0 @C@ INDI", "1 NAME C", "1 SEX F", "1 FAMC @F@",
      "0 @F@ FAM", "1 HUSB @P@", "1 WIFE @Q@", "1 CHIL @C@",
    ]);
    const plan = planGedcomImport(emptyTree(), file, ids());
    const c = one(plan.members, "C");
    expect(c.fatherId).toBe(one(plan.members, "P").id);
    expect(c.motherId).toBeNull();
    expect(plan.warnings.join(" ")).toMatch(/1 parent link could not be recorded/);
  });
});

describe("GEDCOM export", () => {
  /** A member described by data alone: their line of names, sex, years, laqab, notes. */
  const signature = (members: MemberDTO[], lineage: TreeDTO["lineage"]) => {
    const byId = new Map(members.map((m) => [m.id, m]));
    const line = (m: MemberDTO): string => {
      const p = lineageParentId(m, lineage);
      const parent = p ? byId.get(p) : undefined;
      return parent ? `${line(parent)} > ${m.name}` : m.name;
    };
    return members
      .map((m) => {
        const mother = m.motherId ? byId.get(m.motherId)?.name : "";
        return [line(m), m.gender, m.birthYear, m.deathYear, m.isDeceased, m.laqab, m.notes, mother].join(" | ");
      })
      .sort();
  };
  const families: [string, TreeDTO][] = [
    ["Al-Kalali (85-name chain)", kalaliTree()],
    ["several marriages", marriagesFamily()],
    ["three wives", multiMarriageFamily()],
    ["names and honorifics", namesFamily()],
    ["large (195)", generateSampleTree()],
  ];

  for (const [name, tree] of families) {
    it(`${name}: export, then import into an empty tree, gives the same family`, () => {
      const text = exportGedcom(tree);
      const plan = planGedcomImport(emptyTree(tree.lineage), parseGedcom(text), ids());
      expect(plan.warnings).toEqual([]);
      expect(plan.members).toHaveLength(tree.members.length);
      expect(signature(plan.members, tree.lineage)).toEqual(signature(tree.members, tree.lineage));
      expect(plan.newMarriages).toHaveLength(tree.marriages.length);
      // siblings in the same order
      const order = (members: MemberDTO[]) => {
        const byId = new Map(members.map((m) => [m.id, m]));
        return [...members]
          .filter((m) => m.fatherId)
          .sort((a, b) => a.birthOrder - b.birthOrder)
          .map((m) => `${byId.get(m.fatherId!)!.name}:${m.name}`)
          .join(",");
      };
      expect(order(plan.members)).toEqual(order(tree.members));
      expect(plan.members.find((m) => m.id === plan.rootMemberId)?.name).toBe(tree.members.find((m) => m.id === tree.rootMemberId)?.name);
    });
  }

  it("Al-Kalali: importing its own export again reuses everyone and creates no one", () => {
    const tree = kalaliTree();
    const plan = planGedcomImport(tree, parseGedcom(exportGedcom(tree)), ids());
    expect(plan.newMembers).toEqual([]);
    expect(plan.newMarriages).toEqual([]);
    expect(plan.reused).toBe(tree.members.length);
  });

  it("writes a well-formed file: header, levels, line length, references", () => {
    const tree = namesFamily();
    tree.members[0].notes = "سطر طويل ".repeat(60) + "\nسطر ثان @ مع رمز";
    const text = exportGedcom(tree);
    const lines = text.trim().split("\n");
    expect(lines[0]).toBe("0 HEAD");
    expect(lines.at(-1)).toBe("0 TRLR");
    expect(text).toContain("1 CHAR UTF-8");
    let level = 0;
    for (const l of lines) {
      expect(l.length).toBeLessThanOrEqual(255);
      const n = Number(l.split(" ")[0]);
      expect(n).toBeLessThanOrEqual(level + 1);
      level = n;
    }
    const defined = new Set(lines.filter((l) => l.startsWith("0 @")).map((l) => l.split(" ")[1]));
    for (const l of lines) {
      const ptr = /^\d+ (?:HUSB|WIFE|CHIL|FAMC|FAMS|SUBM) (@[^@]+@)$/.exec(l);
      if (ptr) expect(defined.has(ptr[1]), l).toBe(true);
    }
    // the long note survives the CONC split, and @ its escaping
    const back = planGedcomImport(emptyTree(), parseGedcom(text), ids()).members;
    expect(back.find((m) => m.name === tree.members[0].name)!.notes).toBe(tree.members[0].notes);
  });
});

describe("undo this import", () => {
  const strip = (t: TreeDTO) => ({
    root: t.rootMemberId,
    members: t.members.map(({ generation: _g, ...m }) => m).sort((a, b) => a.id.localeCompare(b.id)),
    marriages: [...t.marriages].sort((a, b) => a.id.localeCompare(b.id)),
  });

  it("GEDCOM: undo gives back exactly the tree before, including the old root and parent links", () => {
    const t = emptyTree();
    const r = applyNasabLines([], t.lineage, "خالد بن أحمد بن نوفل", ids());
    const before: TreeDTO = { ...t, members: r.members, rootMemberId: r.newRootId };
    const file = parseGedcom([
      "0 HEAD",
      "0 @A@ INDI", "1 NAME علي", "1 SEX M", "1 FAMS @F0@",
      "0 @N@ INDI", "1 NAME نوفل", "1 SEX M", "1 FAMC @F0@", "1 FAMS @F1@",
      "0 @W@ INDI", "1 NAME هند", "1 SEX F", "1 FAMS @F1@",
      "0 @H@ INDI", "1 NAME أحمد", "1 SEX M", "1 FAMC @F1@",
      "0 @F0@ FAM", "1 HUSB @A@", "1 CHIL @N@",
      "0 @F1@ FAM", "1 HUSB @N@", "1 WIFE @W@", "1 CHIL @H@",
      "0 TRLR",
    ].join("\n"));
    const plan = planGedcomImport(before, file, ids());
    const after: TreeDTO = { ...before, members: plan.members, marriages: plan.newMarriages, rootMemberId: plan.rootMemberId };
    const receipt = importReceipt(before, after);
    expect(receipt.memberIds).toHaveLength(2); // علي, هند
    expect(receipt.marriageIds).toHaveLength(1);
    // نوفل got a father, أحمد got a mother: both are given back
    expect(receipt.restore).toHaveLength(2);
    expect(strip(undoImportLocally(after, receipt))).toEqual(strip(before));
  });

  it("nasab: undo removes the added ancestors and descendants only", () => {
    const t = emptyTree();
    const r = applyNasabLines([], t.lineage, "خالد بن أحمد بن نوفل", ids());
    const before: TreeDTO = { ...t, members: r.members, rootMemberId: r.newRootId };
    const r2 = applyNasabLines(before.members, t.lineage, "سعيد بن خالد بن أحمد بن نوفل بن علي", ids());
    const after: TreeDTO = { ...before, members: r2.members, rootMemberId: r2.newRootId ?? before.rootMemberId };
    const receipt = importReceipt(before, after);
    expect(receipt.memberIds).toHaveLength(2);
    expect(strip(undoImportLocally(after, receipt))).toEqual(strip(before));
  });
});

describe("the import preview (run in a Web Worker in the editor)", () => {
  const bytes = (text: string) => new TextEncoder().encode(text).buffer as ArrayBuffer;
  const empty = { members: [], marriages: [], lineage: "PATRILINEAL" as const, rootMemberId: null };

  it("summarises what the import will do", () => {
    const p = previewGedcom(bytes(ENGLISH), empty);
    expect(p).toMatchObject({ people: 6, families: 2, newMembers: 6, reused: 0, newMarriages: 2, blocked: null, source: "Gramps" });
    expect(p.text.startsWith("0 HEAD")).toBe(true);
  });

  it(`blocks a file with more than ${GEDCOM_MAX_PEOPLE.toLocaleString("en")} people before anything is sent`, () => {
    const lines = ["0 HEAD"];
    for (let i = 0; i <= GEDCOM_MAX_PEOPLE; i++) lines.push(`0 @I${i}@ INDI`, `1 NAME P${i}`);
    const p = previewGedcom(bytes(lines.join("\n")), empty);
    expect(p.people).toBe(GEDCOM_MAX_PEOPLE + 1);
    expect(p.blocked).toMatch(/accepts up to 20,000/);
  });
});
