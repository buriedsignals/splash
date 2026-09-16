/**
 * THE VERIFIER MUST SEE EVERY CONTROL, AND A CONTROL IT CANNOT SEE MUST BE A RED.
 *
 * What this file exists to stop coming back, measured rather than feared. `scripts/verify-web.mjs`
 * used to key its whole control surface on `fieldset.chart-filter` plus the ids `#period-all` /
 * `#period-early` / `#period-late`, which belonged to a seed that had not existed for a long time.
 * Two things followed, and both were measured the day this file was written:
 *
 *   1. the verifier CRASHED on the skill's own seed (`null.closest`, because the seed's control is
 *      `name="chart-filter"` and the checks read `input[name=period]:checked`), so nothing had
 *      exercised that path in a long time; and
 *   2. on all 44 committed web beats that ship a control, the control surface was SKIPPED and the
 *      runner still exited 0 — `proof/web-heatmap-coal-share-europe` reported
 *      `99 passed, 0 failed, 5 skipped` with its whole cutoff control unverified. A dead control
 *      shipped green.
 *
 * The defect was never the selector: it was the SKIP. A check that announces "this beat's own shape
 * does not have this" when what it means is "I do not know how to check this" converts an unknown
 * into a pass. So the assertions below are about the shape of the checker rather than only about a
 * string: the control path has no skip left in it, and it discovers controls from the page rather
 * than from a list this file would have to be edited to extend.
 *
 * The behaviour itself is proven by DRIVING the thing, not by reading it — `bun scripts/verify-web.mjs`
 * against this skill's own seed, then again against a copy of that same seed with one mechanism
 * deliberately cut. A guard that does not go red when the code is broken is not a guard, and this
 * repository has been bitten by exactly that three times.
 */
import { describe, it, expect, setDefaultTimeout } from "bun:test";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

setDefaultTimeout(600_000);

const HERE = dirname(fileURLToPath(import.meta.url));
const SKILL = join(HERE, "..");
const ROOT = join(SKILL, "..", "..");
const VERIFIER = join(SKILL, "scripts", "verify-web.mjs");
const source = readFileSync(VERIFIER, "utf8");
/** The verifier with its prose taken out. The file DELIBERATELY names the stale selectors in its
 *  header, because a rewrite that does not say what it replaced invites the replacement back; the
 *  assertions below are about what the file DOES, so they read the code and not the story. */
const code = source
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .split("\n")
  .filter((line) => !line.trim().startsWith("//"))
  .join("\n");

describe("the control surface is discovered, never enumerated", () => {
  it("should no longer key any check on the seed that stopped existing", () => {
    // `#period-*` and `input[name=period]` were the ids of a rainfall filter three builds ago. They
    // are what made the checker crash on its own seed and go quiet on every shipped beat.
    expect(code).not.toMatch(/name=period/);
    expect(code).not.toMatch(/#period-(all|early|late)/);
  });

  it("should find controls by <fieldset>, so a vocabulary nobody has written yet is still seen", () => {
    // The one discovery rule. A beat may write its own vocabulary — `proof/web-flow-map-danube`
    // ships `chart-measure`, which exists in no assets directory — and a verifier that enumerated
    // known stems would go quiet on exactly the beat nobody else checks.
    expect(code).toMatch(/querySelectorAll\("fieldset"\)/);
  });

  it("should never skip a control check", () => {
    // Every remaining `skip(` in the file, with the line it is on. None of them may be about a
    // control: "I do not know how to check this" is the defect being removed, and a beat that
    // simply ships no control is reported as a passing measurement instead.
    const skipped = code
      .split("\n")
      .map((line, i) => ({ line: line.trim(), n: i + 1 }))
      .filter((l) => /(^|\s)skip\(/.test(l.line));
    const aboutAControl = skipped.filter((l) =>
      /control|filter|fieldset|pill|option/i.test(
        code
          .split("\n")
          .slice(Math.max(0, l.n - 1), l.n + 4)
          .join(" "),
      ),
    );
    expect(aboutAControl.map((l) => `${l.n}: ${l.line}`)).toEqual([]);
  });

  it("should read the radio group's name, the option key and the notes attribute off the page", () => {
    // All three were measured to differ from the class stem on committed beats: `chart-restore`
    // ships `name="chart-stack"`, `proof/web-sankey-electricity-sources` ships radios with no
    // `value` at all, and `.carry-notes` holds `data-level-note`. Deriving any of them from the
    // stem would have gone quiet on the beats that differ.
    expect(code).toMatch(/getAttribute\("value"\)/);
    expect(code).toMatch(/\^data-\[a-z0-9-\]\+-note\$/);
    expect(code).toMatch(/Set\(radios\.map\(\(i\) => i\.name\)\)/);
  });

  it("should judge a control on what the page REPAINTS, not on what :checked says", () => {
    // A guard that reads values back out of the DOM proves the browser still implements radios.
    // The three assertions that matter are frame comparisons of the same rectangle.
    expect(code).toMatch(/repaints the drawing/);
    expect(code).toMatch(/is PAINTED as the chosen one/);
    expect(code).toMatch(/comparePixels/);
    // …and the comparison is over DECODED pixels against that rectangle's own measured jitter,
    // because two screenshots of an IDLE page are not byte-identical.
    expect(code).toMatch(/baselineOf/);
  });
});

/** One run of the verifier against one file. */
function verify(file: string) {
  const run = spawnSync("bun", [VERIFIER, "--file", file], {
    cwd: ROOT,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
  const text = `${run.stdout ?? ""}${run.stderr ?? ""}`;
  return {
    status: run.status,
    text,
    crashed: /^\s*(TypeError|ReferenceError|SyntaxError)\b/m.test(text),
    summary: (text.match(/^\d+ checks passed.*$/m) ?? [
      "(no summary — the run crashed)",
    ])[0],
    failures: (text.split("\nfailures:\n")[1] ?? "")
      .split("\n")
      .filter((l) => l.startsWith("  - "))
      .map((l) => l.slice(4)),
  };
}

describe("the verifier, driven against the seed and against a broken copy of it", () => {
  const dir = mkdtempSync(join(tmpdir(), "chart-web-control-"));

  it("should pass the seed, and report no skipped control", () => {
    const rendered = spawnSync("bun", [VERIFIER, "--out", dir], {
      cwd: ROOT,
      encoding: "utf8",
      maxBuffer: 64 * 1024 * 1024,
    });
    const text = `${rendered.stdout ?? ""}${rendered.stderr ?? ""}`;
    // It used to CRASH here — `null.closest`, on its own seed.
    expect(text).not.toMatch(/^\s*(TypeError|ReferenceError)\b/m);
    // The claim is not "the run is green": it is that nothing about the control was stepped over. A
    // run that verified nothing must not be able to look like a run that verified everything.
    expect(text).toMatch(/CONTROLS — every control this beat ships/);
    expect(text).not.toMatch(/skip .*(control|filter|pill|option)/i);
    // Green is asserted where it can honestly be asserted: the seed's control really is operable,
    // really repaints the drawing and really paints its chosen option. The seed is NOT asserted to
    // be defect-free — at the time this was written it failed `does not move the drawing`, because
    // its own `.filter-notes` reserves no height and choosing an option costs the plot 18px. That
    // is a finding about the seed, and pinning it green here would be pinning the defect.
    for (const claim of [
      /ok .*chart-filter: choosing "[^"]+" repaints the drawing/,
      /ok .*chart-filter: the "[^"]+" pill is PAINTED as the chosen one/,
      /ok .*chart-filter: Tab alone reaches the group/,
      /ok .*chart-filter: ArrowRight moves the selection/,
      /ok .*chart-filter: keyboard focus changes what is on screen/,
      /ok .*chart-filter: "[^"]+" draws its own sentence and nobody else's/,
    ])
      expect(text).toMatch(claim);
  });

  it("should go RED when the control is wired to nothing", () => {
    // THE MUTATION. The seed's own control keeps its fieldset, its legend, its radios, its pill
    // treatment and its keyboard — everything a markup assertion can see — and loses only the rules
    // that make choosing an option change the picture. This is the defect the old skip shipped
    // green: a dead control that looks perfect in the markup.
    const seed = join(dir, "rainfall.html");
    const html = readFileSync(seed, "utf8");
    const broken = html.replace(
      /\.chart-figure:has\(#chart-filter-[a-z0-9-]+:checked\)[^{]*\{[^}]*\}/g,
      "",
    );
    expect(broken).not.toBe(html); // the mutation must actually cut something
    const file = join(dir, "dead-control.html");
    writeFileSync(file, broken);

    const run = verify(file);
    // A mutation that CRASHES is not a mutation that was caught: the failure has to be a
    // measurement the runner printed, with both numbers beside it.
    expect(run.crashed).toBe(false);
    expect(run.status).toBe(1);
    expect(run.failures.some((f) => /repaints the drawing/.test(f))).toBe(true);
  });

  it("should go RED when nothing paints the chosen option", () => {
    // The second mutation, and the one a computed-style check cannot see: the wash, the ring and
    // the darkened words go, the radio still reports `:checked`, and a reader can no longer tell
    // which option they are looking at.
    const seed = join(dir, "rainfall.html");
    const html = readFileSync(seed, "utf8");
    const broken = html.replace(
      /\.chart-figure \.chart-filter label:has\(input:checked\) \{[^}]*\}/g,
      "",
    );
    expect(broken).not.toBe(html);
    const file = join(dir, "unpainted-pill.html");
    writeFileSync(file, broken);

    const run = verify(file);
    expect(run.crashed).toBe(false);
    expect(run.status).toBe(1);
    expect(
      run.failures.some((f) => /is PAINTED as the chosen one/.test(f)),
    ).toBe(true);
  });

  it("should go RED when a page styles a control it never draws", () => {
    // `assets/filter.ts` was written because 21 of 21 committed pages shipped `.chart-filter` CSS
    // and not one of them contained the fieldset. Dead machinery in every delivered file, and
    // nothing mechanical ever said so.
    const seed = join(dir, "rainfall.html");
    const html = readFileSync(seed, "utf8");
    const broken = html.replace(
      /<fieldset class="chart-filter"[\s\S]*?<\/fieldset>/,
      "",
    );
    expect(broken).not.toBe(html);
    const file = join(dir, "dead-chrome.html");
    writeFileSync(file, broken);

    const run = verify(file);
    expect(run.crashed).toBe(false);
    expect(run.status).toBe(1);
    expect(
      run.failures.some((f) => /dead machinery in a delivered file/.test(f)),
    ).toBe(true);
  });
});
