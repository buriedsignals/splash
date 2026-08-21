// stories/stress-t-europe-recycling/beats/europe-recycling-map/render-video.mjs
//
// Rungs 2 and 3 of the render ladder for this beat: the video's FINAL FRAME on its own, then the
// mp4. In that order, always — a wrong end state is a wrong video, and finding out costs seconds
// at rung 2 instead of minutes at rung 3. There is no rung 1 here because there is no static
// format in this story: the slot pinned map x video, and a static component nobody asked for is a
// beat this skill's own rules say not to build.
//
// It runs in node, which is why it is the piece that derives the furniture colours: `deriveFurniture`
// sits beside a native rasteriser no browser bundle can load.
//
// It also runs the checks a render cannot make for itself:
//   · the JOIN, both ways, which is the whole point of this story (see the alias table's header);
//   · the DUPLICATE, which the profile found and nothing downstream of the profile reads;
//   · the CLAIM, measured against the frozen source rather than trusted.
//
// Usage:
//   bun stories/stress-t-europe-recycling/beats/europe-recycling-map/render-video.mjs --final-frame
//   bun stories/stress-t-europe-recycling/beats/europe-recycling-map/render-video.mjs --video

import { spawnSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { deriveFurniture, readPalette } from "#shared/chart-beat/render-still.mjs";
import { checkTiming } from "#shared/chart-video/timing.ts";
// `assertTypeFloor` and `assertWithinStage` are NOT imported here, and that is a finding, not an
// omission: both read `<text>` out of rendered markup, and this format's producer never holds any —
// Remotion renders in a browser. The same two rules are applied inside the component instead, where
// the layout is decided. `assertDeliveredSize` DOES apply here: it reads the artifact's own bytes.
import { assertDeliveredSize, readPngSize, readPinnedSize, sizeFor } from "#shared/chart-video/sizes.mjs";
import {
  EUROPE_STUDY,
  RECYCLING_ALIAS,
  RECYCLING_BREAKS,
  RECYCLING_EXPECTED_NO_DATA,
  assertRampReads,
  dataRampEnd,
  joinValues,
  ratesFromCsv,
  sequentialRamp,
  unmatchedValues,
} from "./geo-recycling.ts";
import { RECYCLING_TIMING } from "./timing.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const STORY_ROOT = resolve(HERE, "../..");
const PACKAGE_ROOT = resolve(HERE, "../../../..");
const dataPath = join(HERE, "recycling.csv");
const plateDir = join(HERE, "plate-560");
const outDir = join(HERE, "renders");
const ENTRY = join(HERE, "index.ts");
const COMPOSITION = "europe-recycling";

// ── The size the storyboard pinned, read from this beat's own BRIEF rather than typed twice ────
const SIZE_NAME = await readPinnedSize(HERE, { readFile, dirname, join });
const SIZE = sizeFor(SIZE_NAME);
console.log(`size: gate 2c pinned ${SIZE_NAME} → ${SIZE.width}x${SIZE.height}, type floor ${SIZE.minTypePx}px, safe band ${SIZE.stage.top}..${SIZE.stage.bottom}`);

const timingErrors = checkTiming(RECYCLING_TIMING);
if (timingErrors.length > 0)
  throw new Error(`RECYCLING_TIMING is not a legal beat timing:\n  ${timingErrors.join("\n  ")}`);

const PALETTE = readPalette(STORY_ROOT, { stopAt: dirname(STORY_ROOT) });

// ── The data, the duplicate, the join ──────────────────────────────────────────────────────────
const { values, droppedDuplicates } = ratesFromCsv(await readFile(dataPath, "utf8"));
if (droppedDuplicates.length === 0) console.log("duplicates: none in the frozen source.");
else
  for (const dup of droppedDuplicates)
    console.log(
      `duplicate: "${dup.country}" appears ${dup.atRows.length} times, byte for byte, at source rows ` +
        `${dup.atRows.join(" and ")} — counted ONCE. The profile already recorded this ` +
        `(source/profile.json, duplicates.count); nothing downstream of the profile reads that field, ` +
        `so this beat recomputes it rather than trusting a Map.set to have been lucky.`,
    );

// The mirror check, on its own, so its verdict is printed rather than only thrown: every value the
// source carries that no shape can receive. `unmatched-value-hides` in the guard catalogue.
const stray = unmatchedValues(EUROPE_STUDY, values, { alias: RECYCLING_ALIAS });
console.log(
  stray.length === 0
    ? `unmatched values: none — all ${values.size} source keys reach a shape through the alias table.`
    : `unmatched values: ${stray.join(", ")}`,
);

const joined = joinValues(EUROPE_STUDY, values, {
  alias: RECYCLING_ALIAS,
  expectedNoData: RECYCLING_EXPECTED_NO_DATA,
});
console.log(
  `join: ${joined.matched} of ${EUROPE_STUDY.length} shapes carry a value; ` +
    `${joined.noData.length} declared no-data.`,
);

// ── The claim ──────────────────────────────────────────────────────────────────────────────────
//
// NOT `claimViolations` from geo-recycling.ts, and the reason is a finding rather than a
// preference: that function only knows ONE claim — "the subject is BELOW a comparison and below
// its neighbours" — which is the CO2 seed's own sentence, with no way to ask the opposite. This
// beat's takeaway is a maximum and a minimum, so the check is written here, against the same
// frozen values, and named as this beat's own.
function extremesViolations(all, { subject, comparison }) {
  const entries = [...all.entries()];
  const problems = [];
  const top = entries.reduce((a, b) => (b[1] > a[1] ? b : a));
  const bottom = entries.reduce((a, b) => (b[1] < a[1] ? b : a));
  if (top[0] !== subject)
    problems.push(`the title says ${subject} is the highest, but ${top[0]} reports ${top[1]}`);
  if (bottom[0] !== comparison)
    problems.push(`the title says ${comparison} is the lowest, but ${bottom[0]} reports ${bottom[1]}`);
  return problems;
}

const SUBJECT_KEY = RECYCLING_ALIAS.DEU;
const COMPARISON_KEY = RECYCLING_ALIAS.MKD;
const violations = extremesViolations(values, { subject: SUBJECT_KEY, comparison: COMPARISON_KEY });
if (violations.length === 0)
  console.log("claim: supported by the source — Germany is the maximum and Macedonia the minimum of the eleven reported rates.");
else
  console.log(
    `claim: NOT SUPPORTED by the source, in ${violations.length} way(s):\n  ${violations.join("\n  ")}\n` +
      "  The title is the journalist's confirmed wording and is rendered as given; this is the check " +
      "that tells them it no longer matches the data.",
  );

const subjectValue = values.get(SUBJECT_KEY);
const comparisonValue = values.get(COMPARISON_KEY);
const gap = Math.round((subjectValue - comparisonValue) * 10) / 10;

const furniture = deriveFurniture(PALETTE.ground);
// THE SHADING IS THE DATA, so it is drawn in the colour the newsroom recorded. The ramp's own foot
// is 0.30 of the way from the ground to the data end rather than the seed's 0.10: on a CHARCOAL
// ground the seed's first class measured 1.24:1 against the plate, and Macedonia — one of the two
// countries this takeaway is about — would have been a shape a reader cannot see it is filled.
// 0.30 puts it at 2.14:1, visibly filled, with every neighbour still clear of the 0.02 separation.
const ramp = assertRampReads(
  sequentialRamp(PALETTE.ground, dataRampEnd(PALETTE.accent, PALETTE.ground), RECYCLING_BREAKS.length + 1, 0.3, 0.9),
  PALETTE.ground,
  "the recycling choropleth ramp",
);

const geometry = JSON.parse(await readFile(join(plateDir, "geometry.json"), "utf8"));

const shared = {
  geometry: { frame: geometry.frame, shapes: geometry.shapes, anchors: geometry.anchors },
  rows: joined.rows,
  breaks: RECYCLING_BREAKS,
  ramp,
  title: "Germany recycles more of its waste than any country that reported.",
  legendCaption: "% of municipal waste recycled",
  caveat: `${joined.noData.length} of ${EUROPE_STUDY.length} countries did not report; definitions of "recycled" differ.`,
  credit: "National environment agencies, March 2025 · basemap © MapTiler, © OpenStreetMap",
  noDataLabel: "did not report",
  conclusion: `${subjectValue.toFixed(1)}% against ${comparisonValue.toFixed(1)}% — ${gap.toFixed(1)} points apart.`,
  ground: PALETTE.ground,
  accent: PALETTE.accent,
  ink: furniture.ink,
  muted: furniture.muted,
  subject: "DEU",
  subjectLabel: "Germany",
  subjectValue,
  comparison: "MKD",
  comparisonLabel: "Macedonia",
  comparisonValue,
};

const argv = process.argv.slice(2);
const wantFinalFrame = argv.includes("--final-frame");
const wantVideo = argv.includes("--video");

await mkdir(outDir, { recursive: true });

function remotion(args) {
  const binary = join(PACKAGE_ROOT, "node_modules/.bin/remotion");
  const started = Date.now();
  const result = spawnSync(binary, args, { cwd: PACKAGE_ROOT, stdio: "inherit" });
  if (result.status !== 0) throw new Error(`remotion ${args[0]} exited with ${result.status}`);
  return Math.round((Date.now() - started) / 1000);
}

/** The IHDR of a PNG on disk, read back from its own bytes — never from the numbers that drew it. */
async function pngSize(path) {
  return readPngSize(await readFile(path));
}

if (wantFinalFrame || wantVideo) {
  const plate = `data:image/png;base64,${(await readFile(join(plateDir, "plate.png"))).toString("base64")}`;
  const propsPath = join(outDir, "video-props.json");
  await writeFile(propsPath, JSON.stringify({ ...shared, plate }));

  const framePath = join(outDir, "europe-recycling-final-frame.png");
  const stillSeconds = remotion(["still", ENTRY, COMPOSITION, framePath, "--frame=-1", `--props=${propsPath}`, "--timeout=180000"]);
  assertDeliveredSize(await pngSize(framePath), SIZE_NAME, { what: "the final frame" });
  console.log(`final frame (--frame=-1) → ${framePath}  [${stillSeconds}s]  Now open it and look at it.`);

  if (wantVideo) {
    const videoPath = join(outDir, "europe-recycling.mp4");
    const videoSeconds = remotion(["render", ENTRY, COMPOSITION, videoPath, `--props=${propsPath}`, "--concurrency=1", "--timeout=180000"]);
    console.log(`video → ${videoPath}  [${videoSeconds}s]`);
  }
} else {
  console.log("nothing asked for. Pass --final-frame or --video.");
}
