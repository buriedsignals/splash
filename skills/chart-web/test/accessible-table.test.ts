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
import { join, resolve } from "node:path";
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
});

/** Every delivered `chart-web` page on disk — told apart from its `map-web` sibling (both live
 *  under `proof/`, both ship self-contained HTML with `data-detail` marks) by the one thing that
 *  cannot drift silently: which format's own `renderWeb` actually wrote the file. A story's own
 *  `render-web.mjs` runner imports it by path, so that import is read back off disk rather than
 *  guessed from a directory name. */
function chartWebArtifacts(): string[] {
  const found: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) walk(path);
      else if (entry.name.endsWith(".html")) {
        const source = readFileSync(path, "utf8");
        if (/data-step|step-panel/.test(source)) continue; // scrolly, not this format
        const dirHasChartWebImport = readdirSync(dir)
          .filter((name) => name.endsWith(".mjs"))
          .some((name) =>
            readFileSync(join(dir, name), "utf8").includes(
              "skills/chart-web/scripts/render-web.mjs",
            ),
          );
        if (dirHasChartWebImport) found.push(path);
      }
    }
  };
  if (existsSync(PROOF) && statSync(PROOF).isDirectory()) walk(PROOF);
  return found;
}

describe("every chart-web page on disk", () => {
  it("carries every mark's own fact in its accessible table", () => {
    const files = chartWebArtifacts();
    // Measured 2026-08-20: 18 delivered pages, from 3 marks (germany-bridge) to 300
    // (small-multiples-co2-per-capita). A count under this floor means the walk stopped finding
    // beats, not that the beats got better — the same shape as `verify-guards.test.ts`'s own floor.
    expect(files.length).toBeGreaterThanOrEqual(17);
    const offenders: string[] = [];
    for (const file of files) {
      const found = tableCarriesTheMarks(readFileSync(file, "utf8"));
      for (const value of found.missing)
        offenders.push(`${file.slice(TWIN.length + 1)}: missing "${value}"`);
    }
    expect(offenders).toEqual([]);
  });
});
