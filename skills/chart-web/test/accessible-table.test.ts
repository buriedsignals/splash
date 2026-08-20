/**
 * THE SAME FACTS, FOR A READER WHO CANNOT SEE THE PICTURE.
 *
 * `map-web` ships this and `chart-web` does not, which is the asymmetry the trait model surfaced:
 * both `ship-standalone-html`, so both are reachable, and one of them owed it.
 *
 * A GREP WOULD PROVE NOTHING. `role="table"` in the source says a table element exists; it does not
 * say the table carries the beat's own numbers. This decides over the DELIVERED page, and it
 * compares the table's cells against the marks' own values, so a table of the wrong data fails
 * exactly as loudly as no table at all.
 */
import { describe, expect, it } from "bun:test";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { tableCarriesTheMarks } from "../scripts/detect-accessible-table.mjs";

const SKILL = resolve(import.meta.dirname, "..");
const TWIN = resolve(SKILL, "..", "..");
const PROOF = join(TWIN, "proof");

describe("an accessible table carries the marks' own values", () => {
  const page = (table: string) =>
    `<svg><circle data-detail="1950 · 68.9 years"/><circle data-detail="1951 · 68.7 years"/></svg>${table}`;

  it("accepts a table holding every fact the graphic announces", () => {
    const found = tableCarriesTheMarks(
      page(
        `<table><tr><td>1950 · 68.9 years</td></tr><tr><td>1951 · 68.7 years</td></tr></table>`,
      ),
    );
    expect(found.missing).toEqual([]);
    expect(found).toMatchObject({ rows: 2, marks: 2 });
  });

  it("refuses a table of the wrong facts as firmly as no table at all", () => {
    expect(
      tableCarriesTheMarks(
        page(`<table><tr><td>1066 · nothing</td></tr></table>`),
      ).missing,
    ).toEqual(["1950 · 68.9 years", "1951 · 68.7 years"]);
    expect(tableCarriesTheMarks(page("")).missing).toEqual([
      "1950 · 68.9 years",
      "1951 · 68.7 years",
    ]);
  });

  it("says nothing about a page whose marks announce nothing", () => {
    expect(tableCarriesTheMarks("<svg><path d='M0 0'/></svg>")).toMatchObject({
      marks: 0,
    });
  });

  // RULED 2026-08-20 (fix round 1): a capability states what a reader GETS, not how a table is
  // SHAPED. The exact-cell check above is the cheap primary path; these two prove the fallback it
  // was widened with, over `map-web`'s own real shape — a value split across typed columns
  // (<th>name</th><td>number</td><td>date</td>) rather than joined into one cell.
  const quakePage = (table: string) =>
    `<svg><circle data-detail="M9.1 · 2011 Great Tohoku Earthquake, Japan · 2011-03-11"/></svg>${table}`;

  it("accepts a row that splits the same fact across typed columns", () => {
    const found = tableCarriesTheMarks(
      quakePage(
        `<table><tr><th>2011 Great Tohoku Earthquake, Japan</th><td>M9.1</td><td>2011-03-11</td><td>Japan &amp; Kuril arc</td></tr></table>`,
      ),
    );
    expect(found.missing).toEqual([]);
  });

  it("refuses a row that shares only some of the value's own tokens", () => {
    // Same row, minus the magnitude cell: "M9" is never anywhere in this row's own text, so the
    // fact is not fully present in ANY single row — not even mostly present, refused.
    const found = tableCarriesTheMarks(
      quakePage(
        `<table><tr><th>2011 Great Tohoku Earthquake, Japan</th><td>2011-03-11</td></tr></table>`,
      ),
    );
    expect(found.missing).toEqual([
      "M9.1 · 2011 Great Tohoku Earthquake, Japan · 2011-03-11",
    ]);
  });

  // RULED AGAIN 2026-08-20 (fix round 1, adversarial cases from the review that found this): a
  // review found the first version of the fallback compared a token against the row's RAW TEXT
  // with `String.includes` — a plain substring test — so a short token matches inside an unrelated
  // longer one. Both cases below were measured, standalone, to be falsely ACCEPTED by that version.
  it("refuses a value whose own numeral is only a substring of an unrelated year", () => {
    const found = tableCarriesTheMarks(
      `<svg><circle data-detail="9 · Springfield"/></svg><table><tr><td>Springfield, pop. 1990</td></tr></table>`,
    );
    expect(found.missing).toEqual(["9 · Springfield"]);
  });

  it("refuses a value whose own letter is only half of an unrelated compound identifier", () => {
    // "A-band" tokenises to "A" and "band" under the SAME splitter used on the value — a plain set
    // of tokens cannot tell "A" apart from a token that only exists because a hyphenated compound
    // got torn in half, which is why a one-character token is held to a stricter, hyphen-aware
    // standalone check rather than plain set membership.
    const found = tableCarriesTheMarks(
      `<svg><circle data-detail="A · Canada"/></svg><table><tr><td>Canada, magnitude class A-band</td></tr></table>`,
    );
    expect(found.missing).toEqual(["A · Canada"]);
  });

  // RULED AGAIN 2026-08-20 (fix round 2, adversarial cases from the review that found this): the
  // hyphen-aware standalone check above still ACCEPTED the same defect the moment the compound used
  // a different glue character — the standalone check only ever excluded a hyphen from a valid
  // boundary, so a token torn from a compound by underscore, slash or a bare period still read as
  // "standalone". All three below were measured, standalone, to be falsely ACCEPTED before this fix.
  it("refuses a value whose own letter is only half of an underscore-joined compound identifier", () => {
    const found = tableCarriesTheMarks(
      `<svg><circle data-detail="A · Canada"/></svg><table><tr><td>Canada, magnitude class A_band</td></tr></table>`,
    );
    expect(found.missing).toEqual(["A · Canada"]);
  });

  it("refuses a value whose own letter is only half of a slash-joined compound identifier", () => {
    const found = tableCarriesTheMarks(
      `<svg><circle data-detail="A · Canada"/></svg><table><tr><td>Canada, magnitude class A/band</td></tr></table>`,
    );
    expect(found.missing).toEqual(["A · Canada"]);
  });

  it("refuses a value whose own letter is only half of a period-joined compound identifier", () => {
    const found = tableCarriesTheMarks(
      `<svg><circle data-detail="A · Canada"/></svg><table><tr><td>Canada, magnitude class A.band</td></tr></table>`,
    );
    expect(found.missing).toEqual(["A · Canada"]);
  });

  it("keeps a decimal or a thousands-grouped number whole rather than tearing it into single-digit tokens", () => {
    // Fixed at the source, fix round 2: the splitter used to tear "68.9" into "68"/"9" and
    // "83,287,273" into "83"/"287"/"273", manufacturing the one-character tokens the standalone
    // check above had to reason about in the first place. A row that spells the same numbers out
    // whole still carries them, and one that only has the torn pieces does not.
    const found = tableCarriesTheMarks(
      `<svg><circle data-detail="68.9 · pop. 83,287,273"/></svg><table><tr><td>68.9</td><td>pop. 83,287,273</td></tr></table>`,
    );
    expect(found.missing).toEqual([]);
    const refused = tableCarriesTheMarks(
      `<svg><circle data-detail="68.9 · pop. 83,287,273"/></svg><table><tr><td>68 point 9</td><td>pop. 83 million 287 thousand 273</td></tr></table>`,
    );
    expect(refused.missing).toEqual(["68.9 · pop. 83,287,273"]);
  });

  it("still accepts a one-character token bounded by something other than a hyphen", () => {
    // The same shape as the real quake beats: "9" in "M7.9" is bounded by a period, not a hyphen,
    // and a row that spells the same fact out with a period in the same place still carries it.
    const found = tableCarriesTheMarks(
      `<svg><circle data-detail="M7.9 · 47 km E of Nara, Japan · 2011-03-11"/></svg><table><tr><td>47 km E of Nara, Japan</td><td>M7.9</td><td>2011-03-11</td></tr></table>`,
    );
    expect(found.missing).toEqual([]);
  });
});

/** Whether SOME `.mjs` directly inside `dir` imports chart-web's own `render-web.mjs` by path —
 *  told apart from its `map-web` sibling (both live under `proof/`, both ship self-contained HTML
 *  with `data-detail` marks) by the one thing that cannot drift silently: which format's own
 *  `renderWeb` actually wrote the file. Checked against the page's OWN directory and its PARENT:
 *  a runner usually sits beside its own output (`proof/co2-suisse/render-web.mjs` next to
 *  `co2.html`) but not always — `proof/web-co2-ranking/render-web.mjs` writes one directory down,
 *  into `dist/co2-ranking.html` — and a same-directory-only check silently skipped that page
 *  (measured 2026-08-20, reproduced standalone: 17 files found, not 18). */
function importsChartWebRenderer(dir: string): boolean {
  if (!existsSync(dir) || !statSync(dir).isDirectory()) return false;
  return readdirSync(dir)
    .filter((name) => name.endsWith(".mjs"))
    .some((name) =>
      readFileSync(join(dir, name), "utf8").includes(
        "skills/chart-web/scripts/render-web.mjs",
      ),
    );
}

function chartWebArtifacts(): string[] {
  const found: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) walk(path);
      else if (entry.name.endsWith(".html")) {
        const source = readFileSync(path, "utf8");
        if (/data-step|step-panel/.test(source)) continue; // scrolly, not this format
        if (importsChartWebRenderer(dir) || importsChartWebRenderer(dirname(dir))) found.push(path);
      }
    }
  };
  if (existsSync(PROOF) && statSync(PROOF).isDirectory()) walk(PROOF);
  return found;
}

describe("every chart-web page on disk", () => {
  it("carries every mark's own fact in its accessible table", () => {
    const files = chartWebArtifacts();
    // Measured 2026-08-20 (recount after fixing the parent-directory lookup above): 18
    // delivered pages, from 3 marks (germany-bridge) to 300 (small-multiples-co2-per-capita). A
    // count under this floor means the walk stopped finding beats, not that the beats got better —
    // the same shape as `verify-guards.test.ts`'s own floor. Asserted exactly, not just a floor:
    // `webArtifacts()`-style walks are exactly the kind of check that silently drops a page (this
    // one did, on `web-co2-ranking`, until the parent-directory lookup was added), so a count that
    // creeps back down to 17 must fail loudly rather than still clear a `>= 17` floor. A 19th
    // delivered beat SHOULD turn this red — bump the number here (and its three siblings:
    // `keyboard-reach.test.ts`, `reduced-motion.test.ts`, `degrades-without-javascript.test.ts`)
    // rather than loosen it back to a floor.
    expect(files.length).toBe(18);
    const offenders: string[] = [];
    for (const file of files) {
      const found = tableCarriesTheMarks(readFileSync(file, "utf8"));
      // A zero-mark page passes vacuously otherwise — `found.missing` is empty because there is
      // nothing to be missing FROM, not because the table carries anything. Its sibling
      // `degrades-without-javascript.test.ts` already refuses `marksWithJs === 0` the same way.
      if (found.marks === 0)
        offenders.push(`${file.slice(TWIN.length + 1)}: 0 marks`);
      for (const value of found.missing)
        offenders.push(`${file.slice(TWIN.length + 1)}: missing "${value}"`);
    }
    expect(offenders).toEqual([]);
  });
});
