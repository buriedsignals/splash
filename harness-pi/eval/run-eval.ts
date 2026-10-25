// The evaluation matrix (U9/U13): each story run end to end with the scripted journalist through the
// production CLI, scored from what it left on disk, one JSON line per run. The run root is removed
// afterwards (disk is tight); its sessions and final render are kept for failure analysis and data.
// Every arm uses the same journalist (classifier on the local server) and the same decoding as
// declared in its models file, so arms differ only by the model.
import {
  appendFileSync,
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  rmSync,
} from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { scoreRun } from "./score.ts";

const CHECKOUT = resolve(import.meta.dirname, "..", "..");
const KEPT = join(homedir(), ".splash-harness", "kept-runs");

export async function evaluate(story: string, arm: string, out: string) {
  const tag = `${story}-${arm}-${Date.now()}`;
  const root = join(homedir(), ".splash-harness", "runs", tag);
  const sheet = join(CHECKOUT, "harness-pi", "eval", "sheets", `${story}.json`);
  const t0 = Date.now();
  const child = Bun.spawn(
    [
      "bun",
      join(CHECKOUT, "harness-pi/src/cli.ts"),
      "run",
      "--slug",
      story,
      "--root",
      root,
      "--journalist",
      `scripted:${sheet}`,
      "--model",
      arm,
    ],
    { stdout: "pipe", stderr: "ignore" },
  );
  const report = await new Response(child.stdout).text();
  await child.exited;
  const score = await scoreRun(root, story);
  const keep = join(KEPT, tag);
  mkdirSync(keep, { recursive: true });
  if (existsSync(join(root, ".splash-harness")))
    cpSync(join(root, ".splash-harness"), keep, { recursive: true });
  const beats = join(root, "stories", story, "beats");
  if (existsSync(beats))
    for (const beat of readdirSync(beats).filter((b) => !b.startsWith(".")))
      if (existsSync(join(beats, beat, "renders")))
        cpSync(join(beats, beat, "renders"), join(keep, "renders", beat), {
          recursive: true,
        });
  for (const f of ["STORYBOARD.md"])
    if (existsSync(join(root, "stories", story, f)))
      cpSync(join(root, "stories", story, f), join(keep, f));
  rmSync(root, { recursive: true, force: true });
  const line = {
    story,
    arm,
    tag,
    wallSeconds: Math.round((Date.now() - t0) / 1000),
    report: report.trim().slice(0, 400),
    ...score,
    failures: score.failures.length,
    failurePoints: score.failures,
  };
  appendFileSync(out, `${JSON.stringify(line)}\n`);
  return line;
}

if (import.meta.main) {
  const args = process.argv.slice(2);
  const flag = (name: string, fallback?: string) => {
    const i = args.indexOf(`--${name}`);
    return i === -1 ? fallback : args[i + 1];
  };
  const stories = (flag("stories") ?? "").split(",").filter(Boolean);
  const arm = flag("arm", "stock")!;
  const times = Number(flag("times", "1"));
  if (!stories.length || arm.startsWith("teacher")) {
    console.error(
      "usage: bun harness-pi/eval/run-eval.ts --stories a,b [--arm stock] [--times 1]  (teacher runs go through eval/teacher.ts, which is spend-gated)",
    );
    process.exit(2);
  }
  const out = join(
    CHECKOUT,
    "harness-pi",
    "eval",
    "results",
    `${new Date().toISOString().slice(0, 10)}-${arm}.jsonl`,
  );
  mkdirSync(join(CHECKOUT, "harness-pi", "eval", "results"), {
    recursive: true,
  });
  for (let n = 0; n < times; n++)
    for (const story of stories) {
      const r = await evaluate(story, arm, out);
      console.log(
        `${story} ${arm}: ${r.phase} completed=${r.completed} headline=${r.faithful.headline} refusals=${r.gateRefusals} turns=${r.turns} ${r.wallSeconds}s`,
      );
    }
}
