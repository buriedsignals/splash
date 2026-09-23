// « Tous plus propres chez eux, 5 plus légers en Europe » — rendered as video once per filed direction: the scrolly's picture told
// in time (BRIEF.md). Everything is measured and asserted in Bun (`build.mjs`); the markup of every event's last
// frame is held to the type floor; the faces are embedded; Remotion renders the still at the last frame, then
// the mp4. An EMPTY `--env-file` on every `remotion` spawn.
//
// Usage:  bun proof/video-connected-scatter-lowcarbon/render-directions-video.mjs [--only <id>] [--still] [--look <dir>]

import { readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readPalette } from "#shared/chart-beat/colour.mjs";
import { assertDeliveredSize, assertTypeFloor, nameAtSize, readPngSize } from "#shared/chart-video/sizes.mjs";
import { EVENT_ORDER, endOf } from "#shared/chart-video/timing.ts";
import { composeDirections, report as reportComposition } from "#shared/design-base/compose.mjs";
import { readDirection } from "#shared/design-base/read-direction.mjs";
import { wantedOf, writeRenderProps } from "../../skills/chart-video/scripts/video-faces.mjs";
import { buildDirection, DIRECTIONS, loadBeat, ROOT, SIZE, textPerRegisterOf } from "./build.mjs";
import { ConnectedScatterFrame } from "./ConnectedScatterFrame.tsx";
import { WINDOWS } from "./scene.mjs";

const HERE = import.meta.dirname;
const OUT = join(HERE, "renders");
const COMPOSITION = `video-connected-scatter-lowcarbon-${SIZE}`;

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
/** `--look <dir>`: instead of the deliverables, render the frames a reviewer looks at into <dir> — the
 *  last frame of every event, and the middle of each camera move. */
const lookAt = args.indexOf("--look");
const lookDir = lookAt === -1 ? null : args[lookAt + 1];
if (lookAt !== -1 && !lookDir) throw new Error("--look takes a directory");

const beat = loadBeat();
const { subject } = beat;
const textPerRegister = textPerRegisterOf(beat.copy, beat.subject);
const newsroom = readPalette(HERE);
const BEAT_FACTS = { evidenceLevels: 4 };
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
    assertTypeFloor(renderToStaticMarkup(createElement(ConnectedScatterFrame, { ...props, at: frame })), SIZE, { what: `${id} at the end of ${event} (frame ${frame})` });
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
  const envDir = await mkdtemp(join(tmpdir(), "video-connected-scatter-env-"));
  try {
    const built = buildDirection(id, beat);
    const { props, report, direction } = built;
    console.log(id);
    for (const d of direction.decisions) console.log(`  ${d.register.padEnd(8)} ${d.role.padEnd(15)} -> ${d.family}`);
    console.log(
      `  title form ${report.titleForm + 1} · source form ${report.sourceForm + 1} · k ${report.k.toFixed(3)} · ${report.named}`,
    );
    assertEventFramesReadable(props, id);
    if (checkOnly) {
      console.log(`  checked at ${SIZE}\n`);
      continue;
    }

    const auditPath = join(OUT, `${at}-props.json`);
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
        { name: "first", frame: 0 },
        ...[0.55, 0.8].map((t) => ({ name: `reference-bars-${t}`, frame: Math.round(T.reference.start + T.reference.duration * t) })),
        ...[0.3, 0.6].map((t) => ({ name: `reveal-travel-${t}`, frame: Math.round(T.reveal.start + T.reveal.duration * (WINDOWS.reveal.travel[0] + t * (WINDOWS.reveal.travel[1] - WINDOWS.reveal.travel[0]))) })),
        { name: "subject-zooming", frame: Math.round(T.subject.start + T.subject.duration * 0.2) },
        { name: "conclusion-picking", frame: Math.round(T.conclusion.start + T.conclusion.duration * 0.5) },
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

    const still = join(OUT, `${at}-final-frame.png`);
    const started = Date.now();
    const stillRun = spawnSync(binary, ["still", entry, COMPOSITION, still, "--frame=-1", `--props=${propsPath}`, "--timeout=180000", `--env-file=${envFile}`], {
      cwd: ROOT,
      stdio: "inherit",
    });
    if (stillRun.status !== 0) throw new Error(`remotion still exited with ${stillRun.status}`);
    assertDeliveredSize(readPngSize(await readFile(still)), SIZE, { what: `renders/${at}-final-frame.png` });
    console.log(`  -> renders/${at}-final-frame.png (${Math.round((Date.now() - started) / 1000)}s)`);
    if (stillOnly) continue;

    const movie = join(OUT, `${at}.mp4`);
    const movieStarted = Date.now();
    const movieRun = spawnSync(binary, ["render", entry, COMPOSITION, movie, `--props=${propsPath}`, "--concurrency=1", "--timeout=180000", `--env-file=${envFile}`], {
      cwd: ROOT,
      stdio: "inherit",
    });
    if (movieRun.status !== 0) throw new Error(`remotion render exited with ${movieRun.status}`);
    assertDeliveredSize(mp4Size(movie), SIZE, { what: `renders/${at}.mp4` });
    console.log(`  -> renders/${at}.mp4 (${Math.round((Date.now() - movieStarted) / 1000)}s)\n`);
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
    await rm(envDir, { recursive: true, force: true });
  }
}

if (refused.length) {
  console.log(`refused by ${refused.length}: ${refused.map((r) => r.id).join(", ")}`);
  process.exitCode = 1;
}
