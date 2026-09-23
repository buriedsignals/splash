// twin/proof/static-dot-density-europe-stations/render-directions.mjs
//
// Europe's low-carbon power stations, one dot each, drawn once per filed direction through the
// design base. The first `dot density` beat in this tree.
//
// WHY THE DATA IS NEW AND NOT THE ELECTRICITY FILE EVERY OTHER BEAT HERE USES.
// `the-dots-resolution-is-what-the-data-supports` refuses a dot map made by scattering national
// totals inside national polygons: the pattern a reader sees would be the random number generator's,
// not the world's. So a source that records a latitude and a longitude for every thing it counts was
// fetched instead, and one dot is one station, where the station is.
//
// `renders/`, PLURAL. A render written to `render/` receives no approval and is invisible to the
// export guard.
//
// Usage:  bun proof/static-dot-density-europe-stations/render-directions.mjs

import { existsSync, readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { readFile, rm } from "node:fs/promises";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderStill } from "#shared/chart-beat/render-still.mjs";
import { readPalette } from "#shared/chart-beat/colour.mjs";
import { beatFacts, applicableTreatments } from "#shared/chart-beat/treatments.mjs";
import { plateGrounds, plateTints } from "#shared/map-beat/tints.mjs";
import { plateWasPaintedWith } from "#shared/map-beat/plate-cache.mjs";
import { frameProjector, markOccupancy, occupancyLine } from "#shared/map-beat/occupancy.mjs";
import { plateWaterField } from "../../scripts/map-beat/plate-water.mjs";
import { readDirection } from "../../scripts/design-base/read-direction.mjs";
import { composeDirections, guardColour, report } from "../../scripts/design-base/compose.mjs";
import { resolveDirectionFamilies } from "../../scripts/design-base/resolve-families.mjs";
import { DirectedDotDensity } from "./DirectedDotDensity.tsx";
import { assertBeatMayEnter, directedFrame, exportSizeFromArgv, nameAtSize } from "#shared/chart-beat/directed-size.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const DIRECTIONS = join(HERE, "..", "..", "docs", "design-base", "directions");
const OUT = join(HERE, "renders");
/** THE SIZE THIS RUN DRAWS AT, and whether this beat's own type may enter it at all: a tall frame is a
 *  different drawing, not a stretched one, and `type-at-size.mjs` refuses a type whose range nobody has
 *  measured rather than shipping an aspect nobody chose. */
const SIZE = exportSizeFromArgv();
const EXPORT_FRAME = directedFrame(SIZE);
assertBeatMayEnter(HERE, SIZE, { what: basename(HERE) });
const EYEBROW = "Énergie · Europe";
const SUBJECT = "Nuclear";
const refused = [];

// ── the stations ────────────────────────────────────────────────────────────
const csv = (await readFile(join(HERE, "stations.csv"), "utf8")).trim().split(/\r?\n/);
const header = csv[0].split(",");
const stations = csv.slice(1).map((l) => {
  const c = l.split(",");
  const r = Object.fromEntries(header.map((h, i) => [h, c[i]]));
  return { ...r, capacity_mw: Number(r.capacity_mw), lon: Number(r.lon), lat: Number(r.lat) };
});
for (const s of stations)
  if (!Number.isFinite(s.lon) || !Number.isFinite(s.lat) || !Number.isFinite(s.capacity_mw))
    throw new Error(`a station has no usable coordinates or capacity: ${JSON.stringify(s)}`);

// ── THE CLAIM, ASSERTED ─────────────────────────────────────────────────────
const total = stations.length;
const nuclear = stations.filter((s) => s.fuel === SUBJECT);
const mwAll = stations.reduce((a, s) => a + s.capacity_mw, 0);
const mwNuclear = nuclear.reduce((a, s) => a + s.capacity_mw, 0);
const shareSites = (nuclear.length / total) * 100;
const shareCapacity = (mwNuclear / mwAll) * 100;
if (!(shareSites < 1))
  throw new Error(`the headline says nuclear is under 1 % of the sites; it is ${shareSites.toFixed(2)} %`);
if (!(shareCapacity > 30))
  throw new Error(
    `the headline says nuclear carries over 30 % of the capacity; it is ${shareCapacity.toFixed(1)} %`,
  );
/** And it is the most concentrated of the fuels: the highest capacity per site by a distance. A
 *  derived ranking, so a data refresh that changed it changes the sentence. */
const byFuel = {};
for (const s of stations) {
  byFuel[s.fuel] ??= { n: 0, mw: 0 };
  byFuel[s.fuel].n++;
  byFuel[s.fuel].mw += s.capacity_mw;
}
const perSite = Object.entries(byFuel).map(([fuel, v]) => ({ fuel, mw: v.mw / v.n, n: v.n }));
perSite.sort((a, b) => b.mw - a.mw);
if (perSite[0].fuel !== SUBJECT)
  throw new Error(
    `the standfirst says nuclear is the most concentrated; ${perSite[0].fuel} is ` +
      `(${perSite[0].mw.toFixed(0)} MW per site against ${(mwNuclear / nuclear.length).toFixed(0)})`,
  );

console.table(
  perSite.map((p) => ({
    combustible: p.fuel,
    sites: p.n,
    "% sites": ((p.n / total) * 100).toFixed(1),
    GW: (byFuel[p.fuel].mw / 1000).toFixed(1),
    "MW par site": p.mw.toFixed(0),
  })),
);
console.log(
  `${total} centrales · nucléaire ${nuclear.length} sites (${shareSites.toFixed(2)} %) pour ` +
    `${shareCapacity.toFixed(1)} % de la puissance\n`,
);

// ── the camera, identical to the sibling map beats ──────────────────────────
const WINDOW = { west: -25, east: 45, south: 34, north: 72 };
const RAD = Math.PI / 180;
const LAT0 = 52 * RAD;
const LON0 = 10 * RAD;
function laea([lonDeg, latDeg]) {
  const lat = latDeg * RAD;
  const lon = lonDeg * RAD - LON0;
  const cosc = Math.sin(LAT0) * Math.sin(lat) + Math.cos(LAT0) * Math.cos(lat) * Math.cos(lon);
  const k = Math.sqrt(2 / Math.max(1e-9, 1 + cosc));
  return [
    k * Math.cos(lat) * Math.sin(lon),
    -k * (Math.cos(LAT0) * Math.sin(lat) - Math.sin(LAT0) * Math.cos(lat) * Math.cos(lon)),
  ];
}
const border = [];
for (let i = 0; i <= 120; i++) {
  const t = i / 120;
  border.push(laea([WINDOW.west + t * (WINDOW.east - WINDOW.west), WINDOW.north]));
  border.push(laea([WINDOW.west + t * (WINDOW.east - WINDOW.west), WINDOW.south]));
  border.push(laea([WINDOW.west, WINDOW.south + t * (WINDOW.north - WINDOW.south)]));
  border.push(laea([WINDOW.east, WINDOW.south + t * (WINDOW.north - WINDOW.south)]));
}
const BX0 = Math.min(...border.map((p) => p[0]));
const BX1 = Math.max(...border.map((p) => p[0]));
const BY0 = Math.min(...border.map((p) => p[1]));
const BY1 = Math.max(...border.map((p) => p[1]));
const spanX = BX1 - BX0;
const spanY = BY1 - BY0;
const span = Math.max(spanX, spanY);
const VIEW = 1000;

/** THE CAMERA IS THE BAKED PLATE'S. The equal-area window above is kept because it is what SIZED
 *  this beat's study area; nothing is placed by it any more. Every mark is placed by the plate's own
 *  recorded `frameCorners` — measured with `map.unproject()` after the camera settled, not the
 *  nominal bounds handed to `fitBounds`, which fitBounds widens to preserve the frame's aspect.
 *
 *  THE COST, STATED. Web Mercator inflates the north. This beat COUNTS places and compares capacity
 *  per site; neither reading is an area, so neither is touched by the inflation. A beat whose claim
 *  IS an area keeps measuring on the equal-area camera and says so. */
const PLATE_SIZE = "1000x760";
/** A PLATE BELONGS TO A DIRECTION AND A SIZE. Keyed on the direction alone, a square run re-baked
 *  over the landscape plate and the next landscape run re-baked over that — the two sizes thrashing
 *  one directory, and whichever ran last was the only one whose plate matched its own render. */
const plateDir = (id) => join(HERE, "plate", SIZE === "landscape" ? id : `${id}-${SIZE}`);
function ensurePlate(id, water, land) {
  const dir = plateDir(id);
  // AND IN THE TINTS IT WAS PAINTED WITH, not merely that a file is there. A plate cached on
  // `existsSync` alone is blind to the pair it was baked in, so a change to the trunk's tints ships
  // over a stale basemap in silence — which is exactly what happened to the Danube's three plates.
  if (plateWasPaintedWith(dir, { water, land })) return;
  console.log(`baking the ${id} plate (MapTiler, ${PLATE_SIZE}, water ${water}, land ${land})…`);
  const result = spawnSync(
    "bun",
    [join(HERE, "bake.mjs"), "--size", PLATE_SIZE, "--countries", join(HERE, "shapes.geojson"),
     "--water", water, "--land", land, "--out", dir],
    { cwd: HERE, stdio: "inherit" },
  );
  if (result.status !== 0) throw new Error(`bake.mjs exited with ${result.status} for ${id}`);
}
// THE PAIR COMES FROM THE TRUNK, AND THE WATER IS NOT THIS BEAT'S TO CHOOSE. What stood here was
// `water: mix(d.ground, d.accent, 0.09)` — the sea tinted with the very accent this beat's marks are
// drawn in, so the ground followed the mark and no accent could be picked out of it. Only the LAND's
// weight is measured per beat; the water is the filed convention, once, in `shared/map-beat/tints.mjs`.
/** LA TERRE PASSE DEVANT L'EAU, et c'est la mesure qui l'a décidé, pas le goût. Aux premiers
 *  réglages — eau à 16 % d'accent, terre à 7 % d'encre — l'eau était à 1,38 du fond sur `nocturne`
 *  et la terre à 1,19 : la mer lisait comme figure et le continent comme fond, l'œil suivait les
 *  bassins au lieu des côtes, et sur ce beat les marques sont TOUTES sur la terre. Le fond
 *  abandonnait bien son contraste (la marque est à 10,8) — la garde était verte et l'image fausse.
 *
 *  Ce qui reste vrai avec l'eau de convention, remesuré : terre 1,45 à 1,58 du fond, eau 1,05 à
 *  1,09, côte 1,34 à 1,50 entre les deux. La mer est plus pâle qu'avant (elle ne prend plus
 *  l'accent) et la terre passe toujours devant elle, ce qui était la décision. */
const LAND_DOSE = 0.16;
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
    throw new Error(`the ${id} plate was baked on a different camera than ${DIRECTION_FILES[0]}`);
}
const FRAME = plateFacts.frame;
const CORNERS = plateFacts.frameCorners;
const CAMERA_ASPECT = FRAME.width / FRAME.height;
const mercY = (lat) => Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360));
const Y_NORTH = mercY(CORNERS.north);
const Y_SOUTH = mercY(CORNERS.south);
const project = ([lon, lat]) => {
  const px = ((lon - CORNERS.west) / (CORNERS.east - CORNERS.west)) * FRAME.width;
  const py = ((mercY(lat) - Y_NORTH) / (Y_SOUTH - Y_NORTH)) * FRAME.height;
  return [(px / FRAME.width) * VIEW, (py / FRAME.width) * VIEW];
};
console.log(
  `camera: MapTiler plate ${FRAME.width}x${FRAME.height} · ${CORNERS.west.toFixed(2)}..` +
    `${CORNERS.east.toFixed(2)}E ${CORNERS.south.toFixed(2)}..${CORNERS.north.toFixed(2)}N · ` +
    `aspect ${CAMERA_ASPECT.toFixed(2)}:1\n`,
);

const geo = JSON.parse(await readFile(join(HERE, "shapes.geojson"), "utf8"));
const MIN_STEP = VIEW / 1400;
function thin(ring) {
  const out = [ring[0]];
  for (const p of ring.slice(1)) {
    const q = out[out.length - 1];
    if (Math.abs(p[0] - q[0]) > MIN_STEP || Math.abs(p[1] - q[1]) > MIN_STEP) out.push(p);
  }
  return out.length >= 4 ? out : ring;
}
const shapes = geo.features
  .map((f) => {
    const rings = f.geometry.coordinates
      .flatMap((poly) => poly)
      .map((ring) => thin(ring.map(project)));
    if (!rings.length) return null;
    return {
      iso: f.properties.iso,
      d: rings
        .map((ring) => `M ${ring.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join(" L ")} Z`)
        .join(" "),
    };
  })
  .filter(Boolean);

const dots = stations.map((s) => {
  const [x, y] = project([s.lon, s.lat]);
  return { x: x / VIEW, y: y / VIEW, subject: s.fuel === SUBJECT };
});

/** MARKS AND GROUND IN ONE SPACE. `project` already puts a degree where the plate put it, in VIEW
 *  units; the plate's pixels are FRAME.width wide on the same camera, so one multiply carries a mark
 *  onto the ground under it. */
const FRAME_PER_VIEW = FRAME.width / VIEW;
const waterField = plateWaterField(plateDir(DIRECTION_FILES[0].replace(/\.md$/, "")), {
  scale: FRAME_PER_VIEW,
});

/** WHICH OF THE BASEMAP'S GROUNDS THESE DOTS OCCUPY, MEASURED ON THE PLATE THIS BEAT BAKED.
 *
 *  One dot per station, at the radius the component draws it: `max(1.1, mapW / 900)`, which at every
 *  camera any direction gives this plate is the 1.1 px floor. Put in VIEW units against the
 *  narrowest map the three directions draw, because a dot is smallest there and a smaller mark is
 *  the harder case for "the ground has room for it".
 */
/** The narrowest map any of the three filed directions draws this beat at, which is the camera the
 *  sibling symbol beat measured its own legibility against. A dot is at its 1.1 px floor there, and
 *  the smaller the mark the harder the case for "the ground has room for it". */
const NARROWEST_MAP = 596;
const DOT_R_VIEW = (1.1 / NARROWEST_MAP) * VIEW;
const OCCUPANCY = markOccupancy(
  dots.map((d) => ({ kind: "disc", x: d.x * VIEW, y: d.y * VIEW, r: DOT_R_VIEW })),
  waterField,
);
console.log(occupancyLine(OCCUPANCY));

const drawnSubjects = dots.filter((d) => d.subject).length;
if (drawnSubjects !== nuclear.length)
  throw new Error(`${nuclear.length} nuclear stations in the data and ${drawnSubjects} on the plate`);

const facts = beatFacts(
  stations.map((s) => ({ key: `${s.country}-${s.lon}-${s.lat}`, label: s.fuel, value: s.capacity_mw })),
  {
    subject: SUBJECT,
    points: { count: total, locatedAt: "the station's own coordinates" },
    units: { count: total, thing: "centrale" },
    geography: { areas: 0, settlements: 0, waters: 0, basemap: true },
    declaredSequence: "none",
  },
);
const offered = applicableTreatments(facts);
console.log(`treatments applicable: ${offered.map((t) => t.id).join(", ")}\n`);

/** `toLocaleString("fr-FR")` emits U+202F and U+00A0, which no face on the family ladders
 *  covers — the glyph guard then refuses every family and the beat cannot draw at all. Written
 *  as escapes rather than as literal characters, because a literal narrow no-break space is
 *  invisible in a diff and this is the third beat it has cost. */
const plain = (s) => s.replace(/[\u202F\u00A0\u2009]/g, " ");
const n0 = (v) => plain(Math.round(v).toLocaleString("fr-FR"));
const one = (v) =>
  plain(v.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }));

const title = [
  `${nuclear.length} réacteurs sur ${n0(total)} centrales bas-carbone — et un tiers de la puissance`,
  `${nuclear.length} sites nucléaires, un tiers de la puissance bas-carbone`,
  `Où sont les centrales bas-carbone d’Europe`,
];
const limits = [
  `Une centrale bas-carbone, un point, à ses propres coordonnées : les ${n0(total)} sites ` +
    `hydrauliques, éoliens, solaires, biomasse, géothermiques et nucléaires que la base recense en ` +
    `Europe. Le nucléaire n’est que ${one(shareSites)} % des sites et ${one(shareCapacity)} % de la ` +
    `puissance installée — ${n0(mwNuclear / nuclear.length)} MW par site, le plus concentré de tous.`,
  `Une centrale bas-carbone, un point, à ses propres coordonnées. Le nucléaire : ${one(shareSites)} % ` +
    `des sites, ${one(shareCapacity)} % de la puissance.`,
  `Une centrale bas-carbone, un point. Nucléaire : ${one(shareSites)} % des sites.`,
];
const reading = [
  `Lecture : chaque point est une centrale, placée là où la base la situe — pas répartie dans un ` +
    `polygone. La densité est la lecture ; les sites nucléaires sont cerclés, pas recolorés.`,
  `Lecture : un point, une centrale, à sa position réelle. Les sites nucléaires sont cerclés.`,
];
const source =
  "Source : WRI Global Power Plant Database v1.3.0 · fond de carte MapTiler (dataviz), teinté par la direction";
const dotIs = `un point = une centrale bas-carbone`;
const subjectNote = `${nuclear.length} sites nucléaires`;
const limitNote = `La base recense les centrales qu’elle connaît ; le petit solaire et le petit éolien y sont sous-représentés.`;

const textPerRegister = {
  display: title.join(" "),
  eyebrow: EYEBROW,
  body: `${limits.join(" ")} ${source}`,
  axis: limitNote,
  annot: `${reading.join(" ")} ${dotIs} ${subjectNote}`,
  value: `${nuclear.length} ${n0(total)}`,
};

const filed = readdirSync(DIRECTIONS)
  .filter((f) => f.endsWith(".md"))
  .map((f) => readDirection(join(DIRECTIONS, f)));
const newsroom = readPalette(HERE);
const BEAT_FACTS = { evidenceLevels: 3 };
console.log(
  report(composeDirections({ newsroom, filed, beat: BEAT_FACTS, textPerRegister }), {
    beat: BEAT_FACTS,
  }),
);
console.log("");

for (const file of readdirSync(DIRECTIONS).filter((f) => f.endsWith(".md"))) {
  const id = file.replace(/\.md$/, "");
  console.log(id);
  try {
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
    const filed = readDirection(join(DIRECTIONS, file));
    const colourProblems = guardColour(
      filed,
      plateGrounds(plateTints(filed, { landDose: LAND_DOSE }), OCCUPANCY),
    );
    if (colourProblems.length)
      throw new Error(`this beat's colour cannot be carried here: ${colourProblems.join("; ")}`);
    const direction = resolveDirectionFamilies(filed, textPerRegister);
    await renderStill({
      element: createElement(DirectedDotDensity, {
        // THE FRAME THIS RENDER DRAWS IN. The component used to hold a module constant; it takes the
        // run's own frame now, so one component serves landscape, portrait and square.
        frame: { width: EXPORT_FRAME.width, height: EXPORT_FRAME.height },
        shapes,
        dots,
        // Inlined as a data URI: the rasteriser has no network and no CWD, so a plate referenced by
        // path renders as a blank box and says nothing about it.
        plate: `data:image/png;base64,${(await readFile(join(plateDir(id), "plate.png"))).toString("base64")}`,
        aspect: CAMERA_ASPECT,
        dotIs,
        subjectNote,
        limitNote,
        title,
        limits,
        reading,
        source,
        alt:
          `Carte de points de l’Europe : ${n0(total)} centrales bas-carbone, une par point, chacune ` +
          `à ses propres coordonnées. Le champ est dense en Europe de l’Ouest et le long des côtes ; ` +
          `les ${nuclear.length} sites nucléaires, cerclés, sont rares et surtout français. Ils font ` +
          `${one(shareSites)} % des sites et ${one(shareCapacity)} % de la puissance installée.`,
        eyebrow: EYEBROW,
        direction,
        treatments: offered.map((t) => t.id),
        onLadder: (note) => console.log(`  ${note}`),
      }),
      // THE SLOT'S OWN SIZE. `--size` picks it; landscape is what an article's column asks for and
      // what this lineage's tuning was measured at. The frame is half the export size at scale 2.
      width: EXPORT_FRAME.width,
      height: EXPORT_FRAME.height,
      outDir: OUT,
      name: nameAtSize(id, SIZE),
      scale: EXPORT_FRAME.scale,
    });
    console.log(`  -> renders/${nameAtSize(id, SIZE)}.png\n`);
  } catch (error) {
    for (const ext of ["png", "svg"])
      await rm(join(OUT, `${nameAtSize(id, SIZE)}.${ext}`), { force: true });
    refused.push({ id, why: error.message });
    console.log(`  REFUSED — ${error.message}\n`);
  }
}
if (refused.length)
  console.log(`refused by ${refused.length}: ${refused.map((x) => x.id).join(", ")}`);
