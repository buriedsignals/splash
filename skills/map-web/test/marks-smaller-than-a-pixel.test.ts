/**
 * A MARK SMALLER THAN A PIXEL HAS NO POINTER PATH, AND NO TARGET ENGINEERING CREATES ONE.
 *
 * A ruling asked this format to withdraw `collidingPointerTargets`'s invariant and replace it with a
 * live one: every mark's own centre answers `queryRenderedFeatures` with that mark's feature. Driven
 * with a real MapTiler key against the committed 241-region world beat, at 1600x900:
 *
 *     own 140 · a NEIGHBOUR's 15 · NOTHING 86
 *
 * and widened to the fairest possible reading — any pixel ANYWHERE the map attributes to that mark,
 * on a 23x23 grid over its own projected bounding box, with a pixel to spare on all four sides —
 * **63 marks have no pixel at all** at 1600x900, 64 at 1024x768, and 82 at 375x667. Of the 105 marks
 * a neighbour's 28px button covers, 46 are not served by the live pointer either.
 *
 * So the collision was never the problem. At that camera the map draws 896px for 360° of longitude:
 * ONE PIXEL IS ABOUT 26 KM AND MONACO IS ABOUT A THIRTEENTH OF ONE. The proposed invariant would
 * have been red for 90 of 241 marks at 1600x900 and 149 at 375x667 and could never have gone green —
 * a requirement that fires constantly and cannot be satisfied, which is this codebase's own worst
 * shape. It was refused, and this is what the refutation earned instead:
 *
 *   1. the count is a fact the producer is TOLD, at the widths the beat is read at;
 *   2. and because the keyboard and the accessible table are then the ONLY paths those marks have,
 *      a beat that strands one and drops either channel is refused rather than shipped.
 *
 * Both halves are measured here against the real page, never against a fixture alone.
 */
import { describe, expect, it } from "bun:test";
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { createElement } from "react";
import { renderMapWeb } from "../scripts/render-web.mjs";
import { marksWithNoPointerPath } from "../assets/geo-choropleth.ts";
import {
  BOX_BORDER_PX,
  FURNITURE_HEIGHT_PX,
  PAGE_PADDING_PX,
  READING_VIEWPORTS,
  READING_WIDTHS,
  STAGE_MIN_HEIGHT_PX,
  announcedMarksOf,
  boxAt,
  plateIsBoundByHeight,
  drawnRegionsOf,
  drawnWidthAt,
  drawnWidthInBox,
  furnitureAt,
  marksStrandedWithNoChannel,
  strandedRefusal,
  strandedVerdict,
  viewportFor,
} from "../scripts/detect-stranded-marks.mjs";
import { TWIN, discoverMapWebPages } from "../scripts/discover-pages.mjs";

const square = (x: number, y: number, side: number): [number, number][][] => [
  [
    [x, y],
    [x + side, y],
    [x + side, y + side],
    [x, y + side],
  ],
];

describe("marksWithNoPointerPath", () => {
  const frame = { width: 400, height: 400 };

  it("names the mark the camera draws under a pixel and leaves the one it draws wide alone", () => {
    const shapes = [
      { key: "wide", rings: square(10, 10, 100) },
      { key: "speck", rings: square(300, 300, 0.4) },
    ];
    expect(marksWithNoPointerPath(shapes, frame, 400)).toEqual(["speck"]);
  });

  it("answers differently at different drawn widths, because it is a different question", () => {
    // The same 6-unit shape is 6 pixels across on a wide screen and under one on a phone. This is
    // the whole reason a single number could never have answered it — and the reason the verdict a
    // producer reads is printed at four widths rather than one.
    const shapes = [{ key: "small", rings: square(100, 100, 6) }];
    expect(marksWithNoPointerPath(shapes, frame, 400)).toEqual([]);
    expect(marksWithNoPointerPath(shapes, frame, 40)).toEqual(["small"]);
  });

  it("finds the pixel inside a concave shape whose own bbox centre is outside it", () => {
    // The false-failure class the live probe already recorded: a bbox centre for France lands in
    // Mali, for Denmark in open water, for Croatia inside Bosnia. A reading that probed the centre
    // alone would call this U reachable-by-nothing; the scan walks the shape itself.
    const u: [number, number][][] = [
      [
        [0, 0],
        [40, 0],
        [40, 100],
        [60, 100],
        [60, 0],
        [100, 0],
        [100, 140],
        [0, 140],
      ],
    ];
    expect(
      marksWithNoPointerPath([{ key: "u", rings: u }], frame, 400),
    ).toEqual([]);
  });

  it("says nothing when it has nothing to measure with", () => {
    expect(
      marksWithNoPointerPath([{ key: "a", rings: square(1, 1, 1) }], frame, 0),
    ).toEqual([]);
    expect(marksWithNoPointerPath([], frame, 400)).toEqual([]);
    expect(
      marksWithNoPointerPath([{ key: "empty", rings: [] }], frame, 400),
    ).toEqual(["empty"]);
  });
});

describe("the real world beat, measured from its own bake against the live browser", () => {
  const geometryPath = join(
    TWIN,
    "stories/real-owid-life-expectancy/beats/1-life-expectancy-2023/plate/geometry.json",
  );

  it("reproduces, in arithmetic, what a real key and a real camera found", () => {
    expect(existsSync(geometryPath)).toBe(true);
    const geometry = JSON.parse(readFileSync(geometryPath, "utf8"));
    expect(geometry.shapes.length).toBe(241);

    // THE THREE CANVAS WIDTHS THE BROWSER ACTUALLY GAVE THAT PAGE, read off `container.clientWidth`
    // while the live map was up: 896 from a 1600x900 window, 640 from 1024x768, 263 from 375x667.
    // The live count under the same discipline — a pixel this mark owns with a pixel to spare — was
    // 90, 99 and 149. This function answers 85, 96 and 147: 6, 5 and 3 marks apart out of 241.
    //
    // The gap is DRAW ORDER, which no static reading can see: `queryRenderedFeatures` answers with
    // the TOPMOST feature, so the Netherlands and New Zealand read as reachable here and as
    // unreachable live. The live probe is the authority and prints its own number; this is what a
    // producer can be told at render time, with no browser and no key.
    expect(
      marksWithNoPointerPath(geometry.shapes, geometry.frame, 896).length,
    ).toBe(85);
    expect(
      marksWithNoPointerPath(geometry.shapes, geometry.frame, 640).length,
    ).toBe(96);
    expect(
      marksWithNoPointerPath(geometry.shapes, geometry.frame, 263).length,
    ).toBe(147);
  });

  it("names the marks the withdrawn ruling existed to protect", () => {
    const geometry = JSON.parse(readFileSync(geometryPath, "utf8"));
    const stranded = marksWithNoPointerPath(
      geometry.shapes,
      geometry.frame,
      896,
    );
    // Live, these answered `queryRenderedFeatures` with a NEIGHBOUR's feature (MCO→FRA, SMR→ITA,
    // VAT→ITA, MAC→CHN, SGP→MYS, AND→FRA) or with nothing at all (LIE, MLT, HKG). Every one of them
    // is a country, with a value, drawn on the map — and unreachable by pointer at this camera.
    for (const key of [
      "MCO",
      "SMR",
      "VAT",
      "LIE",
      "MLT",
      "HKG",
      "MAC",
      "SGP",
      "AND",
    ])
      expect(stranded).toContain(key);
    // And the marks a reader really can point at are NOT named, or the count would prove nothing.
    for (const key of ["RUS", "BRA", "CHN", "USA", "AUS"])
      expect(stranded).not.toContain(key);
  });
});

describe("the delivered page carries everything this decision needs", () => {
  const worldPage = join(
    TWIN,
    "stories/real-owid-life-expectancy/beats/1-life-expectancy-2023/renders/life-expectancy-2023.html",
  );

  it("reads the frame and the rings back out of the artefact, not out of the component", () => {
    const html = readFileSync(worldPage, "utf8");
    const drawn = drawnRegionsOf(html)!;
    // The map svg's own viewBox IS the frame every ring in it was projected into.
    expect(drawn.frame).toEqual({ width: 1200, height: 815 });
    expect(drawn.shapes.length).toBe(241);
    // Parsed back from the `d` attribute `pathFromRings` wrote, so the count agrees with the bake's
    // own geometry file at the same drawn width — two paths to one number.
    expect(marksWithNoPointerPath(drawn.shapes, drawn.frame, 896).length).toBe(
      85,
    );
    expect(announcedMarksOf(html).get("MCO")).toEqual({
      detail: "Monaco : 86.4 years",
      keyboardTarget: true,
    });
  });

  it("has no map svg to read on a page that is not one", () => {
    expect(
      drawnRegionsOf("<html><body><p>no map here</p></body></html>"),
    ).toBeNull();
  });

  const svg = (paths: string) =>
    `<svg class="map" viewBox="0 0 100 100">${paths}</svg>`;

  it("reads a keyed path whatever class it carries — a beat is not one beat's class name", () => {
    // THE FALSE NEGATIVE THIS CLOSES, on a real page. This reading first keyed off the choropleth's
    // own `class="region"`, so `proof/mapgen-dot-web` — whose live hover target is the country FILL
    // and whose own prose claimed a reader could hover any of its 42 countries — reported ZERO marks
    // with no pointer path while Liechtenstein and Malta are drawn under a pixel at every width.
    const found = drawnRegionsOf(
      svg(
        '<path d="M1 1L9 1L9 9L1 9Z" fill="#eee" stroke="#616161" data-key="LIE"></path>',
      ),
    )!;
    expect(found.shapes.map((shape: { key: string }) => shape.key)).toEqual([
      "LIE",
    ]);
  });

  it("merges a mark drawn as several paths, rather than judging its smallest island", () => {
    const found = drawnRegionsOf(
      svg(
        '<path d="M1 1L40 1L40 40L1 40Z" fill="#eee" data-key="ITA"></path>' +
          '<path d="M90 90L90.2 90L90.2 90.2L90 90.2Z" fill="#eee" data-key="ITA"></path>',
      ),
    )!;
    expect(found.shapes.length).toBe(1);
    expect(found.shapes[0].rings.length).toBe(2);
    // The mainland carries the mark; the speck alone would have called Italy unreachable.
    expect(marksWithNoPointerPath(found.shapes, found.frame, 100)).toEqual([]);
  });

  it("refuses geometry it cannot judge instead of measuring it wrongly", () => {
    // Three bounds, each found on or provoked by a real page. A STROKED path is pointed at through
    // its stroke width, not through the area its open curve encloses (`stress-ab-emigration-flows`'s
    // route ribbons: `fill="none"`, `stroke-width` 30 down to 3.1). A TRANSFORMED path's rings are
    // not where it is drawn (that beat's arrowheads, translated and rotated). And a `d` carrying a
    // curve has control points that are not vertices.
    const stroked = drawnRegionsOf(
      svg(
        '<path d="M 1 1 Q 20 20 40 1" fill="none" stroke="#D4A853" stroke-width="30" data-key="route"></path>',
      ),
    )!;
    expect(stroked.shapes).toEqual([]);
    expect(stroked.unplaceable).toEqual([]);

    const transformed = drawnRegionsOf(
      svg(
        '<path d="M0 0L-21 -13L-21 13Z" fill="#D4A853" transform="translate(472 161) rotate(-49)" data-key="arrow"></path>',
      ),
    )!;
    expect(transformed.shapes).toEqual([]);
    // NAMED, not dropped: a mark nothing measured is reported as such.
    expect(transformed.unplaceable).toEqual(["arrow"]);

    const curved = drawnRegionsOf(
      svg('<path d="M1 1C5 5 9 9 1 1Z" fill="#eee" data-key="curve"></path>'),
    )!;
    expect(curved.shapes).toEqual([]);
    expect(curved.unplaceable).toEqual(["curve"]);
  });

  it("says out loud, in the renderer, when it could not place a mark's geometry", () => {
    const renderer = readFileSync(
      join(TWIN, "skills/map-web/scripts/render-web.mjs"),
      "utf8",
    );
    expect(renderer).toContain("drawn.unplaceable.length > 0");
    expect(renderer).toContain("nothing below counted them either way");
  });
});

describe("every delivered page in this format, swept", () => {
  const pages = discoverMapWebPages();

  it("strands marks on the pages that draw a dense camera, and names how many", () => {
    // ANTI-VACUITY, and it is the whole reason this is not just an assertion that nothing is
    // unreachable: a sweep that found zero stranded marks anywhere would pass forever while the
    // decision returned a constant empty array. Measured on the committed population — 3 marks on
    // `mapgen-choropleth-web` at 1600px, 1 on `stress-f-housing-pressure`, and 75 on the world beat,
    // rising to 124 at 375px.
    const counted = new Map<string, number>();
    for (const page of pages) {
      const drawn = drawnRegionsOf(page.html);
      if (!drawn || drawn.shapes.length === 0) continue;
      counted.set(
        page.rel,
        marksStrandedWithNoChannel(page.html, drawnWidthAt(1600, drawn.frame, plateIsBoundByHeight(page.html)))
          .stranded.length,
      );
    }
    expect(
      [...counted.values()].filter((n) => n > 0).length,
    ).toBeGreaterThanOrEqual(4);
    // `mapgen-dot-web` is in that list only because this reading stopped keying off one beat's class
    // name: Liechtenstein and Malta are drawn under a pixel there, on a page whose live hover target
    // is the country fill and whose own brief used to claim a reader could hover any of the 42.
    // 2 -> 3 on 2026-08-23, and the third was there all along. This beat draws 42 country outlines
    // and `drawnWidthAt` used to answer 1000px about a map the browser drew 704px wide, so a shape
    // between those two readings counted as reachable when it was not. Liechtenstein, Malta and
    // Luxembourg are all drawn under a pixel here at 1600px; the keyboard and the table are their
    // path, and this beat's own brief no longer claims a reader can hover any of the 42.
    expect(counted.get("proof/mapgen-dot-web/dot-population.html")).toBe(3);
    // 75 -> 89 on 2026-08-23. The reading did not get stricter; it stopped answering about a box
    // nobody has. This beat WRAPS, so one world is drawn at the box's HEIGHT times the plate's
    // aspect and never at the container's width — the browser draws it 894.8px wide in a 1600x900
    // window and the old reading said 1200, which is the plate's own frame and not a width anything
    // is drawn at. Measured against Chrome: 89 said against 84 drawn, erring high; before, 75 said
    // against 84 drawn, erring LOW, which is the direction a count a journalist acts on may not err
    // in.
    expect(
      counted.get(
        "stories/real-owid-life-expectancy/beats/1-life-expectancy-2023/renders/life-expectancy-2023.html",
      ),
    ).toBe(89);
    // 3 -> 2 on 2026-08-23, and the mark that left was never really a speck. `drawnWidthAt` used to
    // cap the drawn width at the plate's own frame and knew nothing about the stage's height, so on
    // this beat at a 1600px container it answered 496px about a map the browser drew 739px wide.
    // The box is now the container on both axes and the plate covers it, so the reading is
    // `container - padding` and is exact here; one Baltic outline crossed a whole pixel and stopped
    // being counted. The reading got MORE accurate in both directions — see `plateIsBoundByHeight`.
    expect(
      counted.get("proof/mapgen-choropleth-web/renders/choropleth.html"),
    ).toBe(2);

    // And the narrow end is a different map: at 375px the world beat loses two thirds more.
    const world = pages.find((page) =>
      page.rel.includes("life-expectancy-2023.html"),
    )!;
    // 124 -> 148, and this one is EXACT rather than merely better: at 375x667 the stage hits its own
    // `min-height: 180px`, so the box height is a number the CSS states outright and the census and
    // the browser both read 148 of 241.
    expect(
      marksStrandedWithNoChannel(
        world.html,
        drawnWidthAt(375, { width: 1200, height: 815 }, true),
      ).stranded.length,
    ).toBe(148);
  });

  it("leaves not one of those marks unreachable by every channel", () => {
    const offenders: string[] = [];
    for (const page of pages) {
      const refusal = strandedRefusal(page.html);
      if (refusal) offenders.push(`${page.rel}: ${refusal}`);
    }
    expect(offenders).toEqual([]);
  });
});

describe("the refusal, proven on the real page by taking a channel away", () => {
  const worldPage = join(
    TWIN,
    "stories/real-owid-life-expectancy/beats/1-life-expectancy-2023/renders/life-expectancy-2023.html",
  );
  const html = readFileSync(worldPage, "utf8");
  const drawnAt1600 = drawnWidthAt(1600, { width: 1200, height: 815 }, true);

  it("refuses a beat that drops one stranded mark's row from the accessible table", () => {
    // Monaco is about a thirteenth of a pixel at this camera. Take its ROW away and the only thing
    // left is a Tab stop; take the row away and the fact is gone from the one complete linear
    // reading this format ships. This is the mutation the ruling asked for, on the real page.
    const withoutMonacosRow = html.replace(
      '<tr><th scope="row">Monaco</th><td>86.4 years</td></tr>',
      "",
    );
    expect(withoutMonacosRow).not.toBe(html);
    const found = marksStrandedWithNoChannel(withoutMonacosRow, drawnAt1600);
    expect(found.stranded).toContain("MCO");
    expect(found.withoutARow).toEqual(["MCO"]);
    expect(found.unreachable).toEqual(["MCO"]);
    expect(strandedRefusal(withoutMonacosRow)).toContain("MCO");
    expect(strandedRefusal(withoutMonacosRow)).toContain(
      "no row in the accessible table",
    );
  });

  const monacosButton =
    '<button type="button" class="pt pt-small" style="left:clamp(14px, 52.05833333333334%, calc(100% - 14px));top:clamp(14px, 49.18404907975461%, calc(100% - 14px));width:28px" aria-label="Monaco : 86.4 years" title="Monaco : 86.4 years" data-key="MCO" data-detail="Monaco : 86.4 years"></button>';

  // TWO MUTATIONS, NOT ONE, and the first version of this test only had the second — which left the
  // FOCUSABLE half unmeasured: a `<span>` with no accessible name fails the name test before the
  // focus test is ever reached, so the decision could have called every element on the page
  // focusable and this stayed green. Found by breaking the code and watching nothing happen. Each
  // half of "a keyboard target" is now taken away on its own, with the other left intact.
  it("refuses a beat whose stranded mark carries its name on something a Tab never lands on", () => {
    const notFocusable = html.replace(
      monacosButton,
      '<span aria-label="Monaco : 86.4 years" title="Monaco : 86.4 years" data-key="MCO" data-detail="Monaco : 86.4 years"></span>',
    );
    expect(notFocusable).not.toBe(html);
    const found = marksStrandedWithNoChannel(notFocusable, drawnAt1600);
    expect(found.withoutAKeyboardTarget).toEqual(["MCO"]);
    expect(found.withoutARow).toEqual([]);
    expect(strandedRefusal(notFocusable)).toContain(
      "no keyboard target for MCO",
    );
    // A `tabindex` puts it back: this is about the reader's Tab sequence, not about the tag name.
    const focusableSpan = notFocusable.replace(
      "<span aria-label",
      '<span tabindex="0" aria-label',
    );
    expect(
      marksStrandedWithNoChannel(focusableSpan, drawnAt1600).unreachable,
    ).toEqual([]);
  });

  it("refuses a beat whose stranded mark's target arrives with nothing to say", () => {
    // `keyboardReachesEveryMark`'s own second half: focus that lands on a mark and announces nothing
    // is not a path to that mark's value. The button stays a button; only its two names are gone.
    const unnamed = html.replace(
      monacosButton,
      '<button type="button" class="pt pt-small" data-key="MCO" data-detail="Monaco : 86.4 years"></button>',
    );
    expect(unnamed).not.toBe(html);
    expect(
      marksStrandedWithNoChannel(unnamed, drawnAt1600).withoutAKeyboardTarget,
    ).toEqual(["MCO"]);
    expect(strandedRefusal(unnamed)).toContain("no keyboard target for MCO");
  });

  it("says nothing about a mark a reader CAN point at, whatever its channels", () => {
    // The refusal is about marks with no pointer path, and only those. Take Russia's row away —
    // Russia is 130 pixels across at this camera — and this decision stays silent, because
    // `tableCarriesTheMarks` is the rule that covers a table gap on a mark a pointer reaches, and a
    // second decision restating it here would be one more thing to drift.
    const withoutRussiasRow = html.replace(
      /<tr><th scope="row">Russia<\/th><td>[^<]*<\/td><\/tr>/,
      "",
    );
    expect(withoutRussiasRow).not.toBe(html);
    expect(
      marksStrandedWithNoChannel(withoutRussiasRow, drawnAt1600).unreachable,
    ).toEqual([]);
    expect(strandedRefusal(withoutRussiasRow)).toBeNull();
  });

  it("reports at every width a reader gets, not just the widest", () => {
    // A mark can be pointable on a desktop and gone on a phone, and a producer told only the
    // desktop number never learns that the beat becomes a table in a reader's hand.
    const withoutMonacosRow = html.replace(
      '<tr><th scope="row">Monaco</th><td>86.4 years</td></tr>',
      "",
    );
    const refusal = strandedRefusal(withoutMonacosRow)!;
    // A SHAPE, NOT A WIDTH. The refusal names the window it read, both axes, because the box's
    // height is half of what decides whether a mark is drawn at all.
    for (const viewport of READING_VIEWPORTS)
      expect(refusal).toContain(`at ${viewport.width}x${viewport.height}`);
  });
});

describe("the producer is told, at production time", () => {
  it("prints the verdict at four widths and refuses, inside the format's own renderer", () => {
    // The half that makes this a mechanism rather than a note: a limit that cannot be removed is
    // stated where the producer reads it, and the page that strands a mark with nothing left is
    // never written. If these calls are deleted, a beat renders in silence.
    const renderer = readFileSync(
      join(TWIN, "skills/map-web/scripts/render-web.mjs"),
      "utf8",
    );
    expect(renderer).toContain("marksStrandedWithNoChannel(");
    expect(renderer).toContain("strandedVerdict(");
    expect(renderer).toContain("strandedRefusal(");
    expect(renderer).toMatch(/throw new Error\(refusal\)/);
  });

  it("says the number, the names, and what the reader is left with", () => {
    const html = readFileSync(
      join(
        TWIN,
        "stories/real-owid-life-expectancy/beats/1-life-expectancy-2023/renders/life-expectancy-2023.html",
      ),
      "utf8",
    );
    const said = strandedVerdict(
      1600,
      marksStrandedWithNoChannel(
        html,
        drawnWidthAt(1600, { width: 1200, height: 815 }, true),
      ),
    );
    expect(said).toContain("89 of 241 marks are drawn smaller than a pixel");
    expect(said).toContain("MCO");
    expect(said).toContain(
      "The keyboard and the accessible table ARE their path",
    );
    // AND THE NUMBER SAYS WHICH SIDE IT ERRS ON — but no longer the side it used to claim.
    //
    // It said "This is a floor". That was a positive statement about the fallback reading and it was
    // FALSE: measured in Chrome on the rabies world beat, the census read 36 where the browser drew
    // 41 at 1600x900 and 50 where the browser drew 38 at 768x1024. Wrong in both directions, and
    // wrong LOW on the two commonest desktop shapes. Recurring shape 3, in a verdict: a claim that
    // reads as a confirmation rather than as the uncertainty it actually carries.
    //
    // What it says now is what is true of it — an ESTIMATE of the fallback, taken at the shortest
    // box this format's own pages are measured into so it errs high; and STILL a floor against the
    // LIVE layer, whose camera is narrower again (894.8px of world here against a 1568px stage).
    expect(said).toContain("estimate of the FALLBACK layer");
    expect(said).toContain("errs high rather than low");
    expect(said).toContain("verify-live-map.mjs");
    expect(said).not.toContain("This is a floor");
  });

  it("has nothing to say about a beat whose marks are not regions", () => {
    const seed = readFileSync(
      join(TWIN, "skills/map-web/output-proof/population.html"),
      "utf8",
    );
    expect(drawnRegionsOf(seed)!.shapes).toEqual([]);
    expect(strandedRefusal(seed)).toBeNull();
  });
});

/**
 * AND THE PAGE IS ACTUALLY NOT WRITTEN — the format's own renderer, invoked for real.
 *
 * The assertions above prove the decision on delivered HTML and prove the renderer NAMES it. This
 * one drives `renderMapWeb` itself with a beat that strands a mark, because a guard wired into a
 * code path nothing exercises is the state this repository keeps finding: the seed is a symbol map
 * with no areal geometry, so no render in this tree would otherwise reach the throw with anything
 * but an empty set.
 */
describe("renderMapWeb refuses to write a page that strands a mark", () => {
  const FRAME = { width: 100, height: 100 };
  // One mark, drawn 0.2 frame units across — under a pixel at any width this format ships — plus one
  // drawn 40 units across, so the beat is not degenerate and the refusal names only the speck.
  const speck = 'M60 60L60.2 60L60.2 60.2L60 60.2Z';
  const wide = 'M5 5L45 5L45 45L5 45Z';
  const marks = [
    { key: "SPECK", detail: "Monaco : 86.4 years", d: speck },
    { key: "WIDE", detail: "France : 83.2 years", d: wide },
  ];
  const Beat = () =>
    createElement("div", { className: "map-web-page" }, [
      createElement(
        "svg",
        { key: "svg", className: "map", viewBox: `0 0 ${FRAME.width} ${FRAME.height}` },
        marks.map((mark) =>
          createElement("path", { key: mark.key, d: mark.d, fill: "#888", "data-key": mark.key }),
        ),
      ),
      createElement(
        "div",
        { key: "overlay" },
        marks.map((mark) =>
          createElement("button", {
            key: mark.key,
            type: "button",
            className: "pt",
            "aria-label": mark.detail,
            title: mark.detail,
            "data-key": mark.key,
            "data-detail": mark.detail,
          }),
        ),
      ),
    ]);
  const Table = ({ rows }: { rows: { detail: string }[] }) =>
    createElement(
      "table",
      null,
      createElement(
        "tbody",
        null,
        rows.map((row) =>
          createElement("tr", { key: row.detail }, createElement("td", null, row.detail)),
        ),
      ),
    );
  const props = {
    geometry: { frame: FRAME, points: [] },
    language: "en",
    ground: "#FFFFFF",
    title: "A beat with one mark under a pixel",
  };

  /** Renders into a throwaway directory and reports whether the file exists, whatever happened. */
  async function build(rows: { detail: string }[]) {
    const outDir = mkdtempSync(join(tmpdir(), "map-web-stranded-"));
    try {
      let thrown: Error | null = null;
      try {
        await renderMapWeb({
          component: Beat,
          table: () => Table({ rows }),
          props: props as any,
          outDir,
          name: "beat.html",
          tableRowNoun: "marks",
        });
      } catch (error) {
        thrown = error as Error;
      }
      return { thrown, written: existsSync(join(outDir, "beat.html")) };
    } finally {
      rmSync(outDir, { recursive: true, force: true });
    }
  }

  it("writes the page when every stranded mark still has its row and its target", async () => {
    const { thrown, written } = await build(marks.map((mark) => ({ detail: mark.detail })));
    expect(thrown).toBeNull();
    expect(written).toBe(true);
  });

  it("throws, and leaves no file behind, when the stranded mark has no row", async () => {
    const { thrown, written } = await build([{ detail: "France : 83.2 years" }]);
    expect(thrown).not.toBeNull();
    expect(thrown!.message).toContain("no row in the accessible table for SPECK");
    expect(thrown!.message).toContain("marks smaller than a pixel");
    // The WIDE mark is missing nothing and a reader can point at it, so it is not named.
    expect(thrown!.message).not.toContain("WIDE");
    // AND THE PAGE IS NOT ON DISK. "Must not ship" is a file that was never written, not a warning
    // printed beside one that was.
    expect(written).toBe(false);
  });
});

/**
 * THE GAP BETWEEN WHAT THE CENSUS SAYS AND WHAT A BROWSER DRAWS — established, and then closed.
 *
 * The census reported 33 stranded marks on the rabies world beat where the browser measured 40 (36
 * against 41 once that beat's wrap was fixed). A count that is wrong LOW tells a journalist the map
 * is better than it is, and the count exists so they can tighten the camera or add an inset. The
 * cause was one term: the map's DRAWN width was read off the container's width and the plate's own
 * frame, and on a wrapping page it is neither — one world is drawn at the BOX's height times the
 * plate's aspect.
 *
 * Below: the arithmetic, pinned against real `getBoundingClientRect` readings, and then the
 * population sweep that keeps the one term this cannot compute honest.
 */
describe("the drawn width is the box's arithmetic, not the container's", () => {
  it("draws one world at the box's height times the plate's aspect when the page wraps", () => {
    // Chrome, rabies world beat (plate 1400x781, aspect 1.79257), box content heights against the
    // measured width of one `.mw-world`: 581.5 -> 1042.3, 633.2 -> 1135.0, 178.0 -> 319.1.
    const frame = { width: 1400, height: 781 };
    expect(drawnWidthInBox({ width: 1566, height: 581.5 }, frame, true)).toBeCloseTo(1042.3, 0);
    expect(drawnWidthInBox({ width: 734, height: 633.2 }, frame, true)).toBeCloseTo(1135.0, 0);
    expect(drawnWidthInBox({ width: 341, height: 178 }, frame, true)).toBeCloseTo(319.1, 0);
  });

  it("ignores the container's width on a wrapping page, which is the whole defect", () => {
    // The same box height in a container twice as wide draws the same world. The old reading
    // returned `min(container - padding, frame.width)` and moved with the container.
    const frame = { width: 1400, height: 781 };
    expect(drawnWidthInBox({ width: 700, height: 581.5 }, frame, true)).toBe(
      drawnWidthInBox({ width: 2900, height: 581.5 }, frame, true),
    );
  });

  it("covers the box on a page that does not wrap, and is never narrower than it", () => {
    // Chrome, `proof/mapgen-dot-web` at 1600x900: box 1566x702 content, one plate drawn 1566.0 wide;
    // at 768x1024, box 734x731 content, drawn 1624.4 — the height is what decides it there.
    const frame = { width: 1000, height: 450 };
    expect(drawnWidthInBox({ width: 1566, height: 702 }, frame, false)).toBeCloseTo(1566, 0);
    expect(drawnWidthInBox({ width: 734, height: 731 }, frame, false)).toBeCloseTo(1624.4, 0);
  });

  it("takes the viewport's border off both axes, because a size container measures its CONTENT", () => {
    // Worth two pixels of arithmetic and three and a half of map: at 1600x900 the border box is
    // 583.5 tall and every `cqh` inside it resolves against 581.5.
    const box = boxAt({ width: 1600, height: 900 }, 316.5);
    expect(box.width).toBe(1600 - PAGE_PADDING_PX - 2 * BOX_BORDER_PX);
    expect(box.height).toBeCloseTo(583.5 - 2 * BOX_BORDER_PX, 1);
  });

  it("stops giving up height at the stage's own min-height", () => {
    // 375x667 with 487px of furniture is exactly the clamp, and five of this format's fourteen
    // pages sit on it.
    expect(boxAt({ width: 375, height: 667 }, 600).height).toBe(
      STAGE_MIN_HEIGHT_PX - 2 * BOX_BORDER_PX,
    );
  });

  it("reads an unknown width as this format's own window shape, never as a box of unknown height", () => {
    expect(viewportFor(1600)).toEqual({ width: 1600, height: 900 });
    expect(viewportFor(1280)).toEqual({ width: 1280, height: 720 });
    // And the furniture for it comes from the NEAREST measured width, not from the widest reading.
    expect(furnitureAt(1280)).toBe(FURNITURE_HEIGHT_PX[1024]);
    expect(furnitureAt(1590)).toBe(FURNITURE_HEIGHT_PX[1600]);
  });

  it("derives the reading widths from the reading viewports rather than typing both", () => {
    expect(READING_WIDTHS).toEqual(READING_VIEWPORTS.map((v) => v.width));
  });
});

/**
 * THE ONE TERM A STRING CANNOT CARRY, KEPT HONEST BY A BROWSER.
 *
 * `FURNITURE_HEIGHT_PX` is TYPED — deliberately, so a reader of the script sees the numbers and a
 * bump is a decision somebody made — but it DESCRIBES a population that moves every time a beat is
 * rendered or a caption is rewritten. A constant that describes a population and is not derived
 * from it is this codebase's second-commonest defect shape, and it had already reached the weight
 * ceiling once. So it is derived here, in Chrome, over every page `discoverMapWebPages()` finds, and
 * asserted in BOTH directions: the table is exactly the most this format's own pages spend.
 *
 * And the assertion the whole census exists for: at those same viewports, the count this format
 * gives a producer without a browser is NEVER LOWER than the count a browser measures. It was, by
 * five marks at 1600x900 and by eight at 1024x768, on a real delivered page.
 */
describe("the census against the browser, over this format's whole delivered population", () => {
  const CHROME = resolveChromeForCensus();
  // THE FURNITURE IS READ OFF EVERY PAGE, THE COUNTS OFF THE ONES THAT DRAW AREAL MARKS. The box
  // arithmetic belongs to the format, so the allowance it is bounded with is measured over the
  // format's whole delivered population; a symbol map has no region to strand but its caption takes
  // room like any other.
  const pages = discoverMapWebPages();

  type Reading = {
    rel: string;
    viewport: { width: number; height: number };
    furniture: number;
    measuredWidth: number;
    measuredCount: number | null;
    censusCount: number | null;
  };

  let readings: Reading[] = [];

  it("drives every page at every reading viewport", async () => {
    // Anti-vacuity: a sweep over an empty population passes while measuring nothing.
    expect(pages.length).toBeGreaterThan(0);
    const puppeteer = (await import("puppeteer-core")).default;
    const browser = await puppeteer.launch({ executablePath: CHROME, headless: true });
    try {
      const page = await browser.newPage();
      for (const found of pages) {
        const drawn = drawnRegionsOf(found.html);
        const judged = drawn !== null && drawn.shapes.length > 0;
        const heightBound = plateIsBoundByHeight(found.html);
        for (const viewport of READING_VIEWPORTS) {
          await page.setViewport({ ...viewport, deviceScaleFactor: 1 });
          await page.goto(pathToFileURL(found.abs).href, { waitUntil: "load" });
          const measured = await page.evaluate(() => {
            const rect = (selector: string) => {
              const el = document.querySelector(selector);
              return el ? el.getBoundingClientRect() : null;
            };
            const box = rect(".mw-viewport");
            // One painted world on a wrapping page; the whole plate layer on a page that covers.
            const world = rect(".mw-world") ?? rect("#mw-fallback");
            return box && world ? { boxHeight: box.height, drawn: world.width } : null;
          });
          expect(measured).not.toBeNull();
          readings.push({
            rel: found.rel,
            viewport,
            furniture: viewport.height - measured!.boxHeight,
            measuredWidth: measured!.drawn,
            measuredCount: judged
              ? marksStrandedWithNoChannel(found.html, measured!.drawn).stranded.length
              : null,
            censusCount: judged
              ? marksStrandedWithNoChannel(
                  found.html,
                  drawnWidthAt(viewport.width, drawn!.frame, heightBound),
                ).stranded.length
              : null,
          });
        }
      }
    } finally {
      await browser.close();
    }
    expect(readings.length).toBe(pages.length * READING_VIEWPORTS.length);
  }, 180_000);

  it("states exactly the most furniture this population spends, at each viewport", () => {
    const derived: Record<number, number> = {};
    for (const reading of readings)
      derived[reading.viewport.width] = Math.max(
        derived[reading.viewport.width] ?? 0,
        Number(reading.furniture.toFixed(1)),
      );
    expect(derived).toEqual(FURNITURE_HEIGHT_PX);
  });

  it("never tells a producer materially fewer stranded marks than a reader actually loses", () => {
    // THE DEFECT, AS AN ASSERTION. Wrong low is the direction that flatters: it says the map is
    // better than it is, on the one number a journalist tightens a camera over. It was wrong low by
    // 5 marks at 1600x900 and by 8 at 1024x768 on a real delivered page.
    //
    // ONE MARK OF SLACK, AND IT IS NOT A ROUNDING FUDGE — it is PIXEL PHASE, measured. Whether a
    // shape smaller than a pixel covers a pixel CENTRE depends on where the grid falls under it, not
    // only on how big it is, so `marksWithNoPointerPath` is NOT monotonic in the drawn width:
    // driven over the rabies beat between 318 and 330px it reads 82, 86, 87, 86, 85, 84, 87, 88, 86,
    // 88, 81 — a wider map stranding MORE marks four times in eleven steps. A tenth of a pixel of
    // disagreement between this arithmetic and a `getBoundingClientRect` can therefore move the
    // count by one either way, and no box arithmetic closes that. Two marks would hide a real
    // regression; one is the wobble itself.
    const low = readings
      .filter((r) => r.censusCount !== null && r.censusCount < r.measuredCount! - 1)
      .map(
        (r) =>
          `${r.rel} at ${r.viewport.width}x${r.viewport.height}: census ${r.censusCount}, browser ${r.measuredCount} (drawn ${r.measuredWidth.toFixed(1)}px)`,
      );
    expect(low).toEqual([]);
  });

  it("is close enough to be worth acting on, not merely safe", () => {
    // A census that answered "all of them" would satisfy the assertion above and be useless. Over
    // this population it is within 6 marks of the browser at every viewport of every page.
    const judged = readings.filter((r) => r.censusCount !== null);
    expect(judged.length).toBeGreaterThan(0);
    const worst = Math.max(...judged.map((r) => r.censusCount! - r.measuredCount!));
    expect(worst).toBeLessThanOrEqual(6);
  });
});

/** A DUPLICATE of the `resolveChrome` every capture script in this tree carries — a skill's own
 *  scripts stay copy-pasteable, so this is not imported from anywhere else. */
function resolveChromeForCensus(): string {
  const candidates: string[] = [];
  if (process.env.CHROME_PATH) candidates.push(process.env.CHROME_PATH);
  const cache = join(homedir(), ".cache/puppeteer/chrome");
  if (existsSync(cache))
    for (const build of readdirSync(cache).sort().reverse())
      candidates.push(
        join(
          cache,
          build,
          "chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing",
        ),
        join(
          cache,
          build,
          "chrome-mac-x64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing",
        ),
        join(cache, build, "chrome-linux64/chrome"),
      );
  candidates.push(
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/usr/bin/google-chrome",
  );
  const found = candidates.find((path) => path && existsSync(path));
  if (!found)
    throw new Error(
      `no Chrome to measure with. Looked in:\n  ${candidates.join("\n  ")}\nSet CHROME_PATH, or run: bunx puppeteer browsers install chrome`,
    );
  return found;
}
