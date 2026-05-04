import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const nonce = url.searchParams.get("nonce");
  if (!nonce) {
    return NextResponse.json({ error: "nonce_required" }, { status: 400 });
  }
  const row = await db.query.githubLinkNonces.findFirst({
    where: eq(schema.githubLinkNonces.nonce, nonce),
  });
  if (!row) {
    return NextResponse.json({ status: "expired" });
  }
  if (row.expiresAt.getTime() < Date.now() && !row.completedAt) {
    return NextResponse.json({ status: "expired" });
  }
  if (row.error) {
    return NextResponse.json({ status: "rejected", reason: row.error });
  }
  if (!row.completedAt || !row.completedGithubLogin) {
    return NextResponse.json({ status: "pending" });
  }
  return NextResponse.json({
    status: "ready",
    github_login: row.completedGithubLogin,
  });
}
