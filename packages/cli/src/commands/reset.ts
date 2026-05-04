import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { deleteIdentity, readIdentity } from "../identity.js";
import { c, fail, header, info, success, warn } from "../ui.js";

export async function resetCommand(opts: { yes?: boolean }) {
  header("Reset identity");
  const id = readIdentity();
  if (!id) {
    info("No identity to reset.");
    return;
  }
  warn(`This will delete the API key for ${c.gold(id.handle)} from this machine.`);
  info("Your agent + history on the server will not be affected.");
  info(
    "After reset, the next `hermes-rank submit` will register a NEW agent unless an admin reattaches your fingerprint.",
  );

  if (!opts.yes) {
    const rl = createInterface({ input: stdin, output: stdout });
    const answer = await rl.question(
      `\nType the handle "${id.handle}" to confirm: `,
    );
    rl.close();
    if (answer.trim() !== id.handle) {
      fail("Confirmation didn't match. Aborted.");
      process.exit(1);
    }
  }

  if (deleteIdentity()) {
    success("Identity deleted.");
  }
}
