// ZONE KIT COPY of proof/video-hex-grid-europe-protection/measure.mjs: not run on its own. render-beat.mjs measures the story's own plan for
// its one direction (map-video.mjs `measureMap`, the same digest) and keeps measured.json beside the beat; this file
// keeps the proof's digest and the frames each camera is measured at.
//
// THE HEX GRID VIDEO'S ONE CAMERA, MEASURED ON THE REAL MAP ONCE AND FROZEN: where MapLibre draws the seats the
// projection is checked against, and the colour it paints under every cell, for each direction. `build.mjs` reads the
// result offline; a plan that changes after it is refused there (`planDigest`).
//
//   whole    the last frame before the shapes rise — every host in its neutral, the origin hollow: the cells the key
//            column is placed on, and the fills the SVG shapes must coincide with

import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { sizeFor, videoExportSize } from "#shared/chart-video/sizes.mjs";
import { mapTilerKeyIn } from "#shared/map-beat/glyphs.mjs";

export const planDigestOf = (plan) => createHash("sha256").update(JSON.stringify(plan)).digest("hex");

export const MEASURED_FRAMES = Object.freeze({
  whole: (props, handoverStart) => Math.floor(props.timing.reference.start + props.timing.reference.duration * handoverStart),
});

