import {
  existsSync,
  mkdirSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { dirname } from "node:path";
import { z } from "zod";
import { cliConfigDir, identityFilePath } from "./paths.js";

const identitySchema = z.object({
  version: z.literal(1),
  fingerprint: z.string(),
  handle: z.string(),
  agent_id: z.string(),
  api_key: z.string(),
  registered_at: z.string(),
  last_submit_at: z.string().optional(),
  server_url: z.string().url(),
});
export type Identity = z.infer<typeof identitySchema>;

export function readIdentity(): Identity | null {
  const path = identityFilePath();
  if (!existsSync(path)) return null;
  try {
    const raw = JSON.parse(readFileSync(path, "utf8"));
    const parsed = identitySchema.safeParse(raw);
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export function writeIdentity(id: Identity): void {
  const path = identityFilePath();
  mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
  writeFileSync(path, JSON.stringify(id, null, 2) + "\n", { mode: 0o600 });
}

export function deleteIdentity(): boolean {
  const path = identityFilePath();
  if (!existsSync(path)) return false;
  unlinkSync(path);
  return true;
}

export function updateLastSubmit(): void {
  const id = readIdentity();
  if (!id) return;
  writeIdentity({ ...id, last_submit_at: new Date().toISOString() });
}

export function configDirExists(): boolean {
  return existsSync(cliConfigDir());
}
