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
import {
  marksFromSource,
  neverArrives,
  rampsFromSource,
  revealDashInScreenSpace,
} from "../scripts/verify-video.mjs";

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

  // A reveal is written as a style object as often as it is written as attributes, and the LAST
  // property in that object is where a brace-balancing reader gets it wrong: it ran to the closing
  // `}` and returned `1 - reached }`, which parses as NaN and would have flagged a mark for the
  // wrong reason.
  it("reads the style-object form, including its last property", () => {
    const marks = marksFromSource(
      `<path style={{ strokeDasharray: 1, strokeDashoffset: 1 - reached }} vectorEffect="non-scaling-stroke" />`,
      "Beat.tsx",
    );
    expect(marks).toHaveLength(1);
    expect(marks[0].dasharray).toBe("1");
    expect(marks[0].dashoffset).toBe("1 - reached");
    expect(revealDashInScreenSpace(marks)).toEqual(["Beat.tsx:1 path"]);
  });

  // The RENDERED form of the same thing: kebab-case attributes, and a CSS string rather than a JSX
  // object. A web beat ships self-contained HTML, so this is the artifact its own guard reads.
  it("reads a rendered element, kebab-case attributes and a CSS style string alike", () => {
    const marks = marksFromSource(
      `<line x1="0" x2="760" stroke-dasharray="1" style="stroke-dashoffset:0.4;opacity:1" vector-effect="non-scaling-stroke"></line>`,
      "beat.html",
    );
    expect(marks).toHaveLength(1);
    expect(marks[0].dasharray).toBe("1");
    expect(marks[0].dashoffset).toBe("0.4");
    expect(marks[0].vectorEffect).toBe("non-scaling-stroke");
    expect(revealDashInScreenSpace(marks)).toEqual(["beat.html:1 line"]);
  });

  it("leaves a rendered gridline alone — the one this corpus is full of", () => {
    const marks = marksFromSource(
      `<line x1="0" x2="760" y1="400" y2="400" stroke="#616161" stroke-width="1" stroke-dasharray="4 4" vector-effect="non-scaling-stroke"></line>`,
      "beat.html",
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

/**
 * A REVEAL THAT ENDS WITH SOMETHING STILL ON ITS WAY.
 *
 * `scrolly` earned `reached-mark-declares` from stop badges that kept their pending fill while the
 * line arrived at each of them: the narrative got there and the picture never said so. It reads a
 * declaration — `data-state="pending"` flipped to `reached` — and no video component in this tree
 * declares one; measured 2026-08-20, 0 `data-state` in any of them. The OWNER's decision
 * (plan, Task 7) was not to import that vocabulary but to read the LAST FRAME, and this is what the
 * last frame is decidable from without a browser.
 *
 * A video beat signals arrival with opacity driven by a progress. `checkTiming` already guarantees
 * every NAMED event ends with the composition, so a named window cannot still be running at the end.
 * One level down it can: every `interpolate` in this corpus drives off an already-normalised
 * progress (measured: 178 ramps across 26 components — 160 with literal bounds, 18 computed,
 * 0 taking a raw frame), and a ramp
 * whose input range ends ABOVE 1 is driven by a value that is clamped at 1 and therefore never
 * reaches its own end. The mark it fades in is still fading when the reader's video stops.
 */
describe("a ramp that cannot finish", () => {
  it("refuses one whose input range ends past the progress that drives it", () => {
    expect(
      neverArrives([
        { id: "Beat.tsx:12 opacity", ceiling: 1.4, limit: 1 },
        { id: "Beat.tsx:20 opacity", ceiling: 1, limit: 1 },
      ]),
    ).toEqual(["Beat.tsx:12 opacity"]);
  });

  it("leaves a sub-range that closes early alone — an early finish is a choice, not a defect", () => {
    expect(neverArrives([{ id: "a", ceiling: 0.45, limit: 1 }])).toEqual([]);
  });

  it("says nothing about a ramp whose bounds it could not read", () => {
    expect(neverArrives([{ id: "a", ceiling: null, limit: 1 }])).toEqual([]);
  });

  it("measures a frame-driven ramp against the composition's own last frame", () => {
    expect(
      neverArrives([
        { id: "late", ceiling: 260, limit: 239 },
        { id: "fine", ceiling: 200, limit: 239 },
      ]),
    ).toEqual(["late"]);
  });
});

describe("reading a video beat's ramps out of its own component", () => {
  it("reads a normalised progress against 1, and names the ramp by file and line", () => {
    const ramps = rampsFromSource(
      `const o = interpolate(conclusion, [0.45, 1], [0, 1], { extrapolateRight: "clamp" });`,
      "Beat.tsx",
      { total: 240 },
    );
    expect(ramps).toEqual([
      { id: "Beat.tsx:1 interpolate(conclusion)", driver: "conclusion", ceiling: 1, limit: 1 },
    ]);
  });

  it("reads a frame-driven ramp against the last frame instead", () => {
    const ramps = rampsFromSource(`interpolate(frame, [0, 260], [0, 1])`, "Beat.tsx", {
      total: 240,
    });
    expect(ramps[0]).toMatchObject({ driver: "frame", ceiling: 260, limit: 239 });
  });

  it("keeps a ramp whose bounds are computed, with no ceiling to decide on", () => {
    const ramps = rampsFromSource(`interpolate(reveal, [w.start, w.end], [0, 1])`, "Beat.tsx", {
      total: 240,
    });
    expect(ramps[0]).toMatchObject({ driver: "reveal", ceiling: null });
  });

  it("ignores an interpolate that is not a ramp over time at all", () => {
    expect(rampsFromSource(`const x = 3;`, "Beat.tsx", { total: 240 })).toEqual([]);
  });
});

/** The composition length a beat's own timing records — the only place the last frame is written
 *  down. Two filenames, because the corpus has two: a chart video keeps its contract in
 *  `timing-contract.ts`, and a map video — whose vocabulary is a COPY of this one — keeps it in
 *  `timing.ts` beside the component. Both are read, in that order, and a component whose total
 *  cannot be found anywhere is REPORTED rather than silently skipped: seven of them were, on the
 *  first run of this sweep, and a sweep that skips a quarter of its subject proves nothing. */
function totalFrames(component: string): number | null {
  for (const name of ["timing-contract.ts", "timing.ts"]) {
    let source: string;
    try {
      source = readFileSync(join(component, "..", name), "utf8");
    } catch {
      continue;
    }
    const found = /\btotal:\s*(\d+)/.exec(source);
    if (found) return Number(found[1]);
  }
  return null;
}

describe("every chart video on disk ends with nothing still on its way", () => {
  it("should find no ramp whose input range outruns the progress driving it", () => {
    const offenders: string[] = [];
    const unreadable: string[] = [];
    let ramps = 0;
    let undecidable = 0;
    for (const file of videoComponents()) {
      const total = totalFrames(file);
      const where = file.slice(TWIN.length + 1);
      if (total === null) {
        unreadable.push(where);
        continue;
      }
      const found = rampsFromSource(readFileSync(file, "utf8"), where, { total });
      ramps += found.length;
      undecidable += found.filter((ramp) => ramp.ceiling === null).length;
      offenders.push(...neverArrives(found));
    }
    // Measured 2026-08-20 and asserted so a reader that goes quiet fails instead of passing: the
    // corpus's ramps, of which a handful have computed bounds this reader keeps and decides nothing
    // about. The floor sits under the measured count; it exists to catch a broken reader, not to pin
    // the corpus's size.
    // Measured 2026-08-20: 26 components, 178 ramps, 18 of them with computed bounds.
    expect(ramps).toBeGreaterThanOrEqual(150);
    expect(undecidable).toBeLessThan(ramps / 4);
    expect(unreadable).toEqual([]);
    expect(offenders).toEqual([]);
  });
});
