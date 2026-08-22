/**
 * THE ONE COMMAND A PRODUCER RUNS, AGAINST A BEAT IN `stories/`.
 *
 * Every other walking test in this directory discovers its population under `proof/` — the skill's
 * own committed beats. A journalist's beat lives in `stories/<story>/beats/<beat>/`, outside that
 * walk, so four of this format's declared capabilities had never once run against one. This drives
 * `verify-web.mjs --file` at the delivered page of a REAL story — 7 585 rows of Ember renewables
 * data through Our World in Data, 211 marks — and reads its verdict back.
 *
 * Two things are asserted, and the second matters as much as the first: that each capability was
 * DRIVEN and named with its measurement, and that everything the run could not ask is named too.
 * The failure this replaces was not a red — it was sixty-three greens with nothing said about the
 * sixteen questions nobody asked.
 */
import { describe, expect, it, setDefaultTimeout } from "bun:test";
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { declaredDecisions } from "../scripts/detect-guard-wiring.mjs";
import { decisionsNotAsked } from "../scripts/verify-coverage.mjs";

const SKILL = resolve(import.meta.dirname, "..");
const TWIN = resolve(SKILL, "..", "..");
const BEAT = join(
  TWIN,
  "stories/real-ember-renewables-share/beats/1-where-your-country-sits/renders/where-your-country-sits.html",
);

setDefaultTimeout(900000);

async function verify(file: string) {
  const proc = Bun.spawn(
    [
      process.execPath,
      join(SKILL, "scripts", "verify-web.mjs"),
      "--file",
      file,
    ],
    {
      cwd: TWIN,
      stdout: "pipe",
      stderr: "pipe",
    },
  );
  const out = `${await new Response(proc.stdout).text()}${await new Response(proc.stderr).text()}`;
  return { exitCode: await proc.exited, out };
}

describe("verify-web against a beat that lives in stories/, not proof/", () => {
  it("should drive every capability this format promises, and print each measurement", async () => {
    expect(existsSync(BEAT)).toBe(true);
    const { exitCode, out } = await verify(BEAT);

    // The four that were reachable only from this directory's own `proof/` walk until this round.
    expect(out).toContain(
      "CAPABILITIES — what this format promises a reader, on this page",
    );
    expect(out).toMatch(
      /reachable-by-keyboard: Tab alone reaches every mark[\s\S]*?211\/211 reached by Tab/,
    );
    expect(out).toMatch(
      /degrades-without-javascript: the marks are there with the script gone[\s\S]*?211 marks with scripting on, 211 with it off/,
    );
    expect(out).toMatch(
      /weight-has-a-ceiling: the delivered file[\s\S]*?\d+ B against a \d+ B ceiling/,
    );
    expect(out).toContain("honours-reduced-motion");

    // And the two guards that used to answer about a directory rather than about this page.
    expect(out).toContain("rtl-runs-carry-their-direction");
    expect(out).toContain("labels-name-their-own-row");

    expect(out).toMatch(/\d+ checks passed, 0 failed/);
    expect(exitCode).toBe(0);
  });

  it("should name every declaration it could not put to this page, with the reason", async () => {
    const { out } = await verify(BEAT);
    expect(out).toContain(
      "NOT ASKED — declarations this run could not put to one delivered page",
    );

    const declared = declaredDecisions(SKILL).map((decision) => decision.name);
    const counted = /(\d+) of (\d+) declared decisions asked of this page/.exec(
      out,
    );
    expect(counted ? Number(counted[2]) : null).toBe(declared.length);

    // Whatever the run does not ask has to appear BY NAME with its argument attached — the
    // population being derived is what makes this an assertion rather than a restatement.
    const asked = Number(counted![1]);
    const unasked = declared.length - asked;
    const named = declared.filter((name) => out.includes(`  n/a   ${name} — `));
    expect(named.length).toBe(unasked);
    for (const { name, reason } of decisionsNotAsked(
      SKILL,
      declared.filter((d) => !named.includes(d)),
    )) {
      expect(reason).not.toBeNull();
      expect(out).toContain(`  n/a   ${name} — ${reason}`);
    }
  });

  it("should say which half of the right-to-left question it did not read", async () => {
    const { out } = await verify(BEAT);
    // The false REASON this replaces: `{"applies":false,"reason":"this beat drew no .svg"}` on a
    // page that is mostly SVG. The guard walks a directory for `.svg` FILES and this format writes
    // none, so it was handed the inline SVG the page actually draws — and the half of the page it
    // still does not judge, the words drawn in HTML over the geometry, is stated with its count.
    expect(out).not.toContain("this beat drew no .svg");
    expect(out).toMatch(
      /inline <svg> block\(s\) this page draws, written out as files for it/,
    );
    expect(out).toMatch(
      /right-to-left letter\(s\) this page draws in HTML over the geometry are laid out by the reader's browser and were not read by it/,
    );
  });
});
