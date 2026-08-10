/**
 * THE GUARDS ON THIS BEAT, AND THE MUTATION THAT REDDENS EACH ONE.
 *
 * A guard that cannot go red is worse than none, so every block below names the change that breaks
 * it and what that change measures. Everything here is run in this tree; the two mutations that need
 * a rendered artifact are run in a COPY under `/tmp` and their output is pasted where they are
 * described, because mutating a file in a worktree several agents share is a destructive act on other
 * people's work.
 *
 * ── MUTATION 1, the whole point of the beat ──────────────────────────────────────────────────────
 * In a copy of the tree under `/tmp`, replace this beat's one read of the vehicle's signal —
 * `const position = readProgress(progressSource);` in `compose.mjs` — with `const position = 0;`,
 * re-render and re-drive. Measured 2026-08-10, control against mutant:
 *
 *     control : 6 sweeps, **0 problems**, span 0 → 6, intra-step geometry 222/225, media seen
 *               [chart, map, photo], position-vs-progress 0.0005
 *     mutant  : 6 sweeps, **1,166 problems**, intra-step geometry **0/225**, media seen **[photo]**
 *               only, position-vs-progress **6.0**, exit non-zero
 *
 * Control and mutant differ in one line. What it proves is what both sibling beats once shipped
 * without: a composition that renders state 0 forever LOOKS exactly like one whose script never ran,
 * and every arrival-shaped guard stays green on it.
 *
 * ── MUTATION 2, the one this beat needed that its siblings did not ───────────────────────────────
 * `drive.mjs` builds its fingerprint only from layers a reader can SEE
 * (`.filter(([, v]) => v.opacity > 0.02)`). To show that filter is load-bearing rather than tidy, in
 * the same `/tmp` copy: FREEZE every field of the photograph and chart tracks at its step-0 value —
 * `photoAt`, both domains, the highlighted run, both marks — leaving only the INVISIBLE map camera
 * authored, then drive it twice. Measured:
 *
 *     with the filter    : 579 problems, intra-step geometry 105/225
 *     without the filter : 382 problems, intra-step geometry 150/225
 *
 * 45 frames per sweep and 197 problems in total are hidden by dropping it: a camera nobody can see,
 * flying, signs the fingerprint for a picture that is standing still. (Neither run reaches 0, because
 * this mutation freezes two of the three tracks and the guard reports every frozen frame either way —
 * which is the correct behaviour and is why the gap between the two numbers is the measurement.)
 *
 * ── MUTATION 3, the unit guards below ────────────────────────────────────────────────────────────
 * Named inline, beside each `it`.
 */

import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  REF_WORLD,
  TILE_SIZE,
  avoidStripe,
  cameraTransform,
  containBox,
  dominantMedium,
  dominantPhoto,
  ease,
  mercatorY,
  normX,
  normY,
  photoOpacities,
  plotBox,
  projectLonLat,
  railAt,
  resolveCamera,
  scaleBar,
  stateAt,
} from "./compose.mjs";
import { fluidity, mediaSeen, report, straddles } from "./scroll-report.mjs";
import {
  RATE_WINDOW,
  deriveFacts,
  distanceKm,
  parseBalance,
  readGeography,
  readPhotographs,
} from "./ice-data.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const read = (name: string) => readFileSync(join(HERE, name), "utf8");

const photographs = readPhotographs(read("photographs.csv"));
const series = parseBalance(read("reference-glaciers.csv"));
const geography = readGeography(read("geography.geojson"));
const facts = deriveFacts(photographs, series, geography);
const html = read("render/three-media-one-glacier.html");

describe("the frozen inputs, and every figure the beat says out loud", () => {
  // MUTATION: change a single row of `reference-glaciers.csv` and every rate assertion here fails,
  // as does `render.mjs`'s own pre-flight — which is the point of computing rather than typing.
  it("reads four photographs, 71 years apart in three uneven gaps", () => {
    expect(facts.sequence.frames).toBe(4);
    expect(facts.sequence.firstYear).toBe(1938);
    expect(facts.sequence.lastYear).toBe(2009);
    expect(facts.sequence.spanYears).toBe(71);
    expect(facts.sequence.gaps).toEqual([43, 17, 11]);
  });

  it("reads one measured year per year, and refuses a gap", () => {
    expect(series.length).toBe(68);
    expect(facts.balanceFrom).toBe(1956);
    expect(facts.balanceTo).toBe(2023);
    expect(facts.balanceTotal).toBeCloseTo(-29.738, 3);
    const withAHole = read("reference-glaciers.csv")
      .split("\n")
      .filter((line) => !line.startsWith("1999,"))
      .join("\n");
    expect(() => parseBalance(withAHole)).toThrow(/jumps from 1998 to 2000/);
  });

  it("derives the two rates the last step compares, and the record is accelerating", () => {
    expect(RATE_WINDOW).toBe(25);
    expect(facts.earlyRate).toBeCloseTo(-2.4696, 3);
    expect(facts.lateRate).toBeCloseTo(-7.1544, 3);
    expect(facts.rateRatio).toBeCloseTo(2.897, 2);
    expect(facts.lateRate).toBeLessThan(facts.earlyRate);
  });

  it("derives the stretch the photographs cover from the photographs, not from a typed year", () => {
    expect(facts.spanFrom).toBe(1981);
    expect(facts.spanTo).toBe(2009);
    expect(facts.coveredYears).toEqual([1981, 1998, 2009]);
    expect(facts.spanLoss).toBeCloseTo(11.591, 3);
    // The first photograph is older than the measured record, which the beat says rather than hides.
    expect(facts.sequence.firstYear).toBeLessThan(facts.balanceFrom);
  });

  it("measures the place from the frozen shapes", () => {
    expect(facts.parkWidthKm).toBeCloseTo(90.8, 1);
    expect(facts.glacierWidthKm).toBeCloseTo(1.452, 2);
    expect(facts.glacierShareOfPark * 100).toBeCloseTo(1.6, 1);
    expect(facts.viewpointDistanceKm).toBeCloseTo(1.159, 2);
    expect(distanceKm([0, 0], [0, 1])).toBeCloseTo(111.19, 1);
  });

  // MUTATION: hand-type any of these into `render.mjs`'s prose instead of interpolating it — the
  // sentence stays true today and this assertion still passes, which is why the assertion is here AND
  // `claims-grounded-in-data` scans the runner. This one catches the render going stale; that one
  // catches the literal.
  it("says in the delivered file exactly what the data says", () => {
    for (const claim of [
      "71\n", // the span, in step 1's prose
      "43, 17 and 11 years",
      "91 kilometres",
      "1.5 km across",
      "1.6% of the park",
      "1.2 km away",
      "29.7 metres",
      "11.6 metres",
      "7.15 metres per decade",
      "2.47 over the record",
      "2.9 times faster",
    ])
      expect(html.includes(claim.trim())).toBe(true);
  });
});

describe("the composition: one state, three media, one signal", () => {
  const states = JSON.parse(
    html
      .slice(
        html.indexOf("initMixedScrolly(root, "),
        html.indexOf("live ? live.follow : null"),
      )
      .match(/\[\{"photoAt".*\}\]/s)![0],
  );

  it("carries seven states, every field a finite number, all with the same keys", () => {
    expect(states.length).toBe(7);
    const keys = Object.keys(states[0]).join(",");
    for (const state of states) {
      expect(Object.keys(state).join(",")).toBe(keys);
      for (const value of Object.values(state))
        expect(Number.isFinite(value)).toBe(true);
    }
  });

  // MUTATION: give any medium a presence that never reaches 1 — set `chartOpacity` to 0.9 at every
  // step — and this fails. It is the assertion that a MIXED beat actually shows all three of the
  // media it claims, which nothing else in the suite asks.
  it("brings each of the three media to full strength, and takes each away", () => {
    for (const field of ["photoOpacity", "mapOpacity", "chartOpacity"]) {
      const values = states.map((s: Record<string, number>) => s[field]!);
      expect(Math.max(...values)).toBe(1);
      expect(Math.min(...values)).toBe(0);
    }
  });

  it("never leaves the screen empty, at any fractional position", () => {
    for (let p = 0; p <= 6; p += 0.02) {
      const state = stateAt(states, p, false);
      const total = state.photoOpacity + state.mapOpacity + state.chartOpacity;
      expect(total).toBeGreaterThan(0.6);
    }
  });

  it("hands over exactly twice, and each handover is a crossing rather than a cut", () => {
    const media = [];
    for (let p = 0; p <= 6; p += 0.01)
      media.push(dominantMedium(stateAt(states, p, false)));
    const changes = media.filter((m, i) => i > 0 && m !== media[i - 1]);
    expect(changes).toEqual(["map", "chart"]);
    // At the midpoint of each handover leg both media are genuinely on the screen — which is what
    // makes it a moment on the same continuum rather than a switch.
    for (const p of [1.5, 3.5]) {
      const state = stateAt(states, p, false);
      const present = [
        state.photoOpacity,
        state.mapOpacity,
        state.chartOpacity,
      ].filter((v) => v > 0.2);
      expect(present.length).toBe(2);
    }
  });

  // MUTATION: replace `stateAt`'s `reduced` branch with the ordinary lerp and this fails with 601
  // distinct states instead of 7. `prefers-reduced-motion` is precisely the setting a flying camera
  // and a dissolving photograph exist for.
  it("snaps to an authored state under reduced motion — every reading still arrives", () => {
    const seen = new Set<string>();
    for (let p = 0; p <= 6; p += 0.01)
      seen.add(JSON.stringify(stateAt(states, p, true)));
    expect(seen.size).toBe(7);
  });

  it("eases with a zero derivative at both ends — the fact both alpha exemptions rest on", () => {
    expect(ease(0)).toBe(0);
    expect(ease(1)).toBe(1);
    expect(ease(0.001)).toBeLessThan(0.0001);
    expect(ease(0.5)).toBeCloseTo(0.5, 6);
  });
});

describe("the camera, and the overlay that has to stay registered with it", () => {
  const frame = { width: 1600, height: 820 };
  const state = {
    mapLon: -113.7247,
    mapMercY: mercatorY(48.7485),
    mapLogSpanLon: Math.log(0.034),
    mapLogSpanMerc: Math.log(0.0002),
    mapFit: 0.5,
  };

  it("resolves a zoom in MapLibre's own terms, so tiles and overlay cannot disagree", () => {
    const camera = resolveCamera(state, frame);
    expect(camera.worldPx).toBeCloseTo(TILE_SIZE * 2 ** camera.zoom, 3);
    // The centre of the frame is the camera's own centre, by construction.
    const centre = projectLonLat(camera.centre, camera);
    expect(centre[0]).toBeCloseTo(frame.width / 2, 6);
    expect(centre[1]).toBeCloseTo(frame.height / 2, 6);
  });

  // MUTATION: drop the `origin` term from `cameraTransform` — `const tx = camera.width / 2;` — and
  // this fails by ~1.5 million pixels. The transform and `projectLonLat` are two ways of placing the
  // same point and they must agree exactly; this beat's labels are placed by one and its outlines by
  // the other.
  it("places a point identically whether it goes through the transform or the projection", () => {
    const camera = resolveCamera(state, frame);
    const origin = {
      nx: normX(geography.park.bbox.west),
      ny: normY(mercatorY(geography.park.bbox.north)),
    };
    const transform = cameraTransform(camera, origin);
    const [, tx, ty, scale] = transform
      .match(/translate\((-?[\d.]+)px, (-?[\d.]+)px\) scale\(([\d.e-]+)\)/)!
      .map(Number);
    const point = geography.glacier.centre;
    // Where the OUTLINE draws it: a path coordinate at the reference zoom, moved by the transform.
    const pathX = (normX(point[0]) - origin.nx) * REF_WORLD;
    const pathY = (normY(mercatorY(point[1])) - origin.ny) * REF_WORLD;
    const drawn = [tx! + pathX * scale!, ty! + pathY * scale!];
    // Where the LABEL draws it.
    const projected = projectLonLat(point, camera);
    expect(drawn[0]).toBeCloseTo(projected[0], 2);
    expect(drawn[1]).toBeCloseTo(projected[1], 2);
  });

  // MUTATION: return a constant from `scaleBar` and the two assertions below fail together. The bar
  // is the only thing on the map that tells a reader the difference between a 90 km camera and a
  // 3 km one, and it has to be right at both.
  it("draws a scale bar that measures what the camera actually shows", () => {
    const camera = resolveCamera(state, frame);
    const bar = scaleBar(camera, 300);
    expect(bar.px).toBeLessThanOrEqual(300);
    const west = projectLonLat(
      [geography.glacier.bbox.west, geography.glacier.centre[1]],
      camera,
    );
    const east = projectLonLat(
      [geography.glacier.bbox.east, geography.glacier.centre[1]],
      camera,
    );
    const kmPerPx = geography.glacier.widthKm / (east[0] - west[0]);
    expect(bar.px * kmPerPx).toBeCloseTo(bar.km, 2);
  });

  // MUTATION: return `x` unchanged from `avoidStripe` and 1 of every 9 x-tick labels comes back cut
  // at 1280x800 — measured, before the driver called it.
  it("moves a label wholly inside the card's stripe or wholly outside it", () => {
    const stripe = { left: 595, right: 1004 };
    const frameBox = { width: 1600 };
    for (const x of [590, 600, 700, 1000, 1010]) {
      const moved = avoidStripe(x, 40, stripe, frameBox);
      const straddling =
        (stripe.left > moved - 40 && stripe.left < moved + 40) ||
        (stripe.right > moved - 40 && stripe.right < moved + 40);
      expect(straddling).toBe(false);
    }
    expect(avoidStripe(300, 40, null, frameBox)).toBe(300);
  });
});

describe("the photograph track", () => {
  it("contains the frame rather than cropping it — the owner's ruling, at both orientations", () => {
    const aspect = 820 / 1215;
    for (const frame of [
      { width: 1600, height: 820 },
      { width: 375, height: 500 },
    ]) {
      const box = containBox(frame, aspect);
      expect(box.width).toBeLessThanOrEqual(frame.width + 1e-9);
      expect(box.height).toBeLessThanOrEqual(frame.height + 1e-9);
      expect(box.width / box.height).toBeCloseTo(aspect, 6);
      // One axis binds exactly — anything less would be letterboxing on both.
      expect(
        Math.abs(box.width - frame.width) < 1e-6 ||
          Math.abs(box.height - frame.height) < 1e-6,
      ).toBe(true);
    }
  });

  it("dissolves through the sequence continuously, one frame at full strength on its own index", () => {
    expect(photoOpacities(0, 4)).toEqual([1, 0, 0, 0]);
    expect(photoOpacities(3, 4)).toEqual([0, 0, 0, 1]);
    const half = photoOpacities(1.5, 4);
    expect(half[1]).toBeCloseTo(0.5, 6);
    expect(half[2]).toBeCloseTo(0.5, 6);
    expect(dominantPhoto(1.6, 4)).toBe(2);
  });

  // MUTATION: make `railAt` return `at / (count - 1)` for `t` — the obvious wrong thing — and this
  // fails. The rail exists to say that the gaps are 43, 17 and 11 years; a cursor that moves in
  // equal steps between four photographs says the opposite of the sentence beside it.
  it("puts the cursor on a real time axis, not on an evenly-spaced index", () => {
    const years = [1938, 1981, 1998, 2009];
    expect(railAt(years, 0).t).toBe(0);
    expect(railAt(years, 3).t).toBe(1);
    expect(railAt(years, 1).t).toBeCloseTo(43 / 71, 6);
    expect(railAt(years, 1).t).not.toBeCloseTo(1 / 3, 3);
    expect(railAt(years, 2).t).toBeCloseTo(60 / 71, 6);
    expect(railAt(years, 1.5).year).toBeCloseTo(1989.5, 6);
    expect(railAt(years, 3).ticks).toEqual([0, 43 / 71, 60 / 71, 1]);
  });
});

describe("the chart's floor is reserved in PIXELS, because type does not stretch", () => {
  // MUTATION: put the flat `bottom: 0.88` back and this fails at 375x812 — which is exactly the
  // build where all seven x-tick labels sat on the credit, on 72 frames of every sweep.
  it("leaves the same room for the tick strip and the credit at every height", () => {
    for (const height of [820, 500, 380]) {
      const box = plotBox({ width: 1600, height });
      expect((1 - box.bottom) * height).toBeCloseTo(56, 6);
    }
    // And it refuses to eat the plot entirely on a frame too short to hold both.
    expect(plotBox({ width: 375, height: 90 }).bottom).toBe(0.45);
  });
});

describe("what a driven sweep means", () => {
  const base = {
    scrollY: 0,
    progress: 1,
    position: 1,
    activeStep: "a",
    activeIndex: 1,
    horizontal: false,
    pageScrolls: false,
    innerWidth: 1600,
    innerHeight: 900,
    panelFraction: 0.2,
    portHeight: 900,
    panelVisibleBoxes: [],
    marked: [],
    graphic: null,
    column: null,
    medium: "chart",
    handover: false,
    arriving: false,
    presences: { photo: 0, map: 0, chart: 1 },
    paintMoving: 1,
    paintAll: 1,
  };

  // MUTATION: make `straddles` return `overlaps(box, panel)` and it starts flagging every label the
  // card merely covers — which is the assertion the vehicle's EIGHTH correction had and its ninth
  // deliberately gave up. Widening it the other way (always false) loses the only thing the ninth
  // still guarantees.
  it("tells a label the card cuts from a label the card hides", () => {
    const label = { left: 500, right: 700, top: 400, bottom: 420 };
    expect(
      straddles(label, { left: 600, right: 900, top: 300, bottom: 500 }),
    ).toBe(true);
    expect(
      straddles(label, { left: 400, right: 800, top: 300, bottom: 500 }),
    ).toBe(false);
    expect(
      straddles(label, { left: 800, right: 900, top: 300, bottom: 500 }),
    ).toBe(false);
    expect(
      straddles(label, { left: 600, right: 900, top: 0, bottom: 100 }),
    ).toBe(false);
  });

  // MUTATION: delete the `paintMoving` half of `fluidity` and a piece that only cross-fades passes.
  // That is precisely the defect these beats shipped with, five reviews running.
  it("calls a cross-fade a cross-fade, and only outside the two exempt edges", () => {
    const mid = [
      { ...base, progress: 1.0, paintMoving: 1, paintAll: 1 },
      { ...base, progress: 1.2, paintMoving: 1, paintAll: 2 },
      { ...base, progress: 1.4, paintMoving: 1, paintAll: 3 },
    ];
    const flow = fluidity(mid, 7);
    expect(flow.intraStepFrames).toBe(2);
    expect(flow.geometryChanged).toBe(0);
    expect(flow.alphaOnly.length).toBe(2);
    expect(flow.alphaAtHandoverEdge.length).toBe(0);

    // The same frames, with a medium below the visible threshold: exempt, and counted separately.
    const arriving = mid.map((s) => ({ ...s, arriving: true }));
    const exempt = fluidity(arriving, 7);
    expect(exempt.alphaOnly.length).toBe(0);
    expect(exempt.alphaAtHandoverEdge.length).toBe(2);
  });

  it("measures each medium separately, so a good average cannot hide a frozen track", () => {
    const samples = [
      { ...base, medium: "photo", progress: 0.5, paintMoving: 1, paintAll: 1 },
      { ...base, medium: "photo", progress: 0.6, paintMoving: 1, paintAll: 2 },
      { ...base, medium: "chart", progress: 4.5, paintMoving: 1, paintAll: 3 },
      { ...base, medium: "chart", progress: 4.6, paintMoving: 9, paintAll: 4 },
    ];
    const flow = fluidity(samples, 7);
    expect(flow.fractionMoving).toBe(0.333);
    expect(flow.perMedium.photo.fractionMoving).toBe(0);
    expect(flow.perMedium.chart.fractionMoving).toBe(0.5);
  });

  // MUTATION: drop the `expectedMedia` check from `report` and a "mixed" beat that only ever paints
  // its chart passes every other assertion in this file.
  it("refuses a sweep in which a medium never appeared", () => {
    const samples = [0, 1, 2, 3, 4, 5, 6].map((p, i) => ({
      ...base,
      scrollY: i * 30,
      progress: p,
      position: p,
      activeIndex: p,
      paintMoving: i,
      paintAll: i,
    }));
    expect(mediaSeen(samples)).toEqual(["chart"]);
    const verdict = report("1600x900 down", samples, 7, [
      "photo",
      "map",
      "chart",
    ]);
    expect(
      verdict.problems.filter((p: string) => p.includes("unreachable")).length,
    ).toBe(2);
  });
});

describe("the live MapTiler layer is IN the delivered artifact", () => {
  // This is the guard `AUDIT-W5-W6-map.md` §5.6 found missing across the whole map corpus: the live
  // block could be deleted and 354 tests stayed green. MUTATION: remove the `initLiveScrollMap` call
  // from `render.mjs`'s boot and re-render — every assertion below fails.
  it("carries MapLibre, a MapTiler style URL, and the container the map is built into", () => {
    expect(html).toContain("maplibregl");
    expect(html).toContain("api.maptiler.com");
    expect(html).toContain("initLiveScrollMap");
    expect(html).toContain('data-part="live"');
  });

  // The owner's scrolly rulings, asserted on the beat's OWN source rather than remembered — the
  // inlined MapLibre library naturally contains the string `NavigationControl`, so scanning the whole
  // delivered file would be a check that can only ever be red. `verify-live-tiles.mjs` asks the
  // complementary question of a DRIVEN page: how many control elements are in the DOM (0) and whether
  // dragPan / scrollZoom / keyboard are enabled (none).
  it("builds the map with no controls and no reader-driven camera", () => {
    const live = read("live-scroll-map.mjs");
    expect(live).toContain("interactive: false");
    expect(live).not.toContain("NavigationControl");
    expect(live).not.toContain("addControl");
  });

  it("never carries a real key — the placeholder survives into the committed file", () => {
    expect(html).toContain("__MAPTILER" + "_KEY__");
    expect(html).not.toMatch(/key=(?!__MAPTILER)[A-Za-z0-9]{10,}/);
  });
});

describe("the copied parts have not drifted from the beats they came from", () => {
  /** A function's BODY, whitespace-normalised. Comments differ between copies on purpose — each
   *  states what it is doing in its own beat — so only the code is compared. */
  function body(source: string, name: string): string {
    const start = source.indexOf(`function ${name}(`);
    if (start < 0) throw new Error(`no function ${name} in that file`);
    let i = source.indexOf("{", start);
    let depth = 0;
    let out = "";
    for (; i < source.length; i++) {
      const c = source[i]!;
      if (c === "{") depth++;
      if (c === "}") depth--;
      out += c;
      if (depth === 0) break;
    }
    return (
      out
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/\/\/[^\n]*/g, "")
        .replace(/\s+/g, " ")
        // A trailing comma before a closer is the formatter's opinion, not the code's — one copy is
        // wrapped by prettier at a different width from another and that is not a drift.
        .replace(/,\s*([)\]}])/g, "$1")
        .replace(/([([{])\s+/g, "$1")
        .replace(/\s+([)\]}])/g, "$1")
        .trim()
    );
  }

  const mine = read("compose.mjs");
  const chartBeat = readFileSync(
    join(HERE, "../scrolly-one-chart-swiss-life-expectancy/chart-drive.mjs"),
    "utf8",
  );
  const mapBeat = readFileSync(
    join(HERE, "../mapscrolly-one-map-europe-carbon/map-drive.mjs"),
    "utf8",
  );

  // MUTATION: change `stateAt`'s clamp, or `readProgress`'s throw, in any one of the three copies —
  // this fails and names the function. The twin duplicates rather than imports; a parity check is
  // what makes that safe, and it is worth more than a comment claiming the copies are the same.
  it("keeps the interpolation core identical to BOTH single-visual beats", () => {
    for (const name of [
      "lerp",
      "ease",
      "lerpState",
      "assertNumericStates",
      "stateAt",
    ]) {
      expect(body(mine, name)).toBe(body(chartBeat, name));
      expect(body(mine, name)).toBe(body(mapBeat, name));
    }
  });

  it("keeps the progress reader and the re-parent identical to both", () => {
    for (const name of ["progressSourceOf", "readProgress", "detachVisual"]) {
      expect(body(mine, name)).toBe(body(chartBeat, name));
      expect(body(mine, name)).toBe(body(mapBeat, name));
    }
  });

  it("keeps the card-stripe rules identical to the map beat, which wrote them", () => {
    for (const name of ["avoidStripe", "stripeOf"])
      expect(body(mine, name)).toBe(body(mapBeat, name));
  });

  it("keeps the chart's tick and value maths identical to the chart beat, which wrote them", () => {
    for (const name of ["niceStep", "ticksFor", "valueAt"]) {
      expect(body(mine, name)).toBe(body(chartBeat, name));
    }
  });

  // THE ONE DELIBERATE DIVERGENCE IN THE CHART PART, asserted AS a divergence rather than left to be
  // discovered later. `toFrame` and `annotationPlacement` take the FRAME here and do not there,
  // because this beat reserves the strip below the plot in PIXELS (see `plotBox`) after driving found
  // all seven x-tick labels sitting on the credit at 375x812. Everything else about them is the same
  // code, and this says so by reconstructing one copy from the other — so a change to either beat's
  // placement still fails here, which a comment could not do.
  it("differs from the chart beat's placement only by threading the frame through it", () => {
    expect(body(mine, "annotationPlacement")).toBe(
      body(chartBeat, "annotationPlacement").replace(
        "toFrame(x, y)",
        "toFrame(x, y, frame)",
      ),
    );
    expect(body(mine, "toFrame")).toBe(
      "{const plot = plotBox(frame); " +
        body(chartBeat, "toFrame")
          .slice(1)
          .replace(/PLOT\./g, "plot."),
    );
  });
});
