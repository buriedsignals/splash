// `video-cold2-world-population` — rendered as video (BRIEF.md). Everything is measured and asserted in Bun first (`build.mjs`), and a beat
// still carrying a scaffold placeholder is refused; the markup of every event's last frame is held to the type floor;
// the faces are embedded; Remotion renders the still at the last frame, then the mp4 — `--concurrency=1`, and an EMPTY
// `--env-file` on every `remotion` spawn (Remotion otherwise injects the repository's `.env` into the page).
//
// ONE ART DIRECTION BY DEFAULT: the design base's best composed candidate for the newsroom's identity (the root's
// NEWSROOM.md) and this beat's text (`directionsFor`). A production video renders one direction, not three.
//   --candidates <N>  render the composer's top N, for the journalist to choose between
//   --filed           render every filed demo direction — a catalogue or demo proof only
//   --only <label>    render one of those, by its label
//   --still           the last frame only, no mp4
//   --look <dir>      the frames a reviewer looks at, into <dir> — a directory of this beat's own, not a shared one
//
// Usage:  bun proof/video-cold2-world-population/render-directions-video.mjs [--candidates <N> | --filed] [--only <label>] [--still] [--look <dir>]

import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { assertDeliveredSize, assertTypeFloor, readPngSize } from "#shared/chart-video/sizes.mjs";
import { EVENT_ORDER, endOf } from "#shared/chart-video/timing.ts";
import { report as reportComposition } from "#shared/design-base/compose.mjs";
import { wantedOf, writeRenderProps } from "../../skills/chart-video/scripts/video-faces.mjs";
import { assertWritten, BEAT_FACTS, buildDirection, directionsFor, loadBeat, parseDirectionArgs, ROOT, SIZE } from "./build.mjs";
import { WorldPopulationFrame } from "./WorldPopulationFrame.tsx";
import { COMPOSITION_ID } from "./Root.tsx";

const HERE = import.meta.dirname;
const OUT = join(HERE, "renders");

/** The frames a reviewer looks at besides every event's end — the middle of the fill and of the stack. */
const gestureFrames = (T) => [
  { name: "mid-fill", frame: Math.round(T.reveal.start + 0.5 * T.reveal.duration) },
  { name: "mid-stack", frame: Math.round(T.subject.start + 0.58 * T.subject.duration) },
];

const args = parseDirectionArgs(process.argv.slice(2));
const beat = loadBeat();
assertWritten(beat);
const { directions, composition, note } = directionsFor(beat, { candidates: args.candidates, filed: args.filed });
console.log(note);
if (composition) console.log(reportComposition(composition, { beat: BEAT_FACTS }));
if (args.only !== null && !directions.some((d) => d.label === args.only)) throw new Error(`--only takes one of ${directions.map((d) => d.label).join(", ")}`);
const chosen = directions.filter((d) => args.only === null || d.label === args.only);
console.log(`\nrendering ${chosen.length === 1 ? "one direction" : `${chosen.length} directions`}: ${chosen.map((d) => d.label).join(", ")}\n`);

/** The markup of every event's last frame, rendered in Bun, held to the type floor. */
export function assertEventFramesReadable(props, label) {
  for (const event of EVENT_ORDER) {
    const frame = Math.min(endOf(props.timing[event]), props.timing.total) - 1;
    assertTypeFloor(renderToStaticMarkup(createElement(WorldPopulationFrame, { ...props, at: frame })), SIZE, { what: `${label} at the end of ${event} (frame ${frame})` });
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
for (const entry of chosen) {
  const { label } = entry;
  const outputs = [`${label}.mp4`, `${label}-final-frame.png`, `${label}-props.json`].map((f) => join(OUT, f));
  const envDir = await mkdtemp(join(tmpdir(), "video-beat-env-"));
  try {
    const { props, report, direction } = buildDirection(entry, beat);
    console.log(label);
    for (const d of direction.decisions) console.log(`  ${d.register.padEnd(8)} ${d.role.padEnd(15)} -> ${d.family}`);
    console.log(`  title form ${report.titleForm + 1} · source form ${report.sourceForm + 1} · k ${report.k.toFixed(3)}`);
    assertEventFramesReadable(props, label);

    const auditPath = join(OUT, `${label}-props.json`);
    const propsPath = await writeRenderProps({ props, wanted: wantedOf(props.registers), auditPath });
    const envFile = join(envDir, "empty.env");
    await writeFile(envFile, "");
    const binary = join(ROOT, "node_modules/.bin/remotion");
    const entryPoint = relative(ROOT, join(HERE, "index.ts"));
    const remotion = (argv, stdio) => {
      const run = spawnSync(binary, [...argv, `--props=${propsPath}`, "--timeout=180000", `--env-file=${envFile}`], { cwd: ROOT, stdio });
      if (run.status !== 0) throw new Error(`remotion ${argv[0]} exited with ${run.status}`);
    };

    if (args.look) {
      await mkdir(args.look, { recursive: true });
      const T = props.timing;
      const frames = [{ name: "first", frame: 0 }, ...EVENT_ORDER.map((event) => ({ name: `end-${event}`, frame: endOf(T[event]) - 1 })), ...gestureFrames(T)];
      for (const { name, frame } of frames) remotion(["still", entryPoint, COMPOSITION_ID, join(args.look, `${label}-${String(frame).padStart(3, "0")}-${name}.png`), `--frame=${frame}`], "ignore");
      await rm(auditPath, { force: true });
      console.log(`  -> ${frames.length} frames in ${args.look}`);
      continue;
    }

    const still = join(OUT, `${label}-final-frame.png`);
    const started = Date.now();
    remotion(["still", entryPoint, COMPOSITION_ID, still, "--frame=-1"], "inherit");
    assertDeliveredSize(readPngSize(await readFile(still)), SIZE, { what: `renders/${label}-final-frame.png` });
    console.log(`  -> renders/${label}-final-frame.png (${Math.round((Date.now() - started) / 1000)}s)`);
    if (args.still) continue;

    const movie = join(OUT, `${label}.mp4`);
    const movieStarted = Date.now();
    remotion(["render", entryPoint, COMPOSITION_ID, movie, "--concurrency=1"], "inherit");
    assertDeliveredSize(mp4Size(movie), SIZE, { what: `renders/${label}.mp4` });
    console.log(`  -> renders/${label}.mp4 (${Math.round((Date.now() - movieStarted) / 1000)}s)\n`);
  } catch (error) {
    if (!args.look) for (const path of outputs) await rm(path, { force: true });
    refused.push({ label, why: error.message });
    console.log(`  REFUSED — ${error.message}\n`);
  } finally {
    await rm(envDir, { recursive: true, force: true });
  }
}

if (refused.length) {
  console.log(`refused by ${refused.length}: ${refused.map((r) => r.label).join(", ")}`);
  process.exitCode = 1;
}
