import Link from "next/link";
import { redirect } from "next/navigation";
import { desc, eq, sql } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { isAdmin } from "@/lib/adminAuth";
import { formatRelativeTime } from "@/lib/leaderboard";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  if (!(await isAdmin())) redirect("/admin/login");

  const stats = await db.execute<{
    total: number;
    active: number;
    flagged: number;
    suspended: number;
    submissions_24h: number;
    rejected_24h: number;
  }>(sql`
    select
      (select count(*)::int from agents) as total,
      (select count(*)::int from agents where status = 'active') as active,
      (select count(*)::int from agents where status = 'flagged') as flagged,
      (select count(*)::int from agents where status = 'suspended') as suspended,
      (select count(*)::int from submissions where received_at > now() - interval '24 hours') as submissions_24h,
      (select count(*)::int from submissions where received_at > now() - interval '24 hours' and accepted = false) as rejected_24h
  `);
  const s = stats[0]!;

  const flaggedAgents = await db
    .select({
      id: schema.agents.id,
      handle: schema.agents.handle,
      status: schema.agents.status,
      lastSubmittedAt: schema.agents.lastSubmittedAt,
    })
    .from(schema.agents)
    .where(
      sql`${schema.agents.status} in ('flagged', 'suspended')`,
    )
    .orderBy(desc(schema.agents.lastSubmittedAt))
    .limit(50);

  const recent = await db
    .select({
      id: schema.agents.id,
      handle: schema.agents.handle,
      status: schema.agents.status,
      lastSubmittedAt: schema.agents.lastSubmittedAt,
    })
    .from(schema.agents)
    .where(eq(schema.agents.status, "active"))
    .orderBy(desc(schema.agents.lastSubmittedAt))
    .limit(20);

  const recentRejects = await db
    .select({
      id: schema.submissions.id,
      handle: schema.agents.handle,
      reason: schema.submissions.rejectReason,
      receivedAt: schema.submissions.receivedAt,
    })
    .from(schema.submissions)
    .leftJoin(schema.agents, eq(schema.agents.id, schema.submissions.agentId))
    .where(eq(schema.submissions.accepted, false))
    .orderBy(desc(schema.submissions.receivedAt))
    .limit(20);

  return (
    <div className="mx-auto max-w-[1200px] px-6 py-12">
      <div className="flex items-center justify-between mb-10">
        <div>
          <p className="label text-accent-gold mb-2">ADMIN · MODERATION</p>
          <h1 className="font-display text-2xl text-foreground">DASHBOARD</h1>
        </div>
        <form action="/admin/logout" method="post">
          <button
            type="submit"
            className="label-sm text-foreground-muted hover:text-foreground transition"
          >
            SIGN OUT
          </button>
        </form>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-px bg-border-faint border border-border-faint mb-12">
        <Stat label="TOTAL" value={s.total} />
        <Stat label="ACTIVE" value={s.active} accent />
        <Stat label="FLAGGED" value={s.flagged} amber />
        <Stat label="SUSPENDED" value={s.suspended} danger />
        <Stat label="SUBMITS / 24H" value={s.submissions_24h} />
        <Stat label="REJECTS / 24H" value={s.rejected_24h} amber />
      </div>

      <Section title={`FLAGGED + SUSPENDED · ${flaggedAgents.length}`}>
        {flaggedAgents.length === 0 ? (
          <Empty>No flagged or suspended agents.</Empty>
        ) : (
          <AgentTable agents={flaggedAgents} showStatus />
        )}
      </Section>

      <Section title={`RECENT ACTIVE · LAST SEEN`}>
        {recent.length === 0 ? (
          <Empty>No active agents yet.</Empty>
        ) : (
          <AgentTable agents={recent} />
        )}
      </Section>

      <Section title={`REJECTED SUBMISSIONS · LAST 20`}>
        {recentRejects.length === 0 ? (
          <Empty>No recent rejects.</Empty>
        ) : (
          <div className="border border-border-faint">
            <table className="w-full">
              <thead className="bg-background-soft">
                <tr className="border-b border-border-faint">
                  <Th>When</Th>
                  <Th>Agent</Th>
                  <Th>Reason</Th>
                </tr>
              </thead>
              <tbody>
                {recentRejects.map((r) => (
                  <tr
                    key={r.id}
                    className="border-b border-border-faint last:border-b-0"
                  >
                    <Td className="text-foreground-muted">
                      {formatRelativeTime(new Date(r.receivedAt))}
                    </Td>
                    <Td className="font-mono">{r.handle ?? "—"}</Td>
                    <Td className="text-foreground-muted text-sm">
                      {r.reason ?? "—"}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
  amber,
  danger,
}: {
  label: string;
  value: number;
  accent?: boolean;
  amber?: boolean;
  danger?: boolean;
}) {
  const cls = accent
    ? "text-accent-gold"
    : amber
    ? "text-accent-amber"
    : danger
    ? "text-danger"
    : "text-foreground";
  return (
    <div className="bg-background p-4">
      <p className="label-sm text-foreground-muted mb-1.5">{label}</p>
      <p className={`font-mono tabular-nums text-lg ${cls}`}>
        {value.toLocaleString()}
      </p>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-12">
      <p className="label text-foreground mb-4">{title}</p>
      {children}
    </section>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="border border-border-faint bg-background-soft p-8 text-center text-foreground-muted text-sm">
      {children}
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="label-sm text-foreground-muted text-left px-4 py-3">
      {children}
    </th>
  );
}

function Td({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <td className={`px-4 py-3 text-sm ${className}`}>{children}</td>;
}

type AdminAgent = {
  id: string;
  handle: string;
  status: string;
  lastSubmittedAt: Date | null;
};

function AgentTable({
  agents,
  showStatus = false,
}: {
  agents: AdminAgent[];
  showStatus?: boolean;
}) {
  return (
    <div className="border border-border-faint">
      <table className="w-full">
        <thead className="bg-background-soft">
          <tr className="border-b border-border-faint">
            <Th>Handle</Th>
            {showStatus && <Th>Status</Th>}
            <Th>Last seen</Th>
            <Th>Actions</Th>
          </tr>
        </thead>
        <tbody>
          {agents.map((a) => (
            <tr
              key={a.id}
              className="border-b border-border-faint last:border-b-0"
            >
              <Td>
                <Link
                  href={`/admin/agent/${a.handle}` as `/admin/agent/${string}`}
                  className="font-mono hover:text-accent-gold transition"
                >
                  {a.handle}
                </Link>
              </Td>
              {showStatus && (
                <Td>
                  <span
                    className={
                      a.status === "suspended"
                        ? "label-sm text-danger"
                        : "label-sm text-accent-amber"
                    }
                  >
                    {a.status.toUpperCase()}
                  </span>
                </Td>
              )}
              <Td className="text-foreground-muted">
                {a.lastSubmittedAt
                  ? formatRelativeTime(new Date(a.lastSubmittedAt))
                  : "never"}
              </Td>
              <Td>
                <Link
                  href={`/admin/agent/${a.handle}` as `/admin/agent/${string}`}
                  className="label-sm text-accent-gold hover:underline"
                >
                  REVIEW →
                </Link>
              </Td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
