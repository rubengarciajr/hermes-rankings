import type { NextConfig } from "next";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { config as loadEnv } from "dotenv";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "..", "..");

// Load env from the repo root so a single .env.local powers the web app, the
// db scripts, and the CLI. On Vercel these come from project settings — this
// only kicks in for local dev.
loadEnv({ path: resolve(repoRoot, ".env.local"), override: false });
loadEnv({ path: resolve(repoRoot, ".env"), override: false });

const config: NextConfig = {
  reactStrictMode: true,
  typedRoutes: true,
  transpilePackages: ["@hermesranker/db", "@hermesranker/schema"],
  outputFileTracingRoot: repoRoot,
};

export default config;
