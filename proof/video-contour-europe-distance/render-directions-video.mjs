// « La moitié de l’Europe est à moins de 132 km de la mer » — rendered as video once per filed direction: the scrolly's
// picture told in time (BRIEF.md), on the live MapTiler map.
//
// Everything is measured and asserted HERE, in Bun, before Chrome is started (`build.mjs`): the field and its derived
// values, the map plan, the sweep's raster on the map's grid, the overlay placed from the measured map, the states.
// Then the markup of every event's last frame is rendered in Bun and held to the type floor, the faces are embedded,
// and Remotion renders the live map under the overlay through the local key proxy (`renderVideoMap`: `--gl=swangle`,
// `--concurrency=1`): the still at the last frame, then the mp4. The key stays in this process; the page reaches
// MapTiler through the proxy, and the tiles are cached outside the repository.
//
// An EMPTY `--env-file` on every `remotion` spawn: Remotion otherwise injects the repository's `.env` into the render
// page (`splash/test/a-video-render-hides-the-env.test.ts`).
//
// Usage:  set -a && . ./.env && set +a && bun proof/video-contour-europe-distance/render-directions-video.mjs [--only <id>] [--still] [--look <dir>]

import { readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readPalette } from "#shared/chart-beat/colour.mjs";
import { assertDeliveredSize, assertTypeFloor, nameAtSize, readPngSize } from "#shared/chart-video/sizes.mjs";
import { EVENT_ORDER, endOf } from "#shared/chart-video/timing.ts";
import { composeDirections, report as reportComposition } from "#shared/design-base/compose.mjs";
import { readDirection } from "#shared/design-base/read-direction.mjs";
import { mapTilerKeyIn } from "#shared/map-beat/glyphs.mjs";
import { DEFAULT_CACHE_DIR } from "../../skills/map-beat/scripts/maptiler-proxy.mjs";
import { throughProxy } from "../../skills/map-beat/scripts/measure-live-map.mjs";
import { renderVideoMap } from "../../skills/map-beat/scripts/render-video-map.mjs";
import { wantedOf, writeRenderProps } from "../../skills/map-beat/scripts/video-faces.mjs";
import { buildDirection, DIRECTIONS, loadBeat, ROOT, SIZE, textPerRegisterOf } from "./build.mjs";
import { ContourFrame } from "./ContourFrame.tsx";
import { WINDOWS } from "./scene.mjs";

const HERE = import.meta.dirname;
const OUT = join(HERE, "renders");
const COMPOSITION = `video-contour-europe-distance-${SIZE}`;

const filedIds = readdirSync(DIRECTIONS)
  .filter((f) => f.endsWith(".md"))
  .map((f) => f.replace(/\.md$/, ""));
const args = process.argv.slice(2);
const onlyAt = args.indexOf("--only");
const only = onlyAt === -1 ? null : args[onlyAt + 1];
if (only !== null && !filedIds.includes(only))
  throw new Error(`--only takes one of the filed directions (${filedIds.join(", ")}), got ${JSON.stringify(only)}`);
const stillOnly = args.includes("--still");
/** `--check`: build the direction and hold every event's last frame to the type floor, without
 *  spawning Remotion. Two seconds instead of two minutes, and it is where every layout refusal a
 *  new frame size causes is raised — so a size can be swept over forty beats before any pixel is
 *  rendered. It delivers nothing, so nothing it does can be mistaken for a delivery. */
const checkOnly = args.includes("--check");
/** `--look <dir>`: instead of the deliverables, render the frames a reviewer looks at into <dir> — the last frame of
 *  every event, and the sweep on its way. */
const lookAt = args.indexOf("--look");
const lookDir = lookAt === -1 ? null : args[lookAt + 1];
if (lookAt !== -1 && !lookDir) throw new Error("--look takes a directory");

const key = mapTilerKeyIn(process.env);
if (!key) throw new Error("no MapTiler key in the environment: run with the worktree's .env loaded (set -a && . ./.env && set +a)");
const beat = loadBeat();
const textPerRegister = textPerRegisterOf(beat.copy);
const newsroom = readPalette(HERE);
const BEAT_FACTS = { evidenceLevels: 3 };
console.log(
  reportComposition(
    composeDirections({ newsroom, filed: filedIds.map((id) => readDirection(join(DIRECTIONS, `${id}.md`))), beat: BEAT_FACTS, textPerRegister }),
    { beat: BEAT_FACTS },
  ),
);

/** The markup of every event's last frame, rendered in Bun, held to the landscape floor. */
export function assertEventFramesReadable(props, id) {
  for (const event of EVENT_ORDER) {
    const frame = Math.min(endOf(props.timing[event]), props.timing.total) - 1;
    assertTypeFloor(renderToStaticMarkup(createElement(ContourFrame, { ...props, at: frame, liveMap: () => null })), SIZE, { what: `${id} at the end of ${event} (frame ${frame})` });
  }
}

function mp4Size(path) {
  const probe = spawnSync("ffprobe", ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height", "-of", "json", path], { encoding: "utf8" });
  if (probe.status !== 0) throw new Error(`ffprobe could not read ${relative(ROOT, path)}: ${probe.stderr.trim()}`);
  const [{ width, height }] = JSON.parse(probe.stdout).streams;
  return { width, height };
}

const refused = [];
await mkdir(OUT, { recursive: true });
for (const id of filedIds.filter((i) => only === null || i === only)) {
  // WHAT THIS RUN WRITES IS WHAT THIS RUN MAY REMOVE. Spelled `${id}` it was the LANDSCAPE name,
  // and a refusal at another size deleted a delivered landscape mp4 that had nothing to do with it.
  const at = nameAtSize(id, SIZE);
  const outputs = [`${at}.mp4`, `${at}-final-frame.png`, `${at}-props.json`].map((f) => join(OUT, f));
  const scratch = await mkdtemp(join(tmpdir(), "video-contour-props-"));
  try {
    const built = buildDirection(id, beat);
    const { props, report, direction } = built;
    console.log(id);
    for (const d of direction.decisions) console.log(`  ${d.register.padEnd(8)} ${d.role.padEnd(15)} -> ${d.family}`);
    console.log(
      `  title form ${report.titleForm + 1} · source « ${report.sourceText} » · k ${report.k.toFixed(3)} · key over ${(100 * report.keyLand).toFixed(1)} %, curve over ${(100 * report.chartLand).toFixed(1)} % land · ` +
        `numbers on ${report.labels.join(", ")} km${report.unlabelled.length ? ` · none on ${report.unlabelled.join(", ")} km` : ""}`,
    );
    assertEventFramesReadable(props, id);
    if (checkOnly) {
      console.log(`  checked at ${SIZE}\n`);
      continue;
    }

    // The audit copy: the props as built, no proxy origin, no key.
    await writeRenderProps({ props, wanted: wantedOf(props.registers), auditPath: join(OUT, `${at}-props.json`) });
    // The render copy: the plan pointed at this render's proxy, written to a temp file and never committed.
    const buildProps = (origin) => writeRenderProps({ props: { ...props, mapPlanProxied: throughProxy(props.mapPlan, origin) }, wanted: wantedOf(props.registers), auditPath: join(scratch, "audit.json") });
    const entry = relative(ROOT, join(HERE, "index.ts"));
    const common = { entry, composition: COMPOSITION, buildProps, mapTilerKey: key, cacheDir: DEFAULT_CACHE_DIR };

    if (lookDir) {
      await mkdir(lookDir, { recursive: true });
      const T = props.timing;
      const frames = [
        ...EVENT_ORDER.map((event) => ({ name: `end-${event}`, frame: endOf(T[event]) - 1 })),
        ...[0.35, 0.7].map((t) => ({ name: `reveal-sweep-${t}`, frame: Math.round(T.reveal.start + T.reveal.duration * (WINDOWS.reveal.level[0] + t * (WINDOWS.reveal.level[1] - WINDOWS.reveal.level[0]))) })),
        ...[0.3, 0.7].map((t) => ({ name: `subject-sweep-${t}`, frame: Math.round(T.subject.start + T.subject.duration * (WINDOWS.subject.level[0] + t * (WINDOWS.subject.level[1] - WINDOWS.subject.level[0]))) })),
      ];
      for (const { name, frame } of frames) await renderVideoMap({ ...common, outDir: lookDir, name: `${id}-${String(frame).padStart(3, "0")}-${name}`, mode: "still", frame });
      await rm(join(OUT, `${at}-props.json`), { force: true });
      console.log(`  -> ${frames.length} frames in ${lookDir}`);
      continue;
    }

    const still = await renderVideoMap({ ...common, outDir: OUT, name: at, mode: "still" });
    assertDeliveredSize(readPngSize(await readFile(still.path)), SIZE, { what: `renders/${at}-final-frame.png` });
    console.log(`  -> renders/${at}-final-frame.png (${still.seconds}s)`);
    if (stillOnly) continue;

    const movie = await renderVideoMap({ ...common, outDir: OUT, name: at, mode: "mp4" });
    assertDeliveredSize(mp4Size(movie.path), SIZE, { what: `renders/${at}.mp4` });
    console.log(`  -> renders/${at}.mp4 (${movie.seconds}s) · ${Object.entries(movie.proxyCounts).map(([k, v]) => `${k}: ${v}`).join(", ")}\n`);
  } catch (error) {
    // A CHECK DELIVERS NOTHING, SO IT MAY REMOVE NOTHING. The cleanup exists so a refused direction
    // leaves no stale file reading as a fresh render; `--check` renders nothing, and wiping a
    // delivered mp4 because a build threw while somebody was editing the layout is pure loss —
    // measured 2026-09-23 on `video-waterfall-germany-electricity-bridge`, which lost its delivered
    // landscape mp4, still and props to a check run mid-edit.
    if (!checkOnly) for (const path of outputs) await rm(path, { force: true });
    refused.push({ id, why: error.message });
    console.log(`  REFUSED — ${error.message}\n`);
  } finally {
    await rm(scratch, { recursive: true, force: true });
  }
}

if (refused.length) {
  console.log(`refused by ${refused.length}: ${refused.map((r) => r.id).join(", ")}`);
  process.exitCode = 1;
}
