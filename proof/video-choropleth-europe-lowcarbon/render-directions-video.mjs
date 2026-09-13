// twin/proof/video-choropleth-europe-lowcarbon/render-directions-video.mjs
//
// « Le bas-carbone européen est au nord-ouest — et en Albanie », rendered as video once per filed
// direction, through the design base and the live map engine (spec §4.1, §4.3).
//
// Everything is measured and asserted HERE, in Bun, before Chrome is started: the direction's
// registers at the video size, the frame's layout, the embedded faces, the plan the map mounts (with
// every word placed in the video's own two cameras), the states each event ends on, and every
// derived value BRIEF.md names. The composition only draws what it is handed.
//
// THE KEY STAYS IN THIS PROCESS. It is read from the worktree's `.env` into a variable, handed to
// `renderVideoMap` (which gives it to the local proxy and nothing else), and to the glyph probe below;
// it is never printed, never written into a props file (the audit file is searched for it and the
// direction refused if it is there), and never put on a command line.
//
// `renders/`, PLURAL — the directory every export guard reads.
//
// Usage:  bun proof/video-choropleth-europe-lowcarbon/render-directions-video.mjs [--only <id>] [--still]
//         `--only` renders one filed direction; `--still` stops after the final-frame still.

import { readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { readPalette } from "#shared/chart-beat/colour.mjs";
import { adjustToContrast, TEXT_CONTRAST_MIN } from "#shared/chart-beat/render-still.mjs";
import { assertDeliveredSize, readPngSize, sizeFor } from "#shared/chart-video/sizes.mjs";
import { EVENT_ORDER } from "#shared/chart-video/timing.ts";
import { registerOf } from "#shared/design-base/register.mjs";
import { rangesNeededBy, assertRangesServed } from "#shared/map-beat/bake.mjs";
import { assertNotFallback, DEFAULT_RANGES, mapTilerKeyIn, maptilerGlyphs } from "#shared/map-beat/glyphs.mjs";
import { makePlan, validatePlan } from "#shared/map-beat/plan.mjs";
import { validateExpressions } from "#shared/map-beat/mount.mjs";
import { assertNoDoubledBasemap } from "#shared/map-beat/style.mjs";
import { plateTints } from "#shared/map-beat/tints.mjs";
import { readDirection } from "../../scripts/design-base/read-direction.mjs";
import { composeDirections, report as reportComposition } from "../../scripts/design-base/compose.mjs";
import { resolveDirectionFamilies } from "../../scripts/design-base/resolve-families.mjs";
import { assertEventStates } from "../../skills/map-beat/scripts/choreography.mjs";
import { renderVideoMap } from "../../skills/map-beat/scripts/render-video-map.mjs";
import { wantedOf, writeRenderProps } from "../../skills/map-beat/scripts/video-faces.mjs";
import { videoRegistersOf } from "../../skills/map-beat/scripts/video-registers.mjs";
import { BEAT } from "../static-choropleth-europe-lowcarbon/bake.mjs";
import { CAMERA_ASPECT, loadSubject, rampFor } from "../static-choropleth-europe-lowcarbon/beat.mjs";
import { caseCopy, videoCopyOf, videoLayoutFor } from "./layout.mjs";
import { auditedPlan, cameraOf, mapTextsOf, videoMapFor } from "./map.mjs";
import { statesFor } from "./states.mjs";
import { CHOROPLETH_VIDEO_TIMING } from "./timing-contract.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..", "..");
const DIRECTIONS = join(ROOT, "docs", "design-base", "directions");
const OUT = join(HERE, "renders");
const SIZE = "landscape";
const COMPOSITION = "video-choropleth-europe-lowcarbon-landscape";
const REGISTER_NAMES = ["display", "eyebrow", "body", "annot", "value", "axis"];

const filedIds = readdirSync(DIRECTIONS)
  .filter((f) => f.endsWith(".md"))
  .map((f) => f.replace(/\.md$/, ""));
const args = process.argv.slice(2);
const onlyAt = args.indexOf("--only");
const only = onlyAt === -1 ? null : args[onlyAt + 1];
if (only !== null && !filedIds.includes(only))
  throw new Error(`--only takes one of the filed directions (${filedIds.join(", ")}), got ${JSON.stringify(only)}`);
const stillOnly = args.includes("--still");

// ── the subject, its video copy, and the key ────────────────────────────────────────────────────

const subject = loadSubject({ dir: join(HERE, "..", "static-choropleth-europe-lowcarbon"), console });
const rawCopy = videoCopyOf(subject);
const mapTexts = mapTextsOf(subject);
/** The families are resolved on the words the VIDEO sets, register by register — not on the still's
 *  longer copy (spec §4.1, step 1). */
const textPerRegister = {
  display: rawCopy.title.join(" "),
  eyebrow: rawCopy.eyebrow,
  body: rawCopy.conclusion,
  annot: rawCopy.reference,
  value: rawCopy.breaks.join(" "),
  axis: [rawCopy.keyLabel, ...rawCopy.breaks, rawCopy.missingLabel, rawCopy.source, ...mapTexts].join(" "),
};

/** The worktree's `.env`, read as text and parsed here: the key goes into a variable and nowhere else. */
function envOf(text) {
  const env = {};
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
  return env;
}
const mapTilerKey = mapTilerKeyIn(envOf(await readFile(join(ROOT, ".env"), "utf8").catch(() => "")));
if (!mapTilerKey)
  throw new Error("no MapTiler key in the worktree's .env (MAPTILER_KEY or an alias): the live map cannot be drawn");

/** A network failure's own message can carry the requested URL, key included; only its kind leaves. */
async function glyphs(face, range) {
  try {
    return await maptilerGlyphs(face, range, mapTilerKey);
  } catch (error) {
    throw new Error(`the glyph probe for ${face} ${range} failed (${error?.name ?? "error"}); nothing more is printed`);
  }
}

/** THE FACES THE MAP'S WORDS ASK FOR MUST BE SERVED, AND SERVE EVERY RANGE THEY REACH. MapTiler
 *  answers 200 with Noto Sans for a face it does not have, and a word canvas-drawn by MapLibre is
 *  invisible to `face-coverage.ts`, so this is the check the map's words get instead (spec §4.1). */
async function assertMapFacesServed(plan) {
  const faces = [...new Set(plan.layers.flatMap((l) => l.layout?.["text-font"] ?? []))];
  const words = plan.layers.flatMap((l) =>
    (l.data?.features ?? []).map((f) => f.properties?.name).filter((n) => typeof n === "string"),
  );
  for (const face of faces) {
    const suffix = face.split(" ").slice(1).join(" ") || "Regular";
    assertNotFallback(await glyphs(face, "0-255"), await glyphs(`Zzz Fictive ${suffix}`, "0-255"), face);
  }
  const served = [];
  for (const range of [...new Set([...DEFAULT_RANGES, ...rangesNeededBy(words)])]) {
    const bodies = await Promise.all(faces.map((face) => glyphs(face, range)));
    if (bodies.every((b) => b.length > 0)) served.push(range);
  }
  assertRangesServed(words, served);
  return { faces, words: words.length, ranges: served };
}

function mp4Size(path) {
  const probe = spawnSync(
    "ffprobe",
    ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height", "-of", "json", path],
    { encoding: "utf8" },
  );
  if (probe.status !== 0) throw new Error(`ffprobe could not read ${relative(ROOT, path)}: ${probe.stderr.trim()}`);
  const [{ width, height }] = JSON.parse(probe.stdout).streams;
  return { width, height };
}

// ── the composition report, as the still prints it ─────────────────────────────────────────────

const filed = filedIds.map((id) => readDirection(join(DIRECTIONS, `${id}.md`)));
const newsroom = readPalette(HERE, { stopAt: join(HERE, "..") });
const BEAT_FACTS = { evidenceLevels: subject.BREAKS.length + 1 };
console.log(
  reportComposition(composeDirections({ newsroom, filed, beat: BEAT_FACTS, textPerRegister }), { beat: BEAT_FACTS }),
);
console.log(`treatments applicable: ${subject.offered.map((t) => t.id).join(", ")}\n`);

const refused = [];
const strokeScale = sizeFor(SIZE).typeScale;

for (const id of filedIds.filter((i) => only === null || i === only)) {
  const direction = resolveDirectionFamilies(readDirection(join(DIRECTIONS, `${id}.md`)), textPerRegister);
  console.log(id);
  for (const d of direction.decisions)
    console.log(
      `  ${d.register.padEnd(8)} ${d.role.padEnd(15)} -> ${d.family}` +
        (d.refused.length ? `   refused: ${d.refused.map((r) => `${r.family} [${r.missing.join(",")}]`).join(", ")}` : ""),
    );

  const outputs = [`${id}.mp4`, `${id}-final-frame.png`, `${id}-props.json`].map((f) => join(OUT, f));
  try {
    // ── registers → layout ───────────────────────────────────────────────────────────────────
    const resolved = Object.fromEntries(REGISTER_NAMES.map((name) => [name, registerOf(direction, name)]));
    const drawnRegisters = videoRegistersOf(resolved, SIZE);
    const layout = videoLayoutFor({
      registers: drawnRegisters,
      copy: caseCopy(rawCopy, drawnRegisters),
      aspect: CAMERA_ASPECT,
      size: SIZE,
    });
    const registers = layout.registers;
    console.log(
      `  layout: panel ${layout.panel.width}px · title form ${layout.title.form + 1}, ${layout.title.lines} lines at ` +
        `${layout.title.fontSize}px · map ${layout.drawn.width}x${layout.drawn.height} at (${layout.mapBox.x}, ${layout.mapBox.y})`,
    );

    // ── colours ──────────────────────────────────────────────────────────────────────────────
    const tints = plateTints(direction);
    const ramp = rampFor(direction, subject);
    const accentInk = adjustToContrast(direction.accent, direction.ground, TEXT_CONTRAST_MIN);
    if (!accentInk) throw new Error(`no variant of the accent ${direction.accent} reads on ${direction.ground}`);
    const colours = {
      ground: direction.ground,
      accentInk,
      classFills: Array.from({ length: subject.BREAKS.length + 1 }, (_, i) => ramp.classFill(i)),
      classBreaks: subject.BREAKS,
      missingFill: ramp.missingFill,
      landNoValue: ramp.landNoValue,
      referenceStroke: direction.stroke.rule * strokeScale,
    };

    // ── states → the map ─────────────────────────────────────────────────────────────────────
    const states = assertEventStates(statesFor(subject, { drawn: layout.drawn }), [...EVENT_ORDER]);
    const map = videoMapFor({ direction, subject, layout, states, tints, accentInk, strokeScale });
    const overview = cameraOf(states[0], layout.drawn);
    const [west, north] = overview.toLonLat([0, 0]);
    const [east, south] = overview.toLonLat([layout.drawn.width, layout.drawn.height]);
    const plan = makePlan({
      style: { name: BEAT.style },
      camera: { bounds: [[west, south], [east, north]], drawn: layout.drawn },
      layers: map.layers,
    });
    const violations = [...validatePlan(plan), ...validateExpressions(plan)];
    if (violations.length) throw new Error(`the plan is not renderable:\n  ${violations.join("\n  ")}`);
    assertNoDoubledBasemap(plan);
    const glyphReport = await assertMapFacesServed(plan);
    console.log(
      `  plan: ${plan.layers.length} layers (${plan.layers.map((l) => l.id).join(", ")}) · ${glyphReport.words} map words ` +
        `in ${glyphReport.faces.join(", ")} · ranges ${glyphReport.ranges.join(", ")}`,
    );
    console.log(
      `  zoom: ring-neighbours ${map.report.ringNeighbours.join(", ")} · window ` +
        `${map.report.window.west.toFixed(2)}–${map.report.window.east.toFixed(2)}°E × ` +
        `${map.report.window.south.toFixed(2)}–${map.report.window.north.toFixed(2)}°N · Albania ` +
        `${map.report.albaniaWidth.overview.toFixed(1)}px → ${map.report.albaniaWidth.zoomed.toFixed(1)}px against a ` +
        `${map.report.albaniaWidth.label.toFixed(1)}px « 100 % »`,
    );
    for (const w of map.words)
      console.log(
        `    ${w.group.padEnd(10)} « ${w.lines.join(" / ")} »` +
          (w.pass ? ` ${w.pass}${w.leader ? " (leader)" : ""}` : " beside the ring") +
          ` · ink ${w.ink} on ${w.halo}`,
      );

    // ── render: the final frame first, then the mp4 ──────────────────────────────────────────
    const auditPath = join(OUT, `${id}-props.json`);
    const buildProps = async (proxyOrigin) =>
      writeRenderProps({
        props: {
          layout,
          registers,
          plan,
          styleUrl: `${proxyOrigin}/maptiler/maps/${plan.style.name}/style.json`,
          tints: { water: tints.water, land: tints.land },
          states,
          timing: CHOROPLETH_VIDEO_TIMING,
          colours,
        },
        wanted: wantedOf(registers),
        auditPath,
      });
    const audit = async () => {
      const props = JSON.parse(await readFile(auditPath, "utf8"));
      const text = JSON.stringify({ ...props, plan: auditedPlan(props.plan) }, null, 2);
      if (text.includes(mapTilerKey) || text.includes(encodeURIComponent(mapTilerKey)))
        throw new Error(`the audit props file carries the MapTiler key; it is deleted and ${id} refused`);
      await writeFile(auditPath, text);
    };
    const render = (mode) =>
      renderVideoMap({
        entry: relative(ROOT, join(HERE, "index.ts")),
        composition: COMPOSITION,
        buildProps,
        outDir: OUT,
        name: id,
        mapTilerKey,
        mode,
      });

    const still = await render("still");
    await audit();
    assertDeliveredSize(readPngSize(await readFile(still.path)), SIZE, { what: `renders/${id}-final-frame.png` });
    console.log(`  -> renders/${id}-final-frame.png (${still.seconds}s, proxy ${JSON.stringify(still.proxyCounts)})`);
    if (stillOnly) continue;

    const movie = await render("mp4");
    await audit();
    assertDeliveredSize(mp4Size(movie.path), SIZE, { what: `renders/${id}.mp4` });
    console.log(`  -> renders/${id}.mp4 (${movie.seconds}s, proxy ${JSON.stringify(movie.proxyCounts)})\n`);
  } catch (error) {
    for (const path of outputs) await rm(path, { force: true });
    refused.push({ id, why: error.message });
    console.log(`  REFUSED — ${error.message}\n`);
  }
}

if (refused.length) {
  console.log(`refused by ${refused.length}: ${refused.map((r) => r.id).join(", ")}`);
  process.exitCode = 1;
}
