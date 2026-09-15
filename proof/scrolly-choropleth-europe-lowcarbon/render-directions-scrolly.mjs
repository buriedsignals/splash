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

import { readdirSync } from "node:fs";
import { readFile, rm } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { deriveFurniture } from "#shared/chart-beat/render-still.mjs";
import { adjustToContrast, mix, readPalette, TEXT_CONTRAST_MIN } from "#shared/chart-beat/colour.mjs";
import { readDirection } from "#shared/design-base/read-direction.mjs";
import { composeDirections, report } from "#shared/design-base/compose.mjs";
import { resolveDirectionFamilies } from "#shared/design-base/resolve-families.mjs";
import { plainSpaces, webRegisters } from "#shared/design-base/web.mjs";
import { EYEBROW_TO_DISPLAY, gapOf, registerOf } from "#shared/design-base/register.mjs";
import { validateExpressions } from "#shared/map-beat/mount.mjs";
import { cameraFields, validateScrollyPlan, zoomShiftFor } from "#shared/map-beat/scrolly.mjs";
import { plateTints, WATER_HUE } from "#shared/map-beat/tints.mjs";
import { renderScrolly } from "../../skills/scrolly/scripts/render-scrolly.mjs";
import { openLiveMapCards, renderWithCardImages } from "../../skills/scrolly/scripts/live-map-cards-bake.mjs";
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

/** The view the join is asserted at: a desktop stage. */
const JOIN_VIEW = { width: 1168, height: 566 };
/** THE CARD IMAGES — measured stages, two shapes, two densities, lossless WebP, the own-bakes check — are
 *  `skills/scrolly/scripts/live-map-cards-bake.mjs`'s; this beat decides only what they picture. */

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
// The key proves the faces MapTiler serves, the join against its Countries tiles, and bakes the card images.
const cards = await openLiveMapCards();
const { key, styleDoc } = cards;
const driver = `${cards.mapScript}\n${await readFile(join(HERE, "choropleth-drive.mjs"), "utf8")}`;
const trackingEm = (register) => Number.parseFloat(register.letterSpacing ?? "0") / Number.parseFloat(register.fontSize);

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
const joinPage = await cards.mapPage();
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
        axis: await cards.faceOf(regs.axis, "axis"),
        axisSize: Number.parseFloat(regs.axis.fontSize),
        axisTracking: trackingEm(regs.axis),
        annot: await cards.faceOf(regs.annot, "annot"),
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
          vendor: [{ js: cards.maplibreJs, css: cards.maplibreCss }],
          title,
          eyebrow: EYEBROW,
          source,
          ground: direction.ground,
          type: { eyebrow: { ...regs.eyebrow, marginBottom: `${gapOf(registerOf(direction, "eyebrow"), EYEBROW_TO_DISPLAY)}px` }, display: regs.display, body: regs.body, source: regs.body },
          lang: "fr",
          outDir: OUT,
          name: `${id}.html`,
        });

      // THE PAGE BEHIND THE BAKE IS THE STAGE's own ground (the water tint): whatever the canvas leaves transparent
      // shows it, never a white page. Albania's seat is read back per card, for the chip lifted over the image.
      const { outPath } = await renderWithCardImages(cards, {
        id,
        plan,
        states: STATES,
        fallbackDir: FALLBACK,
        stageGround: tints.water,
        project: [plan.oddSeat],
        cardOf: (baked) => ({ odd: baked.projected[0].map((v) => Math.round(v * 10) / 10), zoom: baked.zoom }),
        blankCard: { odd: [0, 0], zoom: 0 },
        renderPage,
      });
      console.log(`${id} -> ${outPath.replace(`${HERE}/`, "")} · faces ${fonts.axis} / ${fonts.annot}`);
    } catch (error) {
      await rm(join(OUT, `${id}.html`), { force: true });
      refused.push({ id, why: error.message });
      console.log(`${id} REFUSED — ${error.message}`);
    }
  }
} finally {
  await cards.close();
}
console.log(`faces served by MapTiler, each checked against the Noto Sans fallback: ${[...cards.servedFaces.keys()].join(", ")}`);
if (refused.length) {
  console.log(`\nrefused by ${refused.length}: ${refused.map((x) => x.id).join(", ")}`);
  process.exitCode = 1;
}
