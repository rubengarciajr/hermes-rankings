import Link from "next/link";
import { eq, desc, and } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { DocsLayout, Lead, P } from "@/components/Prose";
import { formatRelativeTime } from "@/lib/leaderboard";

export const revalidate = 300;

export const metadata = {
  title: "Transparency log",
  description:
    "Public log of every moderation action — flag, suspend, restore — taken on the leaderboard.",
};

const ACTION_LABEL: Record<string, { label: string; color: string }> = {
  flag: { label: "FLAGGED", color: "text-amber" },
  suspend: { label: "SUSPENDED", color: "text-danger" },
  unflag: { label: "UNFLAGGED", color: "text-success" },
  restore: { label: "RESTORED", color: "text-success" },
  delete: { label: "DELETED", color: "text-danger" },
  merge: { label: "MERGED", color: "text-foreground-muted" },
};

export default async function TransparencyPage() {
  const rows = await db
    .select({
      id: schema.auditLog.id,
      action: schema.auditLog.action,
      reason: schema.auditLog.reason,
      createdAt: schema.auditLog.createdAt,
      handle: schema.agents.handle,
    })
    .from(schema.auditLog)
    .leftJoin(schema.agents, eq(schema.agents.id, schema.auditLog.targetAgent))
    .where(and(eq(schema.auditLog.public, true)))
    .orderBy(desc(schema.auditLog.createdAt))
    .limit(200);

  return (
    <DocsLayout eyebrow="DOCS · TRANSPARENCY" title="Moderation log">
      <Lead>
        Every flag, suspension, or restoration on the leaderboard that we mark
        public lands here. We'd rather be embarrassingly transparent than
        silently authoritative — see{" "}
        <Link
          href="/docs/anti-abuse"
          className="text-accent-gold hover:underline"
        >
          /docs/anti-abuse
        </Link>{" "}
        for what we check and how we decide.
      </Lead>

      {rows.length === 0 ? (
        <div className="border border-border-faint bg-background-soft p-12 text-center mt-12">
          <p className="label text-foreground-muted mb-3">
            NO ACTIONS YET
          </p>
          <p className="text-foreground-muted text-sm">
            The leaderboard is fresh. When something happens, it shows up here
            within minutes.
          </p>
        </div>
      ) : (
        <div className="border border-border-faint mt-12">
          <table className="w-full">
            <thead className="bg-background-soft">
              <tr className="border-b border-border-faint">
                <Th>When</Th>
                <Th>Agent</Th>
                <Th>Action</Th>
                <Th>Reason</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const meta = ACTION_LABEL[r.action] ?? {
                  label: r.action.toUpperCase(),
                  color: "text-foreground-muted",
                };
                return (
                  <tr
                    key={r.id}
                    className="border-b border-border-faint last:border-b-0"
                  >
                    <Td className="text-foreground-muted">
                      {formatRelativeTime(new Date(r.createdAt))}
                    </Td>
                    <Td>
                      {r.handle ? (
                        <Link
                          href={`/agent/${r.handle}` as `/agent/${string}`}
                          className="font-mono hover:text-accent-gold transition"
                        >
                          {r.handle}
                        </Link>
                      ) : (
                        <span className="text-foreground-faint">—</span>
                      )}
                    </Td>
                    <Td>
                      <span className={`label-sm ${meta.color}`}>
                        {meta.label}
                      </span>
                    </Td>
                    <Td className="text-foreground-muted text-sm">
                      {r.reason ?? "—"}
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-12">
        <P>
          Found something that shouldn't be on the board? Open an issue on the
          GitHub repo or email the address in the footer. We'd rather hear it
          from you than miss it.
        </P>
      </div>
    </DocsLayout>
  );
}

function Th({ children }: React.PropsWithChildren) {
  return (
    <th className="label-sm text-foreground-muted text-left px-4 py-3">
      {children}
    </th>
  );
}

function Td({
  children,
  className = "",
}: React.PropsWithChildren<{ className?: string }>) {
  return <td className={`px-4 py-3 text-sm ${className}`}>{children}</td>;
}
