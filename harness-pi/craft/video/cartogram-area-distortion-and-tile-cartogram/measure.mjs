// ZONE KIT COPY of proof/video-cartogram-europe-lowcarbon/measure.mjs: not run on its own. render-beat.mjs measures the story's own plan for
// its one direction (map-video.mjs `measureMap`, the same digest) and keeps measured.json beside the beat; this file
// keeps the proof's digest and the frames each camera is measured at.
//
// ONE ENTRY PER EXPORT SIZE, keyed `landscape` / `portrait` / `square`. The camera is fitted to the stage, so a
// portrait camera is not the landscape one cropped: every size carries its own plan digest, its own states and its
// own cameras. A run measures the ONE size it was asked for and merges it in, so measuring portrait can never move
// the numbers a delivered landscape render was built on.
//
// THE CARTOGRAM VIDEO'S ONE CAMERA, MEASURED ON THE REAL MAP ONCE AND FROZEN: where MapLibre draws the seats the
// projection is checked against, and the colour it paints under every cell, for each direction. `build.mjs` reads the
// result offline; a plan that changes after it is refused there (`planDigest`).
//
//   whole    the breath after reference — every class in, nothing stepped back, nothing named: the cells the key, the
//            balance's halos and the name are placed on, and the fills the SVG shapes must coincide with

import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { sizeFor, videoExportSize } from "#shared/chart-video/sizes.mjs";
import { endOf } from "#shared/chart-video/timing.ts";
import { mapTilerKeyIn } from "#shared/map-beat/glyphs.mjs";

export const planDigestOf = (plan) => createHash("sha256").update(JSON.stringify(plan)).digest("hex");

export const MEASURED_FRAMES = Object.freeze({
  whole: (props) => endOf(props.timing.reference),
});

