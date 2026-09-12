// twin/proof/web-dot-density-europe-stations/render-directions-web.mjs
//
// Every low-carbon power station the database lists in Europe, one dot each. Rendered once per FILED
// DIRECTION into a self-contained interactive page.
//
// ONE DOT IS ONE STATION. The file is a register of places, so the dot is a place: a dot standing for
// a rounded quantity of megawatts would invent a resolution the source does not have.
//
// Usage:  bun proof/web-dot-density-europe-stations/render-directions-web.mjs

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
import { DirectedDotMapWeb } from "./DirectedDotMapWeb.tsx";
import { WINDOW, CAMERA_ASPECT as MEASURE_ASPECT } from "./camera.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const DIRECTIONS = join(HERE, "..", "..", "docs", "design-base", "directions");
const OUT = join(HERE, "renders");
const EYEBROW = "Énergie · Europe";
const SIZE = 900;
const OUTSIDE = new Set(["Algeria", "Iraq", "Morocco", "Syrian Arab Republic", "Tunisia"]);
const FUELS = [
  ["Nuclear", "nucléaire"],
  ["Hydro", "hydraulique"],
  ["Wind", "éolien"],
  ["Solar", "solaire"],
];
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
const count = (v) => plain(v.toLocaleString("fr-FR"));

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
      FUELS.some(([k]) => k === s.fuel) &&
      Number.isFinite(s.mw) && s.mw > 0 &&
      Number.isFinite(s.lon) && Number.isFinite(s.lat) &&
      !OUTSIDE.has(s.country),
  );
for (const s of stations) if (!NAMES[s.country]) throw new Error(`${s.country} has no French name filed`);

const totalMw = stations.reduce((s, z) => s + z.mw, 0);
const perFuel = FUELS.map(([key, name]) => {
  const set = stations.filter((s) => s.fuel === key);
  return { key, name, sites: set.length, mw: set.reduce((s, z) => s + z.mw, 0) };
}).map((f) => ({ ...f, perSite: f.mw / f.sites }));
const rare = [...perFuel].sort((a, b) => b.perSite - a.perSite)[0];

// ── THE CLAIM, ASSERTED ───────────────────────────────────────────────────────────────────────
if (rare.key !== "Nuclear")
  throw new Error(`the headline says nuclear is the most concentrated per site; ${rare.name} is`);
const siteShare = (rare.sites / stations.length) * 100;
const mwShare = (rare.mw / totalMw) * 100;
if (!(siteShare < 2 && mwShare > 25))
  throw new Error(`the headline needs a tiny share of sites carrying a large share of capacity; ${fr(siteShare)} % and ${fr(mwShare)} %`);
console.log(
  `${count(stations.length)} centrales · ${rare.sites} ${rare.name} (${fr(siteShare, 1)} % des sites) ` +
    `portant ${fr(mwShare)} % de la capacité · ${fr(rare.perSite, 0)} MW par site contre ` +
    perFuel.filter((f) => f.key !== rare.key).map((f) => `${fr(f.perSite, 0)} (${f.name})`).join(", ") + "\n",
);
console.table(perFuel.map((f) => ({ source: f.name, sites: count(f.sites), GW: fr(f.mw / 1000), "MW/site": fr(f.perSite, 0) })));

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
const byCountryMw = new Map();
for (const s of stations) byCountryMw.set(s.country, (byCountryMw.get(s.country) ?? 0) + s.mw);

/** Three treatments, not four: the named kind, the two that are places-not-power, and everything
 *  else. The claim counts places by KIND, so the kinds are drawn as kinds. */
const kindOf = (fuel) => (fuel === "Nuclear" ? 0 : fuel === "Hydro" ? 1 : 2);
const dots = stations.map((s, i) => {
  const [cx, cy] = toPx(project([s.lon, s.lat]));
  return {
    key: `${i}`,
    cx,
    cy,
    kind: kindOf(s.fuel),
    detail:
      `${FUELS.find(([k]) => k === s.fuel)[1]} · ${fr(s.mw, 0)} MW · ${NAMES[s.country]} · ` +
      `${fr((s.mw / byCountryMw.get(s.country)) * 100)} % du parc bas-carbone de ce pays`,
  };
});

const kinds = [
  { label: rare.name, count: `${count(rare.sites)} sites` },
  { label: "hydraulique", count: `${count(perFuel.find((f) => f.key === "Hydro").sites)} sites` },
  {
    label: "éolien et solaire",
    count: `${count(perFuel.filter((f) => ["Wind", "Solar"].includes(f.key)).reduce((s, f) => s + f.sites, 0))} sites`,
  },
];

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
  perFuel.map((f) => ({ key: f.key, label: f.name, value: f.sites })),
  { subject: rare.name, declaredSequence: "sites" },
);
const offered = applicableTreatments(facts);
console.log(`treatments applicable: ${offered.map((t) => t.id).join(", ") || "(none)"}\n`);

const title = `Sur ${count(stations.length)} centrales bas-carbone européennes, ${rare.sites} sont nucléaires — et elles portent ${fr(mwShare, 0)} % de la puissance`;
const caveat =
  `Un point par centrale. UN POINT EST UN LIEU, pas une quantité arrondie de mégawatts : le fichier ` +
  `est un registre de lieux, et un point qui vaudrait « 50 MW » inventerait une résolution que la ` +
  `source n'a pas. C'est la paire de lectures que cette forme donne et qu'une barre ne donne pas — ` +
  `le NOMBRE de lieux et l'endroit où ils sont.`;
const claimNote =
  `${fr(rare.perSite, 0)} MW par site pour le ${rare.name}, contre ` +
  perFuel.filter((f) => f.key !== rare.key).map((f) => `${fr(f.perSite, 0)} pour ${f.name}`).join(", ") +
  `. Le classement est calculé, jamais affirmé.`;
const readingLine =
  `Lecture : survolez, touchez ou tabulez un point pour lire la source, ses mégawatts, son pays et sa ` +
  `part du parc de ce pays. Une carte de points dit OÙ et COMBIEN, jamais quelle taille.`;
const source = `Source : Global Power Plant Database (WRI) · fond de carte MapTiler (dataviz), teinté par la direction`;

const textPerRegister = {
  display: title,
  eyebrow: EYEBROW,
  body: `${caveat} ${readingLine} ${source}`,
  axis: kinds.map((k) => `${k.label} ${k.count}`).join(" "),
  annot: claimNote,
  value: perFuel.map((f) => fr(f.perSite, 0)).join(" "),
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
      component: DirectedDotMapWeb,
      props: {
        plate,
        dots, kinds, land,
        aspect: CAMERA_ASPECT,
        size: SIZE,
        title, eyebrow: EYEBROW, caveat, source, reading: readingLine, claimNote,
        alt:
          `Une carte d'Europe semée de ${count(stations.length)} points, un par centrale ` +
          `bas-carbone. Le semis est dense et continu sur l'Europe de l'Ouest et alpine, plus clair ` +
          `à l'est. ${rare.sites} points plus gros et colorés, les centrales nucléaires, forment un ` +
          `chapelet dispersé — surtout en France, au Royaume-Uni, en Ukraine et en Russie — et ` +
          `portent ${fr(mwShare, 0)} % de la puissance installée.`,
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
