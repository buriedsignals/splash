// twin/proof/static-choropleth-europe-lowcarbon/beat.mjs
//
// THE BEAT'S SUBJECT, IMPORTABLE WITHOUT RENDERING — Europe's low-carbon electricity share in 2024,
// read from the frozen CSV and shapes, its claim asserted, its copy ladders and its plan layers.
// Moved out of `render-directions.mjs` unchanged so a second export (the video) can import the same
// subject the still is drawn from. Importing this file does no work of its own: the frozen data and
// shapes are read when `loadSubject` is called, and nothing here spawns a bake or renders a still.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  deriveFurniture,
  adjustToContrast,
  TEXT_CONTRAST_MIN,
} from "#shared/chart-beat/render-still.mjs";
import { mix } from "#shared/chart-beat/colour.mjs";
import { beatFacts, applicableTreatments } from "#shared/chart-beat/treatments.mjs";
import { plateTints } from "#shared/map-beat/tints.mjs";
import { maptilerFace } from "#shared/map-beat/glyphs.mjs";
import { BEAT } from "./bake.mjs";
import { matchConvention } from "../../skills/palette/scripts/palette.mjs";
import { subjectRingOf } from "./DirectedChoroplethMap.tsx";

export const YEAR = 2024;
const EYEBROW = "Énergie · Europe";

const RENEWABLE = [
  "hydro_generation__twh",
  "wind_generation__twh",
  "solar_generation__twh",
  "bioenergy_stacked_generation__twh",
  "other_renewables_generation__twh",
];
const NUCLEAR = "nuclear_generation__twh";
const FOSSIL = ["gas_generation__twh", "coal_generation__twh", "oil_generation__twh"];
const ALL = [...RENEWABLE, NUCLEAR, ...FOSSIL];

const FRENCH = {
  ALB: "Albanie", AUT: "Autriche", BLR: "Biélorussie", BEL: "Belgique",
  BIH: "Bosnie-Herzégovine", BGR: "Bulgarie", HRV: "Croatie", CYP: "Chypre",
  CZE: "Tchéquie", DNK: "Danemark", EST: "Estonie", FIN: "Finlande", FRA: "France",
  DEU: "Allemagne", GRC: "Grèce", HUN: "Hongrie", ISL: "Islande", IRL: "Irlande",
  ITA: "Italie", LVA: "Lettonie", LTU: "Lituanie", LUX: "Luxembourg", MLT: "Malte",
  MDA: "Moldavie", MNE: "Monténégro", NLD: "Pays-Bas", MKD: "Macédoine du Nord",
  NOR: "Norvège", POL: "Pologne", PRT: "Portugal", ROU: "Roumanie", RUS: "Russie",
  SRB: "Serbie", SVK: "Slovaquie", SVN: "Slovénie", ESP: "Espagne", SWE: "Suède",
  CHE: "Suisse", TUR: "Turquie", UKR: "Ukraine", GBR: "Royaume-Uni",
};
const french = (iso) => {
  if (!FRENCH[iso]) throw new Error(`no French name recorded for ${iso}`);
  return FRENCH[iso];
};

/** THE CAMERA, declared here and nowhere else: the window in degrees the plate shows, and the
 *  projection it shows it in.
 *
 *  LAMBERT AZIMUTHAL EQUAL-AREA, centred at 52° N 10° E — which is EPSG:3035, the projection the
 *  European Environment Agency and Eurostat publish continental statistics in. Two reasons, and the
 *  first is not aesthetic.
 *
 *  A CHOROPLETH IS READ BY AREA. The eye weights a class by how much of the page it covers, so a
 *  projection that inflates the north inflates the argument — and the first version of this plate
 *  was Web Mercator, where Norway, Sweden and Finland are stretched by a factor of about two at
 *  their own latitudes. Those are three of the seven countries the headline is about. An equal-area
 *  projection is not a refinement here; it is the difference between a map that supports the
 *  sentence and one that manufactures it.
 *
 *  And Mercator's Europe is as tall as it is wide, so on a landscape plate it is bound by height and
 *  leaves two thirds of the page empty. LAEA's is wider than tall, and the same vertical budget buys
 *  a map half again as large. */
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

/** The camera's box is the projected border of the declared window — sampled, because a projected
 *  rectangle is not a rectangle, and taking only its four corners would crop the bulge in the
 *  middle of each edge. */
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
/** ONE SCALE FOR BOTH AXES. A map whose aspect is stretched to fill a frame is a map that lies about
 *  shape, so the shapes go into a unit box on the LONGER side and the component is told the aspect. */
const spanX = BX1 - BX0;
const spanY = BY1 - BY0;
const span = Math.max(spanX, spanY);

/** THE CAMERA IS THE PLATE'S, NOT THIS FILE'S — and that is the change this pass made.
 *
 *  The equal-area camera above is kept because it is what MEASURES: the two averages the cartogram
 *  beat compares are area-weighted, and an area weight taken off a Mercator drawing would be wrong
 *  by a factor of two at Norway's latitude. It no longer places anything.
 *
 *  What places every mark is the baked MapTiler plate's own recorded camera — `frameCorners`,
 *  measured with `map.unproject()` after the camera settled, not the nominal bounds handed to
 *  `fitBounds`, which fitBounds widens to preserve the frame's aspect. Longitude is linear in
 *  pixel-x under Web Mercator; latitude needs the inverse Mercator formula, because pixel-y is
 *  linear in Mercator-y and not in latitude itself.
 *
 *  THE COST, STATED. Web Mercator inflates the north: at 60° a shape draws twice the area it holds.
 *  This plate's own headline is a count of countries, not an area, so the count survives; the
 *  cartogram beat's area weighting does NOT, and it keeps measuring on the equal-area camera above
 *  while drawing on the plate. Where the two disagree, the number is the equal-area one and the
 *  picture is the plate's. */
/** THE CAMERA IS PREDICTED, NOT READ BACK — and that is what breaks the circle this task walked
 *  into. The plan the bake mounts carries the beat's own words in DEGREES, and where a word goes is
 *  a SEARCH that reasons in pixels; so the search needs the camera BEFORE the plate exists, while
 *  the plate used to be the only place the camera was ever recorded.
 *
 *  `cameraFor` is the fit `fitBounds` performs, in ten lines: Mercator-project the bounds, take the
 *  scale that binds, centre the frame on the bounds' own centre. It is a SECOND implementation of
 *  MapLibre's arithmetic, and the only thing that makes a second implementation safe is that the
 *  first one checks it every run — `assertPlateShowsTheCamera` compares what the real camera
 *  reported after the bake against what this predicted. Measured against the three plates already
 *  committed at 1000x760: every corner agrees to 1e-12°.
 *
 *  ONE CAMERA, THREE PIXEL SCALES. The corners depend on the frame's ASPECT and not on its size,
 *  and the layout keeps `mapW / mapH` at `CAMERA_ASPECT` by construction — but `drawnSizeOf` rounds
 *  to whole pixels, so each plate's real aspect is a ten-thousandth off the nominal one and shows a
 *  sliver more ground than the marks were measured in. `assertRoundingIsSubPixel` measures that
 *  sliver in the plate's own pixels and refuses it if it ever reaches half of one. */
const CAMERA_ASPECT = 1000 / 760;
const mercY = (lat) => Math.log(Math.tan(Math.PI / 4 + (lat * RAD) / 2));
const worldX = (lon) => (lon + 180) / 360;
const worldY = (lat) => (1 - mercY(lat) / Math.PI) / 2;
const lonOf = (x) => x * 360 - 180;
const latOf = (y) => (2 * Math.atan(Math.exp((1 - 2 * y) * Math.PI)) - Math.PI / 2) / RAD;
function cameraFor({ width, height }) {
  const [[west, south], [east, north]] = BEAT.bounds;
  const worldPx = Math.min(
    width / (worldX(east) - worldX(west)),
    height / (worldY(south) - worldY(north)),
  );
  const cx = (worldX(west) + worldX(east)) / 2;
  const cy = (worldY(north) + worldY(south)) / 2;
  const halfX = width / worldPx / 2;
  const halfY = height / worldPx / 2;
  return {
    frame: { width, height },
    corners: {
      west: lonOf(cx - halfX),
      east: lonOf(cx + halfX),
      north: latOf(cy - halfY),
      south: latOf(cy + halfY),
    },
  };
}

/** THE CAMERA EVERY MARK IS MEASURED IN: the nominal aspect at a nominal size, because only the
 *  aspect moves the corners. The window it shows is what `project` and `unproject` below speak. */
const CAMERA = cameraFor({ width: 1000, height: 1000 / CAMERA_ASPECT });
const FRAME = CAMERA.frame;
const CORNERS = CAMERA.corners;
const Y_NORTH = mercY(CORNERS.north);
const Y_SOUTH = mercY(CORNERS.south);
const project = ([lon, lat]) => {
  const px = ((lon - CORNERS.west) / (CORNERS.east - CORNERS.west)) * FRAME.width;
  const py = ((mercY(lat) - Y_NORTH) / (Y_SOUTH - Y_NORTH)) * FRAME.height;
  return [px / FRAME.width, py / FRAME.width];
};
/** …AND BACK, exactly. The PLAN speaks degrees — a layer's data is geography, not a unit box — while
 *  everything this file measures (an anchor, a placed name) is already in the camera's unit box. The
 *  two are the same camera, so the way back is the algebra above read in reverse rather than a
 *  second, approximate answer to the same question. */
const unproject = ([x, y]) => [
  CORNERS.west + x * (CORNERS.east - CORNERS.west),
  (Math.atan(Math.exp(Y_NORTH + ((y * FRAME.width) / FRAME.height) * (Y_SOUTH - Y_NORTH))) -
    Math.PI / 4) *
    (360 / Math.PI),
];

/** THE PLATE MUST SHOW THE CAMERA IT WAS PREDICTED TO SHOW. This replaces the cross-plate identity
 *  assertion, and it is strictly stronger: that one held three plates to each other, so three
 *  plates baked wrong the same way passed. This holds each plate to the arithmetic the marks were
 *  placed by. */
const CORNER_TOLERANCE = 1e-6;
function assertPlateShowsTheCamera(id, recorded, drawn) {
  const predicted = cameraFor(drawn).corners;
  const apart = ["west", "east", "south", "north"].filter(
    (edge) => Math.abs(recorded[edge] - predicted[edge]) > CORNER_TOLERANCE,
  );
  if (apart.length)
    throw new Error(
      `the ${id} plate did not settle on the camera its marks were placed in — its ` +
        `${apart.join(", ")} edge${apart.length > 1 ? "s disagree" : " disagrees"} with the ` +
        `prediction by more than ${CORNER_TOLERANCE}° (${apart
          .map((e) => `${e} ${recorded[e].toFixed(9)} vs ${predicted[e].toFixed(9)}`)
          .join("; ")}). Every word in the plan is a coordinate: if the camera is not the one they ` +
        `were searched in, each one lands somewhere the geography under it does not.`,
    );
}
/** …AND THE COST OF ROUNDING THE DRAWN SIZE TO WHOLE PIXELS MUST STAY UNDER ONE. A 573.68px map is
 *  baked in a 574px frame, whose aspect is not quite the camera's, so the plate shows a sliver more
 *  ground on the bound axis. Stated in the plate's own pixels rather than in degrees, because
 *  degrees are not the unit anybody can judge this in. */
function assertRoundingIsSubPixel(id, drawn) {
  const predicted = cameraFor(drawn).corners;
  const span = CORNERS.east - CORNERS.west;
  const off = Math.max(
    ...["west", "east"].map((e) => (Math.abs(predicted[e] - CORNERS[e]) / span) * drawn.width),
  );
  if (off >= 0.5)
    throw new Error(
      `rounding ${id}'s drawn size to ${drawn.width}x${drawn.height} moves the frame's edge ` +
        `${off.toFixed(2)}px away from the camera the marks were measured in. Under half a pixel is ` +
        `a rounding cost; this is a different camera.`,
    );
  return off;
}

/** A ring is thinned by dropping vertices closer than half a drawn pixel to the last one kept, at
 *  the smallest camera this beat publishes — the coastline a reader sees is unchanged and the file
 *  the rasteriser walks is a fraction of the size.
 *
 *  AND THINNING MAY NEVER DESTROY A RING. The first version returned `null` when fewer than four
 *  vertices survived, and Malta — 27 km across, every vertex inside half a pixel of the last —
 *  vanished: 40 countries reported generation and 39 shapes carried a value. The plate would have
 *  rendered, correctly, with a country silently absent, which is the failure every choropleth
 *  reference sheet in this harvest warns about by name. A ring too small to thin is kept whole. */
const MIN_STEP = 0.5 / 200;
function thin(ring) {
  const out = [ring[0]];
  for (const p of ring.slice(1)) {
    const q = out[out.length - 1];
    if (Math.abs(p[0] - q[0]) > MIN_STEP || Math.abs(p[1] - q[1]) > MIN_STEP) out.push(p);
  }
  return out.length >= 4 ? out : ring;
}

const plain = (s) => s.replace(/[  ]/g, " ");
const one = (v) =>
  plain(v.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }));
const format = (v) => `${Math.round(v)} %`;

/** SILENT BY DEFAULT. The runner hands in the real `console` so its report prints exactly as it
 *  did when this was module-level work; any other importer loads the subject without a word. */
const SILENT = { log() {}, table() {} };

export function loadSubject({ dir, console = SILENT }) {
  // ── the data ────────────────────────────────────────────────────────────────
  const csv = readFileSync(join(dir, "data.csv"), "utf8").trim().split(/\r?\n/);
  const header = csv[0].split(",");
  const rowsRaw = csv.slice(1).map((l) => {
    const cells = l.split(",");
    return Object.fromEntries(header.map((h, i) => [h, cells[i]]));
  });

  /** An entity the file does not report is not a zero — Ukraine's 2024 row carries a single `0` and
   *  nothing else. It stays in the STUDY SET (the source is supposed to report it) and is drawn as an
   *  absence, which is the whole difference between this map and one that shows Ukraine at 0 %. */
  const measured = rowsRaw.map((raw) => {
    if (Number(raw.year) !== YEAR) throw new Error(`${raw.entity} is not ${YEAR}`);
    const twh = ALL.map((k) => Number(raw[k] || 0));
    return { iso: raw.code, entity: raw.entity, raw, total: twh.reduce((a, b) => a + b, 0) };
  });
  const studySet = measured.map((m) => m.iso);
  const unreported = measured.filter((m) => !(m.total > 0));

  const value = new Map();
  for (const m of measured.filter((m) => m.total > 0)) {
    const share = (k) => (Number(m.raw[k] || 0) / m.total) * 100;
    const renewables = RENEWABLE.reduce((s, k) => s + share(k), 0);
    const nuclear = share(NUCLEAR);
    value.set(m.iso, {
      iso: m.iso,
      label: french(m.iso),
      total: m.total,
      renewables,
      nuclear,
      lowCarbon: renewables + nuclear,
    });
  }
  console.log(
    `${measured.length} European entities frozen · ${value.size} report ${YEAR} generation · ` +
      `no data for ${unreported.length}: ${unreported.map((m) => french(m.iso)).join(", ")}\n`,
  );

  // ── the shapes ──────────────────────────────────────────────────────────────
  const geo = JSON.parse(readFileSync(join(dir, "shapes.geojson"), "utf8"));

  console.log(
    `camera: MapTiler ${BEAT.style}, ` +
      `${CORNERS.west.toFixed(2)}..${CORNERS.east.toFixed(2)}E ` +
      `${CORNERS.south.toFixed(2)}..${CORNERS.north.toFixed(2)}N · aspect ${CAMERA_ASPECT.toFixed(2)}:1\n`,
  );
  console.log(
    `measurement camera (unchanged): LAEA 52N 10E, window ${WINDOW.west}..${WINDOW.east}E ` +
      `${WINDOW.south}..${WINDOW.north}N · aspect ${(spanX / spanY).toFixed(2)}:1\n`,
  );

  let vertices = 0;
  const shapes = geo.features
    .map((f) => {
      const iso = f.properties.iso;
      const rings = f.geometry.coordinates
        .flatMap((poly) => poly)
        .map((ring) => thin(ring.map(project)))
        .filter(Boolean);
      if (!rings.length) return null;
      vertices += rings.reduce((s, r) => s + r.length, 0);
      /** THE LABEL ANCHOR IS THE RING'S OWN CENTRE OF MASS, PULLED BACK INSIDE THE RING.
       *
       *  The box centre is the cheap answer and it is wrong exactly where it matters: Norway's box
       *  includes Finnmark, so its centre lands in SWEDEN — and every label placed from it, and every
       *  leader drawn to it, started in the wrong country. The vertex mean sits where the coastline
       *  actually is (a fjorded coast contributes most of the vertices), and when even that falls
       *  outside — a crescent, an archipelago — it is walked to the nearest vertex, which is on the
       *  country by construction. The box is still reported, because "does the name fit inside this
       *  shape" is a question about the box. */
      const largest = rings.reduce((a, b) => (b.length > a.length ? b : a));
      const xs = largest.map((p) => p[0]);
      const ys = largest.map((p) => p[1]);
      const mean = {
        x: xs.reduce((a, b) => a + b, 0) / xs.length,
        y: ys.reduce((a, b) => a + b, 0) / ys.length,
      };
      const insideRing = (px, py) => {
        let hit = false;
        for (let i = 0, j = largest.length - 1; i < largest.length; j = i++) {
          const [xi, yi] = largest[i];
          const [xj, yj] = largest[j];
          if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) hit = !hit;
        }
        return hit;
      };
      const seat = insideRing(mean.x, mean.y)
        ? mean
        : largest.reduce(
            (best, [px, py]) =>
              (px - mean.x) ** 2 + (py - mean.y) ** 2 <
              (best.x - mean.x) ** 2 + (best.y - mean.y) ** 2
                ? { x: px, y: py }
                : best,
            { x: largest[0][0], y: largest[0][1] },
          );
      const box = {
        x: seat.x,
        y: seat.y,
        width: Math.max(...xs) - Math.min(...xs),
        height: Math.max(...ys) - Math.min(...ys),
      };
      return {
        iso,
        name: FRENCH[iso] ?? f.properties.name,
        rings,
        anchor: box,
        value: value.has(iso) ? value.get(iso).lowCarbon : null,
        inStudySet: studySet.includes(iso),
      };
    })
    .filter(Boolean);
  console.log(`${shapes.length} shapes projected, ${vertices} vertices after thinning\n`);

  const drawn = shapes.filter((s) => s.value !== null).length;
  if (drawn !== value.size)
    throw new Error(
      `the join dropped rows: ${value.size} countries report ${YEAR} generation and ${drawn} shapes ` +
        `carry a value. Missing: ${[...value.keys()].filter((k) => !shapes.some((s) => s.iso === k)).join(", ")}`,
    );

  // ── THE CLAIM, ASSERTED — including its geography ───────────────────────────
  const FLOOR = 94;
  const ranked = [...value.values()].sort((a, b) => b.lowCarbon - a.lowCarbon);
  const above = ranked.filter((r) => r.lowCarbon > FLOOR);
  if (above.length !== 7)
    throw new Error(
      `the headline says seven countries clear ${FLOOR} %; ${above.length} do ` +
        `(${above.map((r) => `${r.label} ${r.lowCarbon.toFixed(1)}`).join(", ")})`,
    );

  /** ALBANIA'S NEIGHBOURS ARE DERIVED FROM THE FROZEN SHAPES, not typed from memory. Two countries
   *  are neighbours when a vertex of one lands within a tenth of a degree of a vertex of the other.
   *  The test is coarse in the safe direction — it can only ever find MORE neighbours than exist, so a
   *  claim that every neighbour is below a floor cannot pass by missing one.
   *
   *  IT IS RUN IN DEGREES, ON THE RAW COORDINATES, and that is not a detail: the first version ran on
   *  the PROJECTED rings with a threshold derived from the old projection's unit box. Changing the
   *  projection silently changed what "a tenth of a degree" meant, Montenegro stopped being a
   *  neighbour, and the plate went from "3 voisins" to "2" without anything going red. A geographic
   *  fact should not move when the camera does. */
  const NEAR_DEGREES = 0.1;
  const lonLatOf = (iso) => {
    const f = geo.features.find((f) => f.properties.iso === iso);
    return f ? f.geometry.coordinates.flat().flat() : [];
  };
  function neighboursOf(iso) {
    const mine = lonLatOf(iso);
    return geo.features
      .map((f) => f.properties.iso)
      .filter((other) => other !== iso)
      .filter((other) =>
        lonLatOf(other).some(([x, y]) =>
          mine.some(([u, v]) => Math.abs(x - u) < NEAR_DEGREES && Math.abs(y - v) < NEAR_DEGREES),
        ),
      );
  }

  const ODD_ONE = "ALB";
  if (!above.some((r) => r.iso === ODD_ONE))
    throw new Error(`the callout is about ${french(ODD_ONE)}, which is not above the floor`);
  const neighbours = neighboursOf(ODD_ONE).filter((iso) => value.has(iso));
  if (!neighbours.length)
    throw new Error(`${french(ODD_ONE)} has no neighbour with data in the frozen shapes`);
  const NEIGHBOUR_CEILING = 60;
  const overCeiling = neighbours.filter((iso) => value.get(iso).lowCarbon >= NEIGHBOUR_CEILING);
  if (overCeiling.length)
    throw new Error(
      `the callout says every one of ${french(ODD_ONE)}'s neighbours is under ${NEIGHBOUR_CEILING} %; ` +
        `${overCeiling.map((i) => `${french(i)} ${value.get(i).lowCarbon.toFixed(1)}`).join(", ")} ` +
        `${overCeiling.length === 1 ? "is" : "are"} not`,
    );
  console.log(
    `${french(ODD_ONE)} ${value.get(ODD_ONE).lowCarbon.toFixed(1)} % · neighbours derived from the ` +
      `frozen rings: ${neighbours.map((i) => `${french(i)} ${value.get(i).lowCarbon.toFixed(1)}`).join(", ")}\n`,
  );

  /** The other six are north or west of the odd one out — stated as a measurement on the shapes, so a
   *  headline that says "the north-west, and one exception" is checkable. */
  const anchorOf = (iso) => shapes.find((s) => s.iso === iso).anchor;
  const oddAnchor = anchorOf(ODD_ONE);
  const notNorthWest = above
    .filter((r) => r.iso !== ODD_ONE)
    .filter((r) => anchorOf(r.iso).y > oddAnchor.y && anchorOf(r.iso).x > oddAnchor.x);
  if (notNorthWest.length)
    throw new Error(
      `the headline says the other six are north or west of ${french(ODD_ONE)}; ` +
        `${notNorthWest.map((r) => r.label).join(", ")} is neither`,
    );

  console.table(
    ranked.map((r) => ({
      pays: r.label,
      "bas-carbone %": r.lowCarbon.toFixed(1),
      "renouv. %": r.renewables.toFixed(1),
      "nucléaire %": r.nuclear.toFixed(1),
      TWh: r.total.toFixed(0),
    })),
  );

  // ── the plate ───────────────────────────────────────────────────────────────
  const BREAKS = [40, 55, 70, 85, FLOOR];
  const facts = beatFacts(
    ranked.map((r) => ({ key: r.iso, label: r.label, value: r.lowCarbon })),
    {
      subject: ODD_ONE,
      cells: ranked.map((r) => ({ key: r.iso, value: r.lowCarbon })),
      impossibleCells: unreported.length,
      scaleClasses: BREAKS.length + 1,
      geography: { areas: above.length, settlements: 0, waters: 3, basemap: true },
      declaredSequence: "low-carbon share",
    },
  );
  const offered = applicableTreatments(facts);
  console.log(`treatments applicable: ${offered.map((t) => t.id).join(", ")}\n`);

  /** The study set as geography, in degrees — the same frozen rings the plate is drawn from, carrying
   *  the value each area is classed on and whether the source was supposed to report it at all. */
  const studyAreas = {
    type: "FeatureCollection",
    features: geo.features.map((f) => ({
      type: "Feature",
      properties: {
        iso: f.properties.iso,
        name: FRENCH[f.properties.iso] ?? f.properties.name,
        value: value.has(f.properties.iso) ? value.get(f.properties.iso).lowCarbon : null,
        inStudySet: studySet.includes(f.properties.iso),
      },
      geometry: f.geometry,
    })),
  };
  /** THE SEAT OF A COUNTRY'S OWN LARGEST RING — where the SEARCH starts, and where the subject's ring
   *  is drawn. It is NOT where the words go: the picture places a country's name inside its shape only
   *  when the whole word fits inside it, and otherwise in the nearest open water on a leader, which is
   *  how six of the seven names are drawn. `placementsFor` is what answers that, per direction, and
   *  the plan carries ITS answer. */
  const seatOf = (iso) => {
    const shape = shapes.find((s) => s.iso === iso);
    if (!shape) throw new Error(`${FRENCH[iso] ?? iso} is named on the map but has no frozen shape`);
    /** An anchor is `null` when a shape has no ring big enough to seat one. The first version read
     *  `shape.anchor.x` straight through and a country in that state came back as a TypeError on a
     *  property of null — a stack trace where the beat should say which country it cannot place. */
    if (!shape.anchor)
      throw new Error(
        `${shape.name} is named on the map but its frozen shape carries no anchor, so the beat has ` +
          `nowhere to put the word. Drop it from the named set or give the shape a ring to seat it in.`,
      );
    return shape.anchor;
  };

  return {
    value,
    studySet,
    unreported,
    shapes,
    geo,
    BREAKS,
    FLOOR,
    ODD_ONE,
    NEIGHBOUR_CEILING,
    facts,
    offered,
    format,
    one,
    plain,
    french,
    ranked,
    above,
    neighbours,
    studyAreas,
    seatOf,
  };
}

/** THE STATIC COPY LADDERS — every rung the layout may spend, built from the loaded subject. */
export function copyOf(subject) {
  const { value, ranked, above, neighbours, BREAKS, FLOOR, ODD_ONE, NEIGHBOUR_CEILING } = subject;
  /** THE THREE SEAS, at declared positions in the camera's own unit box. A sea has no polygon in this
   *  file — the shapes are land — so its label cannot be placed from geometry, and the plate says so
   *  rather than pretending the position was derived. */
  const WATERS = [
    // Each sea is declared once, at its own centre. The forms are the ladder; the position is a fact.
    { forms: ["Mer du Nord", "Mer du N."], lon: 3.0, lat: 56.5 },
    { forms: ["Mer Méditerranée", "Méditerranée", "Médit."], lon: 15.0, lat: 36.0 },
    { forms: ["Mer Baltique", "Baltique", "Balt."], lon: 19.5, lat: 58.0 },
  ].map((w) => {
    const [x, y] = project([w.lon, w.lat]);
    // The unit-box position is what the component draws with; the degrees are what the PLAN carries.
    return { forms: w.forms, x, y, lon: w.lon, lat: w.lat };
  });

  const oddValue = value.get(ODD_ONE);
  /** The sentence in the panel. The RING that marks its subject on the map is a layer now, placed
   *  from the shape's own seat, so the callout carries no position of its own any more. */
  const CALLOUT = {
    iso: ODD_ONE,
    lines: [
      `${french(ODD_ONE)}, ${one(oddValue.lowCarbon)} %, est le seul du groupe hors du nord-ouest. ` +
        `Ses ${neighbours.length} voisins sont tous sous ${NEIGHBOUR_CEILING} %.`,
    ],
  };

  const title = [
    `Sept pays européens dépassent ${FLOOR} % d’électricité bas-carbone — six au nord-ouest, ` +
      `et l’Albanie`,
    `Le bas-carbone européen est au nord-ouest — et en Albanie`,
    `Le bas-carbone européen, et son exception`,
    // THE SQUARE'S OWN RUNG. The eyebrow above already says « Énergie · Europe », so a 1080px square
    // does not have to carry the subject twice — and it has room for one line of display type.
    `Le nord-ouest, et l’Albanie`,
  ];
  const limits = [
    `Part de l’électricité produite à partir de sources bas-carbone — renouvelables et nucléaire ` +
      `réunis — en ${YEAR}, dans les ${value.size} pays européens dont la production est rapportée. ` +
      `${above.map((r) => r.label).join(", ")} dépassent ${FLOOR} %.`,
    `Part de l’électricité bas-carbone — renouvelables et nucléaire réunis — en ${YEAR}, dans les ` +
      `${value.size} pays européens dont la production est rapportée.`,
    `Électricité bas-carbone en ${YEAR}, ${value.size} pays européens.`,
  ];
  const reading = [
    `Lecture : la couleur est une classe, pas un nombre ; ses bornes sont imprimées sous la carte. ` +
      `La Russie et la Turquie sont colorées sur leur part nationale, dont le cadre ne montre que ` +
      `l’extrémité occidentale.`,
    `Lecture : la couleur est une classe ; ses bornes sont sous la carte.`,
    // The tightest rung, for a frame where the map needs every line the copy can give back.
    `Lecture : la couleur est une classe.`,
  ];
  // THE CREDIT ATTRIBUTES; IT DOES NOT EXPLAIN. The publication's full title and the route it
  // travelled are the BRIEF's business — spelled here they cost three lines of source at 540px, and
  // at a square frame those three lines are the map's.
  const source =
    "Source : Ember / Energy Institute (2025), via Our World in Data · carte MapTiler";

  const textPerRegister = {
    display: title.join(" "),
    eyebrow: EYEBROW,
    body: `${limits.join(" ")} ${source}`,
    axis: `${above.map((r) => r.label).join(" ")} ${ranked.slice(-3).map((r) => r.label).join(" ")} ${BREAKS.map(format).join(" ")} part bas-carbone donnée non rapportée`,
    annot: `${reading.join(" ")} ${CALLOUT.lines.join(" ")} ${WATERS.flatMap((w) => w.forms).join(" ")}`,
    value: ranked.map((r) => format(r.lowCarbon)).join(" "),
  };

  return {
    title,
    limits,
    reading,
    source,
    callout: CALLOUT,
    waters: WATERS,
    textPerRegister,
    eyebrow: EYEBROW,
  };
}

/** THE RAMP, AND THE COLOUR UNDER ANY POINT OF THE MAP — one construction, because the layer that
 *  paints a class and the search that decides what ink a word over that class needs are asking the
 *  same question. The component spends the same two poles for the KEY it still draws.
 *
 *  `cellOf` ANSWERS FOR A SHAPE, NOT FOR A VALUE, and that is the change a word on land forced. The
 *  fill a point takes is a three-way question the `classes` layer already asks in its own `case`
 *  expression — has a value, is in the study set and has none, or is neither — and answering it from
 *  a bare `value` collapsed the last two. A word may now land on Morocco, which is context land and
 *  not a missing reading; the two are different colours on the plate and its ink has to be measured
 *  against the one really under it.
 *
 *  `inkFor` is the ONE definition of what colour a word is drawn in. The search calls it to refuse a
 *  cell no variant of the ink can be read on; `wordsOf` calls it to draw. Two copies is how a search
 *  clears a placement the drawing then renders illegible. */
export function rampFor(direction, subject) {
  const { BREAKS } = subject;
  const { ink, muted } = deriveFurniture(direction.ground);
  const low = mix(direction.accent, direction.ground, 0.88);
  const high = mix(direction.accent, ink, 0.3);
  const classCount = BREAKS.length + 1;
  const classFill = (i) => mix(low, high, classCount > 1 ? i / (classCount - 1) : 0.5);
  const classOf = (v) => BREAKS.filter((b) => v >= b).length;
  const missingFill = mix(direction.ground, ink, 0.13);
  const landNoValue = mix(direction.ground, ink, 0.05);
  return {
    classFill,
    classOf,
    missingFill,
    landNoValue,
    coast: mix(direction.ground, ink, 0.22),
    /** THE SEVEN THE HEADLINE IS ABOUT ARE TAKEN TO 7:1, not to the 4.5 floor: they should be the
     *  first thing read on the plate, not the last thing that technically passes. `null` when no
     *  variant of the colour reaches its floor on that cell — measured on 2026-09-13, that is
     *  classes 3 and 4 of the ramp in all three directions, and it is a refusal in the search
     *  rather than a `null` fill in the layer. */
    inkFor: (klass, cell) =>
      klass === "feature"
        ? adjustToContrast(direction.accent, cell, 7)
        : adjustToContrast(muted, cell, TEXT_CONTRAST_MIN),
  };
}

/** EVERY VALUE BELOW IS THE COMPONENT'S OWN, TRANSPORTED. Not one of them was chosen here: the ramp
 *  is the heatmap's construction between the direction's poles, the border is `deriveFurniture`'s
 *  `grid` step, the ring is the accent walked to the text floor, the labels are the axis register
 *  with the same tracking the plate sets them in, and every POSITION is the one `placementsFor`
 *  searched. A number invented for the plan would be a second answer to a question the drawing has
 *  already measured. */
export function layersFor(direction, g, placement, subject) {
  const { BREAKS, ODD_ONE, studyAreas, seatOf } = subject;
  const { muted, grid } = deriveFurniture(direction.ground);
  const { classFill, missingFill, landNoValue, coast } = rampFor(direction, subject);
  const waterHue = matchConvention("water").accent;
  /** The sea the plate is actually baked in — `plateTints`, the same call the bake makes — so the
   *  halo behind a sea's name is struck in the water the name sits in. */
  const seaTint = plateTints(direction).water;
  const waterInk = adjustToContrast(waterHue, seaTint, TEXT_CONTRAST_MIN);
  const accentInk = adjustToContrast(direction.accent, direction.ground, TEXT_CONTRAST_MIN);
  const mutedInk = adjustToContrast(muted, direction.ground, TEXT_CONTRAST_MIN);

  /** The three registers the words are SET in are the three the search MEASURED them in —
   *  `mapRegistersFor`, one definition, returned by the placement rather than rebuilt here. */
  const { area, feature, water: waterReg } = placement.registers;
  /** A register's tracking is measured in PIXELS on the plate and declared in EMS on a map. Same
   *  measurement, the unit the reader of it expects. */
  const tracking = (r) => Number(r.letterSpacing ?? 0) / r.fontSize;
  /** …AND A HALO IS A STROKE ON THE PLATE AND A RADIUS ON A MAP. SVG strokes a glyph outline
   *  CENTRED on its path, so half the width falls inside the letter and half outside; MapLibre's
   *  `text-halo-width` is the distance the halo reaches OUTWARD. Half the stroke is the same halo,
   *  in the unit its reader expects — the same kind of conversion as the tracking above, and not a
   *  number to be "corrected" back to the stroke width. */
  const haloOf = (strokeWidth) => strokeWidth / 2;
  const AREA_HALO = haloOf(Math.max(2.5, g.axisBand.ascent * 0.34));
  /** A sea name is set at its own halo, and it is NOT the area one: the plate strokes it at
   *  `max(2, ascent * 0.3)` where an area name takes `max(2.5, ascent * 0.34)`. Spending one value
   *  on both is how two measurements become one guess. */
  const WATER_HALO = haloOf(Math.max(2, g.axisBand.ascent * 0.3));

  /** A SEARCHED POSITION IS A UNIT-BOX POINT; A LAYER IS GEOGRAPHY. The two are the same camera. */
  const at = ([x, y]) => unproject([x, y]);
  /** MAPLIBRE CENTRES A LABEL VERTICALLY ON ITS ANCHOR; SVG SETS IT ON A BASELINE. A country name is
   *  drawn at `y·mapW + (ascent−descent)/2`, so its visual centre is exactly `y·mapW` and no offset
   *  is needed. A sea name is drawn with its BASELINE at `y·mapW`, so its centre is
   *  `(ascent−descent)/2` above that, and the layer has to say so — in ems, and as a literal pair of
   *  numbers, because `text-offset` built out of two expressions draws nothing at all and reports
   *  nothing (`validateExpressions` is what refuses it). */
  const WATER_OFFSET_EM =
    (g.axisBand.descent - g.axisBand.ascent) / (2 * waterReg.fontSize);

  const words = (id, data, register, colour, haloColour, haloWidth, offset) => ({
    id,
    role: "place",
    type: "symbol",
    data,
    layout: {
      "text-field": ["get", "name"],
      "text-font": [maptilerFace(register)],
      "text-size": register.fontSize,
      "text-letter-spacing": tracking(register),
      ...(offset ? { "text-offset": offset } : {}),
      /** THE POSITIONS ARE ALREADY COLLISION-FREE BY CONSTRUCTION — the search kept a real gap
       *  between every pair of boxes it placed. MapLibre's own collision pass does not know that and
       *  would silently drop the loser of any pair it disagreed about, which is the same class of
       *  defect as the duplicate id: a word simply absent, with no error. */
      "text-allow-overlap": true,
      /** …AND NO WRAPPING. MapLibre's default `text-max-width` is 10 ems, so `Mer Méditerranée`
       *  would break onto a second line where the SVG measured it as one. The search measured a
       *  single line; the layer draws a single line. */
      "text-max-width": 100,
    },
    paint: { "text-color": colour, "text-halo-color": haloColour, "text-halo-width": haloWidth },
  });

  /** A WORD'S INK IS CHOSEN AGAINST THE CELL IT LANDS ON, NOT AGAINST THE PAGE. The component
   *  records this as a defect it already found and repaired: walking the ink to the floor against
   *  the GROUND is measuring against a colour the letters never touch, and the pixel guard cleared
   *  it because it samples the most common ground under the box. The halo is struck in that same
   *  cell, so whatever is behind the word the letters sit on a known colour and the ink is right
   *  once. And a FEATURE is taken to 7:1 rather than the 4.5 floor: the seven countries the headline
   *  is about should be the first thing read on the plate, not the last thing that technically
   *  passes.
   *
   *  WHICH CELL is the search's answer, not a guess: it reads the area really under the word's own
   *  centre out of the same grid it placed the word with, whether that is the country's own class, a
   *  neighbour's, or open water. `placementsFor` carries the colour it decided in `onCell`, so the
   *  ink is derived from the same value the halo is struck in — and from the same `inkFor` the
   *  search refused an unreadable cell with. */
  const { inkFor } = rampFor(direction, subject);
  const wordsOf = (labels) => ({
    type: "FeatureCollection",
    features: labels.map((l) => ({
      type: "Feature",
      properties: {
        iso: l.iso,
        name: l.text,
        onCell: l.onCell,
        ink: inkFor(l.klass, l.onCell),
      },
      geometry: { type: "Point", coordinates: at([l.x, l.y]) },
    })),
  });
  const areaWords = (id, labels, register) =>
    words(id, wordsOf(labels), register, ["get", "ink"], ["get", "onCell"], AREA_HALO);

  /** A LEADER IS A LINE AND A DOT, drawn BEFORE the word it belongs to. A name in the sea beside its
   *  country is how an atlas has always handled a country too small to hold one, and the leader is
   *  what says which country it is. Its far end stops just under the word's descender, exactly where
   *  the SVG stopped it. */
  const led = placement.labels.filter((l) => l.from);
  const leaderLines = {
    type: "FeatureCollection",
    features: led.map((l) => ({
      type: "Feature",
      properties: { iso: l.iso },
      geometry: {
        type: "LineString",
        coordinates: [at([l.from.x, l.from.y]), at([l.x, l.y + (g.axisBand.descent + 1) / g.mapW])],
      },
    })),
  };
  const leaderDots = {
    type: "FeatureCollection",
    features: led.map((l) => ({
      type: "Feature",
      properties: { iso: l.iso },
      geometry: { type: "Point", coordinates: at([l.from.x, l.from.y]) },
    })),
  };
  /** THE FORM THE SEARCH COULD PLACE, not the longest one the beat asked for. The ladder is spent in
   *  the search — `Mer Méditerranée`, `Méditerranée`, `Médit.` — and which rung survived this camera
   *  is a measurement the plan now carries. */
  const seaNames = {
    type: "FeatureCollection",
    features: placement.waters.map((w) => ({
      type: "Feature",
      properties: { name: w.text },
      geometry: { type: "Point", coordinates: at([w.x, w.y]) },
    })),
  };
  const seat = seatOf(ODD_ONE);

  const hasValue = ["!=", ["get", "value"], null];
  return [
    {
      id: "classes",
      role: "study-area",
      type: "fill",
      data: studyAreas,
      paint: {
        "fill-color": [
          "case",
          hasValue,
          ["step", ["get", "value"], classFill(0), ...BREAKS.flatMap((b, i) => [b, classFill(i + 1)])],
          ["get", "inStudySet"],
          missingFill,
          landNoValue,
        ],
      },
    },
    {
      id: "borders",
      role: "study-border",
      type: "line",
      data: studyAreas,
      paint: {
        // An area with no value takes the coast step rather than the grid one — the same two inks,
        // chosen the same way, as the plate draws them.
        "line-color": ["case", hasValue, grid, coast],
        "line-width": direction.stroke.hairline,
      },
    },
    {
      id: "leaders",
      role: "place",
      type: "line",
      data: leaderLines,
      paint: { "line-color": coast, "line-width": direction.stroke.rule },
    },
    {
      id: "leader-dots",
      role: "place",
      type: "circle",
      data: leaderDots,
      paint: { "circle-radius": 1.8, "circle-color": mutedInk },
    },
    areaWords("named-areas", placement.labels.filter((l) => l.klass === "feature"), feature),
    areaWords("context-areas", placement.labels.filter((l) => l.klass === "area"), area),
    {
      ...words("sea-names", seaNames, waterReg, waterInk, seaTint, WATER_HALO, [0, WATER_OFFSET_EM]),
      role: "water",
    },
    /** LAST, SO IT IS ON TOP — the SVG drew it outside the clipped group for the same reason. */
    {
      id: "subject-ring",
      role: "subject",
      type: "circle",
      data: {
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            properties: { iso: ODD_ONE },
            geometry: { type: "Point", coordinates: at([seat.x, seat.y]) },
          },
        ],
      },
      /** ONE DEFINITION OF THE CIRCLE — `subjectRingOf`, which the placement search also reads, so
       *  the ring drawn here and the ground the subject's own word is kept off cannot drift. */
      paint: {
        "circle-radius": subjectRingOf(seat, g.mapW, direction).radius,
        "circle-opacity": 0,
        "circle-stroke-color": accentInk,
        "circle-stroke-width": subjectRingOf(seat, g.mapW, direction).stroke,
      },
    },
  ];
}

export {
  CAMERA_ASPECT,
  cameraFor,
  project,
  unproject,
  assertPlateShowsTheCamera,
  assertRoundingIsSubPixel,
};
