import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";
import { resolve, dirname } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    environment: "node",
    include: ["**/*.test.ts", "**/*.test.tsx"],
    exclude: ["node_modules", ".next", "dist"],
  },
  resolve: {
    alias: {
      // Next.js fences server code with `import "server-only"` — vitest doesn't
      // know about it. Map it to a no-op so server-side helpers are testable.
      "server-only": resolve(here, "./test/server-only.ts"),
      "@": resolve(here, "./"),
    },
  },
});
