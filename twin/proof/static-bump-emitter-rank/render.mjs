// twin/proof/static-bump-emitter-rank/render.mjs
//
// This story's own render script — the render ladder's first rung: read the frozen CSV, derive
// every claim from it, render one PNG beside the beat, then LOOK at it.
//
// EVERY RANK IN THIS BEAT IS COMPUTED HERE, from emissions. `references/types/bump.md` names the
// defect this type is specifically exposed to: rank carries no magnitude, so "an invented rank
// slots into the visual field exactly as plausibly as a real one." There is no rank column in the
// data and no rank typed anywhere in this workspace — every one is the position of a country in a
// sort of every ISO-coded entity for that year.
//
// So are the countries drawn, the subject, the ordinal words for its two ranks, every crossing and
// its year, the conclusion sentence, and the alt text's own claim about who leads the table.
//
// Usage, from `twin/`:  bun proof/static-bump-emitter-rank/render.mjs

import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderStill, readPalette } from "#shared/twin-chart-beat/render-still.mjs";
import { EmitterRankBump, FRAME } from "./EmitterRankBump.tsx";

const HERE = dirname(fileURLToPath(import.meta.url));

const FIRST_YEAR = 1990;
const LAST_YEAR = 2024;
/** The band of the world ranking this beat is about. A country is drawn only if it held a place
 *  inside this band in EVERY year of the window — computed, not a chosen list of countries. */
const BAND = 10;

const BEAT = {
  axisTitle: "World rank",
  source:
    "Source: Global Carbon Budget (2025) – with major processing by Our World in Data · " +
    "fossil fuels and industry only; land-use change is not included",
};

/** Ordinal words, index = the number. Only ever indexed by a COMPUTED rank. */
const ORDINALS = [
  "zeroth",
  "first",
  "second",
  "third",
  "fourth",
  "fifth",
  "sixth",
  "seventh",
  "eighth",
  "ninth",
  "tenth",
];

/**
 * Year → (country → emissions), countries only.
 *
 * A row with no `Code` is an OWID-assembled region and a `Code` beginning `OWID_` is an OWID-defined
 * entity; both are dropped, because a world ranking of countries that included "Asia" would be a
 * ranking of nothing.
 */
export function emissionsByYear(csv, firstYear, lastYear) {
  const [header, ...rows] = csv.trim().split(/\r?\n/);
  const columns = header.split(",");
  const entityAt = columns.indexOf("Entity");
  const codeAt = columns.indexOf("Code");
  const yearAt = columns.indexOf("Year");
  const valueAt = columns.findIndex((c) => c.startsWith("Annual CO"));
  if (entityAt < 0 || codeAt < 0 || yearAt < 0 || valueAt < 0)
    throw new Error(`csv has no Entity / Code / Year / Annual CO₂ column, got: ${header}`);

  const byYear = new Map();
  for (const row of rows) {
    const cells = row.split(",");
    const year = Number(cells[yearAt]);
    if (!(year >= firstYear && year <= lastYear)) continue;
    if (!cells[codeAt] || cells[codeAt].startsWith("OWID")) continue;
    const value = Number(cells[valueAt]);
    if (!Number.isFinite(value)) continue;
    if (!byYear.has(year)) byYear.set(year, new Map());
    byYear.get(year).set(cells[entityAt], value);
  }
  return byYear;
}

/** Every country's world rank in one year: 1 = largest emitter. */
export function ranksInYear(values) {
  const ordered = [...values.entries()].sort((a, b) => b[1] - a[1]);
  return new Map(ordered.map(([country], i) => [country, i + 1]));
}

/**
 * The definite article some country names take mid-sentence. Grammar, not data: OWID's `Entity`
 * column is the country's name, and "and United Kingdom in 1991" is what a sentence built by
 * concatenation reads like without this. The test is on the name's own shape, so a data refresh
 * that brings in the Netherlands or the Philippines is already handled.
 */
export function withArticle(name) {
  return /^(United |Netherlands|Philippines|Bahamas|Gambia|Maldives|Comoros|Democratic Republic|Central African|Czech Republic|Marshall Islands|Solomon Islands|Faroe|Cayman|Isle of)/.test(
    name,
  )
    ? `the ${name}`
    : name;
}

/** Spelled counts, index = the number. Only ever indexed by a COMPUTED count, the same way
 *  `ORDINALS` is only ever indexed by a computed rank. */
const SPELLED = [
  "no",
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
];

const list = (items) =>
  items.length === 1
    ? items[0]
    : `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;

async function main() {
  // Frozen beside the beat, never re-fetched and never read from a scratch directory.
  const byYear = emissionsByYear(
    await readFile(join(HERE, "data.csv"), "utf8"),
    FIRST_YEAR,
    LAST_YEAR,
  );
  const years = [...byYear.keys()].sort((a, b) => a - b);
  if (years.length !== LAST_YEAR - FIRST_YEAR + 1)
    throw new Error(`expected ${LAST_YEAR - FIRST_YEAR + 1} years, got ${years.length}`);

  const rankByYear = new Map(years.map((y) => [y, ranksInYear(byYear.get(y))]));
  for (const y of years)
    if (rankByYear.get(y).size < 100)
      throw new Error(
        `only ${rankByYear.get(y).size} countries in ${y} — a world rank needs the whole field`,
      );

  // The drawn set: every country inside the band in EVERY year. Derived, never a chosen list.
  const persistent = [...rankByYear.get(years[0]).keys()].filter((country) =>
    years.every((y) => (rankByYear.get(y).get(country) ?? Infinity) <= BAND),
  );
  if (persistent.length < 3 || persistent.length > 8)
    throw new Error(
      `${persistent.length} countries held a top-${BAND} place in every year — outside the 3..8 a bump chart can carry legibly`,
    );

  const rankOf = (country, year) => rankByYear.get(year).get(country);
  const tracks = persistent
    .map((country) => ({ country, ranks: years.map((y) => rankOf(country, y)) }))
    .sort((a, b) => a.ranks[a.ranks.length - 1] - b.ranks[b.ranks.length - 1]);

  // The subject is the biggest CLIMB in the drawn set — computed, and required to be unique, so the
  // beat cannot silently be about a different country after a data refresh.
  const climbs = tracks.map((t) => ({
    country: t.country,
    gain: t.ranks[0] - t.ranks[t.ranks.length - 1],
    from: t.ranks[0],
    to: t.ranks[t.ranks.length - 1],
  }));
  const best = climbs.reduce((a, b) => (b.gain > a.gain ? b : a));
  if (climbs.filter((c) => c.gain === best.gain).length !== 1)
    throw new Error(
      `the biggest climb is shared — this beat needs one subject, got ${JSON.stringify(climbs)}`,
    );
  if (best.gain < 2)
    throw new Error(`the biggest climb is ${best.gain} places — too small to be a beat`);

  const rankRows = Math.max(...tracks.flatMap((t) => t.ranks));

  /**
   * Every country the subject overtook across the window, with the year it happened: ranked above
   * the subject in the first year, below it in the last, and the crossing year is the first year the
   * subject led it and never fell behind again.
   */
  const subject = best.country;
  const overtaken = [];
  for (const [country] of rankByYear.get(years[0])) {
    if (country === subject) continue;
    const startAbove = rankOf(country, years[0]) < rankOf(subject, years[0]);
    const endBelow = (rankOf(country, LAST_YEAR) ?? Infinity) > rankOf(subject, LAST_YEAR);
    if (!(startAbove && endBelow)) continue;
    let crossing = null;
    for (let i = years.length - 1; i >= 0; i--) {
      const theirs = rankOf(country, years[i]) ?? Infinity;
      if (rankOf(subject, years[i]) < theirs) crossing = years[i];
      else break;
    }
    if (crossing !== null)
      overtaken.push({ country, year: crossing, drawn: persistent.includes(country) });
  }
  overtaken.sort((a, b) => a.year - b.year);

  const drawn = overtaken.filter((o) => o.drawn);
  const undrawn = overtaken.filter((o) => !o.drawn);
  if (drawn.length === 0)
    throw new Error(`the subject overtook nobody that this chart draws — there is nothing to mark`);
  if (undrawn.length === 0)
    throw new Error(
      `every crossing is drawn on the frame — the conclusion line below the chart has nothing to say ` +
        `that the captions do not, and would be a repeated reading`,
    );

  // Who leads the table, and — when that changed inside the window — the year it changed. Read off
  // the same ranks: the first year the closing leader held rank 1 and never lost it again. It is
  // visible at the top of this frame and it is NOT this beat's claim, so it is named in the alt
  // text and nowhere in the drawing.
  const leaderAt = (year) => [...rankByYear.get(year)].find(([, r]) => r === 1)[0];
  const leadFirst = leaderAt(years[0]);
  const leadLast = leaderAt(LAST_YEAR);
  let leadChanged = null;
  if (leadFirst !== leadLast) {
    for (let i = years.length - 1; i >= 0; i--) {
      if (rankOf(leadLast, years[i]) === 1) leadChanged = years[i];
      else break;
    }
    if (leadChanged === null)
      throw new Error(`${leadLast} leads in ${LAST_YEAR} but never held rank 1 — ranks disagree`);
  }

  const title =
    `${subject} has risen from ${ORDINALS[best.from]} to ${ORDINALS[best.to]} among the ` +
    `world's biggest CO₂ emitters`;
  const caveat =
    `World rank by annual CO₂ emissions, ${FIRST_YEAR}–${LAST_YEAR}. Only the ${persistent.length} ` +
    `countries that held a top-${BAND} place in every year are drawn; other countries hold the ` +
    `ranks left empty. Rank is position, not size — nothing here says how far ahead anyone is.`;
  // The two crossings the frame CANNOT mark: the countries they were against have since left the
  // band, so they have no line on this chart to cross. That is what this sentence is for, and it is
  // why the beat requires at least one such crossing to exist before it will render.
  const conclusion =
    `${subject} had already passed ` +
    `${list(undrawn.map((o) => `${withArticle(o.country)} in ${o.year}`))}, ` +
    `${undrawn.length === 1 ? "which has" : "which have"} since left the top ${BAND}.`;
  const alt =
    `A bump chart of world rank by annual CO₂ emissions, ${FIRST_YEAR} to ${LAST_YEAR}, for the ` +
    `${persistent.length} countries inside the top ${BAND} in every one of those years. The top ` +
    `row is the world's largest emitter. Every line is named at both ends. ${subject}'s line, the ` +
    `only one in the accent colour, starts at rank ${best.from} in ${FIRST_YEAR} and climbs to ` +
    `rank ${best.to} by ${LAST_YEAR}; ${SPELLED[drawn.length]} ringed crossings on it are captioned ` +
    `${list(drawn.map((o) => `${withArticle(o.country)} in ${o.year}`))}. The other lines are ` +
    `${list(tracks.filter((t) => t.country !== subject).map((t) => withArticle(t.country)))}. ` +
    (leadChanged === null
      ? `${withArticle(leadLast)} holds the top row throughout.`
      : `At the top of the chart ${withArticle(leadLast)} takes the top row from ` +
        `${withArticle(leadFirst)} in ${leadChanged}; that swap is drawn but not marked, because ` +
        `this beat's claim is ${subject}'s climb.`);

  console.log(
    `drawn (${persistent.length}): ${tracks
      .map((t) => `${t.country} ${t.ranks[0]}→${t.ranks[t.ranks.length - 1]}`)
      .join(" | ")}`,
  );
  console.log(`subject ${subject}: ${best.from} → ${best.to}, rank rows ${rankRows}`);
  console.log(
    `overtaken: ${overtaken.map((o) => `${o.country} ${o.year}${o.drawn ? "" : " (not drawn)"}`).join(", ")}`,
  );
  console.log(`rank 1: ${leadFirst} → ${leadLast}${leadChanged === null ? "" : ` from ${leadChanged}`}`);
  console.log(`title:      ${title}`);
  console.log(`caveat:     ${caveat}`);
  console.log(`conclusion: ${conclusion}`);
  console.log(`alt:        ${alt}`);

  const { ground, accent, origin, source: paletteSource } = readPalette(HERE, {
    stopAt: join(HERE, "..", ".."),
  });
  console.log(`palette from ${paletteSource} — ground ${ground}, accent ${accent}, chosen by ${origin}`);

  const { pngPath } = await renderStill({
    element: createElement(EmitterRankBump, {
      years,
      data: tracks,
      rankRows,
      title,
      caveat,
      source: BEAT.source,
      axisTitle: BEAT.axisTitle,
      alt,
      subjectCountry: subject,
      crossings: overtaken,
      conclusion,
      ground,
      accent,
    }),
    width: FRAME.width,
    height: FRAME.height,
    outDir: HERE,
    name: "static-bump-emitter-rank-still",
  });
  console.log(`rendered -> ${pngPath} — now open it and look at it.`);
}

main();
