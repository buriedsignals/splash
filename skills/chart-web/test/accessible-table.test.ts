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
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { tableCarriesTheMarks } from "../scripts/detect-accessible-table.mjs";
import { deliveredPages } from "../scripts/delivered-pages.mjs";
import { RECORDED_PAGES, pagesThatLeftTheWalk } from "./delivered-pages-ratchet.ts";

const SKILL = resolve(import.meta.dirname, "..");
const TWIN = resolve(SKILL, "..", "..");

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

/** Every delivered `chart-web` page on disk, from EVERY root a beat can live in — not only
 *  `proof/`.
 *
 *  This walk used to start at `PROOF` and go no further, so the population it measured was the
 *  beats the SKILL wrote for itself and never a beat a journalist made. Six chart-web beats live
 *  under `stories/` today and not one of them had ever been put to any of these four capabilities.
 *  The very first run of the widened walk found one: a delivered page with no accessible table at
 *  all, 10 marks and 10 missing, which `proof/` could not see by construction.
 *
 *  `deliveredPages` (`scripts/delivered-pages.mjs`) is the derivation, shared by all four walks so
 *  a fifth cannot disagree with them about what a chart-web beat is. */
function chartWebArtifacts(): string[] {
  return deliveredPages(TWIN);
}

describe("every chart-web page on disk", () => {
  it("carries every mark's own fact in its accessible table", () => {
    const files = chartWebArtifacts();
    // A RATCHET OVER NAMES, NOT A COUNT. This walk once silently dropped a page (`web-co2-ranking`,
    // until the parent-directory lookup `deliveredPages` replaced), so a page LEAVING it must fail
    // loudly — but the `toBe(24)` this replaced could only say the total moved, stayed green on
    // one-in-one-out, and charged every shipped story a five-file edit indistinguishable from the
    // edit that papers the drop over. `RECORDED_PAGES` names the population instead: a page joins
    // freely and is measured by this loop from its first run, and one that leaves is named here.
    // Argued in full in `test/delivered-pages-ratchet.ts`.
    expect(pagesThatLeftTheWalk(RECORDED_PAGES, files, TWIN)).toEqual([]);
    const offenders: string[] = [];
    for (const file of files) {
      const shown = file.slice(TWIN.length + 1);
      const found = tableCarriesTheMarks(readFileSync(file, "utf8"));
      // A zero-mark page passes vacuously otherwise — `found.missing` is empty because there is
      // nothing to be missing FROM, not because the table carries anything. Its sibling
      // `degrades-without-javascript.test.ts` already refuses `marksWithJs === 0` the same way.
      if (found.marks === 0) offenders.push(`${shown}: 0 marks`);
      if (found.missing.length > 0)
        offenders.push(`${shown}: ${found.missing.length} of ${found.marks} marks missing from the table`);
    }
    expect(offenders).toEqual(WITHOUT_A_TABLE);
  });
});

/** THE ONE DELIVERED PAGE THIS WALK FOUND THE DAY IT WAS WIDENED PAST `proof/`, recorded by name
 *  rather than forgiven — a RATCHET, the same shape `detect-guard-wiring.mjs`'s own
 *  `RECORDED_UNWIRED` uses: a line may LEAVE this list, and a page that turns up failing and is not
 *  on it is a red.
 *
 *  Measured 2026-08-22 on the delivered page of `stories/heat-pump-adoption-across-europe`: 10
 *  marks carry a `data-detail`, the page contains no `<caption>` and no `<td>` at all, and all ten
 *  readings are missing. `same-facts-without-the-picture` is `carried` for chart-web, so a reader
 *  who cannot see that slopegraph gets none of its numbers. It shipped because this walk started at
 *  `proof/` and that beat is in `stories/` — the exact blindness this widening closes, caught on
 *  its first run.
 *
 *  It was recorded rather than forgiven, and then FIXED the same day (commit `22857ece`): that
 *  runner ended `main().catch(console.error)`, so when `renderWeb` grew its required `language`
 *  argument the runner threw, printed the throw and exited 0 — which is also why
 *  `deadExampleRunners` called it alive. Re-rendered, the page carries its table and declares the
 *  language its storyboard records, so the list is empty. It stays here as the ratchet: a page that
 *  turns up failing and is not on it is a red, and the empty list is the strongest form of that. */
const WITHOUT_A_TABLE: string[] = [];
