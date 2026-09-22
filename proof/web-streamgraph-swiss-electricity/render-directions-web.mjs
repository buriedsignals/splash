// twin/proof/web-streamgraph-swiss-electricity/render-directions-web.mjs
//
// Switzerland's electricity by source, 2000 to 2025, as a streamgraph. Rendered once per FILED
// DIRECTION into a self-contained interactive page.
//
// THE RANK AND THE YEAR IT WAS REACHED ARE COMPUTED, and the beat throws if the claim's source is not
// third from that year onward.
//
// AND THE CONTROL IS COMPUTED TOO, which is the half this runner gained. Which bands may be laid
// flat is not a list somebody wrote: `floorShear` computes the shear each one needs, `floorTicks`
// computes the axis it would earn, and a band too thin to hold two graduations at the widest of the
// three filed directions' own axis leading is NOT OFFERED. On this data that admits three of the
// nine and refuses six; the refusals are printed, so the reason is on the record rather than in
// somebody's head.
//
// Usage:  bun proof/web-streamgraph-swiss-electricity/render-directions-web.mjs

import { readdirSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { contrast, mix, readPalette, adjustToContrast, NON_TEXT_CONTRAST_MIN } from "#shared/chart-beat/colour.mjs";
import { beatFacts, applicableTreatments } from "#shared/chart-beat/treatments.mjs";
import { readDirection } from "#shared/design-base/read-direction.mjs";
import { registerOf, leadOf } from "#shared/design-base/register.mjs";
import { composeDirections, report } from "#shared/design-base/compose.mjs";
import { resolveDirectionFamilies } from "#shared/design-base/resolve-families.mjs";
import { plainSpaces } from "#shared/design-base/web.mjs";
import { floorShear, floorTicks, floorSlugOf } from "../../skills/chart-web/assets/floor.ts";
import { renderWeb } from "../../skills/chart-web/scripts/render-web.mjs";
import { DirectedStreamWeb, FRAME } from "./DirectedStreamWeb.tsx";

const HERE = dirname(fileURLToPath(import.meta.url));
const DIRECTIONS = join(HERE, "..", "..", "docs", "design-base", "directions");
const OUT = join(HERE, "renders");
const EYEBROW = "Énergie · Suisse";
const CODE = "CHE";
const SUBJECT = "Solar";
const SOURCES = [
  ["Hydropower", "hydraulique"],
  ["Nuclear", "nucléaire"],
  ["Solar", "solaire"],
  ["Bioenergy", "biomasse"],
  ["Wind", "éolien"],
  ["Gas", "gaz"],
  ["Oil", "pétrole"],
  ["Coal", "charbon"],
  ["Other renewables", "autres renouv."],
];
/** A band is named inside itself when it can hold the name; below this it is named by the pointer. */
const NAMEABLE_UNITS = 18;

const plain = (s) => plainSpaces(s);
const fr = (v, d = 1) =>
  plain(v.toLocaleString("fr-FR", { minimumFractionDigits: d, maximumFractionDigits: d }));

const csv = (await readFile(join(HERE, "data.csv"), "utf8")).trim().split(/\r?\n/);
const header = csv[0].split(",");
const at = (n) => {
  const i = header.indexOf(n);
  if (i < 0) throw new Error(`the frozen file has no ${n} column`);
  return i;
};
const rows = csv
  .slice(1)
  .map((line) => {
    const c = line.split(",");
    const o = { code: c[at("Code")], year: Number(c[at("Year")]) };
    for (const [k] of SOURCES) o[k] = Number(c[at(k)]);
    return o;
  })
  .filter((r) => r.code === CODE)
  .sort((a, b) => a.year - b.year);
if (!rows.length) throw new Error(`the frozen file carries no ${CODE} rows`);
for (let i = 1; i < rows.length; i += 1)
  if (rows[i].year !== rows[i - 1].year + 1)
    throw new Error(`the series skips from ${rows[i - 1].year} to ${rows[i].year}`);

const years = rows.map((r) => r.year);
const nameOf = new Map(SOURCES);
const totalOf = (r) => SOURCES.reduce((s, [k]) => s + r[k], 0);
const rankOf = (r, key) =>
  SOURCES.map(([k]) => ({ k, v: r[k] })).sort((a, b) => b.v - a.v).findIndex((z) => z.k === key) + 1;

// ── THE CLAIM, ASSERTED ───────────────────────────────────────────────────────────────────────
const firstThird = rows.find((r) => rankOf(r, SUBJECT) <= 3);
if (!firstThird) throw new Error(`${SUBJECT} never reaches third place in this series`);
const heldSince = rows.filter((r) => r.year >= firstThird.year).every((r) => rankOf(r, SUBJECT) <= 3);
if (!heldSince) throw new Error(`${SUBJECT} reached third in ${firstThird.year} and did not hold it`);
const first = rows[0];
const last = rows[rows.length - 1];
console.log(
  `${rows.length} années ${years[0]}-${years[years.length - 1]} · solaire ${fr(first[SUBJECT], 2)} -> ` +
    `${fr(last[SUBJECT], 2)} TWh · troisième source depuis ${firstThird.year}, sans interruption · ` +
    `total ${fr(totalOf(first))} -> ${fr(totalOf(last))} TWh\n`,
);
console.table(
  SOURCES.map(([k, n]) => ({ source: n, [years[0]]: fr(first[k], 2), [years[years.length - 1]]: fr(last[k], 2) })),
);

// ── geometry: a wiggle baseline, computed ─────────────────────────────────────────────────────
const maxTotal = Math.max(...rows.map(totalOf));
const x = (year) => ((year - years[0]) / (years[years.length - 1] - years[0])) * FRAME.width;
const scale = (FRAME.height * 0.9) / maxTotal;
/** The baseline every band is stacked on: centred, so the stream is symmetric about the middle. */
const baseline = rows.map((r, i) => FRAME.height / 2 + (totalOf(r) * scale) / 2);

const stacked = rows.map((r, i) => {
  let y = baseline[i];
  const out = {};
  for (const [k] of SOURCES) {
    const h = r[k] * scale;
    out[k] = { bottom: y, top: y - h };
    y -= h;
  }
  return out;
});

/** What the plate draws, in the shape `floor.ts` shears and refuses against. */
const geometry = {
  xs: rows.map((r) => x(r.year)),
  bands: SOURCES.map(([key]) => ({
    key,
    top: rows.map((_, i) => stacked[i][key].top),
    bottom: rows.map((_, i) => stacked[i][key].bottom),
  })),
};

/** One band's outline at a given shear — the top edge left to right, the bottom edge back. */
const pathOf = (key, shift) => {
  const top = rows
    .map((r, i) => `${i === 0 ? "M" : "L"} ${round(x(r.year))} ${round(stacked[i][key].top + shift[i])}`)
    .join(" ");
  const bottom = rows
    .map((r, i) => ({ r, i }))
    .reverse()
    .map(({ r, i }) => `L ${round(x(r.year))} ${round(stacked[i][key].bottom + shift[i])}`)
    .join(" ");
  return `${top} ${bottom} Z`;
};
const round = (n) => Number(n.toFixed(2));
const flat = rows.map(() => 0);

const thickestOf = (key) => rows.reduce((best, r, i) => (r[key] > rows[best][key] ? i : best), 0);
const peakUnitsOf = (key) =>
  Math.max(...rows.map((_, i) => stacked[i][key].bottom - stacked[i][key].top));
const midOf = (key, i, shift) => (stacked[i][key].top + stacked[i][key].bottom) / 2 + shift[i];

/** The bands thick enough to be named inside themselves. The rest are named by the pointer. */
const named = SOURCES.filter(([key]) => peakUnitsOf(key) >= NAMEABLE_UNITS).map(([key, name]) => ({
  key,
  name,
  // Clamped away from both edges: the thickest year of a band that peaks at the end of the record
  // is the last one, and a label centred there is half outside the frame.
  x: Math.min(Math.max(x(rows[thickestOf(key)].year), FRAME.width * 0.08), FRAME.width * 0.92),
  at: thickestOf(key),
}));

const crossingIndex = rows.findIndex((r) => r.year === firstThird.year);
const crossingX = x(firstThird.year);
const crossingText = `${firstThird.year} : le solaire passe troisième`;

// ── THE CONTROL, COMPUTED AND REFUSED BY MEASUREMENT ──────────────────────────────────────────
//
// `minSpacing` is the widest of the three filed directions' own axis leading, so that all three
// pages offer the reader the same control rather than one of them quietly dropping an option. It is
// stated in CSS pixels at the canonical mapping, where one viewBox unit is one CSS pixel — which is
// what this format's aspect-ratio produces at a 900-pixel-wide plot.
const filedFiles = readdirSync(DIRECTIONS).filter((f) => f.endsWith(".md"));
const axisLeads = filedFiles.map((f) => {
  const d = resolveDirectionFamilies(readDirection(join(DIRECTIONS, f)), { axis: years.join(" ") });
  return { id: f.replace(/\.md$/, ""), lead: leadOf(registerOf(d, "axis", {})) };
});
const minSpacing = Math.max(...axisLeads.map((a) => a.lead));
console.log(
  `\naxis leading per direction: ${axisLeads.map((a) => `${a.id} ${a.lead.toFixed(2)}`).join(" · ")} ` +
    `-> minimum graduation spacing ${minSpacing.toFixed(2)} units`,
);

const offeredBands = [];
const refusedBands = [];
for (const [key, name] of SOURCES) {
  const { shift, ruleY, span } = floorShear(geometry, key, { height: FRAME.height });
  const ticks = floorTicks(geometry, key, { unitsPerValue: scale, ruleY, minSpacing, maxTicks: 6 });
  const peak = peakUnitsOf(key);
  if (ticks.length < 2) {
    refusedBands.push(
      `${name} (crête ${fr(peak)} u = ${fr(peak / scale, 2)} TWh, ${ticks.length} graduation)`,
    );
    continue;
  }
  offeredBands.push({ key, name, shift, ruleY, span, ticks });
}
console.log(`offertes : ${offeredBands.map((o) => o.name).join(", ")}`);
console.log(`refusées (trop minces pour porter un axe) : ${refusedBands.join(" · ")}\n`);
if (offeredBands.length < 2)
  throw new Error("fewer than two bands earn an axis — this beat has no floor control to ship");

const values = (key) => rows.map((r) => r[key]);
const peakYearOf = (key) => rows[thickestOf(key)].year;
const troughYearOf = (key) => rows[rows.reduce((best, r, i) => (r[key] < rows[best][key] ? i : best), 0)].year;

/** "le solaire", "l'hydraulique" — the article the beat's own words need, and nothing more. */
const article = (name) => (/^[aeiouéèêh]/i.test(name) ? `l'${name}` : `le ${name}`);

const noteFor = ({ key, name }) => {
  const v = values(key);
  const lastIndex = v.length - 1;
  const peakI = v.reduce((best, x, i) => (x > v[best] ? i : best), 0);
  const troughI = v.reduce((best, x, i) => (x < v[best] ? i : best), 0);
  const parts = [`${fr(v[0], 2)} TWh en ${years[0]}`];
  // A peak or a trough that IS one of the two ends is not a third reading, it is the same number
  // printed twice — which is what the first form of this sentence did on a band that only rises.
  if (peakI !== 0 && peakI !== lastIndex) parts.push(`sommet à ${fr(v[peakI], 2)} en ${years[peakI]}`);
  if (troughI !== 0 && troughI !== lastIndex) parts.push(`creux à ${fr(v[troughI], 2)} en ${years[troughI]}`);
  parts.push(`${fr(v[lastIndex], 2)} en ${years[lastIndex]}`);
  const move = v[lastIndex] - v[0];
  return (
    `${article(name)} sur son propre zéro : ${parts.join(", ")} — ` +
    `${move >= 0 ? "+" : "−"}${fr(Math.abs(move), 2)} TWh d'un bout à l'autre, ` +
    `soit ${fr((v[lastIndex] / totalOf(last)) * 100)} % du total ${years[lastIndex]}. ` +
    `L'axe ne mesure que cette bande.`
  );
};

const floor = {
  // Two words and not four: the legend floats into the pill row, and at 375 px "Poser au sol"
  // pushes the four pills onto a third line, which comes straight out of the plot.
  label: "Au sol",
  noneLabel: "Silhouette",
  carries: [
    ...named.map((b) => ({ key: b.key, y: midOf(b.key, b.at, flat) })),
    { key: "crossing", y: midOf(SUBJECT, crossingIndex, flat) },
  ],
  options: offeredBands.map((band) => {
    const note = noteFor(band);
    // THE PILL'S WORDS ARE THE BARE NAME, CAPITALISED, and that is a width decision rather than a
    // style one: four pills carrying articles wrap to three rows at 375 px, and every row of them
    // comes out of the plot's own height. The wording follows `proof/webx-electricity-mix`, whose
    // same gesture reads "Fossile au sol".
    const label = `${band.name[0].toUpperCase()}${band.name.slice(1)}`;
    return {
      key: band.key,
      label,
      // The accessible name CONTAINS the visible one by construction — it starts with it — which is
      // the WCAG 2.5.3 rule `assertFloorDeclaration` refuses on rather than hopes for.
      announce: `${label} au sol — ${note}`,
      note,
      shift: band.shift.map(round),
      ruleY: round(band.ruleY),
      ticks: band.ticks.map((t, i) => ({
        value: t.value,
        y: round(t.y),
        text: i === band.ticks.length - 1 ? `${fr(t.value, 0)} TWh` : fr(t.value, 0),
      })),
      carries: [
        ...named.map((b) => ({ key: b.key, y: round(midOf(b.key, b.at, band.shift)) })),
        { key: "crossing", y: round(midOf(SUBJECT, crossingIndex, band.shift)) },
      ],
    };
  }),
};
// `announce` must CONTAIN `label` — the WCAG 2.5.3 rule `assertFloorDeclaration` refuses on. The
// two are built from the same elided article above, so this only catches a future edit that drifts.
for (const option of floor.options)
  if (!option.announce.includes(option.label))
    throw new Error(`the option ${option.label} announces something that does not contain its own label`);

const plates = [
  {
    slug: "none",
    bands: SOURCES.map(([key], tone) => ({ key, tone, d: pathOf(key, flat) })),
    ruleY: null,
    grid: [],
    crossing: { x: round(crossingX), y: round(midOf(SUBJECT, crossingIndex, flat)) },
  },
  ...floor.options.map((option) => ({
    slug: floorSlugOf(option.key),
    bands: SOURCES.map(([key], tone) => ({ key, tone, d: pathOf(key, option.shift) })),
    ruleY: option.ruleY,
    grid: option.ticks.slice(1).map((t) => t.y),
    crossing: { x: round(crossingX), y: round(midOf(SUBJECT, crossingIndex, option.shift)) },
  })),
];

const axes = floor.options.map((option) => ({
  slug: floorSlugOf(option.key),
  name: nameOf.get(option.key),
  ticks: option.ticks.map((t) => ({ text: t.text, y: t.y })),
}));

// ── THE READING: ONE POINT PER YEAR, at an x no option moves ──────────────────────────────────
//
// The page shipped 234 of these, one per band-year, each at the centre of its own band. A shear
// moves every one of them and `interaction.mjs` resolves a pointer off `cx`/`cy` read once at init,
// so under any option each point would have answered for the place its band used to occupy. The
// year's x is the one coordinate no option touches — and the year's whole composition, in rank
// order, is where the claim itself is legible: solaire is fourth in 2015 and third in 2016.
const marks = rows.map((r) => {
  const ranked = SOURCES.map(([k, n]) => ({ n, v: r[k] })).sort((a, b) => b.v - a.v);
  return {
    key: `${r.year}`,
    year: r.year,
    x: round(x(r.year)),
    detail:
      `${r.year} · ${fr(totalOf(r))} TWh au total · par rang : ` +
      ranked.map((s) => `${s.n} ${fr(s.v, 2)}`).join(" · ") +
      " TWh",
  };
});

const facts = beatFacts(
  SOURCES.map(([k, n]) => ({ key: k, label: n, value: last[k] })),
  { subject: "solaire", declaredSequence: "TWh" },
);
const offered = applicableTreatments(facts);
console.log(`treatments applicable: ${offered.map((t) => t.id).join(", ") || "(none)"}\n`);

const xTicks = years.filter((y) => y % 5 === 0).map((year) => ({ year, x: round(x(year)) }));

const title = `Le solaire suisse est passé de ${fr(first[SUBJECT], 2)} à ${fr(last[SUBJECT], 2)} TWh — troisième source du pays depuis ${firstThird.year}`;
const caveat =
  `Production d'électricité suisse par source, ${years[0]}-${years[years.length - 1]}. Aucune des ` +
  `neuf bandes ne repose sur une droite ; sept déplacent leur sol plus que leur épaisseur ne varie.`;
// The control names itself — a legend, four pills and a sentence under them — so this line carries
// only what the control cannot: what the pointer answers with.
const readingLine = `Lecture : survolez ou tabulez une année pour ses neuf sources par rang.`;
// The country and the span are already on the plate — the caveat states both — so the credit line
// carries the credit and nothing it would only be repeating.
const source = `Source : Ember, Energy Institute — Statistical Review of World Energy (2025), via Our World in Data`;

const textPerRegister = {
  display: title,
  eyebrow: EYEBROW,
  body: `${caveat} ${readingLine} ${source} ${SOURCES.map(([, n]) => n).join(" ")} ${floor.label} ${floor.noneLabel} ${floor.options.map((o) => `${o.label} ${o.note}`).join(" ")}`,
  axis: `${xTicks.map((t) => t.year).join(" ")} ${axes.flatMap((a) => a.ticks.map((t) => t.text)).join(" ")}`,
  annot: `${crossingText} total ${fr(totalOf(first))} TWh total ${fr(totalOf(last))} TWh`,
  value: SOURCES.map(([, n]) => n).join(" "),
};
for (const key of Object.keys(textPerRegister)) textPerRegister[key] = plain(textPerRegister[key]);

const filed = filedFiles.map((f) => readDirection(join(DIRECTIONS, f)));
const newsroom = readPalette(HERE, { stopAt: join(HERE, "..") });
const BEAT_FACTS = { evidenceLevels: 3 };
console.log(report(composeDirections({ newsroom, filed, beat: BEAT_FACTS, textPerRegister }), { beat: BEAT_FACTS }));
console.log("");

const refused = [];
for (const file of filedFiles) {
  const id = file.replace(/\.md$/, "");
  const direction = resolveDirectionFamilies(readDirection(join(DIRECTIONS, file)), textPerRegister);
  // THE COLOURS THE PAGE REALLY PAINTS, MEASURED — the ramp against the ground it is mixed toward,
  // because everything drawn ON a band here (the seams, the graduations, the hover guide, the
  // floor rule's casing) is that ground and reads at whatever the worst of those nine pairs is.
  const ramp = Array.from({ length: SOURCES.length }, (_, i) => {
    const c = mix(direction.ground, direction.accent, 0.2 + ((SOURCES.length - 1 - i) / (SOURCES.length - 1)) * 0.8);
    return contrast(c, direction.ground) < NON_TEXT_CONTRAST_MIN
      ? (adjustToContrast(c, direction.ground, NON_TEXT_CONTRAST_MIN) ?? c)
      : c;
  });
  const worst = Math.min(...ramp.map((c) => contrast(c, direction.ground)));
  console.log(`${id}: ground on the ramp, worst of nine = ${worst.toFixed(2)}:1`);
  try {
    await renderWeb({
      // This catalogue is written in French; the renderer defaults to English and never guesses.
      lang: "fr",
      component: DirectedStreamWeb,
      props: {
        plates, axes, floor, geometry, marks, xTicks,
        tones: SOURCES.length,
        toneLabels: SOURCES.map(([, n]) => n),
        bandNames: named.map((b) => ({ key: b.key, x: round(b.x), text: b.name })),
        totals: { left: `${years[0]} : ${fr(totalOf(first))} TWh`, right: `${years[years.length - 1]} : ${fr(totalOf(last))} TWh` },
        crossingText,
        title, eyebrow: EYEBROW, caveat, source, reading: readingLine,
        alt:
          `Un flux de neuf bandes empilées sur une ligne de base flottante, de ${years[0]} à ` +
          `${years[years.length - 1]}. Les deux bandes les plus épaisses, l'hydraulique et le ` +
          `nucléaire, tiennent presque toute la hauteur. Une bande fine, le solaire, part d'un filet ` +
          `invisible et s'épaissit régulièrement jusqu'à ${fr(last[SUBJECT], 2)} TWh ; elle passe ` +
          `troisième en ${firstThird.year} et le reste. Un bouton pose au sol la bande de votre ` +
          `choix : le flux se cisaille jusqu'à ce que son bord inférieur soit droit, et un axe en ` +
          `TWh s'ouvre pour elle seule.`,
        direction,
        ground: direction.ground,
        accent: direction.accent,
      },
      outDir: OUT,
      name: `${id}.html`,
    });
    console.log(`${id} -> renders/${id}.html`);
  } catch (error) {
    refused.push({ id, why: error.message });
    console.log(`${id} REFUSED — ${error.message}`);
  }
}
if (refused.length) {
  console.log(`\nrefused by ${refused.length}: ${refused.map((x) => x.id).join(", ")}`);
  // A runner that swallows a refusal makes a refused page look like a produced one, and leaves the
  // previous render on disk to be mistaken for this one.
  process.exitCode = 1;
}
