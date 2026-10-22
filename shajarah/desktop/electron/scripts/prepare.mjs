// Gathers what the desktop app ships besides its own code: the Next.js
// standalone server (built with NEXT_OUTPUT=standalone), its static files
// and the database migrations.
import { cpSync, existsSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = join(dirname(fileURLToPath(import.meta.url)), "..");
const app = join(here, "..", "..");
const standalone = join(app, ".next", "standalone");
if (!existsSync(join(standalone, "server.js"))) {
  console.error("No standalone build: run `NEXT_OUTPUT=standalone npm run build` in the app folder first.");
  process.exit(1);
}
for (const dir of ["server", "migrations"]) rmSync(join(here, dir), { recursive: true, force: true });
cpSync(standalone, join(here, "server"), { recursive: true, dereference: true });
cpSync(join(app, ".next", "static"), join(here, "server", ".next", "static"), { recursive: true });
cpSync(join(app, "public"), join(here, "server", "public"), { recursive: true });
cpSync(join(app, "prisma", "migrations"), join(here, "migrations"), { recursive: true });
// the developer's own settings (the desktop app passes its database itself)
for (const env of [".env", ".env.local"]) rmSync(join(here, "server", env), { force: true });
console.log("prepared server/ and migrations/");
