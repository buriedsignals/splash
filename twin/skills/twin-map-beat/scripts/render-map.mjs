// twin/skills/twin-map-beat/scripts/render-map.mjs
//
// The render ladder for a map beat. Rung 1 is the still (resvg, milliseconds); rung 2 is the
// video's LAST FRAME on its own; rung 3 is the mp4. In that order, always — a wrong end state is a
// wrong video, and finding out costs seconds at rung 2 instead of minutes at rung 3.
//
// It runs in node, which is why it is the piece that derives the furniture colours: `deriveFurniture`
// lives in this skill's OWN `./render-still.mjs` beside a native rasteriser no browser bundle can
// load. That file is a copy of `twin-chart-beat`'s, not an import of it — a skill directory has to
// build after being copied on its own into a journalist's root, so nothing under a skill may import
// out of it (`splash-twin/test/no-cross-skill-imports.test.ts` fails loud on any specifier that
// does). One implementation of the colour rule per render; the copies are kept in step by
// `splash-twin/test/helper-parity.test.ts`.
//
// It also runs the two checks that a render cannot make for itself:
//   · the JOIN, which fails loud naming any shape that found no value (`geo-discipline.md` rule 5);
//   · the CLAIM, which measures the confirmed takeaway against the source it is drawn from.
//
// Usage:
//   bun skills/twin-map-beat/scripts/render-map.mjs --still
//   bun skills/twin-map-beat/scripts/render-map.mjs --final-frame
//   bun skills/twin-map-beat/scripts/render-map.mjs --video

import { spawnSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  deriveFurniture,
  readPalette,
  renderStill,
  readTypeface,
  useTypeface,
  assertDrawnInActiveTypeface,
} from "./render-still.mjs";
import { Co2MapStill } from "../assets/Co2MapStill.tsx";
import {
  CO2_ALIAS,
  CO2_BREAKS,
  CO2_EXPECTED_NO_DATA,
  CO2_STUDY,
  claimViolations,
  fr,
  joinValues,
  sequentialRamp,
  valuesFromCsv,
} from "../assets/geo.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = resolve(HERE, "../../..");
const ENTRY = join(HERE, "../assets/index.ts");
const COMPOSITION = "co2-europe";

// The colours are the one thing in `BEAT` that is not the journalist's words: they are READ back
// from this skill's own `PALETTE.md`, exactly as a beat reads its story's answer.
const PALETTE = readPalette(join(HERE, "..", "assets"), { stopAt: join(HERE, "..") });

// The typeface is a RECORDED ANSWER, read the same way the palette is and put in force
// before anything is laid out — `FONT_FAMILY` is a live binding, so the seed draws in
// whatever this resolves, and `measureText` measures in the same thing. A face that does
// not resolve on this machine refuses here rather than being silently substituted.
useTypeface(readTypeface(join(HERE, "..", "assets"), { stopAt: join(HERE, "..") }));

/** The story's own constants: the journalist's words, their source, their caveat, their subject. */
const BEAT = {
  year: 2023,
  ground: PALETTE.ground,
  accent: PALETTE.accent,
  subject: "CHE",
  subjectLabel: "Suisse",
  comparison: "OWID_EUR",
  comparisonLabel: "Moyenne européenne",
  /** The countries the title's second clause is about. Checked, not assumed. */
  neighbours: ["FRA", "DEU", "ITA", "AUT", "LIE"],
  /**
   * The title's second clause claims a majority, not a superlative — checked as "most" below, not
   * "all". Verified against the source before writing it: 2023, t CO2/capita — CHE 3,60, FRA 4,07,
   * DEU 7,02, ITA 5,25, AUT 6,23, LIE 3,31. Switzerland is below 4 of its 5 neighbours; only
   * Liechtenstein is lower. 4 of 5 is a strict majority, so "la plupart" is true; the fixture's
   * original "tous" was not (Liechtenstein), which is exactly the defect the claim check exists to
   * catch — see the `quorum: "most"` call below.
   */
  title:
    "La Suisse émet moins de CO₂ par habitant que la moyenne européenne — et moins que la plupart de ses voisins.",
  source: "Source : Global Carbon Budget 2025, via Our World in Data · données 2023",
  basemapCredit: "fond de carte © MapTiler, © OpenStreetMap",
  legendCaption: "Tonnes de CO₂ par habitant",
  caveat:
    "Émissions territoriales : hors biens importés et aviation internationale.",
  noDataLabel: "données indisponibles",
  alt:
    "Carte de l'Europe. Chaque pays est teinté selon ses émissions de CO₂ par habitant en 2023, " +
    "d'un gris clair sous 2 tonnes à un gris foncé au-delà de 10. La Suisse, entourée et nommée, " +
    "est dans la classe 2 à 4 tonnes, sous la moyenne européenne de 6,5 tonnes.",
};

const argv = process.argv.slice(2);
const flag = (name, fallback) => {
  const at = argv.indexOf(name);
  return at >= 0 ? argv[at + 1] : fallback;
};

const dataPath = flag("--data", "/tmp/map-twin/co2.csv");
const outDir = flag("--out", "/tmp/map-twin");
const stillPlate = flag("--still-plate", "/tmp/map-twin/plate-496");
const videoPlate = flag("--video-plate", "/tmp/map-twin/plate-620");
const wantStill = argv.includes("--still");
const wantFinalFrame = argv.includes("--final-frame");
const wantVideo = argv.includes("--video");

// ── The data, the join, the claim ──────────────────────────────────────────────────────────────
const values = valuesFromCsv(await readFile(dataPath, "utf8"), BEAT.year);
const joined = joinValues(CO2_STUDY, values, {
  alias: CO2_ALIAS,
  expectedNoData: CO2_EXPECTED_NO_DATA,
});
console.log(
  `join: ${joined.matched} of ${CO2_STUDY.length} shapes carry a ${BEAT.year} value; ` +
    `${joined.noData.length} declared no-data (${joined.noData.join(", ")})`,
);

const violations = claimViolations({
  values,
  subject: BEAT.subject,
  comparison: BEAT.comparison,
  neighbours: BEAT.neighbours,
  quorum: "most",
});
if (violations.length === 0) console.log("claim: supported by the source.");
else
  console.log(
    `claim: NOT SUPPORTED by the source, in ${violations.length} way(s):\n  ` +
      violations.join("\n  ") +
      "\n  The title is the journalist's confirmed wording and is rendered as given; this is the " +
      "check that tells them it no longer matches the data.",
  );

const furniture = deriveFurniture(BEAT.ground);
const ramp = sequentialRamp(BEAT.ground, furniture.ink, CO2_BREAKS.length + 1, 0.1, 0.78);

async function plateOf(dir) {
  const geometry = JSON.parse(await readFile(join(dir, "geometry.json"), "utf8"));
  const png = await readFile(join(dir, "plate.png"));
  return { geometry, plate: `data:image/png;base64,${png.toString("base64")}` };
}

const shared = {
  breaks: CO2_BREAKS,
  ramp,
  rows: joined.rows,
  title: BEAT.title,
  source: BEAT.source,
  basemapCredit: BEAT.basemapCredit,
  legendCaption: BEAT.legendCaption,
  caveat: BEAT.caveat,
  noDataLabel: BEAT.noDataLabel,
  alt: BEAT.alt,
  ground: BEAT.ground,
  accent: BEAT.accent,
  ...furniture,
  subject: BEAT.subject,
  subjectLabel: BEAT.subjectLabel,
  subjectValue: values.get(BEAT.subject),
  comparisonLabel: BEAT.comparisonLabel,
  comparisonValue: values.get(BEAT.comparison),
};

await mkdir(outDir, { recursive: true });

// ── Rung 1: the still ──────────────────────────────────────────────────────────────────────────
if (wantStill) {
  const { geometry, plate } = await plateOf(stillPlate);
  // Nothing renders in a typeface nobody chose. `renderStill` takes the ELEMENT, so the
  // markup is laid out here first and checked against the family in force before the same
  // element is handed over — a second `renderToStaticMarkup` of a pure component, which is
  // deterministic and costs microseconds against the rasterise that follows it. The check
  // cannot live inside `renderStill` itself: that is a SHARED function body, and
  // `render-still-parity.test.ts` would then require the change in all 22 copies at once.
  const element = createElement(Co2MapStill, { ...shared, geometry, plate });
  assertDrawnInActiveTypeface(renderToStaticMarkup(element), {
    where: "the map seed",
  });
  const { pngPath } = await renderStill({
    element,
    width: 900,
    height: 560,
    outDir,
    name: "static",
  });
  console.log(
    `still → ${pngPath}  (${BEAT.subjectLabel} ${fr(shared.subjectValue, 1)} · ` +
      `${BEAT.comparisonLabel} ${fr(shared.comparisonValue, 1)})\nNow open it and look at it.`,
  );
}

// ── Rungs 2 and 3: the video ───────────────────────────────────────────────────────────────────
function remotion(args) {
  const binary = join(PACKAGE_ROOT, "node_modules/.bin/remotion");
  const started = Date.now();
  const result = spawnSync(binary, args, { cwd: PACKAGE_ROOT, stdio: "inherit" });
  if (result.status !== 0) throw new Error(`remotion ${args[0]} exited with ${result.status}`);
  return Math.round((Date.now() - started) / 1000);
}

if (wantFinalFrame || wantVideo) {
  const { geometry, plate } = await plateOf(videoPlate);
  const propsPath = join(outDir, "video-props.json");
  await writeFile(propsPath, JSON.stringify({ ...shared, geometry, plate }));

  const framePath = join(outDir, "final-frame.png");
  const stillSeconds = remotion([
    "still",
    ENTRY,
    COMPOSITION,
    framePath,
    "--frame=-1",
    `--props=${propsPath}`,
    "--timeout=180000",
  ]);
  console.log(`final frame (--frame=-1) → ${framePath}  [${stillSeconds}s]`);

  if (wantVideo) {
    const videoPath = join(outDir, "map.mp4");
    const videoSeconds = remotion([
      "render",
      ENTRY,
      COMPOSITION,
      videoPath,
      `--props=${propsPath}`,
      "--concurrency=1",
      "--timeout=180000",
    ]);
    console.log(`video → ${videoPath}  [${videoSeconds}s]`);
  }
}

if (!wantStill && !wantFinalFrame && !wantVideo)
  console.log("nothing asked for. Pass --still, --final-frame or --video.");
