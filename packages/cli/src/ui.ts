import chalk from "chalk";
import ora, { type Ora } from "ora";

export const c = {
  gold: chalk.hex("#ffbd38"),
  amber: chalk.hex("#ffac02"),
  bright: chalk.hex("#ffff89"),
  copper: chalk.hex("#b87333"),
  silver: chalk.hex("#c0c0c0"),
  diamond: chalk.hex("#a8e6f0"),
  olympian: chalk.hex("#ffff89"),
  muted: chalk.hex("#9b8e7c"),
  ok: chalk.green,
  err: chalk.red,
  bold: chalk.bold,
};

export function header(title: string) {
  console.log("");
  console.log(c.gold.bold(title.toUpperCase()));
  console.log(c.muted("─".repeat(Math.max(title.length, 28))));
}

export function kv(label: string, value: string | number) {
  console.log(`  ${c.muted(label.padEnd(14))} ${value}`);
}

export function info(msg: string) {
  console.log(`  ${c.muted("·")} ${msg}`);
}

export function success(msg: string) {
  console.log(`  ${c.ok("✓")} ${msg}`);
}

export function warn(msg: string) {
  console.log(`  ${c.amber("!")} ${msg}`);
}

export function fail(msg: string) {
  console.log(`  ${c.err("✗")} ${msg}`);
}

export function spinner(text: string): Ora {
  return ora({ text, color: "yellow" }).start();
}

export const TIER_COLOR = {
  copper: c.copper,
  silver: c.silver,
  gold: c.gold,
  diamond: c.diamond,
  olympian: c.olympian,
} as const;
