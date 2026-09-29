/**
 * THE VERIFIER A JOURNALIST RUNS CATCHES AN ANNOTATION PRINTED OVER ANOTHER WORD (issue #78).
 *
 * Before this, the only measurement of annotation collision on a web page was the corpus guard
 * `skills/splash/test/web-annotation-clears-its-marks.test.ts`, which walks `proof/` — and a
 * journalist's own beat is never in `proof/`. Measured on 2026-09-29 against the unchanged verifier:
 * `proof/web-dumbbell-life-expectancy-gains/renders/creme.html` exited 0 (489 passed, 0 failed)
 * while the guard owed ten notes on it printed over other words at 375.
 *
 * So `scripts/verify-web.mjs` now runs `checkAnnotationsClear`, which imports the guard's own
 * measurement (`scripts/annotation-clearance.mjs`). Proven here by DRIVING the verifier, twice:
 *
 *   - on a FROZEN colliding page (tests/fixtures/web-colliding/: the dumbbell as committed before
 *     #78 fixed it), it must exit non-zero and its ANNOTATIONS section must FAIL on exactly the lines
 *     the guard reported for that page, word for word — one definition of "collides", one wording.
 *     Frozen because the corpus no longer holds a colliding page: the guard's OWED list is empty;
 *   - on a committed page the guard owes nothing for, and which draws notes (so the pass is not a
 *     page with nothing to measure), that section must be all `ok`, at all four widths.
 *
 * The clean page is checked against the guard's OWED list, which must not pin it.
 */
import { describe, it, expect, setDefaultTimeout } from "bun:test";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { ANNOTATION_VIEWPORTS } from "../scripts/annotation-clearance.mjs";

setDefaultTimeout(600_000);

const HERE = dirname(fileURLToPath(import.meta.url));
const SKILL = join(HERE, "..");
const ROOT = join(SKILL, "..", "..");
const VERIFIER = join(SKILL, "scripts", "verify-web.mjs");
const GUARD = join(ROOT, "skills", "splash", "test", "web-annotation-clears-its-marks.test.ts");

/** A committed page the guard owes nothing for, and that draws `.note`s for the check to measure. */
const CLEAN = "proof/web-population-pyramid-switzerland/renders/creme.html";

/** A page frozen from before #78, and what the guard reported for it then (paths rewritten). */
const COLLIDING = "tests/fixtures/web-colliding/dumbbell-creme.html";
const COLLIDING_EXPECTED = join(ROOT, "tests", "fixtures", "web-colliding", "dumbbell-creme.expected.txt");

/** Every line of the guard's `OWED` set, parsed out of its source as the string literals they are. */
function owedLines(): string[] {
  const source = readFileSync(GUARD, "utf8");
  const body = source.slice(source.indexOf("const OWED = new Set<string>(["));
  const block = body.slice(0, body.indexOf("]);"));
  return [...block.matchAll(/^\s*("proof\/.*"),\s*$/gm)].map((m) => JSON.parse(m[1]) as string);
}

function expectedFindings(): string[] {
  return readFileSync(COLLIDING_EXPECTED, "utf8").split("\n").filter(Boolean).sort();
}

function pageOf(line: string): string {
  return line.slice(0, line.indexOf(" @ "));
}

/** One run of the verifier, and the lines of its ANNOTATIONS section. */
function verify(file: string) {
  const run = spawnSync("bun", [VERIFIER, "--file", file], {
    cwd: ROOT,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
  const text = `${run.stdout ?? ""}${run.stderr ?? ""}`;
  const at = text.indexOf("\nANNOTATIONS — ");
  const section = at < 0 ? "" : text.slice(at).split(/\n\d+ checks passed/)[0];
  const lines = section.split("\n");
  return {
    status: run.status,
    text,
    ran: at >= 0,
    ok: lines.filter((l) => l.startsWith("  ok   ")).map((l) => l.slice(7)),
    fail: lines.filter((l) => l.startsWith("  FAIL ")).map((l) => l.slice(7)),
  };
}

describe("verify-web measures annotation clearance on the page it is given", () => {
  const owed = owedLines();

  it("should not owe anything for the clean page, and should have findings to expect (premise)", () => {
    expect(owed.filter((l) => pageOf(l) === CLEAN)).toEqual([]);
    // Ten on the frozen page. None would make the colliding test below vacuous.
    expect(expectedFindings().length).toBeGreaterThan(0);
  });

  it("should FAIL a colliding page on exactly the findings the guard reported for it, in its wording", () => {
    const expected = expectedFindings();
    const run = verify(COLLIDING);
    expect(run.ran).toBe(true);
    expect([...run.fail].sort()).toEqual(expected);
    expect(run.status).toBe(1);
  });

  it("should pass a clean page that draws notes, at every width, without skipping", () => {
    const run = verify(CLEAN);
    expect(run.ran).toBe(true);
    expect(run.fail).toEqual([]);
    expect(run.ok).toHaveLength(ANNOTATION_VIEWPORTS.length);
    // Something was measured: the pass is about this page's notes, not an empty page.
    for (const line of run.ok) expect(line).toMatch(/— [1-9]\d* drawn \.note measured$/);
  });
});
