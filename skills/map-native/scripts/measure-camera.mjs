// skills/map-native/scripts/measure-camera.mjs
// READ THE CAMERA OF EVERY BEAT OFF A RENDERED STORY MP4.
//
// The IO shell around lib/core/camera-measure.ts, which holds the arithmetic and all of the
// stated limits. This file does the three things that arithmetic cannot: decode a frame,
// know WHICH frame a beat settles on, and know which colour the component paints its marks.
// Same split, and the same reason, as snap-video.mjs vs lib/core/video-verify.ts — the
// measurement is unit-tested without a render (lib/core/camera-measure.test.ts), and only
// the plumbing lives here.
//
// ★ WHY THIS EXISTS AS A COMMITTED TOOL. Two separate sessions needed to measure a map
//   video's zoom and rebuilt this by hand, and its numbers survived only in a comment header
//   (src/core/tour-box.ts). The next camera change should MEASURE, not re-derive. Three
//   instruments were tried and two were wrong — see camera-measure.ts's header for the
//   whole-frame-difference metric that moved the wrong way, the IoU disc-fit that was off by
//   five doublings, and the SHA-256 comparison that cannot work because the render is not
//   byte-deterministic.
//
// ★ WHAT A BEAT'S "SETTLED FRAME" IS. A beat is a camera MOVE followed by a HOLD. Measuring
//   inside the move reads a camera mid-flight, which is a real number describing nothing.
//   This samples 60% into the hold: past every easing, and clear of the next move.
//
// Usage:
//   bun measure-camera.mjs <mp4> <config.json> <locator|symbol> [options]
//
//     --color=#rrggbb   mark fill hue to key on. Default: locator #E69F00, symbol #2171b5,
//                       which is what `houseFill` paints when a config sets no `brandHue`.
//                       ⚠ THE COLOUR IS A PROPERTY OF THE RENDER, NOT OF THE CONFIG YOU HOLD.
//                       An mp4 outlives the file it came from, and a config that has since
//                       gained a house hue will not match a frame rendered before it did.
//                       Cost of getting this wrong, measured: a run reporting 0 blobs at
//                       every beat, read as "the marks are missing" — reach for
//                       --hue-histogram, which answers it in one frame.
//     --fps=30          frame rate of the render.
//     --hue-histogram   print the saturated hues actually present in the first settled
//                       frame and exit. Use this when a run reports 0 blobs everywhere:
//                       almost always the mark colour is not what the config said.
//     --fixture=<path>  also write the run-length-encoded hue masks of every measured beat
//                       to <path>, as the ground-truth fixture shape
//                       lib/core/camera-measure.fixture.json uses.
//     --case=<name>     case name to record in the fixture (default: the mp4's basename).
//     --json            print the rows as JSON instead of a table.
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";
import { resolveFfBinaries } from "./lib/ffbin.mjs";
import {
  hueMask,
  hueOfHex,
  findBlobs,
  fitCamera,
  inverseMercator,
  rgbToHsv,
  encodeMaskRuns,
} from "../../../lib/core/camera-measure.ts";
import { deriveSymbolStory } from "../src/symbol-story.ts";
import {
  deriveLocatorStory,
  locatorBeatsForMode,
} from "../src/locator-story.ts";
import { beatsForMode, resolveRevealMode } from "../src/map-story.ts";
import { buildTimeline } from "../src/story-timeline.ts";
import { AREAL_TIMELINE_OPTS } from "../src/story-choreography.ts";

/** Fraction into a beat's HOLD at which the camera is sampled — see "settled frame" above.
 *  0 would sample the instant the move ends (easing may still be resolving); 1 would sample
 *  the instant the next move begins. */
const HOLD_SAMPLE_FRACTION = 0.6;

/** Default mark fills, per engine path — the colours the components paint when a config
 *  names no house colour. */
const DEFAULT_FILL = { locator: "#E69F00", symbol: "#2171b5" };

function flag(name, fallback = undefined) {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit === undefined ? fallback : hit.slice(name.length + 3);
}
const has = (name) => process.argv.includes(`--${name}`);

const [mp4Arg, configArg, kind] = process.argv.slice(2);
if (!mp4Arg || !configArg || !kind) {
  console.error(
    "usage: bun measure-camera.mjs <mp4> <config.json> <locator|symbol> [--color=#rrggbb] [--fps=30] [--hue-histogram] [--fixture=<path>] [--case=<name>] [--json]",
  );
  process.exit(2);
}
if (kind !== "locator" && kind !== "symbol") {
  console.error(`measure-camera: kind must be "locator" or "symbol", got ${kind}`);
  process.exit(2);
}
const mp4 = resolve(mp4Arg);
const config = JSON.parse(readFileSync(resolve(configArg), "utf8"));
const fps = Number(flag("fps", "30"));
const hue = hueOfHex(flag("color", DEFAULT_FILL[kind]));

// --- beats + timeline: EXACTLY what the component renders ---------------------------
// Derived from the same functions the producer calls, never re-implemented here: a
// hand-rolled beat list that drifts from the renderer would sample the wrong frames and
// report a camera nobody ever saw.
const mode = resolveRevealMode(config);
let beats;
let marks;
if (kind === "locator") {
  beats = locatorBeatsForMode(
    deriveLocatorStory(config.markers, {
      title: config.title ?? "",
      description: config.description,
      insight: config.insight ?? config.title ?? "",
      lang: config.lang,
      arcBeats: config.arcBeats,
    }),
    mode,
  );
  marks = config.markers.map((m) => ({ label: m.label, lon: m.lon, lat: m.lat }));
} else {
  beats = beatsForMode(
    deriveSymbolStory(
      config.points,
      {
        title: config.title ?? "",
        insight: config.insight ?? config.title ?? "",
        unit: config.valueUnit ?? "",
        arcBeats: config.arcBeats,
      },
      { maxReveals: config.maxReveals },
    ),
    mode,
  );
  marks = config.points.map((p) => ({ label: p.label, lon: p.lon, lat: p.lat }));
}
const { phases, totalFrames } = buildTimeline(
  beats.map((b) => b.kind),
  fps,
  AREAL_TIMELINE_OPTS,
);
const settledFrame = (i) =>
  phases[i].startFrame +
  phases[i].moveFrames +
  Math.floor(phases[i].holdFrames * HOLD_SAMPLE_FRACTION);

// --- frame extraction ----------------------------------------------------------------
const ff = resolveFfBinaries();
const tmpDir = mkdtempSync(join(tmpdir(), "measure-camera-"));
const probe = JSON.parse(
  execFileSync(
    ff.ffprobe,
    [
      "-v", "error", "-select_streams", "v:0",
      "-show_entries", "stream=width,height,nb_read_packets",
      "-count_packets", "-of", "json", mp4,
    ],
    { cwd: ff.cwd, env: ff.env },
  ).toString(),
);
const W = probe.streams[0].width;
const H = probe.streams[0].height;
const NB = Number(probe.streams[0].nb_read_packets);

/** One decoded frame as the packed RGB24 `RawFrame` lib/core/camera-measure.ts consumes.
 *  Remotion's bundled ffmpeg is a slim build with NO `rawvideo` muxer, but its `image2pipe`
 *  muxer + `rawvideo` codec write one packed RGB24 frame to a file — the same route
 *  snap-video.mjs already takes. Seeks by frame index, mid-frame, so rounding never lands on
 *  a neighbour. */
function frameAt(index) {
  const out = join(tmpDir, `f${index}.rgb`);
  execFileSync(
    ff.ffmpeg,
    [
      "-v", "error", "-ss", ((index + 0.5) / fps).toFixed(4), "-i", mp4,
      "-frames:v", "1", "-c:v", "rawvideo", "-pix_fmt", "rgb24",
      "-f", "image2pipe", "-y", out,
    ],
    { cwd: ff.cwd, env: ff.env },
  );
  const data = readFileSync(out);
  if (data.length !== W * H * 3) {
    throw new Error(`frame ${index}: got ${data.length} bytes, want ${W * H * 3}`);
  }
  return { width: W, height: H, data };
}

try {
  // --hue-histogram: the escape hatch for "0 blobs everywhere".
  if (has("hue-histogram")) {
    const frame = frameAt(Math.min(settledFrame(1) || settledFrame(0), NB - 1));
    const bins = new Map();
    for (let p = 0; p < frame.data.length; p += 3) {
      const [h, s, v] = rgbToHsv(frame.data[p], frame.data[p + 1], frame.data[p + 2]);
      if (s < 0.3 || v < 0.2) continue;
      const b = Math.round(h / 5) * 5;
      bins.set(b, (bins.get(b) ?? 0) + 1);
    }
    console.log(`saturated hues in frame ${settledFrame(1)} of ${basename(mp4)}:`);
    for (const [h, n] of [...bins].sort((a, b) => b[1] - a[1]).slice(0, 12)) {
      console.log(`  hue ${String(h).padStart(3)}: ${n} px`);
    }
    process.exit(0);
  }

  const rows = [];
  const fixtureBeats = [];
  for (let i = 0; i < beats.length; i++) {
    const frameIndex = Math.min(settledFrame(i), NB - 1);
    const frame = frameAt(frameIndex);
    const mask = hueMask(frame, { hue });
    const blobs = findBlobs(mask, W, H);
    const reading = fitCamera(blobs, marks);
    // The centre is resolved here rather than by measureCamera because this file already
    // holds the frame — and L7 applies: it is the camera PLUS this render's furniture inset.
    let centre = null;
    if (reading.ok) {
      const c = inverseMercator(
        (W / 2 - reading.fit.offsetX) / reading.fit.scalePx,
        (H / 2 - reading.fit.offsetY) / reading.fit.scalePx,
      );
      centre = [Number(c.lon.toFixed(4)), Number(c.lat.toFixed(4))];
    }
    rows.push({
      beat: i,
      kind: beats[i].kind,
      frame: frameIndex,
      subject: beats[i].highlight[0] ?? "",
      zoom: reading.ok ? Number(reading.fit.zoom.toFixed(3)) : null,
      blobs: blobs.length,
      inliers: reading.ok ? reading.fit.inliers : 0,
      rmsPx: reading.ok ? Number(reading.fit.residualPx.toFixed(2)) : null,
      refusal: reading.ok ? "" : reading.reason,
      centre: centre ? centre.join(", ") : "",
    });
    fixtureBeats.push({
      beat: i,
      kind: beats[i].kind,
      frame: frameIndex,
      subject: beats[i].highlight[0] ?? "",
      maskRuns: encodeMaskRuns(mask),
      expect: reading.ok
        ? { zoom: Number(reading.fit.zoom.toFixed(3)) }
        : { refusal: reading.reason },
    });
  }

  if (has("json")) {
    console.log(JSON.stringify(rows, null, 2));
  } else {
    console.log(`# ${mp4}`);
    console.log(
      `# ${W}x${H}, ${NB} frames (timeline says ${totalFrames}), mode=${mode}, hue=${hue.toFixed(1)}`,
    );
    console.table(rows);
    const base =
      rows.find((r) => r.kind === "establish") ?? rows.find((r) => r.kind === "title");
    if (base?.zoom) {
      for (const r of rows) {
        if (r.kind !== "reveal") continue;
        if (r.zoom === null) {
          console.log(`  reveal "${r.subject}": NO READING (${r.refusal})`);
        } else {
          console.log(
            `  reveal "${r.subject}": z=${r.zoom} → ${(r.zoom - base.zoom).toFixed(3)} levels in from ${base.kind} z=${base.zoom}`,
          );
        }
      }
    }
  }

  const fixturePath = flag("fixture");
  if (fixturePath) {
    writeFileSync(
      resolve(fixturePath),
      `${JSON.stringify(
        {
          case: flag("case", basename(mp4, ".mp4")),
          mp4: basename(mp4),
          hue: Number(hue.toFixed(4)),
          width: W,
          height: H,
          marks,
          beats: fixtureBeats,
        },
        null,
        1,
      )}\n`,
    );
    console.log(`# fixture → ${resolve(fixturePath)}`);
  }
} finally {
  rmSync(tmpDir, { recursive: true, force: true });
}
