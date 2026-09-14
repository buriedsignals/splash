// EVERYTHING ONE DIRECTION'S RENDER IS HANDED, BUILT IN BUN — the words, the land in map units, both cameras, every name
// placed under the close-up, the station's marks, the colours and the states.
//
// Runs in Bun only.

import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { adjustToContrast, contrast, mix, NON_TEXT_CONTRAST_MIN, TEXT_CONTRAST_MIN } from "#shared/chart-beat/colour.mjs";
import { deriveFurniture } from "#shared/chart-beat/render-still.mjs";
import { frameInsetFor, sizeFor } from "#shared/chart-video/sizes.mjs";
import { readDirection } from "#shared/design-base/read-direction.mjs";
import { EYEBROW_TO_DISPLAY, registerOf } from "#shared/design-base/register.mjs";
import { resolveDirectionFamilies } from "#shared/design-base/resolve-families.mjs";
import { plateTints, WATER_HUE } from "#shared/map-beat/tints.mjs";
import { applyCase } from "../../skills/map-beat/scripts/registers.mjs";
import { BAND_PROBE, bandOf, haloOf, pillOf, sourceCreditFor, titleCardFor, verticalInsetFor, widthOf } from "../../skills/map-beat/scripts/shots.mjs";
import { videoRegistersOf } from "../../skills/map-beat/scripts/video-registers.mjs";
import { fitViewBox } from "../../skills/scrolly/assets/reveal.mjs";
import { clipRing } from "../video-choropleth-europe-lowcarbon/geometry.mjs";
import { placePills, toStage } from "../video-choropleth-europe-lowcarbon/scene.mjs";
import { statesFor } from "./states.mjs";
import { AREAS, EUROPE_WINDOW, FRENCH_COUNTRY, FRENCH_PLACE, loadSubject, WATERS } from "./subject.mjs";
import { LOCATOR_VIDEO_TIMING } from "./timing-contract.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
export const ROOT = join(HERE, "..", "..");
export const DIRECTIONS = join(ROOT, "docs", "design-base", "directions");
export const SIZE = "landscape";
export const REGISTER_NAMES = ["display", "eyebrow", "body", "annot", "value", "axis"];
const NB = "\u00A0";
const RAD = Math.PI / 180;
/** Map units: the equal-area projection's radians × this. */
const UNIT = 1000;
/** The station's ring, in stage px: on the continent, and closed on the station. */
export const RING_FAR = 40;
export const RING_NEAR = 22;

export function loadBeat() {
  const subject = loadSubject();
  return { subject, states: statesFor(), copy: copyOf(subject) };
}

const n0 = (v) => Math.round(v).toLocaleString("fr-FR").replace(/[\u202F\u00A0\u2009]/g, NB);

export function copyOf(subject) {
  return {
    eyebrow: "Énergie · Europe",
    title: [`La plus grosse centrale bas-carbone d’Europe est en Ukraine`, `La plus grosse centrale d’Europe est en Ukraine`],
    countries: Object.fromEntries(AREAS.map((a) => [a, FRENCH_COUNTRY[a]])),
    places: subject.places.map((p) => ({ ...p, label: FRENCH_PLACE[p.name] })),
    waters: WATERS,
    station: "Zaporijjia",
    capacity: (mw) => `${n0(mw)}${NB}MW installés`,
    source: [`Source : WRI Global Power Plant Database v1.3.0 · lieux Natural Earth 50 m`, `Source : WRI Global Power Plant Database · Natural Earth`].map((f) => f.replace(" · ", `${NB}· `)),
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

function insideRing(ring, x, y) {
  let hit = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) hit = !hit;
  }
  return hit;
}
const r1 = (v) => Math.round(v * 10) / 10;

export function buildDirection(id, { subject, states, copy }) {
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

  const titleCard = titleCardFor({ registers, eyebrow: copy.eyebrow, title: copy.title, size: SIZE, eyebrowToDisplay: EYEBROW_TO_DISPLAY });
  const { register: sourceRegister, ...credit } = sourceCreditFor({ registers, forms: copy.source, size: SIZE, k });

  // ── the projection: equal-area, centred on the station (the still's) ────────────────────────────────────────
  const { biggest } = subject;
  const LAT0 = biggest.lat * RAD;
  const LON0 = biggest.lon * RAD;
  const project = ([lonDeg, latDeg]) => {
    const lat = latDeg * RAD;
    const lon = lonDeg * RAD - LON0;
    const cosc = Math.sin(LAT0) * Math.sin(lat) + Math.cos(LAT0) * Math.cos(lat) * Math.cos(lon);
    const kk = Math.sqrt(2 / Math.max(1e-9, 1 + cosc));
    return [UNIT * kk * Math.cos(lat) * Math.sin(lon), -UNIT * kk * (Math.cos(LAT0) * Math.sin(lat) - Math.sin(LAT0) * Math.cos(lat) * Math.cos(lon))];
  };
  const boxOfWindow = (w) => {
    const pts = [];
    for (let i = 0; i <= 60; i++) {
      const t = i / 60;
      pts.push(project([w.west + t * (w.east - w.west), w.north]), project([w.west + t * (w.east - w.west), w.south]), project([w.west, w.south + t * (w.north - w.south)]), project([w.east, w.south + t * (w.north - w.south)]));
    }
    const xs = pts.map((p) => p[0]);
    const ys = pts.map((p) => p[1]);
    return { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) };
  };
  const NO_INSETS = { top: 0, right: 0, bottom: 0, left: 0 };
  // Europe's window is wider than the frame's aspect: it is fitted by its height, the land north of 72° cut.
  const europe = boxOfWindow(EUROPE_WINDOW);
  const cameras = { overview: fitViewBox(europe, stage, NO_INSETS), closeUp: fitViewBox(boxOfWindow(subject.closeWindow), stage, NO_INSETS) };

  // ── the land, in map units, clipped to the overview camera plus a margin ────────────────────────────────────
  const ov = cameras.overview;
  const clip = { x0: ov.x - ov.w * 0.2, x1: ov.x + ov.w * 1.2, y0: ov.y - ov.h * 0.2, y1: ov.y + ov.h * 1.2 };
  const shapes = [];
  for (const f of subject.geo.features) {
    const rings = [];
    for (const poly of f.geometry.coordinates)
      for (const ring of poly) {
        const cut = clipRing(ring.map(project), clip);
        if (cut.length < 3) continue;
        const kept = [cut[0]];
        for (const p of cut.slice(1)) if (Math.abs(p[0] - kept.at(-1)[0]) + Math.abs(p[1] - kept.at(-1)[1]) >= 0.4) kept.push(p);
        if (kept.length >= 3) rings.push(kept);
      }
    if (rings.length) shapes.push({ iso: f.properties.iso, rings, d: rings.map((ring) => `M${ring.map((p) => `${r1(p[0])} ${r1(p[1])}`).join("L")}Z`).join("") });
  }
  // THE FOCUS COUNTRY'S REGIONS (the owner, 2026-09-14: « si tu focus sur un pays il faut montrer les frontières des
  // régions »): its admin-1 lines, clipped like the land, drawn once the camera closes in.
  const regionParts = [];
  for (const f of subject.regions.features)
    for (const line of f.geometry.coordinates) {
      const pts = line.map(project);
      if (pts.length >= 2) regionParts.push(`M${pts.map((p) => `${r1(p[0])} ${r1(p[1])}`).join("L")}`);
    }
  const ukraine = shapes.find((s) => s.iso === "UKR");
  if (!ukraine) throw new Error("Ukraine has no shape in the Europe file");

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
      source: walked(muted, [land, sea, story], TEXT_CONTRAST_MIN, "the credit"),
    },
  };

  // ── what is under a stage point at the close-up, for halos ──────────────────────────────────────────────────
  const cu = cameras.closeUp;
  const toMap = (sx, sy) => [cu.x + (sx / stage.width) * cu.w, cu.y + (sy / stage.height) * cu.h];
  const cellAt = (sx, sy) => {
    const [x, y] = toMap(sx, sy);
    if (ukraine.rings.some((ring) => insideRing(ring, x, y))) return story;
    return shapes.some((s) => s.rings.some((ring) => insideRing(ring, x, y))) ? land : sea;
  };
  const stageOf = (lonlat, vb = cu) => {
    const [x, y] = project(lonlat);
    return toStage(vb, stage, { x, y });
  };

  // ── the close-up's names ─────────────────────────────────────────────────────────────────────────────────────
  const inClose = ([lon, lat]) => lon >= subject.closeWindow.west && lon <= subject.closeWindow.east && lat >= subject.closeWindow.south && lat <= subject.closeWindow.north;
  const countrySeat = (iso) => {
    const f = subject.geo.features.filter((x) => x.properties.iso === iso);
    const pts = f.flatMap((x) => x.geometry.coordinates.flat(2)).filter(inClose);
    if (!pts.length) return null;
    return stageOf([pts.reduce((s, p) => s + p[0], 0) / pts.length, pts.reduce((s, p) => s + p[1], 0) / pts.length]);
  };
  const station = stageOf([biggest.lon, biggest.lat]);
  const dotR = 0.14 * axis.lead;
  const places = copy.places.map((p) => ({ ...p, at: stageOf([p.lon, p.lat]) }));
  const dotBoxes = [...places.map((p) => p.at), station].map((p) => ({ x: p.x - 2 * dotR, y: p.y - 2 * dotR, width: 4 * dotR, height: 4 * dotR }));
  const ringBox = { x: station.x - RING_NEAR - gap, y: station.y - RING_NEAR - gap, width: 2 * (RING_NEAR + gap), height: 2 * (RING_NEAR + gap) };
  const pad = haloOf(axis, k) / 2;
  const stationName = pillOf(copy.station, value, pad);
  const capacityTexts = Object.fromEntries(Array.from({ length: 61 }, (_, i) => i * 100).concat(biggest.mw).map((mw) => {
    const t = applyCase(copy.capacity(mw), value.transform);
    return [String(mw), { text: t, width: widthOf(t, value) }];
  }));
  const capacityWidth = Math.max(...Object.values(capacityTexts).map((t) => t.width));
  const valueBand = bandOf(BAND_PROBE, value);
  const stationBlock = { width: Math.max(stationName.width, capacityWidth + 2 * pad), height: 2 * (valueBand.ascent + valueBand.descent) + 2 * pad };
  // Settlements first — a name must hug its dot — then the station's block, then the countries.
  const items = [
    ...places.map((p) => {
      const pill = pillOf(p.label, settlement, pad);
      return { key: `place:${p.name}`, cx: p.at.x + 2 * dotR + pill.width / 2, cy: p.at.y, kind: "settlement", text: p.label, ...pill };
    }),
    { key: "station", cx: station.x + RING_NEAR + gap + stationBlock.width / 2, cy: station.y, width: stationBlock.width, height: stationBlock.height, kind: "station" },
    ...AREAS.map((iso) => ({ iso, seat: countrySeat(iso) }))
      .filter((a) => a.seat && a.seat.x > inset && a.seat.x < stage.width - inset && a.seat.y > vInset && a.seat.y < stage.height - vInset)
      .map((a) => ({ key: `area:${a.iso}`, iso: a.iso, cx: a.seat.x, cy: a.seat.y, kind: "area", text: copy.countries[a.iso], ...pillOf(copy.countries[a.iso], area, pad) })),
  ];
  /** A country's name is centred inside its own country (Moldova is narrower than « MOLDAVIE »: the ends may overhang). */
  const insideCountry = (iso, box) => {
    const own = shapes.filter((sh) => sh.iso === iso).flatMap((sh) => sh.rings);
    const cy = box.y + box.height / 2;
    return [0.5].every((t) => {
      const [x, y] = toMap(box.x + box.width * t, cy);
      return own.some((ring) => insideRing(ring, x, y));
    });
  };
  const itemByKey = Object.fromEntries(items.map((it) => [it.key, it]));
  const waters = copy.waters.map((w) => {
    const at = stageOf([w.lon, w.lat]);
    const pill = pillOf(w.forms[0], water, pad);
    return { key: `water:${w.forms[0]}`, ...pill, x: at.x - pill.width / 2, y: at.y - pill.height / 2 };
  });
  const placed = placePills(items, stage, gap, {
    obstacles: [...dotBoxes, ringBox, ...waters.map((w) => ({ x: w.x, y: w.y, width: w.width, height: w.height }))],
    allowed: (box, key) => itemByKey[key].kind !== "area" || insideCountry(itemByKey[key].iso, box),
  });
  const names = items
    .filter((it) => it.kind !== "station")
    .map((it) => {
      const at = placed[it.key];
      const cell = cellAt(at.x + it.width / 2, at.y + it.height / 2);
      return { key: it.key, kind: it.kind, text: it.text, width: it.textWidth, x: at.x + it.textX, y: at.y + it.baseline, halo: haloOf(axis, k), haloColour: cell, box: { x: at.x, y: at.y, width: it.width, height: it.height } };
    });
  const stationAt = placed.station;
  const stationLines = {
    name: { text: stationName.text, width: stationName.textWidth, x: stationAt.x + pad, y: stationAt.y + pad + valueBand.ascent },
    capacity: { x: stationAt.x + pad, y: stationAt.y + pad + 2 * valueBand.ascent + valueBand.descent },
    halo: haloOf(value, k),
    haloColour: cellAt(stationAt.x + stationBlock.width / 2, stationAt.y + stationBlock.height / 2),
  };

  // ── the overview's one name, and the credit ─────────────────────────────────────────────────────────────────
  const ukrPts = subject.geo.features.filter((f) => f.properties.iso === "UKR").flatMap((f) => f.geometry.coordinates.flat(2));
  const ukrSeat = stageOf([ukrPts.reduce((s, p) => s + p[0], 0) / ukrPts.length, ukrPts.reduce((s, p) => s + p[1], 0) / ukrPts.length], cameras.overview);
  const ukrPill = pillOf(copy.countries.UKR, area, pad);
  const stationFar = stageOf([biggest.lon, biggest.lat], cameras.overview);
  // Beside the ring, never over it: the name sits on Ukraine's seat unless that touches the ring, then above.
  let ukrY = ukrSeat.y - ukrPill.height / 2;
  if (Math.abs(ukrSeat.y - stationFar.y) < RING_FAR + ukrPill.height) ukrY = stationFar.y - RING_FAR - gap - ukrPill.height;
  const overviewName = { text: ukrPill.text, width: ukrPill.textWidth, x: ukrSeat.x - ukrPill.textWidth / 2, y: ukrY + ukrPill.baseline, halo: haloOf(axis, k) };

  const touches = (a, b) => a.x < b.x + b.width + gap && b.x < a.x + a.width + gap && a.y < b.y + b.height + gap && b.y < a.y + a.height + gap;
  const taken = [...names.map((n) => n.box), ...waters.map((w) => ({ x: w.x, y: w.y, width: w.width, height: w.height })), { x: stationAt.x, y: stationAt.y, ...stationBlock }, ringBox, ...dotBoxes];
  let creditAt = null;
  search: for (let cy = stage.height - vInset - credit.height; cy >= vInset; cy -= 10)
    for (let cx = inset; cx + credit.width <= stage.width - inset; cx += 10) {
      const box = { x: cx, y: cy, width: credit.width, height: credit.height };
      if (taken.some((t) => touches(box, t))) continue;
      creditAt = { x: cx, y: cy };
      break search;
    }
  if (!creditAt) throw new Error(`a ${credit.width}×${credit.height} credit finds no free corner`);

  const props = {
    frame: stage,
    registers: { display: titleCard.register, eyebrow: registers.eyebrow, value, area, settlement, water, source: sourceRegister },
    titleCard,
    credit: { ...credit, at: creditAt, haloColour: cellAt(creditAt.x + credit.width / 2, creditAt.y + credit.height / 2) },
    colours,
    strokes: { border: (direction.stroke?.hairline ?? 0.6) * k, ring: (direction.stroke?.rule ?? 1) * k * 1.6 },
    seaBox: { x: clip.x0, y: clip.y0, w: clip.x1 - clip.x0, h: clip.y1 - clip.y0 },
    shapes: shapes.map(({ rings, ...s }) => s),
    regions: { d: regionParts.join("") },
    cameras,
    project: { station: project([biggest.lon, biggest.lat]), places: places.map((p) => project([p.lon, p.lat])) },
    overviewName,
    names,
    waters: waters.map((w) => ({ key: w.key, text: w.text, width: w.textWidth, x: w.x + w.textX, y: w.y + w.baseline, halo: haloOf(water, k) })),
    station: { lines: stationLines, capacityTexts, dotR },
    capacity: biggest.mw,
    rings: { far: RING_FAR, near: RING_NEAR },
    layoutInset: { x: inset, y: vInset },
    states,
    timing: LOCATOR_VIDEO_TIMING,
  };
  return { id, direction, props, report: { k, titleForm: titleCard.form, sourceForm: credit.form, names: names.length, waters: waters.length } };
}
