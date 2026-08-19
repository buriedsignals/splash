/**
 * WHAT A CHART VIDEO CARRIES, after the render ladder has proved it exists.
 *
 * `render-video.mjs` proves a file was produced and that its LAST frame is a complete chart;
 * `splash/test/video-first-frame-not-empty.test.ts` proves the FIRST one is not blank and says in
 * its own header that "between the first frame and the last, nothing is mechanically checked by
 * anything". This is the first thing that looks in between.
 *
 * WHY IT READS SOURCE AND NOT A RENDERED DOM, stated up front because this tree's own rule is to
 * measure the rendered thing. A scrolly ships an HTML file: its marks exist, with computed styles, in
 * a page a browser can be pointed at. A chart video ships an **mp4 and PNGs** — artifacts with no
 * attributes in them at all. The only place a video beat's marks exist as marks is inside Remotion's
 * own render, and reaching in there means driving `remotion/Internals` (`Timeline` exports hooks and
 * no context object; the bundle's page speaks a private protocol to the renderer). A guard built on
 * another package's internals is brittle by construction, and a brittle guard is worse than a stated
 * limit. So this reads the beat's own component text, and the limit is named below.
 *
 * WHAT THAT COSTS, exactly: a dash assembled at runtime from values this file cannot see — a
 * `strokeDasharray` computed in a helper and spread in — is invisible here. Measured across the
 * corpus, every dash in all 25 video beats is written literally in the component, so the reader sees
 * all of them today; the day one is not, this guard goes quiet without saying so. That is the same
 * shape of gap `skill-md-matches-code.test.ts` names in its own header, and it is why the walking
 * test below asserts the COUNT of marks it found as well as the offenders: a reader that suddenly
 * finds nothing fails instead of passing.
 *
 * THE POPULATION THIS GUARD PROTECTS, measured 2026-08-19 across 25 video beats and the seed:
 *   18 carry a `strokeDasharray` — 22 marks in all, every one decorative (a reference rule, a drop
 *      line, a bracket), and the reader finds 22 of 22
 *    0 carry a `strokeDashoffset`
 *    0 carry a `vectorEffect`
 *   11 reveal a line with `drawnSoFar` — the path RE-GENERATED from a sliced point list
 *
 * The format has already answered the reveal problem better than the one that earned this guard:
 * `drawnSoFar` is geometric, so there is no dash to compute in the wrong space. Nothing here is being
 * fixed. This exists so that the first person who reaches for `strokeDashoffset` in a beat whose
 * camera scales — the natural move, and the one that cost six hours and five wrong diagnoses on a
 * map — is told at once instead of in six months.
 */
import { describe, expect, it } from "bun:test";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { marksFromSource, revealDashInScreenSpace } from "../scripts/verify-video.mjs";

const SKILL = resolve(import.meta.dirname, "..");
const TWIN = resolve(SKILL, "..", "..");
const PROOF = join(TWIN, "proof");

// A line reveal is this format's native mechanism: the path is dashed by its own length and the
// offset runs to zero across the build. Under `vector-effect: non-scaling-stroke` that pattern is
// measured in screen space, where the path's own length does not live, and it repeats — head, hole,
// tail. It cost a map beat months before anything measured it.
describe("a dash that measures its own path", () => {
  it("refuses it in screen space", () => {
    expect(
      revealDashInScreenSpace([
        { id: "line", dasharray: "820px", dashoffset: "410px", vectorEffect: "non-scaling-stroke" },
      ]),
    ).toEqual(["line"]);
  });

  it("refuses a normalised one just as firmly — a declared pathLength IS a dash that measures", () => {
    expect(
      revealDashInScreenSpace([
        { id: "route", dasharray: "1", dashoffset: "0", pathLength: "1", vectorEffect: "non-scaling-stroke" },
      ]),
    ).toEqual(["route"]);
  });

  it("leaves a decorative dash alone", () => {
    expect(
      revealDashInScreenSpace([
        { id: "grid", dasharray: "2px 4px", dashoffset: "0px", vectorEffect: "non-scaling-stroke" },
      ]),
    ).toEqual([]);
  });

  it("leaves a measuring dash alone when it is NOT in screen space", () => {
    expect(
      revealDashInScreenSpace([
        { id: "line", dasharray: "820", dashoffset: "410", vectorEffect: "none" },
      ]),
    ).toEqual([]);
  });
});

describe("reading a video beat's marks out of its own component", () => {
  it("finds a dashed element and the four attributes the decision needs", () => {
    const marks = marksFromSource(
      `<path d="M0 0" strokeDasharray={\`\${len} \${len}\`} strokeDashoffset={off} vectorEffect="non-scaling-stroke" pathLength={1} />`,
      "Beat.tsx",
    );
    expect(marks).toHaveLength(1);
    expect(marks[0].dasharray).toBe("`${len} ${len}`");
    expect(marks[0].dashoffset).toBe("off");
    expect(marks[0].vectorEffect).toBe("non-scaling-stroke");
    expect(marks[0].pathLength).toBe("1");
  });

  // A dash with no offset attribute at all is a static pattern. The DOM reader gets "0px" from a
  // computed style; here the attribute is simply absent, and reading that absence as "unknown" would
  // fail every decorative rule in the corpus.
  it("reads an absent offset as zero, not as unknown", () => {
    const marks = marksFromSource(
      `<line strokeDasharray="8 6" vectorEffect="non-scaling-stroke" />`,
      "Beat.tsx",
    );
    expect(marks[0].dashoffset).toBe("0");
    expect(revealDashInScreenSpace(marks)).toEqual([]);
  });

  it("names each mark by its file and line, so a failure points at one place", () => {
    const marks = marksFromSource(`<g>\n</g>\n<path strokeDasharray="4 4" />`, "Beat.tsx");
    expect(marks[0].id).toBe("Beat.tsx:3 path");
  });

  it("ignores an element with no dash at all", () => {
    expect(marksFromSource(`<path d="M0 0" stroke="#000" />`, "Beat.tsx")).toEqual([]);
  });
});

/** Every `*Video.tsx` this repository ships, the seed included. */
function videoComponents(): string[] {
  const found = [join(SKILL, "assets", "EmissionsVideo.tsx")];
  for (const entry of readdirSync(PROOF, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    for (const file of readdirSync(join(PROOF, entry.name)))
      if (/Video\.tsx$/.test(file)) found.push(join(PROOF, entry.name, file));
  }
  return found;
}

describe("every chart video on disk reveals in a space its own length lives in", () => {
  it("should find no dash measuring itself under a non-scaling stroke", () => {
    const offenders: string[] = [];
    let marks = 0;
    let files = 0;
    for (const file of videoComponents()) {
      files++;
      const found = marksFromSource(
        readFileSync(file, "utf8"),
        file.slice(TWIN.length + 1),
      );
      marks += found.length;
      offenders.push(...revealDashInScreenSpace(found));
    }
    // The reader going quiet must fail, not pass — see this file's header. Measured 2026-08-19: 26
    // components, 22 dashed marks, and the reader finds all 22 of the 22 literal `strokeDasharray`
    // occurrences in them (checked against a raw text count, file by file). The floors sit under
    // both and exist to catch a reader that broke, not to pin the corpus's size.
    expect(files).toBeGreaterThanOrEqual(20);
    expect(marks).toBeGreaterThanOrEqual(15);
    expect(offenders).toEqual([]);
  });
});
