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
 *   - on the committed page the guard owes the most findings for, it must exit non-zero and its
 *     ANNOTATIONS section must FAIL on exactly the lines the guard's `OWED` list pins for that page,
 *     word for word — one definition of "collides", one wording;
 *   - on a committed page the guard owes nothing for, and which draws notes (so the pass is not a
 *     page with nothing to measure), that section must be all `ok`, at all four widths.
 *
 * The expected lines are READ from the guard's source rather than copied here, so a page that is
 * fixed strikes its pin in one place and this file follows it.
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

/** Every line of the guard's `OWED` set, parsed out of its source as the string literals they are. */
function owedLines(): string[] {
  const source = readFileSync(GUARD, "utf8");
  const body = source.slice(source.indexOf("const OWED = new Set<string>(["));
  const block = body.slice(0, body.indexOf("]);"));
  return [...block.matchAll(/^\s*("proof\/.*"),\s*$/gm)].map((m) => JSON.parse(m[1]) as string);
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

  it("should read the guard's OWED set (premise)", () => {
    // 74 lines on 2026-09-29. A parse that finds none would make both tests below vacuous.
    expect(owed.length).toBeGreaterThan(0);
    expect(owed.filter((l) => pageOf(l) === CLEAN)).toEqual([]);
  });

  it("should FAIL a colliding page on exactly the findings the guard owes for it, in its wording", () => {
    const counts = new Map<string, number>();
    for (const line of owed) counts.set(pageOf(line), (counts.get(pageOf(line)) ?? 0) + 1);
    const [page] = [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0];
    const expected = owed.filter((l) => pageOf(l) === page).sort();

    const run = verify(page);
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
