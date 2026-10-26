// The half every VIDEO zone kit shares: the run's direction, the story's number format, the refusal wrapper, the type
// floor at every event's end, and the Remotion sequence a proof's render-directions-video.mjs runs — the look stills
// first, then the mp4 — for ONE direction. A kit's render-beat.mjs builds its props (the proof's build.mjs, fed from
// beat.mjs) and hands them to `renderBeatVideo`. A refusal anywhere leaves renders/ empty and exits 1, with the reason
// as the last line printed.
//
// It sits in craft/video/, not craft/_shared/, because the driver copies _shared/ into every beat of every format and
// this file is the video format's alone. The driver must copy it beside a video kit (see video/PATTERN.md).
import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readPalette } from "#shared/chart-beat/colour.mjs";
import { assertDeliveredSize, assertTypeFloor, readPngSize } from "#shared/chart-video/sizes.mjs";
import { EVENT_ORDER, endOf } from "#shared/chart-video/timing.ts";
import { composeDirections, filedDirections, report as composeReport } from "#shared/design-base/index.mjs";
import { directionReachable, readRunDirection } from "#shared/design-base/run-direction.mjs";
import { skillScriptFrom } from "#shared/design-base/skill-script.mjs";
import { splashRoot } from "#shared/design-base/splash-root.mjs";
import { errorText } from "./guards.mjs";

/** A Remotion process that runs longer than this is killed and the beat refused (the target Mac pays every second). */
export const RENDER_TIMEOUT_MS = 10 * 60_000;

const labelOf = (id) => String(id).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/** U+202F (what toLocaleString("fr-FR") puts between thousands) is outside the Latin-1 the faces are cut for. */
export const plain = (text) => String(text).replace(/ /g, " ");

/** STORYBOARD.md's `language:`, or null when the storyboard is absent. */
export function storyLanguage(here) {
  const storyboard = join(here, "..", "..", "STORYBOARD.md");
  if (!existsSync(storyboard)) return null;
  const front = readFileSync(storyboard, "utf8").split("---")[1] ?? "";
  return front.match(/^language:\s*"?([A-Za-z-]+)"?\s*$/m)?.[1] ?? null;
}

/**
 * The ONE direction this beat renders in, as the static and web kits choose it — the run's DIRECTION.md when it is
 * reachable, else the first direction composed from PALETTE.md and the filed directions — returned UNRESOLVED: a
 * proof's build.mjs resolves the families itself against its own words.
 */
export function pickDirection(here, textPerRegister, evidenceLevels = 2) {
  if (directionReachable(here)) {
    const run = readRunDirection(here);
    return { label: labelOf(run.id), chosen: run };
  }
  const composition = composeDirections({ newsroom: readPalette(here), filed: filedDirections(), beat: { evidenceLevels }, textPerRegister });
  if (!composition.offered.length) throw new Error(`no composed direction holds up for this beat:\n${composeReport(composition, {})}`);
  const chosen = composition.offered[0];
  return { label: labelOf(chosen.id), chosen };
}

const COMMA_LANGS = /^(fr|de|es|it|pt|nl|pl|cs|sk|sv|da|fi|nb|nn|no|ru|uk|tr|ro|hu|el|ca|hr|sl|bg|lt|lv|et|id)\b/i;

/**
 * The story's number format for scene.mjs `valueText` — `{ decimals, small, below, decimal, group }`. The decimal
 * separator follows the language (`beat.decimal` overrides it); the decimals follow the worked example's rule (one
 * from 1, two under) while the largest value is under 100, none past it; `beat.decimals` overrides both.
 */
export function numberFormat({ lang, max, decimals, decimal }) {
  const sep = decimal ?? (COMMA_LANGS.test(lang ?? "en") ? "," : ".");
  const group = sep === "," ? " " : ",";
  if (decimals !== undefined) {
    if (!(Number.isInteger(decimals) && decimals >= 0 && decimals <= 3)) throw new Error(`decimals is ${JSON.stringify(decimals)}: give a whole number from 0 to 3`);
    return { decimals, small: decimals, below: 0, decimal: sep, group };
  }
  return max < 100 ? { decimals: 1, small: 2, below: 0.995, decimal: sep, group } : { decimals: 0, small: 0, below: 0, decimal: sep, group };
}

function refuse(here, message) {
  rmSync(join(here, "renders"), { recursive: true, force: true });
  console.log(`REFUSED — ${message}`);
  process.exit(1);
}

/**
 * Runs a kit's whole body — importing beat.mjs, the guards, the build, the renders — with renders/ and look/ emptied
 * first, so a refusal anywhere (beat.mjs throwing on import included) never leaves a previous mp4 behind. Import
 * beat.mjs INSIDE `body`.
 */
export async function refusing(here, body) {
  rmSync(join(here, "renders"), { recursive: true, force: true });
  rmSync(join(here, "look"), { recursive: true, force: true });
  try {
    await body();
  } catch (error) {
    refuse(here, errorText(error));
  }
}

/** The markup of every event's last frame, rendered in Bun, held to the size's type floor; every word measured. */
export function assertEventFramesReadable(Frame, props, size, what) {
  for (const event of EVENT_ORDER) {
    const frame = Math.min(endOf(props.timing[event]), props.timing.total) - 1;
    const svg = renderToStaticMarkup(createElement(Frame, { ...props, at: frame }));
    assertTypeFloor(svg, size, { what: `${what} at the end of ${event} (frame ${frame})` });
    const unmeasured = [...svg.matchAll(/<text\b([^>]*)>([^<]*)/g)].filter((m) => !/data-width="\d/.test(m[1]));
    if (unmeasured.length) throw new Error(`at the end of ${event} (frame ${frame}) the frame draws ${unmeasured.length} word(s) Bun did not measure: ${unmeasured.slice(0, 3).map((m) => JSON.stringify(m[2])).join(", ")}`);
  }
}

const escapeXml = (t) => String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/**
 * The words a video draws, as SVG: the title card (eyebrow, title, the shared chart-video props) and the credit, then
 * the frame's markup at each event's end. The title card is a shared Remotion component that does not render outside
 * a composition, so its lines are taken from the props the video was rendered with.
 */
function wordsDrawn(Frame, props) {
  const card = props.titleCard ?? {};
  const title = (card.title ?? []).map((l) => l.text).join(" ");
  const lines = [card.eyebrow?.text, ...(card.title ?? []).map((l) => l.text), ...(props.credit?.lines ?? []).map((l) => l.text)].filter(Boolean);
  const head = `<svg xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${escapeXml(title)}">${lines.map((t) => `<text>${escapeXml(t)}</text>`).join("")}</svg>`;
  const frames = EVENT_ORDER.map((event) => renderToStaticMarkup(createElement(Frame, { ...props, at: Math.min(endOf(props.timing[event]), props.timing.total) - 1 })));
  return [head, ...frames].join("\n");
}

function mp4Size(path) {
  const probe = spawnSync("ffprobe", ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height", "-of", "json", path], { encoding: "utf8" });
  if (probe.status !== 0) throw new Error(`ffprobe could not read ${path}: ${probe.stderr.trim()}`);
  const [{ width, height }] = JSON.parse(probe.stdout).streams;
  return { width, height };
}

function remotion(root, args, what) {
  const started = Date.now();
  const run = spawnSync(join(root, "node_modules", ".bin", "remotion"), args, { cwd: root, encoding: "utf8", timeout: RENDER_TIMEOUT_MS, killSignal: "SIGKILL", maxBuffer: 64 * 1024 * 1024 });
  const seconds = Math.round((Date.now() - started) / 1000);
  if (run.error?.code === "ETIMEDOUT" || run.signal === "SIGKILL") throw new Error(`remotion ${what} ran past ${RENDER_TIMEOUT_MS / 60000} minutes and was stopped`);
  if (run.status !== 0) {
    const tail = `${run.stdout ?? ""}${run.stderr ?? ""}`.trim().split("\n").slice(-12).join("\n");
    throw new Error(`remotion ${what} exited with ${run.status}:\n${tail}`);
  }
  return seconds;
}

/**
 * Bundles the composition once, renders the look stills, prints `look at:`, then renders the mp4 — all for one
 * direction, at concurrency 1 (the proofs' own setting; a render holds one Chrome tab, not one per core).
 *
 * @param here         the beat folder (index.ts beside it is the Remotion entry)
 * @param label        the direction's label: renders/<label>.mp4
 * @param composition  the composition id the kit's Root.tsx registers at this size
 * @param size         landscape | square | portrait
 * @param props        what build.mjs returned as props (words already measured)
 * @param wanted       `wantedOf(props.registers)` — the faces to embed
 * @param lookFrames   [{ name, frame }] — the proof's `--look` list; the frame named `final` is printed as `look at:`
 * @param lookOnly     stop after the stills (renders/ stays empty: nothing was delivered)
 * @param Frame        the kit's frame component: the markup at each event's end is written beside the mp4 as
 *                     renders/<label>-frames.svg, so review, delivery's alt and the headline score read the words a
 *                     video draws (its title card included) as they read a static plate's SVG
 */
export async function renderBeatVideo({ here, label, composition, size, props, wanted, lookFrames, lookOnly = false, Frame }) {
  const root = splashRoot(here);
  const { writeRenderProps } = await import(skillScriptFrom(here, "chart-video", "scripts", "video-faces.mjs"));
  const out = join(here, "renders");
  const look = join(here, "look");
  mkdirSync(look, { recursive: true });
  const scratch = mkdtempSync(join(tmpdir(), "zone-video-"));
  let propsPath;
  try {
    const audit = join(scratch, `${label}-props.json`);
    propsPath = await writeRenderProps({ props, wanted, auditPath: audit });
    // AN EMPTY --env-file ON EVERY remotion SPAWN: the root's .env holds keys the composition must never see.
    const envFile = join(scratch, "empty.env");
    writeFileSync(envFile, "");
    const bundle = join(scratch, "bundle");
    const bundled = remotion(root, ["bundle", relative(root, join(here, "index.ts")), `--out-dir=${bundle}`, `--env-file=${envFile}`], "bundle");
    console.log(`bundled the composition (${bundled}s)`);

    const startedLook = Date.now();
    const stills = [];
    for (const { name, frame } of lookFrames) {
      const png = join(look, `${label}-${String(frame).padStart(3, "0")}-${name}.png`);
      remotion(root, ["still", bundle, composition, png, `--frame=${frame}`, `--props=${propsPath}`, "--timeout=180000", `--env-file=${envFile}`], `still at frame ${frame}`);
      stills.push({ name, frame, png });
    }
    const final = stills.find((s) => s.name === "final") ?? stills.at(-1);
    assertDeliveredSize(readPngSize(readFileSync(final.png)), size, { what: final.png });
    console.log(`look stills (${stills.length}, ${Math.round((Date.now() - startedLook) / 1000)}s):`);
    for (const s of stills) console.log(`  frame ${String(s.frame).padStart(3)}  ${s.name.padEnd(18)} ${s.png}`);
    console.log(`look at: ${final.png}`);
    if (lookOnly) {
      console.log("--look-only: no mp4 rendered, renders/ left empty");
      return;
    }

    mkdirSync(out, { recursive: true });
    const movie = join(out, `${label}.mp4`);
    const seconds = remotion(root, ["render", bundle, composition, movie, `--props=${propsPath}`, "--concurrency=1", "--timeout=180000", `--env-file=${envFile}`], "render");
    assertDeliveredSize(mp4Size(movie), size, { what: `renders/${label}.mp4` });
    copyFileSync(final.png, join(out, `${label}-final-frame.png`));
    if (Frame) writeFileSync(join(out, `${label}-frames.svg`), wordsDrawn(Frame, props));
    renameSync(audit, join(out, `${label}-props.json`));
    console.log(`rendered renders/${label}.mp4 (${seconds}s, ${props.timing.total} frames at ${props.timing.fps} fps, concurrency 1)`);
    console.log(`look at the mp4's own frames, not only the stills: ffmpeg -ss <seconds> -i ${movie} -frames:v 1 <png>`);
  } finally {
    rmSync(scratch, { recursive: true, force: true });
    // writeRenderProps puts the props WITH the faces' bytes in a temporary folder of its own.
    if (propsPath) rmSync(dirname(propsPath), { recursive: true, force: true });
  }
}
