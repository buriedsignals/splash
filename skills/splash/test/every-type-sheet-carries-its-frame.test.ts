/**
 * EVERY CATALOGUE TYPE HAS A TYPE SHEET PER EXPORT, AND EVERY SHEET CARRIES THE FRAME.
 *
 * The chain can only supply a frame that is WRITTEN DOWN. Scrolly's 40 sheets carry it — what the
 * type argues, the export's own gesture vocabulary, what a choreography must NOT do, the precision
 * to assert, the devices the worked example implements, and the worked example's CODE. This file is
 * the census for the three other exports, one row of `EXPORTS` each. Each export's sheets live in
 * two places: a chart skill for the 32 chart types and a map directory for the 8 map types.
 *
 *   static — `chart-beat/references/types/`  + `map-beat/references/types/`
 *   web    — `chart-web/references/types/`   + `map-web/references/types/`
 *   video  — `chart-video/references/types/` + `map-beat/references/types/video/`
 *
 * WHAT IT CHECKS, PER EXPORT
 *   1. every one of the catalogue's 40 types has a sheet where the index says it is;
 *   2. every sheet carries `**Argues:**` and the five frame headings, with real bullets under the
 *      four that are lists;
 *   3. the worked example the sheet NAMES exists on disk as a beat directory of that export — a
 *      sheet pointing at a beat nobody can read is the failure mode this catches;
 *   4. the skill's own index names that same sheet and that same beat, so a reader who starts at
 *      SKILL.md and a reader who starts at the sheet land in the same place.
 *
 * WHAT IT DOES NOT CHECK. Whether the sheet is TRUE of its beat. A sheet is prose harvested from a
 * validated beat by a person; no parser can tell a faithful harvest from a plausible one. This
 * guard only makes the absence of a section, of a sheet, or of a beat impossible to ship quietly.
 *
 * NOTHING IS LISTED. The 40 types are the basenames of scrolly's own sheets, which are the format
 * that already covers every type; the map types are the basenames of map-beat's static sheets. Add
 * a 41st type there and this file demands its sheets on the next run, with nobody editing a list.
 *
 * MUTATIONS RUN (2026-09-17, when this was three files, one per export)
 *   - deleted the `## Reading stations` heading from `chart-beat/references/types/slope.md`
 *     → RED, naming that file and that heading. Restored → green.
 *   - pointed `map-beat/references/types/locator.md`'s worked example at
 *     `proof/static-locator-nowhere/` → RED, naming the missing beat. Restored → green.
 *   - renamed one sheet in `chart-beat/SKILL.md`'s index → RED on the index test. Restored → green.
 *   - emptied the `## Reader gestures` list in `chart-web/references/types/treemap.md`
 *     → RED, naming that file and that heading. Restored → green.
 *   - pointed `map-web/references/types/hex-grid.md`'s worked example at
 *     `proof/web-hex-grid-nowhere/` → RED, naming the missing beat. Restored → green.
 *   - renamed one sheet in `chart-web/SKILL.md`'s index → RED on the index test. Restored → green.
 *   - deleted the `## Precision to assert` heading from `chart-video/references/types/slope.md`
 *     → RED, naming that file and that heading. Restored → green.
 *   - pointed `map-beat/.../video/locator.md`'s worked example at `proof/video-locator-nowhere/`
 *     → RED, naming the missing beat. Restored → green.
 */
import { describe, it, expect } from "bun:test";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";

const TWIN = resolve(import.meta.dirname, "..", "..", "..");

/** The `.md` basenames of a sheet directory, README aside. Subdirectories are not sheets. */
const sheetsIn = (dir: string) =>
  readdirSync(join(TWIN, dir), { withFileTypes: true })
    .filter((e) => e.isFile() && e.name.endsWith(".md") && e.name !== "README.md")
    .map((e) => e.name.slice(0, -3))
    .sort();

/** The catalogue: the types scrolly already carries a sheet for. Derived, never listed. */
const CATALOGUE = sheetsIn("skills/scrolly/references/types");

/** The map types: the ones map-beat carries a static sheet for. Derived, never listed. */
const MAP_TYPES = new Set(sheetsIn("skills/map-beat/references/types"));

type Export = {
  name: "static" | "web" | "video";
  chartDir: string;
  mapDir: string;
  /** The export's own gesture heading, the first of the frame headings. */
  gestures: string;
  /** Whether a `proof/<beat>` named in a worked example is a beat of THIS export. */
  ownsBeat: (beat: string) => boolean;
  /** `[SKILL.md, "### heading"]` of every index that lists this export's sheets. */
  indexes: [string, string][];
};

const EXPORTS: Export[] = [
  {
    name: "static",
    chartDir: "skills/chart-beat/references/types",
    mapDir: "skills/map-beat/references/types",
    gestures: "## Reading stations",
    ownsBeat: (b) => !/^(video|web|scrolly)-/.test(b),
    indexes: [
      ["skills/chart-beat/SKILL.md", "### The type index"],
      ["skills/map-beat/SKILL.md", "### The type index (static)"],
    ],
  },
  {
    name: "web",
    chartDir: "skills/chart-web/references/types",
    mapDir: "skills/map-web/references/types",
    gestures: "## Reader gestures",
    ownsBeat: (b) => b.startsWith("web-"),
    indexes: [
      ["skills/chart-web/SKILL.md", "### The type index"],
      ["skills/map-web/SKILL.md", "### The type index"],
    ],
  },
  {
    name: "video",
    chartDir: "skills/chart-video/references/types",
    mapDir: "skills/map-beat/references/types/video",
    gestures: "## Shot gestures",
    ownsBeat: (b) => b.startsWith("video-"),
    indexes: [
      ["skills/chart-video/SKILL.md", "### The type index"],
      ["skills/map-beat/SKILL.md", "### The type index (video)"],
    ],
  },
];

/** Where an export's sheet of a type lives: charts in its chart skill, maps in its map directory. */
const sheetOf = (ex: Export, type: string) =>
  join(MAP_TYPES.has(type) ? ex.mapDir : ex.chartDir, `${type}.md`);

/** The frame headings; every one but `## Worked example` must actually be a list. */
const requiredOf = (ex: Export) => [
  ex.gestures,
  "## A choreography must NOT",
  "## Precision to assert",
  "## Devices the worked example implements",
  "## Worked example",
];

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

it("should derive all 40 catalogue types, 8 of them maps, and no fewer", () => {
  expect(CATALOGUE.length).toBe(40);
  expect(MAP_TYPES.size).toBe(8);
  expect([...MAP_TYPES].every((t) => CATALOGUE.includes(t))).toBe(true);
});

describe.each(EXPORTS)("every catalogue type has a $name type sheet carrying its frame", (ex) => {
  it.each(CATALOGUE)(
    `should give %s a ${ex.name} sheet with every frame heading`,
    (type) => {
      const file = sheetOf(ex, type);
      expect(existsSync(join(TWIN, file)), `missing ${ex.name} sheet ${file}`).toBe(
        true,
      );
      const text = readFileSync(join(TWIN, file), "utf8");

      expect(text, `${file} states no **Argues:**`).toContain("**Argues:**");
      const required = requiredOf(ex);
      for (const heading of required) {
        expect(
          text.includes(`\n${heading}\n`),
          `${file} has no "${heading}"`,
        ).toBe(true);
      }
      for (const heading of required.slice(0, 4)) {
        expect(
          bulletsUnder(text, heading).length,
          `${file}: "${heading}" carries no bullets`,
        ).toBeGreaterThanOrEqual(2);
      }
    },
  );

  it.each(CATALOGUE)(`should name a ${ex.name} beat that exists, for %s`, (type) => {
    const file = sheetOf(ex, type);
    const text = readFileSync(join(TWIN, file), "utf8");
    const worked = text.slice(text.indexOf("\n## Worked example\n"));
    const named = beatsNamedIn(worked).filter(ex.ownsBeat);
    expect(
      named.length,
      `${file}: "## Worked example" names no ${ex.name} proof/ beat`,
    ).toBeGreaterThan(0);
    for (const beat of named) {
      expect(
        existsSync(join(TWIN, "proof", beat, "BRIEF.md")),
        `${file} names proof/${beat}, which is not a beat`,
      ).toBe(true);
    }
  });

  it(`should index every ${ex.name} sheet in the skill that owns it`, () => {
    const rows = ex.indexes.flatMap(([file, heading]) => indexRows(file, heading));
    const indexed = new Map<string, string[]>();
    for (const cells of rows) indexed.set(cells[1], cells);

    for (const type of CATALOGUE) {
      const rel = sheetOf(ex, type).replace(/^skills\/[^/]+\//, "");
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
