// ZONE KIT COPY of proof/video-flow-map-ukraine-protection/measure.mjs: not run on its own. render-beat.mjs measures the story's own plan for
// its one direction (map-video.mjs `measureMap`, the same digest) and keeps measured.json beside the beat; this file
// keeps the proof's digest and the frames each camera is measured at.
//
// ONE ENTRY PER EXPORT SIZE, keyed `landscape` / `portrait` / `square`. The camera is fitted to the stage, so a
// portrait camera is not the landscape one cropped: every size carries its own plan digest, its own states and its
// own cameras. A run measures the ONE size it was asked for (`--size`) and merges it into the file, so measuring
// portrait can never move the numbers a delivered landscape render was built on.
//
// THE FLOW MAP VIDEO'S STILL CAMERA, MEASURED ON THE REAL MAP ONCE AND FROZEN: where MapLibre draws the seats the
// overlay is checked against (Biscay, the origin, the largest, westmost and southmost hosts) and the colour it paints
// under every cell, for each direction (each has its own camera: the key column it is fitted beside). `build.mjs`
// reads the result offline; a plan that changes after it is refused there (`planDigest`).
//
// The camera never moves, so it is measured once, in the picture the video ends on (`whole`, the last frame: every
// band drawn, the node set) — the sea the key and the credit stand on, the bands over the sea counted as not sea.

import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { sizeFor, videoExportSize } from "#shared/chart-video/sizes.mjs";
import { mapTilerKeyIn } from "#shared/map-beat/glyphs.mjs";

export const planDigestOf = (plan) => createHash("sha256").update(JSON.stringify(plan)).digest("hex");

export const MEASURED_FRAMES = Object.freeze({ whole: (timing) => timing.total - 1 });

