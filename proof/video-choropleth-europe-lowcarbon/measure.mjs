// Usage: set -a && . ./.env && set +a && bun proof/video-choropleth-europe-lowcarbon/measure.mjs [--size <size>]
//
// THE CHOROPLETH'S FIXED CAMERAS, MEASURED ON THE REAL MAP ONCE AND FROZEN: where MapLibre draws every seat the
// overlay needs, and the colour it paints under every cell, for each direction. `build.mjs` reads the result
// offline; a plan that changes after it is refused there (`planDigest`).
//
// ONE ENTRY PER EXPORT SIZE, keyed by its name, and a run MERGES its own entry into the file rather than replacing
// it. Everything measured here is a pixel of a particular frame — a seat, a grid cell, a camera's zoom — so the
// landscape measurement says nothing about the portrait picture, and measuring one size must not silently throw
// the other two away. Run it once per size.
//
// Each camera is measured in the picture its words are seen over, taken from the frame itself (`mapStateAt`):
//   whole          the last frame — every class in, the six named, Albania ringed: the credit and Albania's name
//   wholeFiltered  the end of reveal — the floor up, the six named: the panel, which stands through both
//   closeUp        the end of subject — every class back, Albania ringed: the close-up's labels and gauges

import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { sizeFor, videoExportSize } from "#shared/chart-video/sizes.mjs";
import { endOf } from "#shared/chart-video/timing.ts";
import { mapTilerKeyIn } from "#shared/map-beat/glyphs.mjs";

export const planDigestOf = (plan) => createHash("sha256").update(JSON.stringify(plan)).digest("hex");

/** The three frames the fixed cameras are measured at. */
export const MEASURED_FRAMES = Object.freeze({
  whole: (timing) => timing.total - 1,
  wholeFiltered: (timing) => endOf(timing.reveal) - 1,
  closeUp: (timing) => endOf(timing.subject) - 1,
});

if (import.meta.main) {
  const key = mapTilerKeyIn(process.env);
  if (!key) throw new Error("no MapTiler key in the environment: run with the worktree's .env loaded");
  // Loaded here, not at the top: `build.mjs` reads `planDigestOf` from this file, and neither the tests nor the build
  // should start a browser driver to do so.
  const { measureLiveMap } = await import("../../skills/map-beat/scripts/measure-live-map.mjs");
  const { buildDirection, loadBeat } = await import("./build.mjs");
  const { mapStateAt } = await import("./scene.mjs");
  const { CHOROPLETH_VIDEO_TIMING: timing } = await import("./timing-contract.ts");
  const beat = loadBeat();
  const size = videoExportSize();
  const row = sizeFor(size);
  // THE FRAME THE PICTURE IS TAKEN ON IS THE ONE IT WILL BE DRAWN ON. `build.mjs` refuses a measurement whose size
  // is not the stage it draws — so this is the number that makes the two agree, not a literal beside them.
  const out = { size: { width: row.width, height: row.height }, planDigest: {}, states: null, cameras: {} };
  for (const id of ["creme", "nocturne", "rapport"]) {
    const { props } = buildDirection(id, beat, { measured: null });
    const states = Object.fromEntries(Object.entries(MEASURED_FRAMES).map(([name, frameOf]) => [name, mapStateAt({ cameras: props.cameras, states: beat.states, timing }, frameOf(timing))]));
    out.states = states;
    out.planDigest[id] = planDigestOf(props.mapPlan);
    out.cameras[id] = await measureLiveMap({ plan: props.mapPlan, states, seats: beat.mapSeats, size: out.size, mapTilerKey: key, tints: props.mapPlan.tints });
    for (const [name, m] of Object.entries(out.cameras[id])) if (!m.tilesLoaded) throw new Error(`${id} ${name}: a tile was still loading when it was measured`);
    console.log(`${id} measured at ${size}`);
  }
  const path = join(import.meta.dir, "measured.json");
  const all = existsSync(path) ? JSON.parse(readFileSync(path, "utf8")) : {};
  writeFileSync(path, JSON.stringify({ ...all, [size]: out }) + "\n");
}
