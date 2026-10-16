import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  // the layout tests run full poster layouts (up to ~500 people): seconds each under parallel load
  test: { include: ["tests/**/*.test.ts"], testTimeout: 30_000 },
});
