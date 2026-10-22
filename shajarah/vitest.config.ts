import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  // Speed budgets live in tests/bench/ and only run with BENCH=1 (npm run bench),
  // alone: timing inside the parallel suite measures the machine, not the code.
  test: { include: ["tests/**/*.test.ts"], fileParallelism: !process.env.BENCH },
});
