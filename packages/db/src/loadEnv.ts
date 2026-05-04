import { config } from "dotenv";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "..", "..", "..");

// Load root .env.local first (highest priority for local secrets), then .env.
config({ path: resolve(root, ".env.local"), override: false });
config({ path: resolve(root, ".env"), override: false });
