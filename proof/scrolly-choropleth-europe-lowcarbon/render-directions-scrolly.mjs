// Europe's low-carbon electricity in 2024, rendered once per FILED DIRECTION into a self-contained scrolly
// page. The `choropleth` type in the scrolly format.
//
// THE SUBJECT OF `static-choropleth-europe-lowcarbon`, CHOREOGRAPHED. The shares, the seven above the floor,
// Albania's neighbours derived from the frozen rings, the north-west measured on the shapes, the ramp and
// the plate's tints are the static beat's own; the scroll tells them with its own gestures
// (`scrolly/references/directed-type-choreography.md`):
//
//   1. forty reporting countries, empty;
//   2. the classes arrive one by one, lowest first;
//   3. filter to the floor: only the seven above 94 % keep their colour, counted;
//   4. the six of the north-west named;
//   5. the camera travels onto the Balkans: Albania ringed, its neighbours named with their shares;
//   6. back to Europe, every class; the country with no reading keeps the key's neutral and no word on the map.
//
// THE MAP IS A LIVE, FLAT (WEB MERCATOR) MAPTILER MAP DRIVEN BY A PLAN (`plan.mjs`, addendum 2026-09-15 §2–§3): the class
// fills join MapTiler Countries by ISO A2, the names are symbol layers at the beat's frozen seats
// (`seats.json`), each card carries its camera, and one frozen image per card is baked from the same plan
// under the live map (`fallback/`). The page carries `__MAPTILER_KEY__`; the key is substituted at delivery.
//
// Usage:  set -a && . ./.env && set +a && bun proof/scrolly-choropleth-europe-lowcarbon/render-directions-scrolly.mjs

import { existsSync, readdirSync } from "node:fs";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer-core";
import { createElement } from "react";
import { deriveFurniture } from "#shared/chart-beat/render-still.mjs";
import { adjustToContrast, mix, readPalette, TEXT_CONTRAST_MIN } from "#shared/chart-beat/colour.mjs";
import { readDirection } from "#shared/design-base/read-direction.mjs";
import { composeDirections, report } from "#shared/design-base/compose.mjs";
import { resolveDirectionFamilies } from "#shared/design-base/resolve-families.mjs";
import { plainSpaces, webRegisters } from "#shared/design-base/web.mjs";
import { EYEBROW_TO_DISPLAY, gapOf, registerOf } from "#shared/design-base/register.mjs";
import { bakeCards } from "#shared/map-beat/bake.mjs";
import { assertNotFallback, mapTilerKeyIn, maptilerGlyphs } from "#shared/map-beat/glyphs.mjs";
import { scrollyMapScript } from "#shared/map-beat/inline.mjs";
import { validateExpressions } from "#shared/map-beat/mount.mjs";
import { cameraFields, validateScrollyPlan, zoomShiftFor } from "#shared/map-beat/scrolly.mjs";
import { plateTints, WATER_HUE } from "#shared/map-beat/tints.mjs";
import { renderScrolly } from "../../skills/scrolly/scripts/render-scrolly.mjs";
import { resolveChrome } from "../../skills/scrolly/scripts/verify-scrolly.mjs";
import { toDataUri } from "../../skills/scrolly/scripts/inline-asset.mjs";
import { choroplethPlan, ISO, LAYER, LEVEL } from "./plan.mjs";
import { DirectedChoroplethScrolly } from "./DirectedChoroplethScrolly.tsx";

const HERE = dirname(fileURLToPath(import.meta.url));
const DIRECTIONS = join(HERE, "..", "..", "docs", "design-base", "directions");
const OUT = join(HERE, "renders");
const YEAR = 2024;
const EYEBROW = "Énergie · Europe";
const NB = "\u00A0";
/** The static plate's own bake bounds and camera aspect (`bake.mjs` BEAT, `CAMERA_ASPECT`). */
const BOUNDS = [[-25, 34], [42, 68]];
const FRAME = { width: 1000, height: 760 };
const FALLBACK = join(HERE, "fallback");
/** Where a direction's card image lives. Module-level and handed the direction's id: built as closures inside the
 *  direction loop, Bun 1.3.5 returned the FIRST direction's paths on later iterations and inlined creme's images
 *  into nocturne's and rapport's pages (caught 2026-09-15 by the swap measurement). */
const stemOf = (id, shape, scale) => `${id}-${shape}@${scale}x`;
const pngOf = (id, k, shape, scale) => join(FALLBACK, `${stemOf(id, shape, scale)}-${k + 1}.png`);
const webpOf = (id, k, shape, scale) => join(FALLBACK, `${stemOf(id, shape, scale)}-${k + 1}.webp`);
const unbaked = (id, k, shape, scale) => !existsSync(webpOf(id, k, shape, scale)) && !existsSync(pngOf(id, k, shape, scale));
const fallbackUri = async (id, k, shape, scale) => toDataUri(await readFile(webpOf(id, k, shape, scale)), "image/webp");

/** The view the join is asserted at: a desktop stage. */
const JOIN_VIEW = { width: 1168, height: 566 };
/** THE CARD IMAGES ARE BAKED AT THE STAGE THE LAYOUT PUBLISHES, measured on the direction's own page: `wide`
 *  at a 1280 × 800 viewport, `tall` at 375 × 812 (`measureStages`). The live map fits the reference ground by
 *  the stage's height when the stage is wider than the reference (1280 × 973) and by its width otherwise, so
 *  `wide` keeps the stage's height and is baked wider (aspect `WIDE_ASPECT`), `tall` keeps the stage's width and
 *  is baked taller (`TALL_ASPECT`). Shown `object-fit: cover` and centred, each image is then scaled by exactly
 *  the live map's own zoom shift on every stage whose aspect lies between the reference's and its own, and not
 *  scaled at all on the measured stage: the frozen card and the live map meet to the pixel. */
const WIDE_ASPECT = 2.5;
const TALL_ASPECT = 0.47;
const MEASURED_VIEWPORTS = { wide: { width: 1280, height: 800 }, tall: { width: 375, height: 812 } };
/** A length at least `min` whose difference from `stage` is even, so the centred crop falls on whole pixels. */
const evenFrom = (min, stage) => {
  const n = Math.ceil(min);
  return (n - stage) % 2 === 0 ? n : n + 1;
};

const RENEWABLE = ["hydro_generation__twh", "wind_generation__twh", "solar_generation__twh", "bioenergy_stacked_generation__twh", "other_renewables_generation__twh"];
const NUCLEAR = "nuclear_generation__twh";
const FOSSIL = ["gas_generation__twh", "coal_generation__twh", "oil_generation__twh"];
const ALL = [...RENEWABLE, NUCLEAR, ...FOSSIL];
const FRENCH = {
  ALB: "Albanie", AUT: "Autriche", BLR: "Biélorussie", BEL: "Belgique", BIH: "Bosnie-Herzégovine", BGR: "Bulgarie",
  HRV: "Croatie", CYP: "Chypre", CZE: "Tchéquie", DNK: "Danemark", EST: "Estonie", FIN: "Finlande", FRA: "France",
  DEU: "Allemagne", GRC: "Grèce", HUN: "Hongrie", ISL: "Islande", IRL: "Irlande", ITA: "Italie", LVA: "Lettonie",
  LTU: "Lituanie", LUX: "Luxembourg", MLT: "Malte", MDA: "Moldavie", MNE: "Monténégro", NLD: "Pays-Bas",
  MKD: "Macédoine du Nord", NOR: "Norvège", POL: "Pologne", PRT: "Portugal", ROU: "Roumanie", RUS: "Russie",
  SRB: "Serbie", SVK: "Slovaquie", SVN: "Slovénie", ESP: "Espagne", SWE: "Suède", CHE: "Suisse", TUR: "Turquie",
  UKR: "Ukraine", GBR: "Royaume-Uni",
};
/** ISO 3166-1 alpha-2, the code MapTiler Countries carries in `iso_a2`: the join key between the data
 *  and the basemap's own country polygons. */
const ISO2 = {
  ALB: "AL", AUT: "AT", BLR: "BY", BEL: "BE", BIH: "BA", BGR: "BG", HRV: "HR", CYP: "CY", CZE: "CZ", DNK: "DK",
  EST: "EE", FIN: "FI", FRA: "FR", DEU: "DE", GRC: "GR", HUN: "HU", ISL: "IS", IRL: "IE", ITA: "IT", LVA: "LV",
  LTU: "LT", LUX: "LU", MLT: "MT", MDA: "MD", MNE: "ME", NLD: "NL", MKD: "MK", NOR: "NO", POL: "PL", PRT: "PT",
  ROU: "RO", RUS: "RU", SRB: "RS", SVK: "SK", SVN: "SI", ESP: "ES", SWE: "SE", CHE: "CH", TUR: "TR", UKR: "UA",
  GBR: "GB",
};
const iso2Of = (iso) => {
  if (!ISO2[iso]) throw new Error(`no ISO A2 code recorded for ${iso} — the live map joins MapTiler Countries on it`);
  return ISO2[iso];
};
const french = (iso) => {
  if (!FRENCH[iso]) throw new Error(`no French name recorded for ${iso}`);
  return FRENCH[iso];
};

// ── the data ───────────────────────────────────────────────────────────────────────────────────
const csv = (await readFile(join(HERE, "data.csv"), "utf8")).trim().split(/\r?\n/);
const header = csv[0].split(",");
const measured = csv.slice(1).map((l) => {
  const raw = Object.fromEntries(header.map((h, i) => [h, l.split(",")[i]]));
  if (Number(raw.year) !== YEAR) throw new Error(`${raw.entity} is not ${YEAR}`);
  const total = ALL.reduce((s, k) => s + Number(raw[k] || 0), 0);
  return { iso: raw.code, raw, total };
});
const studySet = new Set(measured.map((m) => m.iso));
const value = new Map();
for (const m of measured.filter((m) => m.total > 0)) {
  const share = (k) => (Number(m.raw[k] || 0) / m.total) * 100;
  value.set(m.iso, RENEWABLE.reduce((s, k) => s + share(k), 0) + share(NUCLEAR));
}
const unreported = measured.filter((m) => !(m.total > 0)).map((m) => m.iso);

const geo = JSON.parse(await readFile(join(HERE, "shapes.geojson"), "utf8"));
const { seats } = JSON.parse(await readFile(join(HERE, "seats.json"), "utf8"));
/** Every study country needs its join code and its frozen seat before a mark is drawn; the join against
 *  the tiles themselves is asserted in the browser below, on the polygons MapTiler actually serves. */
for (const iso of studySet) {
  iso2Of(iso);
  if (!seats[iso]) throw new Error(`${iso} has no frozen seat in seats.json — run seats.mjs`);
}
const seatOf = (iso) => seats[iso];

// ── THE CLAIM, ASSERTED — the static beat's own checks, including its geography ────────────────
const FLOOR = 94;
const ranked = [...value.entries()].sort((a, b) => b[1] - a[1]);
const above = ranked.filter(([, v]) => v > FLOOR).map(([iso]) => iso);
if (above.length !== 7) throw new Error(`the headline says seven countries clear ${FLOOR} %; ${above.length} do`);
const ODD_ONE = "ALB";
if (!above.includes(ODD_ONE)) throw new Error(`the callout is about ${french(ODD_ONE)}, which is not above the floor`);
/** Neighbours from the frozen rings, in degrees: a vertex within a tenth of a degree of another's. */
const NEAR = 0.1;
const lonLatOf = (iso) => geo.features.filter((f) => f.properties.iso === iso).flatMap((f) => f.geometry.coordinates.flat().flat());
const mine = lonLatOf(ODD_ONE);
const neighbours = [...new Set(geo.features.map((f) => f.properties.iso))]
  .filter((o) => o !== ODD_ONE && value.has(o))
  .filter((o) => lonLatOf(o).some(([x, y]) => mine.some(([u, v]) => Math.abs(x - u) < NEAR && Math.abs(y - v) < NEAR)));
const CEILING = 60;
if (!neighbours.length) throw new Error(`${french(ODD_ONE)} has no neighbour with data`);
if (neighbours.some((iso) => value.get(iso) >= CEILING)) throw new Error(`a card says every neighbour of ${french(ODD_ONE)} is under ${CEILING} %`);
const odd = seatOf(ODD_ONE);
/** In degrees on the frozen seats: south of Albania AND east of it is what "not north or west" means. */
const notNorthWest = above.filter((iso) => iso !== ODD_ONE).filter((iso) => seatOf(iso)[1] < odd[1] && seatOf(iso)[0] > odd[0]);
if (notNorthWest.length) throw new Error(`the headline says the other six are north or west of ${french(ODD_ONE)}; ${notNorthWest.join(", ")} is not`);
if (unreported.length !== 1) throw new Error(`the last card names one reporting country with no reading; there are ${unreported.length}`);

const BREAKS = [40, 55, 70, 85, FLOOR];
const classOf = (v) => BREAKS.filter((b) => v >= b).length;
const one = (v) => plainSpaces(v.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }));
const pct0 = (v) => `${Math.round(v)}${NB}%`;

/** THE CAMERAS, FROM THE BEAT'S OWN FACTS, on a flat Web Mercator map (the owner's ruling after the globe
 *  pilot, addendum §7.1). The whole-map cards are the static plate's own fit: its bounds fitted into its
 *  1000 × 760 frame, scaled to a reference stage 1280 px wide, centred on the bounds' Mercator middle —
 *  so Iceland, Malta and Cyprus are in the frame exactly as on the plate. The close-up comes 2.3 zoom
 *  levels in, CENTRED ON ALBANIA's seat on both axes, with no padding. A real stage keeps the reference's
 *  ground on both axes (`zoomShiftFor`): a phone is fitted by its width, a wide desktop by its height. */
const worldX = (lon) => (lon + 180) / 360;
const worldY = (lat) => (1 - Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360)) / Math.PI) / 2;
const latOfWorldY = (y) => (2 * Math.atan(Math.exp((1 - 2 * y) * Math.PI)) * 180) / Math.PI - 90;
const frameWorldPx = Math.min(FRAME.width / (worldX(BOUNDS[1][0]) - worldX(BOUNDS[0][0])), FRAME.height / (worldY(BOUNDS[0][1]) - worldY(BOUNDS[1][1])));
const REFERENCE = { width: 1280, height: Math.round((1280 * FRAME.height) / FRAME.width) };
const WHOLE_ZOOM = Math.log2((frameWorldPx * (REFERENCE.width / FRAME.width)) / 512);
const WHOLE_CENTER = [(BOUNDS[0][0] + BOUNDS[1][0]) / 2, latOfWorldY((worldY(BOUNDS[0][1]) + worldY(BOUNDS[1][1])) / 2)];
const whole = cameraFields({ center: WHOLE_CENTER, zoom: WHOLE_ZOOM });
const closeUp = cameraFields({ center: odd, zoom: WHOLE_ZOOM + 2.3 });
const cameras = [whole, whole, whole, whole, closeUp, whole];
/** The ring around Albania keeps the ground the SVG's r = 22 frame units covered: that frame's fitted
 *  Web Mercator scale, in degrees per unit. */
const ODD_RING_DEGREES = (22 * 360) / frameWorldPx;

// ── the words ──────────────────────────────────────────────────────────────────────────────────
const title = [
  `Sept pays européens dépassent ${FLOOR}${NB}% d’électricité bas-carbone — six au nord-ouest, et l’Albanie`,
  `Le bas-carbone européen est au nord-ouest — et en Albanie`,
  `Le bas-carbone européen, et son exception`,
];
const topSix = above.filter((iso) => iso !== ODD_ONE);
const prose = [
  [`Part de l’électricité produite à partir de sources bas-carbone — renouvelables et nucléaire réunis — en ${YEAR}, dans les ${value.size} pays européens dont la production est rapportée.`],
  [`La couleur est une classe, pas un nombre : de moins de ${BREAKS[0]}${NB}% à ${FLOOR}${NB}% et plus.`],
  [`Au-dessus de ${FLOOR}${NB}%, il n’en reste que sept.`],
  [`Six sont au nord ou à l’ouest : ${topSix.map(french).join(", ")}.`],
  [`Le septième est l’${french(ODD_ONE)}, ${one(value.get(ODD_ONE))}${NB}% — et ses ${neighbours.length} voisins sont tous sous ${CEILING}${NB}%.`],
  [`L’${french(unreported[0]).replace(/^U/, "U")} n’a pas de production rapportée en ${YEAR}. La Russie et la Turquie sont colorées sur leur part nationale ; le cadre n’en montre que l’extrémité occidentale.`],
];
const names = [
  ...topSix.map((iso) => ({ iso, text: french(iso), role: "top" })),
  { iso: ODD_ONE, text: `${french(ODD_ONE)} · ${pct0(value.get(ODD_ONE))}`, role: "odd" },
  ...neighbours.map((iso) => ({ iso, text: `${french(iso)} · ${pct0(value.get(iso))}`, role: "neighbour" })),
];
const WATERS = [
  { text: "Mer du Nord", seat: [3.0, 56.5] },
  { text: "Méditerranée", seat: [15.0, 36.0] },
  { text: "Baltique", seat: [19.5, 58.0] },
];
const topCount = { template: `{n} pays au-dessus de ${FLOOR}${NB}%`, value: above.length };
const source = "Source : Ember, Energy Institute – Statistical Review of World Energy (2025), via Our World in Data · fond de carte et contours © MapTiler © OpenStreetMap";
const alt =
  `Carte choroplèthe de l’Europe : la part d’électricité bas-carbone de ${value.size} pays en ${YEAR}, en six classes. ` +
  `Sept pays dépassent ${FLOOR} % : ${above.map(french).join(", ")}. L’${french(ODD_ONE)}, à ${one(value.get(ODD_ONE))} %, ` +
  `a ${neighbours.length} voisins tous sous ${CEILING} %.`;

const STATES = [
  { classes: 0, filter: 0, top: 0, zoom: 0, odd: 0 },
  { classes: 1, filter: 0, top: 0, zoom: 0, odd: 0 },
  { classes: 1, filter: 1, top: 0, zoom: 0, odd: 0 },
  { classes: 1, filter: 1, top: 1, zoom: 0, odd: 0 },
  { classes: 1, filter: 0, top: 0, zoom: 1, odd: 1 },
  { classes: 1, filter: 0, top: 1, zoom: 0, odd: 1 },
].map((state, k) => ({ ...state, ...cameras[k], card: k }));

const textPerRegister = {
  display: title.join(" "),
  eyebrow: EYEBROW,
  body: `${prose.flat().join(" ")} ${source}`,
  axis: `${names.map((n) => n.text).join(" ")} ${BREAKS.map((b) => `${b}${NB}%`).join(" ")} part bas-carbone de la production donnée non rapportée 0123456789`,
  annot: WATERS.map((w) => w.text).join(" "),
  value: `${topCount.template} 0123456789`,
};

const filed = readdirSync(DIRECTIONS)
  .filter((f) => f.endsWith(".md"))
  .map((f) => readDirection(join(DIRECTIONS, f)));
const newsroom = readPalette(HERE, { stopAt: join(HERE, "..") });
const BEAT_FACTS = { evidenceLevels: BREAKS.length + 1 };
console.log(report(composeDirections({ newsroom, filed, beat: BEAT_FACTS, textPerRegister }), { beat: BEAT_FACTS }));
console.log(`${french(ODD_ONE)} ${one(value.get(ODD_ONE))} · voisins ${neighbours.map((i) => `${french(i)} ${one(value.get(i))}`).join(", ")}\n`);

// ── the live map: its key, its faces, its tiles, its frozen cards ──────────────────────────────
const key = mapTilerKeyIn(process.env);
if (!key)
  throw new Error(
    "no MapTiler key in the environment: this render proves the faces MapTiler serves, the join against its " +
      "Countries tiles and bakes the card images, and none of that can be faked. Run it with the worktree's .env loaded.",
  );
const PLACEHOLDER = "__MAPTILER" + "_KEY__";
const keyed = (value) => JSON.parse(JSON.stringify(value).split(PLACEHOLDER).join(key));

/** MAPTILER SERVES FACES, NOT FAMILIES, and answers 200 with Noto Sans for a face it does not have. A
 *  register's family and weight become the face name MapTiler uses, and the bytes it returns are
 *  compared with the fallback's before the face is written into a layer. */
const FACE_WEIGHTS = { 400: "Regular", 500: "Medium", 700: "Bold" };
const servedFaces = new Map();
async function maptilerFaceOf(register, role) {
  const family = String(register.fontFamily).split(",")[0].trim().replace(/^["']|["']$/g, "");
  const weight = FACE_WEIGHTS[Number(register.fontWeight)];
  if (!weight) throw new Error(`no MapTiler face name for ${family} at weight ${register.fontWeight} (the ${role} register)`);
  const italic = register.fontStyle === "italic";
  const suffix = [italic && weight === "Regular" ? null : weight, italic ? "Italic" : null].filter(Boolean).join(" ");
  const face = `${family} ${suffix}`;
  if (!servedFaces.has(face)) {
    const bytes = await maptilerGlyphs(face, "0-255", key);
    assertNotFallback(bytes, await maptilerGlyphs(`Zzz Fictive ${suffix}`, "0-255", key), face);
    assertNotFallback(bytes, await maptilerGlyphs(`Noto Sans ${suffix}`, "0-255", key), face);
    servedFaces.set(face, bytes.length);
  }
  return face;
}
const trackingEm = (register) => Number.parseFloat(register.letterSpacing ?? "0") / Number.parseFloat(register.fontSize);

const require = createRequire(import.meta.url);
const maplibreJs = await readFile(require.resolve("maplibre-gl/dist/maplibre-gl.js"), "utf8");
const maplibreCss = await readFile(require.resolve("maplibre-gl/dist/maplibre-gl.css"), "utf8");
const mapScript = await scrollyMapScript();
const driver = `${mapScript}\n${await readFile(join(HERE, "choropleth-drive.mjs"), "utf8")}`;
const styleDoc = await (await fetch(`https://api.maptiler.com/maps/dataviz/style.json?key=${key}`)).json();
if (!styleDoc.glyphs) throw new Error("the dataviz style carries no glyph endpoint");
const unkeyedStyle = JSON.parse(JSON.stringify(styleDoc).split(key).join(PLACEHOLDER));
const MAPLIBRE_VERSION = JSON.parse(await readFile(require.resolve("maplibre-gl/package.json"), "utf8")).version;
const TRUNK_DIGEST = createHash("sha256")
  .update((await Promise.all(["bake.mjs", "mount.mjs", "style.mjs", "scrolly.mjs", "scrolly-live.mjs"].map((f) => readFile(join(HERE, "../../shared/map-beat", f), "utf8")))).join("\0"))
  .digest("hex");

const browser = await puppeteer.launch({ executablePath: resolveChrome(), args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--hide-scrollbars"] });
/** THE STAGE A RENDERED PAGE PUBLISHES at each measured viewport, in the whole CSS pixels the live runtime
 *  reads (`clientWidth`, `clientHeight`). Read WITH the page's scripts, once its faces are loaded: the header
 *  sets the longest title form that fits (`fitTitle`), so a phone's stage is taller than the no-script layout's. */
async function measureStages(file) {
  const out = {};
  for (const [shape, viewport] of Object.entries(MEASURED_VIEWPORTS)) {
    const page = await browser.newPage();
    try {
      await page.setViewport({ ...viewport, deviceScaleFactor: 1 });
      await page.goto(`file://${file}`, { waitUntil: "load" });
      await page.evaluate(() => document.fonts.ready.then(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))));
      out[shape] = await page.evaluate(() => {
        const stage = document.querySelector('[data-part="stage"]');
        return { width: stage.clientWidth, height: stage.clientHeight };
      });
    } finally {
      await page.close();
    }
  }
  return out;
}

async function mapPage() {
  const page = await browser.newPage();
  await page.setContent(
    `<style>${maplibreCss} html,body{margin:0} #map{position:absolute;inset:0}</style><div id="map"></div><script>${maplibreJs}</script>` +
      `<script>${mapScript}\nwindow.__mountPlan = mountPlan;</script>`,
  );
  return page;
}

const shares = Object.fromEntries([...studySet].map((iso) => [iso2Of(iso), value.has(iso) ? value.get(iso) : null]));

/** THE JOIN, AGAINST THE TILES. Every reporting country must be a polygon MapTiler Countries really
 *  serves at the whole-map camera, under the code this beat joins it on — or the map shows bare land
 *  where the data has a value, and nothing says so. Malta is found among level-1 units at this zoom
 *  (`plan.mjs`). */
async function assertJoin(page) {
  await page.setViewport({ ...JOIN_VIEW, deviceScaleFactor: 1 });
  const zoom = WHOLE_ZOOM + zoomShiftFor({ referenceWidth: REFERENCE.width, referenceHeight: REFERENCE.height }, JOIN_VIEW.width, JOIN_VIEW.height);
  const found = await page.evaluate(
    async (style, url, sourceLayer, center, zoom) => {
      const map = new maplibregl.Map({ container: "map", style, center, zoom, interactive: false, fadeDuration: 0 });
      await new Promise((r) => map.once("style.load", r));
      map.setProjection({ type: "mercator" });
      map.addSource("countries", { type: "vector", url });
      map.addLayer({ id: "countries", type: "fill", source: "countries", "source-layer": sourceLayer, paint: { "fill-opacity": 0 } });
      await new Promise((r) => map.once("idle", r));
      const features = map.querySourceFeatures("countries", { sourceLayer });
      const out = features.map((f) => [f.properties.level, f.properties.iso_a2]);
      map.remove();
      return out;
    },
    styleDoc,
    `https://api.maptiler.com/tiles/countries/tiles.json?key=${key}`,
    LAYER,
    WHOLE_CENTER,
    zoom,
  );
  const codes = new Set(found.filter(([level, code]) => level === 0 || (level === 1 && code === "MT")).map(([, code]) => code));
  const missingCodes = Object.keys(shares).filter((code) => !codes.has(code));
  if (missingCodes.length)
    throw new Error(`the join dropped rows: MapTiler Countries (${LAYER}, ${LEVEL}, ${ISO}) serves no polygon for ${missingCodes.join(", ")} at the whole-map camera`);
  return codes.size;
}

const refused = [];
const joinPage = await mapPage();
try {
  console.log(`join: ${Object.keys(shares).length} study countries found among ${await assertJoin(joinPage)} codes in MapTiler Countries`);
} finally {
  await joinPage.close();
}

try {
  for (const file of readdirSync(DIRECTIONS).filter((f) => f.endsWith(".md"))) {
    const id = file.replace(/\.md$/, "");
    const direction = resolveDirectionFamilies(readDirection(join(DIRECTIONS, file)), textPerRegister);
    const { ink, muted, grid } = deriveFurniture(direction.ground);
    const regs = webRegisters(direction, { ink: { ink, muted, accent: direction.accent } });
    try {
      const tints = plateTints(direction);
      const classCount = BREAKS.length + 1;
      const low = mix(direction.accent, direction.ground, 0.88);
      const high = mix(direction.accent, ink, 0.3);
      const classFills = Array.from({ length: classCount }, (_, i) => mix(low, high, i / (classCount - 1)));
      const missingFill = mix(direction.ground, ink, 0.13);
      const accentInk = adjustToContrast(direction.accent, direction.ground, TEXT_CONTRAST_MIN) ?? direction.accent;
      const inkOnGround = adjustToContrast(ink, direction.ground, TEXT_CONTRAST_MIN) ?? ink;
      const fonts = {
        axis: await maptilerFaceOf(regs.axis, "axis"),
        axisSize: Number.parseFloat(regs.axis.fontSize),
        axisTracking: trackingEm(regs.axis),
        annot: await maptilerFaceOf(regs.annot, "annot"),
        annotSize: Number.parseFloat(regs.annot.fontSize),
        annotTracking: trackingEm(regs.annot),
        ink: inkOnGround,
        accentInk,
        waterInk: adjustToContrast(WATER_HUE, tints.water, TEXT_CONTRAST_MIN) ?? inkOnGround,
        /** THE SIX NAMES SIT ON THEIR OWN COUNTRIES, and every one of the seven is in the top class, so the
         *  cell under them is known: the accent is walked to 7:1 against THAT fill and the halo is struck in
         *  it — the static beat's own rule for a feature's name (`rampFor().inkFor`). Against the page
         *  ground the accent is the same colour as the fill it is written on. */
        topInk: adjustToContrast(direction.accent, classFills[classCount - 1], 7) ?? deriveFurniture(classFills[classCount - 1]).ink,
        topHalo: classFills[classCount - 1],
      };
      if (above.some((iso) => classOf(value.get(iso)) !== classCount - 1)) throw new Error("a country above the floor is not in the top class, and its name's ink was measured against the top class");
      const nameAt = (n) => ({ iso2: iso2Of(n.iso), text: n.text, seat: seatOf(n.iso) });
      const plan = choroplethPlan({
        tints: { water: tints.water, land: tints.land },
        classFills,
        missingFill,
        /** A border outside the study set is quieter than one inside it, as the SVG drew it — but never in
         *  the page's own ground, which the live guard reads as a hole in the map. */
        border: { studied: grid, other: mix(tints.land, grid, 0.4), width: direction.stroke?.hairline ?? 0.6 },
        shares,
        breaks: BREAKS,
        top: above.map(iso2Of),
        odd: nameAt(names.find((n) => n.role === "odd")),
        neighbours: names.filter((n) => n.role === "neighbour").map(nameAt),
        // Ukraine keeps its neutral fill (the key's "donnée non rapportée" swatch names it) and no word on the
        // map: the owner ruled the in-map label out on 2026-09-15; card 6's sentence says it.
        missing: unreported.map((iso) => ({ iso2: iso2Of(iso) })),
        waters: WATERS,
        words: { top: names.filter((n) => n.role === "top").map(nameAt) },
        cameras,
        statesForCards: STATES,
        fonts,
        referenceWidth: REFERENCE.width,
        referenceHeight: REFERENCE.height,
        ringDegrees: ODD_RING_DEGREES,
      });
      plan.oddRingDegrees = ODD_RING_DEGREES;
      const violations = [...validateScrollyPlan(plan, STATES), ...validateExpressions(plan)];
      if (violations.length) throw new Error(`the plan is not renderable:\n  ${violations.join("\n  ")}`);

      const renderPage = (fallbacks, shapes) =>
        renderScrolly({
          steps: prose.map((p, i) => ({ id: ["pays", "classes", "sept", "nord-ouest", "albanie", "retour"][i], prose: p })),
          reveal: {
            element: createElement(DirectedChoroplethScrolly, {
              plan: { ...plan, fallback: shapes },
              first: STATES[0],
              reference: REFERENCE,
              fallbacks,
              classFills,
              missingFill,
              breaks: BREAKS.map((b) => `${b}${NB}%`),
              odd: names.find((n) => n.role === "odd"),
              topCount,
              unit: "part bas-carbone de la production",
              missingLabel: "donnée non rapportée",
              alt,
              regs,
              stroke: direction.stroke ?? {},
              ground: direction.ground,
              accent: direction.accent,
              ink,
              muted,
              water: tints,
            }),
            states: STATES,
            driver,
            apply: "applyChoroplethState",
          },
          vendor: [{ js: maplibreJs, css: maplibreCss }],
          title,
          eyebrow: EYEBROW,
          source,
          ground: direction.ground,
          type: { eyebrow: { ...regs.eyebrow, marginBottom: `${gapOf(registerOf(direction, "eyebrow"), EYEBROW_TO_DISPLAY)}px` }, display: regs.display, body: regs.body, source: regs.body },
          lang: "fr",
          outDir: OUT,
          name: `${id}.html`,
        });

      // THE STAGE FIRST: a draft page with blank card images publishes the same layout (images are absolutely
      // placed), and its stages are what the cards are baked at.
      const BLANK = "data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==";
      const blankShape = { size: { width: 1, height: 1 }, cards: STATES.map(() => ({ odd: [0, 0], zoom: 0 })) };
      const draft = await renderPage(
        STATES.map(() => ({ wide: { x1: BLANK, x2: BLANK }, tall: { x1: BLANK, x2: BLANK } })),
        { wide: blankShape, tall: blankShape },
      );
      const stages = await measureStages(draft.outPath);
      const SIZES = {
        wide: { width: evenFrom(stages.wide.height * WIDE_ASPECT, stages.wide.width), height: stages.wide.height },
        tall: { width: stages.tall.width, height: evenFrom(stages.tall.width / TALL_ASPECT, stages.tall.height) },
      };

      // THE CARD IMAGES ARE BAKED ONLY WHEN WHAT THEY PICTURE HAS CHANGED: the plan (key-free) and the sizes.
      // The page behind the bake is the STAGE's own ground (the water tint): whatever the canvas leaves
      // transparent shows it, never a white page.
      const stageGround = tints.water;
      // TWO DENSITIES PER CARD, 2x AND 1x, chosen by the page's `<picture>` media queries: a 1x screen shown the 2x
      // picture at half size reads the map's words thinner than the live 1x canvas that replaces them (recorded on
      // 2026-09-15, the owner's "les fonts changent").
      const SCALES = [2, 1];
      const SHAPES = Object.keys(SIZES);
      // The hash covers everything the pixels depend on besides the plan: the style document (key taken back
      // out), the MapLibre that draws it, and the trunk code that mounts, sweeps and paints it — a MapTiler
      // restyle or a trunk change re-bakes the card images instead of leaving them behind the live map.
      const planHash = createHash("sha256")
        .update(JSON.stringify({ plan, sizes: SIZES, stageGround, scales: SCALES, style: unkeyedStyle, maplibre: MAPLIBRE_VERSION, trunk: TRUNK_DIGEST }))
        .digest("hex");
      const recordPath = join(FALLBACK, `${id}.json`);
      const variants = SHAPES.flatMap((shape) => SCALES.map((scale) => [shape, scale]));
      let record = existsSync(recordPath) ? JSON.parse(await readFile(recordPath, "utf8")) : null;
      if (!record || record.planHash !== planHash || STATES.some((_, k) => variants.some(([shape, scale]) => unbaked(id, k, shape, scale)))) {
        await mkdir(FALLBACK, { recursive: true });
        const page = await mapPage();
        try {
          await page.evaluate((ground) => {
            document.documentElement.style.background = ground;
            document.body.style.background = ground;
          }, stageGround);
          const shapes = {};
          for (const [shape, scale] of variants) {
            const baked = await bakeCards({
              page,
              plan: { ...keyed(plan), style: keyed(styleDoc) },
              cameras,
              size: SIZES[shape],
              glyphsUrl: styleDoc.glyphs,
              tints: plan.tints,
              keepLabels: [],
              statesForCards: STATES,
              outDir: FALLBACK,
              stem: stemOf(id, shape, scale),
              project: [plan.oddSeat],
              scale,
            });
            shapes[shape] = { size: SIZES[shape], cards: baked.map((b) => ({ odd: b.projected[0].map((v) => Math.round(v * 10) / 10), zoom: b.zoom })) };
          }
          record = { planHash, shapes };
          await writeFile(recordPath, `${JSON.stringify(record, null, 2)}\n`);
          console.log(`${id}: baked ${STATES.length} cards at ${SHAPES.map((shape) => `${SIZES[shape].width} × ${SIZES[shape].height}`).join(" and ")}`);
        } finally {
          await page.close();
        }
      }
      // THE BAKES TRAVEL AS LOSSLESS WEBP: the same pixels as the PNG the browser wrote, in about 40 % of its bytes.
      for (const [k] of STATES.entries())
        for (const [shape, scale] of variants) {
          if (!existsSync(pngOf(id, k, shape, scale))) continue;
          try {
            execFileSync("cwebp", ["-quiet", "-lossless", "-z", "9", "-exact", pngOf(id, k, shape, scale), "-o", webpOf(id, k, shape, scale)]);
          } catch (error) {
            throw new Error(`cwebp could not encode ${pngOf(id, k, shape, scale)} (brew install webp): ${error.message}`);
          }
          await rm(pngOf(id, k, shape, scale));
        }
      const fallbacks = [];
      for (const [k] of STATES.entries())
        fallbacks.push({
          wide: { x1: await fallbackUri(id, k, "wide", 1), x2: await fallbackUri(id, k, "wide", 2) },
          tall: { x1: await fallbackUri(id, k, "tall", 1), x2: await fallbackUri(id, k, "tall", 2) },
        });
      // The page carries this direction's own bakes, never another's (see `stemOf`).
      const own = new Set();
      for (const f of readdirSync(FALLBACK).filter((f) => f.startsWith(`${id}-`) && f.endsWith(".webp")))
        own.add(toDataUri(await readFile(join(FALLBACK, f)), "image/webp"));
      const inlined = fallbacks.flatMap((card) => Object.values(card).flatMap((pair) => Object.values(pair)));
      if (inlined.some((u) => !own.has(u)) || new Set(inlined).size !== inlined.length)
        throw new Error(`a card image inlined for ${id} is not one of ${id}'s own bakes`);

      const { outPath } = await renderPage(fallbacks, record.shapes);
      // The written page must publish the stages its cards were baked at, or the frozen card and the live map part.
      const published = await measureStages(outPath);
      for (const shape of SHAPES) {
        const baked = SIZES[shape];
        const at = published[shape];
        const kept = shape === "wide" ? at.height === baked.height : at.width === baked.width;
        if (!kept) throw new Error(`the ${shape} stage measured ${at.width} × ${at.height} on the written page, and its cards were baked for ${baked.width} × ${baked.height}`);
      }
      console.log(`${id} -> ${outPath.replace(`${HERE}/`, "")} · faces ${fonts.axis} / ${fonts.annot}`);
    } catch (error) {
      await rm(join(OUT, `${id}.html`), { force: true });
      refused.push({ id, why: error.message });
      console.log(`${id} REFUSED — ${error.message}`);
    }
  }
} finally {
  await browser.close();
}
console.log(`faces served by MapTiler, each checked against the Noto Sans fallback: ${[...servedFaces.keys()].join(", ")}`);
if (refused.length) {
  console.log(`\nrefused by ${refused.length}: ${refused.map((x) => x.id).join(", ")}`);
  process.exitCode = 1;
}
