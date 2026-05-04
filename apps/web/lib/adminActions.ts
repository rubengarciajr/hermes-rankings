"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, schema } from "./db";
import { isAdmin } from "./adminAuth";

const ALLOWED_STATUSES = ["active", "flagged", "suspended", "deleted"] as const;
type AgentStatus = (typeof ALLOWED_STATUSES)[number];

/** Set the agent's status and write a public audit_log entry. */
export async function changeAgentStatus(formData: FormData) {
  if (!(await isAdmin())) {
    redirect("/admin/login");
  }

  const handle = String(formData.get("handle") ?? "");
  const newStatus = String(formData.get("status") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();
  const isPublic = formData.get("public") === "on";

  if (!ALLOWED_STATUSES.includes(newStatus as AgentStatus)) {
    throw new Error(`invalid_status: ${newStatus}`);
  }

  const agent = await db.query.agents.findFirst({
    where: eq(schema.agents.handle, handle),
  });
  if (!agent) throw new Error("agent_not_found");
  if (agent.status === newStatus) return; // no-op

  await db
    .update(schema.agents)
    .set({ status: newStatus as AgentStatus })
    .where(eq(schema.agents.id, agent.id));

  await db.insert(schema.auditLog).values({
    actor: "admin",
    action: actionFor(agent.status, newStatus),
    targetAgent: agent.id,
    reason: reason || `Status changed from ${agent.status} to ${newStatus}`,
    evidence: { from: agent.status, to: newStatus },
    public: isPublic,
  });

  revalidatePath("/");
  revalidatePath(`/agent/${handle}`);
  revalidatePath("/transparency");
  revalidatePath("/admin");
  revalidatePath(`/admin/agent/${handle}`);
}

function actionFor(from: string, to: string): string {
  if (to === "flagged") return "flag";
  if (to === "active") return from === "flagged" ? "unflag" : "restore";
  if (to === "suspended") return "suspend";
  if (to === "deleted") return "delete";
  return "change";
}
