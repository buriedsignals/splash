import { describe, expect, it } from "bun:test";
import { validateExpressions } from "#shared/map-beat/mount.mjs";
import { validateScrollyPlan } from "#shared/map-beat/scrolly.mjs";
import { COLD2_COAL_SHARE_EUROPE_VIDEO_TIMING as T } from "./timing-contract";
import { buildDirection, directionsFor, loadBeat } from "./build.mjs";
import { mapFieldsOf } from "./map-plan.mjs";
import { mapStateAt } from "./scene.mjs";

const beat = loadBeat();
const [entry] = directionsFor(beat).directions;
const { props } = buildDirection(entry, beat, { measured: null });
const P = { ...props, states: beat.states, timing: T } as any;
const frames = Array.from({ length: T.total }, (_, f) => f);

describe("the map plan of video-cold2-coal-share-europe", () => {
  it("should pass validateScrollyPlan and validateExpressions on every frame's state", () => {
    expect([...validateScrollyPlan(props.mapPlan, frames.map((f) => mapStateAt(P, f))), ...validateExpressions(props.mapPlan)]).toEqual([]);
  });

  it("should give every bound field a value at every frame", () => {
    const missing = frames.flatMap((f) => mapFieldsOf(beat.subject).filter((k) => !Number.isFinite((mapStateAt(P, f) as any)[k])));
    expect(missing).toEqual([]);
  });

  it("should show 2024's classes on the last frame and 2010's once the close-up has rewound", () => {
    const last = mapStateAt(P, T.total - 1) as any;
    const rewound = mapStateAt(P, T.subject.start + Math.round(0.3 * T.subject.duration)) as any;
    const pl = beat.subject.countries.find((c: any) => c.iso2 === "PL")!;
    expect([last.k_PL, rewound.k_PL]).toEqual([pl.classes.at(-1), pl.classes[0]]);
  });
});
