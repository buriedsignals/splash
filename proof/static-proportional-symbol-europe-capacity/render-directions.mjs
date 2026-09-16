// twin/proof/static-proportional-symbol-europe-capacity/render-directions.mjs
//
// Europe's low-carbon power stations, one circle each, sized by capacity, drawn once per filed
// direction through the design base. The first `proportional symbol` beat in this tree.
//
// IT DRAWS THE SAME STATIONS AS `proof/static-dot-density-europe-stations`, AND THE PAIR IS THE
// ARGUMENT. A dot map gives the COUNT of places and says nothing about their weight; sizing the mark
// gives the weight and costs the count, because a big circle covers small ones. Having both in the
// tree is what makes that checkable instead of asserted — and it is why this plate's own claim is
// the one the dot map could not make.
//
// `renders/`, PLURAL. A render written to `render/` receives no approval and is invisible to the
// export guard.
//
// Usage:  bun proof/static-proportional-symbol-europe-capacity/render-directions.mjs

import { existsSync, readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { readFile, rm } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderStill } from "#shared/chart-beat/render-still.mjs";
import { readPalette } from "#shared/chart-beat/colour.mjs";
import { beatFacts, applicableTreatments } from "#shared/chart-beat/treatments.mjs";
import { plateTints } from "#shared/map-beat/tints.mjs";
import { readDirection } from "../../scripts/design-base/read-direction.mjs";
import { composeDirections, report } from "../../scripts/design-base/compose.mjs";
import { resolveDirectionFamilies } from "../../scripts/design-base/resolve-families.mjs";
import { DirectedProportionalSymbol, worstCellInk } from "./DirectedProportionalSymbol.tsx";

const HERE = dirname(fileURLToPath(import.meta.url));
const DIRECTIONS = join(HERE, "..", "..", "docs", "design-base", "directions");
const OUT = join(HERE, "renders");
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

/** THE CLAIM THIS PLATE MAKES AND THE DOT MAP COULD NOT. Sorted by capacity, the largest sites carry
 *  a share of the total out of all proportion to their number — which is what sizing the mark shows
 *  and counting the marks hides. Both halves are derived. */
const bySize = [...stations].sort((a, b) => b.capacity_mw - a.capacity_mw);
const TOP = 100;
const mwTop = bySize.slice(0, TOP).reduce((a, s) => a + s.capacity_mw, 0);
const shareTop = (mwTop / mwAll) * 100;
if (!(TOP / total < 0.02))
  throw new Error(`the headline calls ${TOP} of ${total} a hundredth of the sites; it is ${(TOP / total) * 100} %`);
if (!(shareTop > 33))
  throw new Error(
    `the headline says the ${TOP} largest carry over a third of the capacity; they carry ${shareTop.toFixed(1)} %`,
  );
if (!(shareSites < 1))
  throw new Error(`the standfirst says nuclear is under 1 % of the sites; it is ${shareSites.toFixed(2)} %`);
if (!(shareCapacity > 30))
  throw new Error(
    `the standfirst says nuclear carries over 30 % of the capacity; it is ${shareCapacity.toFixed(1)} %`,
  );

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
    `the standfirst says nuclear is the most concentrated; ${perSite[0].fuel} is`,
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
  `${total} centrales · les ${TOP} plus grosses portent ${shareTop.toFixed(1)} % de la puissance · ` +
    `nucléaire ${nuclear.length} sites (${shareSites.toFixed(2)} %) pour ${shareCapacity.toFixed(1)} %\n`,
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

/** THE CAMERA IS THE BAKED PLATE'S — MapTiler's geography, painted in this direction's own tints.
 *  The equal-area window above sized the study area and no longer places anything.
 *
 *  THE COST, STATED, AND WHY IT IS SMALL HERE. Web Mercator inflates the north, and a symbol map is
 *  the one map family that does not care: a circle's area encodes the DATA, not the ground under it,
 *  so a stretched Norway leaves a Norwegian circle exactly the size its megawatts earn. What does
 *  move is the symbol's SEAT, which is still the capacity-weighted centre of the country's own
 *  stations — a real place, projected the same way the plate under it was. */
const PLATE_SIZE = "1000x760";
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
// THE PAIR COMES FROM THE TRUNK, AND THE WATER IS NOT THIS BEAT'S TO CHOOSE. What stood here was
// `water: mix(d.ground, d.accent, 0.16)` — the sea tinted with the very accent this beat's marks are
// drawn in, so the ground followed the mark and no accent could be picked out of it. Only the LAND's
// weight is measured per beat; the water is the filed convention, once, in `shared/map-beat/tints.mjs`.
const LAND_DOSE = 0.07;
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

/** AREA PROPORTIONAL TO CAPACITY, so the radius runs on a square root — the one scale that makes a
 *  circle's SIZE mean its value rather than its diameter meaning it. `a-radius-is-not-read-by-eye`
 *  then requires the key to carry named circles, so the same scale computes those: one function, or
 *  the key is a decoration that happens to sit near the map. */
const MAX_MW = Math.max(...stations.map((s) => s.capacity_mw));
const R_MAX = 0.017; // in units of the drawn map's width
const radiusOf = (mw) => R_MAX * Math.sqrt(Math.max(0, mw) / MAX_MW);
const symbols = stations.map((s) => {
  const [x, y] = project([s.lon, s.lat]);
  return {
    x: x / VIEW,
    y: y / VIEW,
    r: radiusOf(s.capacity_mw),
    subject: s.fuel === SUBJECT,
  };
});
/** TWO REPÈRES, NOT THREE. A nested key's height is its largest circle plus one pushed label per
 *  entry, and three of them overran the panel in two directions of three — the component said so
 *  and refused rather than shrinking the map. Two circles still give a reader the scale's shape;
 *  the third was a nicety the plate could not afford. */
/** WHICH STATIONS THE PLATE DRAWS, CHOSEN BY MEASUREMENT AND STATED ON THE PLATE.
 *
 *  All 8 900 fused: the busiest cell of the camera measured 302 % of its own area in outline, and
 *  the plate was unreadable. So the beat climbs a ladder of capacity thresholds until the field
 *  clears the ink floor at the SMALLEST camera any direction gives it — conservative on purpose, so
 *  a direction with a narrower map is not the one that discovers the problem.
 *
 *  The cut is editorial and it is printed: this plate is about where the WEIGHT is, and the stations
 *  it drops are the ones carrying least of it. */
const SMALLEST_MAP = 596;
const THRESHOLDS = [0, 50, 100, 200, 400, 800];
let threshold = null;
for (const t of THRESHOLDS) {
  const kept = symbols.filter((_, i) => stations[i].capacity_mw >= t);
  if (worstCellInk(kept, SMALLEST_MAP, CAMERA_ASPECT, 0.7) <= 40) {
    threshold = t;
    break;
  }
}
if (threshold === null)
  throw new Error("no capacity threshold leaves a legible field at this camera");
const drawnIdx = stations.map((s, i) => [s, i]).filter(([s]) => s.capacity_mw >= threshold);
const shown = drawnIdx.map(([, i]) => symbols[i]);
const shownStations = drawnIdx.map(([s]) => s);
const mwShown = shownStations.reduce((a, s) => a + s.capacity_mw, 0);
const shareShownSites = (shownStations.length / total) * 100;
const shareShownMw = (mwShown / mwAll) * 100;
console.log(
  `seuil ${threshold} MW · ${shownStations.length} centrales dessinées sur ${total} ` +
    `(${shareShownSites.toFixed(1)} % des sites) portant ${shareShownMw.toFixed(1)} % de la puissance · ` +
    `pire cellule ${worstCellInk(shown, SMALLEST_MAP, CAMERA_ASPECT, 0.7).toFixed(0)} %\n`,
);

const KEY_MW = [4000, 400];
const keyCircles = KEY_MW.map((mw) => ({ mw, r: radiusOf(mw) }));
if (KEY_MW[0] > MAX_MW)
  throw new Error(`the key's largest circle is ${KEY_MW[0]} MW and the largest station is ${MAX_MW}`);


const facts = beatFacts(
  stations.map((s) => ({ key: `${s.country}-${s.lon}-${s.lat}`, label: s.fuel, value: s.capacity_mw })),
  {
    subject: SUBJECT,
    points: { count: total, locatedAt: "the station's own coordinates" },
    overlapping: true,
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
  `Un centième des sites porte plus d’un tiers de la puissance bas-carbone d’Europe`,
  `Un centième des sites, plus d’un tiers de la puissance`,
  `La puissance tient dans peu de sites`,
];
const limits = [
  `Un cercle par centrale, à ses propres coordonnées ; l’aire du cercle est sa puissance installée. ` +
    `La plaque dessine les ${n0(shownStations.length)} centrales de ${threshold} MW ou plus — ` +
    `${one(shareShownSites)} % des ${n0(total)} sites que la base recense en Europe, et ` +
    `${one(shareShownMw)} % de la puissance. Le nucléaire y pèse le plus : ${one(shareSites)} % des ` +
    `sites pour ${one(shareCapacity)} % de la puissance.`,
  `Un cercle par centrale de ${threshold} MW ou plus, à ses coordonnées ; l’aire est la puissance. ` +
    `Ces ${n0(shownStations.length)} sites font ${one(shareShownSites)} % des centrales et ` +
    `${one(shareShownMw)} % de la puissance.`,
  `Un cercle par centrale de ${threshold} MW ou plus ; l’aire est la puissance installée.`,
  `Les ${n0(shownStations.length)} centrales de ${threshold} MW ou plus ; l’aire est la puissance.`,
];
const reading = [
  `Lecture : l’aire du cercle est proportionnelle à la puissance — les cercles de la légende ` +
    `donnent trois repères en MW, parce qu’une aire ne se lit pas à l’œil. Les cercles sont creux : ` +
    `un gros n’efface pas les petits qu’il recouvre.`,
  `Lecture : l’aire est la puissance ; les repères sont en MW. Cercles creux.`,
  `Lecture : l’aire est la puissance.`,
];
const source =
  "Source : WRI Global Power Plant Database v1.3.0 · fond de carte MapTiler (dataviz), teinté par la direction";
const dotIs = `MW · un cercle = une centrale`;
const subjectNote = `${shownStations.filter((s) => s.fuel === SUBJECT).length} sites nucléaires`;
const limitNote =
  `Sous ${threshold} MW, non dessiné : à 8 900 cercles le champ se referme. ` +
  `Le petit solaire et le petit éolien sont sous-représentés dans la base.`;

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
const newsroom = readPalette(HERE, { stopAt: join(HERE, "..") });
const BEAT_FACTS = { evidenceLevels: 3 };
console.log(
  report(composeDirections({ newsroom, filed, beat: BEAT_FACTS, textPerRegister }), {
    beat: BEAT_FACTS,
  }),
);
console.log("");

for (const file of readdirSync(DIRECTIONS).filter((f) => f.endsWith(".md"))) {
  const id = file.replace(/\.md$/, "");
  const direction = resolveDirectionFamilies(readDirection(join(DIRECTIONS, file)), textPerRegister);
  console.log(id);
  try {
    await renderStill({
      element: createElement(DirectedProportionalSymbol, {
        plate: `data:image/png;base64,${(await readFile(join(plateDir(id), "plate.png"))).toString("base64")}`,
        shapes,
        symbols: shown,
        keyCircles,
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
      width: 960,
      height: 540,
      outDir: OUT,
      name: id,
      scale: 2,
    });
    console.log(`  -> renders/${id}.png\n`);
  } catch (error) {
    for (const ext of ["png", "svg"]) await rm(join(OUT, `${id}.${ext}`), { force: true });
    refused.push({ id, why: error.message });
    console.log(`  REFUSED — ${error.message}\n`);
  }
}
if (refused.length)
  console.log(`refused by ${refused.length}: ${refused.map((x) => x.id).join(", ")}`);
