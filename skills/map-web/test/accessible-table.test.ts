/**
 * THE SAME FACTS, FOR A READER WHO CANNOT SEE THE PICTURE.
 *
 * `map-web`'s own copy of `tableCarriesTheMarks` — held byte for byte against `chart-web`'s by
 * `splash/test/guard-copies-parity.test.ts`, since two formats confirming the same capability from
 * two different tables is exactly the drift that test exists to catch. These are the SAME five
 * cases `chart-web/test/accessible-table.test.ts` proves, over this skill's own import, so a copy
 * that drifted would be caught here even before the parity test ran.
 *
 * `same-facts-without-the-picture` is `carried` here (Task 6, 2026-08-20). Fix round 1 left it
 * `owed`: 2 of this format's 4 delivered pages (`mapgen-dot-web/dot-population.html`,
 * `mapgen-hexgrid-web/hex-grid.html`) still failed the widened fallback, because their own
 * `data-detail` strings carried words no table cell held — measured, not assumed, on both:
 * `dot-population`'s "people"/"dots" name the unit of a number that IS the whole content of its
 * column and appear nowhere else in the string, so `CountryTable`'s own Population/Dots-drawn cells
 * now carry them too ("2,411,658 people", not "2,411,658") — the table strictly gains a word, the
 * tooltip is untouched. `hex-grid`'s `cellDetail` carried a different shape of gap: "Rank N of 156"
 * named a GLOBAL CONSTANT (156, identical on all 156 rows, already stated once in the table's own
 * caption) plus the table's own "Rank" column header repeated as a word, and "earthquakes" repeated
 * "events" three words later in the same string (`densityClassLabel` already ends in it) — genuine
 * decoration, not a fact a reader loses by its absence, so `cellDetail` drops "of 156", "Rank" and
 * "earthquakes" rather than forcing three columns to repeat them 156 times each. The rank NUMBER
 * stays (as `#{rank}`, no letter to match): it is the one part of that phrase not already carried by
 * `count` and `classLabel`, and it is what keeps two cells of the same count and class from reading
 * identically to a reader tabbing between them.
 */
import { describe, expect, it } from "bun:test";
import { tableCarriesTheMarks } from "../scripts/detect-accessible-table.mjs";
import { discoverMapWebPages } from "../scripts/discover-pages.mjs";

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
    const found = tableCarriesTheMarks(
      `<svg><circle data-detail="M7.9 · 47 km E of Nara, Japan · 2011-03-11"/></svg><table><tr><td>47 km E of Nara, Japan</td><td>M7.9</td><td>2011-03-11</td></tr></table>`,
    );
    expect(found.missing).toEqual([]);
  });
});

describe("this format's own real pages, measured against the widened detector", () => {
  it("carries every mark's own fact on every delivered page — no owed pair left", () => {
    // DISCOVERED, not listed: this used to walk 4 hardcoded `mapgen-*-web` directories and never
    // opened `mapgen-choropleth-web` or this skill's own `output-proof/population.html` — 2 of the
    // format's 6 delivered pages the catalogue's `carried` claim was never actually measured against.
    //
    // NINE, not seven: `stress-ab-emigration-flows`'s `where-the-routes-lead` beat ships a
    // delivered page and its export copy, both genuinely new map-web pages (round six). The two
    // before them were `stress-f-housing-pressure`'s `housing-pressure-choropleth` (2026-08-20/21).
    // This count is an exact ratchet on purpose — the next beat is expected to redden it too,
    // bumped deliberately rather than widened into a floor. 10 -> 12 on 2026-08-23:
    // `stories/r8-map-web-japan-bear-casualties` landed its render and its export copy.
    const pages = discoverMapWebPages();
    expect(pages.length).toBe(12);
    const offenders: string[] = [];
    for (const page of pages) {
      const found = tableCarriesTheMarks(page.html);
      expect(found.marks).toBeGreaterThan(0);
      if (found.missing.length > 0)
        offenders.push(
          `${page.rel}: missing ${JSON.stringify(found.missing.slice(0, 3))}`,
        );
    }
    expect(offenders).toEqual([]);
  });
});
