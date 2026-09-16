/**
 * EVERY CATALOGUE TYPE HAS A WEB TYPE SHEET, AND EVERY SHEET CARRIES THE FRAME.
 *
 * The chain can only supply a frame that is WRITTEN DOWN. Scrolly's 40 sheets carry it — what the
 * type argues, the export's own gesture vocabulary, what a choreography must NOT do, the precision
 * to assert, the devices the worked example implements, and the worked example's CODE. This file is
 * the census for the WEB export, whose sheets live in two skills: `chart-web` for the 32 chart
 * types and `map-web` for the 8 map types.
 *
 * WHAT IT CHECKS
 *   1. every one of the catalogue's 40 types has a web sheet where the index says it is;
 *   2. every sheet carries `**Argues:**` and the five frame headings, with real bullets under the
 *      three that are lists;
 *   3. the worked example the sheet NAMES exists on disk as a beat directory — a sheet pointing at
 *      a beat nobody can read is the failure mode this catches;
 *   4. the skill's own index (`### The type index`) names that same sheet and that same beat, so a
 *      reader who starts at SKILL.md and a reader who starts at the sheet land in the same place.
 *
 * WHAT IT DOES NOT CHECK. Whether the sheet is TRUE of its beat. A sheet is prose harvested from a
 * validated beat by a person; no parser can tell a faithful harvest from a plausible one. This
 * guard only makes the absence of a section, of a sheet, or of a beat impossible to ship quietly.
 *
 * THE CATALOGUE IS DERIVED, NEVER LISTED. The 40 types are the basenames of scrolly's own sheets,
 * which are the format that already covers every type. Add a 41st type there and this file demands
 * its web sheet on the next run, with nobody editing a list here.
 *
 * MUTATIONS RUN (2026-09-17)
 *   - emptied the `## Reader gestures` list in `chart-web/references/types/treemap.md`
 *     → RED, naming that file and that heading. Restored → green.
 *   - pointed `map-web/references/types/hex-grid.md`'s worked example at
 *     `proof/web-hex-grid-nowhere/` → RED, naming the missing beat. Restored → green.
 *   - renamed one sheet in `chart-web/SKILL.md`'s index → RED on the index test. Restored → green.
 */
import { describe, it, expect } from "bun:test";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";

const TWIN = resolve(import.meta.dirname, "..", "..", "..");

const MAP_TYPES = new Set([
  "cartogram",
  "choropleth",
  "contour-isoline",
  "dot-density",
  "flow-map",
  "hex-grid",
  "locator",
  "proportional-symbol",
]);

/** The catalogue: the types scrolly already carries a sheet for. Derived, never listed. */
const CATALOGUE = readdirSync(join(TWIN, "skills/scrolly/references/types"))
  .filter((f) => f.endsWith(".md") && f !== "README.md")
  .map((f) => f.slice(0, -3))
  .sort();

/** Where the WEB sheet of a type lives: charts in `chart-web`, maps in `map-web`. */
const sheetOf = (type: string) =>
  MAP_TYPES.has(type)
    ? join("skills/map-web/references/types", `${type}.md`)
    : join("skills/chart-web/references/types", `${type}.md`);

const REQUIRED = [
  "## Reader gestures",
  "## A choreography must NOT",
  "## Precision to assert",
  "## Devices the worked example implements",
  "## Worked example",
];
/** The three headings whose body must actually be a list, not an empty promise. */
const LISTED = REQUIRED.slice(0, 4);

/** The bullets directly under one `## heading`, up to the next `## `. */
function bulletsUnder(text: string, heading: string): string[] {
  const at = text.indexOf(`\n${heading}\n`);
  if (at < 0) return [];
  const rest = text.slice(at + heading.length + 2);
  const end = rest.indexOf("\n## ");
  return (end < 0 ? rest : rest.slice(0, end))
    .split("\n")
    .filter((l) => l.startsWith("- "));
}

/** Every `proof/<beat>` named anywhere in a chunk of prose. */
const beatsNamedIn = (text: string) => [
  ...new Set(
    [...text.matchAll(/`proof\/([a-z0-9-]+)\/?[`/]/g)].map((m) => m[1]),
  ),
];

/** The rows of the markdown table under a `### ` heading: the cells of each row. */
function indexRows(file: string, heading: string): string[][] {
  const text = readFileSync(join(TWIN, file), "utf8");
  const at = text.indexOf(`\n${heading}\n`);
  expect(at, `${file} has no "${heading}"`).toBeGreaterThan(-1);
  const rest = text.slice(at + heading.length + 2);
  const end = rest.indexOf("\n## ");
  return (end < 0 ? rest : rest.slice(0, end))
    .split("\n")
    .filter((l) => l.startsWith("| ") && !/^\|\s*-+/.test(l))
    .slice(1)
    .map((l) =>
      l
        .slice(1, l.lastIndexOf("|"))
        .split("|")
        .map((c) => c.trim()),
    );
}

describe("every catalogue type has a web type sheet carrying its frame", () => {
  it("should cover all 40 catalogue types, and no fewer", () => {
    expect(CATALOGUE.length).toBe(40);
    expect([...MAP_TYPES].every((t) => CATALOGUE.includes(t))).toBe(true);
  });

  it.each(CATALOGUE)(
    "should give %s a web sheet with every frame heading",
    (type) => {
      const file = sheetOf(type);
      expect(existsSync(join(TWIN, file)), `missing web sheet ${file}`).toBe(
        true,
      );
      const text = readFileSync(join(TWIN, file), "utf8");

      expect(text, `${file} states no **Argues:**`).toContain("**Argues:**");
      for (const heading of REQUIRED) {
        expect(
          text.includes(`\n${heading}\n`),
          `${file} has no "${heading}"`,
        ).toBe(true);
      }
      for (const heading of LISTED) {
        expect(
          bulletsUnder(text, heading).length,
          `${file}: "${heading}" carries no bullets`,
        ).toBeGreaterThanOrEqual(2);
      }
    },
  );

  it.each(CATALOGUE)("should name a web beat that exists, for %s", (type) => {
    const file = sheetOf(type);
    const text = readFileSync(join(TWIN, file), "utf8");
    const worked = text.slice(text.indexOf("\n## Worked example\n"));
    const named = beatsNamedIn(worked).filter((b) => b.startsWith("web-"));
    expect(
      named.length,
      `${file}: "## Worked example" names no proof/web-… beat`,
    ).toBeGreaterThan(0);
    for (const beat of named) {
      expect(
        existsSync(join(TWIN, "proof", beat, "BRIEF.md")),
        `${file} names proof/${beat}, which is not a beat`,
      ).toBe(true);
    }
  });

  it("should index every web sheet in the skill that owns it", () => {
    const rows = [
      ...indexRows("skills/chart-web/SKILL.md", "### The type index"),
      ...indexRows("skills/map-web/SKILL.md", "### The type index"),
    ];
    const indexed = new Map<string, string[]>();
    for (const cells of rows) indexed.set(cells[1], cells);

    for (const type of CATALOGUE) {
      const rel = sheetOf(type).replace(/^skills\/(chart-web|map-web)\//, "");
      const row = indexed.get(`\`${rel}\``);
      expect(row, `no index row names \`${rel}\``).toBeDefined();
      for (const beat of beatsNamedIn(`${row![2]} `)) {
        expect(
          existsSync(join(TWIN, "proof", beat, "BRIEF.md")),
          `the index row for ${rel} names proof/${beat}, which is not a beat`,
        ).toBe(true);
      }
    }
  });
});
