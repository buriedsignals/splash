// twin/skills/chart-video/scripts/render-video.mjs
//
// The render ladder's second rung. Rung one (`chart-beat/scripts/render-still.mjs`) turns a
// React element into a PNG; this turns a Remotion composition into a final-frame still and then an
// mp4, in that order, because a wrong end state is a wrong video and finding out costs seconds
// here instead of minutes there.
//
// It runs in node, which is why it is the piece that derives the furniture colours: `deriveFurniture`
// lives in the still script beside a native rasteriser that no browser bundle can load. Deriving
// here and passing ink/muted/grid in as input props keeps ONE implementation of the colour rule for
// both formats — the alternative was a second copy of the contrast escalation inside the composition,
// which is exactly how two formats drift apart.
//
// Usage:  bun skills/chart-video/scripts/render-video.mjs [--still-only] [--data <csv>] [--out <dir>]

import { spawnSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { deriveFurniture, readPalette } from "./render-still.mjs";
import { staggerLacksAnOrder } from "./detect-reveal-order.mjs";
import { CO2_TIMING } from "../assets/timing.ts";

/**
 * RFC 4180 row tokeniser, inlined here rather than imported — no cross-skill runtime import, and
 * a proof/story workspace is not a skill either. A naive comma split corrupts a quoted thousands
 * separator ("1,234.5") or a quoted name carrying its own comma ("Netherlands, the"); this walks
 * the text one character at a time instead. Returns one array of raw field strings per row
 * (header included), quotes stripped, doubled quotes un-escaped, and a lone CR or CRLF closing a
 * row the same way LF does.
 */
function parseCsvRows(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  let i = 0;
  while (i < text.length) {
    const char = text[i];
    if (quoted) {
      if (char === '"') {
        if (text[i + 1] === '"') { field += '"'; i += 2; continue; }
        quoted = false; i += 1; continue;
      }
      field += char; i += 1; continue;
    }
    if (char === '"') { quoted = true; i += 1; continue; }
    if (char === ",") { row.push(field); field = ""; i += 1; continue; }
    if (char === "\r") { row.push(field); rows.push(row); row = []; field = ""; i += (text[i + 1] === "\n") ? 2 : 1; continue; }
    if (char === "\n") { row.push(field); rows.push(row); row = []; field = ""; i += 1; continue; }
    field += char; i += 1;
  }
  if (field !== "" || row.length > 0) { row.push(field); rows.push(row); }
  return rows;
}

const HERE = dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = resolve(HERE, "../../..");
const ENTRY = join(HERE, "../assets/index.ts");
const COMPOSITION = "co2-suisse";

// The colours are the one thing in `BEAT` that is NOT the journalist's words: they are the
// recorded answer, read back with `readPalette` from this skill's own `PALETTE.md`. They used to
// sit below as two hex literals, which is the defect the palette mechanism exists to remove.
const PALETTE = readPalette(join(HERE, "..", "assets"), { stopAt: join(HERE, "..") });

/** The story's own constants — the journalist's words, from STORYBOARD.md and BRIEF.md. */
const BEAT = {
  firstYear: 1950,
  reference: 32.5,
  ground: PALETTE.ground,
  accent: PALETTE.accent,
  title: "En 2024, la Suisse a émis moins de CO₂ sur son territoire qu'en 1967.",
  source:
    "Source : Global Carbon Budget 2025, via Our World in Data · données 2024",
  // Not "Niveau de 1967 : 32,5 Mt" — the y axis already states 32,5 on the tick this rule sits on,
  // and a number printed twice is `anti-patterns.md`'s "repeated years or values".
  referenceLabel: "Niveau de 1967",
};

/**
 * The frozen OWID series, tonnes to megatonnes. Two columns out of four; the year filter is the
 * journalist's, not a convenience — the series runs from 1858 and the beat is about the post-war
 * curve.
 */
export function readingsFromCsv(csv, firstYear) {
  const [header, ...rows] = parseCsvRows(csv.trim());
  const columns = header;
  const yearAt = columns.indexOf("Year");
  const valueAt = columns.findIndex((c) => c.startsWith("Annual CO"));
  if (yearAt < 0 || valueAt < 0)
    throw new Error(`csv has no Year / Annual CO₂ emissions column, got: ${header}`);

  return rows
    .map((row) => row)
    .map((cells) => ({ year: Number(cells[yearAt]), mt: Number(cells[valueAt]) / 1e6 }))
    .filter((r) => Number.isFinite(r.year) && Number.isFinite(r.mt) && r.year >= firstYear)
    .sort((a, b) => a.year - b.year);
}

function remotion(args) {
  const binary = join(PACKAGE_ROOT, "node_modules/.bin/remotion");
  const started = Date.now();
  const result = spawnSync(binary, args, { cwd: PACKAGE_ROOT, stdio: "inherit" });
  if (result.status !== 0)
    throw new Error(`remotion ${args[0]} exited with ${result.status}`);
  return Math.round((Date.now() - started) / 1000);
}

const argv = process.argv.slice(2);
const flag = (name, fallback) => {
  const at = argv.indexOf(name);
  return at >= 0 ? argv[at + 1] : fallback;
};

const dataPath = flag("--data", "/tmp/video-twin/data.csv");
const outDir = flag("--out", "/tmp/video-twin");
const stillOnly = argv.includes("--still-only");

await mkdir(outDir, { recursive: true });

const data = readingsFromCsv(await readFile(dataPath, "utf8"), BEAT.firstYear);
if (data.length < 2) throw new Error(`need at least two readings, got ${data.length}`);

// ── The reveal's own order, decided before a frame is drawn ────────────────────────────────────
//
// This format's reveal DOES earn its stagger, and this is where that is measured rather than
// assumed. `drawnSoFar` walks the line's points linearly across `reveal`, so each point's arrival
// begins at its own share of that window, and each carries its own year — the position it holds on
// the axis the reveal traverses. Distinct, ascending, one per mark: the shared decision says so.
// The same call on a snapshot's categories reddens, which is the whole point of it being shared —
// `map-beat/scripts/render-map.mjs` makes it on a choropleth, and `motion-grammar.md` states the
// distinction the function decides.
const revealMarks = data.map((reading, i) => ({
  key: String(reading.year),
  start:
    data.length <= 1
      ? CO2_TIMING.reveal.start
      : CO2_TIMING.reveal.start +
        Math.round((i / (data.length - 1)) * CO2_TIMING.reveal.duration),
  at: reading.year,
}));
const revealReading = staggerLacksAnOrder(revealMarks);
if (revealReading.arbitrary)
  throw new Error(
    `the reveal claims an order the data does not carry: ${revealReading.why}. ` +
      `${revealReading.marks} marks, ${revealReading.starts} start(s), ${revealReading.positions} position(s). ` +
      "A stagger follows the data's own order or it does not happen — motion-grammar.md.",
  );
console.log(
  `reveal: ${revealReading.why} (${revealReading.marks} marks, ${revealReading.starts} start(s)).`,
);

const props = { ...BEAT, data, ...deriveFurniture(BEAT.ground) };
delete props.firstYear;
const propsPath = join(outDir, "props.json");
await writeFile(propsPath, JSON.stringify(props, null, 2));

// Rung 2a: the last frame, on its own. If the end state is not a complete, readable chart, the
// video is wrong and nothing below is worth waiting for.
const stillPath = join(outDir, "final-frame.png");
const stillSeconds = remotion([
  "still",
  ENTRY,
  COMPOSITION,
  stillPath,
  "--frame=-1",
  `--props=${propsPath}`,
  "--timeout=120000",
]);
console.log(`still (--frame=-1) → ${stillPath}  [${stillSeconds}s]`);

if (stillOnly) process.exit(0);

// Rung 2b: the mp4. Concurrency 1 keeps the render deterministic and the machine usable.
const videoPath = join(outDir, "co2.mp4");
const videoSeconds = remotion([
  "render",
  ENTRY,
  COMPOSITION,
  videoPath,
  `--props=${propsPath}`,
  "--concurrency=1",
  "--timeout=120000",
]);
console.log(`video → ${videoPath}  [${videoSeconds}s]`);
