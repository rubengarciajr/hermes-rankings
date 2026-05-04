import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Liveness + readiness check. Designed for an external uptime monitor.
 * Returns 200 with {ok: true, db: "ok"} when the service can reach Postgres.
 * Returns 503 when the DB is unreachable.
 */
export async function GET() {
  const started = Date.now();
  try {
    const rows = await db.execute<{ one: number }>(sql`select 1 as one`);
    const elapsedMs = Date.now() - started;
    return NextResponse.json(
      {
        ok: true,
        db: rows[0]?.one === 1 ? "ok" : "unexpected_response",
        elapsed_ms: elapsedMs,
        version: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "dev",
        region: process.env.VERCEL_REGION ?? "local",
      },
      {
        status: 200,
        headers: { "cache-control": "no-store" },
      },
    );
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        db: "unreachable",
        error: err instanceof Error ? err.message : String(err),
      },
      { status: 503, headers: { "cache-control": "no-store" } },
    );
  }
}
