// Usage: set -a && . ./.env && set +a && bun proof/video-hex-grid-europe-protection/measure.mjs [--size portrait|square]
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

if (import.meta.main) {
  const key = mapTilerKeyIn(process.env);
  if (!key) throw new Error("no MapTiler key in the environment: run with the worktree's .env loaded");
  const { measureLiveMap } = await import("../../skills/map-beat/scripts/measure-live-map.mjs");
  const { buildDirection, loadBeat } = await import("./build.mjs");
  const { HANDOVER, mapStateAt } = await import("./scene.mjs");
  const beat = loadBeat();
  // ONE MEASUREMENT PER FRAME SIZE. The camera is fitted to the box the key leaves, and that box is a different
  // box at 1080x1920 than at 1920x1080 — so the plan, its digest and the colours the basemap paints under the
  // cells are all per size. The landscape measurement stays where it has always been, at the top of the file,
  // so nothing already delivered moves; the other frames are filed under `sizes`.
  const SIZE = videoExportSize();
  const frame = sizeFor(SIZE);
  const out = { size: { width: frame.width, height: frame.height }, planDigest: {}, states: null, cameras: {} };
  for (const id of ["creme", "nocturne", "rapport"]) {
    const { props } = buildDirection(id, beat, { measured: null });
    const states = Object.fromEntries(Object.entries(MEASURED_FRAMES).map(([name, frameOf]) => [name, mapStateAt(props, frameOf(props, HANDOVER[0]))]));
    out.states = states;
    out.planDigest[id] = planDigestOf(props.mapPlan);
    out.cameras[id] = await measureLiveMap({ plan: props.mapPlan, states, seats: beat.mapSeats, size: out.size, mapTilerKey: key, tints: props.mapPlan.tints });
    for (const [name, m] of Object.entries(out.cameras[id])) if (!m.tilesLoaded) throw new Error(`${id} ${name}: a tile was still loading when it was measured`);
    console.log(`${id} measured`);
  }
  const file = join(import.meta.dir, "measured.json");
  const held = existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : {};
  const next = SIZE === "landscape" ? { ...out, sizes: held.sizes } : { ...held, sizes: { ...held.sizes, [SIZE]: out } };
  writeFileSync(file, JSON.stringify(next) + "\n");
}
