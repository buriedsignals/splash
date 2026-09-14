// « Sept pays européens dépassent 94 % d'électricité bas-carbone », version 2 — rendered as video once per
// filed direction: the scrolly's picture and six cards told in time (BRIEF.md).
//
// Everything is measured and asserted HERE, in Bun, before Chrome is started (`build.mjs`): the subject and
// its derived values, the clipped geometry, the direction's registers at the video size, the rows, both
// cameras and every pill placed in each, the states. Then the markup of every event's last frame is
// rendered in Bun and held to the type floor, the faces are embedded, and Remotion renders the still at the
// last frame before the mp4. The map is vectors: no MapLibre, no MapTiler, no key.
//
// An EMPTY `--env-file` on every `remotion` spawn: Remotion otherwise injects the repository's `.env` into
// the render page (`splash/test/a-video-render-hides-the-env.test.ts`).
//
// Usage:  bun proof/video-choropleth-europe-lowcarbon/render-directions-video.mjs [--only <id>] [--still]

import { readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readPalette } from "#shared/chart-beat/colour.mjs";
import { assertDeliveredSize, assertTypeFloor, readPngSize } from "#shared/chart-video/sizes.mjs";
import { EVENT_ORDER, endOf } from "#shared/chart-video/timing.ts";
import { composeDirections, report as reportComposition } from "#shared/design-base/compose.mjs";
import { readDirection } from "#shared/design-base/read-direction.mjs";
import { wantedOf, writeRenderProps } from "../../skills/map-beat/scripts/video-faces.mjs";
import { buildDirection, DIRECTIONS, loadBeat, ROOT, SIZE, textPerRegisterOf } from "./build.mjs";
import { ChoroplethFrame } from "./ChoroplethFrame.tsx";
import { COUNT_UP, WINDOWS } from "./scene.mjs";

const HERE = import.meta.dirname;
const OUT = join(HERE, "renders");
const COMPOSITION = "video-choropleth-europe-lowcarbon-landscape";

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
 *  last frame of every event, and the middle of each camera move. */
const lookAt = args.indexOf("--look");
const lookDir = lookAt === -1 ? null : args[lookAt + 1];
if (lookAt !== -1 && !lookDir) throw new Error("--look takes a directory");

const beat = loadBeat();
const { subject } = beat;
const textPerRegister = textPerRegisterOf(beat.copy);
const newsroom = readPalette(HERE, { stopAt: join(HERE, "..") });
const BEAT_FACTS = { evidenceLevels: subject.BREAKS.length + 1 };
console.log(
  reportComposition(
    composeDirections({ newsroom, filed: filedIds.map((id) => readDirection(join(DIRECTIONS, `${id}.md`))), beat: BEAT_FACTS, textPerRegister }),
    { beat: BEAT_FACTS },
  ),
);
console.log(`treatments applicable: ${subject.offered.map((t) => t.id).join(", ")}\n`);

/** The markup of every event's last frame, rendered in Bun, held to the landscape floor. */
export function assertEventFramesReadable(props, id) {
  for (const event of EVENT_ORDER) {
    const frame = Math.min(endOf(props.timing[event]), props.timing.total) - 1;
    assertTypeFloor(renderToStaticMarkup(createElement(ChoroplethFrame, { ...props, at: frame })), SIZE, { what: `${id} at the end of ${event} (frame ${frame})` });
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
  const envDir = await mkdtemp(join(tmpdir(), "video-choropleth-env-"));
  try {
    const built = buildDirection(id, beat);
    const { props, report, direction } = built;
    console.log(id);
    for (const d of direction.decisions) console.log(`  ${d.register.padEnd(8)} ${d.role.padEnd(15)} -> ${d.family}`);
    console.log(
      `  title form ${report.titleForm + 1} at ${report.titleSize}px · source form ${report.sourceForm + 1} · stage ${report.stage.width}×${report.stage.height} ` +
        `at (${report.stage.x}, ${report.stage.y}) · k ${report.k.toFixed(3)} · seas ${report.waters.join(", ") || "none"}`,
    );
    assertEventFramesReadable(props, id);

    const auditPath = join(OUT, `${id}-props.json`);
    const propsPath = await writeRenderProps({ props, wanted: wantedOf(props.registers), auditPath });
    const envFile = join(envDir, "empty.env");
    await writeFile(envFile, "");
    const binary = join(ROOT, "node_modules/.bin/remotion");
    const entry = relative(ROOT, join(HERE, "index.ts"));

    if (lookDir) {
      await mkdir(lookDir, { recursive: true });
      const T = props.timing;
      const mid = (event, [a, b]) => Math.round(T[event].start + T[event].duration * (a + b) / 2);
      const frames = [
        ...EVENT_ORDER.map((event) => ({ name: `end-${event}`, frame: endOf(T[event]) - 1 })),
        { name: "mid-reference", frame: Math.round(T.reference.start + T.reference.duration / 2) },
        { name: "mid-reveal-filter", frame: mid("reveal", WINDOWS.reveal.filter) },
        ...[0.3, 0.6].map((k) => ({ name: `reveal-floor-${k}`, frame: Math.round(T.reveal.start + T.reveal.duration * (WINDOWS.reveal.filter[0] + k * (WINDOWS.reveal.filter[1] - WINDOWS.reveal.filter[0]))) })),
        { name: "subject-counting", frame: Math.round(T.subject.start + T.subject.duration * (COUNT_UP.neighbour[1] + COUNT_UP.neighbour[2]) / 2) },
        { name: "reference-lowest", frame: Math.round(T.reference.start + T.reference.duration * 0.6) },
        { name: "title-card", frame: Math.round(T.establish.duration / 2) },
        { name: "conclusion-map", frame: Math.round(T.conclusion.start + T.conclusion.duration * 0.7) },
        { name: "mid-subject-camera", frame: mid("subject", WINDOWS.subject.zoom) },
        { name: "mid-conclusion-camera", frame: mid("conclusion", WINDOWS.conclusion.zoom) },
        { name: "first", frame: 0 },
      ];
      for (const { name, frame } of frames) {
        const run = spawnSync(binary, ["still", entry, COMPOSITION, join(lookDir, `${id}-${String(frame).padStart(3, "0")}-${name}.png`), `--frame=${frame}`, `--props=${propsPath}`, "--timeout=180000", `--env-file=${envFile}`], {
          cwd: ROOT,
          stdio: "ignore",
        });
        if (run.status !== 0) throw new Error(`remotion still exited with ${run.status} at frame ${frame}`);
      }
      await rm(auditPath, { force: true });
      console.log(`  -> ${frames.length} frames in ${lookDir}`);
      continue;
    }

    const still = join(OUT, `${id}-final-frame.png`);
    const started = Date.now();
    const stillRun = spawnSync(binary, ["still", entry, COMPOSITION, still, "--frame=-1", `--props=${propsPath}`, "--timeout=180000", `--env-file=${envFile}`], {
      cwd: ROOT,
      stdio: "inherit",
    });
    if (stillRun.status !== 0) throw new Error(`remotion still exited with ${stillRun.status}`);
    assertDeliveredSize(readPngSize(await readFile(still)), SIZE, { what: `renders/${id}-final-frame.png` });
    console.log(`  -> renders/${id}-final-frame.png (${Math.round((Date.now() - started) / 1000)}s)`);
    if (stillOnly) continue;

    const movie = join(OUT, `${id}.mp4`);
    const movieStarted = Date.now();
    const movieRun = spawnSync(binary, ["render", entry, COMPOSITION, movie, `--props=${propsPath}`, "--concurrency=1", "--timeout=180000", `--env-file=${envFile}`], {
      cwd: ROOT,
      stdio: "inherit",
    });
    if (movieRun.status !== 0) throw new Error(`remotion render exited with ${movieRun.status}`);
    assertDeliveredSize(mp4Size(movie), SIZE, { what: `renders/${id}.mp4` });
    console.log(`  -> renders/${id}.mp4 (${Math.round((Date.now() - movieStarted) / 1000)}s)\n`);
  } catch (error) {
    for (const path of outputs) await rm(path, { force: true });
    refused.push({ id, why: error.message });
    console.log(`  REFUSED — ${error.message}\n`);
  } finally {
    await rm(envDir, { recursive: true, force: true });
  }
}

if (refused.length) {
  console.log(`refused by ${refused.length}: ${refused.map((r) => r.id).join(", ")}`);
  process.exitCode = 1;
}
