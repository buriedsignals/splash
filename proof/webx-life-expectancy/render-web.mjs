// twin/proof/webx-life-expectancy/render-web.mjs
//
// This beat's own WEB runner — same shape as `proof/web-co2-ranking/render-web.mjs`: the story's
// own constants, its own CSV reader, its own component, handed to the format's generic `renderWeb`.
// `data.csv` is the frozen OWID export (copied from `proof/more-line-swiss-life-expectancy/data.csv`,
// the beat's already-verified static sibling) — 148 rows, Switzerland only, 1876-2023; re-verified
// here (entity, row count, span) rather than trusted on sight.
//
// The skill's own `assets/interaction.mjs` is reused nearly unchanged — a line is exactly the shape
// it was built for (one continuous axis, hover/tap/keyboard resolve by nearest x). `repair()` below
// patches TWO things into the emitted file after `renderWeb` writes it: the `lang` this beat's own
// words need (English throughout), and one anchored line of the interaction script, so that a tap
// survives the finger lifting (see `repair`'s own note).
//
// SECOND BUILD: migrated to the format's FLUID FRAME. `renderWeb` no longer takes a `layouts` array
// (the two-rung design was overturned — see `LifeExpectancyWeb.tsx`'s own doc-comment); this runner
// hands it one component and one `frame`.
//
// Usage:  bun proof/webx-life-expectancy/render-web.mjs [outDir] [--data <csv>]

import { readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { readPalette } from "#shared/chart-beat/render-still.mjs";
import { renderWeb } from "../../skills/chart-web/scripts/render-web.mjs";
import { LifeExpectancyWeb, FRAME } from "./LifeExpectancyWeb.tsx";
// The beat's own number formatter, taking its locale from the language the page declares — the
// same one the component labels every reading with, so the prose and the axis can never disagree.
import { formatNumber } from "./life-geometry.ts";

const HERE = dirname(fileURLToPath(import.meta.url));

export const BEAT = {
  subject: "Switzerland",
  // The two colours this beat is drawn in are NOT here. They are recorded in `PALETTE.md` beside
  // this file and read back by `readPalette` in `render` below — a hex typed here is a colour the
  // newsroom's own recorded answer can never reach.
  source:
    "Source: UN, World Population Prospects (2024), via Our World in Data · Switzerland, 1950–2023, extracted 8 August 2026",
};

const DEFAULT_DATA_PATH = join(HERE, "data.csv");
// And the OUTPUT defaults beside the beat too — where this beat's html is actually committed. It
// used to default to a scratch directory, so running this script the obvious way produced a fresh
// file nobody looks at, printed a path, exited zero, and left the committed one stale.
const DEFAULT_OUT_DIR = HERE;
const OUTPUT_NAME = "life-expectancy.html";

/** Parses the frozen CSV, verifies the entity/row-count/span it expects, and filters to the
 *  1950-2023 span the beat's own claim is about — the same checks
 *  `proof/more-line-swiss-life-expectancy/render.mjs` runs on this exact file. */
export function readingsFromCsv(csv) {
  const [header, ...rows] = csv.trim().split(/\r?\n/);
  const columns = header.split(",");
  const entityAt = columns.indexOf("Entity");
  const yearAt = columns.indexOf("Year");
  const valueAt = columns.indexOf("Life expectancy");
  if (entityAt < 0 || yearAt < 0 || valueAt < 0)
    throw new Error(`csv has no Entity / Year / Life expectancy column, got: ${header}`);

  const records = rows.map((row) => row.split(","));
  const entities = [...new Set(records.map((r) => r[entityAt]))];
  if (entities.length !== 1 || entities[0] !== "Switzerland")
    throw new Error(`expected every row's Entity to read "Switzerland", got: ${entities.join(", ")}`);

  const readings = records
    .map((r) => ({ year: Number(r[yearAt]), value: Number(r[valueAt]) }))
    .filter((r) => r.year >= 1950)
    .sort((a, b) => a.year - b.year);
  if (readings.length !== 74)
    throw new Error(`expected 74 readings (1950-2023), got ${readings.length}`);
  const first = readings[0];
  const last = readings[readings.length - 1];
  if (first.year !== 1950 || last.year !== 2023)
    throw new Error(`expected span 1950-2023, got ${first.year}-${last.year}`);
  return readings;
}

/** One decimal is the precision every number this beat prints is rounded to — the axis tick, the
 *  end label, the tooltip's own value. So it is also the precision a CLAUSE about two readings is
 *  judged at. Rounding twice, here and again at the print, is what lets a tooltip say "down 0.0 on
 *  1959" beside two printed values a reader can see are equal: the fall existed in the float and
 *  not on the page. A clause the page's own numbers contradict is worse than no clause. */
const oneDecimal = (value) => Math.round(value * 10) / 10;

/**
 * EVERY READING, WITH THE ANSWER IT GIVES A READER WHO ASKS IT.
 *
 * The plate prints three of these 74 numbers. What it can never print is the reading this beat's
 * own claim is made of: how much of the 15-year climb had already happened by the year a reader is
 * pointing at. The dashed rule draws the 1950 level and the end label draws 2023; the distance
 * between any year and that rule is drawn as pixels and stated nowhere, and the SHARE that distance
 * is of the whole climb is not in the drawing at any width.
 *
 * ONE ARITHMETIC, USED TWICE, for the reason `proof/web-line-swiss-co2` records at length: the
 * headline's `delta` and every year's own clause are the same subtraction, so the tooltip on 2023
 * prints the title's number rather than a second derivation of it that happens to agree.
 *
 * The fall clause is drawn only where the page's OWN one-decimal numbers fall, and it carries the
 * count of every such year in the run — a reader can see a wiggle in the stroke and cannot count
 * nine of them across 74 readings.
 */
export function readingsWithDetail(readings) {
  const first = readings[0];
  const last = readings[readings.length - 1];
  const climb = last.value - first.value;
  if (!(climb > 0))
    throw new Error(
      `every clause here is a share of the climb from ${first.year} to ${last.year}; that climb is ${climb}`,
    );

  const fell = readings.filter(
    (r, i) => i > 0 && oneDecimal(r.value) < oneDecimal(readings[i - 1].value),
  );
  // TWO GUARDS, BECAUSE ONE OF THEM WAS VACUOUS ON ITS OWN. The emptiness check catches a
  // comparison that can never fire — a clause written, shipped and never drawn. It does NOT catch
  // the comparison being the wrong way round, which is the likelier slip: an inverted `<` finds the
  // 64 steps that RISE, the alt text goes on to announce "it falls in 64 of those years", and
  // `drop > 0` below quietly suppresses every clause, so the page looks exactly the same. The
  // majority check is what makes that mutation red. A near-monotone climb cannot fall in most of its
  // own steps; if it does, this is not the series the beat claims.
  const steps = readings.length - 1;
  if (fell.length === 0)
    throw new Error(
      "no year in this run falls at the precision the page prints — the fall clause would be dead code",
    );
  if (fell.length * 2 >= steps)
    throw new Error(
      `${fell.length} of ${steps} steps fall, which is not a climb — the comparison is inverted, ` +
        `or this is no longer the series the claim is about`,
    );

  const withDetail = readings.map((reading, i) => {
    const gain = reading.value - first.value;
    const parts = [`${reading.year} · ${formatNumber(reading.value)} years`];

    if (reading.year === first.year)
      // 0.0 years and 0 % of the climb is the reference answering with its own definition. It is
      // the one year the share cannot be a reading, so it says what it IS instead.
      parts.push(`the baseline the whole climb is measured from`);
    else if (reading.year === last.year)
      parts.push(`+${formatNumber(gain)} since ${first.year} — the whole climb`);
    else
      parts.push(
        `+${formatNumber(gain)} since ${first.year}`,
        `${formatNumber((gain / climb) * 100, 0)}% of the whole climb`,
      );

    if (i > 0) {
      const previous = readings[i - 1];
      const drop = oneDecimal(oneDecimal(previous.value) - oneDecimal(reading.value));
      if (drop > 0)
        parts.push(
          `${formatNumber(drop)} below ${previous.year}, one of only ${fell.length} years since ${first.year} that fell`,
        );
    }

    return { ...reading, detail: parts.join(" · ") };
  });

  return { readings: withDetail, fell: fell.map((r) => r.year) };
}

export async function render({ dataPath, outDir, name = OUTPUT_NAME }) {
  const csv = await readFile(dataPath, "utf8");
  const readings = readingsFromCsv(csv);

  const first = readings[0];
  const last = readings[readings.length - 1];
  const delta = last.value - first.value;
  const crossing = readings.find((r) => r.value >= 80);
  if (!crossing) throw new Error("readings never reach 80 — claim would be false");

  const { readings: detailed, fell } = readingsWithDetail(readings);

  const title = `Life expectancy in Switzerland rose ${formatNumber(delta)} years between ${first.year} and ${last.year}`;
  // THE TITLE'S NUMBER AND THE LAST YEAR'S ANSWER ARE THE SAME SUBTRACTION, and this is where that
  // is held rather than hoped for. `readingsWithDetail` measures the climb from the same two
  // readings the title does; if either side is ever re-derived some other way, the run stops here
  // instead of shipping a page whose tooltip quietly contradicts its own headline.
  const titleNumber = `+${formatNumber(delta)} since ${first.year}`;
  if (!detailed[detailed.length - 1].detail.includes(titleNumber))
    throw new Error(
      `the headline says ${JSON.stringify(titleNumber)} and ${last.year} answers ` +
        `${JSON.stringify(detailed[detailed.length - 1].detail)} — two arithmetics for one claim`,
    );
  // Descriptive, not a claim: every value in it is read back off the frozen CSV the parser above
  // already asserted (entity, row count, span), so it cannot drift from the file.
  const caveat = `Life expectancy at birth in ${BEAT.subject}, ${first.year}–${last.year}. Annual readings.`;
  // The dips are NAMED FROM THE MEASUREMENT, never typed: `fell` is every year the page's own
  // one-decimal numbers fall against the year before, so a frozen file that changed would change
  // this sentence with it rather than leave it asserting a dip nobody can find.
  const recentFalls = fell.slice(-2).join(" and ");
  const alt = `Line chart of life expectancy at birth in Switzerland, ${first.year} to ${last.year}. The line rises from ${formatNumber(first.value)} years in ${first.year} to ${formatNumber(last.value)} years in ${last.year}, a gain of ${formatNumber(delta)} years, first crossing 80 years in ${crossing.year}. It falls in ${fell.length} of those years, most recently ${recentFalls}. Every one of the ${readings.length} annual readings has its own answer on hover, tap or keyboard focus: its value, how far it stands above the ${first.year} level, and what share of the whole climb had happened by then.`;

  const { ground, accent, origin, source: paletteSource } = readPalette(HERE, {
    stopAt: join(HERE, ".."),
  });
  console.log(
    `palette from ${paletteSource} — ground ${ground}, accent ${accent}, chosen by ${origin}`,
  );

  /**
   * THE INTERACTION, WRITTEN BEFORE THE CODE — `chart-web/references/directed-interaction.md`, and
   * `BRIEF.md` carries the same thing in prose, including the two controls this beat declined and
   * the measurement each refusal rests on. `renderWeb` checks this declaration against the markup
   * it is about to write, so the brief's promise and the page cannot drift apart.
   */
  const interaction = {
    earns:
      `A still of this claim prints three of its ${readings.length} numbers — the ${first.year} ` +
      `level, the year 80 was passed, and ${last.year} — and it draws the distance between any ` +
      `year and that ${first.year} rule as pixels a reader has to eyeball. This page answers with ` +
      `that distance as a number, and with the share of the whole ${formatNumber(delta)}-year ` +
      `climb already banked by the year the reader is pointing at: the headline's own arithmetic, ` +
      `run on all ${readings.length} years instead of on one.`,
    controls: [
      {
        question: "How much of the climb had already happened by the year I am looking at?",
        gesture: "ask-a-mark",
        changes:
          `The year under the pointer lights and the tooltip prints readings the plate does not ` +
          `hold: that year's own value, how far it stands above the ${first.year} rule, what ` +
          `share of the whole climb that is, and — for the ${fell.length} years the series ` +
          `actually fell — how far it fell and that it is one of only ${fell.length} such years ` +
          `in the run.`,
      },
    ],
  };

  const { outPath } = await renderWeb({
    component: LifeExpectancyWeb,
    props: {
      data: detailed,
      interaction,
      title,
      caveat,
      source: BEAT.source,
      alt,
      subject: BEAT.subject,
      ground,
      accent,
      referenceYear: first.year,
      crossingYear: crossing.year,
      frame: FRAME,
    },
    outDir,
    name,
  });

  await repair(outPath);

  return { outPath, readings: readings.length, delta, crossingYear: crossing.year, fell };
}

// The format's own line, verbatim, and the guarded one that replaces it. A touch pointer is
// destroyed the instant the finger lifts, and Chrome then fires `pointerleave` up the whole chain
// for it — so an unguarded `pointerleave` handler wipes the tooltip the tap has just opened. This
// beat's alt text promises every one of its 74 readings "on hover, tap or keyboard focus", and the
// tap half was FALSE: measured on the committed artifact with a real CDP touch sequence
// (touchStart → 150ms → touchEnd → 500ms) at 390x844, the reading appeared and then vanished
// inside one gesture. Same defect, same remedy as
// `proof/weby-small-multiples-co2-per-capita/small-multiples-interaction.mjs` — clear on
// `pointerleave` for MOUSE AND PEN ONLY; a touch reader's tooltip is cleared instead by the
// document-level `pointerdown` the format already installs, so it holds until they tap elsewhere,
// which is what a tap-to-inspect control should do.
//
// Patched HERE, into the emitted HTML, rather than into the format's shared
// `chart-web/assets/interaction.mjs`, because that file is outside this beat's scope and is
// being edited concurrently. It is an ANCHORED replacement, not a vendored copy of the whole
// module: a copy would drift silently the moment the format's script changed, whereas this throws
// by name if the line it expects is no longer there.
const LEAVE_LINE = '    hitArea.addEventListener("pointerleave", clear);';
const LEAVE_GUARDED = `    hitArea.addEventListener("pointerleave", function (evt) {
      // Mouse and pen only — see this beat's render-web.mjs for the measurement.
      if (evt.pointerType === "touch") return;
      clear();
    });`;

async function repair(outPath) {
  let html = await readFile(outPath, "utf8");

  const langMarker = '<html lang="fr">';
  if (!html.includes(langMarker))
    throw new Error(
      `expected renderWeb's own ${JSON.stringify(langMarker)} shell to patch to English — its HTML shape may have changed`,
    );
  html = html.replace(langMarker, '<html lang="en">');

  if (html.split(LEAVE_LINE).length !== 2)
    throw new Error(
      `expected exactly one ${JSON.stringify(LEAVE_LINE.trim())} in the inlined interaction script ` +
        "to guard against a touch pointer's own leave — the format's script may already guard it, in " +
        "which case delete this patch rather than widening it",
    );
  html = html.replace(LEAVE_LINE, LEAVE_GUARDED);

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

  const { outPath, readings, delta, crossingYear, fell } = await render({ dataPath, outDir });
  console.log(
    `web beat → ${outPath}  [${readings} readings, +${formatNumber(delta)} years, crossed 80 in ${crossingYear}, ` +
      `fell in ${fell.length}: ${fell.join(" ")}]`,
  );
}
