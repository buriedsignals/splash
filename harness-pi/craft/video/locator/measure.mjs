// ZONE KIT COPY of proof/video-locator-zaporizhzhia/measure.mjs: not run on its own. render-beat.mjs measures the
// story's own plan for its one direction (map-video.mjs `measureMap`, the same digest) and keeps measured.json beside
// the beat; this file keeps the proof's digest and the frames each camera is measured at.
//
// ONE ENTRY PER EXPORT SIZE, keyed `landscape` / `portrait` / `square`. The camera is fitted to the stage, so a
// portrait camera is not the landscape one cropped: every size carries its own plan digest, its own states and its
// own cameras. A run measures the ONE size it was asked for (`--size`) and merges it into the file, so measuring
// portrait can never move the numbers a delivered landscape render was built on.
//
// THE LOCATOR VIDEO'S TWO FIXED CAMERAS, MEASURED ON THE REAL MAP ONCE AND FROZEN: where MapLibre draws the seats the
// overlay is checked against, and the colour it paints under every cell, for each direction. `build.mjs` reads the
// result offline; a plan that changes after it is refused there (`planDigest`).
//
//   whole    the end of reference — Europe, Ukraine tinted and named, the station ringed
//   closeUp  the close-up settled and bare (`settledBareFrameOf`) — the regions drawn, no place named yet: the cells
//            the names, their halos, the station's block and the credit are placed on

import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { sizeFor, videoExportSize } from "#shared/chart-video/sizes.mjs";
import { endOf } from "#shared/chart-video/timing.ts";
import { mapTilerKeyIn } from "#shared/map-beat/glyphs.mjs";
import { settledBareFrameOf } from "./scene.mjs";

export const planDigestOf = (plan) => createHash("sha256").update(JSON.stringify(plan)).digest("hex");

export const MEASURED_FRAMES = Object.freeze({
  whole: (props) => endOf(props.timing.reference) - 1,
  closeUp: (props) => settledBareFrameOf(props),
});

