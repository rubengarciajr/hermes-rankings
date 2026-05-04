import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { eq, desc } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { isAdmin } from "@/lib/adminAuth";
import { changeAgentStatus } from "@/lib/adminActions";
import { getAgentProfile } from "@/lib/agent";
import { formatRelativeTime } from "@/lib/leaderboard";

export const dynamic = "force-dynamic";

export default async function AdminAgentPage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  if (!(await isAdmin())) redirect("/admin/login");
  const { handle } = await params;

  const profile = await getAgentProfile(handle);

  // Look up the raw agent record too — getAgentProfile filters out non-active
  // agents which we still want to inspect from admin.
  const rawAgent = await db.query.agents.findFirst({
    where: eq(schema.agents.handle, handle),
  });
  if (!rawAgent) notFound();

  const recentSubmissions = await db
    .select({
      id: schema.submissions.id,
      receivedAt: schema.submissions.receivedAt,
      accepted: schema.submissions.accepted,
      rejectReason: schema.submissions.rejectReason,
      clientVersion: schema.submissions.clientVersion,
      sourceIpHash: schema.submissions.sourceIpHash,
    })
    .from(schema.submissions)
    .where(eq(schema.submissions.agentId, rawAgent.id))
    .orderBy(desc(schema.submissions.receivedAt))
    .limit(10);

  const audit = await db
    .select({
      id: schema.auditLog.id,
      action: schema.auditLog.action,
      reason: schema.auditLog.reason,
      actor: schema.auditLog.actor,
      createdAt: schema.auditLog.createdAt,
      public: schema.auditLog.public,
    })
    .from(schema.auditLog)
    .where(eq(schema.auditLog.targetAgent, rawAgent.id))
    .orderBy(desc(schema.auditLog.createdAt))
    .limit(20);

  return (
    <div className="mx-auto max-w-[1000px] px-6 py-12">
      <Link
        href="/admin"
        className="label-sm text-foreground-muted hover:text-foreground transition mb-6 inline-block"
      >
        ← ADMIN
      </Link>

      <header className="mb-10">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <p className="label text-accent-gold mb-2">
              ADMIN · AGENT · STATUS:{" "}
              <span
                className={
                  rawAgent.status === "active"
                    ? "text-success"
                    : rawAgent.status === "flagged"
                    ? "text-accent-amber"
                    : "text-danger"
                }
              >
                {rawAgent.status.toUpperCase()}
              </span>
            </p>
            <h1 className="font-display text-2xl text-foreground break-all">
              {rawAgent.handle}
            </h1>
          </div>
          <Link
            href={`/agent/${handle}` as `/agent/${string}`}
            target="_blank"
            className="label-sm text-foreground-muted hover:text-accent-gold transition"
          >
            VIEW PUBLIC PROFILE ↗
          </Link>
        </div>
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-px bg-border-faint border border-border-faint">
          <Field label="SCORE" value={profile?.totalScore.toLocaleString() ?? "—"} />
          <Field label="BADGES" value={String(profile?.badges.length ?? 0)} />
          <Field
            label="GITHUB"
            value={rawAgent.githubLogin ?? "—"}
          />
          <Field
            label="LAST SUBMIT"
            value={formatRelativeTime(rawAgent.lastSubmittedAt)}
          />
        </div>
      </header>

      <Section title="ACTIONS">
        <form
          action={changeAgentStatus}
          className="border border-border-faint bg-background-soft p-5 flex flex-col gap-3"
        >
          <input type="hidden" name="handle" value={rawAgent.handle} />
          <label className="label-sm text-foreground-muted">
            NEW STATUS
            <select
              name="status"
              defaultValue={rawAgent.status === "active" ? "flagged" : "active"}
              className="block mt-2 w-full bg-background border border-border-soft px-3 py-2 font-mono text-foreground"
            >
              <option value="active">active (clear)</option>
              <option value="flagged">flagged (visible w/ warning)</option>
              <option value="suspended">suspended (hidden)</option>
              <option value="deleted">deleted (gone, fingerprint blocked)</option>
            </select>
          </label>
          <label className="label-sm text-foreground-muted">
            REASON
            <input
              name="reason"
              type="text"
              placeholder="One-line reason — published if checkbox below ticked"
              className="block mt-2 w-full bg-background border border-border-soft px-3 py-2 font-mono text-foreground placeholder:text-foreground-faint"
            />
          </label>
          <label className="flex items-center gap-2 label-sm text-foreground-muted cursor-pointer">
            <input type="checkbox" name="public" defaultChecked />
            PUBLISH ON /transparency
          </label>
          <button
            type="submit"
            className="border border-accent-gold text-accent-gold label px-4 py-2.5 hover:bg-accent-gold/10 transition self-start"
          >
            APPLY
          </button>
        </form>
      </Section>

      <Section title={`RECENT SUBMISSIONS · ${recentSubmissions.length}`}>
        {recentSubmissions.length === 0 ? (
          <Empty>No submissions yet.</Empty>
        ) : (
          <div className="border border-border-faint">
            <table className="w-full">
              <thead className="bg-background-soft">
                <tr className="border-b border-border-faint">
                  <Th>When</Th>
                  <Th>Status</Th>
                  <Th>CLI</Th>
                  <Th>IP hash</Th>
                  <Th>Reject reason</Th>
                </tr>
              </thead>
              <tbody>
                {recentSubmissions.map((s) => (
                  <tr
                    key={s.id}
                    className="border-b border-border-faint last:border-b-0"
                  >
                    <Td className="text-foreground-muted">
                      {formatRelativeTime(new Date(s.receivedAt))}
                    </Td>
                    <Td>
                      <span
                        className={
                          s.accepted
                            ? "label-sm text-success"
                            : "label-sm text-danger"
                        }
                      >
                        {s.accepted ? "OK" : "REJECT"}
                      </span>
                    </Td>
                    <Td className="font-mono text-xs">{s.clientVersion}</Td>
                    <Td className="font-mono text-xs text-foreground-faint">
                      {s.sourceIpHash.slice(0, 12)}…
                    </Td>
                    <Td className="text-foreground-muted text-sm">
                      {s.rejectReason ?? "—"}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      <Section title={`AUDIT LOG · ${audit.length}`}>
        {audit.length === 0 ? (
          <Empty>No actions on file.</Empty>
        ) : (
          <div className="border border-border-faint">
            <table className="w-full">
              <thead className="bg-background-soft">
                <tr className="border-b border-border-faint">
                  <Th>When</Th>
                  <Th>Action</Th>
                  <Th>Actor</Th>
                  <Th>Public</Th>
                  <Th>Reason</Th>
                </tr>
              </thead>
              <tbody>
                {audit.map((a) => (
                  <tr
                    key={a.id}
                    className="border-b border-border-faint last:border-b-0"
                  >
                    <Td className="text-foreground-muted">
                      {formatRelativeTime(new Date(a.createdAt))}
                    </Td>
                    <Td className="label-sm text-accent-gold">
                      {a.action.toUpperCase()}
                    </Td>
                    <Td className="font-mono text-xs">{a.actor}</Td>
                    <Td className="text-xs">
                      {a.public ? (
                        <span className="text-success">PUBLIC</span>
                      ) : (
                        <span className="text-foreground-muted">private</span>
                      )}
                    </Td>
                    <Td className="text-foreground-muted text-sm">
                      {a.reason ?? "—"}
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

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-background p-4">
      <p className="label-sm text-foreground-muted mb-1.5">{label}</p>
      <p className="font-mono text-sm text-foreground truncate">{value}</p>
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
