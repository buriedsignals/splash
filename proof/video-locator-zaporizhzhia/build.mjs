// EVERYTHING ONE DIRECTION'S RENDER IS HANDED, BUILT IN BUN — the words, the live map's plan and its two cameras, every
// name placed on the MEASURED close-up, the station's block, the credit, the colours and the states.
//
// The map is MapTiler's, drawn live under the overlay (`DirectedLocatorVideo.tsx`). What the map paints under a box is not
// computed here: `measure.mjs` read it once on the real map and froze it in `measured.json`, with the digest of the plan
// it was read on. A plan that changed since is refused.
//
// Runs in Bun only.

import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { adjustToContrast, contrast, mix, NON_TEXT_CONTRAST_MIN, TEXT_CONTRAST_MIN } from "#shared/chart-beat/colour.mjs";
import { deriveFurniture } from "#shared/chart-beat/render-still.mjs";
import { frameInsetFor, sizeFor, videoExportSize } from "#shared/chart-video/sizes.mjs";
import { readDirection } from "#shared/design-base/read-direction.mjs";
import { EYEBROW_TO_DISPLAY, registerOf } from "#shared/design-base/register.mjs";
import { resolveDirectionFamilies } from "#shared/design-base/resolve-families.mjs";
import { plateTints, WATER_HUE } from "#shared/map-beat/tints.mjs";
import { applyCase } from "../../skills/map-beat/scripts/registers.mjs";
import { BAND_PROBE, bandOf, CREDIT_ONE_LINE, haloOf, pillOf, sourceCreditFor, titleCardFor, verticalInsetFor, widthOf } from "../../skills/map-beat/scripts/shots.mjs";
import { videoRegistersOf } from "../../skills/map-beat/scripts/video-registers.mjs";
import { placePills } from "../video-choropleth-europe-lowcarbon/scene.mjs";
import { camerasOf, mapPlanFor, mapSeatsOf, projectorOf, unprojectorOf, withNames } from "./map-plan.mjs";
import { planDigestOf } from "./measure.mjs";
import { statesFor } from "./states.mjs";
import { AREAS, EUROPE_WINDOW, FRENCH_COUNTRY, FRENCH_PLACE, loadSubject, WATERS } from "./subject.mjs";
import { LOCATOR_VIDEO_TIMING } from "./timing-contract.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
export const ROOT = join(HERE, "..", "..");
export const DIRECTIONS = join(ROOT, "docs", "design-base", "directions");
/** The size this run exports at — `--size`, landscape when nothing asks. R2 names three and
 *  everything under it already answered per size; only this line pinned the beat to one. */
export const SIZE = videoExportSize();
export const REGISTER_NAMES = ["display", "eyebrow", "body", "annot", "value", "axis"];
const NB = "\u00A0";
/** The station's ring, in stage px: on the continent, and closed on the station. */
export const RING_FAR = 40;
export const RING_NEAR = 22;
/** A region's border, × a national border's width. */
export const REGION_WIDTH = 0.6;
/** The air kept around the station's block, × the axis lead. */
export const STATION_AIR = 0.5;
const SEAT_STEP = 10;
/** The sea probes, in order: each is a seat `measure.mjs` projects on the real map, and the first that lands
 *  inside the frame on the plan's water tint says what the sea IS. */
const SEA_PROBES = ["sea"];
/** Two measured cells are one colour when no channel differs by more than this — the tolerance of a cell's mean. */
const SAME_CELL = 3;
/** The air the ground band keeps between the map's floor and the credit's own block, × the axis lead — the same
 *  quarter lead every other pair of blocks in this beat is held apart by. */
const BAND_AIR = 0.25;
/** The least share of the frame the live map may be left with once the band has taken its room — the static twin's
 *  `MIN_MAP_SHARE` (`proof/static-choropleth-europe-lowcarbon/DirectedChoroplethMap.tsx`) and its reasoning: below a
 *  third the map stops being the largest single thing in the frame and the beat is a caption with an illustration. */
const MIN_MAP_SHARE = 1 / 3;

/**
 * THE CREDIT THE BAND SETS: the longest form that holds ONE line at this frame's own credit measure.
 *
 * THE TALLER RUNG WAS SPENT FIRST AND MEASURED BACK. The band exists so the credit no longer has to fit a patch of
 * map, so the obvious rung was to give it the fullest form the frame holds at all — « Source : WRI Global Power
 * Plant Database · Natural Earth · © MapTiler © OpenStreetMap » on two lines (849 × 91) for creme and rapport,
 * « WRI · Natural Earth · © MapTiler © OpenStreetMap » (723 × 88) for nocturne. Measured 2026-09-24: a second line
 * makes the band 175 px instead of 131, the close-up is then fitted into 905 px instead of 948, and the station's
 * own block — « Zaporijjia » over « 6 000 MW installés », 531 px wide, the one block that carries the beat's claim
 * and may never be dropped — found no clear position on that stage for creme or for rapport. The map has to seat
 * the subject before the credit may have a second line, so the band takes the one-line form.
 *
 * What that costs is « Natural Earth », the basemap places credit, at square only; « WRI » and the whole MapTiler
 * and OpenStreetMap attribution stand. It is the same ladder the credit has always walked — the longest form that
 * finds a place — with the band's own height as the constraint instead of a patch of sea.
 */
const creditInBand = (credits) => credits.find((c) => c.lines.length === 1) ?? credits[0];

/**
 * THE GROUND BAND — WHAT THE SQUARE FRAME MAKES POSSIBLE, AND WHAT THE STATIC TWIN ALREADY DRAWS (`STACKED`).
 *
 * This beat's credit stands ON the map, and it may only stand on ONE surface — all sea, or (away from 16:9) all
 * land — so that no coastline runs through the words and the halo has one colour to do its work against. That rule
 * is not the thing to spend: it is the whole reason the line is legible. What a square frame takes away is the
 * SURFACE. The close-up is Zaporizhzhia's window fitted to a 1080 × 1080 stage rather than a 1920 × 1080 one, so
 * every country is drawn smaller while the names on it are set at the 36 px floor instead of 30; measured
 * 2026-09-24, nocturne had no row anywhere on that stage — sea or land — wide enough for the shortest one-line form
 * and clear of every word, dot and mark. Creme and rapport found one, but only just.
 *
 * So at square the frame overrides « the credit stands on the map »: a band of the direction's own ground across the
 * foot carries it, and the live map keeps the whole width and is FITTED AND RAISED into the band above it
 * (`map-plan.mjs`, `camerasOf`). The credit then crosses no coast because it crosses no map at all — a different
 * drawing of the same beat rather than a degraded one, and one composition for all three directions rather than a
 * rule that bends for the one that refused.
 *
 * THE BAND CARRIES THE CREDIT AND NOTHING ELSE, because the credit is the only block this beat has nowhere for: the
 * station's own block and every name are placed on the ground they NAME and could not move into a band without
 * naming the band. And the map stays the subject — a band that leaves it less than a third of the frame is refused
 * with the number it fell short by.
 */
function bandFor({ frame, inset, vInset, air, credit }) {
  const height = air + credit.height + vInset;
  const y = frame.height - height;
  const mapBand = { width: frame.width, height: y };
  if (mapBand.height < frame.height * MIN_MAP_SHARE)
    throw new Error(
      `the ground band is ${height.toFixed(0)}px tall and leaves the map ${mapBand.height.toFixed(0)}px of a ` +
        `${frame.height}px frame, under the ${(frame.height * MIN_MAP_SHARE).toFixed(0)}px a map beat keeps for its map. ` +
        `Give the beat a shorter form of the credit.`,
    );
  return { x: 0, y, width: frame.width, height, mapBand, sourceAt: { x: inset, y: frame.height - vInset - credit.height } };
}

export function loadBeat() {
  const subject = loadSubject();
  return { subject, states: statesFor(), copy: copyOf(subject), mapSeats: mapSeatsOf(subject) };
}

const n0 = (v) => Math.round(v).toLocaleString("fr-FR").replace(/[\u202F\u00A0\u2009]/g, NB);

export function copyOf(subject) {
  const attribution = `©${NB}MapTiler ©${NB}OpenStreetMap`;
  return {
    eyebrow: "Énergie · Europe",
    title: [`La plus grosse centrale bas-carbone d’Europe est en Ukraine`, `La plus grosse centrale d’Europe est en Ukraine`],
    countries: Object.fromEntries(AREAS.map((a) => [a, FRENCH_COUNTRY[a]])),
    places: subject.places.map((p) => ({ ...p, label: FRENCH_PLACE[p.name] })),
    waters: WATERS,
    station: "Zaporijjia",
    capacity: (mw) => `${n0(mw)}${NB}MW installés`,
    // One line, over open sea, with the map's attribution: the longest form the measured sea holds is set.
    source: [
      `Source${NB}: WRI Global Power Plant Database v1.3.0 · lieux Natural Earth 50 m · ${attribution}`,
      `Source${NB}: WRI Global Power Plant Database · Natural Earth · ${attribution}`,
      `WRI · Natural Earth · ${attribution}`,
      `WRI · ${attribution}`,
    ].map((f) => f.replaceAll(" · ", `${NB}· `)),
  };
}

export function textPerRegisterOf(copy) {
  return {
    display: copy.title.join(" "),
    eyebrow: copy.eyebrow,
    body: copy.source.join(" "),
    annot: [...copy.places.map((p) => p.label), ...copy.waters.flatMap((w) => w.forms)].join(" "),
    value: `${copy.station} ${copy.capacity(6000)} 0123456789`,
    axis: [...Object.values(copy.countries), ...copy.source].join(" "),
  };
}

// ── the measured map ─────────────────────────────────────────────────────────────────────────────────

const MEASURED = join(HERE, "measured.json");
let measuredCache = null;
/** `measured.json` AT THIS SIZE, read once: what `measure.mjs` froze on the real map for this frame shape.
 *  The file is keyed by export size because the camera is fitted to the stage — a portrait camera is a different
 *  camera, over a different plan, with a different digest — so one frozen entry cannot serve three sizes. A size
 *  that has not been measured is named here with the command that measures it, rather than read as a plan drift. */
export function readMeasured() {
  if (measuredCache) return measuredCache;
  if (!existsSync(MEASURED)) throw new Error("no measured.json beside the beat — run measure.mjs with the worktree's .env loaded");
  const all = JSON.parse(readFileSync(MEASURED, "utf8"));
  if (!all[SIZE])
    throw new Error(
      `measured.json holds no ${SIZE} entry — measured so far: ${Object.keys(all).join(", ") || "nothing"}. ` +
        `Run: set -a && . ./.env && set +a && bun proof/video-locator-zaporizhzhia/measure.mjs --size ${SIZE}`,
    );
  measuredCache = all[SIZE];
  return measuredCache;
}
const channels = (c) => [1, 3, 5].map((k) => Number.parseInt(c.slice(k, k + 2), 16));
export const near = (a, b, tolerance = SAME_CELL) => channels(a).every((v, i) => Math.abs(v - channels(b)[i]) <= tolerance);
/** The measured colour of the cell under a stage point. */
export const cellAt = (grid, x, y) => grid.colours[Math.min(grid.rows - 1, Math.max(0, Math.floor(y / grid.cell))) * grid.cols + Math.min(grid.cols - 1, Math.max(0, Math.floor(x / grid.cell)))];
/** Of the given colours, the one nearest a measured cell. */
export const nearestOf = (cell, candidates) => candidates.reduce((best, c) => (channels(c).reduce((s, v, i) => s + (v - channels(cell)[i]) ** 2, 0) < channels(best).reduce((s, v, i) => s + (v - channels(cell)[i]) ** 2, 0) ? c : best));
/** HOW MANY CELLS OF A KIND a box covers, in constant time: a summed-area table over the grid. */
export function countOf(grid, kind) {
  const { cols, rows } = grid;
  const sums = new Float64Array((cols + 1) * (rows + 1));
  for (let j = 0; j < rows; j++)
    for (let i = 0; i < cols; i++) sums[(j + 1) * (cols + 1) + i + 1] = (kind(grid.colours[j * cols + i]) ? 1 : 0) + sums[j * (cols + 1) + i + 1] + sums[(j + 1) * (cols + 1) + i] - sums[j * (cols + 1) + i];
  return (box) => {
    const i0 = Math.max(0, Math.floor(box.x / grid.cell));
    const i1 = Math.min(cols - 1, Math.floor((box.x + box.width) / grid.cell)) + 1;
    const j0 = Math.max(0, Math.floor(box.y / grid.cell));
    const j1 = Math.min(rows - 1, Math.floor((box.y + box.height) / grid.cell)) + 1;
    const at = (i, j) => sums[j * (cols + 1) + i];
    return { count: at(i1, j1) - at(i0, j1) - at(i1, j0) + at(i0, j0), total: (i1 - i0) * (j1 - j0) };
  };
}

function insideRing(ring, x, y) {
  let hit = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) hit = !hit;
  }
  return hit;
}
const touches = (a, b, gap = 0) => a.x < b.x + b.width + gap && b.x < a.x + a.width + gap && a.y < b.y + b.height + gap && b.y < a.y + a.height + gap;
const meanOf = (pts) => [pts.reduce((s, p) => s + p[0], 0) / pts.length, pts.reduce((s, p) => s + p[1], 0) / pts.length];

/**
 * @param {{ measured?: any }} [options]  `measured: null` builds the plan and the cameras only — what `measure.mjs` reads.
 */
export function buildDirection(id, { subject, states, copy }, { measured = undefined } = {}) {
  const direction = resolveDirectionFamilies(readDirection(join(DIRECTIONS, `${id}.md`)), textPerRegisterOf(copy));
  const resolved = Object.fromEntries(REGISTER_NAMES.map((name) => [name, registerOf(direction, name)]));
  const registers = videoRegistersOf(resolved, SIZE);
  const k = registers.axis.fontSize / resolved.axis.fontSize;
  const row = sizeFor(SIZE);
  const stage = { width: row.width, height: row.height };
  const inset = frameInsetFor(SIZE);
  const vInset = verticalInsetFor(SIZE);
  for (const [name, r] of Object.entries(registers)) if (!(r.fontSize >= row.minTypePx)) throw new Error(`register ${name} is ${r.fontSize}px, under the ${row.minTypePx}px floor`);
  const { axis, annot, value } = registers;
  // The three classes of place, three treatments (the still's): areas uppercase and tracked, settlements mixed case,
  // waters italic.
  const area = { ...axis, letterSpacing: Math.max(Number(axis.letterSpacing ?? 0), 0.8 * k), transform: "uppercase" };
  const settlement = { ...annot, fontStyle: "normal", transform: "none" };
  const water = { ...annot, fontStyle: "italic", letterSpacing: 0, transform: "none" };
  const gap = 0.25 * axis.lead;
  const pad = haloOf(axis, k) / 2;

  const titleCard = titleCardFor({ registers, eyebrow: copy.eyebrow, title: copy.title, size: SIZE, eyebrowToDisplay: EYEBROW_TO_DISPLAY });
  /** The credit on one line, in every form that holds one — the longest that finds open sea is set. */
  const credits = copy.source.flatMap((form) => {
    try {
      return [sourceCreditFor({ registers, forms: [form], size: SIZE, k, ...CREDIT_ONE_LINE })];
    } catch {
      return [];
    }
  });
  if (!credits.length) throw new Error("no form of the source holds one line");
  const sourceRegister = credits[0].register;

  /** The ground band under the map at square, and `null` at a frame whose map has a surface for the credit. */
  const band = SIZE === "square" ? bandFor({ frame: stage, inset, vInset, air: BAND_AIR * axis.lead, credit: creditInBand(credits) }) : null;
  /** WHERE THE LIVE MAP STOPS: the band's top edge at square, the frame's own foot everywhere else. The map is still
   *  MOUNTED on the whole frame — the measurement is a picture of that frame and its seats are its pixels — so a
   *  name seated below this floor would be drawn under the band, and nothing of the overlay's may go there. */
  const mapFloor = band ? band.y : stage.height;
  const mapStage = { width: stage.width, height: mapFloor };

  // ── the cameras: Europe's window, and the still's window centred on the station, both "meet" in the stage ───────
  const { biggest } = subject;
  const station = [biggest.lon, biggest.lat];
  const cameras = camerasOf(subject, EUROPE_WINDOW, stage, band?.mapBand ?? null);
  const projectWhole = projectorOf(cameras.whole, stage);
  const unprojectWhole = unprojectorOf(cameras.whole, stage);
  const projectClose = projectorOf(cameras.closeUp, stage);
  const unprojectClose = unprojectorOf(cameras.closeUp, stage);

  // ── colours ─────────────────────────────────────────────────────────────────────────────────────────────────
  const { ground, accent } = direction;
  const { ink, muted, grid } = deriveFurniture(ground);
  const { water: sea, land } = plateTints(direction);
  // The country the story is in: one step of the ink off the land — an accent tint read as water on the pale directions.
  const story = mix(land, ink, 0.09);
  const walked = (c, on, floor, what) => {
    const cells = Array.isArray(on) ? on : [on];
    let w = c;
    for (const cell of cells) w = contrast(w, cell) >= floor ? w : adjustToContrast(w, cell, floor);
    if (!w || cells.some((cell) => contrast(w, cell) < floor - 1e-9)) throw new Error(`${what} has no variant that reads at ${floor}:1 on ${cells.join(" and ")}`);
    return w;
  };
  const colours = {
    ground,
    sea,
    land,
    story,
    border: grid,
    // A region's border reads on its country's fill at 1.6:1 — a secondary line, below the non-text floor a mark takes.
    region: adjustToContrast(grid, story, 1.6) ?? grid,
    ring: walked(accent, [land, story], NON_TEXT_CONTRAST_MIN, "the ring"),
    text: {
      eyebrow: walked(registers.eyebrow.fill ?? accent, ground, TEXT_CONTRAST_MIN, "the eyebrow"),
      title: walked(registers.display.fill ?? ink, ground, TEXT_CONTRAST_MIN, "the title"),
      area: walked(muted, [land, story], TEXT_CONTRAST_MIN, "a country's name"),
      settlement: walked(ink, [land, story], TEXT_CONTRAST_MIN, "a settlement"),
      water: walked(WATER_HUE, sea, TEXT_CONTRAST_MIN, "a water's name"),
      station: walked(accent, [land, story], TEXT_CONTRAST_MIN, "the station"),
      // The credit is read against every surface it may stand on — or, where the frame stacks a band under the map,
      // against the direction's own ground, which is what the band is FOR: ink read off the page, not off the map.
      source: band ? walked(muted, ground, TEXT_CONTRAST_MIN, "the credit") : walked(muted, [land, sea, story], TEXT_CONTRAST_MIN, "the credit"),
    },
  };
  const border = (direction.stroke?.hairline ?? 0.6) * k;
  const strokes = { border, region: REGION_WIDTH * border, ring: (direction.stroke?.rule ?? 1) * k * 1.6 };
  const dotR = 0.14 * axis.lead;
  const air = STATION_AIR * axis.lead;

  // ── the continent's one name: on Ukraine's seat, above the ring when it would touch it ───────────────────────────
  const ukrPts = subject.geo.features.filter((f) => f.properties.iso === "UKR").flatMap((f) => f.geometry.coordinates.flat(2));
  const [ukrX, ukrSeatY] = projectWhole(meanOf(ukrPts));
  const ukrPill = pillOf(copy.countries.UKR, area, pad);
  const [, stationFarY] = projectWhole(station);
  let ukrY = ukrSeatY - ukrPill.height / 2;
  if (Math.abs(ukrSeatY - stationFarY) < RING_FAR + ukrPill.height) ukrY = stationFarY - RING_FAR - gap - ukrPill.height;
  const overviewBox = { x: ukrX - ukrPill.width / 2, y: ukrY, width: ukrPill.width, height: ukrPill.height };
  const overviewName = { text: ukrPill.text, width: ukrPill.textWidth, box: overviewBox, at: unprojectWhole([ukrX, ukrY + ukrPill.height / 2]), halo: haloOf(axis, k) };

  const mapPlan = mapPlanFor({ station, overviewName, colours, strokes, rings: { far: RING_FAR, near: RING_NEAR }, dotR, registers: { area }, cameras, stage });
  /** What the frame's drive reads (`scene.mjs`): the live map's state needs no overlay. */
  const drive = { cameras, capacity: biggest.mw, states, timing: LOCATOR_VIDEO_TIMING };
  if (measured === null) return { props: { mapPlan, ...drive } };
  measured ??= readMeasured();
  if (measured.planDigest?.[id] !== planDigestOf(mapPlan)) throw new Error(`${id}: the plan changed since it was measured — run measure.mjs again`);
  if (measured.size.width !== stage.width || measured.size.height !== stage.height)
    throw new Error(`${id}: measured at ${measured.size.width}×${measured.size.height}, drawn at ${stage.width}×${stage.height}`);
  const { grid: cells, projected } = measured.cameras[id].closeUp;
  // THE SEA, READ OFF THE MEASURED MAP AND NOT OFF A CLAMPED CELL. `cellAt` clamps a point outside the grid to the
  // nearest column, so a probe that falls off the frame reads whatever sits at the edge and the WHOLE map is then
  // classified against it — silently, with no refusal, and the key and the credit are placed on that lie. Measured
  // at 1080x1920: a probe tuned for a 16:9 frame can sit west of a width-fitted one. So the probe is a LADDER, a
  // rung counts only when it lands INSIDE the frame and reads the plan's own water tint, and no rung qualifying is
  // a refusal. A rung the measurement predates is skipped, so landscape keeps rung 0 and nothing delivered moves.
  const seaProbe = (grid, water) => {
    const tried = [];
    for (const name of SEA_PROBES) {
      const at = projected[name];
      if (!at) continue;
      const [px, py] = at;
      if (px < 0 || py < 0 || px >= stage.width || py >= stage.height) {
        tried.push(`${name} falls off the ${stage.width}x${stage.height} frame at ${Math.round(px)},${Math.round(py)}`);
        continue;
      }
      const colour = cellAt(grid, px, py);
      if (near(colour, water)) return colour;
      tried.push(`${name} reads ${colour} at ${Math.round(px)},${Math.round(py)}`);
    }
    throw new Error(`${id}: no sea probe reads the water tint ${water} inside the frame — ${tried.join("; ")}`);
  };
  const measuredSea = seaProbe(cells, sea);
  /** Not sea: the land, Ukraine, every border and coast, the station's marks. */
  const landIn = countOf(cells, (c) => !near(c, measuredSea));
  /** The halo under a box: what the measured map paints at its centre — the sea, the land or Ukraine. */
  const haloUnder = (box) => nearestOf(cellAt(cells, box.x + box.width / 2, box.y + box.height / 2), [sea, land, story]);
  /** The cells the measured map paints as Ukraine. */
  const storyIn = countOf(cells, (c) => nearestOf(c, [sea, land, story]) === story);

  // ── the close-up's names, placed on the stage of the close-up camera ─────────────────────────────────────────
  const stageOf = (lonLat) => {
    const [x, y] = projectClose(lonLat);
    return { x, y };
  };
  const w = subject.closeWindow;
  const inClose = ([lon, lat]) => lon >= w.west && lon <= w.east && lat >= w.south && lat <= w.north;
  const ringsOf = (iso) => subject.geo.features.filter((f) => f.properties.iso === iso).flatMap((f) => f.geometry.coordinates.flat(1));
  const countrySeat = (iso) => {
    const pts = ringsOf(iso).flat(1).filter(inClose);
    return pts.length ? stageOf(meanOf(pts)) : null;
  };
  const stationAtStage = stageOf(station);
  const places = copy.places.map((p) => ({ ...p, at: stageOf([p.lon, p.lat]) }));
  const dotBoxes = [...places.map((p) => p.at), stationAtStage].map((p) => ({ x: p.x - 2 * dotR, y: p.y - 2 * dotR, width: 4 * dotR, height: 4 * dotR }));
  const ringBox = { x: stationAtStage.x - RING_NEAR - gap, y: stationAtStage.y - RING_NEAR - gap, width: 2 * (RING_NEAR + gap), height: 2 * (RING_NEAR + gap) };
  const stationName = pillOf(copy.station, value, pad);
  const capacityTexts = Object.fromEntries(
    Array.from({ length: 61 }, (_, i) => i * 100)
      .concat(biggest.mw)
      .map((mw) => {
        const t = applyCase(copy.capacity(mw), value.transform);
        return [String(mw), { text: t, width: widthOf(t, value) }];
      }),
  );
  const capacityWidth = Math.max(...Object.values(capacityTexts).map((t) => t.width));
  const valueBand = bandOf(BAND_PROBE, value);
  const stationBlock = { width: Math.max(stationName.width, capacityWidth + 2 * pad), height: 2 * (valueBand.ascent + valueBand.descent) + 2 * pad };
  // Settlements first — a name must hug its dot — then the station's block, then the countries.
  let items = [
    ...places.map((p) => {
      const pill = pillOf(p.label, settlement, pad);
      return { key: `place:${p.name}`, cx: p.at.x + 2 * dotR + pill.width / 2, cy: p.at.y, kind: "settlement", ...pill };
    }),
    // The station's block keeps an air around it, so no place's name reads as part of it.
    { key: "station", cx: stationAtStage.x + RING_NEAR + gap + stationBlock.width / 2, cy: stationAtStage.y, width: stationBlock.width + 2 * air, height: stationBlock.height + 2 * air, kind: "station" },
    ...AREAS.map((iso) => ({ iso, seat: countrySeat(iso) }))
      .filter((a) => a.seat && a.seat.x > inset && a.seat.x < stage.width - inset && a.seat.y > vInset && a.seat.y < mapFloor - vInset)
      .map((a) => ({ key: `area:${a.iso}`, iso: a.iso, cx: a.seat.x, cy: a.seat.y, kind: "area", ...pillOf(copy.countries[a.iso], area, pad) })),
  ];
  /** A country's name is centred inside its own country (Moldova is narrower than « MOLDAVIE »: the ends may overhang),
   *  and the middle half of a neighbour's covers no cell the measured map paints as Ukraine; Ukraine's stands on it. */
  const insideCountry = (iso, box) => {
    if (iso === "UKR") return haloUnder(box) === story;
    if (storyIn({ x: box.x + box.width / 4, y: box.y, width: box.width / 2, height: box.height }).count) return false;
    const [lon, lat] = unprojectClose([box.x + box.width / 2, box.y + box.height / 2]);
    return ringsOf(iso).some((ring) => insideRing(ring, lon, lat));
  };
  const itemByKey = Object.fromEntries(items.map((it) => [it.key, it]));
  const waters = copy.waters.map((wt) => {
    const at = stageOf([wt.lon, wt.lat]);
    const pill = pillOf(wt.forms[0], water, pad);
    return { key: `water:${wt.forms[0]}`, lonLat: [wt.lon, wt.lat], ...pill, box: { x: at.x - pill.width / 2, y: at.y - pill.height / 2, width: pill.width, height: pill.height } };
  });
  // A NEIGHBOUR'S NAME THAT CANNOT STAND INSIDE ITS OWN COUNTRY AT THIS FRAME IS DROPPED, NOT MOVED OFF IT.
  // At 1920x1080 all of them seat. At 1080x1920 and 1080x1080 the same close-up window is fitted to a narrower
  // frame, so every country is smaller on the stage while its name is set at the 36 px floor and is bigger:
  // measured, no box centred inside Moldova keeps its middle half off Ukraine. A name pushed outside its country
  // would label the wrong ground, so it goes and the run says so. Ukraine's own name, the settlements and the
  // station's block are never dropped — they carry the beat's claim, and a refusal there stays a refusal.
  const droppedNames = [];
  let placed = null;
  for (;;) {
    try {
      placed = placePills(items, mapStage, gap, {
        obstacles: [...dotBoxes, ringBox, ...waters.map((wt) => wt.box)],
        allowed: (box, key) => itemByKey[key].kind !== "area" || insideCountry(itemByKey[key].iso, box),
      });
      break;
    } catch (error) {
      const key = /no clear position for the name (\S+) inside/.exec(error.message)?.[1];
      const item = key ? itemByKey[key] : null;
      if (!item || item.kind !== "area" || item.iso === "UKR") throw error;
      droppedNames.push(item.iso);
      items = items.filter((it) => it.key !== key);
    }
  }
  const names = items
    .filter((it) => it.kind !== "station")
    .map((it) => {
      const box = { ...placed[it.key], width: it.width, height: it.height };
      const register = it.kind === "area" ? area : settlement;
      return { key: it.key, kind: it.kind, text: it.text, width: it.textWidth, box, at: unprojectClose([box.x + box.width / 2, box.y + box.height / 2]), register, ink: colours.text[it.kind], halo: haloOf(axis, k), haloColour: haloUnder(box) };
    });
  const waterNames = waters.map((wt) => ({ key: wt.key, kind: "water", text: wt.text, width: wt.textWidth, box: wt.box, at: wt.lonLat, register: water, ink: colours.text.water, halo: haloOf(water, k), haloColour: haloUnder(wt.box) }));
  const stationAt = { x: placed.station.x + air, y: placed.station.y + air };
  const stationBox = { x: stationAt.x, y: stationAt.y, ...stationBlock };
  const stationLines = {
    name: { text: stationName.text, width: stationName.textWidth, x: stationAt.x + pad, y: stationAt.y + pad + valueBand.ascent },
    capacity: { x: stationAt.x + pad, y: stationAt.y + pad + 2 * valueBand.ascent + valueBand.descent },
    halo: haloOf(value, k),
    haloColour: haloUnder(stationBox),
  };

  // WHAT THE CREDIT MAY STAND ON. At 1920x1080: open sea, every cell of it — "so it crosses no coast". The property
  // being protected is the SECOND half of that sentence: one uninterrupted surface under the line, so the halo does
  // its work and no coastline runs through the words. At 1080x1920 and 1080x1080 the sea wide enough to hold a
  // credit is gone — measured, no row of open water anywhere on the stage clears the marks — while whole countries
  // are. So a frame that is not 16:9 accepts EITHER surface, as long as it is one: all sea, or all land. Landscape
  // keeps the sea and nothing delivered moves.
  const oneSurface = (box) => {
    const { count, total } = landIn(box);
    return count === 0 || (SIZE !== "landscape" && count === total);
  };
  // ── the credit: one line over open sea, in the lowest, leftmost corner clear of every word and mark ────────────
  const taken = [...names.map((n) => n.box), ...waterNames.map((n) => n.box), stationBox, ringBox, ...dotBoxes];
  let creditAt = null;
  let credit = null;
  // THE BAND SEATS THE CREDIT, AND NOTHING IS SEARCHED FOR IT. Where the frame stacks a band of ground under the map
  // (`bandFor`), the credit is not looking for a surface: its place is the band's own, and its form is the longest
  // the frame's line budget holds on one line rather than the shortest that happened to fit a patch of the map.
  if (band) {
    const { register, ...rest } = creditInBand(credits);
    credit = rest;
    creditAt = { ...band.sourceAt };
  }
  for (const form of credit ? [] : credits) {
    search: for (let cy = stage.height - vInset - form.height; cy >= vInset; cy -= SEAT_STEP)
      for (let cx = inset; cx + form.width <= stage.width - inset; cx += SEAT_STEP) {
        const box = { x: cx, y: cy, width: form.width, height: form.height };
        if (!oneSurface(box) || taken.some((t) => touches(box, t, gap))) continue;
        creditAt = { x: cx, y: cy };
        break search;
      }
    if (creditAt) {
      const { register, ...rest } = form;
      credit = rest;
      break;
    }
  }
  if (!creditAt) throw new Error(`${id}: no one-line form of the source finds open sea clear of every word and mark on the measured close-up`);

  const props = {
    frame: stage,
    /** The ground band under the map at square — `null` at a frame whose map has a surface for the credit. */
    band,
    registers: { display: titleCard.register, eyebrow: registers.eyebrow, value, source: sourceRegister },
    titleCard,
    // In the band the credit's halo is the band's own ground: it is struck on what it stands on, as it is on the sea.
    credit: { ...credit, at: creditAt, haloColour: band ? ground : sea },
    colours,
    strokes,
    station: { lines: stationLines, capacityTexts },
    layoutInset: { x: inset, y: vInset },
    mapPlan: withNames(mapPlan, { dots: copy.places.map((p) => [p.lon, p.lat]), names: [...waterNames, ...names], colours, strokes, dotR }),
    ...drive,
  };
  return {
    id,
    direction,
    props,
    names,
    waters: waterNames,
    overviewName,
    boxes: { station: stationBox, ring: ringBox, dots: dotBoxes },
    mapRegisters: { area, settlement, water },
    report: { k, titleForm: titleCard.form, sourceText: credit.lines[0].text, names: names.length, waters: waterNames.length },
  };
}
