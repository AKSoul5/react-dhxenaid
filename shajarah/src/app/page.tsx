import Link from "next/link";
import { listTrees } from "@/lib/data/treeService";
import type { TreeSummary } from "@/lib/types";
import { CreateTreeForm } from "./CreateTreeForm";
import { OpenProjectButton } from "./OpenProjectButton";

export const dynamic = "force-dynamic";

export default async function Home() {
  let trees: TreeSummary[] = [];
  let dbError: string | null = null;
  try {
    trees = await listTrees();
  } catch (e) {
    dbError = e instanceof Error ? e.message.split("\n").slice(-1)[0] : "Database unavailable";
  }

  return (
    <main className="min-h-screen bg-parchment-100 px-6 py-12 text-bark-900">
      <div className="mx-auto max-w-4xl space-y-10">
        <header className="space-y-2 text-center">
          <h1 className="font-naskh text-6xl font-bold text-bark-700">شجرة</h1>
          <p className="text-lg">Shajarah: grow your family into a print-ready botanical poster</p>
          <Link href="/demo" className="btn-outline mt-2">Try the demo tree (no database needed) →</Link>
        </header>

        <div className="grid gap-8 md:grid-cols-2">
          <section className="rounded-xl border border-parchment-300 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold">Your trees</h2>
            {dbError ? (
              <div className="space-y-2 text-sm">
                <p className="text-red-700">Could not reach the database.</p>
                <p className="text-gray-600">
                  Start PostgreSQL (<code>docker compose up -d</code>), copy <code>.env.example</code> to <code>.env</code>, then run{" "}
                  <code>npm run db:migrate</code> and <code>npm run db:seed</code>.
                </p>
              </div>
            ) : trees.length === 0 ? (
              <p className="text-sm text-gray-500">No trees yet. Create one, or run <code>npm run db:seed</code>.</p>
            ) : (
              <ul className="divide-y divide-parchment-200">
                {trees.map((t) => (
                  <li key={t.id}>
                    <Link href={`/trees/${t.id}`} className="flex items-center justify-between py-2 hover:text-gilt-600">
                      <span className="font-naskh text-lg" dir="auto">{t.name}</span>
                      <span className="text-xs text-gray-500">{t.memberCount} members</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section className="rounded-xl border border-parchment-300 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold">Start a new tree</h2>
            {dbError ? <p className="text-sm text-gray-500">Available once the database is connected.</p> : (
              <div className="space-y-6">
                <CreateTreeForm />
                <div className="space-y-2 border-t border-parchment-200 pt-4">
                  <p className="text-sm text-gray-600">Or continue a family saved as a project file.</p>
                  <OpenProjectButton />
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
