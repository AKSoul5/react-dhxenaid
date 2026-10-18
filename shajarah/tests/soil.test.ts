// Soil styles: the foundation below the trunk, in each style, on real
// lineages. A style must stay between the ground line and the footer, keep
// every ancestor in reading order with nothing overlapping, stay legible,
// and reserve exactly the height it draws.
import { describe, expect, it } from "vitest";
import { computePosterLayout, textWidth, type PosterLayout } from "@/lib/layout/botanical";
import { SOIL_STYLES, SOIL_STYLE_ORDER, soilStyle, type SoilContext, type SoilGeometry, type SoilStyleId } from "@/lib/layout/soil";
import { RUQAA_WIDTH } from "@/lib/layout/soil/common";
import { computeGenerations } from "@/lib/genealogy";
import { kalaliTree } from "@/lib/samples/kalali";
import { layoutOptionsFor, resolveTheme, THEME_PRESETS } from "@/lib/theme";
import type { MemberDTO, TreeDTO } from "@/lib/types";

/** 64 ancestors in a line, the trunk start automatic: most of them in the soil. */
function chainTree(): TreeDTO {
  const members: MemberDTO[] = [];
  let parent: string | null = null;
  const names = ["محمد", "عبد الرحمن", "سالم", "عبد الله بن", "ناصر", "إبراهيم"];
  for (let i = 0; i < 64; i++) {
    const m: MemberDTO = {
      id: `c${i}`, name: names[i % names.length].replace(" بن", ""), laqab: i % 11 === 0 ? "الأكبر" : null, gender: "MALE",
      birthYear: null, deathYear: null, isDeceased: false, birthOrder: 0, generation: 0, notes: null, fatherId: parent, motherId: null,
    };
    members.push(m);
    parent = m.id;
  }
  for (const s of ["علي", "عمر", "خالد"]) members.push({ ...members[63], id: `k-${s}`, name: s, laqab: null, fatherId: "c63" });
  const gens = computeGenerations(members, "PATRILINEAL");
  for (const m of members) m.generation = gens.get(m.id)!;
  return {
    id: "chain", name: "chain", title: "سلسلة", subtitle: null, lineage: "PATRILINEAL", rootMemberId: "c0", crownBaseId: "c63",
    trunkStartId: null, soilText: null, settings: null, members, marriages: [], sources: [], citations: [], media: [],
  };
}

const layoutOf = (tree: TreeDTO, style: SoilStyleId, paper: "A2" | "A1" = "A2") =>
  computePosterLayout(tree, { ...layoutOptionsFor(resolveTheme(tree.settings), paper), soilStyle: style });

/** Approximate box of a text, from its anchor, size and font. */
function textBox(l: PosterLayout, t: SoilGeometry["texts"][number]) {
  const w = textWidth(t.text, t.fontSize) * (t.font === "ruqaa" ? RUQAA_WIDTH : 1);
  // in RTL "start" is the right end
  const rightToLeft = l.rtl;
  const x0 =
    t.anchor === "middle" ? t.x - w / 2
    : (t.anchor === "start") !== rightToLeft ? t.x
    : t.x - w;
  return { x0, x1: x0 + w, y0: t.y - t.fontSize * 0.85, y1: t.y + t.fontSize * 0.3 };
}

const families: [string, () => TreeDTO][] = [
  ["Al-Kalali (49 ancestors in the soil)", kalaliTree],
  ["a 64-ancestor chain, automatic trunk", chainTree],
  ["Al-Kalali with a custom nasab inscription", () => {
    const t = kalaliTree();
    return { ...t, soilText: "عبد كلال الأصغر بن نصر بن عبد كلال بن مثوب بن ذي حرث بن الحارث بن مالك" };
  }],
  ["Al-Kalali with a custom inscription that is not a nasab", () => ({ ...kalaliTree(), soilText: "نسب منقول من المشجرة الأصلية المحفوظة لدى الأسرة" })],
];

describe("soil styles on real lineages", () => {
  for (const style of SOIL_STYLE_ORDER) {
    for (const [name, make] of families) {
      it(`${SOIL_STYLES[style].label} · ${name}`, () => {
        const tree = make();
        const l = layoutOf(tree, style);
        const s = l.soil!;
        expect(s.style).toBe(style);
        expect(s.custom).toBe(!!tree.soilText);
        // between the ground line and the footer
        expect(s.box.y).toBeGreaterThanOrEqual(l.groundY - 1e-6);
        expect(s.box.y + s.box.h).toBeLessThanOrEqual(l.frame.footerY - l.width * 0.05);
        // the whole poster stays legible, the foundation included
        expect(l.legibility.ok).toBe(true);
        const names = s.texts.filter((t) => !t.annotation);
        for (const t of names) {
          const b = textBox(l, t);
          // on the page, within the frame's margin
          expect(b.x0).toBeGreaterThan(l.width * 0.02);
          expect(b.x1).toBeLessThan(l.width * 0.98);
        }
        // no two texts overlap (names, numbers and plaque lines alike)
        const boxes = s.texts.map((t) => textBox(l, t));
        for (let i = 0; i < boxes.length; i++) {
          for (let j = i + 1; j < boxes.length; j++) {
            const a = boxes[i], b = boxes[j];
            const overlap = Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0) > 1 && Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0) > 1;
            expect(overlap, `"${s.texts[i].text}" over "${s.texts[j].text}"`).toBe(false);
          }
        }
        // every ancestor, in reading order (newest first); a lineage too long
        // for its space leaves names out of its middle, marked "…", keeping
        // the nearest names and the last two
        const read = names.map((t) => t.text).join(" ");
        if (!tree.soilText) {
          const byId = new Map(tree.members.map((m) => [m.id, m]));
          const shown = new Set(l.trunkLabels.map((t) => t.member.id));
          // the soil ancestors are the chain above the lowest trunk badge
          const ancestors: string[] = [];
          let cur = byId.get(l.trunkLabels[l.trunkLabels.length - 1].member.id);
          while (cur?.fatherId) {
            cur = byId.get(cur.fatherId)!;
            if (!shown.has(cur.id)) ancestors.push(cur.name);
          }
          const cut = read.indexOf("…");
          const expected = cut < 0 ? ancestors : ancestors.slice(0, ancestors.length - 2);
          let at = 0, count = 0;
          for (const name of expected) {
            const found = read.indexOf(name, at);
            if (cut >= 0 && (found < 0 || found > cut)) break;
            expect(found, `${name} after position ${at}`).toBeGreaterThanOrEqual(0);
            at = found + name.length;
            count++;
          }
          if (cut < 0) expect(count).toBe(s.count);
          else {
            expect(count).toBeGreaterThan(0);
            const after = read.slice(cut);
            expect(after.indexOf(ancestors.at(-2)!)).toBeGreaterThan(0);
            expect(after.indexOf(ancestors.at(-1)!)).toBeGreaterThan(after.indexOf(ancestors.at(-2)!));
          }
        } else if (style !== "paragraph" && tree.soilText.includes(" بن ")) {
          // a nasab inscription is set name by name, without repeating the trunk's own first ancestor
          expect(names.some((t) => t.text === "عبد كلال الأصغر")).toBe(false);
          expect(read).toContain("مالك");
        } else {
          expect(read.replace(/\s+/g, " ")).toContain(tree.soilText.split(" ")[0]);
        }
      });
    }
  }

  it("the column: names larger and more spaced near the trunk, smaller and closer further down", () => {
    const s = layoutOf(kalaliTree(), "column").soil!;
    const column = s.texts.filter((t) => t.font === "ruqaa");
    expect(column.length).toBeGreaterThan(4);
    for (let i = 1; i < column.length; i++) expect(column[i].fontSize).toBeLessThanOrEqual(column[i - 1].fontSize + 1e-9);
    const gaps = column.slice(1).map((t, i) => t.y - column[i].y);
    for (let i = 1; i < gaps.length; i++) expect(gaps[i]).toBeLessThanOrEqual(gaps[i - 1] + 1e-6);
    expect(column[0].fontSize).toBeGreaterThan(column[column.length - 1].fontSize);
    // the oldest names that do not fit the column continue in the plaque at its foot
    expect(s.texts.some((t) => t.font === "naskh" && t.text.startsWith("بن"))).toBe(true);
  });

  it("the spine: names alternate sides, each with its generation on the spine, counting down", () => {
    const l = layoutOf(kalaliTree(), "spine");
    const s = l.soil!;
    const names = s.texts.filter((t) => t.memberId);
    const sides = names.map((t) => Math.sign(textBox(l, t).x0 + textBox(l, t).x1 - l.width));
    for (let i = 1; i < sides.length; i++) expect(sides[i]).toBe(-sides[i - 1]);
    // the generation numbers are held to the legible size, like the names
    const numberTexts = s.texts.filter((t) => /^[٠-٩0-9]+$/.test(t.text));
    expect(Math.min(...numberTexts.map((t) => t.fontSize))).toBeGreaterThanOrEqual(s.fontSize - 1e-9);
    expect(l.legibility.ok).toBe(true);
    const numbers = numberTexts.map((t) => Number(t.text.replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)))));
    expect(numbers.length).toBe(names.length);
    for (let i = 1; i < numbers.length; i++) expect(numbers[i]).toBe(numbers[i - 1] - 1);
  });

  it("the banner holds every name in columns, read right to left", () => {
    const l = layoutOf(kalaliTree(), "banner");
    const names = l.soil!.texts.filter((t) => t.memberId);
    expect(names.length).toBe(l.soil!.count);
    const xs = [...new Set(names.map((t) => Math.round(t.x)))];
    expect(xs.length).toBeGreaterThan(1);
    // the first column is the rightmost
    expect(Math.round(names[0].x)).toBe(Math.max(...xs));
  });

  it("the trunk meets each style its own way", () => {
    const spreads = SOIL_STYLE_ORDER.map((s) => layoutOf(kalaliTree(), s).soil!.trunkSpread);
    expect(Math.min(...spreads)).toBeLessThan(0.3); // the spine: the trunk narrows into it
    expect(layoutOf(kalaliTree(), "paragraph").soil!.trunkSpread).toBe(0.55); // as before
  });
});

describe("soil styles on their own", () => {
  const ctxFor = (n: number, extra: Partial<SoilContext> = {}): SoilContext => {
    const entries = Array.from({ length: n }, (_, i) => ({ id: `a${i}`, label: ["محمد", "عبد الرحمن", "سالم بن", "ذو رعين"][i % 4], generation: 100 - i }));
    return {
      entries, text: ["أحمد", ...entries.map((e) => e.label)].join(" بن "), custom: false, trunkName: "أحمد", rtl: true, joiner: " بن ",
      f: 20, floor: 14, maxFont: 40, maxWidth: 1400, avail: 2400, textWidth, ...extra,
    };
  };
  const place = (c: SoilContext) => ({ ...c, cx: 900, groundY: 2000, threadFrom: 1990, trunkWidth: 120, W: 1800 });

  for (const style of SOIL_STYLE_ORDER) {
    it(`${style}: reserves exactly the height it draws, for 0 to 60 names and custom text`, () => {
      const def = soilStyle(style);
      const cases = [1, 2, 3, 7, 15, 30, 60].map((n) => ctxFor(n));
      cases.push(ctxFor(12, { custom: true, text: "نص محفوظ في المشجرة القديمة" }));
      cases.push(ctxFor(12, { custom: true, text: "أحمد بن علي بن حسن بن عمر بن زيد" }));
      for (const c of cases) {
        const g = def.layout(place(c));
        expect(g.box.y + g.box.h).toBeCloseTo(2000 + def.height(c), 3);
        expect(g.box.y).toBeGreaterThanOrEqual(2000 - 1e-6);
        expect(g.fontSize).toBeGreaterThanOrEqual(14 - 1e-9);
        for (const t of g.texts) if (!t.annotation) expect(t.fontSize).toBeGreaterThanOrEqual(14 - 1e-9);
      }
    });
  }

  it("an unknown style falls back to the inscribed panel; every preset names a real style", () => {
    expect(soilStyle("nope").id).toBe("paragraph");
    expect(soilStyle(undefined).id).toBe("paragraph");
    for (const p of Object.values(THEME_PRESETS)) expect(SOIL_STYLES[p.soilStyle]).toBeDefined();
    expect(THEME_PRESETS.refined.soilStyle).toBe("column");
  });
});
