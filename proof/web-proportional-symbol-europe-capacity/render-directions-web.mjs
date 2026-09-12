// twin/proof/web-proportional-symbol-europe-capacity/render-directions-web.mjs
//
// Europe's low-carbon capacity as proportional symbols, one per country. Rendered once per FILED
// DIRECTION into a self-contained interactive page.
//
// AREA, NOT RADIUS. The scale is sqrt of the value, so a circle twice the area stands for twice the
// capacity — and the key gives three named sizes rather than a ramp nobody can interpolate.
//
// Usage:  bun proof/web-proportional-symbol-europe-capacity/render-directions-web.mjs

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
  .map(([country, c]) => ({ country, ...c, lon: c.lon / c.w, lat: c.lat / c.w }))
  .sort((a, b) => b.mw - a.mw);
for (const r of rows) if (!NAMES[r.country]) throw new Error(`${r.country} has no French name filed`);

const totalMw = rows.reduce((s, r) => s + r.mw, 0);
const biggest = rows[0];
const topFive = rows.slice(0, 5);
const topShare = (topFive.reduce((s, r) => s + r.mw, 0) / totalMw) * 100;

// ── THE CLAIM, ASSERTED ───────────────────────────────────────────────────────────────────────
if (!(topShare > 50))
  throw new Error(`the headline says five countries hold more than half; they hold ${fr(topShare)} %`);
console.log(
  `${rows.length} pays · ${fr(totalMw / 1000, 0)} GW sur ${plain(stations.length.toLocaleString("fr-FR"))} centrales · ` +
    `cinq premiers ${fr(topShare, 0)} % · plus gros ${NAMES[biggest.country]} ${fr(biggest.mw / 1000, 0)} GW\n`,
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
    `zoom ${plateFacts.zoom}\n`,
);

const width = CAMERA_ASPECT >= 1 ? SIZE : SIZE * CAMERA_ASPECT;
const height = CAMERA_ASPECT >= 1 ? SIZE / CAMERA_ASPECT : SIZE;
const toPx = ([ux, uy]) => [ux * SIZE, uy * SIZE];
const rOf = (mw) => Math.sqrt(mw / biggest.mw) * R_MAX;

const symbols = rows.map((r) => {
  const [cx, cy] = toPx(project([r.lon, r.lat]));
  const rr = rOf(r.mw);
  return {
    code: r.country,
    name: NAMES[r.country],
    cx,
    cy,
    r: rr,
    label: rr >= 22 ? fr(r.mw / 1000, 0) : null,
    detail:
      `${NAMES[r.country]} · ${fr(r.mw / 1000)} GW bas-carbone (${fr((r.mw / totalMw) * 100)} % de ` +
      `l'Europe) · ${plain(r.count.toLocaleString("fr-FR"))} centrales · eau + atome ` +
      `${fr((r.old / r.mw) * 100)} %, vent + soleil ${fr((r.fresh / r.mw) * 100)} %`,
  };
});

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

const facts = beatFacts(
  rows.map((r) => ({ key: r.country, label: NAMES[r.country], value: r.mw })),
  { subject: NAMES[biggest.country], declaredSequence: "MW" },
);
const offered = applicableTreatments(facts);
console.log(`treatments applicable: ${offered.map((t) => t.id).join(", ") || "(none)"}\n`);

const keySizes = [totalMw * 0.005, totalMw * 0.05, biggest.mw].map((mw) => ({
  r: rOf(mw),
  label: `${fr(mw / 1000, 0)} GW`,
}));

const title = `Cinq pays portent ${fr(topShare, 0)} % de la capacité bas-carbone européenne`;
const caveat =
  `Un cercle par pays, sa SURFACE proportionnelle à la capacité bas-carbone installée, posé au ` +
  `centre pondéré de ses propres centrales — pas au centroïde du pays, qui peut tomber dans une ` +
  `chaîne de montagnes vide. Les cercles sont translucides : là où deux se recouvrent, le ` +
  `recouvrement se voit.`;
const claimNote =
  `${topFive.map((r) => `${NAMES[r.country]} ${fr(r.mw / 1000, 0)} GW`).join(", ")} — ` +
  `${fr(topShare, 0)} % des ${fr(totalMw / 1000, 0)} GW du continent, sur ` +
  `${plain(stations.length.toLocaleString("fr-FR"))} centrales.`;
const readingLine =
  `Lecture : survolez, touchez ou tabulez un cercle pour lire le pays, ses GW, sa part de l'Europe, ` +
  `son nombre de centrales et le partage entre eau-et-atome et vent-et-soleil. Une surface se classe ` +
  `et ne se mesure pas : la légende donne trois tailles nommées, jamais une échelle continue.`;
const source = `Source : Global Power Plant Database (WRI) · fond de carte MapTiler (dataviz), teinté par la direction`;

const textPerRegister = {
  display: title,
  eyebrow: EYEBROW,
  body: `${caveat} ${readingLine} ${source}`,
  axis: keySizes.map((k) => k.label).join(" "),
  annot: claimNote,
  value: symbols.filter((s) => s.label).map((s) => s.label).join(" "),
};
for (const key of Object.keys(textPerRegister)) textPerRegister[key] = plain(textPerRegister[key]);

const filed = readdirSync(DIRECTIONS).filter((f) => f.endsWith(".md")).map((f) => readDirection(join(DIRECTIONS, f)));
const newsroom = readPalette(HERE, { stopAt: join(HERE, "..") });
const BEAT_FACTS = { evidenceLevels: 3 };
console.log(report(composeDirections({ newsroom, filed, beat: BEAT_FACTS, textPerRegister }), { beat: BEAT_FACTS }));

const refused = [];
for (const file of readdirSync(DIRECTIONS).filter((f) => f.endsWith(".md"))) {
  const id = file.replace(/\.md$/, "");
  const direction = resolveDirectionFamilies(readDirection(join(DIRECTIONS, file)), textPerRegister);
  const plate = `data:image/png;base64,${(await readFile(join(plateDir(id), "plate.png"))).toString("base64")}`;
  try {
    await renderWeb({
      component: DirectedSymbolMapWeb,
      props: {
        plate,
        symbols, keySizes, land,
        aspect: CAMERA_ASPECT,
        size: SIZE,
        title, eyebrow: EYEBROW, caveat, source, reading: readingLine, claimNote,
        alt:
          `Une carte d'Europe portant un cercle par pays, dimensionné par sa capacité bas-carbone. ` +
          `Le plus grand, ${NAMES[biggest.country]}, fait ${fr(biggest.mw / 1000, 0)} GW ; viennent ` +
          `ensuite ${topFive.slice(1).map((r) => NAMES[r.country]).join(", ")}. Ces cinq cercles ` +
          `couvrent ${fr(topShare, 0)} % de la capacité du continent ; le reste de la carte est un ` +
          `semis de petits cercles.`,
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
