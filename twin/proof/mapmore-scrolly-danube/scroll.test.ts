// THE SCRUB IS CONTINUOUS, THE BEAT HOLDS NO SECOND OPINION ABOUT WHERE THE READER IS, AND THE
// BASEMAP IS LIVE.
//
// These are the three facts this beat shipped WITHOUT. It was four SSR'd pictures swapped by
// opacity, so between two steps nothing moved at all; it read no progress signal because it had
// nothing to do with one; and its basemap was a baked SVG plate, where `grep -c
// 'maplibregl\|api.maptiler.com'` over the delivered file returned 0 and the live DOM held no
// `<canvas>` — the owner's own test, which he ran and this beat failed.
//
// `drive.mjs` runs the real scroll measurement in real Chrome and `verify-live-tiles.mjs` the real
// tile measurement with a real key. This file guards the pure pieces those two rest on, plus the
// one thing neither can guard: that the COMMITTED artifact still contains the live layer at all.
// Without that last block the whole of ruling R1 could be deleted from this beat in silence, which
// is exactly the hole `AUDIT-W5-W6-map.md` §5.6 found on the map × web genre.
//
// THE MUTATIONS, run in an rsync copy of the tree under the session scratchpad — never in this
// tree — with the red each one actually produced. Baseline in that copy: 46 pass, 0 fail (53 pass
// since M11's block was added).
//
// M1 — `route-drive.mjs`: `readProgress` returns 0 instead of throwing on a missing or garbled
//      attribute. A beat that silently renders stop 0 forever looks exactly like a beat whose
//      script never ran.
//
//        error: expect(received).toThrow(expected)
//        Expected substring: "data-progress"
//        Received function did not throw
//        Received value: 0
//        (fail) the beat refuses to run without the scaffold's published signal > names
//               data-progress rather than defaulting when the attribute is absent [0.32ms]
//        (fail) the beat refuses to run without the scaffold's published signal > refuses a garbled
//               value rather than coercing it [0.06ms]
//        44 pass, 2 fail
//
// M2 — `scroll-report.mjs`: `fluidity` counts every intra-step pair as changed
//      (`if (true) paintChanged += 1;`). The guard's own blindness, put back — this is the shape
//      that let four stills and a fade satisfy every assertion this beat used to have.
//
//        error: expect(received).toHaveLength(expected)
//        Expected length: 2
//        Received length: 0
//        (fail) fluidity > names the frames where the step held, the signal moved and the picture
//               did not [0.23ms]
//        (fail) report > turns a frozen run into a problem that names the scroll offsets [0.10ms]
//        44 pass, 2 fail
//
// M3 — `scroll-report.mjs`: `fluidity` drops the clamped-end exemption (the
//      `if (a.progress === b.progress) { … continue; }` block). It then fires on the head and tail
//      of every piece, where the signal itself has nowhere to go — and a guard that cries wolf on
//      correct frames is how a tolerance gets widened until it catches nothing.
//
//        error: expect(received).toEqual(expected)
//        - []
//        + [ { "from": 0, "progress": 0, "step": "source", "to": 30 },
//        +   { "from": 30, "progress": 0, "step": "source", "to": 60 } ]
//        (fail) fluidity > does not ask the picture to move where the signal itself is clamped [0.17ms]
//        45 pass, 1 fail
//
// M4 — `scroll-report.mjs`: `progressDisagreement` returns `{ worst: 0, at: null }`
//      unconditionally.
//
//        error: expect(received).toBe(expected)
//        Expected: 3
//        Received: 0
//        (fail) progressDisagreement > catches a beat that derives its own opinion of the position
//               instead of reading the published one [0.12ms]
//        (fail) report > says so when the beat's position disagrees with the scaffold's progress [0.28ms]
//        44 pass, 2 fail
//
// M5 — `scroll-report.mjs`: `revealSpan` never looks backwards (`const backwards = 0;`). This is
//      the guard for THIS beat's own claim — "the map only ever gains ground" — and `fluidity`
//      cannot stand in for it: a page whose badges jitter by a pixel while the river runs backwards
//      passes fluidity perfectly.
//
//        error: expect(received).toBe(expected)
//        Expected: 0.2
//        Received: 0
//        (fail) revealSpan > catches a reveal that gives ground back [0.18ms]
//        (fail) report > says so when the revealed route goes backwards [0.12ms]
//        44 pass, 2 fail
//
// M6 — `live-scroll-map.mjs`: `plateToLonLat` interpolates latitude LINEARLY (`corners.north +
//      (point[1]/frame.height) * (corners.south - corners.north)`) instead of through Mercator,
//      which is the mistake this projection invites.
//
//        error: expect(received).toBeCloseTo(expected, precision)
//        Expected: 46.479
//        Received: 46.34595884179589
//        Received difference: 0.133041158204108
//        (fail) the live camera > reads the plate's own centre back as the place it stands for [0.38ms]
//        (fail) the live camera > puts the fixed camera where the contain fit says, at every width [0.22ms]
//        44 pass, 2 fail
//
//      TWO tests, and which two matters. The CORNERS test stays green, because a linear and a
//      Mercator interpolation agree at both ends of the frame; and the `viewForCamera` test stays
//      green, because it compares the camera against `plateToLonLat` — both mutated, so it compares
//      a wrong number with itself. Only a point in the MIDDLE, against an independently derived
//      value, can see this defect. 0.133° is about 15 km here, and the error grows with the
//      latitude span, which is what makes the linear version look plausible right up until it does
//      not.
//
// M7 — `route-drive.mjs`: `containCamera` fits with `Math.max` instead of `Math.min` — a COVER fit,
//      which is what this beat's frame effectively had before, and which crops the plate's own
//      right edge away, taking badge 9 (Ukraine, the delta) off the picture entirely in a step
//      whose sentence is about the delta.
//
//        error: expect(received).toBeLessThanOrEqual(expected)
//        Expected: <= 1600.001
//        Received: 1757.142857142857
//        (fail) the camera is a contain fit > never crops the plate, at any frame shape [0.24ms]
//        (fail) the camera is a contain fit > letterboxes into the ground rather than cropping
//        (fail) the camera is a contain fit > spans the full width at every frame this beat is
//               verified at — the owner's own instruction [0.09ms]
//        (fail) the live camera > puts the fixed camera where the contain fit says, at every width [0.15ms]
//        42 pass, 4 fail
//
// M8 — `route-drive.mjs`: `arrivalOpacity` ramps over a fixed 40 samples from `from` regardless of
//      `to` (`const t = (reveal - from) / 40;`). The four authored pictures then stop being exact:
//      Slovakia is 40% arrived at the opening step instead of fully there.
//
//        error: expect(received).toBe(expected)
//        Expected: 1
//        Received: 0.4
//        (fail) the reveal passes exactly through the four authored pictures > SVK is fully arrived
//               at the opening stop [0.20ms]
//        (fail) the reveal passes exactly through the four authored pictures > every territory is
//               fully arrived by the end [0.04ms]
//        44 pass, 2 fail
//
// M9 — `route-drive.mjs`: `avoidStripe` returns `x` unchanged — the guarantee the vehicle's ninth
//      correction replaced "they never meet" with, removed. It bites harder here than on the
//      sibling because this camera is FIXED: a badge that straddles a card edge straddles it at
//      every scroll position, so it is sliced on every frame the card spends at its row.
//
//        error: expect(received).toBe(expected)
//        Expected: 340
//        Received: 400
//        (fail) a badge is never cut down its side by the prose card > moves a straddling badge
//               wholly outside the stripe when that is nearer [0.20ms]
//        45 pass, 1 fail
//
// M10 — `render.mjs`: the three `createElement` calls that inline maplibre's CSS, maplibre's JS and
//       the boot script are deleted and the page re-rendered (1 092 022 bytes → 177 109). This is
//       R1 being removed from the beat in silence, and it is the mutation that matters most: every
//       scroll guard above stays green, because the plate underneath is a complete picture and the
//       reveal still works. `drive.mjs` stays green too. Only this block sees it.
//
//        error: expect(received).toBeGreaterThan(expected)
//        Expected: > 50
//        Received: 0
//        (fail) the committed artifact still carries the live MapTiler layer > inlines maplibre-gl
//               rather than loading it from a second host [0.27ms]
//        (fail) … > boots this beat's own live layer against a MapTiler style [0.82ms]
//        (fail) … > constructs the map with no controls, because the scroll is the only thing that
//               drives it [0.77ms]
//        (fail) … > carries the delivery placeholder and no key at all (R1b) [0.10ms]
//        42 pass, 4 fail
//
// M11 — `route-drive.mjs`: `strokeWidthsFor` hands the declared widths over untouched
//       (`return { ...STROKE_SCREEN_PX };`) — i.e. `vector-effect: non-scaling-stroke` is believed,
//       which is the state this beat shipped in and the state the owner drove. It is the mutation
//       this guard exists for, and it has TWO reds because the defect has two halves: the
//       arithmetic, and the paint.
//
//        error: expect(received).toBeCloseTo(expected, precision)
//        Expected: 3.5
//        Received: 6.222300000000001
//        (fail) the river is drawn at a width a reader can follow > divides the camera's own scale
//               back out, so the drawn width is the declared one [0.13ms]
//        52 pass, 1 fail
//
//       and then, re-rendered and re-driven in the same copy — the reading taken off the SCREENSHOT
//       at each width, which is the only place this defect was ever visible:
//
//        error: the drawn line: 1600x900: the river draws at 6.61px, over the 5px ceiling — a pipe
//        that swallows its own meanders; 1280x800: the river draws at 5.35px, over the 5px ceiling
//        — a pipe that swallows its own meanders; 375x812: the river draws at 1.80px, under the 2px
//        floor — a hairline; the river draws 1.80px at one width and 6.61px at another (spread
//        4.81px, allowed 1.5px) — the stroke is tracking the camera's scale instead of the screen
//
//       Every other guard in this file and every sweep in `drive.mjs` stays GREEN under M11, and so
//       would any assertion on the markup: the file says `stroke-width="3.5"` throughout.
//
// M12 — `MapFrame.tsx`: the route's dash pattern is declared HALF the path's length
//       (`strokeDasharray: routeLength / 2`), so it repeats — "dash L/2, gap L/2, dash L/2 …" — and
//       a second dash reappears at the far end as soon as the offset is non-zero. This is the shape
//       the owner reported (*"on a deux bouts de ligne"*) and the one a progressive reveal invites,
//       because `stroke-dasharray` repeats infinitely and a single value means dash-then-gap.
//       Re-rendered and re-driven in the copy:
//
//        error: the reveal's shape: 1600x900 step 1: the river's first 36% is absent while later
//        stretches are painted — the reveal is not starting at the source; 1600x900 step 2: the
//        river is painted in 3 pieces — [[0,0.145],[0.515,0.56],[0.64,1]] of its own length, with
//        real gaps between them, where a progressive reveal must paint ONE prefix; 1600x900 step 3:
//        the river is painted in 2 pieces — [[0,0.56],[0.98,1]] …; 1600x900 step 4: at the last
//        step the river reaches only 56.0% of its own length — the journey never finishes
//
//       Every scroll sweep stays green under M12, and so does `revealSpan`: the beat's own
//       "the map only ever gains ground" is about the reveal's EXTENT, and this is about its SHAPE.
//
// M13 — `route-drive.mjs`: every badge is mirrored to the far side of the frame
//       (`frame.width - clamp(ax)`), i.e. the annotation placed away from what it annotates, which
//       is what draws an arrow across the map rather than a pointer from a label to its place.
//
//        error: the leaders: 1600x900 step 3: a leader is 1196px long across a 1798px frame (67% of
//        its diagonal, allowed 25%) — that reads as an arrow drawn across the map, not as a pointer
//        from a label to its place
//
//       A first attempt at this mutation — `avoidStripe` throwing a STRADDLING badge to the far
//       side — reddened only the unit test and left `drive.mjs` green, because no badge straddles a
//       card edge at any driven width and the leader path is empty. Recorded because it is the
//       shape of a mutation that looks sufficient and is not.

import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  MAX_SCALE,
  arrivalOpacity,
  avoidStripe,
  containCamera,
  lengthFractionAt,
  progressSourceOf,
  project,
  readProgress,
  revealAt,
  STROKE_SCREEN_PX,
  strokeWidthsFor,
} from "./route-drive.mjs";
import {
  bakeZoomOf,
  keyPlaceholder,
  plateToLonLat,
  viewForCamera,
} from "./live-scroll-map.mjs";
import {
  DRAWN_LINE_PX,
  LEADER_MAX_OF_DIAGONAL,
  REVEAL_SHAPE,
  fluidity,
  leaderLength,
  lineWeight,
  progressDisagreement,
  report,
  revealShape,
  revealSpan,
} from "./scroll-report.mjs";

const HERE = import.meta.dirname;

/** The smallest thing `progressSourceOf`/`readProgress` accept: they only ever call `getAttribute`
 *  and walk `parentElement`, so a plain object is a faithful stand-in and no DOM emulation is
 *  needed to state what they must do. */
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
    activeStep: "source",
    activeIndex: 0,
    paintMoving: 1,
    paintAll: 1,
    panelFraction: 0.16,
    portHeight: 820,
    panelVisibleBoxes: [],
    marked: [],
    state: {
      reveal: 371,
      fraction: 0.3612,
      scale: 1.7778,
      clamped: 0,
      rasterPerPixel: 1.125,
    },
    graphic: { left: 0, right: 1600, top: 80, bottom: 900 },
    column: { left: 0, right: 1600, top: 80, bottom: 900 },
    ...over,
  };
}

/** A whole clean sweep: four steps, the signal moving every frame, the line growing with it. */
function cleanSweep() {
  const steps = ["source", "plain", "border-run", "delta"];
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
      state: {
        reveal: 371 + i,
        fraction: Number((0.3612 + (i * 0.6388) / 60).toFixed(5)),
        scale: 1.7778,
        clamped: 0,
        rasterPerPixel: 1.125,
      },
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
    const visual = node({ "data-visual": "danube-route" }, stack);
    expect(progressSourceOf(visual)).toBe(scrolly);
    expect(progressSourceOf(node({}, node({})))).toBe(null);
  });
});

// ── The camera ─────────────────────────────────────────────────────────────────────────────────

const PLATE = { width: 900, height: 420 };

describe("the camera is a contain fit", () => {
  // The three frames this beat is verified at, as `drive.mjs` measures their graphic boxes.
  const FRAMES = [
    { width: 1600, height: 820 },
    { width: 1280, height: 720 },
    { width: 375, height: 617 },
  ];

  it("never crops the plate, at any frame shape", () => {
    for (const box of FRAMES) {
      const camera = containCamera(box, PLATE, MAX_SCALE);
      expect(PLATE.width * camera.scale).toBeLessThanOrEqual(box.width + 0.001);
      expect(PLATE.height * camera.scale).toBeLessThanOrEqual(
        box.height + 0.001,
      );
    }
  });

  it("letterboxes into the ground rather than cropping", () => {
    for (const box of FRAMES) {
      const camera = containCamera(box, PLATE, MAX_SCALE);
      expect(camera.tx).toBeGreaterThanOrEqual(0);
      expect(camera.ty).toBeGreaterThanOrEqual(0);
    }
  });

  it("spans the full width at every frame this beat is verified at — the owner's own instruction", () => {
    // The plate is 2.14:1 and none of these boxes is wider than that per unit of height, so the
    // WIDTH binds and "contain" and "fill the width" are the same number here. Stated as a
    // measurement rather than an assumption, because it stops being true on a frame wider than
    // 2.14:1 — and there contain is what keeps badge 9 on the picture.
    for (const box of FRAMES) {
      const camera = containCamera(box, PLATE, MAX_SCALE);
      expect(PLATE.width * camera.scale).toBeCloseTo(box.width, 6);
    }
  });

  it("puts the plate's own centre at the frame's centre", () => {
    const box = { width: 1600, height: 820 };
    const camera = containCamera(box, PLATE, MAX_SCALE);
    expect(project([PLATE.width / 2, PLATE.height / 2], camera)).toEqual([
      box.width / 2,
      box.height / 2,
    ]);
  });

  it("clamps at the raster the bake actually paid for", () => {
    // A 900-unit plate in a 4000px frame would want 4.4x; the bake captured at deviceScaleFactor 2,
    // so past 2x the FALLBACK is being magnified beyond its own resolution.
    const camera = containCamera(
      { width: 4000, height: 2000 },
      PLATE,
      MAX_SCALE,
    );
    expect(camera.scale).toBe(MAX_SCALE);
    expect(camera.clamped).toBe(true);
  });
});

// ── The reveal ─────────────────────────────────────────────────────────────────────────────────

/** This beat's own numbers, as `render.mjs` derives them from the route and asserts against the
 *  step table in `BRIEF.md`: each territory's first route index, and each step's own cutoff. */
const FIRST = {
  DEU: 0,
  AUT: 249,
  SVK: 355,
  HUN: 371,
  HRV: 497,
  SRB: 506,
  ROU: 639,
  BGR: 722,
  UKR: 898,
};
const STOPS = [371, 639, 898, 910];
const ARRIVAL = 60;
const TO = (key: keyof typeof FIRST, next: number) =>
  FIRST[key] + Math.min(next - FIRST[key], ARRIVAL);

describe("the reveal passes exactly through the four authored pictures", () => {
  it("draws the line to each step's own cutoff at each step", () => {
    STOPS.forEach((stop, i) => expect(revealAt(STOPS, i, false)).toBe(stop));
  });

  it("SVK is fully arrived at the opening stop", () => {
    // Slovakia enters at 355 and Hungary at 371, so Slovakia finishes arriving exactly where the
    // first step stops — which is what makes the opening picture show three territories and not a
    // fourth half-painted one.
    expect(arrivalOpacity(STOPS[0], FIRST.SVK, TO("SVK", FIRST.HUN))).toBe(1);
  });

  it("the territory a step INTRODUCES is at exactly zero on the step before it", () => {
    expect(arrivalOpacity(STOPS[0], FIRST.HUN, TO("HUN", FIRST.HRV))).toBe(0);
    expect(arrivalOpacity(STOPS[1], FIRST.ROU, TO("ROU", FIRST.BGR))).toBe(0);
    expect(arrivalOpacity(STOPS[2], FIRST.UKR, TO("UKR", 910))).toBe(0);
  });

  it("every territory is fully arrived by the end", () => {
    for (const [key, from] of Object.entries(FIRST)) {
      const order = Object.keys(FIRST);
      const nextKey = order[order.indexOf(key) + 1] as
        keyof typeof FIRST | undefined;
      const next = nextKey ? FIRST[nextKey] : 910;
      expect(
        arrivalOpacity(910, from, from + Math.min(next - from, ARRIVAL)),
      ).toBe(1);
    }
  });

  it("never gives ground back — the reveal is monotone in the reader's own direction", () => {
    let previous = -1;
    for (let p = 0; p <= 3; p += 0.01) {
      const reveal = revealAt(STOPS, p, false);
      expect(reveal).toBeGreaterThanOrEqual(previous);
      previous = reveal;
    }
  });

  it("snaps to an authored stop under reduced motion, reaching every one of them", () => {
    const reached = new Set(
      [0, 0.4, 0.6, 1.2, 1.9, 2.4, 3].map((p) => revealAt(STOPS, p, true)),
    );
    expect([...reached].sort((a, b) => a - b)).toEqual(STOPS);
  });

  it("measures the line by LENGTH, not by sample count", () => {
    // Three samples, the second one a long way from the first and the third close behind it: half
    // way by index is nowhere near half way by length, and a line dashed by index would crawl
    // through the dense stretches and race through the sparse ones.
    const cum = [0, 0.9, 1];
    expect(lengthFractionAt(cum, 1)).toBe(0.9);
    expect(lengthFractionAt(cum, 0.5)).toBeCloseTo(0.45, 12);
    expect(lengthFractionAt(cum, 0)).toBe(0);
    expect(lengthFractionAt(cum, 2)).toBe(1);
    expect(lengthFractionAt(cum, 5)).toBe(1);
  });
});

// ── What a driven sweep means ──────────────────────────────────────────────────────────────────

describe("fluidity", () => {
  it("names the frames where the step held, the signal moved and the picture did not", () => {
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
      step: "source",
      progress: 0.28,
    });
    expect(flow.paintChanged).toBe(1);
  });

  it("does not ask the picture to move where the signal itself is clamped", () => {
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
        activeStep: "source",
        paintMoving: 1,
        paintAll: 1,
      }),
      frame({
        scrollY: 30,
        progress: 0.51,
        activeStep: "plain",
        paintMoving: 1,
        paintAll: 1,
      }),
    ];
    expect(fluidity(samples).intraStepFrames).toBe(0);
  });
});

describe("revealSpan", () => {
  it("catches a reveal that gives ground back", () => {
    const samples = [
      frame({ scrollY: 0, state: { fraction: 0.4 } }),
      frame({ scrollY: 30, state: { fraction: 0.6 } }),
      frame({ scrollY: 60, state: { fraction: 0.4 } }),
    ];
    expect(revealSpan(samples, true).worstBacktrack).toBe(0.2);
  });

  it("reads an upward sweep in its own direction", () => {
    const samples = [
      frame({ scrollY: 60, state: { fraction: 1 } }),
      frame({ scrollY: 30, state: { fraction: 0.7 } }),
      frame({ scrollY: 0, state: { fraction: 0.4 } }),
    ];
    expect(revealSpan(samples, false).worstBacktrack).toBe(0);
    expect(revealSpan(samples, false).reached).toBe(0.6);
  });

  it("says so rather than reporting zero when the driver published nothing", () => {
    expect(revealSpan([frame({ state: null })], true)).toEqual({
      span: null,
      worstBacktrack: null,
      frames: 0,
    });
  });
});

describe("progressDisagreement", () => {
  it("catches a beat that derives its own opinion of the position instead of reading the published one", () => {
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

  it("says so when the revealed route goes backwards", () => {
    const samples = cleanSweep();
    samples[30].state = { ...samples[30].state, fraction: 0.2 };
    const problems = report("1600x900 down", samples, 4).problems.filter((p) =>
      p.includes("BACKWARDS by"),
    );
    expect(problems).toHaveLength(1);
  });

  it("says so when a step is unreachable", () => {
    const samples = cleanSweep().map((s) => ({
      ...s,
      progress: Math.min(s.progress, 2.7),
    }));
    expect(report("1600x900 down", samples, 4).problems.join(" ")).toContain(
      "unreachable",
    );
  });
});

// ── The live MapTiler layer ────────────────────────────────────────────────────────────────────

/**
 * `verify-live-tiles.mjs` drives the real thing with a real key; these are the derivations it rests
 * on, and they are here because they are the ones that can be wrong in silence. A camera that lands
 * a degree off looks like a map.
 */

/** This beat's own plate, as `plate/geometry.json` records it. */
const GEOMETRY = {
  frame: { width: 900, height: 420 },
  frameCorners: {
    west: 6.300000000002541,
    north: 50.15432451904405,
    east: 30.000000000002814,
    south: 42.53759316454773,
  },
  worldWidthPx: 13670.9,
};

describe("the live camera", () => {
  it("reads the plate's own corners back as the corners the bake recorded", () => {
    const [west, north] = plateToLonLat([0, 0], GEOMETRY);
    const [east, south] = plateToLonLat([900, 420], GEOMETRY);
    expect(west).toBeCloseTo(GEOMETRY.frameCorners.west, 6);
    expect(north).toBeCloseTo(GEOMETRY.frameCorners.north, 6);
    expect(east).toBeCloseTo(GEOMETRY.frameCorners.east, 6);
    expect(south).toBeCloseTo(GEOMETRY.frameCorners.south, 6);
  });

  it("reads the plate's own centre back as the place it stands for", () => {
    // Mercator, not linear: the mid-height row of a frame spanning 42.538°N to 50.154°N is NOT the
    // arithmetic mean of the two. Independently: mercatorY(50.15432) = 1.00133 and
    // mercatorY(42.53759) = 0.81276, whose midpoint 0.90705 inverts to 46.479°. The arithmetic mean
    // is 46.346° — 0.13 degrees, about 15 km, on a plate this size — and the error grows with the
    // latitude span, which is what makes the linear version look plausible right up until it does
    // not.
    const [lon, lat] = plateToLonLat([450, 210], GEOMETRY);
    expect(lon).toBeCloseTo(18.15, 6);
    expect(lat).toBeCloseTo(46.479, 3);
  });

  it("turns a resolved camera into the map's own centre and zoom", () => {
    // A camera drawing the plate 1:1 with its top-left at the frame's origin: the map's centre is
    // the plate point under the frame's centre, and its zoom is the bake's own.
    const box = { width: 800, height: 600 };
    const view = viewForCamera({ scale: 1, tx: 0, ty: 0 }, box, GEOMETRY);
    expect(view.zoom).toBeCloseTo(Math.log2(GEOMETRY.worldWidthPx / 512), 6);
    expect(view.center).toEqual(plateToLonLat([400, 300], GEOMETRY));
  });

  it("moves one zoom level per doubling of the camera's scale", () => {
    const box = { width: 800, height: 600 };
    const one = viewForCamera({ scale: 1, tx: 0, ty: 0 }, box, GEOMETRY);
    const two = viewForCamera({ scale: 2, tx: 0, ty: 0 }, box, GEOMETRY);
    expect(two.zoom - one.zoom).toBeCloseTo(1, 12);
  });

  it("agrees with the bake's own recorded zoom", () => {
    expect(bakeZoomOf(GEOMETRY)).toBeCloseTo(4.739, 3);
  });

  it("puts the fixed camera where the contain fit says, at every width", () => {
    // The one camera this beat has, resolved at the three verified frames. Its CENTRE is the same
    // place at all three — the plate's own centre — and only the zoom changes, which is the whole
    // reason a build-time warm list could not have been right for more than one of them.
    const centres = [
      { width: 1600, height: 820 },
      { width: 1280, height: 720 },
      { width: 375, height: 617 },
    ].map((box) =>
      viewForCamera(
        containCamera(box, GEOMETRY.frame, MAX_SCALE),
        box,
        GEOMETRY,
      ),
    );
    for (const view of centres) {
      expect(view.center[0]).toBeCloseTo(18.15, 6);
      expect(view.center[1]).toBeCloseTo(46.479, 3);
    }
    expect(centres.map((v) => Number(v.zoom.toFixed(3)))).toEqual([
      5.569, 5.247, 3.476,
    ]);
  });

  it("refuses a plate that predates the camera facts rather than guessing a place", () => {
    expect(() =>
      plateToLonLat([0, 0], { frame: { width: 10, height: 10 } }),
    ).toThrow("frameCorners");
    expect(() => bakeZoomOf({ frame: { width: 10, height: 10 } })).toThrow(
      "worldWidthPx",
    );
  });
});

describe("a badge is never cut down its side by the prose card", () => {
  const box = { width: 1280, height: 800 };
  const stripe = { left: 435, right: 845 };

  it("leaves a badge that is already clear of the card where it is", () => {
    expect(avoidStripe(200, 13, stripe, box)).toBe(200);
    expect(avoidStripe(1100, 13, stripe, box)).toBe(1100);
  });

  it("leaves a badge that is already wholly inside the card where it is", () => {
    expect(avoidStripe(640, 13, stripe, box)).toBe(640);
  });

  it("moves a straddling badge wholly outside the stripe when that is nearer", () => {
    // Centre 400, half-width 95: it reaches 495, past the stripe's left edge at 435. Inside costs
    // 130px of movement, outside (to 340) costs 60 — so outside wins here.
    expect(avoidStripe(400, 95, stripe, box)).toBe(340);
    // Centre 480 straddles the same edge, and inside is now the nearer answer.
    expect(avoidStripe(480, 55, stripe, box)).toBe(490);
  });

  it("does nothing on a phone, where the card has no vertical edge inside the frame", () => {
    expect(avoidStripe(180, 13, null, { width: 375, height: 812 })).toBe(180);
  });
});

/**
 * THE RIVER IS DRAWN AT A WIDTH A READER CAN FOLLOW, AT EVERY WIDTH.
 *
 * The owner drove the keyed copy and said *"la ligne de fleuve ne se dessine pas bien."* Measured
 * over the DRAWN pixels of the delivered page, the accent line was 6px at 1600×900, 5px at 1280×800
 * and 1px at 375×812 — the contain fit (1.778 / 1.422 / 0.417) multiplying one declared 3.5,
 * because `vector-effect: non-scaling-stroke` neutralises the viewBox transform (the identity here)
 * and does NOT touch the CSS `scale()` on the ancestor camera box. The markup said 3.5 throughout,
 * so an attribute assertion would have been green while the river drew as a blobby pipe on a
 * desktop and a hairline on a phone.
 *
 * Two halves are guarded here — the arithmetic that puts the intended screen width back, and the
 * verdict `drive.mjs` reaches over its measured pixels. The measurement itself is in `drive.mjs`
 * (it needs a screenshot), and M11 below is the mutation that reddens the whole chain.
 */
describe("the river is drawn at a width a reader can follow", () => {
  it("divides the camera's own scale back out, so the drawn width is the declared one", () => {
    // 1600×900 gives a contain fit of 1.778 and 375×812 gives 0.417 — the two ends this beat is
    // verified at. The user-space width must move opposite to the scale, not with it.
    const wide = strokeWidthsFor(
      containCamera(
        { width: 1600, height: 820 },
        { width: 900, height: 420 },
        MAX_SCALE,
      ),
    );
    const phone = strokeWidthsFor(
      containCamera(
        { width: 375, height: 617 },
        { width: 900, height: 420 },
        MAX_SCALE,
      ),
    );
    expect(wide.route * 1.7778).toBeCloseTo(STROKE_SCREEN_PX.route, 2);
    expect(phone.route * 0.4167).toBeCloseTo(STROKE_SCREEN_PX.route, 2);
    // And the halo and the outlines ride the same correction — the outline is the one whose
    // 0.58px-on-a-phone the old comment claimed the attribute had already fixed.
    expect(phone.halo * 0.4167).toBeCloseTo(STROKE_SCREEN_PX.halo, 2);
    expect(phone.territory * 0.4167).toBeCloseTo(STROKE_SCREEN_PX.territory, 2);
  });

  it("does not fall over when handed a camera it cannot use", () => {
    expect(strokeWidthsFor({ scale: 0 }).route).toBe(STROKE_SCREEN_PX.route);
    expect(strokeWidthsFor(null).route).toBe(STROKE_SCREEN_PX.route);
  });

  it("passes a river drawn at the same weight everywhere", () => {
    expect(
      lineWeight([
        { label: "1600x900", drawnWidthPx: 3.69, samples: 228, rejected: 12 },
        { label: "1280x800", drawnWidthPx: 3.72, samples: 211, rejected: 29 },
        { label: "375x812", drawnWidthPx: 3.99, samples: 137, rejected: 103 },
      ]).problems,
    ).toEqual([]);
  });

  it("catches the hairline and the pipe, by name", () => {
    // The three numbers this beat actually measured before the fix.
    const verdict = lineWeight([
      { label: "1600x900", drawnWidthPx: 6.22, samples: 200, rejected: 40 },
      { label: "1280x800", drawnWidthPx: 4.98, samples: 200, rejected: 40 },
      { label: "375x812", drawnWidthPx: 1.46, samples: 40, rejected: 200 },
    ]);
    expect(verdict.problems.join("\n")).toContain("over the 5px ceiling");
    expect(verdict.problems.join("\n")).toContain("under the 2px floor");
  });

  it("catches a stroke that tracks the camera even when each width alone looks legal", () => {
    // Both inside the band, and still wrong: one declared width cannot draw 2.1px on a phone and
    // 4.9px on a desktop unless something is scaling it.
    const verdict = lineWeight([
      { label: "1600x900", drawnWidthPx: 4.9, samples: 200, rejected: 10 },
      { label: "375x812", drawnWidthPx: 2.1, samples: 120, rejected: 40 },
    ]);
    expect(verdict.problems).toHaveLength(1);
    expect(verdict.problems[0]).toContain("tracking the camera's scale");
  });

  it("treats a line it could not measure as a failure, never as a pass", () => {
    const verdict = lineWeight([
      { label: "375x812", drawnWidthPx: null, samples: 0, rejected: 240 },
    ]);
    expect(verdict.problems).toHaveLength(1);
    expect(verdict.problems[0]).toContain("could not be measured");
    expect(lineWeight([]).problems).toHaveLength(1);
  });

  it("states its own band rather than hiding it in a comparison", () => {
    expect(DRAWN_LINE_PX).toEqual({ floor: 2, ceiling: 5, spread: 1.5 });
  });
});

/**
 * THE REVEAL IS ONE PIECE, IT STARTS AT THE SOURCE, AND IT FINISHES.
 *
 * The owner: *"la rivière s'arrête en plein milieu et ne finit jamais jusqu'à 9… ça c'est l'étape 0
 * et on a deux bouts de ligne."* The defect was NOT found in this build — the header on
 * `revealShape` records the 1508 driven frames it was looked for over, and why the dash as written
 * cannot produce it. It is guarded because nothing held the invariant: every guard this beat had
 * was about the reveal's EXTENT, none about its SHAPE, so a repeating dash, a reveal from the wrong
 * end, or one that stops short would all have been green.
 */
describe("the painted reveal is one piece that starts at the source and finishes", () => {
  const shape = (over: Record<string, unknown>) => ({
    label: "1600x900 step 1",
    step: 1,
    steps: 4,
    reveal: {
      fragments: 1,
      runs: [[0, 0.36]],
      firstPainted: 0,
      firstAbsent: 0.365,
      absent: 0.63,
      hidden: 0.02,
      ...over,
    },
  });

  it("passes a prefix that has not finished yet, on a step that is not the last", () => {
    expect(revealShape([shape({})]).problems).toEqual([]);
  });

  it("catches the two-fragment reveal the owner described, and says where the pieces are", () => {
    // A repeating `stroke-dasharray` gives exactly this: the head, a hole, and the tail of the
    // previous repetition reappearing at the far end.
    const verdict = revealShape([
      shape({
        fragments: 2,
        runs: [
          [0, 0.36],
          [0.78, 1],
        ],
        absent: 0.4,
      }),
    ]);
    expect(verdict.problems).toHaveLength(1);
    expect(verdict.problems[0]).toContain("painted in 2 pieces");
    expect(verdict.problems[0]).toContain("ONE prefix");
  });

  it("catches a reveal that paints from the wrong end", () => {
    const verdict = revealShape([shape({ firstPainted: 0.5, firstAbsent: 0 })]);
    expect(verdict.problems.join("\n")).toContain("not starting at the source");
  });

  it("catches a journey that never finishes, at the last step", () => {
    const verdict = revealShape([
      {
        label: "1600x900 step 4",
        step: 4,
        steps: 4,
        reveal: {
          fragments: 1,
          runs: [[0, 0.82]],
          firstPainted: 0,
          firstAbsent: 0.825,
          absent: 0.17,
          hidden: 0.01,
        },
      },
    ]);
    expect(verdict.problems.join("\n")).toContain("never finishes");
    expect(verdict.problems.join("\n")).toContain("is still unpainted");
  });

  it("passes the last step when the river is complete", () => {
    expect(
      revealShape([
        {
          label: "1600x900 step 4",
          step: 4,
          steps: 4,
          reveal: {
            fragments: 1,
            runs: [[0, 1]],
            firstPainted: 0,
            firstAbsent: null,
            absent: 0,
            hidden: 0.18,
          },
        },
      ]).problems,
    ).toEqual([]);
  });

  it("does NOT call a river the prose card partly lies across two pieces", () => {
    // The point of the third state. Covering is what the vehicle's ninth correction allows; a
    // hidden sample may neither bridge two runs nor stand in for a hole.
    expect(
      revealShape([
        {
          label: "375x812 step 4",
          step: 4,
          steps: 4,
          reveal: {
            fragments: 1,
            runs: [[0, 1]],
            firstPainted: 0,
            firstAbsent: null,
            absent: 0,
            hidden: 0.53,
          },
        },
      ]).problems,
    ).toEqual([]);
  });

  it("catches the card hiding the SUBJECT whole, which is what the owner actually saw", () => {
    // Measured on this build at 375x812, steps 2, 3 and 4: hidden 1.00.
    const verdict = revealShape([
      {
        label: "375x812 step 2",
        step: 2,
        steps: 4,
        reveal: {
          fragments: 0,
          runs: [],
          firstPainted: null,
          firstAbsent: null,
          absent: 0,
          hidden: 1,
        },
      },
    ]);
    expect(verdict.problems).toHaveLength(1);
    expect(verdict.problems[0]).toContain("hide 100% of the river");
    expect(verdict.problems[0]).toContain("two disconnected pieces");
  });

  it("does not also accuse a hidden river of never finishing — that would name the wrong defect", () => {
    const verdict = revealShape([
      {
        label: "375x812 step 4",
        step: 4,
        steps: 4,
        reveal: {
          fragments: 0,
          runs: [],
          firstPainted: null,
          firstAbsent: null,
          absent: 0,
          hidden: 1,
        },
      },
    ]);
    expect(verdict.problems).toHaveLength(1);
    expect(verdict.problems.join()).not.toContain("never finishes");
  });

  it("says so rather than passing when nothing was measured", () => {
    expect(
      revealShape([{ label: "x", step: 1, steps: 4 }]).problems,
    ).toHaveLength(1);
  });

  it("states its own thresholds", () => {
    expect(REVEAL_SHAPE).toEqual({
      completeAt: 0.98,
      headWithin: 0.02,
      hiddenAtMost: 0.95,
    });
  });
});

/**
 * A LEADER IS A SHORT LINE FROM A DISPLACED BADGE BACK TO ITS OWN PLACE.
 *
 * Same report: *"deux flèches rouges traversent tout le cadre en diagonale."* Measured over 1508
 * driven frames, the leader path is EMPTY at four of five viewport shapes and its longest segment
 * is 9px at the other two — the reported arrows are not in this artifact. Bounded anyway, as a
 * fraction of the frame's own diagonal, because "too long to read as a pointer" is a proportion of
 * the picture and this beat is drawn from 375px to 3440px.
 */
describe("a leader is a pointer, not an arrow across the map", () => {
  const frame = { width: 1600, height: 820 }; // diagonal 1798px, so the bound is 450px

  it("passes the empty leader path this build actually draws", () => {
    expect(
      leaderLength([{ label: "1600x900 step 1", frame, leaders: [] }]).problems,
    ).toEqual([]);
  });

  it("passes a short pointer from a displaced badge back to its country", () => {
    expect(
      leaderLength([{ label: "1600x900 step 1", frame, leaders: [{ len: 9 }] }])
        .problems,
    ).toEqual([]);
  });

  it("catches a leader that spans the frame, and reports it as a share of the diagonal", () => {
    const verdict = leaderLength([
      { label: "1600x900 step 1", frame, leaders: [{ len: 1400 }] },
    ]);
    expect(verdict.problems).toHaveLength(1);
    expect(verdict.problems[0]).toContain("78% of its diagonal");
    expect(verdict.problems[0]).toContain("arrow drawn across the map");
  });

  it("scales its bound with the frame rather than fixing a pixel count", () => {
    // 300px is fine on a desktop and an arrow across a phone.
    expect(
      leaderLength([{ label: "wide", frame, leaders: [{ len: 300 }] }])
        .problems,
    ).toEqual([]);
    expect(
      leaderLength([
        {
          label: "phone",
          frame: { width: 375, height: 617 },
          leaders: [{ len: 300 }],
        },
      ]).problems,
    ).toHaveLength(1);
  });

  it("states its own bound", () => {
    expect(LEADER_MAX_OF_DIAGONAL).toBe(0.25);
  });
});

/**
 * THE ONE THING NEITHER DRIVEN PROBE CAN GUARD: that the COMMITTED artifact still contains the live
 * layer. `drive.mjs` passes on a page with no map at all — the plate underneath is a complete
 * picture, which is exactly what makes the fallback a good fallback and a silent regression
 * invisible. `verify-live-tiles.mjs` is not in `bun test` at all: it needs a real key and a real
 * network. So this reads the delivered file.
 */
describe("the committed artifact still carries the live MapTiler layer", () => {
  const html = readFileSync(
    join(HERE, "render", "danube-scrolly.html"),
    "utf8",
  );
  const count = (needle: string) => html.split(needle).length - 1;

  it("inlines maplibre-gl rather than loading it from a second host", () => {
    // The owner's own test, as a number: `grep -c maplibregl` over this file returned 0 before the
    // ruling landed.
    expect(count("maplibregl")).toBeGreaterThan(50);
    expect(count("<script src=")).toBe(0);
  });

  it("boots this beat's own live layer against a MapTiler style", () => {
    expect(html).toContain("initLiveScrollMap(root,");
    expect(html).toContain(
      "https://api.maptiler.com/maps/dataviz-light/style.json",
    );
    expect(html).toContain('"warmEnabled":true');
  });

  it("constructs the map with no controls, because the scroll is the only thing that drives it", () => {
    // The owner, 2026-08-10: *"Pas de controls sur le scrolly, le scroll pilote."* Asserted on the
    // BEAT's own inlined source rather than on the whole file, because maplibre's own bundle defines
    // a `NavigationControl` class whatever this beat does with it.
    const live = readFileSync(join(HERE, "live-scroll-map.mjs"), "utf8");
    expect(live).toContain("interactive: false");
    expect(live).not.toContain("addControl");
    expect(live).not.toContain("new win.maplibregl.NavigationControl");
    expect(html).toContain("interactive: false");
  });

  it("carries the delivery placeholder and no key at all (R1b)", () => {
    expect(count(keyPlaceholder())).toBe(1);
    // A real MapTiler key is 32 URL-safe characters; the placeholder is the only thing that may
    // follow `key=` in a tracked file.
    for (const match of html.matchAll(
      /api\.maptiler\.com[^"'\s]*key=([^"'&\s]+)/g,
    ))
      expect(match[1]).toBe(keyPlaceholder());
  });

  it("keeps the baked plate underneath as the fallback, inline and requesting nothing", () => {
    expect(html).toContain('data-layer="plate"');
    expect(html).toContain('src="data:image/png;base64,');
    // Not `count("http://") === 0`: maplibre's own bundle carries XML namespace URLs and its
    // license header. What must be zero is a SUBRESOURCE this page would fetch — the whole request
    // budget of this file is one host, api.maptiler.com, and the plate is not on it.
    expect(count('src="http')).toBe(0);
    expect(count("<link ")).toBe(0);
  });
});
