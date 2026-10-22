import Link from "next/link";
import type * as React from "react";
import { listTrees } from "@/lib/data/treeService";
import type { TreeSummary } from "@/lib/types";
import { CreateTreeForm } from "./CreateTreeForm";
import { ImportFamilyButton } from "./ImportFamilyButton";
import { OpenProjectButton } from "./OpenProjectButton";
import { TreeCards } from "./TreeCards";

export const dynamic = "force-dynamic";

// A faint eight-pointed star lattice, like the margins of a manuscript.
const PATTERN = `url("data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><g fill="none" stroke="#c39a3c" stroke-opacity="0.13" stroke-width="1"><path d="M32 8l7 17 17 7-17 7-7 17-7-17-17-7 17-7z"/><rect x="20" y="20" width="24" height="24" transform="rotate(45 32 32)"/></g></svg>',
)}")`;

const FEATURES = [
  ["🌳", "A real tree", "Ancestors on the trunk, the oldest in the soil, the family in the canopy, every line clear."],
  ["✒️", "Arabic first", "Nasab names, Ruqaa titles, the basmala and verse medallions; English works too."],
  ["👨‍👩‍👧", "Whole families", "Daughters, wives and husbands, half-siblings, and a daughter's family on dotted lines."],
  ["🖨️", "Any size", "From A3 to wall-sized 2A0 and beyond: PDF, PNG, vector SVG or tiled sheets."],
] as const;

export default async function Home() {
  let trees: TreeSummary[] = [];
  let dbError: string | null = null;
  try {
    trees = await listTrees();
  } catch (e) {
    dbError = e instanceof Error ? e.message.split("\n").slice(-1)[0] : "Database unavailable";
  }

  const returning = trees.length > 0;
  // one card for each way to start: the same frame, the action at the bottom
  const startCard = (icon: string, title: string, text: React.ReactNode, action: React.ReactNode) => (
    <div className="flex flex-col rounded-xl border border-parchment-300 bg-white p-5 shadow-sm">
      <h3 className="flex items-center gap-2 font-semibold"><span aria-hidden>{icon}</span>{title}</h3>
      <div className="mt-1 flex-1 text-sm text-bark-500">{text}</div>
      <div className="mt-4">{action}</div>
    </div>
  );

  return (
    <main className="min-h-screen bg-parchment-100 text-bark-900" style={{ backgroundImage: PATTERN }}>
      <div className="mx-auto max-w-6xl px-4 pb-12 pt-8 sm:px-6">
        {/* ── Hero: what the app makes, and the way in ─────────────────── */}
        <section className="grid items-center gap-8 md:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-4 text-center md:text-start">
            <div>
              <h1 className="font-ruqaa text-6xl font-bold leading-tight text-bark-700 sm:text-7xl">شجرة</h1>
              <p className="font-naskh text-xl text-gilt-600 md:text-left" dir="rtl">اصنع شجرة عائلتك… لوحةً تليق بالأجداد</p>
            </div>
            <p className="text-2xl font-light leading-snug">
              Grow your family into a print-ready <span className="font-medium text-leaf-700">botanical poster</span>.
            </p>
            <p className="mx-auto max-w-xl text-base text-bark-500 md:mx-0">
              Enter names once, as you would say them: «محمد بن عبدالله بن …». Shajarah grows the tree, keeps every
              line readable, and prints it at any size.
            </p>
            <div className="flex flex-wrap justify-center gap-3 md:justify-start">
              <a href="#start" className="btn-primary px-5 py-2.5 text-base">{returning ? "Start another family" : "Start your family"}</a>
              <Link href="/demo" className="btn-outline px-5 py-2.5 text-base">See a demo tree →</Link>
            </div>
          </div>
          <div className={`relative mx-auto w-full ${returning ? "max-w-[15rem]" : "max-w-xs"}`}>
            <div aria-hidden className="absolute -inset-2 rotate-2 rounded-lg bg-gilt-400/20 blur-sm" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/landing-poster.jpg"
              alt="A Shajarah poster: the family of Hamad and his three wives, in the gold-foil frame"
              className="relative w-full rounded-md border border-gilt-400/60 shadow-xl"
            />
          </div>
        </section>

        {dbError ? (
          <section className="mt-10 rounded-xl border border-red-200 bg-white p-6 shadow-sm" role="alert">
            <h2 className="text-lg font-semibold text-red-800">Could not reach the database</h2>
            <p className="mt-2 text-sm text-gray-600">
              Start PostgreSQL (<code>docker compose up -d</code>), copy <code>.env.example</code> to <code>.env</code>, then run{" "}
              <code>npm run db:migrate</code> and <code>npm run db:seed</code>. The <Link href="/demo" className="underline">demo</Link>{" "}
              works without one.
            </p>
          </section>
        ) : (
          <>
            {/* ── Your families: what a returning user came for ─────── */}
            {returning ? (
              <section className="mt-10" aria-labelledby="families-h">
                <h2 id="families-h" className="mb-3 text-xl font-semibold">
                  Your families <span className="text-sm font-normal text-bark-500">({trees.length})</span>
                </h2>
                <TreeCards trees={trees} />
              </section>
            ) : (
              <section className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-label="What Shajarah does">
                {FEATURES.map(([icon, title, text]) => (
                  <div key={title} className="rounded-xl border border-parchment-300/70 bg-white/70 p-4">
                    <div className="text-2xl" aria-hidden>{icon}</div>
                    <h3 className="mt-1 font-semibold">{title}</h3>
                    <p className="mt-1 text-sm text-bark-500">{text}</p>
                  </div>
                ))}
              </section>
            )}

            {/* ── Three ways to start, apart from the list ──────────── */}
            <section id="start" className="mt-12 scroll-mt-6 border-t border-parchment-300 pt-8" aria-labelledby="start-h">
              <h2 id="start-h" className="text-xl font-semibold">{returning ? "Start another family" : "Start your family"}</h2>
              <p className="mb-5 mt-1 text-sm text-bark-500">Type it in, bring it from a file, or open one you saved.</p>
              <div className="grid gap-5 md:grid-cols-3">
                {startCard("✍️", "Create a new family",
                  <p>Begin with the eldest ancestor you know; add sons, daughters and wives from there.</p>,
                  <CreateTreeForm />)}
                {startCard("📄", "Import from a file",
                  <>
                    <p>
                      A <b>GEDCOM</b> file from Ancestry, MyHeritage, FamilySearch or Gramps, or a <b>family outline</b>:
                      plain text, one name per line, indented under the father.
                    </p>
                    <pre className="mt-3 overflow-x-auto rounded-md bg-parchment-50 p-2 text-xs leading-relaxed text-bark-700" dir="rtl">{`عبدالله
  محمد | زوجة: نورة بنت سعد
    خالد | أم: نورة بنت سعد
    سارة (بنت) | زوج: فهد الشمري`}</pre>
                  </>,
                  <ImportFamilyButton />)}
                {startCard("📦", "Open a saved project",
                  <p>
                    A <code>.shajarah</code> file holds a whole family: everyone, the poster&apos;s style, sources and photos.
                    It opens as a new family; the ones here stay as they are.
                  </p>,
                  <OpenProjectButton />)}
              </div>
            </section>
          </>
        )}

        <footer className="mt-12 text-center text-xs text-bark-500">
          <span dir="rtl">«تعلموا من أنسابكم ما تصلون به أرحامكم»</span> · Shajarah keeps your families on this computer.
        </footer>
      </div>
    </main>
  );
}
