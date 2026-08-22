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
// `runExampleRunners` SPAWNS every one of them; `deadExampleRunners` and `swallowedExampleRunners`
// are the two decisions the sweep asserts on. A test that greps a runner for the argument it should
// be passing would have gone green on the day someone wrote the argument into a comment.
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
//
// AND THE THING IT COULD NOT SEE UNTIL 2026-08-22: A RUNNER THAT FAILS WITHOUT AN EXIT CODE.
// `deadExampleRunners` reads the exit code, and a runner can fail without one.
// `stories/heat-pump-adoption-across-europe/beats/1-the-gap-that-persists/render-web.mjs` ended
// `main().catch(console.error)`, so when `renderWeb` grew its required `language` argument that
// runner threw, PRINTED the throw, and exited 0 — and this sweep, written for exactly that format
// change, called it alive for as long as it had existed. The page it shipped carried `lang="fr"`
// against a storyboard recording `en` and no accessible table at all, on a format whose declared
// capability is `same-facts-without-the-picture`. A mechanism that cannot observe its own failure
// is the defect this file was written to close in other people's work; `swallowedExampleRunners`
// is the same reading turned on this one. It decides on the SHAPE of a printed throw — a stack
// frame — and not on the words "error" or "catch", which are legitimate output all over this tree.
//
// WHAT IT STILL CANNOT SEE, measured rather than assumed: a runner that catches its own failure and
// prints only the MESSAGE (`console.error("render failed:", error.message)`) prints no frame and
// exits 0, and is invisible to this decision exactly as it is to a grep for `.catch(console.error)`
// — one spelling of one idiom. The evidence a printed throw leaves is the stack; a runner that
// throws away its own stack leaves this sweep nothing to read, and the honest place to say so is
// here rather than in a verdict that would read as a clean bill of health.

import { existsSync, mkdirSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { spawn } from "node:child_process";

/** The capability this script carries, read by `scripts/guards.mjs` and checked against
 *  `doctrine/references/guard-catalogue.json` by `doctrine/test/guard-parity.test.ts`. */
export const GUARDS = ["deadExampleRunners", "swallowedExampleRunners"];

/** How long a runner is given to prove it got past its format's entrypoint. Measured, not chosen:
 *  the slowest death in the whole population was 250ms and the fastest complete render that is not
 *  trivially small was ~1.3s, so this is roughly a 16x margin over the thing it has to separate. */
const DEADLINE_MS = 4000;

/** How much of a runner's own stderr is kept — the TAIL of it, and that is the whole point. A
 *  runtime prints a stack when it unwinds one, which is last; a cap that kept the head would keep a
 *  runner's progress chatter and discard the evidence of the throw underneath it. Measured on the
 *  four shapes Bun prints for a caught-and-logged error: the longest was 751 bytes, so this is a
 *  ~5x margin over the thing it has to hold. */
const KEPT_STDERR = 4000;

/** A line a runtime prints while unwinding a stack: `at <name> (<file>:<line>:<col>)`, or the same
 *  with no name, or with a URL instead of a path. Measured under the runtime this sweep actually
 *  spawns rather than assumed — all four shapes Bun prints (a thrown Error object logged by
 *  `console.error`, a `TypeError` raised by the runtime, a logged `error.stack`, and a Node-style
 *  frame) indent the frame and end it at `:line:col`, optionally closed by a paren.
 *
 *  THREE THINGS IT DELIBERATELY REQUIRES, each of them narrowing a false positive rather than
 *  tidying: the line is INDENTED (prose on stderr starts at the margin); the location carries a
 *  path separator, so `at loadAndEvaluateModule (2:1)` alone is not a stack and a sentence ending
 *  in `(see 1:2)` is not either; and the frame ENDS the line, so a mention of a file:line inside a
 *  message does not read as a frame. Measured against the whole population on 2026-08-22: 67
 *  runners answered, and not one of them printed a single byte on stderr, so nothing that runs
 *  today is anywhere near this. */
const STACK_FRAME = /^[ \t]{2,}at (?:\S+ )*\(?[^\s()]*[/\\][^\s()]*:\d+(?::\d+)?\)?[ \t\r]*$/m;

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
 * measurement behind that. `exitCode` is what the runner returned when it returned on its own,
 * `refusal` is the one line a red names it by, and `stderr` is what the process actually wrote.
 */
export async function runExampleRunners(root, runners, scratchDir, spawnOne = spawnRunner) {
  const results = [];
  const queue = [...runners];
  const worker = async () => {
    for (let next = queue.shift(); next !== undefined; next = queue.shift())
      results.push(await spawnOne(root, next, join(scratchDir, next.replace(/[^a-zA-Z0-9]+/g, "_"))));
  };
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  // A RUNNER KILLED BY ITS NEIGHBOURS IS NOT A DEAD RUNNER (2026-08-22).
  //
  // Measured on the full corpus run: `proof/vidy-waterfall-germany-electricity-mix/render.mjs` came
  // back `exited 1: remotion still exited with 1`, and the same runner alone renders 314 frames and
  // exits 0. The sweep spawns 112 runners four at a time and several of them start a browser or a
  // rasteriser of their own; a Remotion still that loses that fight has not been left behind by a
  // format change, which is the only thing this sweep claims to measure.
  //
  // This is NOT "retry until green". The failing runner is asked ONCE more, alone, with nothing else
  // in flight — the same question without the interference that may have answered it — and the first
  // attempt is KEPT on the result as `firstAttempt`. A red that survives being asked alone is a real
  // red; a red that does not is a flake, and a flake reported is a flake somebody can fix. A guard
  // that goes red at random is a guard people learn to skip, which is the same silence as no guard.
  for (let i = 0; i < results.length; i += 1) {
    const first = results[i];
    if (first.timedOut || first.exitCode === 0) continue;
    const again = await spawnOne(
      root,
      first.runner,
      join(scratchDir, `${first.runner.replace(/[^a-zA-Z0-9]+/g, "_")}_alone`),
    );
    results[i] = { ...again, firstAttempt: first };
  }
  return results.sort((a, b) => a.runner.localeCompare(b.runner));
}

/**
 * The runners that failed in the crowd and passed alone — the sweep's own flakes, named.
 *
 * Reported rather than swallowed: `runExampleRunners` keeps a re-asked runner's first answer, and
 * this is what turns that record into something a reader sees. A sweep that quietly retried until it
 * went green would be hiding the one fact worth knowing about itself.
 */
export function flakyExampleRunners(results) {
  return results
    .filter((result) => result.firstAttempt && (result.timedOut || result.exitCode === 0))
    .map(
      (result) =>
        `${result.runner} failed in the crowd (exited ${result.firstAttempt.exitCode}: ${result.firstAttempt.refusal ?? result.firstAttempt.stderr ?? ""}) and passed when asked alone`,
    );
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
    .map((result) => `${result.runner} exited ${result.exitCode}: ${result.refusal}`);
}

/**
 * The second decision: a runner that ANSWERED, answered SUCCESSFULLY, and printed a throw doing it.
 *
 * `deadExampleRunners` above reads the exit code, and a runner can fail without one — see this
 * file's own header for the beat that shipped a French page against an English storyboard behind a
 * green sweep. A runner whose last line is `main().catch(console.error)` prints the failure and
 * exits 0, so the exit code says alive and the bytes it printed say otherwise. This reads the
 * bytes: an answered runner, a zero status, and a stack frame in what it wrote.
 *
 * A runner still alive at the deadline is not here, for the same reason it is not there — it was
 * KILLED rather than allowed to answer, and half of a killed process's output is not a verdict.
 */
export function swallowedExampleRunners(results) {
  return results
    .filter(
      (result) => !result.timedOut && result.exitCode === 0 && STACK_FRAME.test(result.stderr ?? ""),
    )
    .map((result) => `${result.runner} exited 0 after printing a throw: ${result.refusal}`);
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
      // TWO READINGS OF ONE STREAM, and the second one is the fix. `refusal` is the sentence a red
      // is worth reading — one `error:` line where the runner printed one. `stderr` is what the
      // process WROTE, kept because a decision about the shape of a printed throw cannot be taken
      // on a summary that has already dropped the stack: extracting the refusal and keeping only
      // that is precisely how the evidence used to be thrown away.
      const refusal = /error:.*/.exec(stderr);
      resolve({
        runner,
        exitCode,
        timedOut,
        refusal: (refusal ? refusal[0] : stderr.trim()).slice(0, 300),
        stderr: stderr.trim().slice(-KEPT_STDERR),
      });
    });
  });
}
