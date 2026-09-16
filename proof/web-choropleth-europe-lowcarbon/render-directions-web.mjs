// twin/proof/web-choropleth-europe-lowcarbon/render-directions-web.mjs
//
// Europe's low-carbon electricity share by country, rendered once per FILED DIRECTION into a
// self-contained interactive page.
//
// THE CLASSES ARE A CHOICE, AND THE READER IS HANDED IT. Four standard rules cut the same forty
// readings into four classes: the threshold the headline states, quantiles, equal intervals, and
// Fisher-Jenks natural breaks. Every bound, every class population, every sentence below is DERIVED
// from the frozen file here and baked into the page — the browser never computes a break and never
// formats a number. A country the file has no reading for is drawn as MISSING, never dropped into
// the lowest class and never handed to a rule as a number it is not.
//
// Usage:  bun proof/web-choropleth-europe-lowcarbon/render-directions-web.mjs

import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { createHash } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import puppeteer from "puppeteer";
import { fileURLToPath } from "node:url";
import { mix, readPalette } from "#shared/chart-beat/colour.mjs";
import { deriveFurniture } from "#shared/chart-beat/render-still.mjs";
import { beatFacts, applicableTreatments } from "#shared/chart-beat/treatments.mjs";
import { readDirection } from "#shared/design-base/read-direction.mjs";
import { composeDirections, guardColour, report } from "#shared/design-base/compose.mjs";
import { resolveDirectionFamilies } from "#shared/design-base/resolve-families.mjs";
import { plainSpaces } from "#shared/design-base/web.mjs";
import { plateGrounds, plateTints } from "#shared/map-beat/tints.mjs";
import { plateWasPaintedWith } from "#shared/map-beat/plate-cache.mjs";
import { frameProjector, markOccupancy, occupancyLine } from "#shared/map-beat/occupancy.mjs";
import { plateWaterField } from "../../scripts/map-beat/plate-water.mjs";
import { MAP_DRAWING_SHARE, renderWeb } from "../../skills/chart-web/scripts/render-web.mjs";
import {
  assertOneClassing,
  buildClassingIndex,
  classOf,
  classingCounts,
} from "../../skills/map-web/assets/classing.ts";
import {
  assertClassingReachesTheLayers,
  liveChoroplethPlan,
  liveChoroplethScript,
} from "../../skills/map-web/assets/live-choropleth.ts";
import { CHANGE_MS, DirectedChoroplethWeb, choroplethRamp } from "./DirectedChoroplethWeb.tsx";
import { WINDOW, CAMERA_ASPECT as MEASURE_ASPECT } from "./camera.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const DIRECTIONS = join(HERE, "..", "..", "docs", "design-base", "directions");
const OUT = join(HERE, "renders");
const EYEBROW = "Énergie · Europe";
const YEAR = 2024;
const SIZE = 900;
/** How many classes every rule cuts. FOUR and not five, and the measurement that settles it lives in
 *  the component, where the ramp is built against the land the plate is actually baked in. */
const CLASSES = 4;
/** The rule the plate itself is drawn in: the threshold the headline states, plus two round lines
 *  under it so the map is not a two-colour threshold map. */
const STATED = [50, 70, 94];
const LOW = ["other_renewables_generation__twh", "bioenergy_stacked_generation__twh", "solar_generation__twh", "wind_generation__twh", "hydro_generation__twh", "nuclear_generation__twh"];
const FOSSIL = ["gas_generation__twh", "oil_generation__twh", "coal_generation__twh"];
const NAMES = {
  ALB: "Albanie", AUT: "Autriche", BLR: "Biélorussie", BEL: "Belgique", BIH: "Bosnie-Herz.",
  BGR: "Bulgarie", HRV: "Croatie", CYP: "Chypre", CZE: "Tchéquie", DNK: "Danemark",
  EST: "Estonie", FIN: "Finlande", FRA: "France", DEU: "Allemagne", GRC: "Grèce",
  HUN: "Hongrie", ISL: "Islande", IRL: "Irlande", ITA: "Italie", LVA: "Lettonie",
  LTU: "Lituanie", LUX: "Luxembourg", MLT: "Malte", MDA: "Moldavie", MNE: "Monténégro",
  NLD: "Pays-Bas", MKD: "Macédoine du N.", NOR: "Norvège", POL: "Pologne", PRT: "Portugal",
  ROU: "Roumanie", RUS: "Russie", SRB: "Serbie", SVK: "Slovaquie", SVN: "Slovénie",
  ESP: "Espagne", SWE: "Suède", CHE: "Suisse", TUR: "Turquie", UKR: "Ukraine", GBR: "Royaume-Uni",
};

/** THE JOIN, WRITTEN DOWN — and it is the trap `types/choropleth.md` names by hand.
 *
 *  This beat's data and its frozen shapes are keyed on ISO A3. MapTiler's Countries tileset, which
 *  the live map paints from, is keyed on `iso_a2`. A code that does not match paints NOTHING, and a
 *  country that is painted nothing looks exactly like a country outside the study — a legitimate
 *  class already in the legend, in a tint a reader accepts without thinking about it.
 *
 *  So the table is here rather than inferred, it is checked against `NAMES` below (every A3 has an
 *  A2, every A2 is distinct), and `liveChoroplethPlan` refuses anything that is not two capitals.
 *  The last mile — that MapTiler actually carries a level-0 polygon for each of them at this camera
 *  — cannot be checked without the network and is measured in the live drive instead. */
const ISO2 = {
  ALB: "AL", AUT: "AT", BLR: "BY", BEL: "BE", BIH: "BA", BGR: "BG", HRV: "HR", CYP: "CY",
  CZE: "CZ", DNK: "DK", EST: "EE", FIN: "FI", FRA: "FR", DEU: "DE", GRC: "GR", HUN: "HU",
  ISL: "IS", IRL: "IE", ITA: "IT", LVA: "LV", LTU: "LT", LUX: "LU", MLT: "MT", MDA: "MD",
  MNE: "ME", NLD: "NL", MKD: "MK", NOR: "NO", POL: "PL", PRT: "PT", ROU: "RO", RUS: "RU",
  SRB: "RS", SVK: "SK", SVN: "SI", ESP: "ES", SWE: "SE", CHE: "CH", TUR: "TR", UKR: "UA",
  GBR: "GB",
};
for (const code of Object.keys(NAMES))
  if (!/^[A-Z]{2}$/.test(ISO2[code] ?? ""))
    throw new Error(`${code} (${NAMES[code]}) has no ISO A2 code, so the live map would paint it nothing and a reader would read it as a country outside the study`);
if (new Set(Object.values(ISO2)).size !== Object.keys(NAMES).length)
  throw new Error("two countries share one ISO A2 code: one of them would take the other's colour, silently");
const A3_OF = Object.fromEntries(Object.entries(ISO2).map(([a3, a2]) => [a2, a3]));
/** THE COUNTRIES MAPTILER'S TILES DO NOT CARRY AT EVERY ZOOM THIS PAGE OPENS AT. Measured at
 *  375x812, where the camera fits this study set at zoom 1,40: at that tile zoom the Countries
 *  tileset has NO feature for Malta at all — not its level-0 polygon and not its level-1 councils —
 *  and a reporting country left the map with nothing red anywhere. It is drawn from this beat's own
 *  frozen `shapes.geojson` instead, at every zoom. */
const OWN_SHAPES = ["MLT"];

const plain = (s) => plainSpaces(s);
const fr = (v, d = 1) =>
  plain(v.toLocaleString("fr-FR", { minimumFractionDigits: d, maximumFractionDigits: d }));

// ── the readings ──────────────────────────────────────────────────────────────────────────────
const csv = (await readFile(join(HERE, "data.csv"), "utf8")).trim().split(/\r?\n/);
const header = csv[0].split(",");
const at = (n) => {
  const i = header.indexOf(n);
  if (i < 0) throw new Error(`the frozen file has no ${n} column`);
  return i;
};
const raw = csv.slice(1).map((line) => {
  const c = line.split(",");
  const o = { code: c[at("code")], year: Number(c[at("year")]) };
  for (const k of [...LOW, ...FOSSIL]) o[k] = Number(c[at(k)]);
  return o;
});
const readingsByCode = new Map();
for (const r of raw.filter((z) => z.year === YEAR)) {
  const low = LOW.reduce((s, k) => s + r[k], 0);
  const total = low + FOSSIL.reduce((s, k) => s + r[k], 0);
  if (total > 0) readingsByCode.set(r.code, { share: (low / total) * 100, low, total });
}
const ranked = [...readingsByCode.entries()].sort((a, b) => b[1].share - a[1].share);

// ── THE FOUR RULES, ALL DERIVED FROM THE FROZEN FILE ───────────────────────────────────────────
//
// Nothing below is typed. A break a person types is a break a person can mistype, and the whole
// point of this page is that the reader gets to see what each RULE produces rather than what an
// author settled on.
const values = ranked.map(([, r]) => r.share).sort((a, b) => a - b);
const N = values.length;

/** Quantiles: `CLASSES` bands of equal COUNT. The cut sits halfway between the two readings it
 *  separates, so no country falls exactly on a break by construction. */
const quantileBreaks = Array.from({ length: CLASSES - 1 }, (_, i) => {
  const pos = Math.floor(((i + 1) * N) / CLASSES);
  return (values[pos - 1] + values[pos]) / 2;
});

/** Equal intervals: `CLASSES` bands of equal WIDTH over the observed range. */
const RANGE_MIN = values[0];
const RANGE_MAX = values[N - 1];
const STEP = (RANGE_MAX - RANGE_MIN) / CLASSES;
const equalBreaks = Array.from({ length: CLASSES - 1 }, (_, i) => RANGE_MIN + (i + 1) * STEP);

/**
 * Fisher-Jenks natural breaks: the partition that minimises the sum of within-class variance, by
 * the dynamic programme Jenks published. The classic O(n²k) formulation, which is nothing at all on
 * forty readings, and the one place in this file where an implementation could be wrong without
 * looking wrong — so the result is asserted against the property that defines it, below.
 */
function jenksBreaks(sorted, k) {
  const n = sorted.length;
  const at = Array.from({ length: n + 1 }, () => new Array(k + 1).fill(0));
  const cost = Array.from({ length: n + 1 }, () => new Array(k + 1).fill(Infinity));
  for (let j = 1; j <= k; j += 1) {
    at[1][j] = 1;
    cost[1][j] = 0;
  }
  for (let l = 2; l <= n; l += 1) {
    let sum = 0;
    let sumSq = 0;
    let count = 0;
    let variance = 0;
    for (let m = 1; m <= l; m += 1) {
      const start = l - m + 1;
      const value = sorted[start - 1];
      sumSq += value * value;
      sum += value;
      count += 1;
      variance = sumSq - (sum * sum) / count;
      if (start - 1 !== 0)
        for (let j = 2; j <= k; j += 1)
          if (cost[l][j] >= variance + cost[start - 1][j - 1]) {
            at[l][j] = start;
            cost[l][j] = variance + cost[start - 1][j - 1];
          }
    }
    at[l][1] = 1;
    cost[l][1] = variance;
  }
  const breaks = [];
  let end = n;
  for (let j = k; j >= 2; j -= 1) {
    breaks.unshift(sorted[at[end][j] - 1]);
    end = at[end][j] - 1;
  }
  return breaks;
}
const jenksCuts = jenksBreaks(values, CLASSES);

/** The property that DEFINES natural breaks, asserted rather than trusted: no other placement of
 *  the same number of cuts on the same data has a lower within-class sum of squares. Checked against
 *  the three rules this page also ships, which is a cheap and real comparison — a transcription
 *  error in the dynamic programme above would almost certainly lose to one of them. */
const withinSS = (breaks) => {
  const groups = Array.from({ length: CLASSES }, () => []);
  for (const v of values) groups[classOf(v, breaks)].push(v);
  return groups.reduce((total, g) => {
    if (!g.length) return total;
    const mean = g.reduce((s, v) => s + v, 0) / g.length;
    return total + g.reduce((s, v) => s + (v - mean) ** 2, 0);
  }, 0);
};
for (const [name, breaks] of [["le seuil énoncé", STATED], ["les quantiles", quantileBreaks], ["les intervalles égaux", equalBreaks]])
  if (withinSS(jenksCuts) > withinSS(breaks) + 1e-9)
    throw new Error(
      `Fisher-Jenks scored ${withinSS(jenksCuts).toFixed(2)} of within-class variance where ` +
        `${name} scores ${withinSS(breaks).toFixed(2)} — natural breaks are DEFINED as the minimum, ` +
        `so a rule that loses to another is a transcription error in the dynamic programme, not a ` +
        `property of the data`,
    );

const pc = (v) => `${fr(v)} %`;
/** What the legend prints for each class under one rule: the bounds in per cent, and how many of the
 *  forty countries the rule puts there. Both derived, never typed. */
const boundsFor = (breaks, counts) =>
  Array.from({ length: CLASSES }, (_, i) => {
    const span =
      i === 0
        ? `moins de ${pc(breaks[0])}`
        : i === CLASSES - 1
          ? `${pc(breaks[CLASSES - 2])} et plus`
          : `${pc(breaks[i - 1])} – ${pc(breaks[i])}`;
    return `${span} · ${counts[i]} pays`;
  });

const statedClass = new Map(ranked.map(([code, r]) => [code, classOf(r.share, STATED)]));
const movedAgainstPlate = (breaks) =>
  ranked.filter(([code, r]) => classOf(r.share, breaks) !== statedClass.get(code));
const inTop = (breaks) => ranked.filter(([, r]) => classOf(r.share, breaks) === CLASSES - 1);
const namesOf = (rows) => rows.map(([code]) => NAMES[code]);

const topStated = inTop(STATED);
const topQuantile = inTop(quantileBreaks);
const topEqual = inTop(equalBreaks);
const topJenks = inTop(jenksCuts);
const newcomers = topQuantile.filter(([code]) => !topStated.some(([c]) => c === code));

const RULES = [
  {
    key: "seuil",
    label: "Seuil énoncé",
    announce: `Seuil énoncé — les paliers de la planche, coupés à ${STATED.join(", ")} %`,
    breaks: STATED,
    note: null,
  },
  {
    key: "quantiles",
    label: "Quantiles",
    announce: `Quantiles — quatre paliers du même nombre de pays`,
    breaks: quantileBreaks,
    note:
      `Quantiles — ${CLASSES} paliers de ${N / CLASSES} pays. La plus foncée s'ouvre à ` +
      `${pc(quantileBreaks[CLASSES - 2])} : ${namesOf(newcomers).join(", ")} y entrent — ` +
      `${topQuantile.length} pays au lieu de ${topStated.length}, et ` +
      `${movedAgainstPlate(quantileBreaks).length} des ${N} changent de palier.`,
  },
  {
    key: "egaux",
    label: "Intervalles égaux",
    announce: `Intervalles égaux — quatre tranches de la même largeur`,
    breaks: equalBreaks,
    note:
      `Intervalles égaux — ${CLASSES} tranches de ${fr(STEP)} points. La plus foncée s'ouvre à ` +
      `${pc(equalBreaks[CLASSES - 2])} et compte ${topEqual.length} pays, la plus claire ` +
      `${classingCountsFor(equalBreaks)[0]} — ${movedAgainstPlate(equalBreaks).length} des ${N} ` +
      `changent de palier.`,
  },
  {
    key: "jenks",
    label: "Ruptures naturelles",
    announce: `Ruptures naturelles — les coupures de Fisher-Jenks, là où le fichier est creux`,
    breaks: jenksCuts,
    note:
      `Ruptures naturelles (Fisher-Jenks) — coupures à ${jenksCuts.map((b) => fr(b)).join(", ")} %, ` +
      `là où le fichier est creux. La plus foncée compte ${topJenks.length} pays — ` +
      `${movedAgainstPlate(jenksCuts).length} des ${N} changent de palier.`,
  },
];

function classingCountsFor(breaks) {
  const counts = new Array(CLASSES).fill(0);
  for (const [, r] of ranked) counts[classOf(r.share, breaks)] += 1;
  return counts;
}

/** KEYED ON ISO A2, not on the A3 this beat's file is frozen in — because the key has to be the one
 *  BOTH halves of the page speak: the table's `data-mark`, and MapTiler's `iso_a2`. A vocabulary
 *  that spoke A3 on one side and A2 on the other would be the join failure wearing the costume of a
 *  guard that passes. */
const classingReadings = ranked.map(([code, r]) => ({ key: ISO2[code], value: r.share }));
const classing = {
  label: "Règle de classement",
  classes: CLASSES,
  defaultKey: "seuil",
  rules: RULES.map((rule) => ({ ...rule, bounds: boundsFor(rule.breaks, classingCountsFor(rule.breaks)) })),
};
const COUNTS = classingCounts(classing, classingReadings);
/** The one derivation of "which class is this reading in, under each rule". `assertOneClassing`
 *  reads the WRITTEN page back against it, which is the only place three of this vocabulary's
 *  refusals can be made at all: a shape that does not carry the vocabulary, a stylesheet that
 *  answers no option, and a pointer rule beaten by the classing rule that follows it are each
 *  invisible to the markup and to a unit test alike. */
const CLASSING_INDEX = buildClassingIndex(classing, classingReadings);

// ── THE CAMERA IS THE PLATE'S, AND THE PLATE IS THE SHAPE THE PAGE DELIVERS ───────────────────
//
// The equal-area camera in `camera.ts` is still this beat's own, and this file still prints it: it
// is what MEASURES. It no longer PLACES anything. What places every mark is MapTiler — the live map
// reprojects the Countries tiles itself, and the baked plate under it is the same window fitted the
// same way, so the plate and the live map are one camera rather than two pictures that agree.
//
// THE FIGURE FILLS THE WIDTH, AND THE PAGE SCROLLS — the third term of the trio, measured.
//
// *"la map doit prendre toute la largeur quitte à afficher plus de map."* A live map has no viewBox,
// so it takes whatever box the layout hands it. What the layout hands it is the question, and it has
// exactly one free number: the plot's HEIGHT. Width is the figure's, by the ruling. So the box's
// ratio IS `trackWidth / trackHeight`, and a subject that is near-square once projected occupies
// `1/ratio` of the width no matter which camera draws it.
//
// MEASURED, on this beat, at 1512x860. Holding the document inside the window leaves the plot about
// 550 px of height under 1464 px of width — a 2,7:1 box — and fitting this study set into a 2,7:1 box
// shows about 179° of longitude for a study 65° wide. It was baked and looked at: Europe sits in the
// middle third with Greenland, Canada and Siberia around it. That is not "plus de map", it is a world
// map with the subject in it, and it is WORSE than the defect being repaired.
//
// So the height is kept and the page scrolls. At 1464 px of width and the beat's own 1600/1216 plate,
// the map is drawn 1464 x 1112 and the document runs past the window — the same arrangement the
// proportional-symbol beat already ships (document 1513 px at 1512x860), and the third choice of the
// trio `FULL-WIDTH-BRIEF.md` records the owner taking: stretch the drawing (refused, it is a false
// geography), shrink it with empty gutters (refused, this is that refusal), or let it run past the
// fold and scroll (chosen). Europe is drawn 1112 px wide here against 760 px on the page the owner
// refused: the width is filled AND the subject got bigger, which is the whole point.
//
// THE COST OF MERCATOR, MEASURED. Web Mercator inflates the north. On this beat's own frozen shapes
// at this camera, with Russia set aside (81 % of the drawn land, and only partly in frame): Norway,
// Sweden and Finland cover 31,5 % of the land drawn and hold 16,5 % of the land that is there; per
// km² against France = 1, Norway ×2,57, Finland ×2,58, Iceland ×2,64, Sweden ×2,29. The headline is a
// COUNT of countries and a count survives that untouched — the picture does not, so the caveat says
// it in the reader's own words rather than leaving the reader to read ink as area.
//
// ONE PLATE PER FILED DIRECTION, baked in that direction's own tints. The three share a camera by
// construction, and that is asserted below rather than assumed: three plates that disagreed about
// where 10°E is would put the same country in three places and nothing here would notice.
/** The plate's own pixel box — the beat's composition, and about 1,1x the width the page draws it
 *  at, so the fallback is not soft where a reader with no key is looking at nothing else. */
// ── THE READINGS ──────────────────────────────────────────────────────────────────────────────
//
// THIS FILE NO LONGER PROJECTS A COASTLINE. Every mark inside the map is a MapLibre layer over
// MapTiler's own Countries tiles, joined by `iso_a2`, so the geometry the page used to carry as 41
// SVG paths is now the provider's — generalised per zoom, which is what makes the reader's zoom
// worth having. `shapes.geojson` is still read, for one thing only: the study set's own box, which
// is what the camera is asked to hold and what `assertCameraReachesBounds` refuses a plate for
// cropping.
const geo = JSON.parse(await readFile(join(HERE, "shapes.geojson"), "utf8"));
const studySet = new Map();
for (const f of geo.features) {
  const code = f.properties.iso ?? f.properties.code ?? f.properties.ISO_A3 ?? f.properties.iso_a3;
  if (!code || !NAMES[code]) continue;
  const polys = f.geometry.type === "Polygon" ? [f.geometry.coordinates] : f.geometry.coordinates;
  // THE COUNTRY'S OWN LARGEST PART, which is a measurement rather than a list of exceptions: France
  // reaches Réunion, the Netherlands Curaçao, Norway Svalbard, Portugal the Azores. A box fitted to
  // all of them draws the Atlantic with Europe as a stamp.
  let best = null;
  for (const poly of polys) {
    const ring = poly[0];
    const xs = ring.map((p) => p[0]);
    const ys = ring.map((p) => p[1]);
    const box = { west: Math.min(...xs), east: Math.max(...xs), south: Math.min(...ys), north: Math.max(...ys) };
    const span = (box.east - box.west) * (box.north - box.south);
    if (!best || span > best.span) best = { ...box, span };
  }
  if (best) studySet.set(code, best);
}
/** The box the CAMERA is asked to hold: every country's own largest part except the one the frame
 *  never held whole (see `CONTINENTAL` below — Russia's largest part reaches 180°E, and a box fitted
 *  to it would be a world map). This is the number the frame is measured against. */
const held = (code) => !CONTINENTAL.includes(code);
const CONTINENTAL = ["RUS"];
const heldBoxes = [...studySet].filter(([code]) => held(code)).map(([, b]) => b);
const STUDY = {
  west: Math.min(...heldBoxes.map((b) => b.west)),
  east: Math.max(...heldBoxes.map((b) => b.east)),
  south: Math.min(...heldBoxes.map((b) => b.south)),
  north: Math.max(...heldBoxes.map((b) => b.north)),
};
/** THE ONE COUNTRY THIS FRAME DOES NOT HOLD WHOLE is declared above, rather than discovered here.
 *  Every OTHER country the map counts must be inside the frame, and this is the refusal that says
 *  so — the counterpart to the bake's own `assertCameraReachesBounds`, which compares the frame
 *  against the TYPED box and therefore passes a box too small for the study by construction. */

const PLATE_FRAME = [1600, 1216];
const PLATE_SIZE = PLATE_FRAME.join("x");
const plateDir = (id) => join(HERE, "plate", id);
function ensurePlate(id, water, land) {
  const dir = plateDir(id);
  // THE CACHE IS KEYED ON THE FRAME, because a cached plate is the one way a camera change ships
  // without being drawn: measured while mutating the bake's own declared window — the runner stayed
  // green because nothing re-baked, and the page kept the camera of a file that no longer said so.
  if (existsSync(join(dir, "geometry.json")) && existsSync(join(dir, "plate.png"))) {
    const cached = JSON.parse(readFileSync(join(dir, "geometry.json"), "utf8"));
    const b = cached.bounds ?? [[0, 0], [0, 0]];
    const holds =
      b[0][0] <= STUDY.west && b[1][0] >= STUDY.east && b[0][1] <= STUDY.south && b[1][1] >= STUDY.north;
    if (plateWasPaintedWith(dir, { water, land }) &&
      cached.frame?.width === PLATE_FRAME[0] && cached.frame?.height === PLATE_FRAME[1] && holds) return;
    console.log(
      `the ${id} plate was baked at ${cached.frame?.width}x${cached.frame?.height} on ` +
        `${JSON.stringify(cached.bounds)} in ${cached.water} / ${cached.land}; this run asks for ` +
        `${PLATE_FRAME.join("x")} holding the study set, in ${water} / ${land} — re-baking…`,
    );
  }
  console.log(`baking the ${id} plate (MapTiler, ${PLATE_SIZE}, water ${water}, land ${land})…`);
  const result = spawnSync(
    "bun",
    [join(HERE, "bake.mjs"), "--size", PLATE_SIZE, "--countries", join(HERE, "shapes.geojson"),
     "--water", water, "--land", land, "--out", dir],
    { cwd: HERE, stdio: "inherit" },
  );
  if (result.status !== 0) throw new Error(`bake.mjs exited with ${result.status} for ${id}`);
}

/** The two tints a basemap is allowed on a directed plate, both derived from the direction and
 *  neither invented: `water-is-a-tint-not-a-grey` says the sea takes a little of the accent, and the
 *  land takes a step off the ground toward the ink. Nothing else on the basemap carries colour. */
// THE PAIR COMES FROM THE TRUNK, AND THE WATER IS NOT THIS BEAT'S TO CHOOSE. What stood here was
// `water: mix(d.ground, d.accent, 0.16)` — the sea tinted with the very accent this beat's marks are
// drawn in, so the ground followed the mark and no accent could be picked out of it. Only the LAND's
// weight is measured per beat; the water is the filed convention, once, in `shared/map-beat/tints.mjs`.
const LAND_DOSE = 0.07;

const DIRECTION_FILES = readdirSync(DIRECTIONS).filter((f) => f.endsWith(".md")).sort();
for (const file of DIRECTION_FILES) {
  const id = file.replace(/\.md$/, "");
  const t = plateTints(readDirection(join(DIRECTIONS, file)), { landDose: LAND_DOSE });
  ensurePlate(id, t.water, t.land);
}
const factsOf = async (id) => JSON.parse(await readFile(join(plateDir(id), "geometry.json"), "utf8"));
const plateFacts = await factsOf(DIRECTION_FILES[0].replace(/\.md$/, ""));
for (const file of DIRECTION_FILES.slice(1)) {
  const id = file.replace(/\.md$/, "");
  const other = await factsOf(id);
  if (
    other.frame.width !== plateFacts.frame.width ||
    other.frame.height !== plateFacts.frame.height ||
    JSON.stringify(other.frameCorners) !== JSON.stringify(plateFacts.frameCorners)
  )
    throw new Error(
      `the ${id} plate was baked on a different camera than ${DIRECTION_FILES[0]}: three plates that ` +
        `disagree about where a degree is would put the same country in three places, and nothing ` +
        `else here would notice`,
    );
}
const FRAME = plateFacts.frame;
const CORNERS = plateFacts.frameCorners;
if (!CORNERS || !(FRAME?.width > 0))
  throw new Error("this plate predates the camera facts: re-bake it with bake.mjs");
const CAMERA_ASPECT = FRAME.width / FRAME.height;
const width = SIZE;
const height = Math.round((SIZE * FRAME.height) / FRAME.width);

/** WHICH OF THE BASEMAP'S GROUNDS THIS BEAT'S MARKS OCCUPY, MEASURED ON THE PLATE IT BAKED.
 *
 *  This beat's marks are the COUNTRIES THEMSELVES — MapLibre fills over MapTiler's own Countries
 *  tiles, joined by `iso_a2` — so the footprint measured here is those countries' own polygons, the
 *  same ones `shapes.geojson` carries and the same coastline the plate was painted along. A fill
 *  that IS a country cannot be seated in the sea: the largest disc that fits inside it is hundreds
 *  of pixels across and the water under it is a coastline, not a ground. Measured rather than
 *  asserted, because the next choropleth may colour shipping lanes.
 */
const toFrame = frameProjector(plateFacts);
const waterField = plateWaterField(plateDir(DIRECTION_FILES[0].replace(/\.md$/, "")));
const OCCUPANCY = markOccupancy(
  geo.features
    .filter((f) => NAMES[f.properties.iso ?? f.properties.code])
    .map((f) => ({
      kind: "area",
      name: f.properties.iso,
      rings: (f.geometry.type === "Polygon" ? [f.geometry.coordinates] : f.geometry.coordinates)
        .flatMap((poly) => poly)
        .map((ring) => ring.map(toFrame)),
    })),
  waterField,
);
console.log(occupancyLine(OCCUPANCY));

/** THE WINDOW THE CAMERA WAS ASKED TO HOLD, which is what this is measured against — never the frame
 *  it ended up with. `fitBounds` widens the frame on whichever axis does not bind, so a declared
 *  window too SMALL for the study set is forgiven by its own overshoot: at this beat's 1,32:1 frame
 *  the longitude overshoots by 22° and would hide a north edge typed 3° short. */
const ASKED = {
  west: plateFacts.bounds[0][0],
  south: plateFacts.bounds[0][1],
  east: plateFacts.bounds[1][0],
  north: plateFacts.bounds[1][1],
};
const outside = [...studySet].filter(
  ([code, b]) =>
    !CONTINENTAL.includes(code) &&
    (b.west < ASKED.west || b.east > ASKED.east || b.south < ASKED.south || b.north > ASKED.north),
);
if (outside.length)
  throw new Error(
    `the camera's declared window cuts ${outside.length} of the ${studySet.size} countries this map ` +
      `counts: ` +
      `${outside.map(([c]) => `${NAMES[c]} (${JSON.stringify(studySet.get(c))})`).join(", ")}, ` +
      `against a declared window of ${JSON.stringify(ASKED)}. A ` +
      `choropleth's subject is not a cloud of points that can be too small inside its frame, it is a ` +
      `set of shapes a frame can slice — and a sliced country under a title that counts countries is ` +
      `a picture disagreeing with its own sentence.`,
  );

// ── WHAT WEB MERCATOR COSTS THIS SUBJECT, MEASURED HERE RATHER THAN ASSERTED ──────────────────
//
// A choropleth is read by AREA and a flat MapLibre map is Web Mercator, which inflates the north.
// The owner has chosen the flat map knowing the trade (2026-09-15: « oui une carte MapLibre plate
// pas un globe »), so this is a COST the page carries, not a defect to fix — and a cost a page
// carries is a cost it states. The number goes into the caveat, so it is derived here and never
// typed: the drawn area is the shoelace of each ring at the plate's own Mercator camera, the true
// area is the same ring on the sphere.
//
// RUSSIA IS SET ASIDE, and that is a measurement too: it is 81 % of the land this frame draws and
// only a slice of it is inside the frame at all, so every share computed with it in is a share of
// Russia. The argument is about the other forty.
const RAD = Math.PI / 180;
const mercY = (lat) => Math.log(Math.tan(Math.PI / 4 + (lat * RAD) / 2));
const toFramePx = ([lon, lat]) => [
  ((lon - CORNERS.west) / (CORNERS.east - CORNERS.west)) * FRAME.width,
  ((mercY(lat) - mercY(CORNERS.north)) / (mercY(CORNERS.south) - mercY(CORNERS.north))) * FRAME.height,
];
const shoelace = (ring) => {
  let sum = 0;
  for (let i = 0; i < ring.length; i += 1) {
    const [x1, y1] = ring[i];
    const [x2, y2] = ring[(i + 1) % ring.length];
    sum += x1 * y2 - x2 * y1;
  }
  return Math.abs(sum) / 2;
};
const EARTH_KM = 6371.0088;
const sphericalArea = (ring) => {
  let sum = 0;
  for (let i = 0; i < ring.length; i += 1) {
    const [l1, p1] = ring[i];
    const [l2, p2] = ring[(i + 1) % ring.length];
    sum += (l2 - l1) * RAD * (2 + Math.sin(p1 * RAD) + Math.sin(p2 * RAD));
  }
  return Math.abs((sum * EARTH_KM * EARTH_KM) / 2);
};
const inFrame = ([lon, lat]) =>
  lon >= CORNERS.west && lon <= CORNERS.east && lat >= CORNERS.south && lat <= CORNERS.north;
const areas = new Map();
for (const f of geo.features) {
  const code = f.properties.iso;
  if (!NAMES[code] || code === "RUS") continue;
  const polys = f.geometry.type === "Polygon" ? [f.geometry.coordinates] : f.geometry.coordinates;
  let page = 0;
  let real = 0;
  for (const poly of polys) {
    const ring = poly[0];
    if (!ring.some(inFrame)) continue;
    page += shoelace(ring.map(toFramePx));
    real += sphericalArea(ring);
  }
  if (page > 0) areas.set(code, { page, real });
}
const PAGE_TOTAL = [...areas.values()].reduce((s, a) => s + a.page, 0);
const REAL_TOTAL = [...areas.values()].reduce((s, a) => s + a.real, 0);
const NORTH = ["NOR", "SWE", "FIN"];
const NORTH_PAGE_SHARE = (NORTH.reduce((s, c) => s + areas.get(c).page, 0) / PAGE_TOTAL) * 100;
const NORTH_TRUE_SHARE = (NORTH.reduce((s, c) => s + areas.get(c).real, 0) / REAL_TOTAL) * 100;
const weightOf = (code) =>
  (areas.get(code).page / PAGE_TOTAL) / (areas.get(code).real / REAL_TOTAL);
if (!(NORTH_PAGE_SHARE > NORTH_TRUE_SHARE))
  throw new Error(
    `the caveat tells the reader Web Mercator inflates the north, and on this camera it measures ` +
      `${NORTH_PAGE_SHARE.toFixed(1)} % of the page against ${NORTH_TRUE_SHARE.toFixed(1)} % of the ` +
      `ground — the sentence would be false`,
  );

/** Those countries' own polygons, keyed the way the live map's expressions key everything else. */
const SMALL_SHAPES = {
  type: "FeatureCollection",
  features: geo.features
    .filter((f) => OWN_SHAPES.includes(f.properties.iso))
    .map((f) => ({ type: "Feature", properties: { iso_a2: ISO2[f.properties.iso] }, geometry: f.geometry })),
};
if (SMALL_SHAPES.features.length !== OWN_SHAPES.length)
  throw new Error(
    `${OWN_SHAPES.join(", ")} must be drawn from this beat's own shapes and ` +
      `${SMALL_SHAPES.features.length} of ${OWN_SHAPES.length} were found in shapes.geojson`,
  );

/** THE NARROWEST COUNTRY THE MAP COUNTS, which is what the reader's zoom CEILING is derived from:
 *  a reader may come in until this one is big enough to point at, and no closer. Measured off the
 *  frozen shapes rather than named, so a change to the study set moves the ceiling with it. */
const SMALLEST = [...studySet]
  .map(([code, b]) => ({ name: NAMES[code], spanDeg: b.east - b.west }))
  .sort((a, b) => a.spanDeg - b.spanDeg)[0];

/** WHAT A COUNTRY'S ANSWER SAYS ABOUT THE FOUR RULES AT ONCE, and it is the only reading on the page
 *  that does not depend on which rule is in force — which is exactly why it can be baked into a
 *  string. The class a country is in right now cannot be: it would be a lie under three rules out
 *  of four. */
const stabilityOf = (code) => {
  const seen = [...new Set(RULES.map((rule) => classOf(readingsByCode.get(code).share, rule.breaks)))].sort();
  if (seen.length === 1) return `même palier sous les ${RULES.length} règles`;
  const list = seen.map((k) => k + 1);
  return `palier ${list.slice(0, -1).join(", ")} ou ${list[list.length - 1]} sur ${CLASSES} selon la règle`;
};

// EVERY COUNTRY THE MAP DRAWS, in the order the table prints them: by share, the reading the page is
// about, with the country that has no reading last. The `detail` is what a POINTER answers, and it
// carries only what the table does NOT print — the TWh, the rank's own wording and the four-rule
// stability — so hovering is never the table read out loud again.
const readings = [
  ...ranked.map(([code, r], i) => ({
    code,
    iso2: ISO2[code],
    name: NAMES[code],
    classed: true,
    sharePc: pc(r.share),
    rank: `${i + 1}`,
    detail:
      `${NAMES[code]} · ${fr(r.share)} % de son électricité est bas-carbone en ${YEAR} · ` +
      `${fr(r.low, 0)} TWh bas-carbone sur ${fr(r.total, 0)} · ${i + 1}e sur ${ranked.length} · ` +
      `${stabilityOf(code)}`,
  })),
  ...Object.keys(NAMES)
    .filter((code) => !readingsByCode.has(code))
    .map((code) => ({
      code,
      iso2: ISO2[code],
      name: NAMES[code],
      classed: false,
      sharePc: "—",
      rank: "—",
      detail:
        `${NAMES[code]} · aucune production publiée pour ${YEAR} dans ce fichier — dessiné en creux, ` +
        `hors de toutes les règles de classement, jamais rangé dans le palier le plus bas`,
    })),
];
const shapes = readings;

// ── THE CLAIM, ASSERTED ───────────────────────────────────────────────────────────────────────
if (!(topStated.length >= 5 && topStated.length <= 9))
  throw new Error(`the headline names a handful above ${STATED[STATED.length - 1]} %; ${topStated.length} are`);
if (topQuantile.length <= topStated.length)
  throw new Error(
    `the whole gesture rests on the map showing MORE countries in its darkest band under an ` +
      `ordinary rule than under the stated one: quantiles put ${topQuantile.length} there against ` +
      `${topStated.length}. If that stops being true on new data, the sentences below stop being true with it.`,
  );
const drawn = shapes.filter((s) => s.classed).length;
const missing = shapes.length - drawn;
console.log(
  `${shapes.length} pays dessinés · ${drawn} avec une lecture ${YEAR}, ${missing} en creux · ` +
    `${topStated.length} au-dessus de ${STATED[STATED.length - 1]} % : ` +
    `${topStated.map(([c, r]) => `${NAMES[c]} ${fr(r.share)}`).join(", ")}\n`,
);
for (const [i, rule] of classing.rules.entries())
  console.log(
    `règle ${rule.key.padEnd(10)} bornes ${rule.breaks.map((b) => fr(b)).join(" / ").padEnd(22)} ` +
      `effectifs ${COUNTS[i].join("/")} · bande la plus foncée ${COUNTS[i][CLASSES - 1]} pays · ` +
      `${movedAgainstPlate(rule.breaks).length} pays changent de palier vs la planche`,
  );
console.log("");
console.log(
  `camera qui DESSINE : plaque MapTiler ${FRAME.width}x${FRAME.height} · ` +
    `${CORNERS.west.toFixed(2)}..${CORNERS.east.toFixed(2)}E ` +
    `${CORNERS.south.toFixed(2)}..${CORNERS.north.toFixed(2)}N · aspect ${CAMERA_ASPECT.toFixed(2)}:1 · ` +
    `zoom ${plateFacts.zoom}`,
);
console.log(
  `camera qui MESURE (inchangé) : LAEA 52N 10E, fenêtre ${WINDOW.west}..${WINDOW.east}E ` +
    `${WINDOW.south}..${WINDOW.north}N · aspect ${MEASURE_ASPECT.toFixed(2)}:1`,
);
// WHAT THE FULL WIDTH COSTS, PRINTED EVERY TIME. A near-square study fitted into a wide box is
// bound by its height, so the surplus width is bought in longitude — and the number is large enough
// that nobody should have to rediscover it by looking.
console.log(
  `ce que le cadre montre : ${(CORNERS.east - CORNERS.west).toFixed(0)}° de longitude pour un jeu ` +
    `d'étude large de ${(STUDY.east - STUDY.west).toFixed(0)}° ` +
    `(${((CORNERS.east - CORNERS.west) / (STUDY.east - STUDY.west)).toFixed(2)}×, Russie mise à ` +
    `part) · à hauteur de fenêtre (2,7:1) le même jeu d'étude en demanderait environ 179°`,
);
console.log(
  `ce que Mercator coûte (Russie mise à part) : Norvège+Suède+Finlande ` +
    `${NORTH_PAGE_SHARE.toFixed(1)} % de la terre dessinée pour ${NORTH_TRUE_SHARE.toFixed(1)} % ` +
    `de la terre réelle · par km² contre la France = 1 : ` +
    `${NORTH.map((c) => `${NAMES[c]} ×${(weightOf(c) / weightOf("FRA")).toFixed(2)}`).join(" · ")} · ` +
    `Islande ×${(weightOf("ISL") / weightOf("FRA")).toFixed(2)}\n`,
);

const facts = beatFacts(
  ranked.map(([c, r]) => ({ key: c, label: NAMES[c], value: r.share })),
  { subject: NAMES[ranked[0][0]], declaredSequence: "%" },
);
const offered = applicableTreatments(facts);
console.log(`treatments applicable: ${offered.map((t) => t.id).join(", ") || "(none)"}\n`);

// THE HEADLINE IS THE CLAIM AND THE GESTURE IN ONE LINE, AND IT IS SHORT BECAUSE A TITLE COSTS A
// LINE OF DISPLAY TYPE PER ELEVEN CHARACTERS AT 375 px. The first form of this page ran to six of
// them — 222 px of an 812 px window — and pushed the source line off screen. Both numbers are
// derived and both are true with nothing touched: seven countries clear the stated 94 %, and the
// darkest band of the same map holds thirteen under equal intervals and under Fisher-Jenks.
const title = `${topStated.length} pays au-dessus de ${STATED[STATED.length - 1]} % — ou ${topEqual.length}, selon la coupure`;
// THE CAVEAT NAMES THE COST OF THE PROJECTION IN NUMBERS, because a reader who is not told reads
// ink as area. The three shares are measured on this beat's own frozen shapes at this camera, with
// Russia set aside — see the header of `DirectedChoroplethWeb.tsx` for the full table.
const caveat =
  `Part bas-carbone — nucléaire et renouvelables — de l'électricité produite en ${YEAR}. ` +
  `Carte MapTiler plate, en Web Mercator : le nord est gonflé — la Norvège, la Suède et la ` +
  `Finlande couvrent ${fr(NORTH_PAGE_SHARE, 0)} % de la terre dessinée pour ` +
  `${fr(NORTH_TRUE_SHARE, 0)} % de la terre réelle. Le titre compte des PAYS, pas des surfaces.`;
const claimNote =
  `Au-dessus de ${STATED[STATED.length - 1]} % : ${namesOf(topStated).join(", ")}. ` +
  `${missing > 1 ? `${missing} pays sont dessinés` : `L'${NAMES.UKR}, sans donnée pour ${YEAR}, est dessinée`} ` +
  `en creux et hors des règles : le palier le plus bas est un pays à ${pc(RANGE_MIN)}.`;
const readingLine =
  `Lecture : une carte n'est pas des nombres, c'est une partition de nombres. Changez la règle qui ` +
  `la coupe : les ${N} pays se re-teintent sans bouger. Le tableau ci-dessous suit la même règle, ` +
  `avec ou sans JavaScript.`;
// SHOWN ONLY ONCE THE LIVE MAP IS UP, so it never describes a map a reader cannot move.
const liveHint =
  `La carte est vivante : molette ou boutons pour zoomer, glisser pour déplacer, flèches du clavier ` +
  `une fois la carte au focus. Survolez un pays pour sa part exacte, ses TWh et son rang.`;
const source = `Source : Ember / Energy Institute, Statistical Review of World Energy (2025), via Our World in Data · ${YEAR} · fond MapTiler`;

const interaction = {
  earns:
    "A still and a video can both SAY that a choropleth's bounds are a choice; neither can let the " +
    "reader put four standard rules on the same forty readings in whatever order they like and watch " +
    "thirteen countries walk into the darkest band the plate gives to seven.",
  controls: [
    {
      question: "Sept pays — sept selon quelle règle, et qui change de couleur si on coupe autrement ?",
      gesture: "toggle-a-comparison",
      changes:
        "Les 40 pays traversent la rampe jusqu'au cran que la règle choisie leur donne, sans qu'aucun " +
        "ne bouge d'un pixel ; les quatre bornes de la légende se réécrivent sur place avec " +
        "l'effectif de chaque palier, et une phrase dit combien de pays entrent dans la bande la " +
        "plus foncée et combien des 40 ont changé de palier.",
    },
    {
      question: "Et si je veux les quarante, sans la carte — ou sans JavaScript ?",
      gesture: "open-the-full-table",
      changes:
        "Les 41 lignes s'ouvrent sous la carte, dans l'ordre des parts, chacune avec sa pastille de " +
        "palier. Cette pastille suit la règle choisie en CSS pur : c'est là que le geste éditorial " +
        "survit quand la carte, elle, ne peut pas — un fond MapLibre n'est atteignable par aucune " +
        "feuille de style, donc la moitié carte du geste est du script et la moitié tableau n'en " +
        "est pas.",
    },
    {
      question: "Ce pays-là, il vaut combien exactement, et est-ce qu'il change de couleur selon la règle ?",
      gesture: "ask-a-mark",
      changes:
        "Le pays pointé s'assombrit depuis son propre remplissage — celui du palier où la règle " +
        "courante l'a mis — et répond avec sa part exacte, ses TWh bas-carbone sur son total, son " +
        "rang sur 40 et le nombre de paliers différents qu'il occupe selon la règle.",
    },
  ],
};

// ── THE FROZEN FALLBACK, BAKED FROM THE PAGE ITSELF ───────────────────────────────────────────
//
// R1's second layer, and the owner found it missing the first time this beat shipped live: the
// committed page drew the BASEMAP and no data. The plate `bake.mjs` makes is MapTiler's geography
// and nothing else — the classes, the borders and the hollow country are MapLibre layers now, so a
// plate baked before them pictures a map with the study rubbed out. What stands there when a key
// lapses has to be the same picture the live map draws.
//
// SO THE FALLBACK IS BAKED FROM THE PAGE, not from a second pipeline: the runner renders a draft,
// substitutes the key into a copy that lives OUTSIDE the repository, opens it, waits for the live
// map to announce itself, photographs the map's own box, and renders again with that image. There
// is no second plan and no second mount to disagree with the first — it is the page.
//
// It is re-baked only when the plan or the shape changes; the recorded hash is what decides.
const FALLBACK_DIR = join(HERE, "fallback");
// THE REFERENCE WINDOW, not a box: the fallback is photographed at the window the beat is reviewed
// at, so the image is the delivered box's own shape and `slice` crops nothing there. Baked at the
// window rather than at a typed box because the first version typed one 400 px taller, the live
// camera fitted THAT shape, and the frozen image came back showing a different slice of the world
// than the page shows. At 2x, so it is not soft on the screen the owner reviews on.
const FALLBACK_WINDOW = { width: 1512, height: 860, scale: 2 };
const BLANK_PNG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
const KEY = process.env.MAPTILER_KEY ?? process.env.REMOTION_MAPTILER_KEY ?? process.env.VITE_MAPTILER_KEY ?? "";
const PLACEHOLDER = `__MAPTILER${"_KEY__"}`;
const localPageOf = (pagePath) => pagePath.replace(/\.html$/, ".local.html");

const TABLE_CAPTION = `Les ${N} lectures, et le palier que la règle choisie leur donne`;
const COLUMNS = ["Pays", "Part bas-carbone", "Rang", "Palier"];

const textPerRegister = {
  display: title,
  eyebrow: EYEBROW,
  body: `${caveat} ${readingLine} ${source} ${liveHint}`,
  axis: `${classing.rules.flatMap((r) => r.bounds).join(" ")} pas de donnée ${classing.label} ${classing.rules.map((r) => `${r.label} ${r.announce}`).join(" ")} ${TABLE_CAPTION} ${COLUMNS.join(" ")}`,
  annot: `${claimNote} ${classing.rules.map((r) => r.note ?? "").join(" ")}`,
  value: ranked.map(([, r]) => fr(r.share)).join(" "),
};
for (const key of Object.keys(textPerRegister)) textPerRegister[key] = plain(textPerRegister[key]);

const filed = readdirSync(DIRECTIONS).filter((f) => f.endsWith(".md")).map((f) => readDirection(join(DIRECTIONS, f)));
const newsroom = readPalette(HERE, { stopAt: join(HERE, "..") });
const BEAT_FACTS = { evidenceLevels: CLASSES };
console.log(report(composeDirections({ newsroom, filed, beat: BEAT_FACTS, textPerRegister }), { beat: BEAT_FACTS }));
console.log("");

// ── WHAT THE SECOND LAYER IS MADE OF, READ ONCE ──────────────────────────────────────────────
//
// MapLibre and its stylesheet are INLINED into every page rather than linked: a `<script src>` would
// trade the payload for a SECOND third-party host, and inlining keeps the count at one —
// api.maptiler.com. `style.mjs` travels as SOURCE with its `export` keywords stripped, because a
// page script cannot import: the sweep that decides what a basemap layer becomes is stated once, in
// that file, and applied twice — to the style document the plate is baked from, and to the live
// style in the reader's browser.
const requireFrom = createRequire(import.meta.url);
const MAPLIBRE_JS = await readFile(requireFrom.resolve("maplibre-gl/dist/maplibre-gl.js"), "utf8");
const MAPLIBRE_CSS = await readFile(requireFrom.resolve("maplibre-gl/dist/maplibre-gl.css"), "utf8");
const STYLE_MODULE = (
  await readFile(join(HERE, "..", "..", "skills", "map-web", "assets", "style.mjs"), "utf8")
).replace(/^export /gm, "");

/**
 * PHOTOGRAPH THE PAGE'S OWN LIVE MAP, and write it where the page will embed it.
 *
 * The key is substituted into a copy under the system temp directory, never beside the page and
 * never inside the repository — `no-key-in-the-repository` scans the working tree, and it caught
 * exactly this once already. The copy is removed whether the bake succeeds or not.
 *
 * It REFUSES rather than writing something: a fallback baked from a map that never loaded is a
 * picture of the failure it exists to replace, and it would ship looking like a success.
 */
async function bakeFallback(pagePath, outFile, id) {
  if (!KEY)
    throw new Error(
      "the frozen fallback is photographed from this page's own live map, so the bake needs a " +
        "MapTiler key in the environment (MAPTILER_KEY). Without one the page would ship with the " +
        "basemap and no data on it, which is the defect this bake exists to close.",
    );
  const html = (await readFile(pagePath, "utf8")).split(PLACEHOLDER).join(KEY);
  const dir = mkdtempSync(join(tmpdir(), "mw-fallback-"));
  const keyed = join(dir, `${id}.local.html`);
  await writeFile(keyed, html);
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--use-gl=swiftshader", "--enable-unsafe-swiftshader"],
  });
  try {
    const page = await browser.newPage();
    await page.setViewport({
      width: FALLBACK_WINDOW.width,
      height: FALLBACK_WINDOW.height,
      deviceScaleFactor: FALLBACK_WINDOW.scale,
    });
    await page.goto(`file://${keyed}`, { waitUntil: "networkidle0", timeout: 120000 });
    await page.waitForFunction(() => document.documentElement.classList.contains("mw-live"), {
      timeout: 120000,
    });
    // Every tile of the view drawn, not merely requested.
    await page.evaluate(
      () =>
        new Promise((resolve) => {
          const map = window.__mwMap;
          if (map.loaded() && map.areTilesLoaded()) return resolve();
          map.once("idle", resolve);
        }),
    );
    await new Promise((r) => setTimeout(r, 600));
    const box = await page.$(".map-layer");
    if (!box) throw new Error("the page carries no live map box to photograph");
    await mkdir(dirname(outFile), { recursive: true });
    const png = `${outFile}.png`;
    const shot = await box.boundingBox();
    await box.screenshot({ path: png });
    // Lossless would be honest and is 4x the bytes on flat fills; `-q 92` is visually the same
    // picture and keeps a page that already inlines MapLibre inside a megabyte and a half.
    const encode = spawnSync("cwebp", ["-quiet", "-q", "92", png, "-o", outFile], { stdio: "inherit" });
    if (encode.status !== 0) throw new Error(`cwebp exited with ${encode.status} baking ${id}'s fallback`);
    rmSync(png, { force: true });
    console.log(
      `fallback ${id} → ${outFile.replace(`${HERE}/`, "")} · ${Math.round(shot.width)}x${Math.round(shot.height)} CSS px`,
    );
    return { width: Math.round(shot.width), height: Math.round(shot.height) };
  } finally {
    await browser.close();
    rmSync(dir, { recursive: true, force: true });
  }
}

const refused = [];
for (const file of readdirSync(DIRECTIONS).filter((f) => f.endsWith(".md"))) {
  const id = file.replace(/\.md$/, "");
  const filed = readDirection(join(DIRECTIONS, file));
  /** THE GUARD REACHES THE PAINT, WHICH IS THE HALF OF THE DANUBE'S REPAIR THAT APPLIES HERE.
   *
   *  What this beat draws is `direction.accent`, and until now nothing measured that colour against
   *  the basemap it is drawn over: `composeDirections` printed a report above and its result was
   *  dropped on the floor. `guardColour` is the same rule the composer refuses on, run on the colour
   *  that is actually painted, against the grounds this beat's marks were MEASURED to occupy.
   *
   *  NOT `composeDirection`, and the reason is this beat's own record. `PALETTE.md` here is
   *  `origin: newsroom`, and a house palette is taken WHOLE by `colourAxis` — composing would paint
   *  all three of these renders in one ground and one accent and collapse the bench they exist to
   *  be. The four beats in this family whose marks ARE seated on water record a hue instead, and
   *  those do compose. */
  const base = filed;
  const colourProblems = guardColour(base, plateGrounds(plateTints(base, { landDose: LAND_DOSE }), OCCUPANCY));
  if (colourProblems.length) {
    // A COLOUR REFUSAL IS A REFUSAL LIKE THE OTHERS, and takes the same path: named on the console,
    // counted at the end, and the previous render removed so it cannot be mistaken for this one.
    const why = `the ${id} direction cannot carry this beat's colour: ${colourProblems.join("; ")}`;
    refused.push({ id, why });
    console.log(`${id} REFUSED — ${why}`);
    await rm(join(OUT, `${id}.html`), { force: true });
    await rm(localPageOf(join(OUT, `${id}.html`)), { force: true });
    continue;
  }
  const direction = resolveDirectionFamilies(base, textPerRegister);
  // The colour the plate's LAND was baked in — what the page actually paints behind every country,
  // and the only honest thing to measure the lightest class against.
  const tints = plateTints(base, { landDose: LAND_DOSE });
  const furniture = deriveFurniture(base.ground);
  // ONE DERIVATION OF THE RAMP, READ BY BOTH HALVES. The component draws the table's swatches from
  // it and this file builds the live map's per-rule fill expressions from the SAME array — a second
  // derivation is precisely the "half the beat re-shades and the other half keeps the rule before
  // it" defect, now able to happen across two mechanisms instead of inside one.
  const { ramp, activeRamp } = choroplethRamp({
    ground: base.ground,
    accent: base.accent,
    ink: furniture.ink,
    plateLand: tints.land,
    tones: CLASSES,
  });
  const live = {
    style: plateFacts.style,
    tints,
    // THE LIVE CAMERA FITS THE BEAT'S OWN DECLARED WINDOW, which is the box the plate was baked by
    // fitting — so the fallback and the live map are ONE camera rather than two that agree today.
    studyBounds: {
      west: plateFacts.bounds[0][0],
      south: plateFacts.bounds[0][1],
      east: plateFacts.bounds[1][0],
      north: plateFacts.bounds[1][1],
    },
    frame: FRAME,
    degreesPerPixel: plateFacts.degreesPerPixel,
    studied: ranked.map(([code]) => ISO2[code]),
    missing: readings.filter((r) => !r.classed).map((r) => r.iso2),
    smallShapes: SMALL_SHAPES,
    rules: classing.rules.map((rule, i) => ({
      key: rule.key,
      fillByCode: Object.fromEntries(ranked.map(([code]) => [ISO2[code], ramp[CLASSING_INDEX.get(ISO2[code])[i]]])),
      activeByCode: Object.fromEntries(ranked.map(([code]) => [ISO2[code], activeRamp[CLASSING_INDEX.get(ISO2[code])[i]]])),
    })),
    defaultKey: classing.defaultKey,
    border: { studied: mix(base.ground, furniture.ink, 0.35), other: mix(tints.land, furniture.ink, 0.18), width: 0.8 },
    details: Object.fromEntries(readings.map((r) => [r.iso2, r.detail])),
    locale: { title: "Carte", zoomIn: "Zoomer", zoomOut: "Dézoomer" },
    changeMs: CHANGE_MS,
    smallest: SMALLEST,
  };
  // THE DRAWN BOX IS THE FALLBACK'S OWN BOX. The `<svg class="chart">` covers its stage with `slice`,
  // so a viewBox of some other ratio crops the image rather than the stage: with the beat's
  // near-square 900/684 in a 2,8:1 stage, `slice` scaled by width and cut the Mediterranean off the
  // frozen picture. Measured on the delivered page, which is how it was found.
  const pageOf = (plate, box) =>
    renderWeb({
      // A MAP BEAT'S DRAWING KEEPS ITS SHARE OF THE WINDOW AND THE WORDS GIVE WAY — the share is
      // declared once, in the trunk, and refused there on the file this call writes.
      drawing: { share: MAP_DRAWING_SHARE },
      component: DirectedChoroplethWeb,
      props: {
        plate,
        plateLand: tints.land,
        readings,
        classingReadings,
        classing,
        missingLabel: "pas de donnée",
        livePlan: liveChoroplethPlan(live),
        liveScript: liveChoroplethScript(live, {
          scope: ".chart-figure",
          styleModule: STYLE_MODULE,
          classingName: "chart-stack",
        }),
        liveHint,
        maplibreCss: MAPLIBRE_CSS,
        maplibreJs: MAPLIBRE_JS,
        tableCaption: TABLE_CAPTION,
        columns: COLUMNS,
        aspect: box.width / box.height,
        size: box.width,
        title, eyebrow: EYEBROW, caveat, source, reading: readingLine, claimNote,
        alt:
          `Une carte d'Europe sur fond MapTiler, chaque pays teinté selon la part bas-carbone de son ` +
          `électricité en ${YEAR}. Les teintes les plus foncées forment un arc au nord et à l'ouest — ` +
          `${namesOf(topStated).join(", ")} — et une tache isolée dans les Balkans. Le centre et ` +
          `l'est de la carte restent clairs. ${missing} pays est dessiné en creux, faute de donnée. ` +
          `Une commande à quatre positions recoupe les mêmes lectures selon quatre règles de ` +
          `classement, et la carte elle-même se zoome et se déplace avec les contrôles de MapTiler.`,
        interaction,
        direction,
        ground: direction.ground,
        accent: direction.accent,
      },
      outDir: OUT,
      name: `${id}.html`,
    });

  try {
    const stamp = createHash("sha256")
      .update(JSON.stringify(liveChoroplethPlan(live)))
      .update(JSON.stringify(FALLBACK_WINDOW))
      .digest("hex")
      .slice(0, 16);
    const image = join(FALLBACK_DIR, `${id}.webp`);
    const stampFile = join(FALLBACK_DIR, `${id}.sha`);
    let record = null;
    if (existsSync(image) && existsSync(stampFile)) {
      try {
        const kept = JSON.parse(readFileSync(stampFile, "utf8"));
        if (kept.stamp === stamp) record = kept;
      } catch (err) {
        record = null;
      }
    }
    if (!record) {
      // A DRAFT FIRST, with nothing under the live map, because the thing being photographed is the
      // live map on THIS page rather than a second rendering of the same plan somewhere else.
      await pageOf(BLANK_PNG, { width: 1464, height: 520 });
      const shot = await bakeFallback(join(OUT, `${id}.html`), image, id);
      await mkdir(FALLBACK_DIR, { recursive: true });
      record = { stamp, ...shot };
      await writeFile(stampFile, `${JSON.stringify(record)}\n`);
    }
    const plate = `data:image/webp;base64,${(await readFile(image)).toString("base64")}`;
    const { outPath } = await pageOf(plate, record);
    // THE KEYED COPY FOR REVIEW, beside the page and git-ignored — the same name and the same rule
    // the scrolly worktree already uses (`renders/<id>.local.html`). The owner: « non, comme pour
    // les scrolly il faut toujours une clé sinon ça sert à rien ». The COMMITTED page keeps the
    // placeholder, because this repository is public.
    if (KEY) {
      const html = await readFile(outPath, "utf8");
      if (!html.includes(PLACEHOLDER))
        throw new Error("the rendered page carries no delivery placeholder to substitute a key into");
      await writeFile(localPageOf(outPath), html.split(PLACEHOLDER).join(KEY));
    }
    // The page is read back from disk, not from the string the renderer happened to return — the
    // file a reader opens is the only artefact any of these refusals is about.
    const written = await readFile(join(OUT, `${id}.html`), "utf8");
    assertOneClassing(written, classing, CLASSING_INDEX, { where: `renders/${id}.html` });
    // THE SAME QUESTION, ASKED OF THE OTHER HALF. `assertOneClassing` holds the MARKUP against the
    // index; this holds the LIVE PLAN against the same index. Neither can see the other's mechanism,
    // and the crossing between them is exactly where this architecture can put one partition on the
    // map and a different one in the table.
    assertClassingReachesTheLayers(written, live, CLASSING_INDEX, ramp, plateFacts.style, {
      where: `renders/${id}.html`,
    });
    console.log(`${id} -> renders/${id}.html`);
  } catch (error) {
    refused.push({ id, why: error.message });
    console.log(`${id} REFUSED — ${error.message}`);
    // A refused direction must not leave its previous render on disk to be mistaken for this one.
    await rm(join(OUT, `${id}.html`), { force: true });
  }
}
if (refused.length) {
  console.log(`\nrefused by ${refused.length}: ${refused.map((x) => x.id).join(", ")}`);
  // A runner that swallows a refusal makes a refused page look like a produced one, and leaves the
  // previous render on disk to be mistaken for this one.
  process.exitCode = 1;
}
