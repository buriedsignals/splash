/**
 * THE COUNT VOCABULARY'S OWN REFUSALS — `assets/count.ts`, the ninth control this format can generate
 * without a script. `filter.ts` says what may LEAVE the picture, `stack.ts` what may MOVE in it,
 * `level.ts` what it may be MEASURED AGAINST, `reorder.ts` what the same numbers look like somewhere
 * else in a cycle; this one says WHICH TERMS ARE COUNTED IN A CLOSED SHAPE, and what the outline
 * becomes when it closes over the rest.
 *
 * WHY THE FRAME BELOW IS A HAND-BUILT PENTAGON AND NOT THE BEAT'S OWN RADAR. One of the six refusals
 * — the one that fires when an option changes the counted SET and does not change either area — needs
 * a vertex sitting exactly on the chord its two neighbours close along. That configuration exists in
 * the geometry this vocabulary is written against and it does not exist in this beat's frozen data,
 * so the guard would be unreachable and therefore untested if the fixture were the real radar. It is
 * stated here rather than left implicit: `proof/web-radar-electricity-mix` cannot reach that refusal,
 * and this file is where it is reached.
 *
 * `V` is a pentagon whose third vertex `M` is the exact midpoint of the segment joining its
 * neighbours `B` and `C`. So counting every axis and counting everything-but-`M` draw the SAME
 * outline and enclose the SAME area, which is the one thing a control may never offer.
 *
 * Each case below was also run as a MUTATION against the guard it names — the refusal was deleted
 * from `count.ts` and this file re-run — and each one goes red without it. A guard that has never
 * been seen to redden is a guard nobody has tested, and this branch has met three that went green
 * because their own walk missed the files they were written to hold.
 *
 * The half this file does NOT hold, so it is not trusted past its reach: whether the picture the
 * generated CSS produces is the one the declaration describes. Whether the eight names really never
 * move, whether the outline really passes through every counted vertex and no set-aside one, and
 * whether the areas printed on the plot are the areas of the paths emitted under them — all of that
 * is measured on the delivered HTML and by driving a real browser at real coordinates.
 */
import { describe, expect, it } from "bun:test";

import {
  COUNT_NONE_SLUG,
  assertCountDeclaration,
  countAreas,
  countCss,
  countNotesForMarkup,
  countOptionId,
  countOptionsForMarkup,
  countOutlines,
  countReadoutsForMarkup,
  countSlugOf,
  countStatesForMarkup,
  countedOutline,
  enclosedArea,
} from "../assets/count.ts";

const AXES = [
  { key: "A", name: "a" },
  { key: "B", name: "b" },
  { key: "M", name: "m" },
  { key: "C", name: "c" },
  { key: "D", name: "d" },
];
/** `M` is the exact midpoint of B–C, which is what makes "the set changed and the area did not"
 *  reachable at all. */
const V: Record<string, [number, number]> = {
  A: [0, -10],
  B: [10, 0],
  M: [5, 5],
  C: [0, 10],
  D: [-10, 0],
};
const GEOMETRY = { shapes: [{ key: "one", vertices: V }] };

const option = (over: Record<string, unknown> = {}) => ({
  key: "kept",
  label: "les trois",
  announce: "Ne compter que les trois : les trois premiers axes",
  note: "Trois axes comptés : l'aire tombe de 200 à 100.",
  readout: "Aire · 100",
  counts: ["A", "B", "C"],
  ...over,
});

const plan = (over: Record<string, unknown> = {}) => ({
  label: "Axes comptés",
  noneLabel: "les cinq",
  noneNote: "Les boutons retirent des axes du compte ; les cinq restent dessinés.",
  axes: AXES,
  options: [option()],
  ...over,
});

describe("the arithmetic the vocabulary owns", () => {
  it("should walk one point per spoke, counted vertices at their own place", () => {
    const walk = countedOutline(AXES, ["A", "B", "M", "C", "D"], V);
    expect(walk).toHaveLength(5);
    expect(walk).toEqual([V.A, V.B, V.M, V.C, V.D]);
  });

  it("should put a set-aside spoke's point on the chord its neighbours close along", () => {
    const walk = countedOutline(AXES, ["A", "B", "C", "D"], V);
    expect(walk).toHaveLength(5);
    // M is not counted, so the outline passes through the midpoint of B–C rather than through M's
    // own vertex — which here IS M's own vertex, because that is how this fixture is built.
    expect(walk[2]).toEqual([5, 5]);
    expect(walk[1]).toEqual(V.B);
    expect(walk[3]).toEqual(V.C);
  });

  it("should share one chord evenly between several set-aside spokes in a row", () => {
    const walk = countedOutline(AXES, ["A", "C", "D"], V);
    // B and M both sit between A and C: at a third and two thirds of the chord A->C.
    expect(walk[1][0]).toBeCloseTo(0, 9);
    expect(walk[1][1]).toBeCloseTo(-10 + (20 * 1) / 3, 9);
    expect(walk[2][0]).toBeCloseTo(0, 9);
    expect(walk[2][1]).toBeCloseTo(-10 + (20 * 2) / 3, 9);
  });

  it("should enclose the same area whether a collinear point is walked through or not", () => {
    const whole = enclosedArea(countedOutline(AXES, ["A", "B", "M", "C", "D"], V));
    const without = enclosedArea(countedOutline(AXES, ["A", "B", "C", "D"], V));
    expect(whole).toBeCloseTo(200, 6);
    expect(without).toBeCloseTo(200, 6);
  });

  it("should measure a real loss when a real corner leaves the count", () => {
    expect(enclosedArea(countedOutline(AXES, ["A", "B", "C"], V))).toBeCloseTo(100, 6);
  });

  it("should refuse to walk an outline through fewer than three spokes", () => {
    expect(() => countedOutline(AXES, ["A", "B"], V)).toThrow(/closes nothing/);
  });
});

describe("the six refusals", () => {
  it("should refuse an option that counts exactly what the plate counts", () => {
    expect(() =>
      assertCountDeclaration(
        plan({ options: [option({ counts: ["D", "C", "M", "B", "A"] })] }),
        GEOMETRY,
      ),
    ).toThrow(/counts the same axes as "les cinq"/);
  });

  it("should refuse an option that leaves fewer than three axes in the count", () => {
    expect(() =>
      assertCountDeclaration(plan({ options: [option({ counts: ["A", "B"] })] }), GEOMETRY),
    ).toThrow(/counts 2 axis\/axes — under 3 the outline encloses nothing/);
  });

  it("should refuse an option that changes the counted set and neither area", () => {
    expect(() =>
      assertCountDeclaration(
        plan({ options: [option({ counts: ["A", "B", "C", "D"] })] }),
        GEOMETRY,
      ),
    ).toThrow(/moves no shape's area by 0.5 % \(one 200 -> 200\)/);
  });

  it("should refuse two options that count the same axes in a different order", () => {
    expect(() =>
      assertCountDeclaration(
        plan({
          options: [
            option(),
            option({ key: "same", label: "les trois, encore", announce: "les trois, encore", counts: ["C", "A", "B"] }),
          ],
        }),
        GEOMETRY,
      ),
    ).toThrow(/counts the same axes as "les trois"/);
  });

  it("should refuse an option that counts an axis the frame does not draw", () => {
    expect(() =>
      assertCountDeclaration(
        plan({ options: [option({ counts: ["A", "B", "Z"] })] }),
        GEOMETRY,
      ),
    ).toThrow(/counts "Z", which this frame does not draw/);
  });

  it("should refuse a state with no sentence of its own, the one the page ships in included", () => {
    expect(() => assertCountDeclaration(plan({ noneNote: "   " }), GEOMETRY)).toThrow(
      /nothing on the page says what this control will DO before it is pressed/,
    );
    expect(() =>
      assertCountDeclaration(plan({ options: [option({ note: "  " })] }), GEOMETRY),
    ).toThrow(/reveals no sentence/);
    expect(() =>
      assertCountDeclaration(plan({ options: [option({ readout: "" })] }), GEOMETRY),
    ).toThrow(/prints nothing on the plot/);
    expect(() => countReadoutsForMarkup(plan(), "   ")).toThrow(/the plate prints no readout/);
  });

  it("should accept the declaration this fixture ships, so the checks discriminate", () => {
    expect(() => assertCountDeclaration(plan(), GEOMETRY)).not.toThrow();
  });
});

describe("the refusals every sister in this family also makes", () => {
  it("should refuse an accessible name that drops its own visible words", () => {
    expect(() =>
      assertCountDeclaration(
        plan({ options: [option({ announce: "Ne compter que les premiers axes" })] }),
        GEOMETRY,
      ),
    ).toThrow(/WCAG 2.5.3 label-in-name/);
  });

  it("should refuse an option that slugs onto the untouched option's reserved id", () => {
    expect(() =>
      assertCountDeclaration(plan({ options: [option({ key: "none" })] }), GEOMETRY),
    ).toThrow(/reserved id of the untouched option/);
  });

  it("should refuse an option that counts one axis twice", () => {
    expect(() =>
      assertCountDeclaration(
        plan({ options: [option({ counts: ["A", "B", "C", "C"] })] }),
        GEOMETRY,
      ),
    ).toThrow(/counts "C" twice/);
  });

  it("should refuse a shape with no vertex on a drawn spoke", () => {
    const { M, ...missing } = V;
    expect(() =>
      assertCountDeclaration(plan(), { shapes: [{ key: "one", vertices: missing }] }),
    ).toThrow(/has no vertex on "M"/);
  });

  it("should refuse a frame under three spokes and a control with no options", () => {
    expect(() =>
      assertCountDeclaration(plan({ axes: AXES.slice(0, 2) }), GEOMETRY),
    ).toThrow(/a frame is declared with 2 axis\/axes/);
    expect(() => assertCountDeclaration(plan({ options: [] }), GEOMETRY)).toThrow(
      /a legend and a default/,
    );
  });
});

describe("what the markup and the stylesheet are made of", () => {
  it("should put the untouched state first and give it the plate's whole frame", () => {
    const states = countStatesForMarkup(plan());
    expect(states[0]).toEqual({
      slug: COUNT_NONE_SLUG,
      isNone: true,
      label: "les cinq",
      counted: ["A", "B", "M", "C", "D"],
      aside: [],
    });
    expect(states[1].aside).toEqual(["M", "D"]);
    // the frame's order, never the declaration's
    expect(states[1].counted).toEqual(["A", "B", "C"]);
  });

  it("should emit every state's outline with the same number of segments, so a d can interpolate", () => {
    const outlines = countOutlines(plan(), GEOMETRY);
    const counts = Object.values(outlines).map((byShape) =>
      byShape.one.split(/[ML]/).length,
    );
    expect(new Set(counts).size).toBe(1);
  });

  it("should measure a state's area on the very points it emits", () => {
    const areas = countAreas(plan(), GEOMETRY);
    expect(areas[COUNT_NONE_SLUG].one).toBeCloseTo(200, 6);
    expect(areas[countSlugOf("kept")].one).toBeCloseTo(100, 6);
  });

  it("should hide the set-aside register at rest and reveal it only for that state's own axes", () => {
    const css = countCss(plan(), { scope: ".f", idPrefix: "p" });
    expect(css).toContain(".f [data-count-out] { display: none; }");
    const at = `.f:has(#${countOptionId("p", "kept")}:checked)`;
    expect(css).toContain(`${at} [data-count-in="m"] { display: none; }`);
    expect(css).toContain(`${at} [data-count-out="m"] { display: inline; }`);
    expect(css).toContain(`${at} [data-count-in="d"] { display: none; }`);
    // the counted axes are never named: at rest every axis is counted, and a rule per axis saying so
    // would be five ways to disagree with one fact
    expect(css).not.toContain(`${at} [data-count-out="a"]`);
    expect(css).not.toContain(`${at} [data-count-in="a"]`);
  });

  it("should name nothing but display, and never a colour or a coordinate", () => {
    const css = countCss(plan(), { scope: ".f", idPrefix: "p" });
    for (const line of css.split("\n").filter((l) => l.includes("data-count-in") || l.includes("data-count-out")))
      expect(line).toMatch(/\{ display: (none|inline); \}$/);
  });

  it("should emit nothing at all for a beat that declared no count", () => {
    expect(countCss(null, { scope: ".f", idPrefix: "p" })).toBe("");
    expect(countOptionsForMarkup(null, "p")).toEqual([]);
    expect(countNotesForMarkup(undefined)).toEqual([]);
    expect(countStatesForMarkup(null)).toEqual([]);
    expect(countOutlines(null, GEOMETRY)).toEqual({});
  });
});
