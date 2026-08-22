/**
 * THIS BEAT'S OWN RUNNER, in the shape `map-web/SKILL.md` states one takes: it reads this beat's
 * own frozen-derived data and its own plate, and hands its own component to the FORMAT's generic
 * `renderMapWeb`, which is unchanged. Nothing in this file edits the skill.
 *
 *   bun stories/stress-ab-emigration-flows/beats/1-where-the-routes-lead/render-web.mjs
 *
 * Writes `renders/where-the-routes-lead.html`, self-contained: the plate inlined once as a data
 * URI, MapLibre and the interaction script inlined, the MapTiler key left as the delivery's own
 * placeholder (R1b) so the committed file carries no credential.
 */
import { readFile, mkdir } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { renderMapWeb, KEY_PLACEHOLDER } from "../../../../skills/map-web/scripts/render-web.mjs";
import { readPalette } from "../../../../skills/palette/scripts/palette.mjs";
import { parseStoryboard } from "../../../../skills/storyboard/scripts/storyboard.mjs";
import { FlowMapWeb, RouteTable, MAX_RIBBON_UNITS, BOW, ARROW_MIN_UNITS, ARROW_MAX_UNITS } from "./FlowMapWeb.tsx";
import { angleAt, bowsFor, destinationsByArrivals, controlPoint, pointAt, samples, totalOf, unproject } from "./geo-flow.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const STORY = resolve(HERE, "../..");
const PLATE_DIR = join(HERE, "plate-1000");
const OUT_DIR = join(HERE, "renders");
const OUTPUT_NAME = "where-the-routes-lead.html";

/** How far each destination's and origin's own name hangs off its point, in fixed CSS pixels. The
 *  composition, decided by looking at the render: six Portuguese cities sit inside 120 frame units
 *  of each other and cannot all hang the same way. */
const LABEL_OFFSETS = {
  // The six Portuguese origins are NOT here: they are one anchored block (`FlowMapWeb`'s own
  // `fm-origins`), for the reason stated there.
  // The five destinations hang clear of the ribbon arriving at them: London above, the four
  // continental ones to the east, where no ribbon is.
  london: [-4, -24],
  brussels: [46, -10],
  luxembourg: [54, 0],
  paris: [42, 14],
  zurich: [42, 12],
  // The one direct annotation, on the widest ribbon's own midpoint.
  "lisboa--london": [-96, -6],
};

/** The subject the takeaway names in its second half — the destination that draws the most. */
const SUBJECT_KEY = "paris";
/** The ribbon whose figure is written on the map: the one the takeaway's first half names. */
const ANNOTATE_ROUTE_KEY = "lisboa--london";

const storyboard = parseStoryboard(await readFile(join(STORY, "STORYBOARD.md"), "utf8")).meta;
const language = storyboard.language;
const palette = readPalette(HERE, { stopAt: resolve(STORY, "..") });

const geometry = JSON.parse(await readFile(join(PLATE_DIR, "geometry.json"), "utf8"));
const plateBytes = await readFile(join(PLATE_DIR, "plate.png"));
const plate = `data:image/png;base64,${plateBytes.toString("base64")}`;
const routes = JSON.parse(await readFile(join(HERE, "routes.json"), "utf8"));
const places = JSON.parse(await readFile(join(HERE, "places.json"), "utf8"));

const placeByName = new Map(geometry.points.map((p) => [p.name, p]));

const total = totalOf(routes);
const destinations = destinationsByArrivals(routes);
// ONE bow table, read by the fallback SVG and the live GeoJSON alike — two tables would put the two
// layers visibly out of register the moment a reader panned.
const bows = bowsFor(routes);
const maxValue = Math.max(...routes.map((r) => r.value));

/**
 * ONE ARC, SEEN TWICE. The fallback SVG draws the quadratic in the plate's own frame units; the
 * live map needs the SAME curve as lon/lat. It is therefore sampled in frame units and unprojected
 * — never recomputed in degrees, which would bow by a different amount and leave the two layers
 * visibly out of register near the frame edges.
 */
function liveGeoJson() {
  return {
    type: "FeatureCollection",
    features: routes.map((route) => {
      const from = placeByName.get(route.origin);
      const to = placeByName.get(route.destination);
      const a = { x: from.px, y: from.py };
      const b = { x: to.px, y: to.py };
      const control = controlPoint(a, b, bows.get(route.key) ?? BOW);
      return {
        type: "Feature",
        properties: { key: route.key, value: route.value, w: (route.value / maxValue) * MAX_RIBBON_UNITS },
        geometry: {
          type: "LineString",
          coordinates: samples(a, control, b, 48).map((p) => unproject(geometry.frameCorners, geometry.frame, p)),
        },
      };
    }),
  };
}

/**
 * THE LIVE PLAN, WRITTEN HERE RATHER THAN BY `livePlan`.
 *
 * `map-web/scripts/render-web.mjs`'s own `livePlan` builds exactly one layer and it is a `circle`
 * layer for a proportional symbol — it reads `point.value`, calls `markLayers`, and derives a
 * `radius: "camera"` scale. A ribbon has no radius. `assets/live-map.mjs` DOES carry the generic
 * case ("no `radius` at all — `fill` and `line` layers (choropleth regions, hex bins, routes)"),
 * so the runtime supports this beat; only the plan BUILDER does not. This object is that plan,
 * in the shape `live-map.mjs` documents, and nothing in the skill is edited to produce it.
 *
 * The ribbon's own line-width is derived from the CAMERA the same way a symbol's radius is: the
 * ratio of the bake's ground scale to the live map's, so a ribbon covers the same piece of the
 * world at every container shape. `live-map.mjs` only applies that scaling to `radius: "camera"`
 * circle layers, so it is baked into the paint expression here as a zoom interpolation instead.
 */
function livePlanForRibbons() {
  const corners = geometry.frameCorners;
  const lons = geometry.points.map((p) => p.lon);
  const lats = geometry.points.map((p) => p.lat);
  const scaleAt = (zoom) => 2 ** (zoom - geometry.zoom);
  const widthExpression = [
    "interpolate", ["exponential", 2], ["zoom"],
    geometry.zoom - 2, ["*", ["get", "w"], scaleAt(geometry.zoom - 2)],
    geometry.zoom + 4, ["*", ["get", "w"], scaleAt(geometry.zoom + 4)],
  ];
  return {
    styleUrl: `https://api.maptiler.com/maps/${geometry.style}/style.json?key=${KEY_PLACEHOLDER}`,
    waterFill: "#12212e",
    frame: geometry.frame,
    degreesPerPixel: geometry.degreesPerPixel,
    metresPerPixel: geometry.metresPerPixel,
    bakeZoom: geometry.zoom,
    studyBounds: {
      west: Math.min(...lons), east: Math.max(...lons),
      south: Math.min(...lats), north: Math.max(...lats),
    },
    // A ribbon beat has no overlapping-marks separation to solve for, so the only derivation left
    // is the headroom the plate's own frame held over the study set. Kept explicit rather than
    // defaulted, because a reader who cannot move through the map is the defect ruling R1 named.
    minZoomHeadroom: 2,
    anchors: Object.fromEntries([
      ...geometry.points.map((p) => [p.key, [p.lon, p.lat]]),
      ...routes.map((route) => {
        const from = placeByName.get(route.origin);
        const to = placeByName.get(route.destination);
        const a = { x: from.px, y: from.py };
        const b = { x: to.px, y: to.py };
        const control = controlPoint(a, b, bows.get(route.key) ?? BOW);
        return [route.key, unproject(corners, geometry.frame, pointAt(a, control, b, 0.5))];
      }),
    ]),
    layers: [
      {
        id: "fm-casing",
        type: "line",
        data: liveGeoJson(),
        paint: {
          "line-color": palette.ground,
          "line-width": ["+", widthExpression, 5],
          "line-opacity": 0.9,
        },
        // The casing carries the same `key` as the ribbon over it, so letting it answer a hover
        // would be one reading arriving from two layers. The ribbon answers; the casing draws.
        hover: false,
      },
      {
        id: "fm-ribbons",
        type: "line",
        data: liveGeoJson(),
        // NO `line-cap` HERE, AND IT COST AN HOUR. `line-cap` is a MapLibre LAYOUT property, not a
        // paint one, and `live-map.mjs` copies only `layer.paint` into `addLayer` — there is no
        // `layout` in the plan vocabulary at all. Passing it as paint makes `addLayer` throw inside
        // the `style.load` handler, which aborts the whole handler: the basemap arrives, the map
        // goes live, the fallback is hidden, and NOT ONE RIBBON IS DRAWN. Nothing is logged. Found
        // by screenshotting the keyed page, not by any assertion. The live ribbons therefore have
        // butt caps where the fallback has round ones, which is the visible cost of this gap.
        paint: { "line-color": palette.accent, "line-width": widthExpression },
      },
      {
        id: "fm-arrowheads",
        type: "fill",
        data: arrowheadGeoJson(),
        paint: { "fill-color": palette.accent },
        // The head carries the ribbon's own key, so a hover landing on it would repeat the ribbon's
        // reading rather than say something new. The ribbon answers; the head points.
        hover: false,
      },
    ],
  };
}

/**
 * THE ARROWHEADS, AS GROUND POLYGONS — because the live layer has no other way to carry a direction.
 *
 * In the fallback the arrowhead is an SVG path rotated by the ribbon's own tangent. MapLibre's
 * equivalent is a `symbol` layer with `icon-image` and `symbol-placement`, and every one of those is
 * a LAYOUT property: `live-map.mjs`'s plan vocabulary has `paint` and nothing else, so a symbol
 * layer cannot be declared through it at all. Without this, the live map drew eight ribbons with no
 * direction — and this extract records DEPARTURES, so a ribbon without a direction is a link, and a
 * link invites a reader to see a balance that is not in the data.
 *
 * So the head is a real triangle on the ground: three corners computed in the plate's own frame
 * units, exactly where the SVG draws them, and unprojected. A ground polygon reprojects with the
 * camera, so it grows as the reader zooms in — which is right for a marker and would be wrong for
 * a value, and it is not a value.
 */
function arrowheadGeoJson() {
  return {
    type: "FeatureCollection",
    features: routes.map((route) => {
      const from = placeByName.get(route.origin);
      const to = placeByName.get(route.destination);
      const a = { x: from.px, y: from.py };
      const b = { x: to.px, y: to.py };
      const control = controlPoint(a, b, bows.get(route.key) ?? BOW);
      const tip = pointAt(a, control, b, 0.94);
      const width = (route.value / maxValue) * MAX_RIBBON_UNITS;
      const size = Math.min(ARROW_MAX_UNITS, Math.max(ARROW_MIN_UNITS, width * 0.85 + 6));
      const angle = (angleAt(a, control, b, 0.94) * Math.PI) / 180;
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      // The same triangle `FlowMapWeb`'s own `arrowHead` draws — tip at the origin, pointing along
      // +x, half-height 0.62 of its length — rotated into the frame and then unprojected.
      const corners = [[0, 0], [-size, -size * 0.62], [-size, size * 0.62]].map(([x, y]) =>
        unproject(geometry.frameCorners, geometry.frame, {
          x: tip.x + x * cos - y * sin,
          y: tip.y + x * sin + y * cos,
        }));
      return {
        type: "Feature",
        properties: { key: route.key },
        geometry: { type: "Polygon", coordinates: [[...corners, corners[0]]] },
      };
    }),
  };
}

await mkdir(OUT_DIR, { recursive: true });

const props = {
  title: "Eight recorded routes carried 54,500 people out of Portugal in 2025",
  source: `${storyboard.credit} · Buried Signals`,
  subject: "Lisboa to London is the widest single ribbon, at 18,400 people. Paris still takes more than London — 23,600 against 21,200 — because three routes end there.",
  // ONE caveat on the graphic — the limit the article itself states and the brief says belongs in
  // the delivered picture. The other three limits `STORYBOARD.md` records travel in `HANDOVER.md`,
  // where a reader who is deciding how to use the graphic will meet them; four lines of 11px grey
  // type under the map is a wall, and it cost this beat 130px of map.
  caveat: "Return flows are recorded separately and are not in this extract, so no ribbon is a net figure.",
  language,
  ground: palette.ground,
  accent: palette.accent,
  accents: palette.accents,
  plate,
  // `renderMapWeb` reads `geometry.points` for the filter vocabulary and hands it to the table, so
  // for this beat those points ARE the routes: the table is a table of routes, and the ribbons are
  // what a filter would have narrowed. The PLACES travel on their own prop, joined by name.
  // NO FILTER DIMENSION, DECLARED BY LEAVING IT OFF. This beat's only subsetting dimension would
  // be the destination, and 1-to-3 routes per destination is well under the floor
  // `map-web-discipline.md`'s "Filters" sets, so no filter is offered and no point carries a group.
  // This used to be impossible: the format read `.group` off every row unconditionally and threw a
  // `TypeError` naming nothing, so the beat invented a group, `"recorded route"`, purely to render
  // — and the invention shipped four dead `[data-group=…]` rules and a dead attribute on every
  // table row of the delivered page, with no control anywhere to work them.
  geometry: {
    frame: geometry.frame,
    points: routes.map((r) => ({ ...r, name: `${r.origin} to ${r.destination}` })),
  },
  routes,
  destinations,
  total,
  subjectKey: SUBJECT_KEY,
  annotateRouteKey: ANNOTATE_ROUTE_KEY,
  labelOffsets: LABEL_OFFSETS,
};

// The component wants the PROJECTED places, not the route rows `renderMapWeb` reads; hand it both.
const componentProps = { ...props, geometry: { frame: geometry.frame, points: geometry.points } };

const { outPath } = await renderMapWeb({
  component: (p) => FlowMapWeb({ ...componentProps, ...p, geometry: componentProps.geometry }),
  // BOTH READINGS, ONE TABLE. Each route's row also names the total arriving at its own
  // destination — the number no single ribbon can carry — so the thirteen marks this beat draws
  // (eight ribbons, five destination points) are all answered for by one disclosure.
  table: (p) => RouteTable({ points: routes, language, total, destinations, ...p }),
  props,
  outDir: OUT_DIR,
  name: OUTPUT_NAME,
  regionTable: true,
  tableRowNoun: "recorded routes",
  live: true,
  plan: livePlanForRibbons(),
});

console.log(`flow-map web beat → ${outPath}  [${routes.length} routes, ${places.length} places]`);
