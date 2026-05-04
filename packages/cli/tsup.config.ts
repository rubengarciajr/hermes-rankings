import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  target: "node18",
  outDir: "dist",
  sourcemap: false,
  minify: false,
  clean: true,
  splitting: false,
  shims: false,
  noExternal: ["@hermesranker/schema"],
  banner: {
    js: "#!/usr/bin/env node",
  },
});
