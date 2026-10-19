import Link from "next/link";
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

  return (
    <main className="min-h-screen bg-parchment-100 text-bark-900" style={{ backgroundImage: PATTERN }}>
      <div className="mx-auto max-w-6xl px-6 pb-16 pt-10">
        {/* ── Hero: what the app makes, and the way in ─────────────────── */}
        <section className="grid items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-6 text-center lg:text-start">
            <div>
              <h1 className="font-ruqaa text-7xl font-bold leading-tight text-bark-700 drop-shadow-sm">شجرة</h1>
              <p className="font-naskh text-xl text-gilt-600 lg:text-left" dir="rtl">اصنع شجرة عائلتك… لوحةً تليق بالأجداد</p>
            </div>
            <p className="text-2xl font-light leading-snug text-bark-900">
              Grow your family into a print-ready <span className="font-medium text-leaf-700">botanical poster</span>.
            </p>
            <p className="max-w-xl text-base text-bark-500 lg:pe-6">
              Enter names once, as you would say them: «محمد بن عبدالله بن …». Shajarah grows the tree, keeps every
              line readable, and prints it at any size.
            </p>
            <div className="flex flex-wrap justify-center gap-3 lg:justify-start">
              <a href="#start" className="btn-primary px-5 py-2.5 text-base">Start your family</a>
              <Link href="/demo" className="btn-outline px-5 py-2.5 text-base">See a demo tree →</Link>
            </div>
          </div>
          <div className="relative mx-auto w-full max-w-sm lg:max-w-md">
            <div aria-hidden className="absolute -inset-3 rotate-2 rounded-lg bg-gilt-400/20 blur-sm" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/landing-poster.jpg"
              alt="A Shajarah poster: the family of Hamad and his three wives, in the gold-foil frame"
              className="relative w-full rounded-md border border-gilt-400/60 shadow-2xl"
            />
          </div>
        </section>

        {/* ── Features ───────────────────────────────────────────────── */}
        <section className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map(([icon, title, text]) => (
            <div key={title} className="rounded-xl border border-parchment-300/70 bg-white/70 p-4 backdrop-blur-sm">
              <div className="text-2xl" aria-hidden>{icon}</div>
              <h3 className="mt-1 font-semibold">{title}</h3>
              <p className="mt-1 text-sm text-bark-500">{text}</p>
            </div>
          ))}
        </section>

        {dbError ? (
          <section className="mt-12 rounded-xl border border-red-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-red-800">Could not reach the database</h2>
            <p className="mt-2 text-sm text-gray-600">
              Start PostgreSQL (<code>docker compose up -d</code>), copy <code>.env.example</code> to <code>.env</code>, then run{" "}
              <code>npm run db:migrate</code> and <code>npm run db:seed</code>. The <Link href="/demo" className="underline">demo</Link>{" "}
              works without one.
            </p>
          </section>
        ) : (
          <>
            {/* ── Your families ─────────────────────────────────────── */}
            {trees.length > 0 && (
              <section className="mt-14">
                <h2 className="mb-4 text-xl font-semibold">Your families</h2>
                <TreeCards trees={trees} />
              </section>
            )}

            {/* ── Three ways to start ───────────────────────────────── */}
            <section id="start" className="mt-14 scroll-mt-6">
              <h2 className="mb-1 text-xl font-semibold">{trees.length ? "Start another family" : "Start your family"}</h2>
              <p className="mb-5 text-sm text-bark-500">Type it in, bring it from a file, or open one you saved.</p>
              <div className="grid gap-5 lg:grid-cols-3">
                <div className="rounded-xl border border-parchment-300 bg-white p-5 shadow-sm">
                  <h3 className="font-semibold">✍️ A new family</h3>
                  <p className="mb-4 mt-1 text-sm text-bark-500">Begin with the eldest ancestor you know; add sons, daughters and wives from there.</p>
                  <CreateTreeForm />
                </div>
                <div className="rounded-xl border border-parchment-300 bg-white p-5 shadow-sm">
                  <h3 className="font-semibold">📄 From a file</h3>
                  <p className="mb-3 mt-1 text-sm text-bark-500">
                    A <b>GEDCOM</b> file from Ancestry, MyHeritage, FamilySearch or Gramps, or a <b>family outline</b>:
                    plain text, one name per line, indented under the father.
                  </p>
                  <pre className="mb-4 rounded-md bg-parchment-50 p-2 text-xs leading-relaxed" dir="rtl">{`عبدالله
  محمد | زوجة: نورة بنت سعد
    خالد | أم: نورة بنت سعد
    سارة (بنت) | زوج: فهد الشمري`}</pre>
                  <ImportFamilyButton />
                </div>
                <div className="rounded-xl border border-parchment-300 bg-white p-5 shadow-sm">
                  <h3 className="font-semibold">📦 A saved project</h3>
                  <p className="mb-4 mt-1 text-sm text-bark-500">
                    A <code>.shajarah</code> file holds a whole family: everyone, the poster&apos;s style, sources and photos.
                    It opens as a new family; the one here stays as it is.
                  </p>
                  <OpenProjectButton />
                </div>
              </div>
            </section>
          </>
        )}

        <footer className="mt-16 text-center text-xs text-bark-500">
          «تعلموا من أنسابكم ما تصلون به أرحامكم» · Shajarah keeps your families on this computer.
        </footer>
      </div>
    </main>
  );
}
