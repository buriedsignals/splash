/**
 * THE FORMAT'S CONTROL VERIFICATION KNEW ABOUT ONE CONTROL: THE FILTER IT BUILDS ITSELF.
 *
 * The real Ember beat ships a keyboard-operable search box that moves focus to a named country. It
 * is correctly not a filter — it hides nothing and narrows nothing — so it declares no
 * `props.filter`, and `checkControlAffordance` skipped the whole section: "this beat ships no
 * filter, so there is no control to reach or ring". Nothing checked that box's Tab reach, its focus
 * ring, its target size or its name. A beat whose control is a toggle, a selector or a scrubber was
 * verified as if it had none.
 *
 * And the filter checks themselves had rotted onto a vocabulary the format no longer renders:
 * `input[name=period]`, `#period-all`, `.seg[data-period]`. Run with no `--file` at all — the
 * invocation `SKILL.md` puts first — `verify-web.mjs` reported five false failures against its OWN
 * SEED and then died on `document.querySelector("#period-all").closest(...)`. This file's first
 * test is that crash, refused.
 */
import { describe, expect, it, setDefaultTimeout } from "bun:test";
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";

const SKILL = resolve(import.meta.dirname, "..");
const TWIN = resolve(SKILL, "..", "..");

setDefaultTimeout(900000);

async function verify(args: string[]) {
  const proc = Bun.spawn(
    [process.execPath, join(SKILL, "scripts", "verify-web.mjs"), ...args],
    {
      cwd: TWIN,
      stdout: "pipe",
      stderr: "pipe",
    },
  );
  const out = `${await new Response(proc.stdout).text()}${await new Response(proc.stderr).text()}`;
  return { exitCode: await proc.exited, out };
}

describe("the seed — the invocation SKILL.md puts first", () => {
  it("should run to a verdict instead of dying inside its own filter check", async () => {
    const { exitCode, out } = await verify([]);
    expect(out).not.toContain("TypeError");
    expect(out).not.toContain("period-all");
    // Read off the page rather than assumed: the option ids the format's own filter vocabulary
    // derives from the beat's declaration.
    expect(out).toMatch(
      /the filter is a real radio group[\s\S]*?chart-filter-all/,
    );
    expect(out).toMatch(/the default state is the unfiltered option/);
    expect(out).toMatch(/shows its own partial-view note/);
    expect(out).toMatch(/\d+ checks passed, 0 failed/);
    expect(exitCode).toBe(0);
  });

  it("should still hold the filter to its radio-group contract without naming a count", async () => {
    const { out } = await verify([]);
    expect(out).toMatch(
      /control: still native radios, at least two[\s\S]*?3 found/,
    );
    expect(out).toMatch(
      /control: Tab alone reaches the radio group[\s\S]*?focus landed on chart-filter-all/,
    );
    expect(out).toMatch(/control: ArrowRight moves the selection/);
  });
});

describe("a beat whose control is not a filter", () => {
  const EMBER = join(
    TWIN,
    "stories/real-ember-renewables-share/beats/1-where-your-country-sits/renders/where-your-country-sits.html",
  );

  it("should verify the search box the old check skipped past entirely", async () => {
    expect(existsSync(EMBER)).toBe(true);
    const { exitCode, out } = await verify(["--file", EMBER]);
    // Every one of the four things a control owes a reader with no pointer, on a control this
    // format did not build and knows nothing about.
    expect(out).toMatch(
      /the input#find-country\[search\] control carries its own name[\s\S]*?Find a country/,
    );
    expect(out).toMatch(
      /input#find-country\[search\][^\n]*is a 24px\+ target[\s\S]*?182x28/,
    );
    expect(out).toMatch(/Tab alone reaches input#find-country\[search\]/);
    expect(out).toMatch(
      /keyboard focus on input#find-country\[search\][^\n]*changes what is on screen[\s\S]*?different/,
    );
    expect(out).toMatch(/\d+ checks passed, 0 failed/);
    expect(exitCode).toBe(0);
  });

  it("should still say the filter-specific contract does not apply to it", async () => {
    const { out } = await verify(["--file", EMBER]);
    expect(out).toContain(
      "this beat ships no filter, so there is no control to reach or ring",
    );
  });
});
