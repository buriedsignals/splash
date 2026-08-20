/**
 * THE SAME FACTS, FOR A READER WHO CANNOT SEE THE PICTURE.
 *
 * `map-web`'s own copy of `tableCarriesTheMarks` — held byte for byte against `chart-web`'s by
 * `splash/test/guard-copies-parity.test.ts`, since two formats confirming the same capability from
 * two different tables is exactly the drift that test exists to catch. These are the SAME five
 * cases `chart-web/test/accessible-table.test.ts` proves, over this skill's own import, so a copy
 * that drifted would be caught here even before the parity test ran.
 *
 * `same-facts-without-the-picture` is declared `owed` here, not `carried` (fix round 1, 2026-08-20):
 * 2 of this format's 4 delivered pages (`mapgen-dot-web/dot-population.html`,
 * `mapgen-hexgrid-web/hex-grid.html`) still fail even the widened fallback, because their own
 * `data-detail` strings carry descriptive WORDS ("people", "dots", "earthquakes") that never appear
 * literally in any table cell on any row — a genuine gap, not a shape difference the fallback can
 * close. Closing it means re-rendering those two beats, which this fix round was told not to do; no
 * walking assertion against the real delivered pages is written here for that reason — it would
 * either lie about the two known failures or hard-fail a suite this round is not meant to redden.
 */
import { describe, expect, it } from "bun:test";
import { tableCarriesTheMarks } from "../scripts/detect-accessible-table.mjs";

describe("an accessible table carries the marks' own values", () => {
  const page = (table: string) =>
    `<svg><circle data-detail="1950 · 68.9 years"/><circle data-detail="1951 · 68.7 years"/></svg>${table}`;

  it("accepts a table holding every fact the graphic announces", () => {
    const found = tableCarriesTheMarks(
      page(`<table><tr><td>1950 · 68.9 years</td></tr><tr><td>1951 · 68.7 years</td></tr></table>`),
    );
    expect(found.missing).toEqual([]);
    expect(found).toMatchObject({ rows: 2, marks: 2 });
  });

  it("refuses a table of the wrong facts as firmly as no table at all", () => {
    expect(tableCarriesTheMarks(page(`<table><tr><td>1066 · nothing</td></tr></table>`)).missing)
      .toEqual(["1950 · 68.9 years", "1951 · 68.7 years"]);
    expect(tableCarriesTheMarks(page("")).missing).toEqual([
      "1950 · 68.9 years",
      "1951 · 68.7 years",
    ]);
  });

  it("says nothing about a page whose marks announce nothing", () => {
    expect(tableCarriesTheMarks("<svg><path d='M0 0'/></svg>")).toMatchObject({ marks: 0 });
  });

  const quakePage = (table: string) =>
    `<svg><circle data-detail="M9.1 · 2011 Great Tohoku Earthquake, Japan · 2011-03-11"/></svg>${table}`;

  it("accepts a row that splits the same fact across typed columns — this format's own shape", () => {
    const found = tableCarriesTheMarks(
      quakePage(
        `<table><tr><th>2011 Great Tohoku Earthquake, Japan</th><td>M9.1</td><td>2011-03-11</td><td>Japan &amp; Kuril arc</td></tr></table>`,
      ),
    );
    expect(found.missing).toEqual([]);
  });

  it("refuses a row that shares only some of the value's own tokens", () => {
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
    const found = tableCarriesTheMarks(
      `<svg><circle data-detail="A · Canada"/></svg><table><tr><td>Canada, magnitude class A-band</td></tr></table>`,
    );
    expect(found.missing).toEqual(["A · Canada"]);
  });

  it("still accepts a one-character token bounded by something other than a hyphen", () => {
    const found = tableCarriesTheMarks(
      `<svg><circle data-detail="M7.9 · 47 km E of Nara, Japan · 2011-03-11"/></svg><table><tr><td>47 km E of Nara, Japan</td><td>M7.9</td><td>2011-03-11</td></tr></table>`,
    );
    expect(found.missing).toEqual([]);
  });
});

describe("this format's own real pages, measured against the widened detector", () => {
  it("carries the fact fully on the two beats whose value is a name/number/date split (unaffected by the still-owed pair)", async () => {
    const { readFileSync } = await import("node:fs");
    const { resolve } = await import("node:path");
    const SKILL = resolve(import.meta.dirname, "..");
    const TWIN = resolve(SKILL, "..", "..");
    const clean = [
      "proof/mapgen-symbol-web/quake-symbol.html",
      "proof/mapgen-locator-web/locator.html",
    ];
    for (const rel of clean) {
      const html = readFileSync(resolve(TWIN, rel), "utf8");
      const found = tableCarriesTheMarks(html);
      expect(found.marks).toBeGreaterThan(0);
      expect(found.missing).toEqual([]);
    }
  });
});
