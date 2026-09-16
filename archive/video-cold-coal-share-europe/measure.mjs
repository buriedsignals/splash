// Usage: set -a && . ./.env && set +a && bun proof/video-cold-coal-share-europe/measure.mjs
//
// THE FIXED CAMERAS, MEASURED ON THE REAL MAP ONCE AND FROZEN — where MapLibre draws every seat the overlay needs and
// the colour it paints under every cell, per direction. `build.mjs` reads the result offline; a changed plan is refused.
//   whole2010  the end of reference — the twelve in their 2010 classes: the panel
//   whole      the last frame — 2024, Poland outlined: the credit, the panel, Poland's word
//   closeUp    the end of subject: the close-up's words and gauges

import { createHash } from "node:crypto";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { endOf } from "#shared/chart-video/timing.ts";
import { mapTilerKeyIn } from "#shared/map-beat/glyphs.mjs";

export const planDigestOf = (plan) => createHash("sha256").update(JSON.stringify(plan)).digest("hex");

export const MEASURED_FRAMES = Object.freeze({
  whole2010: (t) => endOf(t.reference) - 1,
  whole: (t) => t.total - 1,
  closeUp: (t) => endOf(t.subject) - 1,
});

if (import.meta.main) {
  const key = mapTilerKeyIn(process.env);
  if (!key) throw new Error("no MapTiler key in the environment: run with the worktree's .env loaded");
  const { measureLiveMap } = await import("../../skills/map-beat/scripts/measure-live-map.mjs");
  const { buildDirection, loadBeat } = await import("./build.mjs");
  const { mapStateAt } = await import("./scene.mjs");
  const { COAL_VIDEO_TIMING: timing } = await import("./timing-contract.ts");
  const beat = loadBeat();
  const out = { size: { width: 1920, height: 1080 }, planDigest: {}, cameras: {} };
  for (const id of ["creme", "nocturne", "rapport"]) {
    const { props } = buildDirection(id, beat, { measured: null });
    const states = Object.fromEntries(Object.entries(MEASURED_FRAMES).map(([name, frameOf]) => [name, mapStateAt({ cameras: props.cameras, states: beat.states, timing }, frameOf(timing))]));
    out.planDigest[id] = planDigestOf(props.mapPlan);
    out.cameras[id] = await measureLiveMap({ plan: props.mapPlan, states, seats: beat.mapSeats, size: out.size, mapTilerKey: key, tints: props.mapPlan.tints });
    for (const [name, m] of Object.entries(out.cameras[id])) if (!m.tilesLoaded) throw new Error(`${id} ${name}: a tile was still loading when it was measured`);
    console.log(`${id} measured`);
  }
  writeFileSync(join(import.meta.dir, "measured.json"), JSON.stringify(out) + "\n");
}
