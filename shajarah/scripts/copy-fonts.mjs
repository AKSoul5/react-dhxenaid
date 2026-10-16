// Copies the Amiri (Arabic naskh) webfonts into public/fonts so that the
// poster can reference them at runtime and embed them into exported SVG/PDF.
import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = join(root, "node_modules/@fontsource/amiri/files");
const dest = join(root, "public/fonts");

if (!existsSync(src)) {
  console.warn("[copy-fonts] @fontsource/amiri not installed; skipping");
  process.exit(0);
}
mkdirSync(dest, { recursive: true });
for (const weight of ["400", "700"]) {
  for (const subset of ["arabic", "latin"]) {
    const file = `amiri-${subset}-${weight}-normal.woff2`;
    copyFileSync(join(src, file), join(dest, file));
  }
}
console.log("[copy-fonts] Amiri fonts copied to public/fonts");
