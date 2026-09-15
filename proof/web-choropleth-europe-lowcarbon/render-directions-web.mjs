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
import { existsSync, readdirSync } from "node:fs";
import { readFile, rm } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { mix, readPalette } from "#shared/chart-beat/colour.mjs";
import { deriveFurniture } from "#shared/chart-beat/render-still.mjs";
import { beatFacts, applicableTreatments } from "#shared/chart-beat/treatments.mjs";
import { readDirection } from "#shared/design-base/read-direction.mjs";
import { composeDirections, report } from "#shared/design-base/compose.mjs";
import { resolveDirectionFamilies } from "#shared/design-base/resolve-families.mjs";
import { plainSpaces } from "#shared/design-base/web.mjs";
import { renderWeb } from "../../skills/chart-web/scripts/render-web.mjs";
import {
  assertOneClassing,
  buildClassingIndex,
  classOf,
  classingCounts,
} from "../../skills/map-web/assets/classing.ts";
import { DirectedChoroplethWeb } from "./DirectedChoroplethWeb.tsx";
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

const classingReadings = ranked.map(([code, r]) => ({ key: code, value: r.share }));
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

// ── THE CAMERA IS THE PLATE'S ─────────────────────────────────────────────────────────────────
//
// The equal-area camera in `camera.ts` is still this beat's own, and this file still prints it: it
// is what MEASURES. It no longer PLACES anything. What places every mark is the baked MapTiler
// plate's own recorded camera — `frameCorners`, read back with `map.unproject()` after the camera
// settled, not the nominal bounds handed to `fitBounds`, which fitBounds widens to keep the frame's
// aspect. Longitude is linear in pixel-x under Web Mercator; latitude is not, and needs the inverse
// Mercator formula, because pixel-y is linear in Mercator-y.
//
// THE COST, STATED. Web Mercator inflates the north: at 60° a shape draws about twice the area it
// holds. This beat's headline is a COUNT of countries above a stated break, and a count survives the
// inflation untouched — but the eye still weights a class by the page it covers, so the caveat no
// longer claims an equal-area reading and says instead what the reader is looking at.
//
// ONE PLATE PER FILED DIRECTION, baked in that direction's own tints. The three share a camera by
// construction, and that is asserted below rather than assumed: three plates that disagreed about
// where 10°E is would put the same country in three places and nothing here would notice.
const PLATE_SIZE = "1600x1216";
const plateDir = (id) => join(HERE, "plate", id);
function ensurePlate(id, water, land) {
  const dir = plateDir(id);
  if (existsSync(join(dir, "geometry.json")) && existsSync(join(dir, "plate.png"))) return;
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
const plateTints = (d) => ({
  water: mix(d.ground, d.accent, 0.16),
  land: mix(d.ground, deriveFurniture(d.ground).ink, 0.07),
});

const DIRECTION_FILES = readdirSync(DIRECTIONS).filter((f) => f.endsWith(".md")).sort();
for (const file of DIRECTION_FILES) {
  const id = file.replace(/\.md$/, "");
  const t = plateTints(readDirection(join(DIRECTIONS, file)));
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
const mercY = (lat) => Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360));
const Y_NORTH = mercY(CORNERS.north);
const Y_SOUTH = mercY(CORNERS.south);
/** Into the drawing's own unit box: x over the frame's WIDTH on both axes, so one scale serves both
 *  and nothing is sheared. */
const project = ([lon, lat]) => {
  const px = ((lon - CORNERS.west) / (CORNERS.east - CORNERS.west)) * FRAME.width;
  const py = ((mercY(lat) - Y_NORTH) / (Y_SOUTH - Y_NORTH)) * FRAME.height;
  return [px / FRAME.width, py / FRAME.width];
};

// ── the shapes ────────────────────────────────────────────────────────────────────────────────
const geo = JSON.parse(await readFile(join(HERE, "shapes.geojson"), "utf8"));
const width = CAMERA_ASPECT >= 1 ? SIZE : SIZE * CAMERA_ASPECT;
const height = CAMERA_ASPECT >= 1 ? SIZE / CAMERA_ASPECT : SIZE;
const toPx = ([ux, uy]) => [ux * SIZE, uy * SIZE];

/** A ring is thinned by dropping vertices closer than half a drawn pixel to the last one kept.
 *  A ring too small to thin is kept WHOLE: the first version of this rule made Malta vanish, and a
 *  choropleth with a country silently absent is the failure every reference sheet warns about. */
const MIN_STEP = 0.5;
const thin = (ring) => {
  const out = [];
  for (const p of ring) {
    const q = toPx(project(p));
    const last = out[out.length - 1];
    if (!last || Math.hypot(q[0] - last[0], q[1] - last[1]) >= MIN_STEP) out.push(q);
  }
  return out.length >= 4 ? out : ring.map((p) => toPx(project(p)));
};

/** WHAT A COUNTRY'S ANSWER SAYS ABOUT THE FOUR RULES AT ONCE, and it is the only reading on the page
 *  that does not depend on which rule is in force — which is exactly why it can be baked into a
 *  string `interaction.mjs` reads once. The class a country is in right now cannot be: it would be
 *  a lie under three rules out of four. */
const stabilityOf = (code) => {
  const seen = [...new Set(RULES.map((rule) => classOf(readingsByCode.get(code).share, rule.breaks)))].sort();
  if (seen.length === 1) return `même palier sous les ${RULES.length} règles`;
  const list = seen.map((k) => k + 1);
  return `palier ${list.slice(0, -1).join(", ")} ou ${list[list.length - 1]} sur ${CLASSES} selon la règle`;
};

const shapes = [];
for (const f of geo.features) {
  const code = f.properties.iso ?? f.properties.code ?? f.properties.ISO_A3 ?? f.properties.iso_a3;
  if (!code || !NAMES[code]) continue;
  const polys = f.geometry.type === "Polygon" ? [f.geometry.coordinates] : f.geometry.coordinates;
  const rings = polys.map((p) => thin(p[0])).filter((r) => r.length >= 3);
  if (!rings.length) continue;
  const path = rings
    .map((r) => `M ${r.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join(" L ")} Z`)
    .join(" ");
  // The hit seat: the centre of the LARGEST ring's bounding box, nudged onto a vertex-free interior
  // point by averaging that ring — good enough for a target a reader aims at, and never outside the
  // frame.
  const biggest = rings.reduce((a, b) => (b.length > a.length ? b : a));
  const cx = biggest.reduce((s, p) => s + p[0], 0) / biggest.length;
  const cy = biggest.reduce((s, p) => s + p[1], 0) / biggest.length;
  const reading = readingsByCode.get(code) ?? null;
  const rank = reading ? ranked.findIndex(([c]) => c === code) + 1 : null;
  shapes.push({
    code,
    name: NAMES[code],
    path,
    cx,
    cy,
    classed: Boolean(reading),
    detail: reading
      ? `${NAMES[code]} · ${fr(reading.share)} % de son électricité est bas-carbone en ${YEAR} · ` +
        `${fr(reading.low, 0)} TWh bas-carbone sur ${fr(reading.total, 0)} · ${rank}e sur ` +
        `${ranked.length} · ${stabilityOf(code)}`
      : `${NAMES[code]} · aucune production publiée pour ${YEAR} dans ce fichier — dessiné en creux, ` +
        `hors de toutes les règles de classement, jamais rangé dans le palier le plus bas`,
  });
}

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
    `${WINDOW.south}..${WINDOW.north}N · aspect ${MEASURE_ASPECT.toFixed(2)}:1\n`,
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
const caveat =
  `Part bas-carbone — nucléaire et renouvelables — de l'électricité produite en ${YEAR}. ` +
  `Fond MapTiler en Web Mercator : le titre compte des PAYS, pas des surfaces.`;
const claimNote =
  `Au-dessus de ${STATED[STATED.length - 1]} % : ${namesOf(topStated).join(", ")}. ` +
  `${missing > 1 ? `${missing} pays sont dessinés` : `L'${NAMES.UKR}, sans donnée pour ${YEAR}, est dessinée`} ` +
  `en creux et hors des règles : le palier le plus bas est un pays à ${pc(RANGE_MIN)}.`;
const readingLine =
  `Lecture : une carte n'est pas des nombres, c'est une partition de nombres. Changez la règle qui ` +
  `la coupe : les ${N} pays se re-teintent sans bouger. Survolez-en un pour sa part exacte.`;
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
      question: "Ce pays-là, il vaut combien exactement, et est-ce qu'il change de couleur selon la règle ?",
      gesture: "ask-a-mark",
      changes:
        "Le pays pointé s'assombrit depuis son propre remplissage — celui du palier où la règle " +
        "courante l'a mis — et répond avec sa part exacte, ses TWh bas-carbone sur son total, son " +
        "rang sur 40 et le nombre de paliers différents qu'il occupe selon la règle.",
    },
  ],
};

const textPerRegister = {
  display: title,
  eyebrow: EYEBROW,
  body: `${caveat} ${readingLine} ${source}`,
  axis: `${classing.rules.flatMap((r) => r.bounds).join(" ")} pas de donnée ${classing.label} ${classing.rules.map((r) => `${r.label} ${r.announce}`).join(" ")}`,
  annot: `${claimNote} ${classing.rules.map((r) => r.note ?? "").join(" ")}`,
  value: ranked.map(([, r]) => fr(r.share)).join(" "),
};
for (const key of Object.keys(textPerRegister)) textPerRegister[key] = plain(textPerRegister[key]);

const filed = readdirSync(DIRECTIONS).filter((f) => f.endsWith(".md")).map((f) => readDirection(join(DIRECTIONS, f)));
const newsroom = readPalette(HERE, { stopAt: join(HERE, "..") });
const BEAT_FACTS = { evidenceLevels: CLASSES };
console.log(report(composeDirections({ newsroom, filed, beat: BEAT_FACTS, textPerRegister }), { beat: BEAT_FACTS }));
console.log("");

const refused = [];
for (const file of readdirSync(DIRECTIONS).filter((f) => f.endsWith(".md"))) {
  const id = file.replace(/\.md$/, "");
  const base = readDirection(join(DIRECTIONS, file));
  const direction = resolveDirectionFamilies(base, textPerRegister);
  const plate = `data:image/png;base64,${(await readFile(join(plateDir(id), "plate.png"))).toString("base64")}`;
  try {
    await renderWeb({
      component: DirectedChoroplethWeb,
      props: {
        plate,
        // The colour the plate's LAND was baked in — what the page actually paints behind every
        // country, and the only honest thing to measure the lightest class against.
        plateLand: plateTints(base).land,
        shapes,
        readings: classingReadings,
        classing,
        missingLabel: "pas de donnée",
        aspect: CAMERA_ASPECT,
        size: SIZE,
        title, eyebrow: EYEBROW, caveat, source, reading: readingLine, claimNote,
        alt:
          `Une carte d'Europe sur fond MapTiler, chaque pays teinté selon la part ` +
          `bas-carbone de son électricité en ${YEAR}. Les teintes les plus foncées forment un arc au ` +
          `nord et à l'ouest — ${namesOf(topStated).join(", ")} — et une tache isolée dans ` +
          `les Balkans. Le centre et l'est de la carte restent clairs. ${missing} pays sont dessinés ` +
          `en creux, faute de donnée. Une commande à quatre positions recoupe les mêmes lectures ` +
          `selon quatre règles de classement.`,
        interaction,
        direction,
        ground: direction.ground,
        accent: direction.accent,
      },
      outDir: OUT,
      name: `${id}.html`,
    });
    // The page is read back from disk, not from the string the renderer happened to return — the
    // file a reader opens is the only artefact any of these refusals is about.
    assertOneClassing(await readFile(join(OUT, `${id}.html`), "utf8"), classing, CLASSING_INDEX, {
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
