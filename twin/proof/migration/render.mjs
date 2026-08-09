// twin/proof/migration/render.mjs
//
// Third beat through the render ladder's second rung — same shape as `render-video.mjs` and
// `../life-expectancy/render.mjs` (`readingsFromCsv`, then still-first, then mp4), its own story
// constants. See `render-video.mjs` for the doc-comment on why this runs in node
// (`deriveFurniture`) and why the still is rendered before the mp4.
//
// Usage:  bun proof/migration/render.mjs [--still-only] [--data <csv>] [--out <dir>]

import { spawnSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { deriveFurniture } from "#shared/twin-chart-beat/render-still.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = resolve(HERE, "../..");
const ENTRY = join(HERE, "index.ts");
const COMPOSITION = "migration";

/** The story's own constants — the journalist's words, from the CADRAGE exchange.
 *
 * `title` and `subjectYears` corrected 2026-08-09: the beat credited "Federal Statistical Office"
 * over numbers that lived only in `/tmp`. The FSO's own published table (`internationale-wanderungen
 * -der-standigen-wohnbevolkerung-nach-staatsangehorigkeit-ges-1991-2024`, opendata.swiss, "Total ·
 * Solde migratoire" row) gives the real annual balance for 1991–2024 — and in that real series the
 * two negative years are **1996** (−5,807) and **1997** (−6,834), not 1997/1998 as the beat claimed;
 * 1998 is +1,177. The table only starts in 1991, so "since 1990" is narrowed to "since 1991" — the
 * window the committed data can actually stand behind. The credit itself was already the real
 * source and did not need to change, only the claim did.
 */
const BEAT = {
  ground: "#FFFFFF",
  accent: "#0B7A75",
  title: "Twice since 1991, more people left Switzerland than arrived.",
  source: "Source: Federal Statistical Office · data 2024",
  reference: 0,
  referenceLabel: "Balance",
  subjectYears: [1996, 1997],
};

/** A plain `year,value` CSV — this beat's own frozen series. */
export function readingsFromCsv(csv) {
  const [header, ...rows] = csv.trim().split(/\r?\n/);
  const columns = header.split(",");
  const yearAt = columns.indexOf("year");
  const valueAt = columns.indexOf("value");
  if (yearAt < 0 || valueAt < 0)
    throw new Error(`csv has no year / value column, got: ${header}`);

  return rows
    .map((row) => row.split(","))
    .map((cells) => ({ year: Number(cells[yearAt]), value: Number(cells[valueAt]) }))
    .filter((r) => Number.isFinite(r.year) && Number.isFinite(r.value))
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

// The story's own frozen series, committed beside it — the FSO's real annual "solde migratoire"
// total (STATPOP/ESPOP, opendata.swiss), converted from people to thousands (this beat's own `k`
// unit — see `MigrationVideo.tsx`). No longer `/tmp`.
const dataPath = flag("--data", join(HERE, "data.csv"));
// Defaults BESIDE THE BEAT, not to /tmp. It used to default to a scratch directory, so running
// this script the obvious way produced a fresh artifact nobody looks at, printed a path, exited
// zero, and left the committed mp4 stale. An explicit --out still overrides.
const outDir = flag("--out", HERE);
const stillOnly = argv.includes("--still-only");

await mkdir(outDir, { recursive: true });

const data = readingsFromCsv(await readFile(dataPath, "utf8"));
if (data.length < 2) throw new Error(`need at least two readings, got ${data.length}`);

const props = { ...BEAT, data, ...deriveFurniture(BEAT.ground) };
const propsPath = join(outDir, "migration-props.json");
await writeFile(propsPath, JSON.stringify(props, null, 2));

// Rung 2a: the last frame, on its own. If the end state is not a complete, readable chart, the
// video is wrong and nothing below is worth waiting for.
const stillPath = join(outDir, "migration-final-frame.png");
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
const videoPath = join(outDir, "migration.mp4");
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
