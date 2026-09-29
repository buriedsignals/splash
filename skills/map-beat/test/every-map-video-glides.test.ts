/**
 * EVERY MAP VIDEO GLIDES — NO BOUND PAINT CUTS, DISCOVERED, NOT LISTED.
 *
 * A directed map video paints each frame from its state and MapLibre softens nothing between two frames, so a
 * bound paint that changes by a whole step in one frame is a cut on screen (`shared/map-beat/smoothness.mjs`). A still
 * cannot show it: the render ladder looks at frames one at a time, and a cut lives between two of them.
 *
 * Every live-map video beat under `proof/video-*` is walked here frame by frame, in every direction, and held to
 * `paintJumps`; a story beat, which builds its own directions, carries the scaffold's `smooth.test.ts` instead. A new
 * proof beat is held to it without writing a line. A jump no reader sees is the beat's to declare as `HIDDEN_CUTS` in its
 * `scene.mjs`, with the condition that proves it hidden (`when`) and why; a declaration that hides nothing fails.
 *
 * Each beat is built on its measured map, so the layers placed there (names, numbers, seats) are walked too — but
 * with the measurement re-keyed to the plan this machine builds. A measured plan's digest holds only where the beat was
 * measured (the plan carries face metrics, and CI's faces are not the owner's); the beat's own tests guard that
 * staleness. What is walked here is how each bound paint MOVES, which the placement never decides.
 */
import { describe, expect, it } from "bun:test";
import { existsSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import { paintJumps } from "#shared/map-beat/smoothness.mjs";

const ROOT = join(import.meta.dirname, "..", "..", "..");
/** The directions every proof beat renders — the ids its own tests build. */
const DIRECTIONS = ["creme", "nocturne", "rapport"];

const subdirs = (dir: string) =>
  existsSync(dir)
    ? readdirSync(dir, { withFileTypes: true })
        .filter((e) => e.isDirectory() && !e.name.startsWith(".")) // a scaffold probe is not a beat
        .map((e) => join(dir, e.name))
    : [];

const beatDirs = subdirs(join(ROOT, "proof"))
  .filter((d) => /\/video-[^/]+$/.test(d))
  .filter((d) =>
    ["map-plan.mjs", "scene.mjs", "build.mjs"].every((f) =>
      existsSync(join(d, f)),
    ),
  )
  .sort();

const beats = await Promise.all(
  beatDirs.map(async (dir) => {
    const { buildDirection, loadBeat, readMeasured } = await import(join(dir, "build.mjs"));
    const { planDigestOf } = await import(join(dir, "measure.mjs"));
    const { mapStateAt, HIDDEN_CUTS } = await import(join(dir, "scene.mjs"));
    return {
      beat: relative(ROOT, dir).split("\\").join("/"),
      buildDirection,
      loadBeat,
      readMeasured,
      planDigestOf,
      mapStateAt,
      hidden: HIDDEN_CUTS ?? [],
    };
  }),
);

describe("every map video glides", () => {
  it("should find the bound map beats", () => {
    // Eight proof beats bind a paint to their state today; a walker that finds fewer has stopped looking.
    expect(beats.length).toBeGreaterThanOrEqual(8);
  });

  for (const { beat, buildDirection, loadBeat, readMeasured, planDigestOf, mapStateAt, hidden } of beats) {
    let loaded: unknown;
    for (const id of DIRECTIONS)
      it(`${beat} (${id}) should move every bound paint with a ramp — nothing cuts in one frame`, () => {
        loaded ??= loadBeat();
        const plan = buildDirection(id, loaded, { measured: null }).props.mapPlan;
        const measured = readMeasured();
        const rekeyed = { ...measured, planDigest: { ...measured.planDigest, [id]: planDigestOf(plan) } };
        const { props } = buildDirection(id, loaded, { measured: rekeyed });
        const states = Array.from({ length: props.timing.total }, (_, f) =>
          mapStateAt(props, f),
        );
        expect(paintJumps(props.mapPlan, states, { hidden })).toEqual([]);
      });
  }
});
