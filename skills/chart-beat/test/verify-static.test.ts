/**
 * WHAT A STATIC CHART CARRIES, after the render ladder has proved it exists.
 *
 * A static frame has no reveal, so most of what a scrolly earned cannot happen here. One thing can:
 * a dash. `stroke-dasharray` is this format's ordinary way to draw a reference rule, a median line or
 * a projection break — nine of them across the corpus — and the moment one of those is authored with
 * an offset, or the element carries `vector-effect: non-scaling-stroke`, the pattern is computed in a
 * space the path's own length does not live in. In a static frame that shows up as a rule drawn as
 * head, hole and tail rather than a line, and nothing else in this suite would say so.
 *
 * WHY IT READS SOURCE, and what that costs, are stated in `scripts/verify-static.mjs`'s own header:
 * a static beat's artifact is a PNG and an SVG, and the SVG has the marks — but the SVG only exists
 * for a beat that has been rendered, while the component exists for all of them. This reads the
 * component and the walking test asserts how MANY marks it found, so a reader that broke fails
 * instead of quietly passing.
 *
 * THE POPULATION, measured 2026-08-19: 17 beats declare `chart / static` in their own `BRIEF.md` and
 * carry 17 static components between them; 9 dashed marks in all — `T.REFERENCE_DASH`,
 * `MEDIAN_RULE.dash`, `T.AVERAGE_DASH`, `"3 3"`, `"2 2"` — every one a static decorative pattern,
 * and **none** carries a `strokeDashoffset` or a `vectorEffect`. A ratchet, not a repair.
 */
import { describe, expect, it } from "bun:test";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { marksFromSource, revealDashInScreenSpace } from "../scripts/verify-static.mjs";

const SKILL = resolve(import.meta.dirname, "..");
const TWIN = resolve(SKILL, "..", "..");
const PROOF = join(TWIN, "proof");

describe("a dash that measures its own path", () => {
  it("refuses it in screen space", () => {
    expect(
      revealDashInScreenSpace([
        { id: "rule", dasharray: "480", dashoffset: "240", vectorEffect: "non-scaling-stroke" },
      ]),
    ).toEqual(["rule"]);
  });

  it("refuses a normalised one — a declared pathLength IS a dash that measures", () => {
    expect(
      revealDashInScreenSpace([
        { id: "rule", dasharray: "1", dashoffset: "0", pathLength: "1", vectorEffect: "non-scaling-stroke" },
      ]),
    ).toEqual(["rule"]);
  });

  it("leaves the reference rules this format actually draws alone", () => {
    expect(
      revealDashInScreenSpace([
        { id: "reference", dasharray: "T.REFERENCE_DASH", dashoffset: "0", vectorEffect: null },
        { id: "median", dasharray: "3 3", dashoffset: "0", vectorEffect: "non-scaling-stroke" },
      ]),
    ).toEqual([]);
  });
});

describe("reading a static component's dashed marks", () => {
  it("reads the attribute form and defaults an absent offset to zero", () => {
    const marks = marksFromSource(`<line strokeDasharray={T.AVERAGE_DASH} />`, "Beat.tsx");
    expect(marks).toHaveLength(1);
    expect(marks[0].dasharray).toBe("T.AVERAGE_DASH");
    expect(marks[0].dashoffset).toBe("0");
  });

  it("reads the style-object form, last property included", () => {
    const marks = marksFromSource(
      `<path style={{ strokeDasharray: 1, strokeDashoffset: 1 - reached }} vectorEffect="non-scaling-stroke" />`,
      "Beat.tsx",
    );
    expect(marks[0].dashoffset).toBe("1 - reached");
    expect(revealDashInScreenSpace(marks)).toEqual(["Beat.tsx:1 path"]);
  });
});

/** Every beat that declares `chart / static` in its own brief, and its static components.
 *
 *  Read from `BRIEF.md` rather than imported from `scripts/matrix.mjs`, which computes the same
 *  thing: a skill's own test reaching into a repository-level script is a skill that no longer
 *  travels on its own. Tolerant on spacing and emphasis for the reason `matrix.mjs` records in its
 *  own comment — the corpus writes the label three ways and a stricter reader silently reported two
 *  real static beats as missing. */
function staticChartComponents(): string[] {
  const found: string[] = [join(SKILL, "assets", "ChartSeed.tsx")];
  for (const entry of readdirSync(PROOF, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const brief = join(PROOF, entry.name, "BRIEF.md");
    if (!existsSync(brief)) continue;
    const medium = (/\*\*Medium\s*\/\s*format:\*\*\s*([^.\n]+)/.exec(readFileSync(brief, "utf8"))?.[1] ?? "")
      .toLowerCase()
      .replace(/\*/g, "");
    if (!/chart/.test(medium) || !/static/.test(medium)) continue;
    for (const file of readdirSync(join(PROOF, entry.name)))
      if (/\.tsx$/.test(file) && !/Web\.tsx$|Video\.tsx$/.test(file))
        found.push(join(PROOF, entry.name, file));
  }
  return found;
}

describe("every static chart on disk draws its dashes in the path's own units", () => {
  it("should find no dash measuring itself under a non-scaling stroke", () => {
    const components = staticChartComponents();
    const offenders: string[] = [];
    let marks = 0;
    for (const file of components) {
      const found = marksFromSource(readFileSync(file, "utf8"), file.slice(TWIN.length + 1));
      marks += found.length;
      offenders.push(...revealDashInScreenSpace(found));
    }
    // Measured 2026-08-19: 18 components (17 beats plus this skill's seed), 9 dashed marks. The
    // floors sit under both and exist to catch a reader that broke, not to pin the corpus's size.
    expect(components.length).toBeGreaterThanOrEqual(15);
    expect(marks).toBeGreaterThanOrEqual(6);
    expect(offenders).toEqual([]);
  });
});
