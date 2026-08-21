// FINDING 16 (stress round four): A SKILL'S OWN EXAMPLE RUNNERS ARE CALLED, NEVER READ.
//
// `renderWeb` grew one required argument (`props.language`, round two's finding 1) and not one of
// the eighteen example runners committed beside a `chart-web` beat was migrated. `bun x` on each of
// them answered `runs=5 fails=18` — and the suite was green the whole time, because every test this
// format had exercised the SEED, and the seed's own props carry the new argument. `chart-web`'s own
// SKILL.md already warned about this exact failure from a previous occurrence ("the second build
// dropped the `layouts` argument without migrating the beats that passed it, and all fifteen stopped
// rendering ... for an hour and a half, with a green suite"). Twice is a mechanism, not an accident:
// nothing in this tree ever CALLED a committed runner.
//
// So this file is not a reader. `exampleRunnersFor` finds the runners a skill actually has, and
// `runExampleRunners` SPAWNS every one of them; `deadExampleRunners` is the decision the sweep
// asserts on. A test that greps a runner for the argument it should be passing would have gone
// green on the day someone wrote the argument into a comment.
//
// TWO THINGS THIS SWEEP DELIBERATELY DOES NOT DO, each measured rather than assumed:
//
//   · IT DOES NOT WAIT FOR A RENDER TO FINISH. Measured across the whole population on 2026-08-21:
//     every one of the 27 dead runners died within 250ms (import failure, or a refusal thrown by
//     the format's own entrypoint before any drawing starts), while a live static or video runner
//     takes 6s to several minutes. A runner still alive at the deadline has therefore reached its
//     format's entrypoint and gone past it, which is the thing this sweep exists to prove; it is
//     killed and reported as ANSWERED-BY-SURVIVING, never as a failure. The cost of waiting for
//     116 real renders is the reason no sweep existed at all, and a sweep nobody runs catches
//     nothing.
//   · IT DOES NOT WRITE INTO THE REPOSITORY. Every runner is handed a scratch directory, as the
//     positional argument and as `--out`. A runner with no `outDir` in its source cannot be aimed
//     anywhere and is left out of the population rather than allowed to rewrite a committed
//     artefact on every `bun test` (measured: `proof/palette-proof/render.mjs`, a colour probe that
//     hard-writes beside itself, is the only one in the tree).

import { existsSync, mkdirSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { spawn } from "node:child_process";

/** The capability this script carries, read by `scripts/guards.mjs` and checked against
 *  `doctrine/references/guard-catalogue.json` by `doctrine/test/guard-parity.test.ts`. */
export const GUARDS = ["deadExampleRunners"];

/** How long a runner is given to prove it got past its format's entrypoint. Measured, not chosen:
 *  the slowest death in the whole population was 250ms and the fastest complete render that is not
 *  trivially small was ~1.3s, so this is roughly a 16x margin over the thing it has to separate. */
const DEADLINE_MS = 4000;

/** How many runners are in flight at once. Four rather than one because the population is dominated
 *  by runners that survive to the deadline, and rather than eight because several of them spawn a
 *  rasteriser or a browser of their own. */
const CONCURRENCY = 4;

/** A committed example runner is a `render*.mjs` beside a beat — `render.mjs`, `render-web.mjs`,
 *  `render-still.mjs`, `render-map.mjs`, `render-video.mjs`. Deliberately NOT every `.mjs`: a
 *  beat directory also holds interaction scripts, geometry helpers and one-off probes, none of
 *  which is an entrypoint anybody is invited to run. */
const RUNNER_NAME = /^render[-a-z0-9]*\.mjs$/;

/** The directories a beat's own runner lives in. `proof/` is this repository's worked examples and
 *  `stories/` is real journalist work; both are material a change to a format has to keep alive. */
const RUNNER_ROOTS = ["proof", "stories"];

function everyFileUnder(dir, found) {
  if (!existsSync(dir)) return found;
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name.startsWith(".")) continue;
    const path = join(dir, name);
    if (statSync(path).isDirectory()) everyFileUnder(path, found);
    else found.push(path);
  }
  return found;
}

/**
 * Every committed example runner that calls the named skill, as paths relative to `root`.
 *
 * A runner CALLS a skill when its own source names that skill's `scripts/` directory or its
 * vendored `#shared/` copy — the two ways a beat is allowed to reach a format's machinery, and
 * the pair a rename of either would break together. A runner with no `outDir` in its source is
 * excluded and RETURNED SEPARATELY rather than silently dropped: it cannot be aimed at a scratch
 * directory, so calling it would rewrite a committed artefact, and a population that quietly
 * shrinks is how a sweep stops meaning anything.
 */
export function exampleRunnersFor(root, skill) {
  const called = [];
  const unaimable = [];
  for (const area of RUNNER_ROOTS)
    for (const path of everyFileUnder(join(root, area), [])) {
      if (!RUNNER_NAME.test(path.split(sep).pop())) continue;
      const source = readFileSync(path, "utf8");
      if (!source.includes(`skills/${skill}/scripts/`) && !source.includes(`#shared/${skill}/`))
        continue;
      (source.includes("outDir") ? called : unaimable).push(relative(root, path));
    }
  return { called: called.sort(), unaimable: unaimable.sort() };
}

/**
 * Spawns each runner with a scratch output directory and a deadline, and reports what happened.
 *
 * `timedOut` is not a failure and never becomes one — see this file's own header for the
 * measurement behind that. `exitCode` is what the runner returned when it returned on its own, and
 * `stderr` is kept so a red names the refusal rather than only the file.
 */
export async function runExampleRunners(root, runners, scratchDir, spawnOne = spawnRunner) {
  const results = [];
  const queue = [...runners];
  const worker = async () => {
    for (let next = queue.shift(); next !== undefined; next = queue.shift())
      results.push(await spawnOne(root, next, join(scratchDir, next.replace(/[^a-zA-Z0-9]+/g, "_"))));
  };
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  return results.sort((a, b) => a.runner.localeCompare(b.runner));
}

/**
 * The decision: a runner that ANSWERED, and answered with a failure.
 *
 * A runner still alive at the deadline is not here — it reached its format's entrypoint and went
 * past it into real work, which is the whole claim. A runner that exited non-zero on its own did
 * not: it is dead, and a format whose committed examples are dead has changed under them.
 */
export function deadExampleRunners(results) {
  return results
    .filter((result) => !result.timedOut && result.exitCode !== 0)
    .map((result) => `${result.runner} exited ${result.exitCode}: ${result.stderr}`);
}

/**
 * One runner, spawned. Split out from `runExampleRunners` so the decision above can be exercised
 * against results a test builds by hand, and so this — the only part that touches a process — is
 * the only part a caller has to substitute.
 */
export function spawnRunner(root, runner, outDir) {
  mkdirSync(outDir, { recursive: true });
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [join(root, runner), outDir, "--out", outDir], {
      cwd: root,
      stdio: ["ignore", "ignore", "pipe"],
    });
    let stderr = "";
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    let timedOut = false;
    const deadline = setTimeout(() => {
      timedOut = true;
      child.kill("SIGKILL");
    }, DEADLINE_MS);
    child.on("close", (exitCode) => {
      clearTimeout(deadline);
      const refusal = /error:.*/.exec(stderr);
      resolve({ runner, exitCode, timedOut, stderr: (refusal ? refusal[0] : stderr.trim()).slice(0, 300) });
    });
  });
}
