// The three guards this format was missing, each written against a defect a delivered page actually
// shipped — `splash-test-b-route-access`, a five-stop route scrolly published to Cloudflare Pages on
// 2026-08-18. It passed `verify-scrolly.mjs` and it was dead: the map never moved, the route was
// never drawn, and the reader who scrolled met five identical pictures.
//
// The verifier checked THE VEHICLE and never THE CARGO. It measured the active-step handover, the
// order frames arrive in, the card's travel, its opacity and its contrast — every one of them green
// on that page — and had no assertion at all for the one thing the format exists to do.
//
// Each function below is pure and takes MEASUREMENTS, not a page: the browser work stays in
// `verifyOne`, and what decides pass or fail is testable without Chrome.

import { describe, it, expect } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  stillSteps,
  duplicatedPayload,
  projectionDisagreements,
  STEP_REDRAW_FLOOR,
  fingerprintDrift,
  revealDashInScreenSpace,
  requiresScrub,
  stalledSteps,
} from "../scripts/verify-scrolly.mjs";

// ── G1. Two steps that paint the same picture ────────────────────────────────────────────────
//
// The defect, exactly: the beat put its visual in all five `.step-frame`s and animated it with a
// script that ran `querySelector` — singular. The animated copy was frame 1, invisible from step 2
// on; the four copies the reader actually saw were frozen at their build-time state. A hash of the
// graphic's own pixels is the only measurement that cannot be argued with here, because the page's
// markup DID differ (one class, one inline style) while the picture did not.

// THE INSTRUMENT WAS WRONG TWICE BEFORE IT WAS RIGHT, and both corrections are load-bearing.
//
// A byte hash of a screenshot called the frozen page "5 of 5 redrawn": the prose card travels over
// the graphic, and a crossfade leaves a residue differing on 98% of pixels by at most 7/255. Then
// the screenshot itself lied — on `one-line-four-readings` the DOM read position 3.000 with its x
// ticks at 2012-2022 while every capture showed the whole 1876-2023 record, because Puppeteer reads
// a compositor surface that was stale. FIVE OF THIS TREE'S BEATS WERE REPORTED AS DEAD ON THAT
// EVIDENCE AND NONE OF THEM ARE. The picture is now read from the DOM, as a multiset of painted
// marks — because keyed by DOM path, the delivered page's five identical copies read as 97.7%
// redrawn when all that changed was which wrapper was painted.
//
// The population, measured with the instrument that works, at 1600x900 / 1280x800 / 375x812:
//
//   eu-carbon (chart)         96.8 / 96.8 / 96.3   ·  quakes (map)       95.7 / 96.2 / 96.2
//   one-map (map)             81.8 / 81.4 / 81.9   ·  three-media (7 steps)  43.5 … 87.0
//   one-line (chart)          12.5 / 82.1 / 83.0   ·  grinnell (image)   52.6 / 52.2 / 16.7
//   danube (route)            28.0 / 13.8 /  6.5   ← the quietest living step in the tree
//   the delivered route page   4.4 /  0.0 /  0.0 / 0.0
//
// One percent is six times below the lowest living step, and above nothing but zero.

describe("a step that paints the same picture as the one before it", () => {
  it("names the pair, so the reader's complaint is the failure's wording", () => {
    const shots = [
      { id: "lisbon", changed: null },
      { id: "madrid", changed: 0.0003 },
      { id: "marseille", changed: 0.24 },
    ];
    expect(stillSteps(shots)).toEqual([["lisbon", "madrid"]]);
  });

  it("reports every consecutive pair, not only the first", () => {
    const shots = [
      { id: "one", changed: null },
      { id: "two", changed: 0 },
      { id: "three", changed: 0 },
    ];
    expect(stillSteps(shots)).toEqual([
      ["one", "two"],
      ["two", "three"],
    ]);
  });

  it("passes a beat whose every step redraws", () => {
    const shots = [
      { id: "one", changed: null },
      { id: "two", changed: 0.132 },
      { id: "three", changed: 0.574 },
    ];
    expect(stillSteps(shots)).toEqual([]);
  });

  // The residue of a crossfade caught mid-settle, and the 0.3% patch one marker's alpha makes: both
  // are "the picture did not change" as a reader means it.
  it("counts a fraction of a percent as no redraw at all", () => {
    expect(
      stillSteps([
        { id: "one", changed: null },
        { id: "two", changed: 0.0033 },
      ]),
    ).toEqual([["one", "two"]]);
  });

  it("takes the floor as an argument, so a beat can be measured against another population", () => {
    const shots = [
      { id: "one", changed: null },
      { id: "two", changed: 0.05 },
    ];
    expect(stillSteps(shots)).toEqual([]);
    expect(stillSteps(shots, 0.1)).toEqual([["one", "two"]]);
  });
});

// ── G2. The same asset inlined more than once ────────────────────────────────────────────────
//
// The same defect seen from the file rather than the screen: five copies of one 348 KB basemap
// plate, 1.33 MB of a 1.80 MB page that no reader ever benefits from. A weight ceiling would have
// been arbitrary — this tree's own image scrolly is legitimately 3 MB — but an asset inlined twice
// is waste whatever the beat, and it is the fingerprint of the frame-duplication bug above.

describe("an asset inlined more than once in the delivered page", () => {
  it("counts the copies and the bytes a reader downloads for nothing", () => {
    const blob = "A".repeat(4000);
    const html = `<img src="data:image/png;base64,${blob}"><img src="data:image/png;base64,${blob}">`;
    const [waste] = duplicatedPayload(html);
    expect(waste.copies).toBe(2);
    expect(waste.wastedBytes).toBe(4000);
  });

  it("says nothing about an asset carried once", () => {
    const html = `<img src="data:image/png;base64,${"A".repeat(4000)}">`;
    expect(duplicatedPayload(html)).toEqual([]);
  });

  it("orders the worst offender first", () => {
    const small = "B".repeat(3000);
    const large = "C".repeat(9000);
    const html = [small, small, large, large]
      .map((b) => `<img src="data:image/png;base64,${b}">`)
      .join("");
    expect(duplicatedPayload(html).map((w) => w.wastedBytes)).toEqual([
      9000, 3000,
    ]);
  });

  // A page inlines a great many tiny things — an icon, a cursor, a one-line font subset. Repeating
  // those is not the defect this exists for, and reporting them would bury the 1.33 MB one.
  it("ignores repeated scraps too small to matter", () => {
    const scrap = "D".repeat(200);
    const html = `<img src="data:image/png;base64,${scrap}"><img src="data:image/png;base64,${scrap}">`;
    expect(duplicatedPayload(html)).toEqual([]);
  });
});

// ── G3. A plate and its overlay that project differently ─────────────────────────────────────
//
// Found at 375x812 on the same page. The plate was painted `object-fit: cover` — cropped to the
// middle 30% of its width — while the SVG carrying the stops kept `preserveAspectRatio="xMidYMid
// meet"`, which fits the whole 2:1 viewBox into a letterboxed band. Two projections of one
// geography: Lisbon was drawn over Switzerland. `references/scrolly-discipline.md` already states
// the pairing; nothing measured it.

describe("a raster plate and the overlay drawn on top of it", () => {
  it("refuses a cropped plate under a contained overlay", () => {
    const frames = [{ id: "stop-1", fit: "cover", par: "xMidYMid meet" }];
    expect(projectionDisagreements(frames)).toEqual([
      {
        id: "stop-1",
        fit: "cover",
        par: "xMidYMid meet",
        expected: "xMidYMid slice",
      },
    ]);
  });

  it("accepts the crop pairing", () => {
    expect(
      projectionDisagreements([
        { id: "s", fit: "cover", par: "xMidYMid slice" },
      ]),
    ).toEqual([]);
  });

  it("accepts the contain pairing", () => {
    expect(
      projectionDisagreements([
        { id: "s", fit: "contain", par: "xMidYMid meet" },
      ]),
    ).toEqual([]);
  });

  it("accepts a stretched pair, where geometry is meant to distort with the frame", () => {
    expect(
      projectionDisagreements([{ id: "s", fit: "fill", par: "none" }]),
    ).toEqual([]);
  });

  // The alignment half of the attribute is the beat's own business — a plate anchored to the top of
  // its frame is a composition choice. Only the meet/slice half decides whether the two layers
  // describe the same place.
  it("reads only the fitting half of preserveAspectRatio", () => {
    expect(
      projectionDisagreements([
        { id: "s", fit: "cover", par: "xMinYMax slice" },
      ]),
    ).toEqual([]);
  });

  it("says nothing about a frame with no raster plate under its overlay", () => {
    expect(
      projectionDisagreements([{ id: "s", fit: null, par: "xMidYMid meet" }]),
    ).toEqual([]);
  });
});

// ── The prose and the guard say one number ───────────────────────────────────────────────────
//
// Written to catch DRIFT, not to drive today's change: the floor is quoted in two documents an
// author reads before writing a beat, and a constant edited without them is how a rule stops being
// true. Mutation-checked — `STEP_REDRAW_FLOOR = 0.02` turns this red.

describe("the redraw floor", () => {
  // Whitespace-collapsed: these are prose files a formatter rewraps, and a rule that broke because
  // a sentence moved to the next line would be noise, not drift.
  const read = (name: string) =>
    readFileSync(join(import.meta.dirname, "..", name), "utf8").replace(/\s+/g, " ");

  it("is the same number in the guard, the skill and the discipline", () => {
    const floor = `${Number((STEP_REDRAW_FLOOR * 100).toFixed(2))}%`;
    expect(floor).toBe("1%");
    expect(read("SKILL.md")).toContain("the floor is 1%");
    expect(read("references/scrolly-discipline.md")).toContain("The floor is 1%");
  });

  it("quotes the population it was read off, in both documents", () => {
    for (const doc of ["SKILL.md", "references/scrolly-discipline.md"])
      expect(read(doc)).toContain("6.5");
  });
});

// ── What replaced the screenshot, and why ────────────────────────────────────────────────────
//
// The first instrument photographed the graphic at each step and compared pixels. It was WRONG, and
// only driving a beat whose picture demonstrably changes exposed it: on
// `one-line-four-readings` at its last step the DOM read `data-position 3.000` with the x ticks at
// 2012–2022, opacity 1 — the axes had flown — while every capture still showed the 1876–2023 axis.
// Not a settle problem: a double `requestAnimationFrame` plus 400ms did not move it, and an ELEMENT
// screenshot came back carrying a prose card that is not inside that element. Puppeteer's
// `page.screenshot` reads the compositor surface (`fromSurface: true`), and that surface was stale;
// the same frame captured through CDP with `fromSurface: false` showed the true state.
//
// So the picture is now read where it is DECIDED — the DOM — and never where it is presented. What
// a reader sees is geometry, text and opacity, so that is what is fingerprinted; a class or an
// inline style nobody can see is not in it, which is what the delivered route page differed by.

describe("the drift between two steps' fingerprints", () => {
  it("is nothing when the same picture is measured twice", () => {
    const one = ["path|0|0|10|10|1", "text|4|4|20|8|1|1918"];
    expect(fingerprintDrift(one, [...one])).toBe(0);
  });

  // A MULTISET, not a map of DOM paths, and this is the correction that matters. The delivered
  // route page carries five copies of one frame and swaps which is painted; keyed by position in
  // the tree, its identical pictures read as 97.7% redrawn. A reader sees the marks, not their
  // addresses — so the same picture in a different wrapper is the same picture.
  it("does not care which wrapper a mark is painted in", () => {
    expect(fingerprintDrift(["circle|1|1|8|8|1"], ["circle|1|1|8|8|1"])).toBe(0);
  });

  // The positional reading passes several of these by accident; this is the one that separates a
  // multiset from a list. The DOM order of a frame's marks is not something a reader perceives.
  it("does not care in what order the marks were walked", () => {
    expect(fingerprintDrift(["a", "b", "c"], ["c", "a", "b"])).toBe(0);
  });

  it("is everything when every mark moved", () => {
    expect(fingerprintDrift(["a", "b"], ["y", "z"])).toBe(1);
  });

  // A mark that MOVED is two facts in a multiset — the old one gone, the new one arrived — so three
  // marks held and one moved is 2 of the 5 the two pictures name between them, not 1 of 4.
  it("counts the share of marks that differ", () => {
    expect(fingerprintDrift(["a", "b", "c", "d"], ["a", "b", "c", "z"])).toBe(0.4);
  });

  // Two of the three marks the two pictures name between them are not in both: `b` left and `c`
  // arrived. The union is the denominator, so an arrival is a redraw and so is a departure.
  it("counts a mark that appeared, and one that left", () => {
    expect(fingerprintDrift(["a", "b"], ["a", "c"])).toBeCloseTo(2 / 3, 10);
  });

  // Fifteen identical stop labels are not one label: a step that drops four of them changed the
  // picture, and a set would have called that nothing.
  it("counts copies, so losing one of many identical marks is a redraw", () => {
    expect(fingerprintDrift(["m", "m", "m", "m"], ["m", "m", "m"])).toBe(0.25);
  });

  it("calls two empty pictures identical rather than dividing by nothing", () => {
    expect(fingerprintDrift([], [])).toBe(0);
  });
});;

// ── G4. A reveal measured in a space its own length does not live in ──────────────────────────
//
// Six hours of measurement in this tree said the Danube beat was healthy while the owner's screen
// showed the river in TWO pieces, at every scroll position, on every screenshot he sent. The cause
// was two compensations for one scale, applied at once: `strokeWidthsFor` divides the intended
// screen width back out of the camera's CSS scale, AND the route paths declared
// `vector-effect: non-scaling-stroke`, which takes the stroke — and with it the DASH PATTERN — out
// of the path's own user units and into screen space. `stroke-dasharray` repeats forever, so a
// pattern one path-length long, measured against a line 1.68x longer (900px plate into a 1512px
// viewport), draws dash, gap, dash: a head, a hole and a tail, all sliding together with the offset.
//
// IT NEVER REPRODUCED HERE because every width this verifier drives put the camera scale near 1,
// where both errors cancel. That is the deeper lesson and it is written up in the discipline: a
// guard that only ever measures at scale 1 cannot see a defect that IS the scale.
//
// A dash is not suspect on its own — a dashed gridline in screen space is exactly right, and eight
// delivered files in this tree carry one. What cannot hold is a dash that MEASURES THE PATH: one
// with a `pathLength`, or an offset that moves. That pairing is the reveal, and it must live in the
// path's own units.

describe("a dash that measures its own path", () => {
  it("refuses it in screen space", () => {
    expect(
      revealDashInScreenSpace([
        { id: "route", dasharray: "1272.04px", dashoffset: "812.61px", vectorEffect: "non-scaling-stroke" },
      ]),
    ).toEqual(["route"]);
  });

  it("catches it by its declared pathLength even when the reveal has finished", () => {
    expect(
      revealDashInScreenSpace([
        { id: "route", dasharray: "1px", dashoffset: "0px", pathLength: "1", vectorEffect: "non-scaling-stroke" },
      ]),
    ).toEqual(["route"]);
  });

  // The eight files this tree already ships with a dash and `non-scaling-stroke`: gridlines,
  // leaders, an axis rule. They never move, and a dash held at a constant screen size is the point.
  it("leaves a decorative dash alone", () => {
    expect(
      revealDashInScreenSpace([
        { id: "grid", dasharray: "2px 4px", dashoffset: "0px", vectorEffect: "non-scaling-stroke" },
      ]),
    ).toEqual([]);
  });

  it("leaves a reveal alone once it is measured in the path's own units", () => {
    expect(
      revealDashInScreenSpace([
        { id: "route", dasharray: "1px", dashoffset: "0.36px", pathLength: "1", vectorEffect: "none" },
      ]),
    ).toEqual([]);
  });

  it("names every offender, not the first", () => {
    const both = [
      { id: "halo", dasharray: "1px", dashoffset: "0.3px", vectorEffect: "non-scaling-stroke" },
      { id: "line", dasharray: "1px", dashoffset: "0.3px", vectorEffect: "non-scaling-stroke" },
    ];
    expect(revealDashInScreenSpace(both)).toEqual(["halo", "line"]);
  });
});

// ── G5. A beat that steps instead of scrubbing ────────────────────────────────────────────────
//
// The rebuilt route beat passed all four guards above and the owner read it in one scroll: "le
// dessin de la ligne n'est pas progressif au scroll, il est un peu abrupt au step là". It gave every
// step its own finished SSR'd picture, so the line jumped at each boundary and never moved under his
// gesture. The vehicle has published a continuous `data-progress` since its eighth correction;
// nothing ever required a beat to CONSUME it.
//
// It cannot be required of every beat. The seed assembles four DIFFERENT MEDIA — a photograph, a
// diagram, a baked map, a chart — and there is nothing to scrub between a photo and a chart; the
// same is true of `quakes-four-maps` (four encodings of one dataset) and `eu-carbon-four-charts`.
// Those are ASSEMBLIES, and their steps are meant to swap.
//
// The two models are told apart by the markup itself, which is the honest place: an assembly builds
// a picture into every step frame, a scrub builds ONE and drives it. So the requirement follows the
// model a beat has already declared by how it is built.

describe("which model a beat is built on", () => {
  it("reads an assembly from a picture in every frame", () => {
    expect(requiresScrub({ frames: 4, framesWithContent: 4 })).toBe(false);
  });

  it("reads a scrub from one picture driven for all of them", () => {
    expect(requiresScrub({ frames: 5, framesWithContent: 1 })).toBe(true);
  });

  // A beat that fills some frames and not others is neither, and saying so is more use than
  // guessing: it is the shape the delivered route page had after its script bound one copy.
  it("calls a partial fill a scrub, because something is driving what is left", () => {
    expect(requiresScrub({ frames: 5, framesWithContent: 2 })).toBe(true);
  });

  it("says nothing about a beat with no frames to read", () => {
    expect(requiresScrub({ frames: 0, framesWithContent: 0 })).toBe(false);
  });
});

describe("a scrub beat whose picture holds still inside a step", () => {
  it("names the step that never moved", () => {
    expect(
      stalledSteps([
        { id: "lisbon", drifts: [0.02, 0.03, 0.02] },
        { id: "madrid", drifts: [0, 0, 0] },
      ]),
    ).toEqual(["madrid"]);
  });

  it("accepts a step that moves anywhere inside itself", () => {
    expect(stalledSteps([{ id: "one", drifts: [0, 0, 0.05] }])).toEqual([]);
  });

  it("names every stalled step, not the first", () => {
    expect(
      stalledSteps([
        { id: "a", drifts: [0, 0] },
        { id: "b", drifts: [0.1] },
        { id: "c", drifts: [0] },
      ]),
    ).toEqual(["a", "c"]);
  });

  it("says nothing about a step with nothing sampled inside it", () => {
    expect(stalledSteps([{ id: "one", drifts: [] }])).toEqual([]);
  });
});
