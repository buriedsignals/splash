// EVERYTHING ONE DIRECTION'S RENDER IS HANDED, BUILT IN BUN — the words, the colours, the live map's plan and its
// two cameras, every overlay word placed on the map as it was MEASURED at each fixed camera, and the states. The
// runner renders what this returns; the tests read the same object, so what is asserted is what is drawn.
//
// The map is MapTiler's, drawn live under the overlay (`DirectedChoroplethVideo.tsx`). Where MapLibre puts a seat
// and what colour it paints under a box are not computed here: `measure.mjs` read them once on the real map and
// froze them in `measured.json`, with the digest of the plan they were read on. A plan that changed since is refused.
//
// Runs in Bun only.

import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { adjustToContrast, contrast, TEXT_CONTRAST_MIN } from "#shared/chart-beat/colour.mjs";
import { deriveFurniture } from "#shared/chart-beat/render-still.mjs";
import { sizeFor, videoExportSize } from "#shared/chart-video/sizes.mjs";
import { readDirection } from "#shared/design-base/read-direction.mjs";
import { registerOf } from "#shared/design-base/register.mjs";
import { resolveDirectionFamilies } from "#shared/design-base/resolve-families.mjs";
import { videoRegistersOf } from "../../skills/map-beat/scripts/video-registers.mjs";
import { loadSubject } from "../static-choropleth-europe-lowcarbon/beat.mjs";
import { DRAWN_WIDER, haloOf, layoutFor, mapRegistersOf, pillOf, SLOT_REGISTERS, widthOf } from "./layout.mjs";
import { camerasOf, mapPlanFor, SEATS } from "./map-plan.mjs";
import { planDigestOf } from "./measure.mjs";
import { placePills } from "./scene.mjs";
import { statesFor } from "./states.mjs";
import { CHOROPLETH_VIDEO_TIMING } from "./timing-contract.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
export const ROOT = join(HERE, "..", "..");
export const DIRECTIONS = join(ROOT, "docs", "design-base", "directions");
/** The size this run exports at — `--size`, landscape when nothing asks. R2 names three and
 *  everything under it already answered per size; only this line pinned the beat to one. */
export const SIZE = videoExportSize();
export const REGISTER_NAMES = ["display", "eyebrow", "body", "annot", "value", "axis"];
/** The registers the overlay draws with — `body` is resolved for the ladder's factor, never drawn; `water` sets the
 *  map's own sea names (`map-plan.mjs`), not an SVG word. */
export const DRAWN_REGISTERS = ["display", "eyebrow", "value", "axis", "area", "feature", "closeFeature", "source"];
const NB = "\u00A0";
/** The air a pill keeps from another pill and from the stage's edge, × the axis lead. */
const PILL_GAP = 0.25;
/** The order names are placed in: the subject, then its neighbours. */
const ROLE_PRIORITY = ["odd", "neighbour"];
/**
 * WHERE A NAME SITS WHEN ITS COUNTRY'S SEAT PUTS IT ON A NEIGHBOUR'S. At the video's floor FRANCE, centred on
 * France's seat, runs into SUISSE (measured on the first live stills): France's name moves west, still wholly on
 * France, and Switzerland's stays on its own small country.
 *
 * A LADDER, BECAUSE THE WORDS DO NOT SHRINK WITH THE FRAME — they grow. A narrower frame draws the same ground
 * across fewer pixels AND sets the map's own names larger (the type floor is 36 px at portrait and square against
 * 30 at landscape), so two names that clear each other at 1920 wide can be printed through one another at 1080.
 * Measured 2026-09-23: FRANCE and SUISSE stand 170 px apart on the landscape map and are 130 px wide, which
 * clears; at portrait they stand 129 px apart and are 156 px wide, and the still read « FRANSUISSE ».
 *
 * So the seat is chosen by measuring the words, not by taste: the first rung at which the name clears every other
 * name the map prints. Landscape takes the first rung — it is the seat already delivered — and nothing there
 * moves; the later rungs trade a little east–west room for north–south room, which is what a tall frame has.
 *
 * THE LAST TWO RUNGS ARE THE SQUARE FRAME'S. Once the map is fitted into the band the stacked square frame leaves
 * it (`layout.mjs`, `bandFor`), Europe is drawn some 10 % smaller and FRANCE runs into SUISSE at every rung that
 * cleared it before — measured 2026-09-24: 53 px of vertical separation at rung 2 against the 60 px the two boxes
 * need. East–west is no lever at this zoom: the word FRANCE is 170 px wide, which is 14° of longitude here, wider
 * than France. The two rungs added go SOUTH inside France — Haute-Garonne, then the Aude — where the same word
 * clears Switzerland by the height of its own band.
 */
const WORD_SEATS = Object.freeze({ FRA: [[0.2, 47.0], [0.2, 44.8], [0.5, 43.6], [1.2, 43.1], [1.8, 42.9]] });
/** A close-up gauge: its width at 100 %, its thickness and its air under the words, × the axis lead. */
const GAUGE_WIDTH = 5;
const GAUGE_HEIGHT = 0.3;
const GAUGE_GAP = 0.3;
/** A leader's least length and its dot's radius, × the axis lead; how many of its heights a led word may stand off. */
const LEADER_GAP = 0.3;
const LEADER_DOT = 0.1;
export const LED_REACH = 3;
/** A cell of Albania's land at the close-up: within this of the top class's fill in every channel — a region border
 *  or the coast drawn through a cell moves its mean by less. */
const ALBANIA_CELL = 16;
/** The step, in stage pixels, of the positions a close-up label is tried at. */
const CLOSE_STEP = 4;
/** How far down its own ladder the subject's close-up name walks before the arrangement is refused: 400 places on a
 *  4 px step is the whole of its own country and then some, and it bounds a search the other four multiply. */
const CLOSE_ANCHORS = 400;
/** How many genuinely different places a close-up name is tried at when an arrangement has to back up. */
const CLOSE_TRIES = 12;
/** The step, in stage pixels, of the positions the panel is tried at. */
const PANEL_STEP = 20;
/** The share of the panel's cells that may be land (the owner's rule for the panel, BRIEF.md). */
export const PANEL_LAND = 0.03;
/** Two measured cells are one colour when no channel differs by more than this — the tolerance of a cell's mean. */
const SAME_CELL = 3;
/** Two boxes share ground once `air` is counted around them. */
const touchingBoxes = (a, b, air) => a.x < b.x + b.width + air && b.x < a.x + a.width + air && a.y < b.y + b.height + air && b.y < a.y + a.height + air;
/**
 * SEATS IN THE OPEN ATLANTIC, OFF EVERY COAST THE WHOLE MAP SHOWS: the colour of the first cell the frame holds is
 * what « the sea » is, and everything that stands on the sea — the credit, the panel, the count — is placed by
 * comparing cells to it.
 *
 * A LADDER, BECAUSE A PROBE OUTSIDE THE FRAME READS THE EDGE. `[-30, 45]` is roughly 400 km west of the ground the
 * beat is about, which the landscape frame shows because it fits Europe by its HEIGHT and has width to spare. The
 * portrait and square frames fit the same ground by its WIDTH, so that longitude falls off the plate: measured
 * 2026-09-23 at 1080 × 1920 it projected to x = -8, `cellAt` clamped it to column 0, and the sea read as the land
 * tint at the frame's edge — after which every cell on the map was « not sea » and no place on earth seated the
 * panel. `[-15, 47]` is open North Atlantic INSIDE the bounds the whole-map camera holds at every size
 * (`BEAT.bounds`, -25..42 by 34..68), so one of the two is always on water the frame really paints.
 *
 * The order is the ladder: landscape takes the first and is arithmetically unchanged.
 */
export const ATLANTIC_PROBES = Object.freeze([
  { key: "atlantic", seat: Object.freeze([-30, 45]) },
  { key: "atlantic-inner", seat: Object.freeze([-15, 47]) },
]);
/** The pilot's three seas, named by the map itself (`render-directions-scrolly.mjs` at fdec7bbd, `WATERS`). */
export const WATERS = Object.freeze([
  { text: "Mer du Nord", seat: [3.0, 56.5] },
  { text: "Méditerranée", seat: [15.0, 36.0] },
  { text: "Baltique", seat: [19.5, 58.0] },
]);

/** ISO 3166-1 alpha-2, the code MapTiler Countries carries in `iso_a2`: the join key between the data and the
 *  basemap's own polygons. Copied from the scrolly pilot's runner (`proof/scrolly-choropleth-europe-lowcarbon/
 *  render-directions-scrolly.mjs` at fdec7bbd), where it is local. */
const ISO2 = {
  ALB: "AL", AUT: "AT", BLR: "BY", BEL: "BE", BIH: "BA", BGR: "BG", HRV: "HR", CYP: "CY", CZE: "CZ", DNK: "DK",
  EST: "EE", FIN: "FI", FRA: "FR", DEU: "DE", GRC: "GR", HUN: "HU", ISL: "IS", IRL: "IE", ITA: "IT", LVA: "LV",
  LTU: "LT", LUX: "LU", MLT: "MT", MDA: "MD", MNE: "ME", NLD: "NL", MKD: "MK", NOR: "NO", POL: "PL", PRT: "PT",
  ROU: "RO", RUS: "RU", SRB: "RS", SVK: "SK", SVN: "SI", ESP: "ES", SWE: "SE", CHE: "CH", TUR: "TR", UKR: "UA",
  GBR: "GB",
};
export const iso2Of = (iso) => {
  if (!ISO2[iso]) throw new Error(`no ISO A2 code recorded for ${iso} — the live map joins MapTiler Countries on it`);
  return ISO2[iso];
};

// ── the subject and its words ────────────────────────────────────────────────────────────────────────

/** Albania's ring-neighbours that carry no row in the frozen data — derived the way `loadSubject` derives the
 *  measured ones (a vertex within a tenth of a degree), on the raw rings, so Kosovo is found, not typed. Natural
 *  Earth keys Kosovo and Northern Cyprus both `-99`, so a feature with no code is keyed `-99:<name>`. */
export function unmeasuredNeighboursOf(subject, iso) {
  const { geo, value } = subject;
  const NEAR_DEGREES = 0.1;
  const keyOf = (f) => (f.properties.iso === "-99" ? `-99:${f.properties.name}` : f.properties.iso);
  const mine = geo.features.filter((f) => f.properties.iso === iso).flatMap((f) => f.geometry.coordinates.flat().flat());
  return geo.features
    .filter((f) => f.properties.iso !== iso && !value.has(f.properties.iso))
    .filter((f) => f.geometry.coordinates.flat().flat().some(([x, y]) => mine.some(([u, v]) => Math.abs(x - u) < NEAR_DEGREES && Math.abs(y - v) < NEAR_DEGREES)))
    .map((f) => ({ key: keyOf(f), name: f.properties.name }));
}

/** THE SEAT OF A COUNTRY, found as `seats.json` found the study set's (its provenance): the point of the largest ring
 *  farthest from its edge, on a 24 × 24 grid, the longitude shrunk by the latitude's cosine — and that distance, the
 *  seat's radius, in degrees of latitude. Kosovo is named at the close-up and has no frozen seat; Albania's radius is
 *  the ground no other close-up name may cover. */
export function interiorSeatOf(feature) {
  const area = (r) => Math.abs(r.reduce((s, [x, y], i) => s + x * r[(i + 1) % r.length][1] - r[(i + 1) % r.length][0] * y, 0)) / 2;
  const ring = feature.geometry.coordinates.map((poly) => poly[0]).sort((a, b) => area(b) - area(a))[0];
  const xs = ring.map((p) => p[0]);
  const ys = ring.map((p) => p[1]);
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const shrink = Math.cos((((y0 + y1) / 2) * Math.PI) / 180);
  const inside = (x, y) => {
    let hit = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [xi, yi] = ring[i];
      const [xj, yj] = ring[j];
      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) hit = !hit;
    }
    return hit;
  };
  const edgeDistance = (x, y) => {
    let best = Infinity;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [ax, ay] = [ring[j][0] * shrink, ring[j][1]];
      const [bx, by] = [ring[i][0] * shrink, ring[i][1]];
      const [px, py] = [x * shrink, y];
      const t = Math.max(0, Math.min(1, ((px - ax) * (bx - ax) + (py - ay) * (by - ay)) / ((bx - ax) ** 2 + (by - ay) ** 2 || 1)));
      best = Math.min(best, Math.hypot(px - ax - t * (bx - ax), py - ay - t * (by - ay)));
    }
    return best;
  };
  const N = 24;
  let seat = null;
  for (let i = 0; i < N; i++)
    for (let j = 0; j < N; j++) {
      const x = x0 + ((i + 0.5) / N) * (x1 - x0);
      const y = y0 + ((j + 0.5) / N) * (y1 - y0);
      if (!inside(x, y)) continue;
      const d = edgeDistance(x, y);
      if (!seat || d > seat.d) seat = { x, y, d };
    }
  if (!seat) throw new Error(`no interior point found for ${feature.properties.name}`);
  return { seat: [Math.round(seat.x * 1e4) / 1e4, Math.round(seat.y * 1e4) / 1e4], radius: seat.d };
}

export function loadBeat() {
  const subject = loadSubject({ dir: join(HERE, "..", "static-choropleth-europe-lowcarbon") });
  const copy = copyOf(subject);
  const kosovo = subject.geo.features.find((f) => f.properties.iso === "-99" && f.properties.name === copy.kosovo.name);
  /** Every seat the measurement reads: the study set's frozen seats, Kosovo's, and the Atlantic probes. */
  const mapSeats = { ...SEATS, [copy.kosovo.key]: interiorSeatOf(kosovo).seat, ...Object.fromEntries(ATLANTIC_PROBES.map((p) => [p.key, [...p.seat]])) };
  const states = statesFor(subject, SEATS);
  const albania = subject.geo.features.find((f) => f.properties.iso === subject.ODD_ONE);
  return { subject, states, copy, mapSeats, subjectRadius: interiorSeatOf(albania).radius };
}

export function copyOf(subject) {
  const { value, above, neighbours, BREAKS, french, ODD_ONE } = subject;
  const upper = (text) => text.toUpperCase();
  const pct = (v) => `${Math.round(v)}${NB}%`;
  const topSix = above.filter((r) => r.iso !== ODD_ONE).map((r) => r.iso);
  const kosovo = unmeasuredNeighboursOf(subject, ODD_ONE);
  if (kosovo.length !== 1 || kosovo[0].name !== "Kosovo")
    throw new Error(`the close-up names one unmeasured neighbour, Kosovo; the rings give ${JSON.stringify(kosovo)}`);
  /**
   * A CLOSE-UP NAME IS ONE LINE, AND STACKING IT WAS MEASURED AND REJECTED. « MACÉDOINE DU NORD · 41 % » is 678 px
   * wide on a square frame's close-up, which draws 1080, so the obvious rung was to set the place over its share and
   * halve the width. Measured 2026-09-24: it made the beat WORSE. A word is read on every cell it inks (`readsOn`),
   * and a stacked name inks a box one lead taller, which crosses one more country's fill — nocturne and rapport went
   * from a starved arrangement to no place at all for two of the four names, and creme from seated to refused.
   */
  const closeLines = (place, share) => [`${place} · ${share}`];
  const oddLines = closeLines(upper(french(ODD_ONE)), pct(value.get(ODD_ONE).lowCarbon));
  return {
    eyebrow: "Énergie · Europe",
    /** The scrolly's two shorter forms: the title card is read in a second and a half, and the story shows the rest. */
    title: [`Le bas-carbone européen est au nord-ouest — et en Albanie`, `Le bas-carbone européen, et son exception`],
    /** THE FLOOR'S STEPS: every reporting country, then how many stand at or above each borne in turn — the count
     *  alone; the cursor on the bornes says which share it is above. The last one is the claim, and it stays. */
    counterSteps: [`${value.size} pays`, ...BREAKS.map((b) => `${[...value.values()].filter((v) => v.lowCarbon >= b).length} pays`)],
    breaks: BREAKS.map((b) => `${b}${NB}%`),
    missingLabel: "sans donnée",
    /** EVERY FORM CARRIES THE ATTRIBUTION MAPTILER REQUIRES for a map drawn from its tiles; the data's credit is
     *  what shortens. The spec's form (« Source : Ember, via Our World in Data · © MapTiler © OpenStreetMap ») is
     *  1085 px wide at the type floor, 1296 px in Montserrat; the widest open sea the whole map leaves inside the
     *  margins, measured, is about 795 px (the Atlantic south of Iceland). The two shorter forms are PROVISIONAL,
     *  the widest that the measured sea holds, until the owner rules on the credit. */
    source: [
      "Source : Ember, via Our World in Data · © MapTiler © OpenStreetMap",
      "Ember, via OWID · © MapTiler © OpenStreetMap",
      "Ember · © MapTiler © OpenStreetMap",
    ].map((form) => form.replace(" · ", `${NB}· `)),
    /** THE OVERLAY'S WORDS: Albania beside its ring once the map is whole again, and the close-up's labels — Albania,
     *  its three measured neighbours with their shares, Kosovo without a row. The six are the map's own symbol
     *  layer (`top`). `klass` picks the ink's floor: 7:1 for a feature, 4.5:1 for an area. */
    names: [
      { key: `odd:${ODD_ONE}`, seat: ODD_ONE, role: "odd", camera: "overview", text: upper(french(ODD_ONE)), slot: "featureName", klass: "feature" },
      { key: `close:${ODD_ONE}`, seat: ODD_ONE, role: "odd", camera: "closeUp", lines: oddLines, text: oddLines.join(" "), slot: "oddName", klass: "feature" },
      ...neighbours.map((iso) => {
        const lines = closeLines(upper(french(iso)), pct(value.get(iso).lowCarbon));
        return { key: `neighbour:${iso}`, seat: iso, role: "neighbour", camera: "closeUp", lines, text: lines.join(" "), slot: "name", klass: "area" };
      }),
      { key: `neighbour:${kosovo[0].key}`, seat: kosovo[0].key, role: "neighbour", camera: "closeUp", lines: closeLines(upper("Kosovo,"), upper("hors données")), text: upper("Kosovo, hors données"), slot: "name", klass: "area" },
    ],
    /** The six the map names once the floor has landed, in capitals as every name of this video. */
    top: topSix.map((iso) => ({ iso, text: upper(french(iso)) })),
    waters: WATERS.map((w) => ({ text: w.text, seat: [...w.seat] })),
    kosovo: kosovo[0],
  };
}

/** The words each register sets — the families are resolved on these, the map's own words included. */
export function textPerRegisterOf(copy) {
  const bySlot = (slot) => copy.names.filter((n) => n.slot === slot).map((n) => n.text);
  return {
    display: copy.title.join(" "),
    eyebrow: copy.eyebrow,
    body: copy.source.join(" "),
    annot: copy.waters.map((w) => w.text).join(" "),
    value: `${copy.counterSteps.join(" ")} 0123456789 ${bySlot("oddName").join(" ")}`,
    axis: [...bySlot("name"), ...bySlot("featureName"), ...copy.top.map((t) => t.text), ...copy.waters.map((w) => w.text), ...copy.breaks, copy.missingLabel, ...copy.source].join(" "),
  };
}

// ── the measured map ─────────────────────────────────────────────────────────────────────────────────

const MEASURED = join(HERE, "measured.json");
let measuredCache = null;
/**
 * `measured.json`'s entry for THIS RUN'S SIZE, read once: what `measure.mjs` froze on the real map.
 *
 * KEYED BY SIZE, because the measurement is of a PICTURE and the picture changes with the frame. The file held one
 * 1920 × 1080 measurement, and every seat, every grid cell and every camera in it is a pixel of that frame; read on
 * a 1080 × 1920 one it puts the credit in the Alps. One file rather than three, so a beat still carries its
 * measurement beside itself and `no-key.live.test.ts` still has one path to check.
 */
export function readMeasured() {
  if (measuredCache) return measuredCache;
  if (!existsSync(MEASURED)) throw new Error("no measured.json beside the beat — run measure.mjs with the worktree's .env loaded");
  const all = JSON.parse(readFileSync(MEASURED, "utf8"));
  const row = all[SIZE];
  if (!row)
    throw new Error(
      `measured.json carries no ${SIZE} measurement (it holds ${Object.keys(all).join(", ") || "none"}) — ` +
        `run: set -a && . ./.env && set +a && bun proof/video-choropleth-europe-lowcarbon/measure.mjs --size ${SIZE}`,
    );
  measuredCache = row;
  return measuredCache;
}

/** The measured colour of the cell under a stage point. */
export const cellAt = (grid, x, y) => grid.colours[Math.min(grid.rows - 1, Math.max(0, Math.floor(y / grid.cell))) * grid.cols + Math.min(grid.cols - 1, Math.max(0, Math.floor(x / grid.cell)))];
/** Every measured colour a box covers. */
export const cellsOf = (grid, box) => {
  const out = new Set();
  for (let j = Math.max(0, Math.floor(box.y / grid.cell)); j <= Math.min(grid.rows - 1, Math.floor((box.y + box.height) / grid.cell)); j++)
    for (let i = Math.max(0, Math.floor(box.x / grid.cell)); i <= Math.min(grid.cols - 1, Math.floor((box.x + box.width) / grid.cell)); i++) out.add(grid.colours[j * grid.cols + i]);
  return [...out];
};
export const near = (a, b, tolerance = SAME_CELL) => [1, 3, 5].every((k) => Math.abs(Number.parseInt(a.slice(k, k + 2), 16) - Number.parseInt(b.slice(k, k + 2), 16)) <= tolerance);

/** A seat's radius, in degrees of latitude, as stage pixels at a zoom: Web Mercator stretches a degree of latitude by
 *  the secant of the latitude. */
export const subjectRadiusPx = (radius, lat, zoom) => (radius * (512 * 2 ** zoom)) / 360 / Math.cos((lat * Math.PI) / 180);

// ── one direction ────────────────────────────────────────────────────────────────────────────────────

/**
 * @param {string} id
 * @param {ReturnType<typeof loadBeat>} beat
 * @param {{ measured?: any }} [options]  `measured: null` builds the plan and cameras only — what `measure.mjs` reads.
 */
export function buildDirection(id, { subject, states, copy, mapSeats, subjectRadius }, { measured = readMeasured() } = {}) {
  const direction = resolveDirectionFamilies(readDirection(join(DIRECTIONS, `${id}.md`)), textPerRegisterOf(copy));
  const resolved = Object.fromEntries(REGISTER_NAMES.map((name) => [name, registerOf(direction, name)]));
  const scaled = videoRegistersOf(resolved, SIZE);
  const k = scaled.axis.fontSize / resolved.axis.fontSize;
  const layout = layoutFor({ registers: { ...scaled, ...mapRegistersOf(scaled, k) }, copy, size: SIZE, k });
  const registers = layout.registers;
  const { stage, inset, vInset, panel: panelLayout, band } = layout;
  const gap = PILL_GAP * registers.axis.lead;
  /** WHERE THE LIVE MAP STOPS: the ground band's top edge at square, the frame's own foot everywhere else. The map is
   *  still MOUNTED on the whole frame — the measurement is a picture of that frame and its seats are its pixels — so
   *  every seat below the floor is drawn under the band, and nothing of the overlay's may be placed there. */
  const mapFloor = band ? band.y : stage.height;
  const mapStage = { ...stage, height: mapFloor };

  // ── the live map: the pilot's plan, the video's cameras, the six and the seas named by the map ────────────
  const { whole, closeUp } = camerasOf(subject, SIZE, band?.mapBand ?? null);
  const cameras = { whole, closeUp };
  // THE MAP'S OWN NAMES, EACH ON THE FIRST SEAT OF ITS LADDER THAT CLEARS THE OTHERS, measured on the whole-map
  // camera in the register the map prints them in (`feature` — `mapPlanFor` hands MapLibre that face and size).
  // MapLibre centres a symbol on its seat, so a name's box is its measured width about the projected point and one
  // band of its register tall; two boxes clear when they are apart on either axis by the air a pill keeps.
  const worldX = (lon) => (lon + 180) / 360;
  const worldY = (lat) => (1 - Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360)) / Math.PI) / 2;
  const wholePx = 512 * 2 ** whole.camZoom;
  const boxOfWord = (text, seat) => {
    const width = widthOf(text, registers.feature) * (1 + DRAWN_WIDER);
    const band = haloOf(registers.feature, k);
    const height = registers.feature.lead + band;
    return {
      x: (worldX(seat[0]) - whole.camX) * wholePx + stage.width / 2 - width / 2,
      y: (worldY(seat[1]) - whole.camY) * wholePx + stage.height / 2 - height / 2,
      width,
      height,
    };
  };
  const fixedSeats = copy.top.filter((t) => !WORD_SEATS[t.iso]).map((t) => ({ text: t.text, box: boxOfWord(t.text, mapSeats[t.iso]) }));
  const seatOfTop = (t) => {
    const rungs = WORD_SEATS[t.iso];
    if (!rungs) return mapSeats[t.iso];
    // THE LANDSCAPE SEAT IS THE ONE THAT WAS DELIVERED, and it is not this work's to move. Measured 2026-09-23 the
    // shipped landscape prints FRANCE and SUISSE 8 px into one another at rung 0 — a real defect of a frame already
    // cut, and walking the ladder there would redraw it. The ladder is walked at the frames being ADDED, where the
    // overlap is 41 px and the words are unreadable rather than merely tight.
    if (SIZE === "landscape") return rungs[0];
    // No air: the measure is whether the map prints one name THROUGH another, not whether they stand handsomely
    // apart — two names a pixel apart are two names a reader can read.
    const clashesAt = (seat) => fixedSeats.filter((other) => touchingBoxes(boxOfWord(t.text, seat), other.box, 0)).map((other) => other.text);
    const clear = rungs.find((seat) => clashesAt(seat).length === 0);
    if (!clear)
      // The rung it fell to is named with the word it was printed through: a ladder that runs out says WHICH name it
      // could not clear, or the next rung is guesswork.
      throw new Error(
        `${id}: no seat on ${t.iso}'s ladder prints « ${t.text} » clear of the other names at ${SIZE} — ` +
          `the word is ${(widthOf(t.text, registers.feature) * (1 + DRAWN_WIDER)).toFixed(0)}px wide on a map that draws ` +
          `${stage.width}px of frame, and every rung runs into one: ` +
          rungs.map((seat) => `${seat.join(",")} → ${clashesAt(seat).join(", ")}`).join("; ") +
          `. Add a rung, or give the beat a shorter name.`,
      );
    return clear;
  };
  const words = {
    top: copy.top.map((t) => ({ iso2: iso2Of(t.iso), text: t.text, seat: seatOfTop(t) })),
    odd: { iso2: iso2Of(subject.ODD_ONE), text: copy.names.find((n) => n.key === `odd:${subject.ODD_ONE}`).text, seat: mapSeats[subject.ODD_ONE] },
    waters: copy.waters,
  };
  const mapPlan = mapPlanFor({ direction, registers, subject, cameras: camerasOf(subject, SIZE, band?.mapBand ?? null), iso2Of, words, size: SIZE });
  if (measured === null) return { props: { mapPlan, cameras } };
  if (measured.planDigest?.[id] !== planDigestOf(mapPlan)) throw new Error(`${id}: the plan changed since it was measured — run measure.mjs again`);
  if (measured.size.width !== stage.width || measured.size.height !== stage.height)
    throw new Error(`${id}: measured at ${measured.size.width}×${measured.size.height}, drawn at ${stage.width}×${stage.height}`);
  const m = measured.cameras[id];

  // ── colours: the map's own fills for the key, the measured sea under the words that stand on it ───────────
  const { ground, accent } = direction;
  const { muted } = deriveFurniture(ground);
  const layerOf = (layerId) => mapPlan.layers.find((l) => l.id === layerId);
  const classCount = subject.BREAKS.length + 1;
  const classFills = Array.from({ length: classCount }, (_, i) => {
    const layer = layerOf(`class-${i}`) ?? layerOf(`class-${i}-kept`);
    if (!layer) throw new Error(`the map plan draws no layer for class ${i}`);
    return layer.paint["fill-color"];
  });
  // THE SEA IS READ OFF THE FIRST PROBE THE FRAME HOLDS, AND IT HAS TO READ THE PLAN'S OWN WATER. `cellAt` clamps a
  // point outside the grid to its edge, so a probe the frame does not show answers with the frame's border instead
  // of refusing — which is how a whole portrait map once read as land. Checked against `mapPlan.tints.water`, the
  // colour the map was TOLD to paint, so a probe that lands on a coast, on a sea's own name or on a bathymetry band
  // is refused here rather than seating the credit on a shoreline.
  const water = mapPlan.tints.water;
  const inFrame = ([x, y]) => x >= 0 && y >= 0 && x < stage.width && y < stage.height;
  const probes = ATLANTIC_PROBES.map(({ key }) => ({ key, at: m.whole.projected[key] }));
  const probe = probes.find(({ at }) => at && inFrame(at) && cellAt(m.whole.grid, ...at) === water);
  if (!probe)
    throw new Error(
      `${id}: no Atlantic probe reads the plan's own sea ${water} on the ${stage.width}×${stage.height} frame — ` +
        probes.map(({ key, at }) => (!at ? `${key} has no measured seat` : !inFrame(at) ? `${key} projects to ${at.map((v) => v.toFixed(0)).join(",")}, off the frame` : `${key} reads ${cellAt(m.whole.grid, ...at)}`)).join("; ") +
        `. Add a seat on open water inside the ground the whole-map camera holds at every size.`,
    );
  const sea = cellAt(m.whole.grid, ...probe.at);
  const onGround = (colour) => {
    const walked = adjustToContrast(colour, ground, TEXT_CONTRAST_MIN);
    if (!walked) throw new Error(`no variant of ${colour} reads on ${ground}`);
    return walked;
  };
  const onSea = (colour) => {
    const walked = adjustToContrast(colour, sea, TEXT_CONTRAST_MIN);
    if (!walked) throw new Error(`no variant of ${colour} reads on the measured sea ${sea}`);
    return walked;
  };
  const colours = {
    ground,
    sea,
    classFills,
    missingFill: layerOf("missing").paint["fill-color"],
    ring: onGround(accent),
    /** The ground band's own fill, and what the blocks inside it are read against — absent where there is no band. */
    band: band ? ground : null,
    text: {
      eyebrow: onGround(registers.eyebrow.fill),
      title: onGround(registers.display.fill),
      // The count, the key and the credit stand on the sea, in their halo — or, where the frame stacks a band under
      // the map, on the direction's own ground, which is what a band is FOR: ink read off the page, not off water.
      counter: band ? onGround(accent) : onSea(accent),
      key: band ? onGround(muted) : onSea(muted),
      source: band ? onGround(muted) : onSea(muted),
    },
  };
  const strokes = { border: (direction.stroke?.hairline ?? 0.6) * k, ring: (direction.stroke?.rule ?? 1) * k };

  // ── Albania's ring, as the map draws it: a fixed piece of ground whose radius doubles per zoom level ──────
  const ring = layerOf("odd-ring").paint;
  const ringPxAt = (zoom) => ring["circle-radius"][4] * 2 ** zoom + ring["circle-stroke-width"];
  const seatAt = (measure, key) => {
    const at = measure.projected[key];
    if (!at) throw new Error(`${id}: no measured seat for ${key}`);
    return { x: at[0], y: at[1] };
  };

  // ── the credit, then the panel: seated on the measured map ─────────────────────────────────────────────
  // THE STORY RUNS ON THE WHOLE FRAME, so the count, the key and the credit sit OVER the map; their places are read on
  // the measured pictures they are seen over — the end of reveal (the floor up, the six named) and the picture the
  // video ends on (every class in, the six named, Albania ringed). A cell is SEA when it is the Atlantic's colour.
  const isSea = (c) => near(c, sea);
  const topFill = classFills[classCount - 1];
  const channels = (c) => [1, 3, 5].map((i) => Number.parseInt(c.slice(i, i + 2), 16));
  const distance = (a, b) => Math.hypot(...channels(a).map((v, i) => v - channels(b)[i]));
  /** A cell that shows one of the seven: nearer the top class's fill than the sea's. */
  const showsSeven = (c) => distance(c, topFill) < distance(c, sea);
  /** HOW MANY CELLS OF A KIND a box covers, in constant time: a summed-area table over the grid, one per question.
   *  The credit's search asks it of some fifty thousand boxes. */
  const countOf = (grid, kind) => {
    const { cols, rows } = grid;
    const sums = new Float64Array((cols + 1) * (rows + 1));
    for (let j = 0; j < rows; j++)
      for (let i = 0; i < cols; i++)
        sums[(j + 1) * (cols + 1) + i + 1] = (kind(grid.colours[j * cols + i]) ? 1 : 0) + sums[j * (cols + 1) + i + 1] + sums[(j + 1) * (cols + 1) + i] - sums[j * (cols + 1) + i];
    return (box) => {
      const i0 = Math.max(0, Math.floor(box.x / grid.cell));
      const i1 = Math.min(cols - 1, Math.floor((box.x + box.width) / grid.cell)) + 1;
      const j0 = Math.max(0, Math.floor(box.y / grid.cell));
      const j1 = Math.min(rows - 1, Math.floor((box.y + box.height) / grid.cell)) + 1;
      const at = (i, j) => sums[j * (cols + 1) + i];
      return { count: at(i1, j1) - at(i0, j1) - at(i1, j0) + at(i0, j0), total: (i1 - i0) * (j1 - j0) };
    };
  };
  const landIn = { whole: countOf(m.whole.grid, (c) => !isSea(c)), wholeFiltered: countOf(m.wholeFiltered.grid, (c) => !isSea(c)) };
  const sevenIn = { whole: countOf(m.whole.grid, showsSeven), wholeFiltered: countOf(m.wholeFiltered.grid, showsSeven) };
  // The margins the key is held inside — and, where the frame stacks a ground band under the map, the map's own
  // floor: a key seated over the band would be drawn under it.
  const insideMargins = (box) => box.x >= inset && box.y >= vInset && box.x + box.width <= stage.width - inset && box.y + box.height <= (band ? mapFloor - vInset : stage.height - vInset);
  const touches = touchingBoxes;
  const PANEL_AIR = PILL_GAP * registers.axis.lead;
  // THE PANEL, the owner's rule for it (BRIEF.md): hung under the credit — one block — when that place covers at most
  // `PANEL_LAND` of land and none of the seven's, in both pictures; otherwise the lowest place from the left margin
  // that does, clear of the credit. Its words stand in their halo, so a corner of coast under them still reads; open
  // sea wide enough for the key and the credit together is not on this map (measured: ~800 px of it, south of Iceland).
  const panelSeatedClearOf = (sourceBox) => {
    const panelFits = (box) =>
      insideMargins(box) &&
      !touches(box, sourceBox, PANEL_AIR) &&
      ["whole", "wholeFiltered"].every((picture) => {
        const land = landIn[picture](box);
        return land.count / land.total <= PANEL_LAND && sevenIn[picture](box).count === 0;
      });
    const under = { x: sourceBox.x, y: sourceBox.y + sourceBox.height + PANEL_AIR + 1e-6, width: panelLayout.width, height: panelLayout.height };
    if (panelFits(under)) return under;
    for (let y = (band ? mapFloor : stage.height) - vInset - panelLayout.height; y >= vInset; y -= PANEL_STEP)
      for (let x = inset; x + panelLayout.width <= stage.width - inset; x += PANEL_STEP) {
        const box = { x, y, width: panelLayout.width, height: panelLayout.height };
        if (panelFits(box)) return box;
      }
    return null;
  };
  // THE CREDIT ON THE OPEN SEA (spec §3.2: « posé sur l'eau et loin de tout mot »): every cell under it is sea, so it
  // crosses no coast, no country and no word of the map's — the longest form that finds a row, in the highest row
  // from the top-left, as the still's credit was.
  //
  // AND THE PANEL HAS TO FIT BESIDE THE CHOICE, WHICH IS WHY THIS IS ONE SEARCH AND NOT TWO. The credit used to be
  // seated greedily and the panel given whatever was left; at landscape the Atlantic is wide enough that the first
  // credit seat never cost the panel anything, so nothing showed. At portrait the map's open water is ONE band
  // across the sky — measured 2026-09-23, 832 × 272 px at 176,144 for all three directions — and the first credit
  // seat, the longest form at two lines, cut that band in half and left the panel 719 × 200 nowhere to stand. The
  // beat did not have a credit problem or a panel problem: it had a search that could not take back a choice. So a
  // credit seat is only ACCEPTED when the panel can still be seated clear of it, and the ladder — the forms, then
  // the rows, then the columns — steps until both stand. Landscape is unchanged by construction: its first seat
  // already admits the panel, so the first rung is still the one taken.
  let seated = null;
  let seenSea = false;
  // THE BAND SEATS THE CREDIT, AND NOTHING IS SEARCHED FOR IT. Where the frame stacks a band of ground under the map
  // (`layout.mjs`, `bandFor`), the credit is not looking for water: its place is the band's own, and its form is the
  // LONGEST the frame's line budget holds on one line rather than the shortest that fitted a sea — at square
  // « Ember, via OWID · © MapTiler © OpenStreetMap » rather than the bare « Ember · © MapTiler © OpenStreetMap ».
  // The key stands there too, over the credit: measured on the square map, no 719 × 200 block of it is 3 % land or
  // less, so the band carries both.
  if (band) {
    const form = layout.sources.find((f) => f.lines.length === 1) ?? layout.sources[0];
    seated = {
      form,
      box: { ...band.sourceAt, width: form.width, height: form.height },
      panelBox: { ...band.panelAt, width: panelLayout.width, height: panelLayout.height },
    };
  }
  for (const form of seated ? [] : layout.sources) {
    search: for (let y = vInset; y + form.height <= stage.height - vInset; y += PANEL_STEP / 4)
      for (let x = inset; x + form.width <= stage.width - inset; x += PANEL_STEP) {
        const box = { x, y, width: form.width, height: form.height };
        if (landIn.whole(box).count !== 0) continue;
        seenSea = true;
        const panelBox = panelSeatedClearOf(box);
        if (!panelBox) continue;
        seated = { form, box, panelBox };
        break search;
      }
    if (seated) break;
  }
  if (!seated)
    throw new Error(
      seenSea
        ? `${id}: no place inside the margins seats the ${panelLayout.width}×${panelLayout.height} panel over at most ${PANEL_LAND * 100} % land and none of the seven's, clear of any form of the credit that finds the open sea`
        : `${id}: no one-line form of the source (the shortest ${layout.sources.at(-1).width}×${layout.sources.at(-1).height}) finds the open sea on the whole map`,
    );
  const credit = { form: seated.form, box: seated.box };
  const sourceBox = seated.box;
  const panelBox = seated.panelBox;

  // ── the overlay's words, placed on the measured map ───────────────────────────────────────────────────────
  // THE CLOSE-UP'S GAUGES: every measured share at the close-up carries a bar under its words, all on ONE scale —
  // 0 to 100 % over the same width — with the floor the video raised notched on it. The gauge is part of its
  // name's pill, so the placement that keeps names apart keeps gauges apart.
  const gaugeWidth = GAUGE_WIDTH * registers.axis.lead;
  const gaugeHeight = GAUGE_HEIGHT * registers.axis.lead;
  /**
   * THE CLOSE-UP'S GAUGE IS THE 16:9 FRAME'S. It hangs under a name and adds a lead of height to the box the word
   * inks — and a word is read only where an ink reaches its floor on EVERY cell it inks (`readsOn`). At 1920 that
   * costs nothing. On the square frame the close-up's names are set at the 36 px floor rather than 30 and stand on a
   * map drawn 1080 px wide: measured 2026-09-24, nocturne's « MACÉDOINE DU NORD · 41 % » had 33 places in the whole
   * shot that read, against 115 for « KOSOVO, HORS DONNÉES », which carries no gauge and is a box one lead shorter.
   * So at a narrow frame the bar goes and the share stays where it already was — printed on the name itself, in the
   * data's own units, against the bornes the key prints. Nothing measured is dropped; one drawing of it is.
   */
  const gauged = SIZE === "landscape";
  const withGauge = (p) => {
    const pad = p.textX;
    /** What the word inks, inside its box: the text's band — every line of it — and the gauge's bar. `pillOf` pads
     *  the band equally top and bottom, so the inner box IS the band, at one line or at three. */
    const text = { x: pad, y: pad, width: p.textWidth, height: p.height - 2 * pad };
    if (!gauged || p.camera !== "closeUp" || !subject.value.has(p.seat)) return { ...p, gauge: null, inked: [text] };
    const y = p.height - pad + GAUGE_GAP * registers.axis.lead;
    const gauge = { x: pad, y, width: gaugeWidth, height: gaugeHeight, share: subject.value.get(p.seat).lowCarbon / 100, notch: subject.FLOOR / 100 };
    return {
      ...p,
      width: Math.max(p.width, gaugeWidth + 2 * pad),
      height: y + gaugeHeight + pad,
      gauge,
      inked: [text, { x: gauge.x, y: gauge.y, width: gauge.width, height: gauge.height }],
    };
  };
  // A map word has no pill: its box is the word and the halo's reach around it.
  /** A MAP WORD ON MORE THAN ONE LINE — `pillOf` sets exactly one, and a close-up name stacks at a narrow frame
   *  (`copyOf`, `closeLines`). Each line is laid out at the pill's own origin, left-aligned, one lead apart; the box
   *  is as wide as the widest line and as tall as the stack. One line gives back exactly what `pillOf` gave. */
  const stackedPillOf = (lines, r, pad) => {
    const parts = lines.map((line) => pillOf(line, r, pad));
    return {
      text: parts.map((q) => q.text).join(" "),
      textWidth: Math.max(...parts.map((q) => q.textWidth)),
      width: Math.max(...parts.map((q) => q.width)),
      height: parts[0].height + (parts.length - 1) * r.lead,
      textX: parts[0].textX,
      baseline: parts[0].baseline,
      lines: parts.map((q, i) => ({ text: q.text, width: q.textWidth, x: q.textX, y: q.baseline + i * r.lead })),
    };
  };
  const pills = copy.names
    .map((n) => {
      const r = registers[SLOT_REGISTERS[n.slot]];
      const halo = haloOf(r, k);
      return { ...n, register: SLOT_REGISTERS[n.slot], halo, ...stackedPillOf(n.lines ?? [n.text], r, halo / 2) };
    })
    .map(withGauge);
  /** The measured picture each camera's words are read on: the close-up, and the whole map the video ends on. */
  const measureOf = (camera) => (camera === "closeUp" ? m.closeUp : m.whole);
  // A WORD IS READ ON EVERY CELL IT INKS (the still's rule, `rampFor().inkFor`): the accent walked to 7:1 for a
  // feature, the muted ink to 4.5:1 for an area, against every colour the map measured under the word's text band
  // and its gauge's bar — not its halo's reach, which is struck in one colour of its own. Measured on nocturne's
  // close-up, the whole box refused all but five places within four heights of Kosovo's seat, all of them across the
  // Adriatic; the text band leaves hundreds. A position no ink reads on is refused. Albania's names are the
  // exception, as they were on the SVG map: set across its own fill and the land and sea around it, no one ink reads
  // on both, so the word is read on its halo, struck in the colour measured under the word's centre.
  const haloColourOf = (grid, box) => cellAt(grid, box.x + box.width / 2, box.y + box.height / 2);
  const cellsReadOn = (p, grid, box) =>
    p.role === "odd" ? [haloColourOf(grid, box)] : [...new Set(p.inked.flatMap((r) => cellsOf(grid, { x: box.x + r.x, y: box.y + r.y, width: r.width, height: r.height })))];
  const floorOf = (klass) => (klass === "feature" ? 7 : TEXT_CONTRAST_MIN);
  // Remembered colour by colour: the close-up's search asks the same question of thousands of neighbouring boxes.
  const walkedInks = new Map();
  const contrasts = new Map();
  const walkedOn = (klass, cell) => {
    const key = `${klass}${cell}`;
    if (!walkedInks.has(key)) walkedInks.set(key, adjustToContrast(klass === "feature" ? accent : muted, cell, floorOf(klass)));
    return walkedInks.get(key);
  };
  const contrastOf = (ink, cell) => {
    const key = `${ink}${cell}`;
    if (!contrasts.has(key)) contrasts.set(key, contrast(ink, cell));
    return contrasts.get(key);
  };
  const inkOn = (klass, cells) => {
    for (const cell of cells) {
      const ink = walkedOn(klass, cell);
      if (ink && cells.every((c) => contrastOf(ink, c) >= floorOf(klass) - 1e-9)) return ink;
    }
    return null;
  };
  const placed = {};
  const byPriority = (a, b) => ROLE_PRIORITY.indexOf(a.role) - ROLE_PRIORITY.indexOf(b.role);

  // THE CLOSE-UP: every label over its measured seat, or — THE STILL'S LEADER RULE — standing clear of it and led to
  // it by a line and a dot, up to `LED_REACH` of its heights off; no name but Albania's on the ground around Albania's
  // seat (its seat's radius). A neighbour's word is wider than its country and crosses its neighbours' fills: in
  // nocturne no ink reads on Kosovo's dark land and on the light classes around it at once, so « KOSOVO, HORS DONNÉES »
  // stands on one colour beside its seat, led to it.
  //
  // Every position on a `CLOSE_STEP` grid within reach of the seat is tried, as `placePills` weighs its own few: the
  // least moved from centred on the seat wins (across in half-widths, down in heights). The neighbours are placed in
  // the order that keeps them nearest their seats: every order of the names after Albania's is tried, and the one
  // whose names stand the least total distance off wins.
  const leaderGap = LEADER_GAP * registers.axis.lead;
  const albaniaClose = seatAt(m.closeUp, subject.ODD_ONE);
  const albaniaRadius = subjectRadiusPx(subjectRadius, mapSeats[subject.ODD_ONE][1], cameras.closeUp.camZoom);
  const albaniaBox = { x: albaniaClose.x - albaniaRadius, y: albaniaClose.y - albaniaRadius, width: 2 * albaniaRadius, height: 2 * albaniaRadius };
  /** How far a box stands off a point: 0 when the point is inside it. */
  const offSeat = (box, seat) => Math.hypot(Math.max(box.x - seat.x, 0, seat.x - box.x - box.width), Math.max(box.y - seat.y, 0, seat.y - box.y - box.height));
  /** Over its seat, or clear of it by a leader's gap: a word just off its seat, with no room for a leader, names nothing. */
  const seatedOrLed = (box, seat) => offSeat(box, seat) === 0 || seat.x < box.x - leaderGap || seat.x > box.x + box.width + leaderGap || seat.y < box.y - leaderGap || seat.y > box.y + box.height + leaderGap;
  /** Whether an ink reads on every cell a word inks at `box` — remembered by the cells its inked rectangles span, which
   *  thousands of neighbouring positions share. */
  const reads = new Map();
  const readsOn = (camera) => (box, key) => {
    const p = pills.find((q) => q.key === key);
    const { grid } = measureOf(camera);
    const span = p.role === "odd" ? [Math.floor((box.x + box.width / 2) / grid.cell), Math.floor((box.y + box.height / 2) / grid.cell)] : p.inked.flatMap((r) => [Math.floor((box.x + r.x) / grid.cell), Math.floor((box.x + r.x + r.width) / grid.cell), Math.floor((box.y + r.y) / grid.cell), Math.floor((box.y + r.y + r.height) / grid.cell)]);
    const memo = `${camera}|${key}|${span.join()}`;
    if (!reads.has(memo)) reads.set(memo, inkOn(p.klass, cellsReadOn(p, grid, box)) !== null);
    return reads.get(memo);
  };
  // A LEADER DOES NOT CROSS ALBANIA: a line from North Macedonia's seat drawn over Albania to a word across the
  // Adriatic names Albania as much as North Macedonia. Albania is the one country of the top class the close-up
  // shows, so its land is every cell measured in that class's fill.
  const albaniaPill = pills.find((p) => p.camera === "closeUp" && p.role === "odd");
  const albaniaLabel = { x: albaniaClose.x - albaniaPill.width / 2, y: albaniaClose.y - albaniaPill.height / 2, width: albaniaPill.width, height: albaniaPill.height };
  const LEADER_SAMPLES = 32;
  const leaderClear = (box, seat) => {
    const to = { x: Math.min(Math.max(seat.x, box.x), box.x + box.width), y: Math.min(Math.max(seat.y, box.y), box.y + box.height) };
    for (let i = 0; i <= LEADER_SAMPLES; i++) {
      const point = { x: seat.x + ((to.x - seat.x) * i) / LEADER_SAMPLES, y: seat.y + ((to.y - seat.y) * i) / LEADER_SAMPLES, width: 0, height: 0 };
      if (touches(point, albaniaLabel, 0) || near(cellAt(m.closeUp.grid, point.x, point.y), topFill, ALBANIA_CELL)) return false;
    }
    return true;
  };
  /**
   * THE REACH IS A LADDER TOO. `LED_REACH` was one number, and at 16:9 it is the right one: three of a word's own
   * heights off its seat is as far as a leader runs before the line names less than the word does. On the square
   * frame the close-up is fitted into the band the ground band leaves it (`layout.mjs`, `bandFor`), and nocturne's
   * inks cut the places that READ there to 33 for « MACÉDOINE DU NORD » and 115 for « KOSOVO, HORS DONNÉES », every
   * one of them within two boxes of the others — so no arrangement exists at three heights, however the search
   * backs up. The reach steps instead: three heights, then four, then five, the first rung that seats every name
   * wins, and a frame that seated them at three still does. Landscape breaks out at the first rung and is unchanged.
   */
  const REACH_LADDER = [LED_REACH, LED_REACH + 1, LED_REACH + 2];
  const candidatesAt = (reachFactor) => {
    const found = pills
    .filter((p) => p.camera === "closeUp")
    .sort(byPriority)
    .map((p) => {
      const seat = seatAt(m.closeUp, p.seat);
      const reach = p.role === "odd" ? 0 : reachFactor * p.height;
      const positions = [];
      for (let y = seat.y - p.height - reach; y <= seat.y + reach; y += CLOSE_STEP)
        for (let x = seat.x - p.width - reach; x <= seat.x + reach; x += CLOSE_STEP) {
          const box = { x, y, width: p.width, height: p.height };
          if (box.x < gap || box.y < gap || box.x + box.width > stage.width - gap || box.y + box.height > mapFloor - gap) continue;
          const off = offSeat(box, seat);
          if (off > reach) continue;
          if (p.role !== "odd" && (touches(box, albaniaBox, gap) || !seatedOrLed(box, seat) || (off > 0 && !leaderClear(box, seat)))) continue;
          if (!readsOn("closeUp")(box, p.key)) continue;
          positions.push({ box, off, moved: Math.hypot((x + p.width / 2 - seat.x) / (p.width / 2), (y + p.height / 2 - seat.y) / p.height) });
        }
      // Albania's own name: centred on its seat, the ring around it.
      if (p.role === "odd") positions.push({ box: { x: seat.x - p.width / 2, y: seat.y - p.height / 2, width: p.width, height: p.height }, off: 0, moved: 0 });
      // No place at this rung is not a refusal: the ladder below steps the reach and asks again.
      if (!positions.length) return null;
      positions.sort((u, v) => u.moved - v.moved);
      /** THE PLACES THIS NAME IS ACTUALLY BACKED UP TO: its least moved first, then places at least half a box off
       *  every one already kept. On a 4 px step a name has thousands of positions that are the SAME arrangement to
       *  a reader, and backing up through them is a search that never moves — nocturne's MKD had 33 places and all
       *  of them lay inside two boxes of each other. */
      const tries = [];
      for (const c of positions) {
        if (tries.length >= CLOSE_TRIES) break;
        if (tries.some((o) => Math.abs(o.box.x - c.box.x) < p.width / 2 && Math.abs(o.box.y - c.box.y) < p.height / 2)) continue;
        tries.push(c);
      }
      return { key: p.key, positions, tries };
      });
    return found.some((c) => c === null) ? null : found;
  };
  const orders = (list) => (list.length <= 1 ? [list] : list.flatMap((x, i) => orders([...list.slice(0, i), ...list.slice(i + 1)]).map((o) => [x, ...o])));
  /**
   * AN ARRANGEMENT THAT BACKS UP. Each name used to take its least-moved free place and never reconsider it, so one
   * name standing where it liked refused the whole close-up — which is what « no order places them all » meant while
   * every name still held thousands of free places of its own. The greedy place is still tried FIRST at every level,
   * so a frame that placed its names before places them identically now; the other tries are only reached once the
   * greedy chain has failed.
   */
  const placeRest = (items, boxes) => {
    if (!items.length) return [];
    const [item, ...more] = items;
    const free = (c) => !boxes.some((b) => touches(c.box, b, gap));
    const greedy = item.positions.find(free);
    if (!greedy) return null;
    for (const c of [greedy, ...item.tries.filter((t) => t !== greedy && free(t))].slice(0, CLOSE_TRIES)) {
      const rest = placeRest(more, [...boxes, c.box]);
      if (rest) return [c, ...rest];
    }
    return null;
  };
  let best = null;
  /** The last rung actually asked, for the refusal's arithmetic. */
  let asked = null;
  for (const reachFactor of REACH_LADDER) {
    const closeCandidates = candidatesAt(reachFactor);
    if (!closeCandidates) continue;
    asked = { reachFactor, closeCandidates };
    const [first, ...rest] = closeCandidates;
    /** THE SUBJECT'S NAME IS ON A LADDER TOO — until 2026-09-24 it was the one name pinned, fixed at its least-moved
     *  place while every order of the other four was tried around it. It walks its own places now, least moved
     *  first, and the first that admits an arrangement wins; landscape's first place already admits one. */
    for (const anchor of first.positions.slice(0, CLOSE_ANCHORS)) {
      for (const order of orders(rest)) {
        const found = placeRest(order, [anchor.box]);
        if (!found) continue;
        const boxes = [anchor.box, ...found.map((c) => c.box)];
        const off = found.reduce((sum, c) => sum + c.off, 0);
        if (off < (best?.off ?? Infinity) - 1e-9) best = { off, boxes: Object.fromEntries([first, ...order].map((item, i) => [item.key, { x: boxes[i].x, y: boxes[i].y }])) };
      }
      if (best) break;
    }
    if (best) break;
  }
  // Which names, and how much room each had at the last rung asked: an order that fails says nothing on its own, and
  // the next move — one more rung of reach, or one name fewer — depends on whether one name is starved or all are.
  if (!best)
    throw new Error(
      !asked
        ? `${id}: no place at any rung of the reach reads every close-up name on the ${stage.width}×${mapFloor.toFixed(0)} map`
        : `${id}: no order of the close-up's names places them all on the ${stage.width}×${mapFloor.toFixed(0)} map at ` +
          `${asked.reachFactor} heights of reach — ` +
          asked.closeCandidates.map((c) => `${c.key} has ${c.positions.length} place(s)`).join(", "),
    );
  Object.assign(placed, best.boxes);

  // THE WHOLE MAP: Albania's name beside its ring, the ring kept clear, and so the panel and the credit.
  const albaniaWhole = seatAt(m.whole, subject.ODD_ONE);
  const wholeRing = ringPxAt(cameras.whole.camZoom);
  const wholeRingBox = { x: albaniaWhole.x - wholeRing, y: albaniaWhole.y - wholeRing, width: 2 * wholeRing, height: 2 * wholeRing };
  const overviewItems = pills
    .filter((p) => p.camera === "overview")
    .map((p) => {
      const at = seatAt(m.whole, p.seat);
      return { key: p.key, cx: at.x, cy: at.y, width: p.width, height: p.height, avoid: [], slack: wholeRing, beside: 0 };
    });
  Object.assign(placed, placePills(overviewItems, mapStage, gap, { obstacles: [wholeRingBox, panelBox, sourceBox], allowed: readsOn("overview") }));

  /** A LEADER, AS THE STILL DRAWS ONE: a word set beside its seat says which country it names with a line from the
   *  seat — a dot on it — to the word's box. Albania's name at the whole map leads from its ring instead, no dot. */
  const leaderOf = (p, at, seat) => {
    const box = { x: at.x, y: at.y, width: p.width, height: p.height };
    if (seat.x >= box.x && seat.x <= box.x + box.width && seat.y >= box.y && seat.y <= box.y + box.height) return null;
    const to = { x: Math.min(Math.max(seat.x, box.x), box.x + box.width), y: Math.min(Math.max(seat.y, box.y), box.y + box.height) };
    if (p.camera === "closeUp") return p.role === "odd" ? null : { from: seat, to, dot: LEADER_DOT * registers.axis.lead };
    const length = Math.hypot(to.x - seat.x, to.y - seat.y);
    if (length <= wholeRing) return null;
    return { from: { x: seat.x + ((to.x - seat.x) * wholeRing) / length, y: seat.y + ((to.y - seat.y) * wholeRing) / length }, to, dot: 0 };
  };
  const names = pills.map(({ slot, klass, ...p }) => {
    const at = placed[p.key];
    const measure = measureOf(p.camera);
    const box = { ...at, width: p.width, height: p.height };
    const cells = cellsReadOn(p, measure.grid, box);
    const ink = inkOn(klass, cells);
    if (!ink) throw new Error(`${id}: ${p.text} lands where no ${klass} ink reaches ${floorOf(klass)}:1 against ${cells.join(" and ")}`);
    const seat = seatAt(measure, p.seat);
    // The halo is struck in the colour measured under the word's centre.
    return { ...p, klass, seat, ...at, ink, haloColour: haloColourOf(measure.grid, box), leader: leaderOf(p, at, seat) };
  });

  const strokeScale = sizeFor(SIZE).typeScale;
  const props = {
    frame: layout.frame,
    stage,
    /** The ground band under the map at square — `null` at a frame that seats its furniture on the map's own water. */
    band,
    /** The frame's margins — what the panel and the credit are held inside. */
    layoutInset: { x: inset, y: vInset },
    registers: Object.fromEntries(DRAWN_REGISTERS.map((name) => [name, registers[name]])),
    titleCard: layout.titleCard,
    source: { ...credit.form, at: { x: sourceBox.x, y: sourceBox.y } },
    panel: { ...panelLayout, at: { x: panelBox.x, y: panelBox.y } },
    colours,
    strokes,
    names,
    cameras,
    mapPlan,
    states,
    timing: CHOROPLETH_VIDEO_TIMING,
  };
  return {
    id,
    direction,
    layout,
    props,
    report: { k, strokeScale, titleForm: layout.titleCard.form, titleSize: layout.titleCard.register.fontSize, titleLines: layout.titleCard.title.length, sourceForm: credit.form.form, sourceText: credit.form.lines[0].text, stage, panel: panelBox, source: sourceBox },
  };
}
