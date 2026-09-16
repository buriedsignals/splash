import { describe, expect, it } from "bun:test";
import { existsSync } from "node:fs";
import { channelsOf, paintCuts } from "#shared/map-beat/smoothness.mjs";
import { buildDirection, directionsFor, loadBeat, MEASURED } from "./build.mjs";
import { classFillsOf } from "./map-plan.mjs";
import { mapStateAt, sceneAt, WINDOWS, yearPhaseAt } from "./scene.mjs";
import { COLD2_COAL_SHARE_EUROPE_VIDEO_TIMING as T } from "./timing-contract";

/**
 * NOTHING ON THIS MAP MAY CHANGE IN ONE FRAME — the defect the owner found, mechanised.
 *
 * The years used to be read at a FLOORED year: every fill, the key and every gauge held dead still for the ten frames
 * of a year and then changed all at once. MapLibre animates nothing here (the frame owns time, and the runner kills
 * the paint transitions on purpose), so that one frame was a cut. Measured on the render: four frames whose largest
 * pixel change was 3, then one changing 6 420 pixels by up to 246 — three times a second, for five seconds.
 *
 * The ceilings below are NOT thresholds someone chose. They are read from this beat's own timing contract, so
 * retiming the beat retimes the guard:
 *
 *   a colour  may move only as far as THE YEARS THEMSELVES MOVE in that frame (`yearPhaseAt`), along the steepest
 *             part of the class ramp. A step is the whole of a class change while the years have barely moved, so it
 *             fails by a factor of ten even during the rewind, the fastest the years ever run.
 *   a gauge   the same, against the widest year-on-year change in the shares it draws.
 *   an opacity may move no faster than the beat's SHORTEST declared window would carry it (eased, whose middle runs
 *             at twice the average rate) — six frames, the close-up's names leaving at the conclusion.
 */

const beat = loadBeat();
const [entry] = directionsFor(beat).directions;
const { props, direction } = buildDirection(entry, beat, { measured: null });
const P = { ...props, states: beat.states, timing: T } as any;
const frames = Array.from({ length: T.total }, (_, f) => f);

/** Where a frame stands on the years, as one number: the year it names plus how far it has travelled past it. */
const yearAt = (f: number) => {
  const { index, t } = yearPhaseAt(P, f);
  return index + t;
};
const yearsMoved = (i: number) => Math.abs(yearAt(i) - yearAt(i - 1));

/** The whole of a class change, in the channel that moves most: what a `step` over a class number changes in one frame. */
const fills = classFillsOf(direction);
export const CLASS_STEP = Math.max(
  ...fills.slice(1).map((f: string, i: number) => Math.max(...channelsOf(f).map((c: number, ch: number) => Math.abs(c - channelsOf(fills[i])[ch])))),
);

/** The shortest change any window declares, in frames — the fastest gesture the beat asks for. */
export const SHORTEST_WINDOW = Math.min(
  ...Object.entries(WINDOWS).flatMap(([event, fields]) =>
    Object.values(fields as Record<string, [number, number]>)
      .filter(([a]) => a >= 0)
      .map(([a, b]) => (b - a) * (T as any)[event].duration),
  ),
);
/** easeInOutQuad runs at twice the average rate at its middle. */
const OPACITY_CEILING = 2 / SHORTEST_WINDOW;
/** Half a channel: what a renderer's own rounding can add to a colour that did not move. */
const ROUNDING = 0.5;

describe("video-cold2-coal-share-europe never cuts", () => {
  it("should move every bound paint no faster than the gesture that carries it — no fill changing class in one frame", () => {
    const states = frames.map((f) => mapStateAt(P, f));
    expect(paintCuts(props.mapPlan, states, { colour: (i: number) => CLASS_STEP * yearsMoved(i) + ROUNDING, number: OPACITY_CEILING })).toEqual([]);
  });

  it("should cross the years continuously, never skipping one between two frames", () => {
    const worst = Math.max(...frames.slice(1).map((f) => yearsMoved(f)));
    expect([worst <= 1, CLASS_STEP > 4 * worst]).toEqual([true, true]);
  });
});

/** The gauges are placed on the measured map, so they are only drawn once `measure.mjs` has run. Built inside the
 *  tests, not beside them: a plan changed since its measurement is refused there, and that refusal must not take the
 *  paint guard above down with it. */
const measuredProps = () => ({ ...(buildDirection(entry, beat).props as any), states: beat.states, timing: T });

describe("video-cold2-coal-share-europe's gauges glide", () => {
  it("should have measured the live map — run measure.mjs with the worktree's .env loaded (SCAFFOLD until measured)", () => {
    expect(existsSync(MEASURED)).toBe(true);
  });

  it("should carry every gauge's fill between two years' shares, never snap it to one", () => {
    const full = measuredProps();
    /** The widest a share moves from one year to the next, as a share of the gauge's width. */
    const widestYear = Math.max(...full.names.flatMap((n: any) => n.shares.slice(1).map((s: any, i: number) => Math.abs(s.fill - n.shares[i].fill))));
    const jumps = frames.slice(1).flatMap((f) => {
      const [was, now] = [sceneAt(full, f - 1), sceneAt(full, f)];
      return full.names
        .map((n: any) => ({ code: n.code, moved: Math.abs(now.gauges[n.code] - was.gauges[n.code]), ceiling: widestYear * yearsMoved(f) + 1e-9 }))
        .filter((g: any) => g.moved > g.ceiling)
        .map((g: any) => `${g.code}'s gauge moves ${g.moved.toFixed(4)} at frame ${f}, past the ${g.ceiling.toFixed(4)} the years carry`);
    });
    expect(jumps).toEqual([]);
  });
});
