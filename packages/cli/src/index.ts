import { Command } from "commander";
import { submitCommand } from "./commands/submit.js";
import { statusCommand } from "./commands/status.js";
import { doctorCommand } from "./commands/doctor.js";
import { resetCommand } from "./commands/reset.js";
import { linkGithubCommand } from "./commands/linkGithub.js";
import { getCliVersion } from "./api.js";

const program = new Command();

program
  .name("hermes-rank")
  .description(
    "Submit Hermes Agent achievements to the public leaderboard at hermes-rankings.com",
  )
  .version(getCliVersion());

program
  .command("submit")
  .description(
    "Read local Hermes achievements and upload them. Registers on first run.",
  )
  .option(
    "-s, --server <url>",
    "override leaderboard server URL (default: https://hermes-rankings.com)",
  )
  .action(submitCommand);

program
  .command("status")
  .description("Show registered handle, server, and last submission time.")
  .action(statusCommand);

program
  .command("doctor")
  .description(
    "Diagnose Hermes file paths, identity, and server reachability.",
  )
  .option("-s, --server <url>", "override leaderboard server URL")
  .action(doctorCommand);

program
  .command("link-github")
  .description(
    "Attach your GitHub account for the Verified ring + 10-point bonus.",
  )
  .option("-s, --server <url>", "override leaderboard server URL")
  .action(linkGithubCommand);

program
  .command("reset")
  .description("Wipe the local identity / API key. Requires confirmation.")
  .option("-y, --yes", "skip the confirmation prompt")
  .action(resetCommand);

program.parseAsync(process.argv).catch((err) => {
  console.error(err);
  process.exit(1);
});
