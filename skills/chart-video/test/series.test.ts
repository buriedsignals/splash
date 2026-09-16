/**
 * EVERY HELPER IN `scripts/series.mjs`, HELD TO THE BEATS IT WAS HARVESTED FROM.
 *
 * The point of this file is not that the helpers compute SOMETHING; it is that each one computes what a shipped beat
 * already computed by hand, on that beat's own frozen data. So each test carries one of two kinds of oracle:
 *
 *   - THE BEAT'S OWN MODULE, imported and run (a skill's `test/` may import out, solely to assert two implementations
 *     agree — `skills/splash/test/no-cross-skill-imports.test.ts`). That is how `fieldAtOf`, `moveOf` and the easing
 *     primitives are checked.
 *   - THE EXPRESSION THE BEAT CARRIED, quoted here with the file and line it was read from, run on the beat's real
 *     readings. That is how the path builders, the clearance check and the counter table are checked: they live inside
 *     a `sceneAt`/`buildDirection` that would need a whole composed direction to call.
 *
 * Two beats stand behind every helper, per the harvest: `proof/video-area-swiss-co2` and `proof/video-line-swiss-co2`
 * for the line/area family's mechanics, `proof/video-cold-world-population` and `proof/video-cold2-world-population`
 * for the counter, the crossing and the clearance.
 */
import { describe, expect, it } from "bun:test";
import { EVENT_ORDER, progressOf } from "#shared/chart-video/timing.ts";
import {
  clamp01 as revealClamp01,
  ease as revealEase,
  lerp as revealLerp,
} from "../../scrolly/assets/reveal.mjs";
import {
  areaPath,
  clamp01,
  curveTopOver,
  drawnTo,
  ease,
  fieldAtOf,
  firstCrossing,
  firstYearGap,
  lerp,
  measuredTexts,
  moveOf,
  polylinePath,
  reachAlong,
  round1,
  standsClearOfCurve,
  widestOf,
} from "../scripts/series.mjs";

import {
  fieldAt as areaFieldAt,
  WINDOWS as AREA_WINDOWS,
} from "../../../proof/video-area-swiss-co2/scene.mjs";
import { statesFor as areaStates } from "../../../proof/video-area-swiss-co2/states.mjs";
import { loadSubject as loadArea } from "../../../proof/video-area-swiss-co2/subject.mjs";
import { AREA_VIDEO_TIMING } from "../../../proof/video-area-swiss-co2/timing-contract.ts";
import {
  fieldAt as lineFieldAt,
  WINDOWS as LINE_WINDOWS,
} from "../../../proof/video-line-swiss-co2/scene.mjs";
import { statesFor as lineStates } from "../../../proof/video-line-swiss-co2/states.mjs";
import { LINE_VIDEO_TIMING } from "../../../proof/video-line-swiss-co2/timing-contract.ts";
import { moveOf as barMoveOf } from "../../../proof/video-bar-top-emitters-2024/scene.mjs";
import { moveOf as scatterMoveOf } from "../../../proof/video-connected-scatter-lowcarbon/scene.mjs";
import { loadSubject as loadPopulation } from "../../../archive/video-cold-world-population/subject.mjs";

// ── the two beats' real series, projected the way their own builds project them ────────────────────────────────────

const area = loadArea();
const population = loadPopulation();

/** `video-area-swiss-co2/build.mjs`: a zero-based plot, the years across it, one decimal on every coordinate. */
const areaPlot = { left: 120, right: 1800, top: 80, bottom: 900 };
const areaTop = Math.max(...area.readings.map((r) => r.mt));
const areaX = (year: number) =>
  areaPlot.left +
  ((year - area.readings[0].year) /
    (area.readings.at(-1)!.year - area.readings[0].year)) *
    (areaPlot.right - areaPlot.left);
const areaY = (mt: number) =>
  areaPlot.bottom - (mt / areaTop) * (areaPlot.bottom - areaPlot.top);
const areaPoints = area.readings.map((r: { year: number; mt: number }) => ({
  year: r.year,
  x: round1(areaX(r.year)),
  y: round1(areaY(r.mt)),
  mt: r.mt,
}));

const popPlot = { left: 140, right: 1760, top: 70, bottom: 880 };
const popX = (year: number) =>
  popPlot.left +
  ((year - population.first.year) /
    (population.last.year - population.first.year)) *
    (popPlot.right - popPlot.left);
const popY = (pop: number) =>
  popPlot.bottom - (pop / 9.4e9) * (popPlot.bottom - popPlot.top);
const popPoints = population.readings.map(
  (r: { year: number; pop: number }) => ({
    year: r.year,
    x: round1(popX(r.year)),
    y: round1(popY(r.pop)),
    pop: r.pop,
  }),
);

// ═══ the motion mechanics ═════════════════════════════════════════════════════════════════════════════════════════

describe("the easing primitives carried into chart-video", () => {
  it("should be the same clamp01, ease and lerp the beats take from the scrolly skill", () => {
    const ts = [-0.5, 0, 0.1, 0.25, 0.4999, 0.5, 0.75, 1, 1.4];
    expect(ts.map(clamp01)).toEqual(ts.map(revealClamp01));
    expect(ts.map(ease)).toEqual(ts.map(revealEase));
    expect(ts.map((t) => lerp(12, 47, t))).toEqual(
      ts.map((t) => revealLerp(12, 47, t)),
    );
  });

  it("should round a coordinate to one decimal, the way every path in a beat does", () => {
    expect([round1(12.34), round1(12.35), round1(-0.04), round1(900)]).toEqual([
      12.3, 12.4, -0, 900,
    ]);
  });
});

describe("moveOf — the k-th of n staggered moves", () => {
  it("should reproduce video-bar-top-emitters-2024's own moveOf at its 0.3 share", () => {
    const got: number[] = [];
    const want: number[] = [];
    for (let k = 0; k < 5; k++)
      for (let t = 0; t <= 1.0001; t += 0.05) {
        got.push(moveOf(t, k, 5, 0.3));
        want.push(barMoveOf(t, k, 5));
      }
    expect(got).toEqual(want);
  });

  it("should reproduce video-connected-scatter-lowcarbon's own moveOf at its default share", () => {
    const got: number[] = [];
    const want: number[] = [];
    for (let k = 0; k < 8; k++)
      for (let t = 0; t <= 1.0001; t += 0.05) {
        got.push(moveOf(t, k, 8));
        want.push(scatterMoveOf(t, k, 8));
      }
    expect(got).toEqual(want);
  });

  it("should give a lone move the whole window, never divide by zero", () => {
    expect([
      moveOf(0, 0, 1, 0.3),
      moveOf(0.15, 0, 1, 0.3),
      moveOf(0.3, 0, 1, 0.3),
      moveOf(1, 0, 1, 0.3),
    ]).toEqual([0, 0.5, 1, 1]);
  });
});

describe("fieldAtOf — the windowed, eased field accumulator", () => {
  // The two sets are private to their scenes; read from `scene.mjs` line 24 and line 17 respectively.
  const areaLinear = new Set(["fill", "sweep"]);
  const lineLinear = new Set(["trace"]);

  it("should reproduce video-area-swiss-co2's fieldAt for every field at every frame", () => {
    const states = areaStates();
    const at = fieldAtOf({
      order: EVENT_ORDER,
      progressOf,
      windows: AREA_WINDOWS,
      linear: areaLinear,
    });
    const fields = Object.keys(states[0]);
    const total = (AREA_VIDEO_TIMING as any).total;
    const got: number[] = [];
    const want: number[] = [];
    for (let frame = 0; frame < total; frame += 3)
      for (const field of fields) {
        got.push(at(field, frame, states, AREA_VIDEO_TIMING));
        want.push(areaFieldAt(field, frame, states, AREA_VIDEO_TIMING));
      }
    expect(got.length).toBeGreaterThan(200);
    expect(got).toEqual(want);
  });

  it("should reproduce video-line-swiss-co2's fieldAt for every field at every frame", () => {
    const states = lineStates();
    const at = fieldAtOf({
      order: EVENT_ORDER,
      progressOf,
      windows: LINE_WINDOWS,
      linear: lineLinear,
    });
    const fields = Object.keys(states[0]);
    const total = (LINE_VIDEO_TIMING as any).total;
    const got: number[] = [];
    const want: number[] = [];
    for (let frame = 0; frame < total; frame += 3)
      for (const field of fields) {
        got.push(at(field, frame, states, LINE_VIDEO_TIMING));
        want.push(lineFieldAt(field, frame, states, LINE_VIDEO_TIMING));
      }
    expect(got).toEqual(want);
  });

  it("should ease a field the linear set does not name, and only that one", () => {
    const states = lineStates();
    const eased = fieldAtOf({
      order: EVENT_ORDER,
      progressOf,
      windows: LINE_WINDOWS,
      linear: new Set(),
    });
    const linear = fieldAtOf({
      order: EVENT_ORDER,
      progressOf,
      windows: LINE_WINDOWS,
      linear: lineLinear,
    });
    const mid = Math.round(
      ((LINE_VIDEO_TIMING as any).reveal.start +
        (LINE_VIDEO_TIMING as any).reveal.start +
        (LINE_VIDEO_TIMING as any).reveal.duration) /
        2,
    );
    expect(eased("trace", mid, states, LINE_VIDEO_TIMING)).not.toBe(
      linear("trace", mid, states, LINE_VIDEO_TIMING),
    );
    expect(eased("furniture", mid, states, LINE_VIDEO_TIMING)).toBe(
      linear("furniture", mid, states, LINE_VIDEO_TIMING),
    );
  });

  it("should refuse to be built without the event order or a progress function", () => {
    expect(() => fieldAtOf({ order: [], progressOf } as any)).toThrow(
      /event order/,
    );
    expect(() => fieldAtOf({ order: EVENT_ORDER } as any)).toThrow(
      /progressOf/,
    );
  });
});

// ═══ a series drawn so far ════════════════════════════════════════════════════════════════════════════════════════

describe("reachAlong and drawnTo — the series as far as the clock has run", () => {
  it("should reproduce video-line-swiss-co2's own reach arithmetic (scene.mjs:37-43)", () => {
    for (const trace of [0, 0.017, 0.25, 0.5, 0.831, 0.999, 1]) {
      const pts = areaPoints;
      // the beat's lines, quoted:
      const reach = trace * (pts.length - 1);
      const whole = Math.floor(reach);
      const f = reach - whole;
      const drawn = pts.slice(0, whole + 1).map((p) => [p.x, p.y]);
      const next = pts[Math.min(whole + 1, pts.length - 1)];
      if (whole + 1 < pts.length && f > 0)
        drawn.push([
          pts[whole].x + (next.x - pts[whole].x) * f,
          pts[whole].y + (next.y - pts[whole].y) * f,
        ]);

      const got = drawnTo(pts, trace);
      expect([got.index, got.f]).toEqual([whole, f]);
      expect(got.top).toEqual(drawn);
      expect(got.tip).toEqual(drawn.at(-1));
    }
  });

  it("should name the last whole reading, which is the year a counter shows", () => {
    const { index } = reachAlong(popPoints, 0.5);
    expect(popPoints[index].year).toBe(
      population.first.year + Math.floor(0.5 * (popPoints.length - 1)),
    );
    expect(reachAlong(popPoints, 1).index).toBe(popPoints.length - 1);
    expect(reachAlong(popPoints, 0).index).toBe(0);
  });

  it("should stay inside the series when the clock overruns or runs backwards", () => {
    expect([
      reachAlong(popPoints, 1.4).index,
      reachAlong(popPoints, -0.2).index,
    ]).toEqual([popPoints.length - 1, 0]);
    expect(() => reachAlong([], 0.5)).toThrow(/at least one point/);
  });
});

describe("areaPath and polylinePath", () => {
  it("should reproduce video-cold-world-population's surface (scene.mjs:54) on its own readings", () => {
    for (const fill of [0.2, 0.61, 1]) {
      const { top } = drawnTo(popPoints, fill);
      const r1 = (v: number) => Math.round(v * 10) / 10;
      const want = `M${r1(top[0][0])} ${r1(popPlot.bottom)}${top.map((p) => `L${r1(p[0])} ${r1(p[1])}`).join("")}L${r1(top.at(-1)![0])} ${r1(popPlot.bottom)}Z`;
      expect(areaPath(top, popPlot.bottom)).toBe(want);
    }
  });

  it("should reproduce video-line-swiss-co2's drawn path (scene.mjs:50) on the area beat's readings", () => {
    const { top } = drawnTo(areaPoints, 0.4);
    const want = `M${top.map((p) => `${Math.round(p[0] * 10) / 10} ${Math.round(p[1] * 10) / 10}`).join("L")}`;
    expect(polylinePath(top)).toBe(want);
  });

  it("should draw nothing while fewer than two points stand", () => {
    expect([
      areaPath(drawnTo(popPoints, 0).top, popPlot.bottom),
      polylinePath(drawnTo(popPoints, 0).top),
    ]).toEqual(["", ""]);
  });

  it("should close the surface on the baseline at both ends", () => {
    const d = areaPath(drawnTo(popPoints, 1).top, popPlot.bottom);
    expect(
      d.startsWith(`M${round1(popPoints[0].x)} ${round1(popPlot.bottom)}L`),
    ).toBe(true);
    expect(
      d.endsWith(`L${round1(popPoints.at(-1)!.x)} ${round1(popPlot.bottom)}Z`),
    ).toBe(true);
  });
});

// ═══ what the series leaves room for ══════════════════════════════════════════════════════════════════════════════

describe("curveTopOver and standsClearOfCurve", () => {
  /** `video-cold2-world-population/build.mjs:223`, quoted: the highest reading under a span, in the data's own units. */
  const highestOver = (x0: number, x1: number) =>
    Math.max(
      ...population.readings
        .filter(
          (r: { year: number }) =>
            popX(r.year) >= x0 - 3 && popX(r.year) <= x1 + 3,
        )
        .map((r: { pop: number }) => r.pop),
      0,
    );

  it("should find the same top of the curve as the beat's data-space maximum, projected", () => {
    for (const [x0, x1] of [
      [200, 600],
      [900, 1100],
      [1500, 1740],
      [popPlot.left, popPlot.right],
    ]) {
      expect(curveTopOver(popPoints, x0, x1)).toBeCloseTo(
        round1(popY(highestOver(x0, x1))),
        0,
      );
    }
  });

  it("should agree with the beat's own clearance test for the counter's seat", () => {
    const counter = {
      x: popPlot.left + 20,
      width: 260,
      bottom: popY(8e9) + 20 + 30,
    };
    const beatSays =
      popY(highestOver(counter.x, counter.x + counter.width)) > counter.bottom;
    expect(
      standsClearOfCurve({
        points: popPoints,
        from: counter.x,
        to: counter.x + counter.width,
        bottom: counter.bottom,
      }),
    ).toBe(beatSays);
    expect(beatSays).toBe(true);
  });

  it("should refuse a word seated where the curve runs through it", () => {
    const onTheCurve = popPoints.at(-1)!;
    expect(
      standsClearOfCurve({
        points: popPoints,
        from: onTheCurve.x - 200,
        to: onTheCurve.x,
        bottom: onTheCurve.y + 40,
      }),
    ).toBe(false);
  });

  it("should report nothing in the way over a span the series never reaches", () => {
    expect(curveTopOver(popPoints, 5000, 6000)).toBe(Infinity);
    expect(
      standsClearOfCurve({
        points: popPoints,
        from: 5000,
        to: 6000,
        bottom: 0,
      }),
    ).toBe(true);
  });
});

// ═══ what a counter can say ═══════════════════════════════════════════════════════════════════════════════════════

describe("measuredTexts and widestOf", () => {
  /** The no-break space, written as its escape. */
  const NB = "\u00A0";
  const counter = (pop: number) => `${(pop / 1e9).toFixed(2)}${NB}billion`;
  const measure = (text: string) => ({ text, width: text.length * 7.4 });
  const DRAWN_WIDER = 0.02;

  it("should build the same keyed table video-cold2-world-population's build.mjs:229-230 built", () => {
    const want = Object.fromEntries(
      population.readings.map((r: { year: number; pop: number }) => [
        String(r.year),
        measure(counter(r.pop)),
      ]),
    );
    const got = measuredTexts(
      population.readings,
      (r: { year: number }) => r.year,
      (r: { pop: number }) => measure(counter(r.pop)),
    );
    expect(got).toEqual(want);
    expect(widestOf(got, DRAWN_WIDER)).toBe(
      Math.max(...Object.values(want).map((t: any) => t.width)) *
        (1 + DRAWN_WIDER),
    );
  });

  it("should hold one text per year of the series, keyed by the year the counter shows", () => {
    const got = measuredTexts(
      population.readings,
      (r: { year: number }) => r.year,
      (r: { pop: number }) => measure(counter(r.pop)),
    );
    expect(Object.keys(got).length).toBe(population.readings.length);
    expect(got[String(population.crossing.year)].text).toBe(
      counter(population.crossing.pop),
    );
  });

  it("should refuse two items keying the same text rather than hide one under the other", () => {
    const twice = [...population.readings.slice(0, 3), population.readings[1]];
    expect(() =>
      measuredTexts(
        twice,
        (r: any) => r.year,
        (r: any) => measure(counter(r.pop)),
      ),
    ).toThrow(/key the counter's text/);
  });

  it("should refuse to reserve a column for an empty table", () => {
    expect(() => widestOf({}, DRAWN_WIDER)).toThrow(/empty table/);
  });
});

// ═══ where a series meets a level ═════════════════════════════════════════════════════════════════════════════════

describe("firstCrossing", () => {
  it("should find video-cold-world-population's 8 billion crossing and its fractional year (subject.mjs:31-38)", () => {
    const crossed = firstCrossing(
      population.readings,
      8e9,
      (r: { pop: number }) => r.pop,
    )!;
    expect([crossed.at.year, crossed.before.year]).toEqual([
      population.crossing.year,
      population.crossing.year - 1,
    ]);
    expect(crossed.before.year + crossed.t).toBeCloseTo(
      population.crossingYear,
      10,
    );
  });

  it("should find video-area-swiss-co2's cumulative midpoint (subject.mjs:27)", () => {
    const crossed = firstCrossing(area.cumulative, area.total / 2)!;
    expect(area.readings[crossed.index].year).toBe(area.midpoint);
  });

  it("should report nothing when the series never reaches the level, so the beat can say what that means", () => {
    expect(
      firstCrossing(population.readings, 1e12, (r: { pop: number }) => r.pop),
    ).toBe(null);
  });

  it("should give the first reading no step to interpolate across", () => {
    const crossed = firstCrossing(
      population.readings,
      0,
      (r: { pop: number }) => r.pop,
    )!;
    expect([crossed.index, crossed.before, crossed.t]).toEqual([0, null, 0]);
  });
});

describe("firstYearGap", () => {
  it("should find no gap in either beat's frozen series", () => {
    expect([
      firstYearGap(area.readings),
      firstYearGap(population.readings),
    ]).toEqual([null, null]);
  });

  it("should name the two years a surface would close over", () => {
    const holed = [
      ...population.readings.slice(0, 5),
      ...population.readings.slice(6, 10),
    ];
    const gap = firstYearGap(holed)!;
    expect([gap.before.year, gap.after.year]).toEqual([
      population.readings[4].year,
      population.readings[6].year,
    ]);
  });
});
