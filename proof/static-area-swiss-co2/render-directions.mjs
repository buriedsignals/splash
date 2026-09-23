// twin/proof/static-area-swiss-co2/render-directions.mjs
//
// Switzerland's annual CO₂ emissions, 1858–2024, drawn as a FILLED AREA once per filed direction,
// through the design base. The first `area` beat in this tree.
//
// WHY THIS SERIES AND NOT A NEW ONE: `proof/co2-suisse` draws the same frozen file as a LINE, and
// the pair is the argument. A line answers *when was it rising*; an area answers *how much, in
// total*. The line beat's own BRIEF refuses a zero baseline in as many words — "c'est une ligne ; la
// pente porte la valeur" — and this beat requires one, for the same reason read the other way: the
// fill claims to be the quantity, so the quantity has to start where the fill starts.
//
// `renders/`, PLURAL. A render written to `render/` receives no approval and is invisible to the
// export guard.
//
// Usage:  bun proof/static-area-swiss-co2/render-directions.mjs

import { readdirSync } from "node:fs";
import { readFile, rm } from "node:fs/promises";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderStill } from "#shared/chart-beat/render-still.mjs";
import { readPalette } from "#shared/chart-beat/colour.mjs";
import { beatFacts, applicableTreatments } from "#shared/chart-beat/treatments.mjs";
import { readDirection } from "../../scripts/design-base/read-direction.mjs";
import { composeDirections, report } from "../../scripts/design-base/compose.mjs";
import { resolveDirectionFamilies } from "../../scripts/design-base/resolve-families.mjs";
import { DirectedArea } from "./DirectedArea.tsx";
import { assertBeatMayEnter, directedFrame, exportSizeFromArgv, nameAtSize } from "#shared/chart-beat/directed-size.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const DIRECTIONS = join(HERE, "..", "..", "docs", "design-base", "directions");
const OUT = join(HERE, "renders");
/** THE SIZE THIS RUN DRAWS AT, and whether this beat's own type may enter it at all: a tall frame is a
 *  different drawing, not a stretched one, and `type-at-size.mjs` refuses a type whose range nobody has
 *  measured rather than shipping an aspect nobody chose. */
const SIZE = exportSizeFromArgv();
const FRAME = directedFrame(SIZE);
assertBeatMayEnter(HERE, SIZE, { what: basename(HERE) });
const EYEBROW = "Climat · Suisse";
const refused = [];

// ── the series ──────────────────────────────────────────────────────────────
const csv = (await readFile(join(HERE, "data.csv"), "utf8")).trim().split(/\r?\n/);
const header = csv[0].split(",");
const yearAt = header.indexOf("Year");
const valueAt = header.length - 1;
const readings = csv
  .slice(1)
  .map((l) => l.split(","))
  .map((c) => ({ year: Number(c[yearAt]), mt: Number(c[valueAt]) / 1e6 }))
  .sort((a, b) => a.year - b.year);
for (const r of readings)
  if (!Number.isFinite(r.year) || !Number.isFinite(r.mt))
    throw new Error(`a reading has no usable year or value: ${JSON.stringify(r)}`);
/** A GAP IN A SERIES DRAWN AS AN AREA IS FILLED IN SILENTLY — the polygon closes over the missing
 *  year and the reader integrates a value nobody measured. So the years are checked to be
 *  consecutive before a single mark is drawn. */
for (let i = 1; i < readings.length; i++)
  if (readings[i].year !== readings[i - 1].year + 1)
    throw new Error(
      `the series jumps from ${readings[i - 1].year} to ${readings[i].year}. An area drawn over a ` +
        `gap closes across it, and the surface then measures years the source never reported.`,
    );

// ── THE CLAIM, ASSERTED ─────────────────────────────────────────────────────
/** THE AREA IS THE STOCK. Everything below is the integral the surface draws, computed from the same
 *  readings the surface is drawn from — not from a rounded figure quoted elsewhere. */
const total = readings.reduce((s, r) => s + r.mt, 0);
let running = 0;
let midpoint = null;
for (const r of readings) {
  running += r.mt;
  if (midpoint === null && running >= total / 2) midpoint = r.year;
}
const after = readings.filter((r) => r.year > midpoint);
const before = readings.filter((r) => r.year <= midpoint);
const shareAfter = (after.reduce((s, r) => s + r.mt, 0) / total) * 100;
const shareBefore = 100 - shareAfter;
if (!(shareAfter > 45 && shareAfter < 50))
  throw new Error(
    `the headline says the years after ${midpoint} carry about half the total; they carry ` +
      `${shareAfter.toFixed(1)} %`,
  );
if (!(after.length * 3 < before.length))
  throw new Error(
    `the headline says the recent half is far shorter; it is ${after.length} years against ${before.length}`,
  );
const peak = readings.reduce((a, b) => (b.mt > a.mt ? b : a));
const last = readings[readings.length - 1];
console.log(
  `${readings.length} années · total ${total.toFixed(0)} Mt · moitié atteinte en ${midpoint} · ` +
    `après ${midpoint} : ${after.length} ans pour ${shareAfter.toFixed(1)} % · pic ${peak.year} ` +
    `${peak.mt.toFixed(1)} Mt · ${last.year} ${last.mt.toFixed(1)} Mt\n`,
);

const facts = beatFacts(
  readings.map((r) => ({ key: String(r.year), label: String(r.year), value: r.mt })),
  {
    continuousAxis: true,
    markers: [{ key: String(midpoint), label: `${midpoint}`, value: total / 2 }],
    namedSeries: ["CO₂"],
    declaredSequence: "year",
  },
);
const offered = applicableTreatments(facts);
console.log(`treatments applicable: ${offered.map((t) => t.id).join(", ")}\n`);

/** `toLocaleString("fr-FR")` emits U+202F and U+00A0, which no face on the family ladders covers —
 *  the glyph guard then refuses every family and the beat cannot draw at all. Written as escapes
 *  rather than as literal characters, because a literal narrow no-break space is invisible in a
 *  diff and this is the fourth beat it has cost. */
const plain = (s) => s.replace(/[\u202F\u00A0\u2009]/g, " ");
const n0 = (v) => plain(Math.round(v).toLocaleString("fr-FR"));
const one = (v) =>
  plain(v.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }));

const title = [
  `La moitié du CO₂ suisse depuis ${readings[0].year} a été émise après ${midpoint} — en ${after.length} ans sur ${readings.length}`,
  `La moitié du CO₂ suisse depuis ${readings[0].year} a été émise après ${midpoint}`,
  `Le CO₂ suisse depuis ${readings[0].year}`,
];
const limits = [
  `L’aire sous la courbe est le stock : ${n0(total)} Mt cumulées depuis ${readings[0].year}. Les ` +
    `${after.length} années qui suivent ${midpoint} en portent ${one(shareAfter)} %, les ` +
    `${before.length} précédentes ${one(shareBefore)} % — les deux surfaces teintées sont de même ` +
    `taille. La hauteur, elle, ne dit que le débit d’une année : ${one(peak.mt)} Mt au pic de ` +
    `${peak.year}, ${one(last.mt)} Mt en ${last.year}.`,
  `L’aire sous la courbe est le stock : ${n0(total)} Mt depuis ${readings[0].year}. Les deux ` +
    `surfaces teintées sont de même taille — ${after.length} ans après ${midpoint} pèsent autant ` +
    `que les ${before.length} d’avant.`,
  `${n0(total)} Mt cumulées depuis ${readings[0].year} ; les deux surfaces sont de même taille.`,
];
const reading = [
  `Lecture : la hauteur est le débit d’une année, l’aire est le stock accumulé. C’est tout ce ` +
    `qu’une aire dit de plus qu’une courbe — et elle ne le dit que si la base est à zéro.`,
  `Lecture : la hauteur est le débit d’une année, l’aire est le stock. La base est à zéro.`,
];
const source =
  "Source : Global Carbon Budget 2025, via Our World in Data · émissions territoriales";
const unit = "millions de tonnes de CO₂ par an";
const halves = [
  { from: readings[0].year, to: midpoint, share: shareBefore, years: before.length },
  { from: midpoint + 1, to: last.year, share: shareAfter, years: after.length },
];

const textPerRegister = {
  display: title.join(" "),
  eyebrow: EYEBROW,
  body: `${limits.join(" ")} ${source}`,
  axis: `${unit} ${readings[0].year} ${last.year} ${n0(peak.mt)} 0`,
  annot: `${reading.join(" ")} ${halves.map((h) => `${h.from}–${h.to} ${one(h.share)} %`).join(" ")}`,
  value: `${one(last.mt)} ${n0(total)}`,
};

const filed = readdirSync(DIRECTIONS)
  .filter((f) => f.endsWith(".md"))
  .map((f) => readDirection(join(DIRECTIONS, f)));
const newsroom = readPalette(HERE);
const BEAT_FACTS = { evidenceLevels: 4 };
console.log(
  report(composeDirections({ newsroom, filed, beat: BEAT_FACTS, textPerRegister }), { beat: BEAT_FACTS }),
);
console.log("");

for (const file of readdirSync(DIRECTIONS).filter((f) => f.endsWith(".md"))) {
  const id = file.replace(/\.md$/, "");
  const direction = resolveDirectionFamilies(readDirection(join(DIRECTIONS, file)), textPerRegister);
  console.log(id);
  try {
    await renderStill({
      element: createElement(DirectedArea, {
        // THE FRAME THIS RENDER DRAWS IN. The component used to hold a module constant; it takes the
        // run's own frame now, so one component serves landscape, portrait and square.
        frame: { width: FRAME.width, height: FRAME.height },
        readings,
        halves,
        midpoint,
        peak,
        last,
        unit,
        title,
        limits,
        reading,
        source,
        alt:
          `Aire remplie des émissions annuelles de CO₂ de la Suisse de ${readings[0].year} à ` +
          `${last.year}, base à zéro. La courbe monte jusqu’à un pic de ${one(peak.mt)} Mt en ` +
          `${peak.year} puis redescend à ${one(last.mt)} Mt. Un trait vertical marque ${midpoint}, ` +
          `l’année où le cumul atteint la moitié des ${n0(total)} Mt émises depuis ` +
          `${readings[0].year} : les deux surfaces de part et d’autre sont de même taille.`,
        eyebrow: EYEBROW,
        direction,
        treatments: offered.map((t) => t.id),
        onLadder: (note) => console.log(`  ${note}`),
      }),
      // THE SLOT'S OWN SIZE. `--size` picks it; landscape is what an article's column asks for and
      // what this lineage's tuning was measured at. The frame is half the export size at scale 2.
      width: FRAME.width,
      height: FRAME.height,
      outDir: OUT,
      name: nameAtSize(id, SIZE),
      scale: FRAME.scale,
    });
    console.log(`  -> renders/${nameAtSize(id, SIZE)}.png\n`);
  } catch (error) {
    for (const ext of ["png", "svg"])
      await rm(join(OUT, `${nameAtSize(id, SIZE)}.${ext}`), { force: true });
    refused.push({ id, why: error.message });
    console.log(`  REFUSED — ${error.message}\n`);
  }
}
if (refused.length) console.log(`refused by ${refused.length}: ${refused.map((x) => x.id).join(", ")}`);
