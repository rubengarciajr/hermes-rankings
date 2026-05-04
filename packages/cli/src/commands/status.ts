import { readIdentity } from "../identity.js";
import { c, fail, header, info, kv } from "../ui.js";

export async function statusCommand() {
  header("Status");
  const id = readIdentity();
  if (!id) {
    fail("Not registered yet.");
    info("Run `hermes-rank submit` to register.");
    process.exit(1);
  }
  kv("Handle", c.gold(id.handle));
  kv("Agent ID", id.agent_id);
  kv("Server", id.server_url);
  kv("Registered", new Date(id.registered_at).toLocaleString());
  if (id.last_submit_at) {
    kv("Last submit", new Date(id.last_submit_at).toLocaleString());
  } else {
    kv("Last submit", c.muted("never"));
  }
  console.log("");
  info(`Profile: ${id.server_url}/agent/${id.handle}`);
}
