// Entry point a router (or a person) calls: stage a story from the checkout's stories/ into a run
// root outside the checkout, drive it through Splash, print the outcome as JSON.
// Usage: bun harness-pi/src/cli.ts run --slug <story> [--root <dir>] [--journalist human|scripted:<sheet.json>] [--model <id>]
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { runStory } from "./driver.ts";
import { humanJournalist, scriptedJournalist } from "./journalist.ts";
import { createRunRoot, stageStory } from "./run-root.ts";

const CHECKOUT = resolve(import.meta.dirname, "..", "..");
const args = process.argv.slice(2);
const flag = (name: string, fallback?: string) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? fallback : args[i + 1];
};

if (args[0] !== "run" || !flag("slug")) {
  console.error("usage: bun harness-pi/src/cli.ts run --slug <story> [--root <dir>] [--journalist human|scripted:<sheet.json>] [--model <id>]");
  process.exit(2);
}
const slug = flag("slug")!;
const root = flag("root", join(homedir(), ".splash-harness", "runs", `${slug}-${Date.now()}`))!;
const who = flag("journalist", "human")!;
const journalist = who.startsWith("scripted:")
  ? scriptedJournalist(JSON.parse(readFileSync(who.slice("scripted:".length), "utf8")))
  : humanJournalist();

if (!existsSync(root)) await createRunRoot({ checkout: CHECKOUT, dir: root });
const storyDir = join(root, "stories", slug);
if (!existsSync(storyDir)) await stageStory({ root, checkout: CHECKOUT, slug });

const t0 = Date.now();
const report = await runStory({ root, storyDir, journalist, modelId: flag("model"), log: (l) => console.error(l.slice(0, 300)) });
const out = join(root, ".splash-harness", "report.json");
mkdirSync(join(root, ".splash-harness"), { recursive: true });
writeFileSync(out, JSON.stringify({ ...report, seconds: Math.round((Date.now() - t0) / 1000) }, null, 2));
console.log(JSON.stringify({ outcome: report.outcome, phase: report.phase, reason: report.reason, steps: report.steps, report: out }, null, 2));
