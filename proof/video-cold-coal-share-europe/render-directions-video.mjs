// The coal video, rendered once per filed direction. Everything is measured and asserted in Bun first (`build.mjs`);
// every event's last frame is rendered to markup and held to the type floor; then Remotion renders the live MapTiler map
// under the overlay through the local key proxy (`renderVideoMap`: `--gl=swangle`, `--concurrency=1`, an empty
// `--env-file`): the last frame, then the mp4. The key stays in this process.
//
// Usage:  set -a && . ./.env && set +a && bun proof/video-cold-coal-share-europe/render-directions-video.mjs [--only <id>] [--still] [--look <dir>]

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
import { BREAKS } from "./beat.mjs";
import { buildDirection, DIRECTIONS, loadBeat, ROOT, SIZE, textPerRegisterOf } from "./build.mjs";
import { CoalFrame } from "./CoalFrame.tsx";
import { COMPOSITION_ID } from "./Root.tsx";
import { WINDOWS } from "./scene.mjs";

const HERE = import.meta.dirname;
const OUT = join(HERE, "renders");
const filedIds = readdirSync(DIRECTIONS).filter((f) => f.endsWith(".md")).map((f) => f.replace(/\.md$/, ""));
const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(name);
  if (i === -1) return null;
  if (!args[i + 1]) throw new Error(`${name} takes a value`);
  return args[i + 1];
};
const only = flag("--only");
if (only !== null && !filedIds.includes(only)) throw new Error(`--only takes one of ${filedIds.join(", ")}`);
const stillOnly = args.includes("--still");
const lookDir = flag("--look");

const key = mapTilerKeyIn(process.env);
if (!key) throw new Error("no MapTiler key in the environment: run with the worktree's .env loaded (set -a && . ./.env && set +a)");
const beat = loadBeat();
const newsroom = readPalette(HERE, { stopAt: join(HERE, "..") });
const BEAT_FACTS = { evidenceLevels: BREAKS.length + 1 };
console.log(reportComposition(composeDirections({ newsroom, filed: filedIds.map((id) => readDirection(join(DIRECTIONS, `${id}.md`))), beat: BEAT_FACTS, textPerRegister: textPerRegisterOf(beat.copy) }), { beat: BEAT_FACTS }));

export function assertEventFramesReadable(props, id) {
  for (const event of EVENT_ORDER) {
    const frame = Math.min(endOf(props.timing[event]), props.timing.total) - 1;
    assertTypeFloor(renderToStaticMarkup(createElement(CoalFrame, { ...props, at: frame, liveMap: () => null })), SIZE, { what: `${id} at the end of ${event} (frame ${frame})` });
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
  const scratch = await mkdtemp(join(tmpdir(), "video-coal-props-"));
  try {
    const { props, report, direction } = buildDirection(id, beat);
    console.log(id);
    for (const d of direction.decisions) console.log(`  ${d.register.padEnd(8)} ${d.role.padEnd(15)} -> ${d.family}`);
    console.log(`  title form ${report.titleForm + 1} at ${report.titleSize}px · source « ${report.sourceText} » · k ${report.k.toFixed(3)}`);
    assertEventFramesReadable(props, id);

    const wanted = wantedOf(props.registers);
    if (!lookDir) await writeRenderProps({ props, wanted, auditPath: join(OUT, `${id}-props.json`) });
    const buildProps = (origin) => writeRenderProps({ props: { ...props, mapPlanProxied: throughProxy(props.mapPlan, origin) }, wanted, auditPath: join(scratch, "audit.json") });
    const common = { entry: relative(ROOT, join(HERE, "index.ts")), composition: COMPOSITION_ID, buildProps, mapTilerKey: key, cacheDir: DEFAULT_CACHE_DIR };

    if (lookDir) {
      await mkdir(lookDir, { recursive: true });
      const T = props.timing;
      const at = (event, share) => Math.round(T[event].start + T[event].duration * share);
      const frames = [
        { name: "end-reference", frame: endOf(T.reference) - 1 },
        { name: "mid-reveal", frame: at("reveal", (WINDOWS.reveal.year[0] + WINDOWS.reveal.year[1]) / 2) },
        { name: "subject-counting", frame: at("subject", (WINDOWS.subject.replay[0] + WINDOWS.subject.replay[1]) / 2) },
        { name: "end-subject", frame: endOf(T.subject) - 1 },
      ];
      for (const { name, frame } of frames) await renderVideoMap({ ...common, outDir: lookDir, name: `${id}-${String(frame).padStart(3, "0")}-${name}`, mode: "still", frame });
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
    if (!lookDir) for (const path of outputs) await rm(path, { force: true });
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
