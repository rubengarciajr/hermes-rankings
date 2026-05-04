import {
  registerStartResponseSchema,
  registerPollResponseSchema,
  submitResponseSchema,
  type RegisterStartRequest,
  type RegisterStartResponse,
  type RegisterPollResponse,
  type SubmitRequest,
  type SubmitResponse,
} from "@hermesranker/schema";

export const DEFAULT_SERVER_URL =
  process.env.HERMES_RANK_URL ?? "https://hermes-rankings.com";

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly body: unknown,
  ) {
    super(message);
  }
}

async function request<T>(
  serverUrl: string,
  method: "GET" | "POST",
  path: string,
  init: { body?: unknown; bearer?: string } = {},
): Promise<T> {
  const headers: Record<string, string> = {
    "user-agent": `hermes-rank/${getCliVersion()}`,
    accept: "application/json",
  };
  if (init.body !== undefined) headers["content-type"] = "application/json";
  if (init.bearer) headers["authorization"] = `Bearer ${init.bearer}`;

  const res = await fetch(`${serverUrl}${path}`, {
    method,
    headers,
    body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
  });
  let json: unknown = null;
  try {
    json = await res.json();
  } catch {
    /* non-json response */
  }
  if (!res.ok) {
    const j = json as { error?: string; reason?: string } | null;
    throw new ApiError(
      j?.error ? `${j.error}${j.reason ? `: ${j.reason}` : ""}` : `http_${res.status}`,
      res.status,
      json,
    );
  }
  return json as T;
}

export async function registerStart(
  serverUrl: string,
  body: RegisterStartRequest,
): Promise<RegisterStartResponse> {
  const json = await request<unknown>(serverUrl, "POST", "/api/v1/register/start", {
    body,
  });
  return registerStartResponseSchema.parse(json);
}

export async function registerPoll(
  serverUrl: string,
  nonce: string,
): Promise<RegisterPollResponse> {
  const json = await request<unknown>(
    serverUrl,
    "GET",
    `/api/v1/register/poll?nonce=${encodeURIComponent(nonce)}`,
  );
  return registerPollResponseSchema.parse(json);
}

export async function submit(
  serverUrl: string,
  apiKey: string,
  body: SubmitRequest,
): Promise<SubmitResponse> {
  const json = await request<unknown>(serverUrl, "POST", "/api/v1/submit", {
    body,
    bearer: apiKey,
  });
  return submitResponseSchema.parse(json);
}

let _version: string | null = null;
export function getCliVersion(): string {
  if (_version) return _version;
  // Kept in sync with packages/cli/package.json#version. tsup's CJS-friendly
  // bundle doesn't reliably resolve import.meta.url, so we hardcode + ship.
  _version = "1.0.0";
  return _version;
}
