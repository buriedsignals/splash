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
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { marksWithNoPointerPath } from "../assets/geo-choropleth.ts";
import {
  READING_WIDTHS,
  announcedMarksOf,
  drawnRegionsOf,
  drawnWidthAt,
  marksStrandedWithNoChannel,
  strandedRefusal,
  strandedVerdict,
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
        marksStrandedWithNoChannel(page.html, drawnWidthAt(1600, drawn.frame))
          .stranded.length,
      );
    }
    expect(
      [...counted.values()].filter((n) => n > 0).length,
    ).toBeGreaterThanOrEqual(3);
    expect(
      counted.get(
        "stories/real-owid-life-expectancy/beats/1-life-expectancy-2023/renders/life-expectancy-2023.html",
      ),
    ).toBe(75);
    expect(
      counted.get("proof/mapgen-choropleth-web/renders/choropleth.html"),
    ).toBe(3);

    // And the narrow end is a different map: at 375px the world beat loses two thirds more.
    const world = pages.find((page) =>
      page.rel.includes("life-expectancy-2023.html"),
    )!;
    expect(
      marksStrandedWithNoChannel(
        world.html,
        drawnWidthAt(375, { width: 1200, height: 815 }),
      ).stranded.length,
    ).toBe(124);
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
  const drawnAt1600 = drawnWidthAt(1600, { width: 1200, height: 815 });

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
    for (const width of READING_WIDTHS)
      expect(refusal).toContain(`at ${width}px`);
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
        drawnWidthAt(1600, { width: 1200, height: 815 }),
      ),
    );
    expect(said).toContain("75 of 241 marks are drawn smaller than a pixel");
    expect(said).toContain("MCO");
    expect(said).toContain(
      "The keyboard and the accessible table ARE their path",
    );
    // AND THE NUMBER IS SAID TO BE A FLOOR. The live layer fits a narrower canvas than the fallback
    // — 896px against 1200 at a 1600px container, measured — so the real count is higher (90, not
    // 75). A producer given a number with no idea which side it errs on cannot act on it.
    expect(said).toContain("floor");
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
