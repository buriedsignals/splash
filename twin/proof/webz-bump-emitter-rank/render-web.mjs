// twin/proof/webz-bump-emitter-rank/render-web.mjs
//
// This beat's own WEB runner — the shape `proof/web-co2-ranking/render-web.mjs` set: the story's own
// constants, the story's own CSV reader, the story's own component, handed to the genre's generic
// `renderWeb`. It lives beside the story, never inside the skill: a skill directory that imports a
// story workspace stops building the moment it is copied on its own into a journalist's root.
//
// EVERY RANK IN THIS BEAT IS COMPUTED HERE, from emissions. `references/types/bump.md` names the
// defect this type is specifically exposed to: rank carries no magnitude, so "an invented rank slots
// into the visual field exactly as plausibly as a real one." There is no rank column in the data and
// no rank typed anywhere in this workspace — every one is the position of a country in a sort of
// every ISO-coded entity for that year. So are the countries drawn, the subject, the ordinal words
// for its two ranks, and every crossing and its year.
//
// After the skill's `renderWeb` writes the self-contained HTML, this runner does three story-owned
// repairs to that file in place, before anything is served or checked:
//
//   1. Appends this beat's OWN interaction script (`./bump-interaction.mjs`) as a second inline
//      `<script>` — see that file's header for why six lines over one set of columns cannot be
//      resolved by the skill's nearest-point-by-x script (which still runs first, finds no `.pt`
//      circles here, and is a harmless no-op).
//   2. Appends this beat's own CSS: the third grid column a bump chart's name gutter needs, the
//      fixed-size HTML rings and dots, and the tracing rules — including the one that exempts the
//      subject's own accent line from ever being dimmed.
//   3. Corrects `<html lang="fr">` to `<html lang="en">`. The skill's `renderWeb` hard-codes `fr`
//      because the first beat built against it wrote its words in French; this beat's words are
//      English, and a screen reader picks its pronunciation from that attribute, not from the words.
//      A per-story fix, not a change to the skill: `renderWeb` takes no `lang` parameter.
//
// Usage, from `twin/`:  bun proof/webz-bump-emitter-rank/render-web.mjs

import { readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { readPalette } from "#shared/twin-chart-beat/render-still.mjs";
import { renderWeb } from "../../skills/twin-chart-web/scripts/render-web.mjs";
import { BumpWeb, FRAME } from "./BumpWeb.tsx";

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

// The story's own frozen series, committed beside it, never re-fetched. The OUTPUT defaults beside
// the beat too: a script that defaults its output to a scratch directory prints a path, exits zero
// and leaves the committed artifact stale.
const DEFAULT_DATA_PATH = join(HERE, "data.csv");
const DEFAULT_OUT_DIR = HERE;
const OUTPUT_NAME = "bump-emitter-rank.html";

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
 * concatenation reads like without this. The test is on the name's own shape, so a data refresh that
 * brings in the Netherlands or the Philippines is already handled.
 */
export function withArticle(name) {
  return /^(United |Netherlands|Philippines|Bahamas|Gambia|Maldives|Comoros|Democratic Republic|Central African|Czech Republic|Marshall Islands|Solomon Islands|Faroe|Cayman|Isle of)/.test(
    name,
  )
    ? `the ${name}`
    : name;
}

const list = (items) =>
  items.length === 1
    ? items[0]
    : `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;

/** Everything this beat says about itself, derived from the frozen file and nothing else. */
export function deriveBeat(csv) {
  const byYear = emissionsByYear(csv, FIRST_YEAR, LAST_YEAR);
  const years = [...byYear.keys()].sort((a, b) => a - b);
  if (years.length !== LAST_YEAR - FIRST_YEAR + 1)
    throw new Error(`expected ${LAST_YEAR - FIRST_YEAR + 1} years, got ${years.length}`);

  const rankByYear = new Map(years.map((y) => [y, ranksInYear(byYear.get(y))]));
  for (const y of years)
    if (rankByYear.get(y).size < 100)
      throw new Error(
        `only ${rankByYear.get(y).size} countries in ${y} — a world rank needs the whole field`,
      );

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

  return {
    years,
    tracks,
    rankRows: Math.max(...tracks.flatMap((t) => t.ranks)),
    subject,
    best,
    overtaken,
    drawn,
    undrawn,
    countries: persistent.length,
    readings: tracks.length * years.length,
  };
}

export async function render({ dataPath, outDir, name = OUTPUT_NAME }) {
  const beat = deriveBeat(await readFile(dataPath, "utf8"));
  const { years, tracks, subject, best, drawn, undrawn } = beat;

  const title =
    `${subject} has risen from ${ORDINALS[best.from]} to ${ORDINALS[best.to]} among the ` +
    `world's biggest CO₂ emitters`;
  const subtitle =
    `World rank by annual CO₂ emissions, ${FIRST_YEAR}–${LAST_YEAR}. Only the ${beat.countries} ` +
    `countries that held a top-${BAND} place in every year are drawn; other countries hold the ` +
    `ranks left empty. Rank is position, not size. ${subject} had already passed ` +
    `${list(undrawn.map((o) => `${withArticle(o.country)} in ${o.year}`))}, ` +
    `${undrawn.length === 1 ? "which has" : "which have"} since left the top ${BAND}. ` +
    `Point at a line — or Tab into the chart — to follow one country through the crossings.`;
  const alt =
    `An interactive bump chart of world rank by annual CO₂ emissions, ${FIRST_YEAR} to ` +
    `${LAST_YEAR}, for the ${beat.countries} countries inside the top ${BAND} in every one of those ` +
    `years. The top row is the world's largest emitter. ${subject}'s line, the only one in the ` +
    `accent colour, starts at rank ${best.from} in ${FIRST_YEAR} and climbs to rank ${best.to} by ` +
    `${LAST_YEAR}; its crossings are ringed and captioned ` +
    `${list(drawn.map((o) => `${withArticle(o.country)} in ${o.year}`))}. The other lines are ` +
    `${list(tracks.filter((t) => t.country !== subject).map((t) => withArticle(t.country)))}, each ` +
    `named at its final rank. Every country's rank in every year is reachable on its own: pointing ` +
    `at the chart, or tabbing to a reading, names the country, the year and its rank that year.`;

  console.log(
    `drawn (${beat.countries}): ${tracks
      .map((t) => `${t.country} ${t.ranks[0]}→${t.ranks[t.ranks.length - 1]}`)
      .join(" | ")}`,
  );
  console.log(`subject ${subject}: ${best.from} → ${best.to}, rank rows ${beat.rankRows}`);
  console.log(
    `overtaken: ${beat.overtaken.map((o) => `${o.country} ${o.year}${o.drawn ? "" : " (not drawn)"}`).join(", ")}`,
  );
  console.log(`title:    ${title}`);
  console.log(`subtitle: ${subtitle}`);
  console.log(`alt:      ${alt}`);

  const { ground, accent, origin, source: paletteSource } = readPalette(HERE, {
    stopAt: join(HERE, "..", ".."),
  });
  console.log(`palette from ${paletteSource} — ground ${ground}, accent ${accent}, chosen by ${origin}`);

  const { outPath } = await renderWeb({
    component: BumpWeb,
    props: {
      years,
      data: tracks,
      rankRows: beat.rankRows,
      title,
      subtitle,
      source: BEAT.source,
      alt,
      axisTitle: BEAT.axisTitle,
      subject,
      crossings: beat.overtaken,
      ground,
      accent,
      frame: FRAME,
    },
    outDir,
    name,
  });

  await repair(outPath);

  return { outPath, readings: beat.readings };
}

/** The three in-place repairs this runner owns — see this file's header for why each is a
 *  story-level fix rather than a change to the skill's generic `renderWeb`. */
async function repair(outPath) {
  let html = await readFile(outPath, "utf8");

  html = html.replace('<html lang="fr">', '<html lang="en">');

  const interactionSource = await readFile(join(HERE, "bump-interaction.mjs"), "utf8");
  if (!html.includes("</body>")) throw new Error("renderWeb output has no </body> to repair");
  html = html.replace("</body>", `<script>\n${interactionSource}\n</script>\n</body>`);

  // This beat's own rules, after the genre's shared stylesheet.
  //
  // THE RINGS AND DOTS ARE HTML, at a fixed pixel size, because `preserveAspectRatio="none"` is a
  // non-uniform scale and an SVG circle under it is an ellipse of the container's own aspect ratio
  // (`web-discipline.md`, "What preserveAspectRatio='none' costs").
  //
  // THE TRACING RULES ARE CSS, not a script branch, and the subject's own line is exempt from the
  // dimming: the accent is reserved for the subject, so no interaction state may take it away
  // (`web-discipline.md`, "What must not become interactive"). Everything the beat CLAIMS — title,
  // caveat, source, the three crossing rings and their captions, every country's name at its final
  // rank — is outside every selector below that changes opacity, so no pointer, focus or key press
  // can reach it.
  const ownCss = `
.bump-figure .axis-title {
  flex: 0 0 auto;
  margin: 10px 0 6px;
  font-size: var(--axis-size);
  color: var(--muted);
}
.chart-plot.bump-plot {
  grid-template-columns: var(--y-gutter) 1fr var(--r-gutter);
  min-height: var(--min-plot-h);
}
.term-dot {
  position: absolute;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  transform: translate(-50%, -50%);
}
.crossing-ring {
  position: absolute;
  width: 17px;
  height: 17px;
  border: 2px solid;
  border-radius: 50%;
  transform: translate(-50%, -50%);
}
/* Two lines, the country over the year — see BumpWeb.tsx's own caption comment for the measurement
   that forced it, and .flip for the side a caption takes when the right one has no room. */
.crossing-label {
  position: absolute;
  display: flex;
  flex-direction: column;
  line-height: 1.15;
  font-size: var(--note-size);
  font-weight: 500;
  white-space: nowrap;
  transform: translateY(-50%) translateX(14px);
}
.crossing-label.flip {
  align-items: flex-end;
  transform: translateY(-50%) translateX(-14px) translateX(-100%);
}
.name-label {
  position: absolute;
  font-size: var(--label-size);
  white-space: nowrap;
  transform: translateY(-50%) translateX(10px);
}
svg.chart .line { transition: opacity 120ms ease; }
.name-label { transition: opacity 120ms ease; }
.bump-figure.is-tracing svg.chart .line { opacity: 0.2; }
.bump-figure.is-tracing svg.chart .line.is-active,
.bump-figure.is-tracing svg.chart .line.subject { opacity: 1; }
.bump-figure.is-tracing .name-label { opacity: 0.4; }
.bump-figure.is-tracing .name-label.is-active,
.bump-figure.is-tracing .name-label.subject { opacity: 1; }
.node { cursor: pointer; }
svg.chart circle.node.node-active { fill: var(--muted); }
.node:focus { outline: none; }
/* The ring hugs the mark — outline-offset is 0, not the 2px the rest of this genre uses. An outline
   is a FIXED number of CSS pixels around a mark whose own size is in STRETCHED user units, so every
   pixel of offset has to be bought back as viewBox inset at the width where the horizontal scale is
   smallest (MARK_INSET_X, BumpWeb.tsx, carries the arithmetic). An SVG clips to its viewBox and
   overflow:visible is not the way out: it was tried, and it cost the window fit — 767px of vertical
   overflow at 3440 x 900, because a visible overflow on the stretched svg re-enters the document's
   own height and defeats the flex clamp the fit rule depends on. Measured, then reverted. */
.node:focus-visible { outline: 2px solid var(--ink); outline-offset: 0; }
`;
  if (!html.includes("</style>")) throw new Error("renderWeb output has no </style> to repair");
  html = html.replace("</style>", `${ownCss}</style>`);

  await writeFile(outPath, html);
}

if (import.meta.main) {
  const argv = process.argv.slice(2);
  const flag = (name, fallback) => {
    const at = argv.indexOf(name);
    return at >= 0 ? argv[at + 1] : fallback;
  };
  const positional = argv.find((a) => !a.startsWith("--"));
  const dataPath = resolve(flag("--data", DEFAULT_DATA_PATH));
  const outDir = resolve(positional ?? flag("--out", DEFAULT_OUT_DIR));

  const { outPath, readings } = await render({ dataPath, outDir });
  console.log(`web beat → ${outPath}  [${readings} readings]`);
}
