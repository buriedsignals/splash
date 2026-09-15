// twin/proof/web-locator-zaporizhzhia/render-directions-web.mjs
//
// Where Europe's largest low-carbon power station is, rendered once per FILED DIRECTION into a
// self-contained interactive page — and the reader is handed the one decision this type hides.
//
// THE REMOVE IS THE GESTURE. A locator has no magnitude, no rate and no gradient; everything it says
// is decided by how far back the author stood, and a still can stand at only one distance. This
// beat's four removes are derived from the data, not chosen by eye: a ladder of windows around the
// subject, each at least twice the ground of the one before it, each with its own drawing rule, its
// own census of what the frame holds, its own scale bar and its own derived sentence.
//
// EVERY NUMBER BELOW IS DERIVED FROM THE FROZEN FILES BESIDE THIS SCRIPT. The browser computes no
// distance, cuts no set and formats no number.
//
// Usage:  bun proof/web-locator-zaporizhzhia/render-directions-web.mjs

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
import {
  mix,
  contrast,
  adjustToContrast,
  readPalette,
  NON_TEXT_CONTRAST_MIN,
} from "#shared/chart-beat/colour.mjs";
import { deriveFurniture } from "#shared/chart-beat/render-still.mjs";
import { beatFacts, applicableTreatments } from "#shared/chart-beat/treatments.mjs";
import { readDirection } from "#shared/design-base/read-direction.mjs";
import { composeDirections, report } from "#shared/design-base/compose.mjs";
import { resolveDirectionFamilies } from "#shared/design-base/resolve-families.mjs";
import { plainSpaces } from "#shared/design-base/web.mjs";
import { renderWeb } from "../../skills/chart-web/scripts/render-web.mjs";
import {
  assertOneVantage,
  vantageSlugOf,
} from "../../skills/map-web/assets/vantage.ts";
import {
  assertVantageReachesTheLayers,
  liveLocatorPlan,
  liveLocatorScript,
} from "../../skills/map-web/assets/live-locator.ts";
import { CHANGE_MS, DirectedLocatorWeb, VANTAGE_ID_PREFIX } from "./DirectedLocatorWeb.tsx";

const HERE = dirname(fileURLToPath(import.meta.url));
const DIRECTIONS = join(HERE, "..", "..", "docs", "design-base", "directions");
const OUT = join(HERE, "renders");
const EYEBROW = "Énergie · Europe";
const EARTH_KM = 6371.0088;
const RAD = Math.PI / 180;
/** How many stations one remove may draw, however many its frame holds. A locator with hundreds of
 *  markers "isn't really answering 'where, exactly' anymore" (`types/locator.md`), and the sheet's
 *  own answer is a DECLARED PRIORITY rather than a smaller map — so capacity decides which twelve
 *  survive, and the page prints how many it dropped. Capacity never decides a SIZE. */
const STATIONS_DRAWN = 12;
/** How many settlements one remove may draw. Six names is what a frame this shape holds before the
 *  names start deciding the layout instead of the geography. */
const PLACES_DRAWN = 6;
/** The round distances a scale bar is allowed to state. A bar is picked as the largest of these that
 *  stays under a third of the frame — a bar longer than that is a ruler the picture cannot hold. */
const BAR_LADDER = [10, 20, 50, 100, 200, 500, 1000, 2000];

const FRENCH_PLACE = {
  Kyiv: "Kiev", Kharkiv: "Kharkiv", Dnipro: "Dnipro", Odessa: "Odessa", Donetsk: "Donetsk",
  Rostov: "Rostov", Bucharest: "Bucarest", Voronezh: "Voronej", "Chișinău": "Chisinau",
  Krasnodar: "Krasnodar", Sevastopol: "Sébastopol", Stavropol: "Stavropol",
  Mariupol: "Marioupol", Kherson: "Kherson", Simferopol: "Simferopol", Luhansk: "Louhansk",
  Zhytomyr: "Jytomyr", "Iași": "Iasi", "Constanța": "Constanta", Sochi: "Sotchi",
  Sukhumi: "Soukhoumi",
};
const FRENCH_FUEL = {
  Nuclear: "nucléaire", Hydro: "hydraulique", Wind: "éolien", Solar: "solaire",
  Biomass: "biomasse", Geothermal: "géothermie", Waste: "déchets",
};
const FRENCH_COUNTRY = {
  Ukraine: "Ukraine", Russia: "Russie", Romania: "Roumanie", Moldova: "Moldavie",
  Bulgaria: "Bulgarie", Turkey: "Turquie", Poland: "Pologne", Belarus: "Biélorussie",
  Hungary: "Hongrie", Slovakia: "Slovaquie", Georgia: "Géorgie", Serbia: "Serbie",
  Austria: "Autriche", France: "France", Germany: "Allemagne", Spain: "Espagne",
  Sweden: "Suède", Finland: "Finlande", Norway: "Norvège", Switzerland: "Suisse",
  Czechia: "Tchéquie", "Czech Republic": "Tchéquie", Italy: "Italie", Croatia: "Croatie",
  Slovenia: "Slovénie", "Bosnia and Herzegovina": "Bosnie-Herzégovine", Albania: "Albanie",
  Greece: "Grèce", Portugal: "Portugal", Netherlands: "Pays-Bas", Belgium: "Belgique",
  Denmark: "Danemark", Estonia: "Estonie", Latvia: "Lettonie", Lithuania: "Lituanie",
  Iceland: "Islande", Ireland: "Irlande", "United Kingdom": "Royaume-Uni", Luxembourg: "Luxembourg",
  Montenegro: "Monténégro", "North Macedonia": "Macédoine du Nord", Armenia: "Arménie",
  Azerbaijan: "Azerbaïdjan", Cyprus: "Chypre", Malta: "Malte", Kosovo: "Kosovo",
};

const plain = (s) => plainSpaces(s);
const fr = (v, d = 1) =>
  plain(v.toLocaleString("fr-FR", { minimumFractionDigits: d, maximumFractionDigits: d }));
const n0 = (v) => plain(Math.round(v).toLocaleString("fr-FR"));
const countryName = (name) => FRENCH_COUNTRY[name] ?? name;

const readCsv = async (file) => {
  const lines = (await readFile(join(HERE, file), "utf8")).trim().split(/\r?\n/);
  const header = lines[0].split(",");
  return lines.slice(1).map((line) => {
    const cells = line.split(",");
    const row = Object.fromEntries(header.map((h, i) => [h, cells[i]]));
    row.lon = Number(row.lon);
    row.lat = Number(row.lat);
    return row;
  });
};

/** GREAT-CIRCLE DISTANCE, on the sphere. Every distance this beat prints is a distance on the
 *  ground: one measured off the drawing would be a distance in pixels wearing a kilometre's
 *  clothes, and on a Mercator page it would be wrong by the very factor this beat is about. */
const kmBetween = (a, b) => {
  const dLat = (b.lat - a.lat) * RAD;
  const dLon = (b.lon - a.lon) * RAD;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a.lat * RAD) * Math.cos(b.lat * RAD) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_KM * Math.asin(Math.min(1, Math.sqrt(s)));
};

// ── the station, and the claim, asserted ──────────────────────────────────────────────────────
const stations = (await readCsv("stations.csv")).map((s) => ({
  ...s,
  capacity_mw: Number(s.capacity_mw),
}));
const biggest = stations.reduce((a, b) => (b.capacity_mw > a.capacity_mw ? b : a));
if (biggest.country !== "Ukraine")
  throw new Error(`the headline says the largest is in Ukraine; it is in ${biggest.country}`);
if (!(biggest.capacity_mw >= 6000))
  throw new Error(`the headline says 6 000 MW; it is ${biggest.capacity_mw}`);

/** THE SUBJECT IS IN UKRAINE, CHECKED AGAINST A GEOMETRY RATHER THAN AGAINST A COLUMN. The CSV's
 *  own `country` cell is what the data publisher typed; the frozen shapes are where the border is.
 *  This is the one thing `shapes.geojson` is still read for — the live map takes its outlines from
 *  MapTiler's Countries tileset, because an outline frozen for a 260 km frame is a smear at 5 000
 *  and one frozen for 5 000 cuts a river in half at 260. */
const geo = JSON.parse(await readFile(join(HERE, "shapes.geojson"), "utf8"));
const ringHolds = (ring, [x, y]) => {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
};
const ukraine = geo.features.find((f) => f.properties.iso === "UKR");
if (!ukraine) throw new Error("shapes.geojson carries no UKR feature to check the claim against");
const ukrPolys =
  ukraine.geometry.type === "Polygon" ? [ukraine.geometry.coordinates] : ukraine.geometry.coordinates;
if (!ukrPolys.some((poly) => ringHolds(poly[0], [biggest.lon, biggest.lat])))
  throw new Error(
    `the headline says the largest low-carbon station in this file is in Ukraine, and the point ` +
      `${biggest.lon},${biggest.lat} the file gives it does not fall inside Ukraine's own polygon`,
  );

const places = (await readCsv("places.csv")).map((p) => ({ ...p, pop: Number(p.pop) }));
for (const place of places)
  if (!FRENCH_PLACE[place.name]) throw new Error(`no French name recorded for ${place.name}`);

// ── THE LADDER OF REMOVES, DERIVED ────────────────────────────────────────────────────────────
//
// Three of the four windows are boxes around the subject at a stated radius; the fourth is the
// EXTENT OF THE FILE ITSELF, which is the only honest way to say "Europe" here: the claim is about
// what this database holds, so the widest answer is the database's own frame.
//
// The radii are not tastes. Each one is the distance at which the ANSWER to "what is it near"
// changes: 130 km is the Dnieper cascade and one city; 320 km reaches the country's other nuclear
// plant; 800 km reaches its neighbours' fleets; the file's own extent reaches the continent the
// headline claims. The vocabulary refuses any two of them that are not a factor of two apart.
const kmPerDegLon = 111.320 * Math.cos(biggest.lat * RAD);
const kmPerDegLat = 110.574;
const boxAround = (radiusKm) => ({
  west: biggest.lon - radiusKm / kmPerDegLon,
  east: biggest.lon + radiusKm / kmPerDegLon,
  south: biggest.lat - radiusKm / kmPerDegLat,
  north: biggest.lat + radiusKm / kmPerDegLat,
});
const FILE_EXTENT = {
  west: Math.min(...stations.map((s) => s.lon)),
  east: Math.max(...stations.map((s) => s.lon)),
  south: Math.min(...stations.map((s) => s.lat)),
  north: Math.max(...stations.map((s) => s.lat)),
};
const inWindow = (w, p) =>
  p.lon >= w.west && p.lon <= w.east && p.lat >= w.south && p.lat <= w.north;

const LADDER = [
  { key: "site", label: "Le site", radius: 130, places: true },
  { key: "region", label: "La région", radius: 320, places: true },
  { key: "voisinage", label: "Le voisinage", radius: 800, places: true },
  // AT THE WIDEST REMOVE, NO CITY IS DRAWN, AND THAT IS THE EDITORIAL ACT THIS GESTURE IS ABOUT.
  // `places.csv` knows the settlements around the subject and no others — it was frozen for a
  // regional locator. At 5 000 km those six names do not place a reader on a continent, they place
  // the reader back in the region they just left, and a Europe-wide frame labelled only with
  // Ukrainian and Russian cities is a picture that looks like a mistake. What places a reader here
  // is the other stations and the borders. Stated in the remove's own drawing rule rather than
  // quietly done.
  { key: "europe", label: "L'Europe", radius: null, places: false },
];

const barFor = (spanKm) =>
  [...BAR_LADDER].reverse().find((km) => km <= spanKm / 3) ?? BAR_LADDER[0];

/** HOW MUCH ROOM A REMOVE LEAVES AROUND WHAT IT DRAWS, as a fraction of its own box. A mark on the
 *  frame's own edge is a mark the reader reads as "and there is more of this just outside" — which
 *  on a locator is the one thing the frame is supposed to settle. */
const WINDOW_PAD = 0.1;

const removes = LADDER.map((rung) => {
  /** THE SELECTION BOX — a circle around the subject, in kilometres, and it decides only WHICH marks
   *  are candidates at this remove. It is not the camera: a near-square box fitted into the wide box
   *  the full-width ruling hands the plot is HEIGHT-bound and spills three times its own width in
   *  longitude, and on a beat about distance that surplus should not be what the reader is looking
   *  at. */
  const selection = rung.radius === null ? FILE_EXTENT : boxAround(rung.radius);
  const heldStations = stations
    .filter((s) => s !== biggest && inWindow(selection, s))
    .sort((a, b) => b.capacity_mw - a.capacity_mw);
  const heldPlaces = places
    .filter((p) => inWindow(selection, p))
    .sort((a, b) => b.pop - a.pop);
  const drawnStations = heldStations.slice(0, STATIONS_DRAWN);
  const drawnPlaces = rung.places ? heldPlaces.slice(0, PLACES_DRAWN) : [];
  /** THE CAMERA'S WINDOW IS THE BOX OF WHAT THIS REMOVE ACTUALLY DRAWS, padded — derived from the
   *  marks rather than typed, so it cannot frame ground the remove has nothing to say about and
   *  cannot cut a mark it drew. Its ASPECT then follows the marks too, which is what keeps the
   *  height-bound surplus down to something a reader can still read as one place. */
  const drawn = [{ lon: biggest.lon, lat: biggest.lat }, ...drawnStations, ...drawnPlaces];
  const raw = {
    west: Math.min(...drawn.map((m) => m.lon)),
    east: Math.max(...drawn.map((m) => m.lon)),
    south: Math.min(...drawn.map((m) => m.lat)),
    north: Math.max(...drawn.map((m) => m.lat)),
  };
  const padLon = Math.max((raw.east - raw.west) * WINDOW_PAD, 0.25);
  const padLat = Math.max((raw.north - raw.south) * WINDOW_PAD, 0.25);
  const window = {
    west: raw.west - padLon,
    east: raw.east + padLon,
    south: raw.south - padLat,
    north: raw.north + padLat,
  };
  const spanKm = (window.east - window.west) * kmPerDegLon;
  /** WHAT MERCATOR COSTS THIS TYPE, PER REMOVE. Ground scale runs as cos(latitude), so a bar true at
   *  the centre of the frame is wrong at its edges by the ratio of the two cosines. This is the
   *  locator's own version of the choropleth's inflated north, and it is the reason the number is
   *  derived here rather than asserted anywhere. */
  const edgeError =
    Math.max(Math.cos(window.south * RAD), Math.cos(window.north * RAD)) /
    Math.min(Math.cos(window.south * RAD), Math.cos(window.north * RAD));
  return {
    ...rung,
    slug: vantageSlugOf(rung.key),
    selection,
    window,
    spanKm,
    edgeError,
    barKm: barFor(spanKm),
    heldStations,
    heldPlaces,
    drawnStations,
    drawnPlaces,
  };
});

/** THE PUBLISHED FRAMING. The newsroom's own answer to "where is this": wide enough to hold the
 *  fleet the subject belongs to and the cities that place it, tight enough that the subject is still
 *  a place rather than a dot. The reader can test it inwards twice and outwards once — which is the
 *  point, and which a still cannot offer. */
const DEFAULT_KEY = "region";

// ── the marks, and the table that is their non-visual route ───────────────────────────────────
const keyOfStation = (s) => `s-${stations.indexOf(s)}`;
const keyOfPlace = (p) => `p-${places.indexOf(p)}`;
const SUBJECT = "subject";

const markIndex = new Map();
const noteMark = (key, mark) => {
  if (!markIndex.has(key)) markIndex.set(key, mark);
  markIndex.get(key).removes.push(mark.removes[0]);
};
markIndex.set(SUBJECT, {
  key: SUBJECT,
  kind: "subject",
  lon: biggest.lon,
  lat: biggest.lat,
  label: "Zaporijjia",
  name: "Zaporijjia",
  kindWord: "le sujet",
  km: 0,
  removes: [],
});
for (const remove of removes) {
  markIndex.get(SUBJECT).removes.push(remove.slug);
  for (const s of remove.drawnStations) {
    const key = keyOfStation(s);
    if (!markIndex.has(key))
      markIndex.set(key, {
        key,
        kind: "station",
        lon: s.lon,
        lat: s.lat,
        label: null,
        name: `${FRENCH_FUEL[s.fuel] ?? s.fuel} ${n0(s.capacity_mw)} MW`,
        kindWord: `centrale, ${countryName(s.country)}`,
        km: kmBetween(biggest, s),
        removes: [],
        station: s,
      });
    markIndex.get(key).removes.push(remove.slug);
  }
  for (const p of remove.drawnPlaces) {
    const key = keyOfPlace(p);
    if (!markIndex.has(key))
      markIndex.set(key, {
        key,
        kind: "place",
        lon: p.lon,
        lat: p.lat,
        label: FRENCH_PLACE[p.name],
        name: FRENCH_PLACE[p.name],
        kindWord: `ville, ${countryName(p.country)}`,
        km: kmBetween(biggest, p),
        removes: [],
        place: p,
      });
    markIndex.get(key).removes.push(remove.slug);
  }
}
const marks = [...markIndex.values()].sort((a, b) => a.km - b.km);

/** WHAT A POINTER ANSWERS, and it carries only what the table does NOT print — so hovering is never
 *  the table read out loud again. */
const detailOf = (mark) => {
  if (mark.kind === "subject")
    return (
      `Zaporijjia · ${FRENCH_FUEL[biggest.fuel] ?? biggest.fuel} · ` +
      `${n0(biggest.capacity_mw)} MW de puissance installée — la plus grosse centrale bas-carbone ` +
      `que la base recense en Europe, sur ${n0(stations.length)} sites`
    );
  if (mark.kind === "station") {
    const s = mark.station;
    return (
      `${FRENCH_FUEL[s.fuel] ?? s.fuel} · ${n0(s.capacity_mw)} MW · ${countryName(s.country)} · ` +
      `à ${n0(mark.km)} km de Zaporijjia · ${fr((s.capacity_mw / biggest.capacity_mw) * 100)} % de ` +
      `sa puissance`
    );
  }
  const p = mark.place;
  return (
    `${FRENCH_PLACE[p.name]} · ${countryName(p.country)} · ${n0(p.pop)} habitants · ` +
    `à ${n0(mark.km)} km de Zaporijjia`
  );
};
for (const mark of marks) mark.detail = plain(detailOf(mark));

/** THE TWO MARKS THAT SIT CLOSEST TOGETHER, which is what the reader's zoom CEILING is derived from:
 *  two pins that share a pixel are one pin, no declutter separates them, and only a camera can. */
let closest = null;
for (let i = 0; i < marks.length; i += 1)
  for (let j = i + 1; j < marks.length; j += 1) {
    const degrees = Math.hypot(marks[i].lon - marks[j].lon, marks[i].lat - marks[j].lat);
    if (!closest || degrees < closest.degrees)
      closest = { a: marks[i].key, b: marks[j].key, degrees };
  }
if (!closest) throw new Error("the map draws one mark, so there is no pair to derive a ceiling from");

// ── the words each remove owes the reader ─────────────────────────────────────────────────────
const rivalOf = (remove) => remove.heldStations[0] ?? null;
/** WHAT THE REMOVE GUARANTEES, WHICH IS NOT THE WIDTH OF THE PICTURE — and saying it the other way
 *  round would be a lie on a beat about distance. The camera is asked to HOLD this window; the
 *  format then hands the plot the figure's whole width and whatever height the window leaves, so the
 *  box is far wider than it is tall and a near-square window fitted into it is HEIGHT-bound. Measured
 *  on the delivered page at 1512x860: the published remove's 640 km window is drawn inside a
 *  1464 x 467 box, so the frame shows about three times that in longitude. That surplus is the price
 *  the owner's full-width ruling names ("quitte à afficher plus de map") and it is paid here as it is
 *  on every other map beat — but the SENTENCE must not pretend it is the frame. So the rule states
 *  the radius the remove is answerable for: everything within so many kilometres of the subject is
 *  inside, whatever else the surplus happens to bring in. The scale bar, which is derived from the
 *  live camera rather than from this number, is what tells the reader the true scale of what they
 *  are looking at. */
const plural = (n, one, many) => `${n0(n)} ${n === 1 ? one : many}`;
const ruleOf = (remove) =>
  plain(
    (remove.radius === null
      ? `sur toute l'étendue du fichier`
      : `dans un rayon de ${n0(remove.radius)} km`) +
      ` · ${plural(remove.drawnStations.length, "centrale dessinée", "centrales dessinées")} sur ` +
      `${n0(remove.heldStations.length)} · ` +
      (remove.places
        ? `${plural(remove.drawnPlaces.length, "ville", "villes")} sur ` +
          `${n0(remove.heldPlaces.length)}`
        : `aucune ville : à ce recul, ce qui situe, ce sont les autres centrales`) +
      ` · barre ${n0(remove.barKm)} km`,
  );

const noteOf = (remove) => {
  if (remove.key === DEFAULT_KEY) return null;
  const rival = rivalOf(remove);
  const scope =
    remove.radius === null
      ? `Sur toute l'étendue du fichier`
      : `À ${n0(remove.radius)} km à la ronde`;
  const head =
    `${scope}, la plus grosse voisine de Zaporijjia est ` +
    `${FRENCH_FUEL[rival.fuel] ?? rival.fuel} ${n0(rival.capacity_mw)} MW en ` +
    `${countryName(rival.country)}, à ${n0(kmBetween(biggest, rival))} km — ` +
    `${fr((rival.capacity_mw / biggest.capacity_mw) * 100)} % de sa puissance.`;
  if (remove.key === "site")
    return plain(
      `${head} À ce recul la question n'est plus l'Europe : c'est un site sur un fleuve, et la ` +
        `seule chose comparable à portée est un barrage.`,
    );
  if (remove.key === "voisinage")
    return plain(
      `${head} Le cadre tient maintenant ${n0(remove.heldStations.length)} centrales bas-carbone et ` +
        `aucune n'atteint ${n0(biggest.capacity_mw)} MW.`,
    );
  return plain(
    `${head} C'est à ce recul, et à aucun autre, que le titre devient vérifiable — et c'est aussi ` +
      `celui où le sujet cesse d'être situable : un point parmi ${n0(stations.length)}. La barre ` +
      `d'échelle y est fausse de ${fr(remove.edgeError, 1)} fois entre le bas et le haut du cadre.`,
  );
};

const vantage = {
  label: "À quelle distance se placer",
  defaultKey: DEFAULT_KEY,
  subject: SUBJECT,
  positions: Object.fromEntries(marks.map((mark) => [mark.key, [mark.lon, mark.lat]])),
  removes: removes.map((remove) => ({
    key: remove.key,
    label: remove.label,
    announce:
      remove.radius === null
        ? `${remove.label} — sur toute l'étendue du fichier`
        : `${remove.label} — dans un rayon de ${n0(remove.radius)} km autour du sujet`,
    window: remove.window,
    spanKm: remove.spanKm,
    marks: marks.filter((mark) => mark.removes.includes(remove.slug)).map((mark) => mark.key),
    rule: ruleOf(remove),
    barKm: remove.barKm,
    note: noteOf(remove),
  })),
};

// ── the words ─────────────────────────────────────────────────────────────────────────────────
const published = removes.find((remove) => remove.key === DEFAULT_KEY);
const widest = removes[removes.length - 1];
const nearest = [...stations]
  .filter((s) => s !== biggest)
  .map((s) => ({ s, km: kmBetween(biggest, s) }))
  .sort((a, b) => a.km - b.km)[0];

/** THE HEADLINE IS THE CLAIM AND THE GESTURE IN ONE LINE, AND BOTH HALVES ARE DERIVED. The station
 *  is the largest this file holds; its nearest equal is Gravelines, and the number below is the
 *  great-circle distance to it. That distance IS the argument: a reader has to stand back that far
 *  before "the largest in Europe" is something they can see, and at that remove the subject is a dot
 *  among 8 899. */
const farRival = rivalOf(widest);
const FAR_RIVAL_KM = kmBetween(biggest, farRival);
const title = plain(
  `La plus grosse centrale bas-carbone d'Europe, et sa plus proche rivale à ` +
    `${n0(FAR_RIVAL_KM)} km`,
);
const caveat = plain(
  `Zaporijjia, ${n0(biggest.capacity_mw)} MW de puissance installée, est la plus grosse centrale ` +
    `bas-carbone que la base recense en Europe. Carte MapTiler plate, en Web Mercator : l'échelle ` +
    `au sol suit le cosinus de la latitude, donc la barre d'échelle est juste au centre du cadre et ` +
    `fausse à ses bords — de ${fr(published.edgeError, 2)} fois au cadrage publié, de ` +
    `${fr(widest.edgeError, 2)} fois au plus large. Le titre compte des mégawatts, pas des kilomètres.`,
);
const claimNote = plain(
  `${n0(biggest.capacity_mw)} MW · la centrale la plus proche est à ${n0(nearest.km)} km ` +
    `(${FRENCH_FUEL[nearest.s.fuel] ?? nearest.s.fuel}, ${n0(nearest.s.capacity_mw)} MW) · ` +
    `aucune des ${n0(stations.length - 1)} autres centrales bas-carbone du fichier n'atteint cette ` +
    `puissance.`,
);
const readingLine = plain(
  `Lecture : une carte de repérage ne dit qu'une chose, où c'est — et cette chose entière est ` +
    `décidée par la distance à laquelle l'auteur s'est placé. Choisissez la vôtre : chaque recul ` +
    `refait le cadrage, change ce qui mérite d'être dessiné, dit combien de centrales le cadre ` +
    `contient et combien il en cache, et redonne sa barre d'échelle. Le tableau suit le même recul, ` +
    `avec ou sans JavaScript.`,
);
const liveHint = plain(
  `La carte est vivante : molette ou boutons pour zoomer, glisser pour déplacer, flèches du clavier ` +
    `une fois la carte au focus. Survolez une marque pour ce qu'elle est et sa distance à Zaporijjia.`,
);
const source = plain(
  `Source : WRI Global Power Plant Database v1.3.0 · lieux Natural Earth 50 m · frontières et fond ` +
    `MapTiler (Countries, dataviz), teintés par la direction`,
);
const TABLE_CAPTION = plain(
  `Les ${n0(marks.length)} marques de la page, et le recul auquel chacune est dessinée`,
);
const COLUMNS = ["Marque", "Ce que c'est", "Distance", "À ce recul"];
const DRAWN_WORD = "dessinée";
const OUT_WORD = "hors du cadre";

const interaction = {
  earns:
    "A still can only stand at one distance and cannot say there were others, so a reader takes " +
    "the framing as the map rather than as the single decision that produced every word on it. " +
    "This page hands the reader four authored removes and tells them what each one costs.",
  controls: [
    {
      question: "Près de quoi, au juste ? Ça dépend d'où on regarde — alors d'où regarde-t-on ?",
      gesture: "toggle-a-comparison",
      changes:
        "La caméra voyage jusqu'au cadre choisi, l'image figée sous elle se fond vers celle de ce " +
        "recul, la règle de dessin et le recensement se réécrivent sur place, la barre d'échelle " +
        "reprend sa longueur, et une phrase dit quelle est la plus grosse voisine à cette distance " +
        "et ce qu'elle vaut en pourcentage du sujet.",
    },
    {
      question: "Ce point-là, c'est quoi, et à combien de kilomètres du sujet ?",
      gesture: "ask-a-mark",
      changes:
        "La marque pointée se recolore depuis son propre remplissage, dans une couche dessinée " +
        "au-dessus de ses voisines, et répond avec ce qu'elle est, sa puissance ou sa population, " +
        "son pays et sa distance à Zaporijjia mesurée sur la sphère.",
    },
    {
      question: "Et tout ce que la carte ne dessine pas à ce recul-là ?",
      gesture: "open-the-full-table",
      changes:
        "Les marques s'ouvrent sous la carte, par distance croissante, chacune avec sa distance et " +
        "un mot qui dit si le recul en cours la dessine ou la laisse hors du cadre. Cette dernière " +
        "colonne suit le recul en CSS pur : le geste tient sans JavaScript.",
    },
  ],
};

// ── THE CAMERA FACTS COME FROM A BAKED PLATE, ONE PER DIRECTION ───────────────────────────────
//
// The plate is no longer what the page embeds — every remove's fallback is PHOTOGRAPHED from this
// page's own live map, below — but it is still what the style name and the two tints are read back
// from, and the guard that refuses a live map loading a style the plate was not baked from needs a
// second, independent record of that name. Baked at the PUBLISHED remove's window, so the fact it
// records is the fact the page opens on.
const PLATE_FRAME = [1600, 1216];
const PLATE_SIZE = PLATE_FRAME.join("x");
const plateDir = (id) => join(HERE, "plate", id);
const PLATE_BOUNDS = [
  published.window.west,
  published.window.south,
  published.window.east,
  published.window.north,
].map((v) => v.toFixed(4)).join(",");
function ensurePlate(id, water, land) {
  const dir = plateDir(id);
  // THE CACHE IS KEYED ON THE FRAME AND ON THE WINDOW, because a cached plate is the one way a
  // camera change ships without being drawn: measured on the choropleth while mutating its declared
  // window — the runner stayed green because nothing re-baked, and the page kept the camera of a
  // file that no longer said so.
  if (existsSync(join(dir, "geometry.json")) && existsSync(join(dir, "plate.png"))) {
    const cached = JSON.parse(readFileSync(join(dir, "geometry.json"), "utf8"));
    const b = cached.bounds ?? [[0, 0], [0, 0]];
    const same =
      cached.frame?.width === PLATE_FRAME[0] &&
      cached.frame?.height === PLATE_FRAME[1] &&
      [b[0][0], b[0][1], b[1][0], b[1][1]].map((v) => v.toFixed(4)).join(",") === PLATE_BOUNDS &&
      cached.water === water &&
      cached.land === land;
    if (same) return;
    console.log(`the ${id} plate was baked on another camera or another pair of tints — re-baking…`);
  }
  console.log(`baking the ${id} plate (MapTiler, ${PLATE_SIZE}, bounds ${PLATE_BOUNDS})…`);
  const result = spawnSync(
    "bun",
    [join(HERE, "bake.mjs"), "--size", PLATE_SIZE, "--countries", join(HERE, "shapes.geojson"),
     "--bounds", PLATE_BOUNDS, "--water", water, "--land", land, "--out", dir],
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
  const other = await factsOf(file.replace(/\.md$/, ""));
  if (
    other.frame.width !== plateFacts.frame.width ||
    JSON.stringify(other.frameCorners) !== JSON.stringify(plateFacts.frameCorners) ||
    other.style !== plateFacts.style
  )
    throw new Error(
      `the ${file} plate was baked on a different camera or style than ${DIRECTION_FILES[0]}: three ` +
        `plates that disagree about where a degree is would put the same mark in three places`,
    );
}

// ── THE THREE TREATMENTS, MEASURED AGAINST THE LAND THE PAGE ACTUALLY PAINTS ──────────────────
//
// Not against the paper. What sits behind every mark on this page is `plateLand`, a step off the
// direction's ground toward its ink — measuring against the GROUND is the trap the brief names by
// hand, and it reported 3,02:1 on the choropleth where the colour a reader actually sees gave 2,58.
function paletteFor(base) {
  const tints = plateTints(base);
  const furniture = deriveFurniture(base.ground);
  const ink = furniture.ink;
  const land = tints.land;
  const floorAgainstLand = (colour) =>
    contrast(colour, land) >= NON_TEXT_CONTRAST_MIN
      ? colour
      : adjustToContrast(colour, land, NON_TEXT_CONTRAST_MIN) ?? colour;

  const subject = floorAgainstLand(base.accent);
  /** The other stations are the SUBJECT'S OWN HUE, one chroma down — `types/locator.md` allows
   *  colour as category and nothing else, and a second hue here would be a second encoding nobody
   *  declared. Walked toward the land only as far as the non-text floor allows. */
  let station = mix(subject, land, 0.45);
  if (contrast(station, land) < NON_TEXT_CONTRAST_MIN)
    station = adjustToContrast(station, land, NON_TEXT_CONTRAST_MIN) ?? station;
  /** The settlements are furniture, not argument: a step off the land toward the ink, no hue. */
  const place = floorAgainstLand(mix(land, ink, 0.6));
  /** THE SUBJECT IS RINGED, NOT RECOLOURED. The ring is searched rather than named: it has to stand
   *  off the subject's own fill AND off the land it sits on, and on a dark direction the answer is
   *  the opposite end of the scale from the answer on a light one. */
  const ring = (() => {
    for (const anchor of [base.ground, ink]) {
      for (let dose = 0; dose <= 1.0001; dose += 0.04) {
        const candidate = mix(anchor, anchor === ink ? base.ground : ink, dose);
        if (contrast(candidate, subject) >= 2.2 && contrast(candidate, land) >= 1.6)
          return candidate;
      }
    }
    throw new Error(
      `no ring stands 2,2:1 off the subject's fill ${subject} while staying 1,6:1 off the land ` +
        `${land}: the one mark this map is about would be a circle a reader cannot pick out of its ` +
        `own neighbours`,
    );
  })();
  /** WHAT A POINTED-AT MARK BECOMES, SEARCHED OFF ITS OWN FILL. Not a fixed dose and not a filter: a
   *  `brightness()` lightens on a light ground and on a dark one alike, and a fixed mix measured
   *  1,104:1 on nocturne one beat over. */
  const activeFor = (fill) => {
    for (let dose = 0.06; dose <= 0.94; dose += 0.02) {
      const candidate = mix(fill, ink, dose);
      if (contrast(candidate, fill) >= 1.4 && contrast(candidate, land) >= NON_TEXT_CONTRAST_MIN)
        return candidate;
    }
    for (let dose = 0.06; dose <= 0.94; dose += 0.02) {
      const candidate = mix(fill, base.ground, dose);
      if (contrast(candidate, fill) >= 1.4 && contrast(candidate, land) >= NON_TEXT_CONTRAST_MIN)
        return candidate;
    }
    throw new Error(
      `no dose separates a pointed-at mark from its own fill ${fill} by 1,4:1 while staying ` +
        `${NON_TEXT_CONTRAST_MIN}:1 above the land ${land}. A mark that answers by becoming a colour ` +
        `the reader cannot tell from the one beside it has not answered.`,
    );
  };
  const border = adjustToContrast(mix(land, ink, 0.4), land, 1.6) ?? mix(land, ink, 0.4);
  return { tints, ink, furniture, subject, station, place, ring, border, activeFor };
}

// ── THE FROZEN FALLBACK, ONE PER REMOVE, BAKED FROM THE PAGE ITSELF ───────────────────────────
//
// R1's second layer. The plate `bake.mjs` makes is MapTiler's geography and nothing else — every
// mark, every name and the scale bar are the live map's — so a plate baked before them pictures a
// map with the subject rubbed out. And on THIS beat the fallback carries the gesture: four
// pictures, one per remove, swapped in pure CSS, so a reader with no script gets four maps rather
// than one.
//
// SO THEY ARE BAKED FROM THE PAGE, not from a second pipeline: the runner renders a draft,
// substitutes the key into a copy that lives OUTSIDE the repository, opens it, waits for the live
// map to announce itself, walks the four removes, and photographs the map's own box at each. There
// is no second plan and no second mount to disagree with the first — it is the page.
const FALLBACK_DIR = join(HERE, "fallback");
/** THE REFERENCE WINDOW, not a box: the pictures are photographed at the window the beat is reviewed
 *  at, so each image is the delivered box's own shape and `slice` crops nothing there. At 2x, so it
 *  is not soft on the screen the owner reviews on. */
const FALLBACK_WINDOW = { width: 1512, height: 860, scale: 2 };
const BLANK_PNG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
const KEY =
  process.env.MAPTILER_KEY ?? process.env.REMOTION_MAPTILER_KEY ?? process.env.VITE_MAPTILER_KEY ?? "";
const PLACEHOLDER = `__MAPTILER${"_KEY__"}`;
const localPageOf = (pagePath) => pagePath.replace(/\.html$/, ".local.html");

/**
 * PHOTOGRAPH THE PAGE'S OWN LIVE MAP, ONCE PER REMOVE, and write them where the page will embed
 * them.
 *
 * The key is substituted into a copy under the system temp directory, never beside the page and
 * never inside the repository — `no-key-in-the-repository` scans the working tree, and it caught
 * exactly this once already on the choropleth.
 *
 * It REFUSES rather than writing something: a picture baked from a map that never loaded is a
 * picture of the failure it exists to replace, and it would ship looking like a success. It also
 * refuses on MEASURED LABEL OVERLAP — the brief's instruction is to measure the distance rather than
 * judge it by eye, and the only place the rendered boxes exist is here, in a real browser, at each
 * of the four removes.
 */
async function bakeFallbacks(pagePath, id) {
  if (!KEY)
    throw new Error(
      "the frozen pictures are photographed from this page's own live map, so the bake needs a " +
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
    await page.goto(`file://${keyed}`, { waitUntil: "networkidle0", timeout: 180000 });
    await page.waitForFunction(() => document.documentElement.classList.contains("mw-live"), {
      timeout: 180000,
    });
    // THE FROZEN PICTURE MUST NOT CARRY LIVE CONTROLS. MapTiler's `+` and `−` buttons are inert in
    // an image, and an inert button is a dead control — the one thing this whole arrangement exists
    // not to ship. The choropleth left this open and wrote it down; it is closed here.
    await page.addStyleTag({ content: ".maplibregl-ctrl-group { display: none !important; }" });
    await mkdir(FALLBACK_DIR, { recursive: true });
    const shots = {};
    let box = null;
    for (const remove of removes) {
      await page.evaluate((slug) => {
        const input = document.getElementById(`mw-stack-${slug}`);
        input.checked = true;
        input.dispatchEvent(new Event("change", { bubbles: true }));
      }, remove.slug);
      await page.evaluate(
        () =>
          new Promise((resolve) => {
            const map = window.__mwMap;
            const done = () => (map.loaded() && map.areTilesLoaded() ? resolve() : map.once("idle", resolve));
            map.once("moveend", done);
            setTimeout(done, 2000);
          }),
      );
      await new Promise((r) => setTimeout(r, 800));
      // THE NAMES ARE MEASURED, NOT EYEBALLED. Two labels that overlap are two names a reader cannot
      // read, and this is the only place their rendered rectangles exist.
      const overlaps = await page.evaluate(() => {
        const shown = [...document.querySelectorAll(".mw-label")].filter(
          (el) => el.offsetParent !== null,
        );
        const rects = shown.map((el) => ({ name: el.textContent, r: el.getBoundingClientRect() }));
        const bad = [];
        for (let i = 0; i < rects.length; i += 1)
          for (let j = i + 1; j < rects.length; j += 1) {
            const a = rects[i].r;
            const b = rects[j].r;
            if (a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom)
              bad.push(`${rects[i].name} / ${rects[j].name}`);
          }
        return { shown: rects.length, bad };
      });
      if (overlaps.bad.length)
        throw new Error(
          `at the remove "${remove.slug}" ${overlaps.bad.length} pair(s) of names overlap on the ` +
            `delivered page: ${overlaps.bad.join(", ")}. A label must be near its own mark and over ` +
            `no other label — measured on the rendered rectangles, never judged by eye.`,
        );
      const element = await page.$(".map-layer");
      if (!element) throw new Error("the page carries no live map box to photograph");
      const shot = await element.boundingBox();
      box = { width: Math.round(shot.width), height: Math.round(shot.height) };
      const out = join(FALLBACK_DIR, `${id}-${remove.slug}.webp`);
      const png = `${out}.png`;
      await element.screenshot({ path: png });
      // Lossless would be honest and is 4x the bytes on flat fills; `-q 90` is visually the same
      // picture, and this page carries FOUR of them rather than one.
      const encode = spawnSync("cwebp", ["-quiet", "-q", "90", png, "-o", out], { stdio: "inherit" });
      if (encode.status !== 0)
        throw new Error(`cwebp exited with ${encode.status} baking ${id}/${remove.slug}`);
      rmSync(png, { force: true });
      shots[remove.slug] = out;
      console.log(
        `  fallback ${id}/${remove.slug} → ${box.width}x${box.height} CSS px · ` +
          `${overlaps.shown} nom(s) lisibles, 0 chevauchement`,
      );
    }
    return { box, shots };
  } finally {
    await browser.close();
    rmSync(dir, { recursive: true, force: true });
  }
}

// ── what the second layer is made of, read once ───────────────────────────────────────────────
const requireFrom = createRequire(import.meta.url);
const MAPLIBRE_JS = await readFile(requireFrom.resolve("maplibre-gl/dist/maplibre-gl.js"), "utf8");
const MAPLIBRE_CSS = await readFile(requireFrom.resolve("maplibre-gl/dist/maplibre-gl.css"), "utf8");
const STYLE_MODULE = (
  await readFile(join(HERE, "..", "..", "skills", "map-web", "assets", "style.mjs"), "utf8")
).replace(/^export /gm, "");

// ── what the run prints, every time ───────────────────────────────────────────────────────────
console.log(
  `sujet : ${biggest.country} ${biggest.fuel} ${n0(biggest.capacity_mw)} MW @ ` +
    `${biggest.lon},${biggest.lat} — dans le polygone UKR, verifie\n`,
);
for (const remove of removes)
  console.log(
    `recul ${remove.key.padEnd(10)} rayon ${String(remove.radius ?? "fichier").padStart(7)} · ` +
      `cadre ${n0(remove.spanKm).padStart(6)} km de large, ` +
      `${remove.window.west.toFixed(2)}..${remove.window.east.toFixed(2)}E ` +
      `${remove.window.south.toFixed(2)}..${remove.window.north.toFixed(2)}N · ` +
      `${String(remove.heldStations.length).padStart(4)} centrales dans le cadre, ` +
      `${remove.drawnStations.length} dessinees · ${remove.heldPlaces.length} villes, ` +
      `${remove.drawnPlaces.length} dessinees · barre ${remove.barKm} km · ` +
      `erreur de barre entre les bords ${fr(remove.edgeError, 3)} fois`,
  );
console.log(
  `\nl'echelle du ladder : ${removes
    .map((r, i) => (i ? `${(r.spanKm / removes[i - 1].spanKm).toFixed(2)}x` : `${n0(r.spanKm)} km`))
    .join(" → ")}`,
);
console.log(
  `les deux marques les plus proches : ${closest.a} / ${closest.b}, ` +
    `${closest.degrees.toFixed(4)}° — c'est de la que le plafond de zoom est derive`,
);
console.log(
  `ce que Mercator coute a CE type : pas des surfaces, la BARRE D'ECHELLE. ` +
    `${removes.map((r) => `${r.key} ${fr(r.edgeError, 3)}`).join(" · ")} fois entre les deux bords ` +
    `du cadre\n`,
);

const facts = beatFacts(
  [{ key: "ZNPP", label: "Zaporijjia", value: biggest.capacity_mw }],
  {
    subject: "ZNPP",
    points: { count: marks.length, locatedAt: "recorded coordinates" },
    geography: {
      areas: 0,
      settlements: marks.filter((m) => m.kind === "place").length,
      waters: 0,
      basemap: true,
    },
    declaredSequence: "none",
  },
);
console.log(
  `treatments applicable: ${applicableTreatments(facts).map((t) => t.id).join(", ") || "(none)"}\n`,
);

const textPerRegister = {
  display: title,
  eyebrow: EYEBROW,
  body: `${caveat} ${readingLine} ${source} ${liveHint}`,
  axis:
    `${vantage.label} ${vantage.removes.map((r) => `${r.label} ${r.announce} ${r.rule}`).join(" ")} ` +
    `${TABLE_CAPTION} ${COLUMNS.join(" ")} ${DRAWN_WORD} ${OUT_WORD} ` +
    `${marks.map((m) => `${m.name} ${m.kindWord} ${n0(m.km)} km`).join(" ")} ` +
    `${removes.map((r) => `${r.barKm} km`).join(" ")} le sujet les autres centrales les villes`,
  annot: `${claimNote} ${vantage.removes.map((r) => r.note ?? "").join(" ")}`,
  value: marks.filter((m) => m.label).map((m) => m.label).join(" "),
};
for (const key of Object.keys(textPerRegister)) textPerRegister[key] = plain(textPerRegister[key]);

const filed = DIRECTION_FILES.map((f) => readDirection(join(DIRECTIONS, f)));
const newsroom = readPalette(HERE, { stopAt: join(HERE, "..") });
const BEAT_FACTS = { evidenceLevels: 3 };
console.log(report(composeDirections({ newsroom, filed, beat: BEAT_FACTS, textPerRegister }), { beat: BEAT_FACTS }));
console.log("");

const refused = [];
for (const file of DIRECTION_FILES) {
  const id = file.replace(/\.md$/, "");
  const base = readDirection(join(DIRECTIONS, file));
  const direction = resolveDirectionFamilies(base, textPerRegister);
  const p = paletteFor(base);

  const live = {
    style: plateFacts.style,
    tints: p.tints,
    vantage,
    marks: marks.map((mark) => ({
      key: mark.key,
      kind: mark.kind,
      lon: mark.lon,
      lat: mark.lat,
      label: mark.label,
    })),
    details: Object.fromEntries(marks.map((mark) => [mark.key, mark.detail])),
    paint: {
      subject: p.subject,
      subjectRing: p.ring,
      station: p.station,
      place: p.place,
      active: {
        subject: p.activeFor(p.subject),
        station: p.activeFor(p.station),
        place: p.activeFor(p.place),
      },
    },
    /** EVERY RADIUS IS A LITERAL IN SCREEN PIXELS, identical at every zoom and at every remove — the
     *  one rule `types/locator.md` says this type breaks. Nothing here is a function of a value. */
    radius: { subject: 8, station: 5, place: 4, ring: 2.6 },
    border: { colour: p.border, width: 0.8 },
    closest: { a: closest.a, b: closest.b, degrees: closest.degrees },
    locale: { title: "Carte", zoomIn: "Zoomer", zoomOut: "Dézoomer" },
    changeMs: CHANGE_MS,
    edgeError: Object.fromEntries(removes.map((remove) => [remove.slug, remove.edgeError])),
  };

  const rows = marks.map((mark) => ({
    key: mark.key,
    name: mark.name,
    kind: mark.kindWord,
    distance: mark.kind === "subject" ? "le sujet" : `${n0(mark.km)} km`,
    detail: mark.detail,
    removes: mark.removes,
  }));
  const labels = marks
    .filter((mark) => mark.label)
    .map((mark) => ({
      key: mark.key,
      text: mark.label,
      lon: mark.lon,
      lat: mark.lat,
      removes: mark.removes,
      emphasis: mark.kind === "subject",
    }));
  const kinds = [
    { label: "le sujet", fill: p.subject, ring: p.ring, r: 6 },
    { label: "les autres centrales bas-carbone", fill: p.station, ring: null, r: 5 },
    { label: "les villes", fill: p.place, ring: null, r: 4 },
  ];

  const pageOf = (plates, box) =>
    renderWeb({
      component: DirectedLocatorWeb,
      props: {
        plates,
        vantage,
        rows,
        labels,
        kinds,
        livePlan: liveLocatorPlan(live),
        liveScript: liveLocatorScript(live, {
          scope: ".chart-figure",
          styleModule: STYLE_MODULE,
          vantageName: VANTAGE_ID_PREFIX,
        }),
        liveHint,
        maplibreCss: MAPLIBRE_CSS,
        maplibreJs: MAPLIBRE_JS,
        tableCaption: TABLE_CAPTION,
        columns: COLUMNS,
        drawnWord: DRAWN_WORD,
        outOfFrameWord: OUT_WORD,
        aspect: box.width / box.height,
        size: box.width,
        title, eyebrow: EYEBROW, caveat, source, reading: readingLine, claimNote,
        alt: plain(
          `Carte de repérage du sud de l'Ukraine sur fond MapTiler. La centrale de Zaporijjia, ` +
            `${n0(biggest.capacity_mw)} MW, est marquée d'un cercle cerné au bord du Dniepr, au nord ` +
            `de la mer d'Azov. Autour d'elle, les ${n0(published.drawnStations.length)} plus grosses ` +
            `des ${n0(published.heldStations.length)} autres centrales bas-carbone du cadre et les ` +
            `${n0(published.drawnPlaces.length)} plus grandes villes, toutes les marques dessinées à ` +
            `la même taille. Une commande à ${n0(removes.length)} positions refait le cadrage, de ` +
            `${n0(removes[0].radius)} km à la ronde à toute l'étendue du fichier, et la carte se ` +
            `zoome et se déplace avec les contrôles de MapTiler.`,
        ),
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
      .update(JSON.stringify(liveLocatorPlan(live)))
      .update(JSON.stringify(FALLBACK_WINDOW))
      .digest("hex")
      .slice(0, 16);
    const stampFile = join(FALLBACK_DIR, `${id}.sha`);
    const imageOf = (slug) => join(FALLBACK_DIR, `${id}-${slug}.webp`);
    let record = null;
    if (existsSync(stampFile) && removes.every((remove) => existsSync(imageOf(remove.slug)))) {
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
      await pageOf(
        removes.map((remove) => ({ slug: remove.slug, href: BLANK_PNG })),
        { width: 1464, height: 520 },
      );
      const baked = await bakeFallbacks(join(OUT, `${id}.html`), id);
      record = { stamp, ...baked.box };
      await writeFile(stampFile, `${JSON.stringify(record)}\n`);
    }
    const plates = await Promise.all(
      removes.map(async (remove) => ({
        slug: remove.slug,
        href: `data:image/webp;base64,${(await readFile(imageOf(remove.slug))).toString("base64")}`,
      })),
    );
    const { outPath } = await pageOf(plates, record);
    // THE KEYED COPY FOR REVIEW, beside the page and git-ignored — the same name and the same rule
    // the scrolly worktree already uses. The owner: « non, comme pour les scrolly il faut toujours
    // une cle sinon ca sert a rien ». The COMMITTED page keeps the placeholder: this repository is
    // public.
    if (KEY) {
      const html = await readFile(outPath, "utf8");
      if (!html.includes(PLACEHOLDER))
        throw new Error("the rendered page carries no delivery placeholder to substitute a key into");
      await writeFile(localPageOf(outPath), html.split(PLACEHOLDER).join(KEY));
    }
    // The page is read back from disk, not from the string the renderer happened to return — the
    // file a reader opens is the only artefact any of these refusals is about.
    const written = await readFile(join(OUT, `${id}.html`), "utf8");
    assertOneVantage(written, vantage, { where: `renders/${id}.html` });
    assertVantageReachesTheLayers(written, live, plateFacts.style, { where: `renders/${id}.html` });
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
