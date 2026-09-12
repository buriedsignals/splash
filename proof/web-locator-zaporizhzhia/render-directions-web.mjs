// twin/proof/web-locator-zaporizhzhia/render-directions-web.mjs
//
// Where Europe's largest low-carbon power station is, rendered once per FILED DIRECTION into a
// self-contained interactive page. The fortieth form of the catalogue, and its last map.
//
// WHAT THE WEB ADDS TO A LOCATOR. A locator answers one question — where — and a printed one can
// name perhaps six places before the names collide. Here every mark answers with its name, what it
// is, and its distance from the subject in kilometres: the reading that turns "near Zaporizhzhia"
// into a number, and the reason this form is worth building twice.
//
// THE BASEMAP IS MAPTILER'S, baked once per filed direction in that direction's own tints. At this
// scale — eighteen degrees across — Web Mercator's inflation is a fraction of a per cent over the
// frame, so the projection argument the continental beats have to make does not arise here. The
// distances below are still measured on the sphere, never off the drawing.
//
// Usage:  bun proof/web-locator-zaporizhzhia/render-directions-web.mjs

import { spawnSync } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import { readFile } from "node:fs/promises";
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
import { DirectedLocatorWeb } from "./DirectedLocatorWeb.tsx";

const HERE = dirname(fileURLToPath(import.meta.url));
const DIRECTIONS = join(HERE, "..", "..", "docs", "design-base", "directions");
const OUT = join(HERE, "renders");
const EYEBROW = "Énergie · Europe";
const SIZE = 900;
const PLACES = 6;
const EARTH_KM = 6371;

const FRENCH_PLACE = {
  Kyiv: "Kiev", Kharkiv: "Kharkiv", Dnipro: "Dnipro", Odessa: "Odessa", Donetsk: "Donetsk",
  Rostov: "Rostov", Bucharest: "Bucarest", Voronezh: "Voronej", "Chișinău": "Chișinău",
  Krasnodar: "Krasnodar", Sevastopol: "Sébastopol", Stavropol: "Stavropol",
  Zaporizhzhya: "Zaporijjia", Mariupol: "Marioupol", Kherson: "Kherson",
  Simferopol: "Simferopol", Luhansk: "Louhansk",
};
const FRENCH_FUEL = {
  Nuclear: "nucléaire", Hydro: "hydraulique", Wind: "éolien", Solar: "solaire",
  Biomass: "biomasse", Geothermal: "géothermie", Waste: "déchets",
};
const FRENCH_COUNTRY = {
  Ukraine: "Ukraine", Russia: "Russie", Romania: "Roumanie", Moldova: "Moldavie",
  Bulgaria: "Bulgarie", Turkey: "Turquie", Poland: "Pologne", Belarus: "Biélorussie",
  Hungary: "Hongrie", Slovakia: "Slovaquie", Georgia: "Géorgie", Serbia: "Serbie",
};

const plain = (s) => plainSpaces(s);
const fr = (v, d = 1) =>
  plain(v.toLocaleString("fr-FR", { minimumFractionDigits: d, maximumFractionDigits: d }));
const n0 = (v) => plain(Math.round(v).toLocaleString("fr-FR"));

// ── the station ───────────────────────────────────────────────────────────────────────────────
const scsv = (await readFile(join(HERE, "stations.csv"), "utf8")).trim().split(/\r?\n/);
const sh = scsv[0].split(",");
const stations = scsv.slice(1).map((l) => {
  const c = l.split(",");
  const r = Object.fromEntries(sh.map((h, i) => [h, c[i]]));
  return { ...r, capacity_mw: Number(r.capacity_mw), lon: Number(r.lon), lat: Number(r.lat) };
});
const biggest = stations.reduce((a, b) => (b.capacity_mw > a.capacity_mw ? b : a));

// ── THE CLAIM, ASSERTED ───────────────────────────────────────────────────────────────────────
if (biggest.country !== "Ukraine")
  throw new Error(`the headline says the largest is in Ukraine; it is in ${biggest.country}`);
if (!(biggest.capacity_mw >= 6000))
  throw new Error(`the headline says 6 000 MW; it is ${biggest.capacity_mw}`);
/** The second half of the sentence, and the reason the beat is worth drawing: the country holding
 *  Europe's largest low-carbon station is the one country whose generation this corpus's own
 *  electricity file does not report. Checked against the file carried beside this beat, never
 *  remembered, and never read out of a sibling's folder. */
const ecsv = (await readFile(join(HERE, "electricity.csv"), "utf8")).trim().split(/\r?\n/);
const eh = ecsv[0].split(",");
const FUELS = eh.filter((h) => h.endsWith("__twh"));
const unreported = ecsv.slice(1)
  .map((l) => Object.fromEntries(eh.map((h, i) => [h, l.split(",")[i]])))
  .filter((r) => FUELS.reduce((s, k) => s + Number(r[k] || 0), 0) <= 0);
if (unreported.length !== 1 || unreported[0].entity !== "Ukraine")
  throw new Error(
    `the standfirst says Ukraine is the only European country with no reported 2024 generation; ` +
      `the file reports none for ${unreported.map((r) => r.entity).join(", ") || "no country"}`,
  );
console.log(
  `plus grosse centrale de la fenêtre : ${n0(biggest.capacity_mw)} MW, ${biggest.fuel}, ` +
    `${biggest.country}, ${biggest.lat}, ${biggest.lon}\n`,
);

// ── THE CAMERA IS THE PLATE'S, and its bounds come from the subject ────────────────────────────
//
// The window is eighteen degrees wide and centred on the station, so the plate is baked around the
// thing the beat is about rather than around a continent. What places every mark afterwards is the
// plate's own recorded camera — `frameCorners`, read back with `map.unproject()` once the camera
// settled, not the nominal bounds handed to `fitBounds`, which fitBounds widens to keep the frame's
// aspect.
const WINDOW = {
  west: biggest.lon - 9,
  east: biggest.lon + 9,
  south: biggest.lat - 5.2,
  north: biggest.lat + 5.2,
};
const PLATE_SIZE = "1600x1216";
const BOUNDS = [WINDOW.west, WINDOW.south, WINDOW.east, WINDOW.north].map((v) => v.toFixed(4)).join(",");
const plateDir = (id) => join(HERE, "plate", id);
function ensurePlate(id, water, land) {
  const dir = plateDir(id);
  if (existsSync(join(dir, "geometry.json")) && existsSync(join(dir, "plate.png"))) return;
  console.log(`baking the ${id} plate (MapTiler, ${PLATE_SIZE}, bounds ${BOUNDS})…`);
  const result = spawnSync(
    "bun",
    [join(HERE, "bake.mjs"), "--size", PLATE_SIZE, "--countries", join(HERE, "shapes.geojson"),
     "--bounds", BOUNDS, "--water", water, "--land", land, "--out", dir],
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
        `disagree about where a degree is would put the same mark in three places`,
    );
}
const FRAME = plateFacts.frame;
const CORNERS = plateFacts.frameCorners;
if (!CORNERS || !(FRAME?.width > 0))
  throw new Error("this plate predates the camera facts: re-bake it with bake.mjs");
const CAMERA_ASPECT = FRAME.width / FRAME.height;
const width = SIZE;
const height = SIZE / CAMERA_ASPECT;
const mercY = (lat) => Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360));
const Y_NORTH = mercY(CORNERS.north);
const Y_SOUTH = mercY(CORNERS.south);
const project = ([lon, lat]) => {
  const px = ((lon - CORNERS.west) / (CORNERS.east - CORNERS.west)) * FRAME.width;
  const py = ((mercY(lat) - Y_NORTH) / (Y_SOUTH - Y_NORTH)) * FRAME.height;
  return [(px / FRAME.width) * SIZE, (py / FRAME.width) * SIZE];
};
console.log(
  `camera : plaque MapTiler ${FRAME.width}x${FRAME.height} · ${CORNERS.west.toFixed(2)}..` +
    `${CORNERS.east.toFixed(2)}E ${CORNERS.south.toFixed(2)}..${CORNERS.north.toFixed(2)}N · ` +
    `aspect ${CAMERA_ASPECT.toFixed(2)}:1 · zoom ${plateFacts.zoom}\n`,
);

// ── the borders ───────────────────────────────────────────────────────────────────────────────
/** The plate carries the coastline and the sea; every boundary layer was hidden before the shutter,
 *  because a basemap's own borders are drawn in a colour nobody here chose. So the borders are drawn
 *  from the beat's own shapes, in the direction's own furniture, and the land under them is
 *  MapTiler's. */
const geo = JSON.parse(await readFile(join(HERE, "shapes.geojson"), "utf8"));
const inFrame = ([x, y]) => x >= -40 && x <= width + 40 && y >= -40 && y <= height + 40;
const borderParts = [];
for (const f of geo.features) {
  const polys = f.geometry.type === "Polygon" ? [f.geometry.coordinates] : f.geometry.coordinates;
  for (const poly of polys)
    for (const ring of poly) {
      const pts = ring.map(project);
      if (!pts.some(inFrame)) continue;
      borderParts.push(`M ${pts.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join(" L ")} Z`);
    }
}
const borderPath = borderParts.join(" ");
if (!borderParts.length) throw new Error("no country boundary falls inside the camera");

// ── the marks ─────────────────────────────────────────────────────────────────────────────────
/** GREAT-CIRCLE DISTANCE, on the sphere. The reading this form exists for is "how far from the
 *  subject", and a distance measured off the drawing would be a distance in pixels wearing a
 *  kilometre's clothes. */
const RAD = Math.PI / 180;
const kmBetween = (a, b) => {
  const dLat = (b.lat - a.lat) * RAD;
  const dLon = (b.lon - a.lon) * RAD;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a.lat * RAD) * Math.cos(b.lat * RAD) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_KM * Math.asin(Math.min(1, Math.sqrt(s)));
};
const onPlate = ({ lon, lat }) => {
  const [x, y] = project([lon, lat]);
  return x >= 0 && x <= width && y >= 0 && y <= height;
};

const pcsv = (await readFile(join(HERE, "places.csv"), "utf8")).trim().split(/\r?\n/);
const ph = pcsv[0].split(",");
const allPlaces = pcsv.slice(1).map((l) => {
  const c = l.split(",");
  const r = Object.fromEntries(ph.map((h, i) => [h, c[i]]));
  return { ...r, pop: Number(r.pop), lon: Number(r.lon), lat: Number(r.lat) };
});
/** SETTLEMENTS BY A STATED RULE: the six most populous inside the frame. A locator names the places
 *  that let a reader put the subject somewhere, not every place it knows. */
const places = allPlaces.filter(onPlate).sort((a, b) => b.pop - a.pop).slice(0, PLACES);
for (const p of places) if (!FRENCH_PLACE[p.name]) throw new Error(`no French name recorded for ${p.name}`);
if (places.length !== PLACES)
  throw new Error(`the rule names the ${PLACES} largest settlements in frame; only ${places.length} are`);

/** The other stations of the same kind, which is what makes the subject's size legible: a reader who
 *  cannot see the ordinary cannot see that this one is not. Only those inside the frame. */
const others = stations.filter((s) => s !== biggest).filter(onPlate);

const marks = [
  {
    key: "subject",
    ...(([x, y]) => ({ cx: x, cy: y }))(project([biggest.lon, biggest.lat])),
    kind: "subject",
    r: 9,
    label: "Zaporijjia",
    detail:
      `Zaporijjia · ${FRENCH_FUEL[biggest.fuel] ?? biggest.fuel} · ${n0(biggest.capacity_mw)} MW ` +
      `de puissance installée — la plus grosse centrale bas-carbone que la base recense en Europe`,
  },
  ...places.map((p, i) => ({
    key: `place-${i}`,
    ...(([x, y]) => ({ cx: x, cy: y }))(project([p.lon, p.lat])),
    kind: "place",
    r: 4.5,
    label: FRENCH_PLACE[p.name],
    detail:
      `${FRENCH_PLACE[p.name]} · ${FRENCH_COUNTRY[p.country] ?? p.country} · ${n0(p.pop)} habitants · ` +
      `à ${n0(kmBetween(biggest, p))} km de Zaporijjia`,
  })),
  ...others.map((s, i) => ({
    key: `station-${i}`,
    ...(([x, y]) => ({ cx: x, cy: y }))(project([s.lon, s.lat])),
    kind: "station",
    r: Math.max(2.4, Math.sqrt(s.capacity_mw) * 0.09),
    label: null,
    detail:
      `${FRENCH_FUEL[s.fuel] ?? s.fuel} · ${n0(s.capacity_mw)} MW · ` +
      `${FRENCH_COUNTRY[s.country] ?? s.country} · à ${n0(kmBetween(biggest, s))} km de Zaporijjia · ` +
      `${fr((s.capacity_mw / biggest.capacity_mw) * 100)} % de Zaporijjia`,
  })),
];
const nearest = others
  .map((s) => ({ s, km: kmBetween(biggest, s) }))
  .sort((a, b) => a.km - b.km)[0];
if (!nearest) throw new Error("the frame holds no other station to compare the subject to");
const bigger = others.filter((s) => s.capacity_mw >= biggest.capacity_mw).length;
if (bigger !== 0)
  throw new Error(`${bigger} station(s) in frame are at least as large as the one called largest`);

// ── the scale bar ─────────────────────────────────────────────────────────────────────────────
/** A locator without a scale bar says "near" and refuses to say how near. The bar is a round number
 *  of kilometres measured at the frame's own centre latitude, where Mercator's stretch is what the
 *  middle of the picture actually shows. */
const midLat = (CORNERS.north + CORNERS.south) / 2;
const pxPerKm = (() => {
  const a = project([CORNERS.west, midLat]);
  const b = project([CORNERS.east, midLat]);
  const km = kmBetween({ lon: CORNERS.west, lat: midLat }, { lon: CORNERS.east, lat: midLat });
  return (b[0] - a[0]) / km;
})();
const BAR_KM = [50, 100, 200, 250].find((k) => k * pxPerKm > width * 0.12) ?? 250;
const scaleBar = {
  x: width * 0.045,
  y: height - height * 0.07,
  w: BAR_KM * pxPerKm,
  label: `${n0(BAR_KM)} km`,
};

// ── the words ─────────────────────────────────────────────────────────────────────────────────
const title = `La plus grosse centrale bas-carbone d'Europe est en Ukraine`;
const caveat =
  `Zaporijjia, ${n0(biggest.capacity_mw)} MW de puissance installée, est la plus grosse centrale ` +
  `bas-carbone que la base recense en Europe. L'Ukraine est aussi le seul pays du continent dont la ` +
  `production électrique de 2024 n'est pas rapportée.`;
const claimNote =
  `${n0(biggest.capacity_mw)} MW · ${n0(others.length)} autres centrales bas-carbone dans le cadre, ` +
  `la plus proche à ${n0(nearest.km)} km · aucune n'atteint cette puissance.`;
const limitNote =
  `La base enregistre une puissance INSTALLÉE, jamais une production : la centrale est dessinée là ` +
  `où elle est, pas là où elle produit. Le fond de carte est une plaque MapTiler en Web Mercator ; ` +
  `sur ${fr(WINDOW.east - WINDOW.west, 0)}° de large, sa déformation reste sous un pour cent, et les ` +
  `distances lues ci-dessous sont mesurées sur la sphère, jamais sur le dessin.`;
const readingLine =
  `Lecture : survolez, touchez ou tabulez n'importe quelle marque pour lire son nom, ce qu'elle est ` +
  `et sa distance à Zaporijjia en kilomètres. C'est ce qu'une carte de repérage imprimée ne peut pas ` +
  `faire : elle dit « près de », le lecteur ne sait pas de combien.`;
const source =
  `Source : WRI Global Power Plant Database v1.3.0 · lieux Natural Earth 50 m · ` +
  `fond de carte MapTiler (dataviz), teinté par la direction`;
const kinds = [
  { label: "le sujet" },
  { label: `les ${n0(others.length)} autres centrales du cadre` },
  { label: `les ${PLACES} plus grandes villes du cadre` },
];

const facts = beatFacts(
  [{ key: "ZNPP", label: "Zaporijjia", value: biggest.capacity_mw }],
  {
    subject: "ZNPP",
    points: { count: marks.length, locatedAt: "recorded coordinates" },
    geography: { areas: 0, settlements: places.length, waters: 0, basemap: true },
    declaredSequence: "none",
  },
);
const offered = applicableTreatments(facts);
console.log(`treatments applicable: ${offered.map((t) => t.id).join(", ") || "(none)"}\n`);
console.log(
  `${marks.length} marques · ${others.length} autres centrales dans le cadre · la plus proche à ` +
    `${n0(nearest.km)} km · barre d'échelle ${BAR_KM} km = ${fr(scaleBar.w, 0)} px\n`,
);

const textPerRegister = {
  display: title,
  eyebrow: EYEBROW,
  body: `${caveat} ${readingLine} ${source}`,
  axis: kinds.map((k) => k.label).join(" "),
  annot: `${claimNote} ${limitNote}`,
  value: `${marks.filter((m) => m.label).map((m) => m.label).join(" ")} ${scaleBar.label}`,
};
for (const key of Object.keys(textPerRegister)) textPerRegister[key] = plain(textPerRegister[key]);

const filed = readdirSync(DIRECTIONS).filter((f) => f.endsWith(".md")).map((f) => readDirection(join(DIRECTIONS, f)));
const newsroom = readPalette(HERE, { stopAt: join(HERE, "..") });
const BEAT_FACTS = { evidenceLevels: 3 };
console.log(report(composeDirections({ newsroom, filed, beat: BEAT_FACTS, textPerRegister }), { beat: BEAT_FACTS }));
console.log("");

const refused = [];
for (const file of readdirSync(DIRECTIONS).filter((f) => f.endsWith(".md"))) {
  const id = file.replace(/\.md$/, "");
  const direction = resolveDirectionFamilies(readDirection(join(DIRECTIONS, file)), textPerRegister);
  const plate = `data:image/png;base64,${(await readFile(join(plateDir(id), "plate.png"))).toString("base64")}`;
  try {
    await renderWeb({
      component: DirectedLocatorWeb,
      props: {
        plate,
        marks,
        border: borderPath,
        scaleBar,
        kinds,
        aspect: CAMERA_ASPECT,
        size: SIZE,
        title, eyebrow: EYEBROW, caveat, source, reading: readingLine, claimNote, limitNote,
        alt:
          `Carte de repérage du sud de l'Ukraine et de ses voisins. La centrale de Zaporijjia, ` +
          `${n0(biggest.capacity_mw)} MW de puissance installée, est marquée d'un cercle cerné dans ` +
          `la couleur d'accent, au bord du Dniepr, au nord de la mer d'Azov. Autour d'elle, ` +
          `${n0(others.length)} autres centrales bas-carbone, toutes plus petites, et les ` +
          `${PLACES} plus grandes villes du cadre.`,
        direction,
        ground: direction.ground,
        accent: direction.accent,
      },
      outDir: OUT,
      name: `${id}.html`,
    });
    console.log(`${id} -> renders/${id}.html`);
  } catch (error) {
    refused.push({ id, why: error.message });
    console.log(`${id} REFUSED — ${error.message}`);
  }
}
if (refused.length) console.log(`\nrefused by ${refused.length}: ${refused.map((x) => x.id).join(", ")}`);
