// twin/proof/web-proportional-symbol-europe-capacity/render-directions-web.mjs
//
// Europe's low-carbon capacity as proportional symbols, one circle per country, rendered once per
// FILED DIRECTION into a self-contained interactive page.
//
// EVERY MARK IS A MAPLIBRE LAYER over MapTiler's own tiles — the pattern the owner validated on
// 2026-09-15 (`.superpowers/sdd/2026-09-12-sp1-map-plan-contract/MAP-WEB-BRIEF.md`, "LE PATRON
// VALIDÉ"), applied here for the second time. The map takes the figure's whole width, the zoom, the
// drag, the wheel, the keyboard and the pointer are MapTiler's own, and the picture that stands
// there when the key lapses is a PHOTOGRAPH OF THIS PAGE'S OWN LIVE MAP rather than a plate from a
// second pipeline.
//
// THE RESTING LAW IS THE AREA LAW: a circle twice the area stands for twice the capacity. The page
// hands the reader the exponent itself — the one parameter this type sets in silence — through
// `skills/map-web/assets/area-scale.ts`. Every number the control's sentences print is derived here
// from the frozen file by that vocabulary and asserted before anything is drawn.
//
// Usage:  bun proof/web-proportional-symbol-europe-capacity/render-directions-web.mjs

import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { createHash } from "node:crypto";
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import puppeteer from "puppeteer";
import { fileURLToPath } from "node:url";
import { contrast, mix, readPalette } from "#shared/chart-beat/colour.mjs";
import { deriveFurniture } from "#shared/chart-beat/render-still.mjs";
import { beatFacts, applicableTreatments } from "#shared/chart-beat/treatments.mjs";
import { readDirection } from "#shared/design-base/read-direction.mjs";
import { composeDirections, report } from "#shared/design-base/compose.mjs";
import { resolveDirectionFamilies } from "#shared/design-base/resolve-families.mjs";
import { plainSpaces } from "#shared/design-base/web.mjs";
import { assertNotFallback, maptilerGlyphs } from "#shared/map-beat/glyphs.mjs";
import { countryGround } from "#shared/map-beat/tints.mjs";
import { renderWeb } from "../../skills/chart-web/scripts/render-web.mjs";
// The map skill's own symbol core, reused rather than repeated: the legend's magnitudes are its
// nice-number ladder, not three fractions of a total. Its own header records why — a legend over
// 9 815 / 19 629 / 29 444 is one datum's arithmetic showing through, and a reader cannot carry
// 19 629 back to a circle they are looking at, which is the single job the legend has.
import { niceReferenceValues } from "../../skills/map-web/assets/geo-symbol.ts";
import {
  areaScaleFacts,
  areaScaleSlugOf,
  assertAreaScaleDeclaration,
  assertOneAreaScale,
  radiiUnder,
  radiusUnder,
  maxValueOf,
} from "../../skills/map-web/assets/area-scale.ts";
// THE LIVE LAYER: every mark a MapLibre layer. Its zoom ceiling is DERIVED below from the subject the
// claim is about, so the framing can never be zoomed past the country the headline names.
import {
  assertSymbolLawsReachTheLayers,
  liveSymbolsPlan,
  liveSymbolsScript,
} from "../../skills/map-web/assets/live-symbols.ts";
import { DirectedSymbolMapWeb, symbolPaint } from "./DirectedSymbolMapWeb.tsx";
import { WINDOW, CAMERA_ASPECT as MEASURE_ASPECT } from "./camera.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const DIRECTIONS = join(HERE, "..", "..", "docs", "design-base", "directions");
const OUT = join(HERE, "renders");
const EYEBROW = "Énergie · Europe";
const OLD = ["Hydro", "Nuclear"];
const NEW = ["Wind", "Solar"];

// ── THE CAMERA THE RADII ARE STATED AT ────────────────────────────────────────────────────────
//
// A live map has no viewBox, so a radius counted in "drawing units" has no meaning any more. Every
// radius on this page is a count of CSS PIXELS AT THE REVIEW CAMERA — the box the frozen photograph
// is taken in and the box the owner reviews at. At that box the live scale is exactly 1, which is
// what lets the size legend, which is HTML outside the canvas, be the same size as the marks in
// EVERY state including the one where no script has run.
//
// The pattern's own numbers at 1512x860 are a 1464 x 519,6 map box; 520 is that box, and the drawn
// aspect is then taken from the photograph's own measured box rather than from this constant.
const REVIEW_BOX = { width: 1464, height: 520 };
/** The anchor: what the largest fleet is drawn at, in review pixels. France at 40 px of radius is
 *  80 px across in a 520 px-tall box — the same share of the picture the 46-unit anchor took of the
 *  900 x 684 drawing this replaces, so the field is the density the beat was designed at. */
const R_MAX = 40;
/** THE LEGIBILITY FLOOR, in the same review pixels. A circle drawn under it is, on the page,
 *  indistinguishable from a place with no data at all: a radius under 1 px is a mark under two
 *  pixels across — a dot, not a circle, and certainly not an area anyone can compare. The area law
 *  is refused outright if it puts anything under this; a law offered as a counterexample may, and
 *  then it owes the reader the count. */
const R_FLOOR = 1;
const OUTSIDE = new Set(["Algeria", "Iraq", "Morocco", "Syrian Arab Republic", "Tunisia"]);
const NAMES = {
  France: "France", Germany: "Allemagne", Spain: "Espagne", Italy: "Italie",
  "United Kingdom": "Royaume-Uni", Sweden: "Suède", Norway: "Norvège", Turkey: "Turquie",
  Poland: "Pologne", Switzerland: "Suisse", Austria: "Autriche", Finland: "Finlande",
  Portugal: "Portugal", Netherlands: "Pays-Bas", Belgium: "Belgique", Romania: "Roumanie",
  Ukraine: "Ukraine", Russia: "Russie", Denmark: "Danemark", Greece: "Grèce",
  "Czech Republic": "Tchéquie", Ireland: "Irlande", Bulgaria: "Bulgarie", Hungary: "Hongrie",
  Slovakia: "Slovaquie", Slovenia: "Slovénie", Croatia: "Croatie", Serbia: "Serbie",
  Albania: "Albanie", Iceland: "Islande", Latvia: "Lettonie", Lithuania: "Lituanie",
  Estonia: "Estonie", Luxembourg: "Luxembourg", Belarus: "Biélorussie", Moldova: "Moldavie",
  Montenegro: "Monténégro", "Bosnia and Herzegovina": "Bosnie-Herz.", Macedonia: "Macédoine du N.",
  Armenia: "Arménie", Georgia: "Géorgie",
};

const plain = (s) => plainSpaces(s);
const fr = (v, d = 1) =>
  plain(v.toLocaleString("fr-FR", { minimumFractionDigits: d, maximumFractionDigits: d }));

const csv = (await readFile(join(HERE, "stations.csv"), "utf8")).trim().split(/\r?\n/);
const header = csv[0].split(",");
const at = (n) => {
  const i = header.indexOf(n);
  if (i < 0) throw new Error(`the frozen file has no ${n} column`);
  return i;
};
const stations = csv
  .slice(1)
  .map((line) => {
    const c = line.split(",");
    return {
      country: c[at("country")],
      fuel: c[at("fuel")],
      mw: Number(c[at("capacity_mw")]),
      lon: Number(c[at("lon")]),
      lat: Number(c[at("lat")]),
    };
  })
  .filter(
    (s) =>
      [...OLD, ...NEW].includes(s.fuel) &&
      Number.isFinite(s.mw) && s.mw > 0 &&
      Number.isFinite(s.lon) && Number.isFinite(s.lat) &&
      !OUTSIDE.has(s.country),
  );

const byCountry = new Map();
for (const s of stations) {
  if (!byCountry.has(s.country)) byCountry.set(s.country, { mw: 0, count: 0, old: 0, fresh: 0, lon: 0, lat: 0, w: 0 });
  const c = byCountry.get(s.country);
  c.mw += s.mw;
  c.count += 1;
  if (OLD.includes(s.fuel)) c.old += s.mw;
  else c.fresh += s.mw;
  // The symbol sits at the CAPACITY-WEIGHTED centre of its own stations, not at the country's
  // centroid: a country's fleet is where its plants are, and a centroid can sit in a mountain range
  // with nothing in it.
  c.lon += s.lon * s.mw;
  c.lat += s.lat * s.mw;
  c.w += s.mw;
}
const rows = [...byCountry.entries()]
  .map(([country, c]) => ({ country, key: areaScaleSlugOf(country), ...c, lon: c.lon / c.w, lat: c.lat / c.w }))
  .sort((a, b) => b.mw - a.mw);
for (const r of rows) if (!NAMES[r.country]) throw new Error(`${r.country} has no French name filed`);

const totalMw = rows.reduce((s, r) => s + r.mw, 0);
const biggest = rows[0];
const topFive = rows.slice(0, 5);
const topShare = (topFive.reduce((s, r) => s + r.mw, 0) / totalMw) * 100;
/** The country at the MEDIAN of the field — what the biggest is read against. Not the smallest: a
 *  ratio against the tail is arithmetic nobody carries around, and the median is the country a
 *  reader can actually picture as "an ordinary one of these forty-one". */
const median = rows[Math.floor(rows.length / 2)];

// ── THE CLAIM, ASSERTED ───────────────────────────────────────────────────────────────────────
if (!(topShare > 50))
  throw new Error(`the headline says five countries hold more than half; they hold ${fr(topShare)} %`);
console.log(
  `${rows.length} pays · ${fr(totalMw / 1000, 0)} GW sur ${plain(stations.length.toLocaleString("fr-FR"))} centrales · ` +
    `cinq premiers ${fr(topShare, 0)} % · plus gros ${NAMES[biggest.country]} ${fr(biggest.mw / 1000, 0)} GW · ` +
    `médiane ${NAMES[median.country]} ${fr(median.mw / 1000)} GW\n`,
);
console.table(topFive.map((r) => ({ pays: NAMES[r.country], GW: fr(r.mw / 1000), centrales: r.count })));

// ── THE PLATE IS NO LONGER THE PICTURE; IT IS THE CAMERA'S RECORD ─────────────────────────────
//
// `bake.mjs` still runs, and what is read back out of it is `geometry.json`: the MapTiler style the
// live map must load, the declared window the live camera fits, and the two tints. Its `plate.png`
// is no longer embedded in any page — what a reader sees when the key lapses is a photograph of this
// page's own live map, baked below. The three plates are asserted to share one camera, because three
// records that disagreed about where a degree is would hand the live map three windows.
const PLATE_SIZE = "1824x1216";
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

/** The two tints a basemap is allowed on a directed map, both derived from the direction and neither
 *  invented: `water-is-a-tint-not-a-grey` says the sea takes a little of the accent, and the land
 *  takes a step off the ground toward the ink. Nothing else on the basemap carries colour. */
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
  if (JSON.stringify(other.bounds) !== JSON.stringify(plateFacts.bounds) || other.style !== plateFacts.style)
    throw new Error(
      `the ${id} plate records a different camera or style than ${DIRECTION_FILES[0]}: three records ` +
        `that disagree about where a degree is would hand the live map three windows`,
    );
}
if (!plateFacts.bounds || !plateFacts.style)
  throw new Error("this plate predates the camera facts: re-bake it with bake.mjs");

/** THE WINDOW THE LIVE CAMERA FITS — the beat's own declared one, the same the bake fitted, so the
 *  frozen photograph and the live map are ONE camera and not two that agree today. */
const STUDY = {
  west: plateFacts.bounds[0][0],
  south: plateFacts.bounds[0][1],
  east: plateFacts.bounds[1][0],
  north: plateFacts.bounds[1][1],
};

// ── THE REVIEW CAMERA, COMPUTED THE WAY MAPLIBRE COMPUTES IT ──────────────────────────────────
//
// `fitBounds` with padding 0 puts the declared window inside the box on whichever axis binds. Web
// Mercator is linear in longitude and linear in the Mercator ordinate, so both halves are one line
// of arithmetic. This is the SAME function the page's own script carries, because the two have to be
// one derivation: the radii are stated at the camera this returns, and the script's scale is 1 only
// if it agrees to the pixel.
const RAD = Math.PI / 180;
const mercY = (lat) => Math.log(Math.tan(lat * RAD) + 1 / Math.cos(lat * RAD));
const yUnit = (lat) => (1 - mercY(lat) / Math.PI) / 2;
const worldWidthFor = (width, height) =>
  Math.min(width / ((STUDY.east - STUDY.west) / 360), height / (yUnit(STUDY.south) - yUnit(STUDY.north)));
const REVIEW_WORLD = worldWidthFor(REVIEW_BOX.width, REVIEW_BOX.height);
const REVIEW_ZOOM = Math.log2(REVIEW_WORLD / 512);
const REVIEW_LON_SHOWN = (REVIEW_BOX.width / REVIEW_WORLD) * 360;
// THE FIT IS BOUND BY THE HEIGHT, AND THE WHOLE SIZE LEGEND RESTS ON IT. `fitBounds` binds on one
// axis and pays the surplus out on the other; on a stage the full-width ruling has made this wide it
// is always the height, so the live camera's scale is exactly the box's height over the review box's
// — which is why the legend's script-free resting size is stated in `cqh`. Asserted rather than
// assumed: a window that bound on WIDTH would make that resting size wrong with nothing to say so.
if (!(REVIEW_BOX.height / ((yUnit(STUDY.south) - yUnit(STUDY.north))) <
      REVIEW_BOX.width / ((STUDY.east - STUDY.west) / 360)))
  throw new Error(
    `the review camera is bound by its WIDTH, not its height, so the size legend's script-free ` +
      `resting size (a fraction of the box's height) tracks a scale the map is not drawn at`,
  );
console.log(
  `caméra de revue : ${REVIEW_BOX.width}x${REVIEW_BOX.height} · fenêtre déclarée ` +
    `${STUDY.west}..${STUDY.east}E ${STUDY.south}..${STUDY.north}N · zoom ${fr(REVIEW_ZOOM, 3)} · ` +
    `le cadre montre ${fr(REVIEW_LON_SHOWN, 0)}° de longitude pour une fenêtre large de ` +
    `${fr(STUDY.east - STUDY.west, 0)}° (${fr(REVIEW_LON_SHOWN / (STUDY.east - STUDY.west), 2)}×) · ` +
    `caméra qui MESURE (camera.ts, EPSG:3035) aspect ${MEASURE_ASPECT.toFixed(2)}:1 sur ` +
    `${WINDOW.west}..${WINDOW.east}E\n`,
);

const geo = JSON.parse(await readFile(join(HERE, "shapes.geojson"), "utf8"));

// ── WHAT WEB MERCATOR COSTS THIS SUBJECT, MEASURED HERE RATHER THAN ASSERTED ──────────────────
//
// The owner chose the flat map knowing the trade (2026-09-15: « oui une carte MapLibre plate pas un
// globe »), so this is a COST the page carries, not a defect to fix — and a cost a page carries is a
// cost it states.
//
// AND ON THIS TYPE THE COST FALLS SOMEWHERE ELSE THAN ON A CHOROPLETH, which is why it is measured
// again rather than quoted from the sibling. A choropleth's mark IS the ground, so Mercator inflates
// the DATUM. A proportional symbol's mark is a circle held in screen pixels: the marks are immune by
// construction, every ratio between them is exact at every latitude, and it is the LAND UNDERNEATH
// that is inflated. The distortion therefore does not touch the comparison the title makes — it
// touches the second reading every reader of a symbol map takes anyway, "how big is this circle for
// the size of its country", which is false in the north by the factor below.
//
// RUSSIA IS SET ASIDE, and that is a measurement too: it is most of the land this frame can draw and
// only a slice of it is inside the window at all, so every share computed with it in is a share of
// Russia.
const EARTH_KM = 6371.0088;
const toReviewPx = ([lon, lat]) => [
  ((lon - STUDY.west) / 360) * REVIEW_WORLD,
  (yUnit(lat) - yUnit(STUDY.north)) * REVIEW_WORLD,
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
const sphericalArea = (ring) => {
  let sum = 0;
  for (let i = 0; i < ring.length; i += 1) {
    const [l1, p1] = ring[i];
    const [l2, p2] = ring[(i + 1) % ring.length];
    sum += (l2 - l1) * RAD * (2 + Math.sin(p1 * RAD) + Math.sin(p2 * RAD));
  }
  return Math.abs((sum * EARTH_KM * EARTH_KM) / 2);
};
/** The one country the station file and the shape file call by two names — the file predates the
 *  rename and the shapes do not. Written as an alias rather than patched into either frozen file,
 *  and the refusal below still fires for any OTHER country that stops matching. */
const SHAPE_NAME = { Macedonia: "North Macedonia" };
const shapeNameOf = (country) => SHAPE_NAME[country] ?? country;
const drawnCountries = new Set(rows.map((r) => shapeNameOf(r.country)));
/** The frame the review camera really draws — the declared window's latitudes, and whatever
 *  longitude the wide box pays the surplus out in. The same arithmetic `reviewFrameOf` runs inside
 *  the vocabulary, because a beat measured against a frame nobody renders has measured nothing. */
const REVIEW_FRAME = {
  west: (STUDY.west + STUDY.east) / 2 - REVIEW_LON_SHOWN / 2,
  east: (STUDY.west + STUDY.east) / 2 + REVIEW_LON_SHOWN / 2,
  south: STUDY.south,
  north: STUDY.north,
};
const inFrame = ([lon, lat]) =>
  lon >= REVIEW_FRAME.west && lon <= REVIEW_FRAME.east &&
  lat >= REVIEW_FRAME.south && lat <= REVIEW_FRAME.north;
const areas = new Map();
for (const f of geo.features) {
  const name = f.properties.name;
  if (!drawnCountries.has(name) || name === "Russia") continue;
  const polys = f.geometry.type === "Polygon" ? [f.geometry.coordinates] : f.geometry.coordinates;
  let page = 0;
  let real = 0;
  for (const poly of polys) {
    const ring = poly[0];
    // ONLY THE RINGS THE FRAME ACTUALLY DRAWS. Norway's entry in the frozen file carries Svalbard,
    // 78°N and off the top of every camera this beat opens at; counted, it multiplied Norway's own
    // inflation by nearly half again and the sentence would have quoted a distortion nobody can see.
    if (!ring.some(inFrame)) continue;
    page += shoelace(ring.map(toReviewPx));
    real += sphericalArea(ring);
  }
  if (page > 0) areas.set(name, { page, real });
}
const MISSING_SHAPES = rows.filter((r) => r.country !== "Russia" && !areas.has(shapeNameOf(r.country)));
if (MISSING_SHAPES.length)
  throw new Error(
    `${MISSING_SHAPES.map((r) => r.country).join(", ")} draws a circle and has no shape in the frozen ` +
      `file, so what Mercator costs this subject would be measured over a set the map does not draw`,
  );
const PAGE_TOTAL = [...areas.values()].reduce((s, a) => s + a.page, 0);
const REAL_TOTAL = [...areas.values()].reduce((s, a) => s + a.real, 0);
const NORTH = ["Norway", "Sweden", "Finland"];
const NORTH_PAGE_SHARE = (NORTH.reduce((s, c) => s + areas.get(c).page, 0) / PAGE_TOTAL) * 100;
const NORTH_TRUE_SHARE = (NORTH.reduce((s, c) => s + areas.get(c).real, 0) / REAL_TOTAL) * 100;
const weightOf = (name) => (areas.get(name).page / PAGE_TOTAL) / (areas.get(name).real / REAL_TOTAL);
if (!(NORTH_PAGE_SHARE > NORTH_TRUE_SHARE))
  throw new Error(
    `the caveat tells the reader Web Mercator inflates the north, and on this camera it measures ` +
      `${NORTH_PAGE_SHARE.toFixed(1)} % of the page against ${NORTH_TRUE_SHARE.toFixed(1)} % of the ` +
      `ground — the sentence would be false`,
  );
console.log(
  `ce que Mercator coûte (Russie mise à part) : Norvège+Suède+Finlande ` +
    `${fr(NORTH_PAGE_SHARE, 1)} % de la terre dessinée pour ${fr(NORTH_TRUE_SHARE, 1)} % de la terre ` +
    `réelle · par km² contre la France = 1 : ` +
    `${NORTH.map((c) => `${NAMES[c]} ×${fr(weightOf(c) / weightOf("France"), 2)}`).join(" · ")} · ` +
    `Islande ×${fr(weightOf("Iceland") / weightOf("France"), 2)}`,
);
console.log(
  `les CERCLES, eux, n'en souffrent pas : un rayon est tenu en pixels d'écran, donc le rapport de ` +
    `deux marques est exact à toute latitude — ce que Mercator fausse ici, c'est le pays SOUS le ` +
    `cercle, pas le cercle\n`,
);

// ── THE SUBJECT THE ZOOM CEILING IS DERIVED FROM ──────────────────────────────────────────────
//
// THE CEILING IS A COUNTRY, AND IT IS MEASURED HERE RATHER THAN CHOSEN. The reason to bring this map
// closer is the caveat's own claim — that a symbol sits at the capacity-weighted centre of its
// country's OWN stations and not at its centroid — and that claim is unreadable at the published
// width. So the window is never allowed to be narrower than the subject the headline names: a reader
// who has zoomed in to see where inside France its centre of gravity falls can always still see the
// whole of France around it, and past that the map would show terrain this beat holds no datum for.
const subjectShape = geo.features.filter((f) => f.properties.name === shapeNameOf(biggest.country));
if (subjectShape.length === 0)
  throw new Error(
    `${biggest.country} holds the biggest fleet and has no shape in the frozen file, so the zoom ` +
      `ceiling cannot be measured against the country the headline names`,
  );
const SUBJECT_SPAN_DEG = (() => {
  let west = Infinity;
  let east = -Infinity;
  const walk = (node) => {
    if (typeof node[0] === "number") {
      // The mainland only: France's overseas départements would make "the whole of France" a
      // hemisphere and the ceiling would be no ceiling at all.
      if (node[0] < STUDY.west || node[0] > STUDY.east) return;
      west = Math.min(west, node[0]);
      east = Math.max(east, node[0]);
    } else node.forEach(walk);
  };
  for (const f of subjectShape) walk(f.geometry.coordinates);
  return east - west;
})();
console.log(
  `plafond de zoom dérivé : le cadre de revue montre ${fr(REVIEW_LON_SHOWN, 0)}° et ` +
    `${NAMES[biggest.country]} en fait ${fr(SUBJECT_SPAN_DEG, 1)} — ` +
    `+${fr(Math.log2(REVIEW_LON_SHOWN / SUBJECT_SPAN_DEG), 2)} niveaux de zoom\n`,
);

// ── THE SCALE LAWS THE READER HOLDS ───────────────────────────────────────────────────────────
//
// Three laws over the same 41 circles at the same 41 places. The vocabulary normalises each to the
// same anchor radius, so the biggest circle is identical in all three and the ONLY thing that
// changes is the spread — which is the one quantity the exponent decides.
//
// The legend's magnitudes are `niceReferenceValues`'s own ladder, and they are part of this
// declaration rather than of the drawing: `assertOneAreaScale` reads the written page back and
// refuses it unless each swatch re-scales under each law.
const keyValues = niceReferenceValues(biggest.mw, 3).map((mw, i) => ({ key: `k${i}`, value: mw }));
const baseScale = {
  label: "L'échelle des aires",
  values: rows.map((r) => ({ key: r.key, value: r.mw })),
  keyValues,
  maxRadius: R_MAX,
  floor: R_FLOOR,
  subjectKey: biggest.key,
  referenceKey: median.key,
};
/** The three laws, before their sentences exist: the sentences quote numbers this vocabulary derives
 *  from exactly these laws, so the facts are computed first and the words written round them. */
const LAWS = [
  { key: "Aire proportionnelle", label: "Aire proportionnelle", exponent: 0.5 },
  { key: "Rayon proportionnel", label: "Rayon proportionnel", exponent: 1 },
  { key: "Aire aplatie", label: "Aire aplatie", exponent: 1 / 3 },
];
const lawFacts = LAWS.map((law) => areaScaleFacts({ ...baseScale, options: LAWS }, law));
const SUBJECT = NAMES[biggest.country];
const REFERENCE = NAMES[median.country];
const FLOOR_WORDS = `moins de deux pixels de diamètre`;

const scale = {
  ...baseScale,
  options: [
    {
      ...LAWS[0],
      announce:
        `Aire proportionnelle — la surface de chaque cercle est proportionnelle à la capacité ; ` +
        `c'est l'échelle honnête et celle que la page affiche par défaut`,
    },
    {
      ...LAWS[1],
      announce:
        `Rayon proportionnel — le rayon de chaque cercle est proportionnel à la capacité, ` +
        `l'échelle que la fiche de type appelle mécaniquement fausse ; le seuil de lisibilité ` +
        `qu'elle fait franchir est de ${FLOOR_WORDS}`,
      // THE SENTENCE IS BUILT OUT OF THE DERIVED NUMBERS AND NOTHING ELSE, and it is deliberately
      // written as a comparison table in words rather than as a French sentence with prepositions:
      // the subject and the reference are DERIVED from the data (the biggest and the median), so a
      // sentence needing "la France" and "la Grèce" would need an article table nobody could keep
      // correct for the forty-one countries this file can pick from.
      note:
        `Rayon proportionnel — aire montrée, ${SUBJECT} contre ${REFERENCE} : ` +
        `${fr(lawFacts[1].shown, 1)} fois. Aire réelle : ${fr(lawFacts[1].truth, 1)} fois. ` +
        `${fr(lawFacts[1].erased.length, 0)} des ${fr(rows.length, 0)} pays passent sous le seuil ` +
        `de lisibilité.`,
    },
    {
      ...LAWS[2],
      announce:
        `Aire aplatie — les écarts entre les cercles sont compressés, l'échelle flatteuse qu'on ` +
        `choisit quand le plus gros cercle écrase la carte`,
      note:
        `Aire aplatie — aire montrée, ${SUBJECT} contre ${REFERENCE} : ` +
        `${fr(lawFacts[2].shown, 1)} fois. Aire réelle : ${fr(lawFacts[2].truth, 1)} fois. Aucun ` +
        `pays ne passe sous le seuil, mais l'écart que la carte doit prouver a fondu.`,
    },
  ],
};
assertAreaScaleDeclaration(scale, { fr });
for (const [i, law] of LAWS.entries())
  console.log(
    `loi « ${law.label} » (exposant ${law.exponent.toFixed(4)}) : ${SUBJECT} montrée ` +
      `${fr(lawFacts[i].shown, 1)} fois ${REFERENCE}, pour ${fr(lawFacts[i].truth, 1)} fois sa ` +
      `capacité · ${lawFacts[i].erased.length} pays sous le seuil de ${R_FLOOR} px`,
  );
console.log("");

/** ONE DERIVATION OF A RADIUS, READ BY BOTH HALVES OF THE GESTURE. The component draws the table's
 *  and the legend's swatches from `radiiUnder`; the live plan is built from the SAME arithmetic, and
 *  `assertSymbolLawsReachTheLayers` re-derives it a third time from the raw values to hold the plan
 *  against the markup. A second derivation is precisely the "half the beat re-sizes and the other
 *  half keeps the law before it" defect, now able to happen across two mechanisms. */
const MAX_VALUE = maxValueOf(scale);
const VALUE_OF = new Map(rows.map((r) => [r.key, r.mw]));
const EXPONENT_OF = new Map(LAWS.map((law) => [areaScaleSlugOf(law.key), law.exponent]));
const radiusFor = (markKey, lawSlug) =>
  radiusUnder(VALUE_OF.get(markKey), MAX_VALUE, R_MAX, EXPONENT_OF.get(lawSlug));

/** WHICH COUNTRIES THE MAP LABELS: the claim's own five, not "whatever happens to be big enough". A
 *  radius threshold labelled seven here, and the two it added are Norvège and Suède, whose weighted
 *  fleet centres are close enough for their labels to collide. The claim names five, and the set is
 *  the same in every state, so no word appears or disappears when the reader changes law. */
const LABELLED = new Set(topFive.map((r) => r.key));
/** The smallest DEFAULT-law radius a circle may have and still be asked to hold two lines of 13 px
 *  text. Two lines need roughly 30 px of height, and a circle of 22 px radius has 44. */
const LABEL_MIN_RADIUS = 22;
for (const r of rows)
  if (LABELLED.has(r.key) && radiusFor(r.key, areaScaleSlugOf(LAWS[0].key)) < LABEL_MIN_RADIUS)
    throw new Error(
      `${NAMES[r.country]} is labelled on the map and its circle is ` +
        `${radiusFor(r.key, areaScaleSlugOf(LAWS[0].key)).toFixed(1)} px of radius under the resting ` +
        `law, below the ${LABEL_MIN_RADIUS} two lines of 13 px text need. A name printed outside the ` +
        `mark it names is the label placement this type's own sheet puts first among its failures.`,
    );

const symbols = rows.map((r, index) => ({
  key: r.key,
  name: NAMES[r.country],
  figure: `${fr(r.mw / 1000, 0)} GW`,
  rank: index + 1,
  lon: r.lon,
  lat: r.lat,
  label: LABELLED.has(r.key) ? `${NAMES[r.country]}\n${fr(r.mw / 1000, 0)} GW` : null,
  detail:
    `${NAMES[r.country]} · ${fr(r.mw / 1000)} GW bas-carbone (${fr((r.mw / totalMw) * 100)} % de ` +
    `l'Europe) · ${plain(r.count.toLocaleString("fr-FR"))} centrales · eau + atome ` +
    `${fr((r.old / r.mw) * 100)} %, vent + soleil ${fr((r.fresh / r.mw) * 100)} %`,
}));

const keySizes = keyValues.map((k) => ({ key: k.key, label: `${fr(k.value / 1000, 0)} GW` }));

const facts = beatFacts(
  rows.map((r) => ({ key: r.country, label: NAMES[r.country], value: r.mw })),
  { subject: NAMES[biggest.country], declaredSequence: "MW" },
);
const offered = applicableTreatments(facts);
console.log(`treatments applicable: ${offered.map((t) => t.id).join(", ") || "(none)"}\n`);

const title = `Cinq pays portent ${fr(topShare, 0)} % de la capacité bas-carbone européenne`;
// THE CAVEAT NAMES THE COST OF THE PROJECTION IN NUMBERS, because a reader who is not told reads ink
// as area — and it names WHICH ink, because on this type the circles are not the ink Mercator moves.
const caveat =
  `Un cercle par pays, sa SURFACE proportionnelle à la capacité bas-carbone installée, posé au ` +
  `centre pondéré de ses propres centrales et translucide, pour qu'un recouvrement se voie. Carte ` +
  `MapTiler plate, en Web Mercator : les cercles gardent leur taille à l'écran et leurs rapports ` +
  `sont donc exacts, mais le PAYS sous le cercle est gonflé au nord — la Norvège, la Suède et la ` +
  `Finlande couvrent ${fr(NORTH_PAGE_SHARE, 0)} % de la terre dessinée pour ` +
  `${fr(NORTH_TRUE_SHARE, 0)} % de la terre réelle.`;
const claimNote =
  `${topFive.map((r) => `${NAMES[r.country]} ${fr(r.mw / 1000, 0)} GW`).join(", ")} — ` +
  `${fr(topShare, 0)} % des ${fr(totalMw / 1000, 0)} GW du continent, sur ` +
  `${plain(stations.length.toLocaleString("fr-FR"))} centrales.`;
const readingLine =
  `Lecture : l'exposant qui fait la taille des cercles est le seul réglage qu'une carte à symboles ` +
  `ne montre jamais — il est ci-dessus, et aucun pays ne bouge quand on en change. Sans JavaScript ` +
  `le geste ne quitte pas la page : il passe dans le tableau, dont les 41 pastilles suivent la même ` +
  `loi en CSS pur.`;
const source = `Source : Global Power Plant Database (WRI) · fond de carte MapTiler`;
const TABLE_CAPTION =
  `Les ${fr(rows.length, 0)} pays, leur capacité et leur cercle — au ` +
  `${fr(27.5, 1)} % de l'échelle de la carte, tous les rapports intacts`;
const COLUMNS = ["Pays", "Capacité", "Rang"];
/** THE MAP'S OWN ACCESSIBLE DESCRIPTION, and the last sentence is the promise this arrangement makes
 *  about the beat's own claim: the window moves, the scale of the areas does not. Every glyph of it
 *  is in the markup and it is declared here, once, so the register census cuts the page's faces for
 *  it. */
const LIVE_HINT =
  "Carte interactive : glissez-la pour la déplacer, pincez ou utilisez les boutons plus et moins " +
  "pour zoomer, les flèches du clavier la déplacent une fois qu'elle a le focus. Les cercles et la " +
  "légende gardent leur taille à l'écran : la carte s'approche, l'échelle des aires ne change pas.";

/** THE INTERACTION, WRITTEN BEFORE THE CODE (`BRIEF.md`) and carried into the render so the two
 *  cannot drift. `assertInteractionPlan` refuses a control shipped and not declared, and a control
 *  declared and not shipped. */
const interaction = {
  earns:
    `Une carte à symboles cache l'exposant de sa propre échelle : le classement est juste sous ` +
    `n'importe quelle loi, et l'écart entre les cercles — la seule chose que la carte prouve — est ` +
    `un paramètre libre que l'auteur a fixé en silence. Un still ne peut qu'en choisir un et ` +
    `demander qu'on lui fasse confiance ; cette page le met dans la main du lecteur et chiffre ce ` +
    `que chaque loi fait dire à la même carte.`,
  controls: [
    {
      question: `De combien la France est-elle vraiment plus grande que la Grèce ?`,
      gesture: "toggle-a-comparison",
      changes:
        `Chaque cercle change de rayon et rien d'autre : aucun centre ne bouge, aucune étiquette ne ` +
        `bouge, le plus gros cercle reste au même rayon dans les trois états, la légende de taille ` +
        `se remet à l'échelle avec les marques, et la phrase révélée chiffre le rapport de surfaces ` +
        `montré, le rapport réel des capacités, et le nombre de pays que la loi efface.`,
    },
    {
      question: `Et si je veux les quarante et un, sans la carte — ou sans JavaScript ?`,
      gesture: "open-the-full-table",
      changes:
        `Les 41 lignes s'ouvrent sous la carte, dans l'ordre des capacités, chacune avec sa propre ` +
        `pastille. Cette pastille suit la loi choisie en CSS pur : c'est là que le geste éditorial ` +
        `survit quand la carte, elle, ne peut pas — aucune feuille de style n'atteint une couche ` +
        `MapLibre, donc la moitié carte du geste est du script et la moitié tableau n'en est pas.`,
    },
    {
      question: `Que vaut ce cercle-là, et de quoi est-il fait ?`,
      gesture: "ask-a-mark",
      changes:
        `Le cercle lui-même se déplace depuis son propre remplissage, mesuré à travers sa ` +
        `translucidité, et répond avec le pays, ses GW, sa part de l'Europe, son nombre de ` +
        `centrales et le partage entre eau-et-atome et vent-et-soleil. Dans un amas, c'est le plus ` +
        `PETIT cercle sous le pointeur qui répond : c'est celui dont on voit le bord.`,
    },
    {
      question: `Où exactement, dans son propre pays, ce cercle est-il posé ?`,
      gesture: "zoom-and-pan",
      changes:
        `La carte est une vraie carte MapTiler, avec les contrôles de MapLibre eux-mêmes : glisser, ` +
        `molette, pincement, clavier. Les cercles gardent leur taille à l'écran — une capacité ne ` +
        `peut pas valoir deux cercles à deux zooms — donc la légende de taille dit toujours vrai. On ` +
        `ne peut ni dézoomer sous le cadrage publié ni s'approcher au point de perdre la France de vue.`,
    },
  ],
};

const textPerRegister = {
  display: title,
  eyebrow: EYEBROW,
  body:
    `${caveat} ${readingLine} ${source} ${scale.label} ${scale.options.map((o) => o.label).join(" ")}`,
  axis:
    `${keySizes.map((k) => k.label).join(" ")} ${TABLE_CAPTION} ${COLUMNS.join(" ")} ` +
    `${symbols.map((s) => `${s.name} ${s.figure} ${s.rank}`).join(" ")}`,
  annot:
    `${claimNote} ${scale.options.filter((o) => o.note).map((o) => o.note).join(" ")} ${LIVE_HINT}`,
  value: symbols.filter((s) => s.label).map((s) => `${s.name} ${s.figure}`).join(" "),
};
for (const key of Object.keys(textPerRegister)) textPerRegister[key] = plain(textPerRegister[key]);

const filed = readdirSync(DIRECTIONS).filter((f) => f.endsWith(".md")).map((f) => readDirection(join(DIRECTIONS, f)));
const newsroom = readPalette(HERE, { stopAt: join(HERE, "..") });
const BEAT_FACTS = { evidenceLevels: 3 };
console.log(report(composeDirections({ newsroom, filed, beat: BEAT_FACTS, textPerRegister }), { beat: BEAT_FACTS }));
console.log("");

// ── WHAT THE SECOND LAYER IS MADE OF, READ ONCE ──────────────────────────────────────────────
//
// MapLibre and its stylesheet are INLINED into every page rather than linked: a `<script src>` would
// trade the payload for a SECOND third-party host, and inlining keeps the count at one —
// api.maptiler.com. `style.mjs` travels as SOURCE with its `export` keywords stripped, because a
// page script cannot import: the sweep that decides what a basemap layer becomes is stated once, in
// that file, and applied twice — to the style document the plate was baked from, and to the live
// style in the reader's browser.
const requireFrom = createRequire(import.meta.url);
const MAPLIBRE_JS = await readFile(requireFrom.resolve("maplibre-gl/dist/maplibre-gl.js"), "utf8");
const MAPLIBRE_CSS = await readFile(requireFrom.resolve("maplibre-gl/dist/maplibre-gl.css"), "utf8");
const STYLE_MODULE = (
  await readFile(join(HERE, "..", "..", "skills", "map-web", "assets", "style.mjs"), "utf8")
).replace(/^export /gm, "");

const FALLBACK_DIR = join(HERE, "fallback");
/** THE REFERENCE WINDOW the frozen fallback is photographed at — the window the beat is reviewed at,
 *  so the image is the delivered box's own shape and `slice` crops nothing there. At 2x, so it is not
 *  soft on the screen the owner reviews on. */
const FALLBACK_WINDOW = { width: 1512, height: 860, scale: 2 };
const BLANK_PNG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
const KEY = process.env.MAPTILER_KEY ?? process.env.REMOTION_MAPTILER_KEY ?? process.env.VITE_MAPTILER_KEY ?? "";
const PLACEHOLDER = `__MAPTILER${"_KEY__"}`;
const localPageOf = (pagePath) => pagePath.replace(/\.html$/, ".local.html");

/**
 * THE FACE THE MAP'S OWN LABELS ARE DRAWN IN, and it is not a CSS stack.
 *
 * MapLibre does not draw with a system font: it reads signed distance fields served by the style,
 * and MapTiler answers 200 WITH NOTO SANS for every family it does not have — `shared/map-beat/
 * glyphs.mjs` measured `Futura Medium`, `Avenir Next`, `Georgia` and `Zzz Fictive Regular` all
 * returning the same 83 352-byte file. So a map that asks for the wrong name is set in a typeface
 * nobody chose and nothing reports it.
 *
 * The design base's `sans` and `geometric sans` ladders head with Open Sans and Montserrat, both of
 * which MapTiler serves, so the map label and the panel label beside it are one design — one served
 * as glyphs, one fetched as a file. The face suffix is required (a bare family is the fallback
 * again), and the bytes are PROBED against Noto's own rather than assumed whenever a key is present.
 */
const FACE_FOR_WEIGHT = (weight) => (Number(weight) >= 600 ? "Bold" : "Regular");
const probed = new Map();
async function labelFontFor(direction, register = "value") {
  const spec = direction.registers[register];
  const stack = [`${spec.family} ${FACE_FOR_WEIGHT(spec.weight)}`, `${spec.family} Regular`];
  if (!KEY) return stack;
  for (const face of stack) {
    if (probed.has(face)) continue;
    const fallback = probed.get("__noto") ?? (await maptilerGlyphs("Noto Sans Regular", "0-255", KEY));
    probed.set("__noto", fallback);
    assertNotFallback(await maptilerGlyphs(face, "0-255", KEY), fallback, face);
    probed.set(face, true);
    console.log(`glyphes MapTiler : « ${face} » servie, et ce ne sont pas les octets de Noto Sans`);
  }
  return stack;
}

/**
 * PHOTOGRAPH THE PAGE'S OWN LIVE MAP, and write it where the page will embed it.
 *
 * The key is substituted into a copy under the system temp directory, never beside the page and
 * never inside the repository — `no-key-in-the-repository` scans the working tree. The copy is
 * removed whether the bake succeeds or not.
 *
 * It REFUSES rather than writing something: a fallback baked from a map that never loaded is a
 * picture of the failure it exists to replace, and it would ship looking like a success.
 */
async function bakeFallback(pagePath, outFile, id) {
  if (!KEY)
    throw new Error(
      "the frozen fallback is photographed from this page's own live map, so the bake needs a " +
        "MapTiler key in the environment (MAPTILER_KEY). Without one the page would ship with a " +
        "blank pixel where its map should be.",
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
    // Every tile of the view drawn, not merely requested — and every label placed.
    await page.evaluate(
      () =>
        new Promise((resolve) => {
          const map = window.__mwMap;
          if (map.loaded() && map.areTilesLoaded()) return resolve();
          map.once("idle", resolve);
        }),
    );
    await new Promise((r) => setTimeout(r, 800));
    // WHAT MAPLIBRE'S OWN COLLISION KEPT. A symbol layer answers `queryRenderedFeatures` only for
    // the symbols it actually PLACED, so this is the measurement the SVG build made by hand and
    // this architecture hands to the library: how many of the labelled marks are on the page.
    const placed = await page.evaluate(() => {
      const map = window.__mwMap;
      if (!map.getLayer("mw-labels")) return [];
      const canvas = map.getCanvas();
      return map
        .queryRenderedFeatures(
          [
            [0, 0],
            [canvas.clientWidth, canvas.clientHeight],
          ],
          { layers: ["mw-labels"] },
        )
        .map((f) => f.properties.name);
    });
    const box = await page.$(".map-layer");
    if (!box) throw new Error("the page carries no live map box to photograph");
    await mkdir(dirname(outFile), { recursive: true });
    const png = `${outFile}.png`;
    const shot = await box.boundingBox();
    await box.screenshot({ path: png });
    // Lossless would be honest and is several times the bytes on flat fills; `-q 92` is visually the
    // same picture and keeps a page that already inlines MapLibre inside a megabyte and a half.
    const encode = spawnSync("cwebp", ["-quiet", "-q", "92", png, "-o", outFile], { stdio: "inherit" });
    if (encode.status !== 0) throw new Error(`cwebp exited with ${encode.status} baking ${id}'s fallback`);
    rmSync(png, { force: true });
    console.log(
      `fallback ${id} → ${outFile.replace(`${HERE}/`, "")} · ${Math.round(shot.width)}x${Math.round(shot.height)} CSS px · ` +
        `étiquettes posées par la collision MapLibre : ${placed.length}/${LABELLED.size}` +
        (placed.length ? ` (${placed.join(", ")})` : ""),
    );
    return { width: Math.round(shot.width), height: Math.round(shot.height), placed };
  } finally {
    await browser.close();
    rmSync(dir, { recursive: true, force: true });
  }
}

const refused = [];
for (const file of DIRECTION_FILES) {
  const id = file.replace(/\.md$/, "");
  const base = readDirection(join(DIRECTIONS, file));
  const direction = resolveDirectionFamilies(base, textPerRegister);
  const furniture = deriveFurniture(base.ground);
  // THE LIVE STYLE IS PAINTED IN WHAT THE READER IS ACTUALLY LOOKING AT. The water is the plate's own
  // baked tint; the LAND is the 10 % step off the ground that every symbol's contrast on this page
  // was measured against — the component asserts it, and a land painted at some other step would
  // move every one of those measurements without moving the numbers that record them.
  const tints = { water: plateTints(base).water, land: mix(base.ground, furniture.ink, 0.1) };
  // THE PAINT IS THE COMPONENT'S OWN, not a second set. `symbolPaint` searches the dose that moves a
  // pointed-at mark off its own fill THROUGH the 50 % opacity, and refuses a direction whose ring
  // stops clearing the non-text floor against the land the live style is about to paint. The live
  // layer is handed exactly what the drawing found.
  const paint = symbolPaint({ ground: base.ground, accent: base.accent, ink: furniture.ink });
  if (paint.landFill !== tints.land)
    throw new Error(
      `the live style would paint its land ${tints.land} and every contrast on this page was ` +
        `measured against ${paint.landFill}. One ground, or the measurements record a page nobody ` +
        `renders.`,
    );
  const countries = countryGround({
    ground: base.ground,
    land: tints.land,
    water: tints.water,
    ink: furniture.ink,
  });

  const live = {
    style: plateFacts.style,
    tints,
    /** THE BEAT DRAWS THE COUNTRIES ITSELF, BECAUSE THE CIRCLES DO NOT.
     *
     *  The owner's verdict on the page this replaces: « les cartes ne sont pas stylisées derrière ».
     *  The first answer kept MapTiler's own frontier lines and place names and re-inked them, and he
     *  read the result against the choropleth he had just validated — « pourquoi tu ne reprends pas
     *  dans l'idée la map qu'on avait dans le choroplèthe ? » A kept provider layer reads as a
     *  provider basemap with our tints on it; the choropleth reads as OUR map because it draws its
     *  forty countries itself, as its own MapLibre layers over MapTiler's Countries tileset joined
     *  by ISO A2, with the provider's lines and words swept away.
     *
     *  So this beat takes that mechanism. The one difference is what a fill MEANS: there a class,
     *  here neutral ground — one land tint under 41 circles, derived from the direction and measured
     *  to sit well below them. */
    countries,
    studyBounds: STUDY,
    reviewBox: REVIEW_BOX,
    marks: symbols.map((s) => ({
      key: s.key,
      name: s.name,
      lon: s.lon,
      lat: s.lat,
      detail: s.detail,
      label: s.label,
    })),
    // THE PLAN'S RADII COME FROM THE DECLARATION, THE WAY THE MARKUP'S DO. `radiiUnder` is the
    // function `DirectedSymbolMapWeb` draws its 41 table swatches and its 3 legend swatches from, so
    // the map and the markup are one mapping. The GUARD below is handed a different one —
    // `radiusFor`, which goes back to the raw value and the raw exponent — and that is deliberate: a
    // guard built from the object the plan was built from is two readings of one variable, and the
    // choropleth's own guard passed a mutation green for exactly that reason.
    laws: LAWS.map((law, i) => {
      const radii = radiiUnder(scale, scale.options[i]);
      return {
        slug: areaScaleSlugOf(law.key),
        radiusByKey: Object.fromEntries(symbols.map((s) => [s.key, radii.get(s.key)])),
      };
    }),
    defaultSlug: areaScaleSlugOf(LAWS[0].key),
    floorPx: R_FLOOR,
    paint: {
      fill: paint.symbolFill,
      fillOpacity: paint.opacity,
      ring: paint.symbolFill,
      ringWidth: paint.ringWidth,
      active: paint.markActive,
      labelInk: paint.labelInk,
      labelSize: 13,
      labelFont: [],
    },
    locale: {
      title: "Carte de la capacité bas-carbone européenne",
      zoomIn: "Zoom avant",
      zoomOut: "Zoom arrière",
    },
    changeMs: 380,
    subject: { name: NAMES[biggest.country], spanDeg: SUBJECT_SPAN_DEG },
    hint: LIVE_HINT,
  };

  try {
    // THE MAP'S OWN LABEL FACE, probed rather than named: MapTiler answers 200 with Noto Sans for a
    // family it does not serve, so this is the only place the substitution can be caught.
    live.paint.labelFont = await labelFontFor(direction);
    const markOnLand = contrast(live.paint.ring, countries.fill);
    console.log(
      `${id} · fond : terre ${countries.measured.fillOnWater.toFixed(2)}:1 sur la mer et ` +
        `${countries.measured.fillOnGround.toFixed(2)}:1 sur le fond de page, frontière ` +
        `${countries.measured.borderOnFill.toFixed(2)}:1 sur cette terre — l'anneau d'un symbole, ` +
        `lui, lit ${markOnLand.toFixed(2)}:1 sur la même terre`,
    );

    const stamp = createHash("sha256")
      .update(JSON.stringify(liveSymbolsPlan(live)))
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

    const pageOf = (plate, box) =>
      renderWeb({
        component: DirectedSymbolMapWeb,
        props: {
          plate,
          symbols,
          keySizes,
          scale,
          reviewBox: REVIEW_BOX,
          livePlan: liveSymbolsPlan(live),
          liveScript: liveSymbolsScript(live, {
            scope: ".chart-figure",
            styleModule: STYLE_MODULE,
            lawName: "chart-stack",
          }),
          liveHint: LIVE_HINT,
          maplibreCss: MAPLIBRE_CSS,
          maplibreJs: MAPLIBRE_JS,
          tableCaption: TABLE_CAPTION,
          columns: COLUMNS,
          aspect: box.width / box.height,
          size: box.width,
          title, eyebrow: EYEBROW, caveat, source, reading: readingLine, claimNote,
          alt:
            `Une carte d'Europe sur fond MapTiler portant un cercle par pays, dont la SURFACE est ` +
            `proportionnelle à sa capacité bas-carbone. Le plus grand, ${NAMES[biggest.country]}, ` +
            `fait ${fr(biggest.mw / 1000, 0)} GW ; viennent ensuite ` +
            `${topFive.slice(1).map((r) => NAMES[r.country]).join(", ")}. Ces cinq cercles couvrent ` +
            `${fr(topShare, 0)} % de la capacité du continent ; le reste de la carte est un semis de ` +
            `petits cercles. Une commande au-dessus de la carte change la loi qui transforme une ` +
            `capacité en taille de cercle, sans déplacer aucun pays. La carte elle-même est vivante : ` +
            `elle se déplace et se zoome avec les contrôles de MapTiler, sans que la taille des ` +
            `cercles change.`,
          interaction,
          direction,
          ground: direction.ground,
          accent: direction.accent,
        },
        outDir: OUT,
        name: `${id}.html`,
      });

    if (!record) {
      // A DRAFT FIRST, with a blank pixel under the live map, because the thing being photographed
      // is the live map on THIS page rather than a second rendering of the same plan somewhere else.
      await pageOf(BLANK_PNG, REVIEW_BOX);
      const shot = await bakeFallback(join(OUT, `${id}.html`), image, id);
      await mkdir(FALLBACK_DIR, { recursive: true });
      record = { stamp, ...shot };
      await writeFile(stampFile, `${JSON.stringify(record)}\n`);
    }
    const plate = `data:image/webp;base64,${(await readFile(image)).toString("base64")}`;
    const { outPath } = await pageOf(plate, record);
    // THE KEYED COPY FOR REVIEW, beside the page and git-ignored. The owner: « non, comme pour les
    // scrolly il faut toujours une clé sinon ça sert à rien ». The COMMITTED page keeps the
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
    // THE MARKUP'S HALF OF THE GESTURE: the 41 table swatches and the 3 legend swatches, re-sized in
    // pure CSS. Dropping the stylesheet call leaves every attribute perfectly correct and every state
    // drawn on top of every other.
    assertOneAreaScale(written, scale, `renders/${id}.html`);
    // THE LAYERS' HALF, held against a THIRD derivation of the same exponent over the same raw
    // values. Neither guard can see the other's mechanism, and the crossing between them is exactly
    // where this architecture can put one exponent on the map and a different one in the table.
    assertSymbolLawsReachTheLayers(written, live, radiusFor, plateFacts.style, {
      where: `renders/${id}.html`,
    });
    console.log(`${id} -> renders/${id}.html`);
  } catch (error) {
    refused.push({ id, why: error.message });
    console.log(`${id} REFUSED — ${error.message}`);
    // A refused direction must not leave its previous render on disk to be mistaken for this one.
    await rm(join(OUT, `${id}.html`), { force: true });
    await rm(localPageOf(join(OUT, `${id}.html`)), { force: true });
  }
}
if (refused.length) {
  console.log(`\nrefused by ${refused.length}: ${refused.map((x) => x.id).join(", ")}`);
  // A runner that swallows a refusal makes a refused page look like a produced one, and leaves the
  // previous render on disk to be mistaken for this one.
  process.exitCode = 1;
}
