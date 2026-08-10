// THE SCRUB IS CONTINUOUS, AND THE BEAT DOES NOT HOLD A SECOND OPINION ABOUT WHERE THE READER IS.
//
// These are the two facts this beat shipped WITHOUT, with every guard around it green. It derived
// its own progress from a prose band that stopped meaning anything when the vehicle moved the prose
// into its own column, so it published 0.000 for most of the scroll and jumped to a whole integer
// occasionally; and nothing anywhere asked whether the picture CHANGED between two arrivals, so a
// slideshow with a fade satisfied every assertion in `drive.mjs`.
//
// `drive.mjs` runs the real measurement in real Chrome. This file guards the two pure pieces that
// measurement rests on: `readProgress`/`progressSourceOf` (the beat reads the published number, or
// throws naming it) and `fluidity`/`progressDisagreement`/`report` (what a driven sweep MEANS).
//
// THE MUTATIONS, run in a copy under /tmp — never in this tree — with the red they produced.
//
// M1 — `map-drive.mjs`: `readProgress` returns 0 instead of throwing on a missing or garbled attribute
//      (`if (raw === null || …) return 0;`). A beat that silently renders state 0 forever looks
//      exactly like a beat whose script never ran — which is how this one shipped.
//
//        error: expect(received).toThrow(expected)
//        Expected substring: "data-progress"
//        Received function did not throw
//        Received value: 0
//        (fail) the beat refuses to run without the scaffold's published signal > names data-progress
//               rather than defaulting when the attribute is absent [0.65ms]
//        (fail) the beat refuses to run without the scaffold's published signal > refuses a garbled
//               value rather than coercing it [0.02ms]
//        12 pass, 2 fail
//
// M2 — `scroll-report.mjs`: `fluidity` counts every intra-step pair as changed
//      (`if (true) paintChanged += 1;`). The guard's own blindness, put back.
//
//        error: expect(received).toHaveLength(expected)
//        Expected length: 2
//        Received length: 0
//        (fail) fluidity > names the frames where the step held, the signal moved and the picture
//               did not [0.19ms]
//        error: expect(received).toHaveLength(expected)
//        Expected length: 2
//        Received length: 0
//        (fail) report > turns a frozen run into a problem that names the scroll offsets [0.22ms]
//        12 pass, 2 fail
//
// M3 — `scroll-report.mjs`: `fluidity` drops the clamped-end exemption (the
//      `if (a.progress === b.progress) { … continue; }` block). It then fires on the head and tail
//      of every piece, where the signal itself has nowhere to go — and a guard that cries wolf on
//      correct frames is how a tolerance gets widened until it catches nothing.
//
//        error: expect(received).toEqual(expected)
//        - []
//        + [ { "from": 0, "progress": 0, "step": "continent", "to": 30 },
//        +   { "from": 30, "progress": 0, "step": "continent", "to": 60 } ]
//        (fail) fluidity > does not ask the picture to move where the signal itself is clamped [0.97ms]
//        13 pass, 1 fail
//
// M4 — `scroll-report.mjs`: `progressDisagreement` returns `{ worst: 0, at: null }` unconditionally.
//
//        error: expect(received).toBe(expected)
//        Expected: 3
//        Received: 0
//        (fail) progressDisagreement > catches a beat that derives its own opinion of the position
//               instead of reading the published one [0.12ms]
//        error: expect(received).toHaveLength(expected)
//        Expected length: 1
//        Received length: 0
//        (fail) report > says so when the beat's position disagrees with the scaffold's progress [0.28ms]
//        12 pass, 2 fail
//
// AND THE WHOLE THING, LIVE. The same M1 defect put back in a full copy of the tree pinned to the
// committed vehicle, re-rendered and re-driven in real Chrome — control against mutant, one change:
//
//        control  1600x900 down  fluid={"intraStepFrames":92,"paintChanged":92,"geometryChanged":92,
//                                       "fractionMoving":1,"signalHeldFrames":3}  disagree=0.0005  problems=0
//        mutant   1600x900 down  fluid={"intraStepFrames":92,"paintChanged":0,"geometryChanged":0,
//                                       "fractionMoving":0,"signalHeldFrames":3}  disagree=3       problems=93
//        error: 6 of 6 sweeps have problems: 1600x900 down (93), 1600x900 up (93), 1280x800 down (82),
//               1280x800 up (82), 375x812 down (29), 375x812 up (29)

import { describe, expect, it } from "bun:test";
import { avoidStripe, progressSourceOf, readProgress } from "./map-drive.mjs";
import {
  plateToLonLat,
  viewForCamera,
  warmPositions,
} from "./live-scroll-map.mjs";
import { fluidity, progressDisagreement, report } from "./scroll-report.mjs";

/** The smallest thing `progressSourceOf`/`readProgress` accept: they only ever call
 *  `getAttribute` and walk `parentElement`, so a plain object is a faithful stand-in and no DOM
 *  emulation is needed to state what they must do. */
function node(attributes: Record<string, string>, parent: unknown = null) {
  return {
    getAttribute: (name: string) =>
      name in attributes ? attributes[name] : null,
    parentElement: parent,
  };
}

/** One driven frame, in the shape `drive.mjs`'s own `SNAPSHOT` returns. */
function frame(over: Record<string, unknown> = {}) {
  return {
    scrollY: 0,
    innerWidth: 1600,
    innerHeight: 900,
    horizontal: false,
    pageScrolls: false,
    progress: 0,
    position: 0,
    activeStep: "continent",
    activeIndex: 0,
    paintMoving: 1,
    paintAll: 1,
    panelFraction: 0.16,
    portHeight: 820,
    panelVisibleBoxes: [],
    marked: [],
    graphic: { left: 0, right: 1200, top: 80, bottom: 900 },
    column: { left: 1200, right: 1600, top: 80, bottom: 900 },
    ...over,
  };
}

/** A whole clean sweep: four readings, the signal moving every frame, the picture moving with it. */
function cleanSweep() {
  const steps = ["continent", "east", "west", "crowd"];
  return Array.from({ length: 61 }, (_, i) => {
    const progress = Number(((i * 3) / 60).toFixed(4));
    return frame({
      scrollY: i * 30,
      progress,
      position: progress,
      activeStep: steps[Math.min(3, Math.round(progress))],
      activeIndex: Math.min(3, Math.round(progress)),
      paintMoving: 1000 + i,
      paintAll: 2000 + i,
    });
  });
}

describe("the beat refuses to run without the scaffold's published signal", () => {
  it("names data-progress rather than defaulting when the attribute is absent", () => {
    expect(() => readProgress(node({}))).toThrow("data-progress");
    expect(() => readProgress(null)).toThrow("data-progress");
  });

  it("refuses a garbled value rather than coercing it", () => {
    expect(() => readProgress(node({ "data-progress": "" }))).toThrow(
      "data-progress",
    );
    expect(() => readProgress(node({ "data-progress": "half way" }))).toThrow(
      "data-progress",
    );
  });

  it("reads the published number, including the clamped zero", () => {
    expect(readProgress(node({ "data-progress": "0.0000" }))).toBe(0);
    expect(readProgress(node({ "data-progress": "2.4783" }))).toBe(2.4783);
  });

  it("walks up to the nearest ancestor carrying it, past the ones that do not", () => {
    const scrolly = node({ "data-progress": "1.5" });
    const stack = node({}, scrolly);
    const visual = node({ "data-visual": "one-map" }, stack);
    expect(progressSourceOf(visual)).toBe(scrolly);
    expect(progressSourceOf(node({}, node({})))).toBe(null);
  });
});

describe("fluidity", () => {
  it("names the frames where the step held, the signal moved and the picture did not", () => {
    // The shipped defect, in miniature: progress advances, the step does not change, and the
    // visual's fingerprint is identical on two consecutive frames.
    const samples = [
      frame({ scrollY: 300, progress: 0.25, paintMoving: 7, paintAll: 7 }),
      frame({ scrollY: 330, progress: 0.28, paintMoving: 7, paintAll: 7 }),
      frame({ scrollY: 360, progress: 0.31, paintMoving: 7, paintAll: 7 }),
      frame({ scrollY: 390, progress: 0.34, paintMoving: 8, paintAll: 8 }),
    ];
    const flow = fluidity(samples);
    expect(flow.intraStepFrames).toBe(3);
    expect(flow.frozen).toHaveLength(2);
    expect(flow.frozen[0]).toEqual({
      from: 300,
      to: 330,
      step: "continent",
      progress: 0.28,
    });
    expect(flow.paintChanged).toBe(1);
  });

  it("does not ask the picture to move where the signal itself is clamped", () => {
    // The head of the piece: the first card's centre has not reached the lane's centre line, so the
    // vehicle keeps publishing 0 and there is nowhere along the piece for the picture to be.
    const samples = [
      frame({ scrollY: 0, progress: 0, paintMoving: 4, paintAll: 4 }),
      frame({ scrollY: 30, progress: 0, paintMoving: 4, paintAll: 4 }),
      frame({ scrollY: 60, progress: 0, paintMoving: 4, paintAll: 4 }),
    ];
    const flow = fluidity(samples);
    expect(flow.frozen).toEqual([]);
    expect(flow.intraStepFrames).toBe(0);
    expect(flow.signalHeld).toHaveLength(2);
  });

  it("separates a picture that MOVES from one that only cross-fades", () => {
    const samples = [
      frame({ scrollY: 0, progress: 0.1, paintMoving: 5, paintAll: 50 }),
      frame({ scrollY: 30, progress: 0.13, paintMoving: 5, paintAll: 51 }),
      frame({ scrollY: 60, progress: 0.16, paintMoving: 6, paintAll: 52 }),
    ];
    const flow = fluidity(samples);
    expect(flow.paintChanged).toBe(2);
    expect(flow.geometryChanged).toBe(1);
    expect(flow.alphaOnly).toHaveLength(1);
    expect(flow.fractionMoving).toBe(0.5);
  });

  it("ignores the boundary frames, where a stepped visual is allowed to arrive", () => {
    const samples = [
      frame({
        scrollY: 0,
        progress: 0.48,
        activeStep: "continent",
        paintMoving: 1,
        paintAll: 1,
      }),
      frame({
        scrollY: 30,
        progress: 0.51,
        activeStep: "east",
        paintMoving: 1,
        paintAll: 1,
      }),
    ];
    expect(fluidity(samples).intraStepFrames).toBe(0);
  });
});

describe("progressDisagreement", () => {
  it("catches a beat that derives its own opinion of the position instead of reading the published one", () => {
    // The exact shape measured on the shipped file: the scaffold runs 0 → 3, the beat sits on 0.
    const samples = [
      frame({ scrollY: 0, progress: 0, position: 0 }),
      frame({ scrollY: 900, progress: 0.8886, position: 1 }),
      frame({ scrollY: 2953, progress: 3, position: 0 }),
    ];
    expect(progressDisagreement(samples).worst).toBe(3);
    expect(progressDisagreement(samples).at).toBe(2953);
  });

  it("is zero when the beat echoes the published number", () => {
    expect(progressDisagreement(cleanSweep()).worst).toBe(0);
  });
});

describe("report", () => {
  it("passes a sweep that spans the piece and moves on every frame", () => {
    const verdict = report("1600x900 down", cleanSweep(), 4);
    expect(verdict.problems).toEqual([]);
    expect(verdict.fluidity.fractionMoving).toBe(1);
    expect(verdict.span).toEqual([0, 3]);
  });

  it("turns a frozen run into a problem that names the scroll offsets", () => {
    const samples = cleanSweep();
    for (const i of [20, 21]) samples[i].paintAll = samples[19].paintAll;
    for (const i of [20, 21]) samples[i].paintMoving = samples[19].paintMoving;
    const problems = report("1600x900 down", samples, 4).problems.filter((p) =>
      p.includes("did not change"),
    );
    // Two frozen PAIRS out of three frames held identical: 19→20 and 20→21.
    expect(problems).toHaveLength(2);
    expect(problems[0]).toContain("scrollY=570");
    expect(problems[0]).toContain("slideshow");
  });

  it("says so when the beat's position disagrees with the scaffold's progress", () => {
    const samples = cleanSweep();
    samples[30].position = 0;
    const problems = report("1600x900 down", samples, 4).problems.filter((p) =>
      p.includes("second opinion"),
    );
    expect(problems).toHaveLength(1);
  });

  it("says so when a reading is unreachable", () => {
    const samples = cleanSweep().map((s) => ({
      ...s,
      progress: Math.min(s.progress, 2.7),
    }));
    expect(report("1600x900 down", samples, 4).problems.join(" ")).toContain(
      "unreachable",
    );
  });
});

/**
 * THE LIVE MAPTILER LAYER — the pure half.
 *
 * `verify-live-tiles.mjs` drives the real thing with a real key; these are the two derivations it
 * rests on, and they are here because they are the ones that can be wrong in silence. A camera
 * that lands a degree off looks like a map.
 *
 * M6 — `live-scroll-map.mjs`: `plateToLonLat` interpolates latitude LINEARLY (`corners.north +
 *      (point[1]/frame.height) * (corners.south - corners.north)`) instead of through Mercator,
 *      which is the mistake this projection invites:
 *
 *        error: expect(received).toBeCloseTo(expected, precision)
 *        Expected: 54.3061   Received: 50.79390874318121
 *        (fail) the live camera > reads the plate's own centre back as the place it stands for
 *         23 pass, 1 fail
 *
 *      ONE test, not two, and the reason is worth keeping: the corners test stays green because a
 *      linear and a Mercator interpolation AGREE at both ends of the frame, and the `viewForCamera`
 *      test stays green because it compares the camera against `plateToLonLat` — both mutated, so
 *      it compares a wrong number with itself. Only a point in the MIDDLE, against an
 *      independently-derived value, can see this defect.
 *
 * M7 — `map-drive.mjs`: `avoidStripe` returns `x` unchanged (the guarantee the ninth correction
 *      replaced "they never meet" with, removed):
 *
 *        error: expect(received).toBe(expected)
 *        Expected: 340   Received: 400
 *        (fail) a label is never cut down its side by the prose card > moves a straddling label
 *               wholly inside the stripe when it fits
 *         23 pass, 1 fail
 */

// This beat's own plate, as `plate/geometry.json` records it.
const GEOMETRY = {
  frame: { width: 2000, height: 2000 },
  frameCorners: {
    west: -25.999999999998835,
    north: 68.21859634060158,
    east: 33.00000000000148,
    south: 33.36922114604086,
  },
  worldWidthPx: 12203.4,
};

describe("the live camera", () => {
  it("reads the plate's own corners back as the corners the bake recorded", () => {
    const [west, north] = plateToLonLat([0, 0], GEOMETRY);
    const [east, south] = plateToLonLat([2000, 2000], GEOMETRY);
    expect(west).toBeCloseTo(GEOMETRY.frameCorners.west, 6);
    expect(north).toBeCloseTo(GEOMETRY.frameCorners.north, 6);
    expect(east).toBeCloseTo(GEOMETRY.frameCorners.east, 6);
    expect(south).toBeCloseTo(GEOMETRY.frameCorners.south, 6);
  });

  it("reads the plate's own centre back as the place it stands for", () => {
    // Mercator, not linear: the mid-height row of a frame spanning 33.37°N to 68.22°N is NOT the
    // arithmetic mean of the two. Independently: mercatorY(68.2186) = 1.64994 and
    // mercatorY(33.3692) = 0.61958, whose midpoint 1.13476 inverts to 54.306°. The arithmetic mean
    // is 50.794° — **3.5 degrees, about 390 km** — which is how far off the whole live camera would
    // sit if this were interpolated the obvious way.
    const [lon, lat] = plateToLonLat([1000, 1000], GEOMETRY);
    expect(lon).toBeCloseTo(3.5, 6);
    expect(lat).toBeCloseTo(54.3061, 3);
  });

  it("turns a resolved camera into the map's own centre and zoom", () => {
    // A camera drawing the plate 1:1 with its top-left at the frame's origin: the map's centre is
    // the plate point under the frame's centre, and its zoom is the bake's own.
    const frame = { width: 800, height: 600 };
    const camera = { scale: 1, tx: 0, ty: 0 };
    const view = viewForCamera(camera, frame, GEOMETRY);
    expect(view.zoom).toBeCloseTo(Math.log2(GEOMETRY.worldWidthPx / 512), 6);
    expect(view.center).toEqual(plateToLonLat([400, 300], GEOMETRY));
  });

  it("moves one zoom level per doubling of the camera's scale", () => {
    const frame = { width: 800, height: 600 };
    const one = viewForCamera({ scale: 1, tx: 0, ty: 0 }, frame, GEOMETRY);
    const two = viewForCamera({ scale: 2, tx: 0, ty: 0 }, frame, GEOMETRY);
    expect(two.zoom - one.zoom).toBeCloseTo(1, 12);
  });

  it("refuses a plate that predates the camera facts rather than guessing a place", () => {
    expect(() =>
      plateToLonLat([0, 0], { frame: { width: 10, height: 10 } }),
    ).toThrow("frameCorners");
  });

  it("warms every leg's interior, not only the authored cameras", () => {
    // Four authored states, three legs, three samples each, plus the last camera.
    const warmed = warmPositions(4, 3);
    expect(warmed).toHaveLength(10);
    warmed.forEach((p, i) => expect(p).toBeCloseTo(i / 3, 10));
  });
});

describe("a label is never cut down its side by the prose card", () => {
  const frame = { width: 1280, height: 800 };
  const stripe = { left: 435, right: 845 };

  it("leaves a label that is already clear of the card where it is", () => {
    expect(avoidStripe(200, 60, stripe, frame)).toBe(200);
    expect(avoidStripe(1100, 60, stripe, frame)).toBe(1100);
  });

  it("leaves a label that is already wholly inside the card where it is", () => {
    expect(avoidStripe(640, 60, stripe, frame)).toBe(640);
  });

  it("moves a straddling label wholly inside the stripe when it fits", () => {
    // Centre 400, half-width 95: it reaches 495, past the stripe's left edge at 435. Inside costs
    // 130px of movement, outside (to 340) costs 60 — so outside wins here.
    expect(avoidStripe(400, 95, stripe, frame)).toBe(340);
    // Centre 480 straddles the same edge, and inside is now the nearer answer.
    expect(avoidStripe(480, 55, stripe, frame)).toBe(490);
  });

  it("does nothing on a phone, where the card has no vertical edge inside the frame", () => {
    expect(avoidStripe(180, 90, null, { width: 375, height: 812 })).toBe(180);
  });
});
