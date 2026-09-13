// Switzerland's annual CO₂ since 1858 as a filled area, rendered once per FILED DIRECTION into a
// self-contained scrolly page. The `area` type in the scrolly format.
//
// THE SAME PLATE AS `static-area-swiss-co2`, READ IN ORDER. The data, the claim and its assertions,
// the words and the colour rules are the static beat's own; the scroll only decides the order in
// which the reader is asked to see them. Four cards, four readings of one picture:
//
//   1. the height is a rate — the curve alone, the peak and the last year named in the card;
//   2. the surface is the stock — the area fills under the curve as the reader scrolls;
//   3. the stock splits at the midpoint year — the rule, and the earlier half turning to its tint;
//   4. the two halves are the same size — the later half named, and the plate's own reading line.
//
// WHAT "DIRECTED" MEANS FOR A SCROLLY PAGE, and it is what it means for a plate and for a web page:
// the direction is read from its own record, its families resolved against THIS beat's own text,
// its registers become the page's type — the eyebrow, the title, every card, the credit and every
// word on the frame — and its ground and accent are the only colours the page names.
//
// `renders/`, PLURAL, like its static and web siblings.
//
// Usage:  bun proof/scrolly-area-swiss-co2/render-directions-scrolly.mjs

import { readdirSync } from "node:fs";
import { readFile, rm } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { deriveFurniture, measureText } from "#shared/chart-beat/render-still.mjs";
import { readPalette } from "#shared/chart-beat/colour.mjs";
import { readDirection } from "#shared/design-base/read-direction.mjs";
import { composeDirections, report } from "#shared/design-base/compose.mjs";
import { resolveDirectionFamilies } from "#shared/design-base/resolve-families.mjs";
import { plainSpaces, webRegisters } from "#shared/design-base/web.mjs";
import { renderScrolly } from "../../skills/scrolly/scripts/render-scrolly.mjs";
import { DirectedAreaScrolly } from "./DirectedAreaScrolly.tsx";

const HERE = dirname(fileURLToPath(import.meta.url));
const DIRECTIONS = join(HERE, "..", "..", "docs", "design-base", "directions");
const OUT = join(HERE, "renders");
const EYEBROW = "Climat · Suisse";

// ── the series, and the static beat's own refusals ─────────────────────────────────────────────
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
  if (!Number.isFinite(r.year) || !Number.isFinite(r.mt) || r.mt < 0)
    throw new Error(`a reading has no usable year or value: ${JSON.stringify(r)}`);
for (let i = 1; i < readings.length; i++)
  if (readings[i].year !== readings[i - 1].year + 1)
    throw new Error(
      `the series jumps from ${readings[i - 1].year} to ${readings[i].year}. An area drawn over a ` +
        `gap closes across it, and the surface then measures years the source never reported.`,
    );

// ── THE CLAIM, ASSERTED — the integral the surface draws ───────────────────────────────────────
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
  throw new Error(`the headline says the years after ${midpoint} carry about half the total; they carry ${shareAfter.toFixed(1)} %`);
if (!(after.length * 3 < before.length))
  throw new Error(`the headline says the recent half is far shorter; it is ${after.length} years against ${before.length}`);
const peak = readings.reduce((a, b) => (b.mt > a.mt ? b : a));
const last = readings[readings.length - 1];
const first = readings[0].year;

const n0 = (v) => plainSpaces(Math.round(v).toLocaleString("fr-FR"));
const one = (v) => plainSpaces(v.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }));

// ── the words: the static beat's, one reading per card ─────────────────────────────────────────
/** The static plate's own ladder, longest first; the scaffold sets the longest the header can hold. */
const title = [
  `La moitié du CO₂ suisse depuis ${first} a été émise après ${midpoint} — en ${after.length} ans sur ${readings.length}`,
  `La moitié du CO₂ suisse depuis ${first} a été émise après ${midpoint}`,
  `Le CO₂ suisse depuis ${first}`,
];
const prose = [
  [`La hauteur ne dit que le débit d’une année : ${one(peak.mt)} Mt au pic de ${peak.year}, ${one(last.mt)} Mt en ${last.year}.`],
  [`L’aire sous la courbe est le stock : ${n0(total)} Mt cumulées depuis ${first}.`],
  [`Les ${before.length} années de ${first} à ${midpoint} en portent ${one(shareBefore)} %.`],
  [
    `Les ${after.length} années qui suivent ${midpoint} en portent ${one(shareAfter)} % — les deux surfaces teintées sont de même taille.`,
    `Lecture : la hauteur est le débit d’une année, l’aire est le stock accumulé. C’est tout ce qu’une aire dit de plus qu’une courbe — et elle ne le dit que si la base est à zéro.`,
  ],
];
const source = "Source : Global Carbon Budget 2025, via Our World in Data · émissions territoriales";
const unit = "millions de tonnes de CO₂ par an";
const halves = [
  { from: first, to: midpoint, share: one(shareBefore) },
  { from: midpoint + 1, to: last.year, share: one(shareAfter) },
];
const endLabel = `${one(last.mt)} Mt`;
const yTicks = [0, Math.round(peak.mt / 2 / 5) * 5, Math.round(peak.mt / 5) * 5].filter(
  (v, i, all) => all.indexOf(v) === i && v <= peak.mt * 1.08,
);
const xTicks = readings.map((r) => r.year).filter((yr, i, all) => yr % 25 === 0 || i === 0 || i === all.length - 1);
const alt =
  `Aire remplie des émissions annuelles de CO₂ de la Suisse de ${first} à ${last.year}, base à zéro. ` +
  `La courbe monte jusqu’à un pic de ${one(peak.mt)} Mt en ${peak.year} puis redescend à ${one(last.mt)} Mt. ` +
  `Un trait vertical marque ${midpoint}, l’année où le cumul atteint la moitié des ${n0(total)} Mt émises ` +
  `depuis ${first} : les deux surfaces de part et d’autre sont de même taille.`;

/** One state per card; see `area-drive.mjs` for what each field paints. */
const STATES = [
  { line: 1, fill: 0, split: 0, rule: 0, halfA: 0, halfB: 0, end: 1 },
  { line: 0, fill: 1, split: 0, rule: 0, halfA: 0, halfB: 0, end: 1 },
  { line: 0, fill: 1, split: 1, rule: 1, halfA: 1, halfB: 0, end: 1 },
  { line: 0, fill: 1, split: 1, rule: 1, halfA: 1, halfB: 1, end: 1 },
];

const textPerRegister = {
  display: title.join(" "),
  eyebrow: EYEBROW,
  body: `${prose.flat().join(" ")} ${source}`,
  axis: `${yTicks.join(" ")} ${xTicks.join(" ")}`,
  annot: `${unit} ${halves.map((h) => `${h.from}–${h.to} · ${h.share} %`).join(" ")}`,
  value: `${midpoint} ${endLabel}`,
};

const filed = readdirSync(DIRECTIONS)
  .filter((f) => f.endsWith(".md"))
  .map((f) => readDirection(join(DIRECTIONS, f)));
const newsroom = readPalette(HERE, { stopAt: join(HERE, "..") });
const BEAT_FACTS = { evidenceLevels: 4 };
console.log(report(composeDirections({ newsroom, filed, beat: BEAT_FACTS, textPerRegister }), { beat: BEAT_FACTS }));
console.log("");

const driver = await readFile(join(HERE, "area-drive.mjs"), "utf8");
const refused = [];
for (const file of readdirSync(DIRECTIONS).filter((f) => f.endsWith(".md"))) {
  const id = file.replace(/\.md$/, "");
  const direction = resolveDirectionFamilies(readDirection(join(DIRECTIONS, file)), textPerRegister);
  const { ink, muted, grid } = deriveFurniture(direction.ground);
  const regs = webRegisters(direction, { ink: { ink, muted, accent: direction.accent } });
  // The one thing still measured in node: how wide the y-label column must be, in this direction's
  // own axis face. A gutter guessed at one direction's size clips at another's.
  const axisFace = {
    fontSize: Number.parseFloat(regs.axis.fontSize),
    fontWeight: regs.axis.fontWeight,
    fontFamily: String(regs.axis.fontFamily).split(",")[0].replace(/"/g, ""),
  };
  const gutterPx = Math.ceil(Math.max(...yTicks.map((t) => measureText(String(t), axisFace)))) + 16;
  const valueFace = {
    fontSize: Number.parseFloat(regs.value.fontSize),
    fontWeight: regs.value.fontWeight,
    fontFamily: String(regs.value.fontFamily).split(",")[0].replace(/"/g, ""),
  };
  const endGutterPx =
    Math.ceil(measureText(endLabel, valueFace) + Number.parseFloat(regs.value.letterSpacing) * endLabel.length) + 12;
  try {
    const { outPath } = await renderScrolly({
      steps: prose.map((p, i) => ({ id: ["debit", "stock", "moitie", "meme-taille"][i], prose: p })),
      reveal: {
        element: createElement(DirectedAreaScrolly, {
          readings,
          halves,
          midpoint,
          yTicks,
          xTicks,
          unit,
          endLabel,
          alt,
          regs,
          gutterPx,
          endGutterPx,
          pad: direction.pad,
          stroke: direction.stroke ?? {},
          ground: direction.ground,
          accent: direction.accent,
          ink,
          muted,
          grid,
        }),
        states: STATES,
        driver,
        apply: "applyAreaState",
      },
      title,
      eyebrow: EYEBROW,
      source,
      ground: direction.ground,
      type: { eyebrow: regs.eyebrow, display: regs.display, body: regs.body, source: regs.body },
      lang: "fr",
      outDir: OUT,
      name: `${id}.html`,
    });
    console.log(`${id} -> ${outPath.replace(`${HERE}/`, "")}`);
  } catch (error) {
    await rm(join(OUT, `${id}.html`), { force: true });
    refused.push({ id, why: error.message });
    console.log(`${id} REFUSED — ${error.message}`);
  }
}
if (refused.length) {
  console.log(`\nrefused by ${refused.length}: ${refused.map((x) => x.id).join(", ")}`);
  process.exitCode = 1;
}
