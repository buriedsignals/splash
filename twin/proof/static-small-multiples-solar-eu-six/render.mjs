// twin/proof/static-small-multiples-solar-eu-six/render.mjs
//
// Reads the frozen CSV (solar's share of electricity generation, six countries, 2010-2024) and
// renders the small-multiples grid.
// Usage, from `twin/`:  bun proof/static-small-multiples-solar-eu-six/render.mjs
//
// Every number the render prints — in the title, the subtitle, each panel's end label and the alt
// text — is COMPUTED here from the frozen file and echoed to the console first. Nothing is typed.

import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderStill, readPalette } from "#shared/twin-chart-beat/render-still.mjs";
import {
  assertDeliveredSize,
  assertTypeFloor,
  assertWithinStage,
  readPinnedSize,
  readPngSize,
  sizeFor,
} from "#shared/twin-chart-beat/sizes.mjs";
import { assertTypeMayEnter } from "#shared/twin-chart-beat/type-at-size.mjs";
import {
  TYPE,
  rungsFor,
} from "./SolarSmallMultiples.tsx";
import { SolarSmallMultiples, formatShare } from "./SolarSmallMultiples.tsx";

const HERE = dirname(fileURLToPath(import.meta.url));

/**
 * The panel set, and the rule that chose it — stated, because a hand-picked set of countries is
 * how a small-multiples grid quietly becomes an argument about which countries were shown.
 *
 * The rule: the six largest member states of the European Union by population. It is external to
 * this dataset, verifiable, and it was fixed BEFORE any solar figure was read — so the grid
 * cannot have been assembled to make its own point. It is also why France, whose panel is nearly
 * flat, is in the grid at all: nothing about the selection let a dull panel be dropped.
 */
const EU_SIX_LARGEST_BY_POPULATION = [
  "Germany",
  "France",
  "Italy",
  "Spain",
  "Poland",
  "Romania",
];
const FIRST_YEAR = 2010;
const LAST_YEAR = 2024;

function parseCsv(text) {
  const [header, ...rows] = text.trim().split(/\r?\n/);
  const cols = header.split(",");
  return rows
    .filter((row) => row.length > 0)
    .map((row) => {
      if (row.includes('"')) throw new Error(`quoted field in frozen data, parser is too simple: ${row}`);
      const cells = row.split(",");
      if (cells.length !== cols.length)
        throw new Error(`row has ${cells.length} cells, header has ${cols.length}: ${row}`);
      const rec = {};
      cols.forEach((c, i) => (rec[c] = cells[i]));
      return rec;
    });
}

async function main() {
  const csv = await readFile(join(HERE, "data.csv"), "utf8");
  const rows = parseCsv(csv);
  console.log(`read ${rows.length} rows from data.csv`);

  // The OWID grapher endpoint returns the ENTIRE dataset with HTTP 200 when its `country=`
  // parameter is not honoured (`twin-intake/references/ourworldindata-csv-filter-trap.md`) — it
  // was not honoured on this endpoint, which is why the freeze was filtered locally from the full
  // CSV. Verify the frozen file by eye rather than trusting that.
  const entities = [...new Set(rows.map((r) => r.Entity))].sort();
  console.log(`distinct Entity values (${entities.length}): ${entities.join(", ")}`);
  if (JSON.stringify(entities) !== JSON.stringify([...EU_SIX_LARGEST_BY_POPULATION].sort()))
    throw new Error(`frozen data holds ${entities.join(", ")}, expected the six selected countries`);

  const expectedYears = [];
  for (let y = FIRST_YEAR; y <= LAST_YEAR; y++) expectedYears.push(y);

  const panels = EU_SIX_LARGEST_BY_POPULATION.map((country) => {
    const readings = rows
      .filter((r) => r.Entity === country)
      .map((r) => ({ year: Number(r.Year), value: Number(r.Solar) }))
      .sort((a, b) => a.year - b.year);
    // A gap is shown, not bridged (`static-discipline.md`) — but a small-multiples grid whose
    // panels do not cover the same years cannot share an axis at all, so a hole here is a stop,
    // not a note.
    if (readings.length !== expectedYears.length)
      throw new Error(`${country} has ${readings.length} readings, expected ${expectedYears.length}`);
    readings.forEach((r, i) => {
      if (r.year !== expectedYears[i]) throw new Error(`${country} is missing ${expectedYears[i]}`);
      if (!Number.isFinite(r.value)) throw new Error(`${country} ${r.year} is not a number`);
      if (r.value < 0 || r.value > 100)
        throw new Error(`${country} ${r.year} is ${r.value}, which is not a share of a whole`);
    });
    return { country, readings };
  });

  const at = (panel, year) => panel.readings.find((r) => r.year === year).value;
  console.table(
    panels.map((p) => ({
      country: p.country,
      [FIRST_YEAR]: at(p, FIRST_YEAR).toFixed(2),
      [LAST_YEAR]: at(p, LAST_YEAR).toFixed(2),
      "peak year": p.readings.reduce((a, b) => (b.value > a.value ? b : a)).year,
    })),
  );

  // Panel order: by the value the story cares about, descending — the 2024 share.
  // `small-multiples.md` asks for a meaningful order and names alphabetical-by-default as the
  // thing that buries the comparison.
  const ordered = [...panels].sort((a, b) => at(b, LAST_YEAR) - at(a, LAST_YEAR));
  console.log(`panel order (${LAST_YEAR} share, descending): ${ordered.map((p) => p.country).join(" > ")}`);

  // Every quantity in the headline, computed.
  const startMax = Math.max(...panels.map((p) => at(p, FIRST_YEAR)));
  const startZero = panels.filter((p) => at(p, FIRST_YEAR) === 0);
  const overTenth = ordered.filter((p) => at(p, LAST_YEAR) > 10);
  const leader = ordered[0];
  const laggard = ordered[ordered.length - 1];
  const roseEverywhere = panels.every((p) => at(p, LAST_YEAR) > at(p, FIRST_YEAR));
  // Who rose FURTHEST is a separate question from who is highest today, and the alt text makes
  // that claim — so it is computed, not inherited from the panel order.
  const gain = (p) => at(p, LAST_YEAR) - at(p, FIRST_YEAR);
  const biggestGain = [...panels].sort((a, b) => gain(b) - gain(a))[0];
  console.log(
    `largest gain in percentage points: ${biggestGain.country} ` +
      `+${gain(biggestGain).toFixed(2)} pp (${panels.map((p) => `${p.country} +${gain(p).toFixed(1)}`).join(", ")})`,
  );
  console.log(
    `${FIRST_YEAR}: highest share was ${leaderName(panels, FIRST_YEAR)} at ${startMax.toFixed(2)}%; ` +
      `${startZero.length} at exactly zero (${startZero.map((p) => p.country).join(", ") || "none"})`,
  );
  console.log(
    `${LAST_YEAR}: ${overTenth.length} above 10% (${overTenth.map((p) => p.country).join(", ")}); ` +
      `leader ${leader.country} ${at(leader, LAST_YEAR).toFixed(2)}%; ` +
      `lowest ${laggard.country} ${at(laggard, LAST_YEAR).toFixed(2)}%`,
  );
  console.log(`rose in every panel: ${roseEverywhere}`);
  if (!roseEverywhere) throw new Error("the headline says solar rose in all six — the data no longer says so");

  const spelled = ["zero", "one", "two", "three", "four", "five", "six"];
  const title =
    `Solar supplied under ${Math.ceil(startMax)}% of electricity in every one of the EU's six ` +
    `largest countries in ${FIRST_YEAR}. By ${LAST_YEAR} it supplied more than a tenth in ` +
    `${spelled[overTenth.length]} of them`;
  const subtitle =
    `Solar's share of each country's own electricity generation, %. Every panel is drawn on the ` +
    `same scale, so a flat panel is a flat trend — ${laggard.country} really is at ` +
    `${formatShare(at(laggard, LAST_YEAR))} while ${leader.country} is at ` +
    `${formatShare(at(leader, LAST_YEAR))}.`;
  const alt =
    `Six small line charts, one per country, all on the same scale, showing solar's share of ` +
    `electricity generation from ${FIRST_YEAR} to ${LAST_YEAR}. Every line rises. ` +
    `${biggestGain.country} rises furthest, from ${formatShare(at(biggestGain, FIRST_YEAR))} to ` +
    `${formatShare(at(biggestGain, LAST_YEAR))}, a gain of ${gain(biggestGain).toFixed(1)} ` +
    `percentage points. ` +
    `${overTenth.map((p) => p.country).join(", ")} all end above 10%. ` +
    `${laggard.country}'s line is close to flat by comparison, ending at ` +
    `${formatShare(at(laggard, LAST_YEAR))}, and ` +
    `${startZero.map((p) => p.country).join(" and ")} started the period at zero.`;
  console.log(`title:    ${title}`);
  console.log(`subtitle: ${subtitle}`);
  console.log(`alt:      ${alt}`);

  const { ground, accent, origin, source: paletteSource } = readPalette(HERE, {
    stopAt: join(HERE, "..", ".."),
  });
  console.log(`palette from ${paletteSource} — ground ${ground}, accent ${accent}, chosen by ${origin}`);
  // THE JOURNALIST'S DECISION, READ RATHER THAN RETYPED. Gate 2c pins a size; this beat records it
  // in its own `BRIEF.md` front matter; `readPinnedSize` throws naming every path it looked at if
  // it is missing. Before this the size was two literals below and `renderStill` compared them
  // against each other, so they agreed by construction and the delivered PNG was a size nobody
  // chose.
  const pinned = await readPinnedSize(HERE, { readFile, dirname, join });
  // `--size <name>` renders one of the OTHER two into `sizes/`, so all three can be opened and
  // compared. It is deliberately not a way to change what this beat DELIVERS.
  const flag = process.argv.indexOf("--size");
  const size = flag === -1 ? pinned : process.argv[flag + 1];
  const outDir = flag === -1 ? HERE : join(HERE, "sizes");
  const name = flag === -1 ? "static-small-multiples-solar-eu-six-still" : `static-small-multiples-solar-eu-six-${size}`;
  if (flag !== -1)
    console.log(`LOOKING at ${size}; the pinned size stays ${pinned} -> ${outDir}`);
  // …and whether this TYPE may enter that size at all.
  const form = assertTypeMayEnter(TYPE, size, { what: "static-small-multiples-solar-eu-six" });
  console.log(`pinned size: ${size} — ${form.verdict}: ${form.reason}`);
  const rungs = rungsFor(size);
  console.log(
    rungs.length
      ? `removal ladder at ${size}: ${rungs.join("; ")}`
      : `removal ladder at ${size}: no rung fires`,
  );

  const { width, height } = sizeFor(size);
  const { pngPath, svgPath } = await renderStill({
    element: createElement(SolarSmallMultiples, {
      panels: ordered,
      title,
      subtitle,
      source:
        "Source: Ember, via Our World in Data · annual data to 2024, extracted 9 August 2026",
      alt,
      ground,
      accent,
      size,
    }),
    width,
    height,
    // 1:1 — the frame IS the export size, so the PNG on disk measures what gate 2c pinned.
    scale: 1,
    outDir,
    name,
  });
  // THE DELIVERED FILE, MEASURED FROM ITS OWN BYTES. Not the element, not the arguments — the PNG
  // on disk. It is the one reading the code that wrote it cannot make agree with itself.
  assertDeliveredSize(readPngSize(await readFile(pngPath)), size, {
    what: `${pngPath}`,
  });
  const svg = await readFile(svgPath, "utf8");
  console.log(`ladder in the artifact: ${/data-ladder="([^"]*)"/.exec(svg)?.[1] ?? "(absent)"}`);
  assertTypeFloor(svg, size, { what: "static-small-multiples-solar-eu-six" });
  assertWithinStage(svg, size, { what: "static-small-multiples-solar-eu-six" });
  console.log(`rendered -> ${pngPath} at ${width}x${height}, verified from the file — now open it and look at it.`);
}

function leaderName(panels, year) {
  return panels.reduce((a, b) =>
    b.readings.find((r) => r.year === year).value > a.readings.find((r) => r.year === year).value ? b : a,
  ).country;
}

main();
