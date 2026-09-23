// « Par pays 65,1 % ; au km² 44,9 % » — rendered as video once per filed direction: the scrolly's picture told in time
// (BRIEF.md), its geography on the live MapTiler map until the countries leave it for their tiles.
//
// Everything is measured and asserted HERE, in Bun, before Chrome is started (`build.mjs`): the subject and
// its derived values, the map plan, the direction's registers at the video size, the overlay placed from the
// measured map, the states. Then the markup of every event's last frame is rendered in Bun and held to the
// type floor, the faces are embedded, and Remotion renders the live MapTiler map under the overlay through
// the local key proxy (`renderVideoMap`: `--gl=swangle`, `--concurrency=1`): the still at the last frame,
// then the mp4. The key stays in this process; the page reaches MapTiler through the proxy, and the tiles are
// cached outside the repository.
//
// An EMPTY `--env-file` on every `remotion` spawn: Remotion otherwise injects the repository's `.env` into
// the render page (`splash/test/a-video-render-hides-the-env.test.ts`).
//
// Usage:  set -a && . ./.env && set +a && bun proof/video-cartogram-europe-lowcarbon/render-directions-video.mjs [--only <id>] [--still] [--look <dir>]

import { readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readPalette } from "#shared/chart-beat/colour.mjs";
import { assertDeliveredSize, assertTypeFloor, readPngSize } from "#shared/chart-video/sizes.mjs";
import { EVENT_ORDER, endOf } from "#shared/chart-video/timing.ts";
import { composeDirections, report as reportComposition } from "#shared/design-base/compose.mjs";
import { readDirection } from "#shared/design-base/read-direction.mjs";
import { mapTilerKeyIn } from "#shared/map-beat/glyphs.mjs";
import { DEFAULT_CACHE_DIR } from "../../skills/map-beat/scripts/maptiler-proxy.mjs";
import { throughProxy } from "../../skills/map-beat/scripts/measure-live-map.mjs";
import { renderVideoMap } from "../../skills/map-beat/scripts/render-video-map.mjs";
import { wantedOf, writeRenderProps } from "../../skills/map-beat/scripts/video-faces.mjs";
import { buildDirection, DIRECTIONS, loadBeat, ROOT, SIZE, textPerRegisterOf } from "./build.mjs";
import { CartogramFrame } from "./CartogramFrame.tsx";
import { HANDOVER, WINDOWS } from "./scene.mjs";

const HERE = import.meta.dirname;
const OUT = join(HERE, "renders");
const COMPOSITION = "video-cartogram-europe-lowcarbon-landscape";

const filedIds = readdirSync(DIRECTIONS)
  .filter((f) => f.endsWith(".md"))
  .map((f) => f.replace(/\.md$/, ""));
const args = process.argv.slice(2);
const onlyAt = args.indexOf("--only");
const only = onlyAt === -1 ? null : args[onlyAt + 1];
if (only !== null && !filedIds.includes(only))
  throw new Error(`--only takes one of the filed directions (${filedIds.join(", ")}), got ${JSON.stringify(only)}`);
const stillOnly = args.includes("--still");
/** `--look <dir>`: instead of the deliverables, render the frames a reviewer looks at into <dir> — the
 *  last frame of every event, the handover from the map to the shapes, and the morph. */
const lookAt = args.indexOf("--look");
const lookDir = lookAt === -1 ? null : args[lookAt + 1];
if (lookAt !== -1 && !lookDir) throw new Error("--look takes a directory");

const key = mapTilerKeyIn(process.env);
if (!key) throw new Error("no MapTiler key in the environment: run with the worktree's .env loaded (set -a && . ./.env && set +a)");
const beat = loadBeat();
const { subject } = beat;
const textPerRegister = textPerRegisterOf(beat.copy);
const newsroom = readPalette(HERE);
const BEAT_FACTS = { evidenceLevels: subject.BREAKS.length + 1 };
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
    assertTypeFloor(renderToStaticMarkup(createElement(CartogramFrame, { ...props, at: frame, liveMap: () => null })), SIZE, { what: `${id} at the end of ${event} (frame ${frame})` });
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
  const outputs = [`${id}.mp4`, `${id}-final-frame.png`, `${id}-props.json`].map((f) => join(OUT, f));
  const scratch = await mkdtemp(join(tmpdir(), "video-cartogram-props-"));
  try {
    const built = buildDirection(id, beat);
    const { props, report, direction } = built;
    console.log(id);
    for (const d of direction.decisions) console.log(`  ${d.register.padEnd(8)} ${d.role.padEnd(15)} -> ${d.family}`);
    console.log(
      `  title form ${report.titleForm + 1} at ${report.titleSize}px · source form ${report.sourceForm + 1} · k ${report.k.toFixed(3)} · ` +
        `key over ${(100 * report.keyLand).toFixed(1)} % land · tile ${report.tile.w}×${report.tile.h} · codes at ${report.codeSize}px`,
    );
    assertEventFramesReadable(props, id);

    // The audit copy: the props as built, no proxy origin, no key.
    await writeRenderProps({ props, wanted: wantedOf(props.registers), auditPath: join(OUT, `${id}-props.json`) });
    // The render copy: the plan pointed at this render's proxy, written to a temp file and never committed.
    const buildProps = (origin) => writeRenderProps({ props: { ...props, mapPlanProxied: throughProxy(props.mapPlan, origin) }, wanted: wantedOf(props.registers), auditPath: join(scratch, "audit.json") });
    const entry = relative(ROOT, join(HERE, "index.ts"));
    const common = { entry, composition: COMPOSITION, buildProps, mapTilerKey: key, cacheDir: DEFAULT_CACHE_DIR };

    if (lookDir) {
      await mkdir(lookDir, { recursive: true });
      const T = props.timing;
      const mid = (event, [a, b]) => Math.round(T[event].start + T[event].duration * (a + b) / 2);
      const frames = [
        ...EVENT_ORDER.map((event) => ({ name: `end-${event}`, frame: endOf(T[event]) - 1 })),
        { name: "mid-reference", frame: mid("reference", WINDOWS.reference.classes) },
        { name: "handover", frame: mid("subject", HANDOVER) },
        ...[0.1, 0.3, 0.55, 0.8].map((t) => ({ name: `morph-${t}`, frame: Math.round(T.subject.start + T.subject.duration * (WINDOWS.subject.morph[0] + t * (WINDOWS.subject.morph[1] - WINDOWS.subject.morph[0]))) })),
      ];
      for (const { name, frame } of frames) await renderVideoMap({ ...common, outDir: lookDir, name: `${id}-${String(frame).padStart(3, "0")}-${name}`, mode: "still", frame });
      await rm(join(OUT, `${id}-props.json`), { force: true });
      console.log(`  -> ${frames.length} frames in ${lookDir}`);
      continue;
    }

    const still = await renderVideoMap({ ...common, outDir: OUT, name: id, mode: "still" });
    assertDeliveredSize(readPngSize(await readFile(still.path)), SIZE, { what: `renders/${id}-final-frame.png` });
    console.log(`  -> renders/${id}-final-frame.png (${still.seconds}s)`);
    if (stillOnly) continue;

    const movie = await renderVideoMap({ ...common, outDir: OUT, name: id, mode: "mp4" });
    assertDeliveredSize(mp4Size(movie.path), SIZE, { what: `renders/${id}.mp4` });
    console.log(`  -> renders/${id}.mp4 (${movie.seconds}s) · ${Object.entries(movie.proxyCounts).map(([k, v]) => `${k}: ${v}`).join(", ")}\n`);
  } catch (error) {
    for (const path of outputs) await rm(path, { force: true });
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
