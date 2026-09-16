// THE CHOROPLETH VIDEO AS A MAP PLAN — the scrolly pilot's own plan (`plan.mjs`, copied), given the video's
// cameras, colours and faces. The frame drives it as the scroll drives the pilot: a camera in Mercator numbers
// and the bound fields `classes`, `filter`, `top`, `zoom`, `odd` (`scene.mjs`, `mapStateAt`).

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { adjustToContrast, mix, TEXT_CONTRAST_MIN } from "#shared/chart-beat/colour.mjs";
import { deriveFurniture } from "#shared/chart-beat/render-still.mjs";
import { maptilerFace } from "#shared/map-beat/glyphs.mjs";
import { cameraFields, viewOf } from "#shared/map-beat/scrolly.mjs";
import { plateTints, WATER_HUE } from "#shared/map-beat/tints.mjs";
import { BEAT } from "../static-choropleth-europe-lowcarbon/bake.mjs";
import { arrived, choroplethPlan, LAYER, LEVEL } from "./plan.mjs";

export const REFERENCE = Object.freeze({ width: 1920, height: 1080 });
export const MAP_FIELDS = Object.freeze(["classes", "filter", "top", "zoom", "odd"]);
/** The static plate's frame the whole-map camera fits (`geometry.mjs`'s FRAME). */
const FRAME = { width: 1000, height: 760 };
const CLOSE_UP_ZOOM = 2.3;

export const SEATS = JSON.parse(readFileSync(join(import.meta.dir, "seats.json"), "utf8")).seats;

const worldX = (lon) => (lon + 180) / 360;
const worldY = (lat) => (1 - Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360)) / Math.PI) / 2;
const latOfWorldY = (y) => (2 * Math.atan(Math.exp((1 - 2 * y) * Math.PI)) * 180) / Math.PI - 90;

export function camerasOf(subject) {
  const [[west, south], [east, north]] = BEAT.bounds;
  const frameWorldPx = Math.min(FRAME.width / (worldX(east) - worldX(west)), FRAME.height / (worldY(south) - worldY(north)));
  // THE STATIC PLATE'S FIT, at the video's size: its bounds fitted into its frame, that frame fitted "meet" into the
  // reference stage — by the tighter of its two ratios, as `zoomShiftFor` fits the pilot's reference ground on both
  // axes — centred on the bounds' Mercator middle. Fitted by the width alone, the 1000 × 760 frame stood 1459 px
  // tall on a 1080 px stage and the whole map lost a quarter of its height.
  const zoom = Math.log2((frameWorldPx * Math.min(REFERENCE.width / FRAME.width, REFERENCE.height / FRAME.height)) / 512);
  const center = [(west + east) / 2, latOfWorldY((worldY(south) + worldY(north)) / 2)];
  return { whole: cameraFields({ center, zoom }), closeUp: cameraFields({ center: SEATS[subject.ODD_ONE], zoom: zoom + CLOSE_UP_ZOOM }), frameWorldPx };
}

export function mapPlanFor({ direction, registers, subject, cameras, iso2Of, words }) {
  const { ink, grid } = deriveFurniture(direction.ground);
  const tints = plateTints(direction);
  const classCount = subject.BREAKS.length + 1;
  const low = mix(direction.accent, direction.ground, 0.88);
  const high = mix(direction.accent, ink, 0.3);
  const classFills = Array.from({ length: classCount }, (_, i) => mix(low, high, i / (classCount - 1)));
  const trackingEm = (r) => Number.parseFloat(r.letterSpacing ?? "0") / Number.parseFloat(r.fontSize);
  const shares = Object.fromEntries([...subject.studySet].map((iso) => [iso2Of(iso), subject.value.get(iso)?.lowCarbon ?? null]));
  const plan = choroplethPlan({
    tints: { water: tints.water, land: tints.land },
    classFills,
    missingFill: mix(direction.ground, ink, 0.13),
    border: { studied: grid, other: mix(tints.land, grid, 0.4), width: direction.stroke?.hairline ?? 0.6 },
    shares,
    breaks: subject.BREAKS,
    top: subject.above.map((r) => iso2Of(r.iso)),
    odd: words.odd,
    neighbours: [],
    missing: subject.unreported.map((u) => ({ iso2: iso2Of(u.iso) })),
    waters: words.waters,
    words: { top: words.top },
    cameras: [cameras.whole, cameras.closeUp],
    statesForCards: [],
    fonts: {
      axis: maptilerFace(registers.feature),
      axisSize: registers.feature.fontSize,
      axisTracking: trackingEm(registers.feature),
      annot: maptilerFace(registers.water),
      annotSize: registers.water.fontSize,
      annotTracking: trackingEm(registers.water),
      ink: adjustToContrast(ink, direction.ground, TEXT_CONTRAST_MIN) ?? ink,
      accentInk: adjustToContrast(direction.accent, direction.ground, TEXT_CONTRAST_MIN) ?? direction.accent,
      waterInk: adjustToContrast(WATER_HUE, tints.water, TEXT_CONTRAST_MIN) ?? ink,
      topInk: adjustToContrast(direction.accent, classFills[classCount - 1], 7) ?? deriveFurniture(classFills[classCount - 1]).ink,
      topHalo: classFills[classCount - 1],
    },
    referenceWidth: REFERENCE.width,
    referenceHeight: REFERENCE.height,
    ringDegrees: (22 * 360) / cameras.frameWorldPx,
  });
  // A CAMERA THAT FOCUSES ON A COUNTRY SHOWS ITS REGIONS' BORDERS (the video rule): Countries' level-1 units,
  // secondary to the national border, beneath the water, arriving with the close-up.
  const countries = plan.layers.find((l) => l.id === "borders").source;
  const regions = {
    id: "regions",
    type: "line",
    beneath: "water",
    source: countries,
    sourceLayer: LAYER,
    filter: ["==", ["get", LEVEL], 1],
    paint: { "line-color": grid, "line-width": 0.5 * (direction.stroke?.hairline ?? 0.6), "line-opacity": 0 },
    bindings: { "line-opacity": arrived },
  };
  // THE FLOOR RISES CLASS BY CLASS (the video's gesture, BRIEF.md): the cursor travels the key borne by borne and
  // each class steps back to bare land once the cursor has passed its upper borne, the lowest first — as the key's
  // swatches do (`scene.mjs`). The pilot's plan steps every class under the floor back together, over one scroll.
  const cursor = ["*", { $state: "filter" }, classCount - 1];
  const floorRises = (layer) => {
    const match = /^class-(\d+)(-small)?$/.exec(layer.id);
    if (!match) return layer;
    const reached = layer.bindings["fill-opacity"][1];
    const passed = ["max", 0, ["min", 1, ["-", cursor, Number(match[1])]]];
    return { ...layer, bindings: { "fill-opacity": ["*", reached, ["-", 1, passed]] } };
  };
  const layers = plan.layers.map(floorRises);
  const at = layers.findIndex((l) => l.id === "borders");
  return { ...plan, layers: [...layers.slice(0, at), regions, ...layers.slice(at)], camera: { view: viewOf(cameras.whole) } };
}
