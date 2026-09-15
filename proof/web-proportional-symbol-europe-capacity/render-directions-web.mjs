// twin/proof/web-proportional-symbol-europe-capacity/render-directions-web.mjs
//
// Europe's low-carbon capacity as proportional symbols, one circle per country. Rendered once per
// FILED DIRECTION into a self-contained interactive page.
//
// THE RESTING LAW IS THE AREA LAW: a circle twice the area stands for twice the capacity. The page
// then hands the reader the exponent itself — the one parameter this type sets in silence — through
// `skills/map-web/assets/area-scale.ts`. Every number the control's sentences print is derived here
// from the frozen file by that vocabulary and asserted before anything is drawn.
//
// Usage:  bun proof/web-proportional-symbol-europe-capacity/render-directions-web.mjs

import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
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
} from "../../skills/map-web/assets/area-scale.ts";
// THE SECOND LAYER: a real MapTiler map under this beat's own drawing, carrying MapLibre's own
// controls. The owner's ruling, in his words — *"utilise les vrais controls de maptiler pas des
// controls extérieurs"* — and R1's before it. Its ceiling is DERIVED below from the subject the
// claim is about, so the framing can never be zoomed past the country the headline names.
import {
  assertLiveBasemapDeclaration,
  assertOneLiveBasemap,
  maxZoomHeadroomOf,
} from "../../skills/map-web/assets/live-basemap.ts";
import { DirectedSymbolMapWeb } from "./DirectedSymbolMapWeb.tsx";
import { WINDOW, CAMERA_ASPECT as MEASURE_ASPECT } from "./camera.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const DIRECTIONS = join(HERE, "..", "..", "docs", "design-base", "directions");
const OUT = join(HERE, "renders");
const EYEBROW = "Énergie · Europe";
const SIZE = 900;
const OLD = ["Hydro", "Nuclear"];
const NEW = ["Wind", "Solar"];
const R_MAX = 46;
/** THE LEGIBILITY FLOOR, in the drawing's own units. A circle drawn under it is, on the page,
 *  indistinguishable from a place with no data at all. One unit of this geometry is about 1,5 CSS
 *  pixels at the width this page fills on a laptop, so a radius under 1 is a mark under three
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

// ── THE CAMERA IS THE PLATE'S ─────────────────────────────────────────────────────────────────
//
// The equal-area camera in `camera.ts` is still this beat's own, and it is what MEASURES. It no
// longer PLACES anything. What places every mark is the baked MapTiler plate's own recorded camera —
// `frameCorners`, read back with `map.unproject()` after the camera settled, not the nominal bounds
// handed to `fitBounds`, which fitBounds widens to keep the frame's aspect. Longitude is linear in
// pixel-x under Web Mercator; latitude is not, and needs the inverse Mercator formula, because
// pixel-y is linear in Mercator-y.
//
// ONE PLATE PER FILED DIRECTION, baked in that direction's own tints. The three share a camera by
// construction, and that is asserted below rather than assumed: three plates that disagreed about
// where 10°E is would put the same mark in three places and nothing here would notice.
//
// NOTHING IN THIS BEAT'S GESTURE TOUCHES ANY OF IT. The reader changes the exponent of the size
// scale; the camera, the plate, the frame and every `cx`/`cy` are the same bytes in all three states.
// THE PLATE IS BAKED WIDER THAN THE STUDY SET NEEDS, AND THAT IS THE BEAT'S EXTENSION.
//
// The layout holds the figure inside the window's height, so this map is HEIGHT-bound: at 1512x860
// its drawing came to 735px inside a 1464px track and the other 729px were empty page. A map may
// give that width back to the DRAWING by opening its geographic window — the frame shows more of
// the surroundings AT THE SAME SCALE. Baking wider at the SAME HEIGHT is exactly that and nothing
// else: `fitBounds` binds on the y axis here (the box is wider than the bounds' own ratio), so the
// latitudes 34..68 and the zoom are untouched — measured, zoom 3.89 and 3321.63 m/px on both the
// 1600 and the 1824 bake — and every extra pixel is longitude. `project` normalises by the frame's
// WIDTH on both axes, so one degree keeps the same size on screen and not one circle moves relative
// to another.
//
// WHY 1824 AND NOT MORE, LOOKED AT RATHER THAN REASONED. The bake at 1946 (ratio 1.60) brings the
// east coast of Greenland into the top-left corner and carries the east edge to 54.6E, well across
// the Caspian into Kazakhstan — two landmasses this beat holds no datum for, and a reader is
// entitled to read empty land as "nothing here" rather than "not counted here". At 1824 (ratio
// 1.50) the west edge is open Atlantic at 34.7W and the east edge stops at 51.7E, on the Caspian's
// own water. That is this type's bound, and `frame.maxRatio` below is it.
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
        `disagree about where a degree is would put the same mark in three places, and nothing ` +
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
/** Into the drawing's own unit box: divided by the frame's WIDTH on both axes, so one scale serves
 *  both and nothing is sheared. */
const project = ([lon, lat]) => {
  const px = ((lon - CORNERS.west) / (CORNERS.east - CORNERS.west)) * FRAME.width;
  const py = ((mercY(lat) - Y_NORTH) / (Y_SOUTH - Y_NORTH)) * FRAME.height;
  return [px / FRAME.width, py / FRAME.width];
};
console.log(
  `camera qui DESSINE : plaque MapTiler ${FRAME.width}x${FRAME.height} · ` +
    `${CORNERS.west.toFixed(2)}..${CORNERS.east.toFixed(2)}E ` +
    `${CORNERS.south.toFixed(2)}..${CORNERS.north.toFixed(2)}N · aspect ${CAMERA_ASPECT.toFixed(2)}:1 · ` +
    `zoom ${plateFacts.zoom} · caméra qui MESURE (camera.ts, EPSG:3035) aspect ${MEASURE_ASPECT.toFixed(2)}:1 ` +
    `sur ${WINDOW.west}..${WINDOW.east}E\n`,
);

const width = CAMERA_ASPECT >= 1 ? SIZE : SIZE * CAMERA_ASPECT;
const height = CAMERA_ASPECT >= 1 ? SIZE / CAMERA_ASPECT : SIZE;
const toPx = ([ux, uy]) => [ux * SIZE, uy * SIZE];

// ── THE SCALE LAWS THE READER HOLDS ───────────────────────────────────────────────────────────
//
// Three laws over the same 41 circles at the same 41 centres. The vocabulary normalises each to the
// same anchor radius, so the biggest circle is identical in all three and the ONLY thing that
// changes is the spread — which is the one quantity the exponent decides.
//
// The legend's magnitudes are `niceReferenceValues`'s own ladder, and they are part of this
// declaration rather than of the drawing: `assertOneAreaScale` reads the written page back and
// refuses it unless each swatch re-scales under each law. A size legend that stood still while the
// marks re-sized would be the only instrument on a symbol map for turning an area back into a
// quantity, calibrated to a scale nothing on the page is drawn in.
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
/** The three laws, before their sentences exist: the sentences quote numbers this vocabulary
 *  derives from exactly these laws, so the facts are computed first and the words written round
 *  them — never the other way about. */
const LAWS = [
  { key: "Aire proportionnelle", label: "Aire proportionnelle", exponent: 0.5 },
  { key: "Rayon proportionnel", label: "Rayon proportionnel", exponent: 1 },
  { key: "Aire aplatie", label: "Aire aplatie", exponent: 1 / 3 },
];
const lawFacts = LAWS.map((law) => areaScaleFacts({ ...baseScale, options: LAWS }, law));
const SUBJECT = NAMES[biggest.country];
const REFERENCE = NAMES[median.country];
const FLOOR_WORDS = `moins de trois pixels de diamètre`;

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
      `capacité · ${lawFacts[i].erased.length} pays sous le seuil de ${R_FLOOR}`,
  );
console.log("");

const symbols = rows.map((r, index) => {
  const [cx, cy] = toPx(project([r.lon, r.lat]));
  return {
    key: r.key,
    name: NAMES[r.country],
    figure: `${fr(r.mw / 1000, 0)} GW`,
    // THE LABELLED SET IS THE CLAIM'S OWN FIVE, not "whatever happens to be big enough". A radius
    // threshold labelled seven countries here, and the two it added are Norvège and Suède, whose
    // weighted fleet centres are close enough for their labels to collide. The claim names five.
    labelled: index < 5,
    cx,
    cy,
    detail:
      `${NAMES[r.country]} · ${fr(r.mw / 1000)} GW bas-carbone (${fr((r.mw / totalMw) * 100)} % de ` +
      `l'Europe) · ${plain(r.count.toLocaleString("fr-FR"))} centrales · eau + atome ` +
      `${fr((r.old / r.mw) * 100)} %, vent + soleil ${fr((r.fresh / r.mw) * 100)} %`,
  };
});

const keySizes = keyValues.map((k) => ({ key: k.key, label: `${fr(k.value / 1000, 0)} GW` }));

// ── the basemap ───────────────────────────────────────────────────────────────────────────────
const geo = JSON.parse(await readFile(join(HERE, "shapes.geojson"), "utf8"));
const MIN_STEP = 0.6;
const land = geo.features
  .flatMap((f) => {
    const polys = f.geometry.type === "Polygon" ? [f.geometry.coordinates] : f.geometry.coordinates;
    return polys.map((p) => {
      const out = [];
      for (const q of p[0]) {
        const px = toPx(project(q));
        const last = out[out.length - 1];
        if (!last || Math.hypot(px[0] - last[0], px[1] - last[1]) >= MIN_STEP) out.push(px);
      }
      return out.length >= 3 ? out : p[0].map((q) => toPx(project(q)));
    });
  })
  .map((r) => `M ${r.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join(" L ")} Z`)
  .join(" ");

// ── THE WINDOW THE READER MAY MOVE ────────────────────────────────────────────────────────────
//
// THE CEILING IS A COUNTRY, AND IT IS MEASURED HERE RATHER THAN CHOSEN. The reason to bring this
// map closer is the caveat's own claim — that a symbol sits at the capacity-weighted centre of its
// country's OWN stations and not at its centroid — and that claim is unreadable at the published
// width, where the whole of France is 170 units of a 900-unit drawing. So the window is never
// allowed to be narrower than the subject the headline names: a reader who has zoomed in to see
// where inside France its centre of gravity falls can always still see the whole of France around
// it, and past that the map would be showing terrain this beat holds no datum for.
//
// `live-basemap.ts` recomputes the ceiling from these two numbers and refuses a beat that types one.
const subjectShape = geo.features.filter((f) => f.properties.name === biggest.country);
if (subjectShape.length === 0)
  throw new Error(
    `${biggest.country} holds the biggest fleet and has no shape in the frozen file, so the zoom ` +
      `ceiling cannot be measured against the country the headline names`,
  );
const subjectSpan = (() => {
  let west = Infinity;
  let east = -Infinity;
  const walk = (node) => {
    if (typeof node[0] === "number") {
      const [x] = toPx(project(node));
      west = Math.min(west, x);
      east = Math.max(east, x);
    } else node.forEach(walk);
  };
  for (const f of subjectShape) walk(f.geometry.coordinates);
  return east - west;
})();
/** THE MAP'S OWN ACCESSIBLE DESCRIPTION, and the last sentence is the promise this arrangement
 *  makes about the beat's own claim: the window moves, the scale of the areas does not. Every glyph
 *  of it is in the markup and it is declared here, once, so the register census below cuts the
 *  page's faces for it. */
const LIVE_HINT =
  "Carte interactive : glissez-la pour la déplacer, pincez ou utilisez les boutons plus et moins " +
  "pour zoomer, les flèches du clavier la déplacent une fois qu'elle a le focus. Cercles, " +
  "étiquettes et légende gardent leur taille à l'écran : la carte s'approche, l'échelle des aires " +
  "ne change pas.";

/** THE LIVE LAYER'S DECLARATION. The floor is the published framing — the plot cell carries the
 *  plate's own ratio, so the recorded corners fit the container exactly and there is only ONE
 *  window at that floor. The ceiling is the subject the headline names, measured above, and
 *  `live-basemap.ts` recomputes it from these two numbers and refuses a beat that types one. */
const liveFor = (d) => ({
  style: plateFacts.style,
  corners: CORNERS,
  view: { width, height },
  subject: { label: NAMES[biggest.country], width: subjectSpan },
  // THE LIVE STYLE IS PAINTED IN WHAT THE READER IS ALREADY LOOKING AT, not in whatever the plate's
  // own background happens to be. The water is the plate's own baked tint; the LAND is the tint of
  // the vector path drawn OVER the plate, which is the ground a reader actually sees and which the
  // live map replaces. Painting the live land with the plate's own 7 % step would have made the
  // swap on `load` a visible flash of a colour nothing on this page was ever drawn in.
  tints: { water: plateTints(d).water, land: mix(d.ground, deriveFurniture(d.ground).ink, 0.1) },
  // MAPLIBRE'S OWN CONTROLS, NAMED IN THIS PAGE'S OWN LANGUAGE. The library ships English defaults
  // and nothing warns you: a French beat would hand a screen reader "Zoom in".
  locale: {
    title: "Carte de la capacité bas-carbone européenne",
    zoomIn: "Zoom avant",
    zoomOut: "Zoom arrière",
  },
  hint: LIVE_HINT,
});
/** ONE DECLARATION PER FILED DIRECTION, refused here rather than at the render: the three differ
 *  only in their two tints, and a tint that stopped clearing its own step off the ground would
 *  otherwise be found by looking at a picture. */
for (const file of DIRECTION_FILES) {
  const id = file.replace(/\.md$/, "");
  const decl = liveFor(readDirection(join(DIRECTIONS, file)));
  assertLiveBasemapDeclaration(decl, `web-proportional-symbol-europe-capacity (${id})`);
  console.log(
    `carte vivante ${id} : style ${decl.style} · plancher = le cadrage publié · plafond ` +
      `+${fr(maxZoomHeadroomOf(decl), 2)} niveaux de zoom = ${fr(width, 0)} unités de dessin sur ` +
      `${fr(subjectSpan, 0)} pour ${NAMES[biggest.country]} · mer ${decl.tints.water} · terre ` +
      `${decl.tints.land}`,
  );
}
console.log("");

const facts = beatFacts(
  rows.map((r) => ({ key: r.country, label: NAMES[r.country], value: r.mw })),
  { subject: NAMES[biggest.country], declaredSequence: "MW" },
);
const offered = applicableTreatments(facts);
console.log(`treatments applicable: ${offered.map((t) => t.id).join(", ") || "(none)"}\n`);

const title = `Cinq pays portent ${fr(topShare, 0)} % de la capacité bas-carbone européenne`;
const caveat =
  `Un cercle par pays, sa SURFACE proportionnelle à la capacité bas-carbone installée, posé au ` +
  `centre pondéré de ses propres centrales et translucide, pour qu'un recouvrement se voie.`;
const claimNote =
  `${topFive.map((r) => `${NAMES[r.country]} ${fr(r.mw / 1000, 0)} GW`).join(", ")} — ` +
  `${fr(topShare, 0)} % des ${fr(totalMw / 1000, 0)} GW du continent, sur ` +
  `${plain(stations.length.toLocaleString("fr-FR"))} centrales.`;
const readingLine =
  `Lecture : l'exposant qui fait la taille des cercles est le seul réglage qu'une carte à symboles ` +
  `ne montre jamais — il est ci-dessus, et aucun pays ne bouge quand on en change. Survolez ou ` +
  `tabulez un cercle pour le détail.`;
const source = `Source : Global Power Plant Database (WRI) · fond de carte MapTiler`;

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
      question: `Où exactement, dans son propre pays, ce cercle est-il posé ?`,
      gesture: "zoom-and-pan",
      changes:
        `Le fond de carte devient une vraie carte MapTiler, avec les contrôles de MapLibre ` +
        `eux-mêmes : glisser, molette, pincement, clavier. Le dessin du beat suit la caméra par son ` +
        `viewBox, donc aucun cx ni cy ne change et aucun lieu ne se déplace. Les cercles, les ` +
        `étiquettes et les traits gardent leur taille à l'écran, donc la légende de taille dit ` +
        `toujours vrai et deux étiquettes ne peuvent que s'éloigner l'une de l'autre. On ne peut ni ` +
        `dézoomer sous le cadrage publié ni pousser la géographie hors du cadre.`,
    },
    {
      question: `Que vaut ce cercle-là, et de quoi est-il fait ?`,
      gesture: "ask-a-mark",
      changes:
        `Le cercle lui-même s'assombrit depuis son propre remplissage, mesuré à travers sa ` +
        `translucidité, et répond avec le pays, ses GW, sa part de l'Europe, son nombre de ` +
        `centrales et le partage entre eau-et-atome et vent-et-soleil.`,
    },
  ],
};

const textPerRegister = {
  display: title,
  eyebrow: EYEBROW,
  body:
    `${caveat} ${readingLine} ${source} ${scale.label} ${scale.options.map((o) => o.label).join(" ")}`,
  axis: keySizes.map((k) => k.label).join(" "),
  annot:
    `${claimNote} ${scale.options.filter((o) => o.note).map((o) => o.note).join(" ")} ` +
    `${LIVE_HINT}`,
  value: symbols.filter((s) => s.labelled).map((s) => `${s.name} ${s.figure}`).join(" "),
};
for (const key of Object.keys(textPerRegister)) textPerRegister[key] = plain(textPerRegister[key]);

const filed = readdirSync(DIRECTIONS).filter((f) => f.endsWith(".md")).map((f) => readDirection(join(DIRECTIONS, f)));
const newsroom = readPalette(HERE, { stopAt: join(HERE, "..") });
const BEAT_FACTS = { evidenceLevels: 3 };
console.log(report(composeDirections({ newsroom, filed, beat: BEAT_FACTS, textPerRegister }), { beat: BEAT_FACTS }));

// ── WHAT THE SECOND LAYER IS MADE OF, READ ONCE ──────────────────────────────────────────────
//
// MapLibre and its stylesheet are INLINED into every page rather than linked. A `<script src>`
// would trade the payload for a SECOND third-party host; inlining keeps the count at one —
// api.maptiler.com — which is the honest reading of R1, and it is the same trade
// `skills/map-web/scripts/render-web.mjs` already makes for the mapgen corpus.
//
// `style.mjs` travels as SOURCE, with its `export` keywords stripped, because a page script cannot
// import: the sweep that decides what a basemap layer becomes is stated once, in that file, and
// applied twice — to the style document the plate is baked from, and to the live style in the
// browser. The alternative is what this trunk already paid for once: two rulebooks that agree only
// until somebody edits one of them.
const requireFrom = createRequire(import.meta.url);
const MAPLIBRE_JS = await readFile(requireFrom.resolve("maplibre-gl/dist/maplibre-gl.js"), "utf8");
const MAPLIBRE_CSS = await readFile(requireFrom.resolve("maplibre-gl/dist/maplibre-gl.css"), "utf8");
const STYLE_MODULE = (
  await readFile(join(HERE, "..", "..", "skills", "map-web", "assets", "style.mjs"), "utf8")
).replace(/^export /gm, "");

const refused = [];
for (const file of readdirSync(DIRECTIONS).filter((f) => f.endsWith(".md"))) {
  const id = file.replace(/\.md$/, "");
  const direction = resolveDirectionFamilies(readDirection(join(DIRECTIONS, file)), textPerRegister);
  const live = liveFor(direction);
  const plate = `data:image/png;base64,${(await readFile(join(plateDir(id), "plate.png"))).toString("base64")}`;
  const name = `${id}.html`;
  try {
    const { outPath } = await renderWeb({
      component: DirectedSymbolMapWeb,
      props: {
        plate,
        symbols, keySizes, scale, land,
        live,
        maplibreCss: MAPLIBRE_CSS,
        maplibreJs: MAPLIBRE_JS,
        styleModule: STYLE_MODULE,
        aspect: CAMERA_ASPECT,
        size: SIZE,
        title, eyebrow: EYEBROW, caveat, source, reading: readingLine, claimNote,
        alt:
          `Une carte d'Europe portant un cercle par pays, dont la SURFACE est proportionnelle à sa ` +
          `capacité bas-carbone. Le plus grand, ${NAMES[biggest.country]}, fait ` +
          `${fr(biggest.mw / 1000, 0)} GW ; viennent ensuite ` +
          `${topFive.slice(1).map((r) => NAMES[r.country]).join(", ")}. Ces cinq cercles couvrent ` +
          `${fr(topShare, 0)} % de la capacité du continent ; le reste de la carte est un semis de ` +
          `petits cercles. Un contrôle au-dessus de la carte change la loi qui transforme une ` +
          `capacité en taille de cercle, sans déplacer aucun pays. La carte elle-même est vivante : ` +
          `elle se déplace et se zoome avec les contrôles de MapTiler, sans que la taille des ` +
          `cercles change.`,
        interaction,
        direction,
        ground: direction.ground,
        accent: direction.accent,
      },
      outDir: OUT,
      name,
      // WHAT THIS BEAT SAYS ABOUT ITS OWN FRAME. A map extends: the projected plan continues past
      // the subject, so the window opens onto more of the surroundings at the same scale rather
      // than zooming (which would change what a kilometre is worth) or stretching (which would be
      // a false geography). The base is the near-square Europe box this beat published before —
      // 900/684 — and the bound is the one measured in PLATE_SIZE above, where the window would
      // start showing land the study set does not cover.
      frame: {
        extends: true,
        base: { width: SIZE, height: Math.round(SIZE / (1600 / 1216)) },
        maxRatio: 1.5,
        why:
          "A map extends by opening its geographic window at the same scale, never by zooming or " +
          "stretching: the marks keep their size and their distances, and the frame simply shows " +
          "more of what surrounds the subject. The bound is where the window would reach land this " +
          "beat counts no capacity for — Greenland to the west, Kazakhstan past the Caspian to the " +
          "east — because empty land reads as \"nothing here\" and the true sentence is \"not " +
          "counted here\".",
      },
    });
    // THE VOCABULARY CHECKS THE PAGE IT ACTUALLY WROTE. `assertOneAreaScale` is the half of this
    // control that no declaration-level check can make: dropping the stylesheet call leaves every
    // attribute perfectly correct and every state drawn on top of every other. A page that fails it
    // is REMOVED rather than left on disk, because a stale render on disk looks exactly like a
    // render that succeeded.
    const written = await readFile(outPath, "utf8");
    try {
      assertOneAreaScale(written, scale, name);
      // THE SAME HALF, FOR THE SECOND LAYER. Every refusal here is a way the live map ships with
      // every attribute correct and lies in a browser: a fallback plate deleted, a plate hidden by
      // a rule no script conditions, a mark counter-scaled about anything but its own centre, a
      // mark that grows with the zoom while the key beside it does not, a bespoke rail left
      // standing beside MapTiler's own controls.
      assertOneLiveBasemap(written, live, name);
    } catch (error) {
      await rm(outPath, { force: true });
      throw error;
    }
    console.log(`${id} -> renders/${name}`);
  } catch (error) {
    refused.push({ id, why: error.message });
    console.log(`${id} REFUSED — ${error.message}`);
  }
}
if (refused.length) {
  console.log(`\nrefused by ${refused.length}: ${refused.map((x) => x.id).join(", ")}`);
  // A runner that swallows a refusal makes a refused page look like a produced one, and leaves the
  // previous render sitting on disk as if it were today's.
  process.exitCode = 1;
}
