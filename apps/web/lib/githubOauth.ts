import "server-only";

export function isGithubConfigured(): boolean {
  return Boolean(
    process.env.AUTH_GITHUB_ID && process.env.AUTH_GITHUB_SECRET,
  );
}

export function buildAuthorizeUrl(opts: {
  state: string;
  siteUrl: string;
}): string {
  const url = new URL("https://github.com/login/oauth/authorize");
  url.searchParams.set("client_id", process.env.AUTH_GITHUB_ID!);
  url.searchParams.set(
    "redirect_uri",
    `${opts.siteUrl}/api/v1/link-github/callback`,
  );
  url.searchParams.set("scope", "read:user");
  url.searchParams.set("state", opts.state);
  url.searchParams.set("allow_signup", "false");
  return url.toString();
}

export async function exchangeCodeForToken(code: string): Promise<
  | { ok: true; access_token: string }
  | { ok: false; reason: string }
> {
  const res = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      client_id: process.env.AUTH_GITHUB_ID,
      client_secret: process.env.AUTH_GITHUB_SECRET,
      code,
    }),
  });
  if (!res.ok) {
    return { ok: false, reason: `github_token_http_${res.status}` };
  }
  const json = (await res.json()) as {
    access_token?: string;
    error?: string;
    error_description?: string;
  };
  if (!json.access_token) {
    return {
      ok: false,
      reason: json.error ?? "github_no_access_token",
    };
  }
  return { ok: true, access_token: json.access_token };
}

export async function fetchGithubUser(accessToken: string): Promise<
  | { ok: true; login: string; id: number; avatar_url: string }
  | { ok: false; reason: string }
> {
  const res = await fetch("https://api.github.com/user", {
    headers: {
      authorization: `Bearer ${accessToken}`,
      accept: "application/vnd.github+json",
      "user-agent": "hermes-rankings",
    },
  });
  if (!res.ok) {
    return { ok: false, reason: `github_user_http_${res.status}` };
  }
  const json = (await res.json()) as {
    login: string;
    id: number;
    avatar_url: string;
  };
  return {
    ok: true,
    login: json.login,
    id: json.id,
    avatar_url: json.avatar_url,
  };
}
