/**
 * A WEB BEAT'S OWN `const interaction`, PARSED AND CHECKED — ON A REAL BEAT, UNMODIFIED.
 *
 * The fixture is `proof/web-bar-top-emitters-2024/`, read off disk exactly as it ships: the
 * declaration in its own `render-directions-web.mjs`, and one delivered page. Nothing is written
 * for the test; what a reader may ask of a picture is authored per subject and only READ here.
 *
 * THE ASYMMETRY THIS FILE EXISTS TO MAKE VISIBLE. Scrolly and video treat an unlisted gesture as a
 * NOTE — their vocabularies are open, and the corpus extended them subject by subject (spec §2.2).
 * Web is the exception: the repertoire in `assets/interaction-plan.ts` is what the runner BUILDS,
 * so an atom outside it is a control nothing can ship — a violation. Both behaviours are asserted
 * below, in the same file, so the difference reads as deliberate rather than as an oversight.
 *
 * THREE CORRECTIONS TO THE PLAN, all found against the real corpus.
 *   1. The parser cannot import the module: `interaction` is a module-local const, and importing
 *      `render-directions-web.mjs` renders the beat at module scope. The declaration is cut out of
 *      the source by its own boundaries, and only the atom literals are read from it — never the
 *      sentences, which is why their interpolations cannot break it.
 *   2. This beat's second control is `toggle-a-comparison`, not `find-your-own-case`.
 *   3. `keyboard` and `degradesTo` are not in the declaration anywhere. They are properties of what
 *      was SHIPPED, so they are read off a delivered page — a beat cannot declare itself keyboard
 *      reachable.
 *
 * MUTATIONS RUN (2026-09-17)
 *   - invented a gesture in a copy of the fixture's declaration → RED on "should refuse a gesture
 *     outside the closed repertoire". Restored → green.
 *   - made `parseChoreography` return `degradesTo: "static-frame"` unconditionally → RED on "should
 *     refuse a page that leaves a script-less reader with no picture". Restored → green.
 *   - made `parsePrecision` count an on-demand reading as part of the JS-off floor → RED on "should
 *     refuse a requirement that only a hover answers". Restored → green.
 */
import { describe, it, expect } from "bun:test";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
// @ts-expect-error — the skill's scripts are ESM JavaScript, read from TypeScript tests.
import {
  parseChoreography,
  checkChoreography,
} from "../scripts/choreography.mjs";
// @ts-expect-error — same.
import { parsePrecision, checkPrecision } from "../scripts/precision.mjs";
// @ts-expect-error — the trunk.
import {
  parseTypeSheet,
  choreographyFrame,
} from "../../../shared/editorial/frame.mjs";

const TWIN = resolve(import.meta.dirname, "..", "..", "..");
const BEAT = join(TWIN, "proof", "web-bar-top-emitters-2024");
const brief = readFileSync(join(BEAT, "BRIEF.md"), "utf8");
const source = readFileSync(join(BEAT, "render-directions-web.mjs"), "utf8");
const html = readFileSync(join(BEAT, "renders", "creme.html"), "utf8");

const sheet = parseTypeSheet(
  readFileSync(
    join(TWIN, "skills/chart-web/references/types/bar-and-column.md"),
    "utf8",
  ),
);
const retained = {
  format: "web",
  type: "bar and column",
  size: null,
  interaction: { kind: "explore" },
  claim: { shape: "maximum", grounding: "supported" },
};
const frame = choreographyFrame(retained, sheet);
const declared = parseChoreography(brief, { source, html });

describe("the `const interaction` object, read out of the beat's own module", () => {
  it("should parse to the pointer shape, controls ordered, promise pinned elsewhere", () => {
    expect(declared).toEqual({
      kind: "pointer",
      promiseSource: "slot",
      keyboard: true,
      degradesTo: "static-frame",
      controls: [
        { order: 1, gesture: "ask-a-mark", input: "hover" },
        { order: 2, gesture: "toggle-a-comparison", input: "tap" },
      ],
    });
  });

  it("should keep every sentence out of the block", () => {
    expect(JSON.stringify(declared)).not.toMatch(/earns|question|changes|—/);
  });

  it("should refuse a module that declares no interaction rather than invent one", () => {
    expect(() =>
      parseChoreography(brief, { source: "const x = 1;\n", html }),
    ).toThrow(/declares no interaction/);
  });

  it("should refuse to guess what was shipped", () => {
    expect(() => parseChoreography(brief, { source })).toThrow(
      /needs one delivered page/,
    );
  });
});

describe("checkChoreography — a closed repertoire, an open sheet", () => {
  it("should report no violation for this beat's own declaration", () => {
    expect(
      checkChoreography(declared, frame).filter(
        (v: { severity: string }) => v.severity === "violation",
      ),
    ).toEqual([]);
  });

  it("should refuse a gesture outside the closed repertoire", () => {
    const invented = {
      ...declared,
      controls: [{ order: 1, gesture: "sparkle", input: "hover" }],
    };
    const hit = checkChoreography(invented, frame).find(
      (v: { id: string }) => v.id === "control-vocabulary",
    );
    expect(hit.severity).toBe("violation");
    expect(hit.says).toContain("CLOSED");
  });

  it("should report a repertoire gesture the type sheet has not recorded as a note", () => {
    const unlisted = {
      ...declared,
      controls: [{ order: 1, gesture: "open-the-full-table", input: "tap" }],
    };
    const notes = checkChoreography(unlisted, frame).filter(
      (v: { id: string }) => v.id === "vocabulary-addition",
    );
    expect(notes.map((v: { severity: string }) => v.severity)).toEqual([
      "note",
    ]);
  });

  it("should refuse a page that leaves a script-less reader with no picture", () => {
    const hit = checkChoreography(
      { ...declared, degradesTo: null },
      frame,
    ).find((v: { id: string }) => v.id === "degrades-to-static");
    expect(hit.severity).toBe("violation");
  });

  it("should refuse controls that are not ordered 1..n", () => {
    const jumbled = {
      ...declared,
      controls: [
        { order: 2, gesture: "ask-a-mark", input: "hover" },
        { order: 1, gesture: "toggle-a-comparison", input: "tap" },
      ],
    };
    expect(
      checkChoreography(jumbled, frame).map((v: { id: string }) => v.id),
    ).toContain("control-order");
  });

  it("should refuse a declaration with no control at all", () => {
    expect(
      checkChoreography({ ...declared, controls: [] }, frame).map(
        (v: { id: string }) => v.id,
      ),
    ).toContain("controls-declared");
  });

  it("should stay green on a different but legal set of controls", () => {
    const other = {
      ...declared,
      controls: [
        { order: 1, gesture: "find-your-own-case", input: "hover" },
        { order: 2, gesture: "open-the-full-table", input: "tap" },
        { order: 3, gesture: "filter-to-a-subset", input: "tap" },
      ],
    };
    expect(
      checkChoreography(other, frame).filter(
        (v: { severity: string }) => v.severity === "violation",
      ),
    ).toEqual([]);
  });
});

describe("precision — the JS-off floor, and what only a hover answers", () => {
  const precision = parsePrecision(brief, {
    html,
    rounding: { unit: "Gt", digits: 1 },
    declares: {
      "china-2024": "12,2",
      "china-world-share": "31,8",
    },
  });

  it("should put a reading the page prints at rest in the floor", () => {
    expect(precision.staticFloor).toEqual(["china-2024"]);
  });

  it("should put a reading only an answer carries on demand", () => {
    expect(precision.onDemand).toEqual(["china-world-share"]);
    expect(precision.unfound).toEqual([]);
  });

  it("should differ in shape from video's and scrolly's", () => {
    expect(Object.keys(precision).sort()).toEqual([
      "asserts",
      "kind",
      "onDemand",
      "rounding",
      "staticFloor",
      "unfound",
      "values",
    ]);
  });

  it("should accept a requirement the floor itself states", () => {
    expect(
      checkPrecision(precision, {
        required: [{ id: "china-2024", because: "grounding" }],
        data: {},
      }),
    ).toEqual([]);
  });

  it("should refuse a requirement that only a hover answers", () => {
    const hit = checkPrecision(precision, {
      required: [{ id: "china-world-share", because: "claim-shape" }],
      data: {},
    })[0];
    expect(hit.says).toContain("only answered on demand");
  });

  it("should refuse a declared reading the delivered page states nowhere", () => {
    const ghost = parsePrecision(brief, {
      html,
      declares: { "never-printed": "999,9" },
    });
    expect(checkPrecision(ghost, {})[0].says).toContain("states it nowhere");
  });
});
