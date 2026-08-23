/**
 * WHAT A PROFILER DOES WITH A HEADER THAT NAMES NOTHING, AND WITH A FILE WHOSE HEADER IS NOT ITS
 * FIRST LINE.
 *
 * ── THE TWO FILES THAT EARNED THIS, both frozen in round eight and both left red on purpose ────
 *
 * 1. `stories/r8-chart-static-german-road-deaths-by-mode/source/data.csv`. Destatis exports a
 *    workbook whose used range overshoots its own table: 21 named columns followed by 16 carrying
 *    NO header and — measured — no value in any of the 327 rows. `freezeSource` accepted it and
 *    wrote a `profile.json` of **37 columns, the last sixteen named `""`** — sixteen
 *    indistinguishable columns in the record every later phase addresses BY NAME.
 *
 * 2. `stories/r8-scrolly-swiss-avalanche-deaths/source/data.csv`. The SLF publishes three banner
 *    lines above its header. `parseCsv` takes line 1 unconditionally, so the profile came back
 *    `rowCount: 1409`, **one** column named `"WSL Institute for Snow and Avalanche Research SLF"`,
 *    `missing: 0`, `duplicates: 0`, no warning, exit 0. The file has 21 columns and 1,406 rows.
 *
 * Both are the same defect: intake wrote a record that the bytes it had just read deny, and
 * observed nothing. The publisher's bytes are the publisher's bytes — neither file is touched. What
 * changes is that intake now READS the header rather than assuming it, and SAYS what it did.
 *
 * ── THE THREE RULINGS ─────────────────────────────────────────────────────────────────────────
 *
 * - A column the publisher did not name AND that holds no value is not a column: it is a used-range
 *   overshoot. It is dropped, and the drop is RECORDED with its indices — never silently.
 * - A column the publisher did not name that DOES hold values cannot be dropped and must not be
 *   called `""`. It is named by its position and the record says the name is this profiler's.
 * - A first row narrower than the body is not the header. The header is the first row as wide as
 *   the table itself; everything above it is a banner, kept verbatim in the record.
 *
 * What this refuses to do is GUESS. A file whose rows never agree on a width has no header this can
 * find, and `readHeader` says so rather than picking one.
 */
import { describe, expect, it } from "bun:test";
import { readHeader } from "../scripts/header.mjs";

describe("readHeader", () => {
  it("leaves an ordinary table exactly as it found it", () => {
    const found = readHeader([
      ["country", "year", "deaths"],
      ["CH", "2024", "12"],
    ]);
    expect(found.headerAt).toBe(0);
    expect(found.names).toEqual(["country", "year", "deaths"]);
    expect(found.banner).toEqual([]);
    expect(found.dropped).toEqual([]);
    expect(found.renamed).toEqual([]);
    expect(found.body.length).toBe(1);
  });

  it("drops a trailing column the publisher never named and that holds nothing, naming its index", () => {
    const found = readHeader([
      ["country", "deaths", "", ""],
      ["CH", "12", "", ""],
      ["AT", "9", "", ""],
    ]);
    expect(found.names).toEqual(["country", "deaths"]);
    expect(found.dropped).toEqual([
      { index: 2, says: "the publisher named no column here and no row carries a value in it" },
      { index: 3, says: "the publisher named no column here and no row carries a value in it" },
    ]);
    expect(found.body).toEqual([
      ["CH", "12"],
      ["AT", "9"],
    ]);
  });

  it("does NOT drop an unnamed column that carries values — it names it by its position and says so", () => {
    const found = readHeader([
      ["country", "deaths", ""],
      ["CH", "12", "7"],
    ]);
    expect(found.names).toEqual(["country", "deaths", "column 3"]);
    expect(found.dropped).toEqual([]);
    expect(found.renamed).toEqual([
      {
        index: 2,
        name: "column 3",
        says: "the publisher named no column here, and 1 of 1 rows carry a value in it, so it is named by its position and the name is this profiler's, not the publisher's",
      },
    ]);
  });

  it("finds a header under banner lines and keeps the banner verbatim", () => {
    const found = readHeader([
      ["WSL Institute for Snow and Avalanche Research SLF"],
      ["Fatal avalanche accidents in Switzerland since 1936-1937"],
      ["country", "year", "deaths"],
      ["CH", "1937", "12"],
      ["CH", "1938", "9"],
    ]);
    expect(found.headerAt).toBe(2);
    expect(found.names).toEqual(["country", "year", "deaths"]);
    expect(found.banner).toEqual([
      ["WSL Institute for Snow and Avalanche Research SLF"],
      ["Fatal avalanche accidents in Switzerland since 1936-1937"],
    ]);
    expect(found.body.length).toBe(2);
  });

  // A BANNER IS NOT A HEADER, AND A ONE-COLUMN TABLE IS NOT A BANNER. The width the header is
  // recognised by is the width MOST rows agree on, so a genuine single-column list keeps its own
  // header rather than being read as a banner over nothing.
  it("does not mistake a real one-column table for a banner", () => {
    const found = readHeader([["country"], ["CH"], ["AT"], ["DE"]]);
    expect(found.headerAt).toBe(0);
    expect(found.names).toEqual(["country"]);
    expect(found.banner).toEqual([]);
  });

  it("refuses to guess when no row is as wide as the table's own rows", () => {
    const found = readHeader([[""], [""], [""]]);
    expect(found.headerAt).toBe(null);
    expect(found.says).toMatch(/no header/i);
  });

  // THE DEFECT `splash/test/a-frozen-source-is-what-its-name-says.test.ts` WAS WRITTEN FOR, PUT TO
  // THE NEW READER. `stories/stress-h-site-photographs/source/data.csv` was a JSON document, and it
  // had been one since intake froze it, through five rounds and a delivered beat. That guard now
  // asks its question through `readHeader`, so it is only still a guard if a JSON document comes
  // back as something no table can be made of: ONE column named `{`.
  it("does not turn a JSON document into a table", () => {
    const json = JSON.stringify({ site: "A", photographs: [{ file: "a.jpg" }] }, null, 2);
    const rows = json.trim().split("\n").map((line) => line.split(","));
    const found = readHeader(rows);
    expect(found.names).toEqual(["{"]);
    expect(found.names.length).toBeLessThan(2);
  });

  // THE WHOLE POINT, STATED ONCE: a reading that changed the table must be able to say that it did.
  it("says nothing when it changed nothing, and says what it changed when it did", () => {
    expect(readHeader([["a", "b"], ["1", "2"]]).says).toBe(null);
    const moved = readHeader([["banner"], ["a", "b"], ["1", "2"]]);
    expect(moved.says).toContain("banner");
    expect(moved.says).toContain("line 2");
  });
});
