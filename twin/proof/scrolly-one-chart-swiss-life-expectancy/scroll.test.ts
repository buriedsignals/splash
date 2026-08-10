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
// M1 — `chart-drive.mjs`: `readProgress` returns 0 instead of throwing on a missing or garbled attribute
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
//        + [ { "from": 0, "progress": 0, "step": "shape", "to": 30 },
//        +   { "from": 30, "progress": 0, "step": "shape", "to": 60 } ]
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
// M5 — `chart-drive.mjs`: the mark's fade goes back to the X domain alone (the two `clamp01` terms
//      on `y` removed). This is the defect exactly as it shipped, and it is the one that was found
//      by OPENING the mid-flight screenshot rather than by any assertion.
//
//        error: expect(received).toEqual(expected)
//        - []
//        + [ { "at": 2.33,  "opacity": 0.7822, "out": 1.97,  "y": 501.97 },
//        +   { "at": 2.34,  "opacity": 0.7688, "out": 9.75,  "y": 509.75 },
//        +   … 116 positions …
//        +   { "at": 2.42,  "opacity": 0.0888, "out": 94.24, "y": 594.24 } ]
//        (fail) no mark is ever drawn outside the plot it belongs to > keeps every visible mark
//               inside the plot at every position on the scrub [20.19ms]
//        15 pass, 1 fail
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

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "bun:test";
import {
  VIEWBOX,
  chartGeometry,
  progressSourceOf,
  readProgress,
  stateAt,
} from "./chart-drive.mjs";
import { deriveFacts, parseReadings } from "./life-data.ts";
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
    activeStep: "shape",
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
  const steps = ["shape", "worst", "recovery", "decade"];
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
    const visual = node({ "data-visual": "one-chart" }, stack);
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
      step: "shape",
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
        activeStep: "shape",
        paintMoving: 1,
        paintAll: 1,
      }),
      frame({
        scrollY: 30,
        progress: 0.51,
        activeStep: "worst",
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

describe("no mark is ever drawn outside the plot it belongs to", () => {
  /** The four authored states, rebuilt from the beat's own frozen file exactly as `render.mjs`
   *  builds them — so this guard is about the picture that ships, not about an invented one. */
  function beat() {
    const csv = readFileSync(join(import.meta.dir, "swiss-life-expectancy.csv"), "utf8");
    const readings = parseReadings(csv);
    const facts = deriveFacts(readings, "Switzerland");
    const fullPad = (facts.fullHi - facts.fullLo) * 0.08;
    const decadePad = (facts.decadeHi - facts.decadeLo) * 0.22;
    const full = {
      x0: facts.firstYear,
      x1: facts.lastYear,
      y0: facts.fullLo - fullPad,
      y1: facts.fullHi + fullPad,
    };
    const decade = {
      x0: facts.decadeFrom,
      x1: facts.lastYear,
      y0: facts.decadeLo - decadePad,
      y1: facts.decadeHi + decadePad,
    };
    const off = { hiFrom: facts.worst.year, hiTo: facts.worst.year, hiOpacity: 0 };
    const states = [
      { ...full, ...off, bandFrom: facts.worst.year - 1, bandTo: facts.worst.year, bandOpacity: 0, markA: 0, markB: 0 },
      { ...full, hiFrom: facts.worst.year - 1, hiTo: facts.worst.year, hiOpacity: 1, bandFrom: facts.worst.year - 1, bandTo: facts.worst.year, bandOpacity: 0, markA: 1, markB: 0 },
      { ...full, hiFrom: facts.worst.year, hiTo: facts.recoveryYear, hiOpacity: 1, bandFrom: facts.worst.year, bandTo: facts.recoveryYear, bandOpacity: 0.16, markA: 1, markB: 0 },
      { ...decade, hiFrom: facts.covid.year - 1, hiTo: facts.covid.year, hiOpacity: 1, bandFrom: facts.covid.year - 1, bandTo: facts.covid.year, bandOpacity: 0, markA: 0, markB: 1 },
    ];
    const marks = [
      { year: facts.worst.year, label: `${facts.worst.year}` },
      { year: facts.covid.year, label: `${facts.covid.year}` },
    ];
    return { readings, states, marks };
  }

  it("keeps every visible mark inside the plot at every position on the scrub", () => {
    // The defect the continuous scrub exposed: the last reading narrows BOTH domains, and the y
    // domain closes onto 82.4-84.2 several tenths of a step before x0 passes 1918 — so the 1918
    // mark sank out of the bottom of the plot, onto the x-tick strip and the credit, while its own
    // opacity was still above a half. Frozen at state 0, as this beat shipped, nobody could see it.
    const { readings, states, marks } = beat();
    const escapes = [];
    for (let p = 0; p <= 3.0005; p += 0.005) {
      const geometry = chartGeometry(readings, stateAt(states, p, false), marks);
      for (const mark of geometry.marks) {
        if (mark.opacity <= 0.02) continue;
        const out = Math.max(mark.y - VIEWBOX.height, -mark.y, -mark.x, mark.x - VIEWBOX.width, 0);
        if (out > 0) escapes.push({ at: Number(p.toFixed(3)), y: mark.y, opacity: mark.opacity, out });
      }
    }
    expect(escapes).toEqual([]);
  });

  it("still shows each reading's own mark at full strength where that reading asks for it", () => {
    // The fade must not have been bought by dimming the thing the sentence names.
    const { readings, states, marks } = beat();
    const atRest = states.map((s) => chartGeometry(readings, s, marks).marks.map((m) => m.opacity));
    expect(atRest).toEqual([
      [0, 0],
      [1, 0],
      [1, 0],
      [0, 1],
    ]);
  });
});
