// ZONE KIT COPY of proof/video-choropleth-europe-lowcarbon/measure.mjs: not run on its own. render-beat.mjs measures
// the story's own plan for its one direction (map-video.mjs `measureMap`, the same digest) and keeps measured.json
// beside the beat; this file keeps the proof's digest and the frames each camera is measured at.
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

