/**
 * THE DESIGN BASE IS REACHABLE FROM THE SKILLS THAT PRODUCE A BEAT.
 *
 * THE DEFECT THIS EXISTS FOR, found by Rémy asking a question nobody had asked of the tree: *tous
 * les charts et maps ont-ils un skill pour être conçus, et sont-ils accessibles ?* Measured on
 * 2026-09-09: forty forms had a directed static beat, forty type sheets existed, and **no SKILL.md
 * mentioned the design base at all**. Worse, the base's readers lived only in `scripts/design-base/`,
 * which an installed Splash root never receives — so even a producer told to take a beat through a
 * filed direction had nothing to take it through.
 *
 * The base now ships at `shared/design-base/` (and into the root template beside it), and this file
 * is what keeps the three halves of the route honest:
 *
 *   1. the two producing skills SAY the base exists and name its entry points;
 *   2. every type sheet points at the directed beat that works its form, and that beat exists;
 *   3. the filed directions that ship are byte-identical to the records they were copied from.
 *
 * A route that exists in prose and not on disk is worse than no route: it sends a producer after a
 * module that is not there.
 */
import { describe, it, expect } from "bun:test";
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..", "..", "..");
const PRODUCERS = ["chart-beat", "map-beat"];
const SHIPPED = join(ROOT, "shared", "design-base");
const CANONICAL_DIRECTIONS = join(ROOT, "docs", "design-base", "directions");

describe("the design base ships", () => {
  it("should carry its readers and its filed directions under shared/", () => {
    for (const file of [
      "index.mjs",
      "read-direction.mjs",
      "resolve-families.mjs",
      "compose.mjs",
    ])
      expect([file, existsSync(join(SHIPPED, file))]).toEqual([file, true]);
    const directions = readdirSync(join(SHIPPED, "directions")).filter((f) =>
      f.endsWith(".md"),
    );
    expect(directions.length).toBeGreaterThanOrEqual(3);
  });

  /** The `.mjs` copies are held byte for byte by `carried-copies.test.ts`, which reads their
   *  `// twin/…` first line. A Markdown record has no such line and is invisible there, so the
   *  directions — the part a beat cannot render without — are compared here instead, in both the
   *  place a beat reads them from and the template an installed root is built out of. */
  const DIRECTION_COPIES = [
    join(SHIPPED, "directions"),
    join(
      ROOT,
      "skills",
      "splash",
      "assets",
      "root-template",
      "shared",
      "design-base",
      "directions",
    ),
  ];

  it("should ship directions byte-identical to the records they were copied from", () => {
    for (const name of readdirSync(CANONICAL_DIRECTIONS).filter((f) =>
      f.endsWith(".md"),
    )) {
      const canonical = readFileSync(join(CANONICAL_DIRECTIONS, name), "utf8");
      for (const dir of DIRECTION_COPIES) {
        const shipped = join(dir, name);
        expect([shipped, "shipped", existsSync(shipped)]).toEqual([
          shipped,
          "shipped",
          true,
        ]);
        expect([shipped, readFileSync(shipped, "utf8")]).toEqual([
          shipped,
          canonical,
        ]);
      }
    }
  });

  it("should reach a root the same way a beat does, through #shared", async () => {
    const base = await import("#shared/design-base/index.mjs");
    expect(typeof base.filedDirections).toBe("function");
    expect(typeof base.resolveDirectionFamilies).toBe("function");
    expect(typeof base.composeDirections).toBe("function");
    const filed = base.filedDirections();
    expect(filed.length).toBeGreaterThanOrEqual(3);
    for (const direction of filed) {
      expect(typeof direction.ground).toBe("string");
      expect(typeof direction.accent).toBe("string");
    }
  });
});

describe("the producing skills route a writer to it", () => {
  for (const skill of PRODUCERS)
    it(`${skill}/SKILL.md should name the base and its entry points`, () => {
      const text = readFileSync(
        join(ROOT, "skills", skill, "SKILL.md"),
        "utf8",
      );
      for (const needle of [
        "## The design base",
        "#shared/design-base/",
        "filedDirections()",
        "resolveDirectionFamilies",
        "composeDirections",
        "applicableTreatments",
        "renders in EVERY filed direction",
      ])
        expect([skill, needle, text.includes(needle)]).toEqual([
          skill,
          needle,
          true,
        ]);
    });
});

describe("every type sheet points at its own directed beat", () => {
  const sheets = PRODUCERS.flatMap((skill) => {
    const dir = join(ROOT, "skills", skill, "references", "types");
    return readdirSync(dir)
      .filter((f) => f.endsWith(".md") && f !== "README.md")
      .map((f) => ({ id: `${skill}/${f}`, path: join(dir, f) }));
  });

  it("should find the sheets at all (premise)", () => {
    // Thirty-two chart sheets and eight map sheets ship today; a roster under thirty means the
    // reader has stopped seeing one of the directories.
    expect(sheets.length).toBeGreaterThanOrEqual(30);
  });

  for (const sheet of sheets)
    it(`${sheet.id} should name a beat that exists on disk`, () => {
      const text = readFileSync(sheet.path, "utf8");
      // THE HEADING THE SHEETS ACTUALLY CARRY. This premise named `## The worked example in this
      // tree`, a heading no type sheet has ever had — `git log -S` over `references/types` returns
      // nothing for it — so all forty sheets failed on the premise and the three assertions under
      // it, the ones that say the named beat EXISTS and is DIRECTED, had never run once. The
      // section is `## Worked example`, written by `docs(static): … point type sheets at their
      // worked example's CODE`. Corrected here rather than relaxed: the premise still has to hold
      // for every sheet, and it is now a premise about the tree.
      expect([
        sheet.id,
        "has the section",
        text.includes("## Worked example"),
      ]).toEqual([sheet.id, "has the section", true]);
      const named = [...text.matchAll(/`(proof\/[a-z0-9-]+)`/g)].map(
        (m) => m[1],
      );
      expect([sheet.id, "names a beat", named.length > 0]).toEqual([
        sheet.id,
        "names a beat",
        true,
      ]);
      // Every beat a sheet names has to be on disk — a sheet pointing at a directory that is not
      // there is worse than one pointing nowhere.
      for (const beat of named)
        expect([sheet.id, beat, existsSync(join(ROOT, beat))]).toEqual([
          sheet.id,
          beat,
          true,
        ]);
      // And at least one of them is DIRECTED: `renders/` plural is where a beat that went through
      // the filed directions puts its plates, and it is what the worked example has to be. A sheet
      // may also name an older beat of the same form — `mapmore-flow-danube` writes to `render/` —
      // and naming it is useful; it is not the worked example.
      expect([
        sheet.id,
        "one of them is directed",
        named.some((beat) => existsSync(join(ROOT, beat, "renders"))),
      ]).toEqual([sheet.id, "one of them is directed", true]);
    });
});

/**
 * A FORM THAT WAS BUILT IS A FORM THE MENU OFFERS.
 *
 * THE DEFECT THIS EXISTS FOR, found by Rémy asking the sharper half of his own question: *is there
 * something we produced that the tool, when it runs, never proposes?* There was.
 * `map.contour-isoline` sat in the catalogue as `state: "proof-only"` with the reason *"Splash has
 * no shipped contour/isoline implementation"* — true when it was written, and false from the moment
 * `proof/static-contour-europe-distance` rendered. `visualCatalogueEntries` marks a proof-only
 * treatment unavailable in EVERY format, so a directed beat existed on disk and no journalist could
 * ever have been offered it.
 *
 * Nothing was wrong with the beat, the sheet, the catalogue's schema or any test: the catalogue's
 * claim about the world had simply stopped being true, and nothing compared it to the world. This
 * does.
 */
describe("a form with a directed beat is selectable", () => {
  const catalogue = JSON.parse(
    readFileSync(join(ROOT, "catalog", "visual-catalog.json"), "utf8"),
  );

  it("should find treatments to check (premise)", () => {
    expect(catalogue.treatments.length).toBeGreaterThanOrEqual(40);
  });

  for (const treatment of catalogue.treatments)
    it(`${treatment.id} should not be proof-only while its sheet names a rendered beat`, () => {
      const sheet = join(ROOT, "skills", treatment.reference);
      expect([treatment.id, "sheet exists", existsSync(sheet)]).toEqual([
        treatment.id,
        "sheet exists",
        true,
      ]);
      const named = [
        ...readFileSync(sheet, "utf8").matchAll(/`(proof\/[a-z0-9-]+)`/g),
      ].map((m) => m[1]);
      const directed = named.filter((beat) =>
        existsSync(join(ROOT, beat, "renders")),
      );
      if (directed.length === 0) return;
      expect([
        treatment.id,
        `has ${directed.length} directed beat(s)`,
        treatment.state,
      ]).toEqual([
        treatment.id,
        `has ${directed.length} directed beat(s)`,
        "selectable",
      ]);
    });
});
