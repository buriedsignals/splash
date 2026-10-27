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
import { createRunRoot, stageStory } from "../src/run-root.ts";
import { scoreRun } from "./score.ts";

const CHECKOUT = resolve(import.meta.dirname, "..", "..");
const KEPT = join(homedir(), ".splash-harness", "kept-runs");

/**
 * @param seed a kept run whose storyboard to start from: its STORYBOARD.md, PALETTE.md, DIRECTION.md and beat data.json
 *             are laid into a freshly staged story, so the driver resumes at craft. The storyboard is most of a run's
 *             wall clock and none of a craft kit's measurement; a seeded run measures the kit in about a third of it.
 */
export async function evaluate(story: string, arm: string, out: string, variant = "", seed = "") {
  const tag = `${story}${variant ? `-${variant}` : ""}${seed ? "-seeded" : ""}-${arm}-${Date.now()}`;
  const root = join(homedir(), ".splash-harness", "runs", tag);
  const sheet = join(CHECKOUT, "harness-pi", "eval", "sheets", `${story}${variant ? `.${variant}` : ""}.json`);
  const t0 = Date.now();
  if (seed) {
    await createRunRoot({ checkout: CHECKOUT, dir: root });
    await stageStory({ root, checkout: CHECKOUT, slug: story });
    const storyDir = join(root, "stories", story);
    for (const f of ["STORYBOARD.md", "PALETTE.md", "DIRECTION.md", "SUBJECTS.md"]) if (existsSync(join(seed, f))) cpSync(join(seed, f), join(storyDir, f));
    // The beat's data.json is NOT laid in: its hashes name the seed's own freeze, so the analyst would refuse it as
    // stale; it rebuilds it from the staged source in under a second.
  }
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
    // The run's own log, live: a phase that stalls is visible while it happens, not at the end.
    { stdout: "pipe", stderr: Bun.file(join(homedir(), ".splash-harness", "runs", `${tag}.log`)) },
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
    for (const beat of readdirSync(beats).filter((b) => !b.startsWith("."))) {
      if (existsSync(join(beats, beat, "renders")))
        cpSync(join(beats, beat, "renders"), join(keep, "renders", beat), {
          recursive: true,
        });
      // What the model wrote and what it read, so a craft can be replayed against a changed kit.
      for (const f of ["beat.mjs", "data.json"])
        if (existsSync(join(beats, beat, f))) {
          mkdirSync(join(keep, "beats", beat), { recursive: true });
          cpSync(join(beats, beat, f), join(keep, "beats", beat, f));
        }
    }
  for (const f of ["STORYBOARD.md", "PALETTE.md", "DIRECTION.md", "SUBJECTS.md"])
    if (existsSync(join(root, "stories", story, f)))
      cpSync(join(root, "stories", story, f), join(keep, f));
  rmSync(root, { recursive: true, force: true });
  const line = {
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
  const variant = flag("variant", "")!;
  // Seeded runs: --seeds a,b (kept-run directories, one per story in --stories, same order).
  const seeds = (flag("seeds") ?? "").split(",").filter(Boolean);
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
    for (const [k, story] of stories.entries()) {
      const r = await evaluate(story, arm, out, variant, seeds[k] ?? "");
      console.log(
        `${story} ${arm}: ${r.phase} completed=${r.completed} headline=${r.faithful.headline} refusals=${r.gateRefusals} turns=${r.turns} ${r.wallSeconds}s ${JSON.stringify(r.phaseSeconds)}`,
      );
    }
}
