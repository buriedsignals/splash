// EVERYTHING ONE DIRECTION'S RENDER IS HANDED, BUILT IN BUN — the words, the colours, the live map's plan and its two
// cameras, the shots laid out (`skills/map-beat/scripts/shots.mjs`), every overlay word placed on the map as
// `measure.mjs` measured it at each fixed camera, and the states. The runner renders what this returns; the tests read
// the same object. A plan changed since the measurement is refused.

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { adjustToContrast, TEXT_CONTRAST_MIN } from "#shared/chart-beat/colour.mjs";
import { deriveFurniture } from "#shared/chart-beat/render-still.mjs";
import { frameInsetFor, sizeFor } from "#shared/chart-video/sizes.mjs";
import { EVENT_ORDER } from "#shared/chart-video/timing.ts";
import { readDirection } from "#shared/design-base/read-direction.mjs";
import { EYEBROW_TO_DISPLAY, registerOf } from "#shared/design-base/register.mjs";
import { resolveDirectionFamilies } from "#shared/design-base/resolve-families.mjs";
import { assertEventStates } from "../../skills/chart-video/scripts/choreography.mjs";
import { CREDIT_ONE_LINE, haloOf, keyFor, pillOf, sourceCreditFor, titleCardFor, verticalInsetFor } from "../../skills/map-beat/scripts/shots.mjs";
import { videoRegistersOf } from "../../skills/map-beat/scripts/video-registers.mjs";
import { assertClaim, BREAKS, FIRST, FRENCH, HALF, LAST, loadSubject, NEIGHBOURS, SUBJECT, YEARS } from "./beat.mjs";
import { planDigestOf } from "./measure.mjs";
import { camerasOf, mapPlanFor, SEATS, STAGE } from "./plan.mjs";
import { statesByEvent } from "./scene.mjs";
import { COAL_VIDEO_TIMING } from "./timing-contract.ts";

const HERE = import.meta.dir;
export const ROOT = join(HERE, "..", "..");
export const DIRECTIONS = join(ROOT, "docs", "design-base", "directions");
export const SIZE = "landscape";
export const REGISTER_NAMES = ["display", "eyebrow", "body", "annot", "value", "axis"];
export const DRAWN_REGISTERS = ["display", "eyebrow", "value", "axis", "area", "feature", "source"];
const NB = "\u00A0";
/** Air between words, and between a word and the frame's edge, × the axis lead. */
const GAP = 0.25;
/** A close-up gauge: its width at 100 %, its thickness and its air under the words, × the axis lead. */
const GAUGE = Object.freeze({ width: 5, height: 0.3, gap: 0.3 });
/** A leader's least length and its dot's radius, × the axis lead; how many heights a led word may stand off. */
const LEADER_GAP = 0.3;
const LEADER_DOT = 0.1;
const LED_REACH = 3;
const CLOSE_STEP = 4;
const PANEL_STEP = 20;
/** The share of the panel's cells that may be land. */
export const PANEL_LAND = 0.03;
const SAME_CELL = 3;
/** Poland's mainland extent, [west, south] → [east, north]: its word on the whole map stands clear of its outline. */
export const SUBJECT_EXTENT = Object.freeze([[14.12, 49.0], [24.15, 54.84]]);
/** A seat in the open Atlantic, off every coast the whole map shows: its cell's colour is « the sea ». */
export const ATLANTIC = Object.freeze([-9, 44]);

export function loadBeat() {
  const subject = loadSubject();
  const claim = assertClaim(subject);
  const byEvent = statesByEvent();
  const states = assertEventStates(EVENT_ORDER.map((e) => byEvent[e]), [...EVENT_ORDER]);
  return { subject, claim, states, copy: copyOf(subject), mapSeats: { ...SEATS, atlantic: [...ATLANTIC], subjectSW: [...SUBJECT_EXTENT[0]], subjectNE: [...SUBJECT_EXTENT[1]] } };
}

export function copyOf(subject) {
  const pct = (v) => `${Math.round(v)}${NB}%`;
  const upper = (s) => s.toUpperCase();
  const nameOf = (iso, camera, role) => ({
    key: `${camera}:${iso}`,
    iso,
    role,
    camera,
    text: upper(`${FRENCH[iso]} · ${pct(subject.share(iso, LAST))}`).replace(" · ", `${NB}· `),
    from: Math.round(subject.share(iso, FIRST)),
    to: Math.round(subject.share(iso, LAST)),
    /** Every year's reading, 2010 → 2024: what the close-up's word and gauge show as the map replays the years. */
    series: YEARS.map((y) => subject.share(iso, y)),
    slot: role === "odd" ? "feature" : "area",
  });
  return {
    eyebrow: `Charbon · les 12${NB}pays les plus dépendants en 2010`,
    title: [
      `Le charbon a reculé dans les douze${NB}— la Pologne en tire encore plus de la moitié de son électricité`,
      `Le charbon a reculé partout — la Pologne en tire encore plus de la moitié`,
    ],
    /** Two counters: the year, and how many of the twelve stand at or above half that year (the cursor marks the borne). */
    counterSteps: [YEARS.map(String), subject.countByYear.map((n) => `${n}${NB}pays ≥${NB}${HALF}${NB}%`)],
    breaks: BREAKS.map((b) => `${b}${NB}%`),
    missingLabel: "hors des 12",
    source: [
      "Source : Ember, via Our World in Data · © MapTiler © OpenStreetMap",
      "Ember, via OWID · © MapTiler © OpenStreetMap",
      "Ember · © MapTiler © OpenStreetMap",
    ].map((form) => form.replace(" · ", `${NB}· `)),
    names: [nameOf(SUBJECT, "closeUp", "odd"), ...NEIGHBOURS.map((iso) => nameOf(iso, "closeUp", "neighbour")), nameOf(SUBJECT, "overview", "odd")],
  };
}

export function textPerRegisterOf(copy) {
  return {
    display: copy.title.join(" "),
    eyebrow: copy.eyebrow,
    body: copy.source.join(" "),
    annot: copy.missingLabel,
    value: `${copy.counterSteps.flat().join(" ")} 0123456789`,
    axis: [...copy.names.map((n) => n.text), ...copy.breaks, copy.missingLabel, ...copy.source].join(" "),
  };
}

/** The map's words at the video's size: `area` the axis tracked to 0.8 px of the still (× k), `feature` that at 700. */
export function mapRegistersOf({ axis }, k) {
  const area = { ...axis, letterSpacing: Math.max(Number(axis.letterSpacing ?? 0), 0.8 * k) };
  return { area, feature: { ...area, fontWeight: 700 } };
}

const MEASURED = join(HERE, "measured.json");
export function readMeasured() {
  if (!existsSync(MEASURED)) throw new Error("no measured.json beside the beat — run measure.mjs with the worktree's .env loaded");
  return JSON.parse(readFileSync(MEASURED, "utf8"));
}
const cellAt = (grid, x, y) => grid.colours[Math.min(grid.rows - 1, Math.max(0, Math.floor(y / grid.cell))) * grid.cols + Math.min(grid.cols - 1, Math.max(0, Math.floor(x / grid.cell)))];
const near = (a, b, tol = SAME_CELL) => [1, 3, 5].every((i) => Math.abs(Number.parseInt(a.slice(i, i + 2), 16) - Number.parseInt(b.slice(i, i + 2), 16)) <= tol);
const touches = (a, b, air) => a.x < b.x + b.width + air && b.x < a.x + a.width + air && a.y < b.y + b.height + air && b.y < a.y + a.height + air;
/** How far a box stands off a point: 0 inside it. */
const offSeat = (box, p) => Math.hypot(Math.max(box.x - p.x, 0, p.x - box.x - box.width), Math.max(box.y - p.y, 0, p.y - box.y - box.height));
/** Share of a box's cells a predicate holds for. */
function shareOf(grid, box, kind) {
  let hit = 0;
  let total = 0;
  for (let j = Math.max(0, Math.floor(box.y / grid.cell)); j <= Math.min(grid.rows - 1, Math.floor((box.y + box.height) / grid.cell)); j++)
    for (let i = Math.max(0, Math.floor(box.x / grid.cell)); i <= Math.min(grid.cols - 1, Math.floor((box.x + box.width) / grid.cell)); i++) {
      total++;
      if (kind(grid.colours[j * grid.cols + i])) hit++;
    }
  return total ? hit / total : 0;
}

/** @param {{ measured?: any }} [options]  `measured: null` builds the plan and cameras only — what `measure.mjs` reads. */
export function buildDirection(id, { subject, states, copy, mapSeats }, { measured = readMeasured() } = {}) {
  const direction = resolveDirectionFamilies(readDirection(join(DIRECTIONS, `${id}.md`)), textPerRegisterOf(copy));
  const resolved = Object.fromEntries(REGISTER_NAMES.map((name) => [name, registerOf(direction, name)]));
  const scaled = videoRegistersOf(resolved, SIZE);
  const k = scaled.axis.fontSize / resolved.axis.fontSize;
  const registers = { ...scaled, ...mapRegistersOf(scaled, k) };
  const row = sizeFor(SIZE);
  for (const [name, r] of Object.entries(registers)) if (!(r.fontSize >= row.minTypePx)) throw new Error(`${id}: register ${name} is ${r.fontSize}px, under the ${row.minTypePx}px floor`);
  const frame = { width: row.width, height: row.height };
  const inset = frameInsetFor(SIZE);
  const vInset = verticalInsetFor(SIZE);
  const stage = { x: 0, y: 0, ...STAGE };

  const cameras = camerasOf();
  const mapPlan = mapPlanFor({ direction, subject, cameras });
  if (measured === null) return { props: { mapPlan, cameras } };
  if (measured.planDigest?.[id] !== planDigestOf(mapPlan)) throw new Error(`${id}: the plan changed since it was measured — run measure.mjs again`);
  const m = measured.cameras[id];

  // ── the shots ─────────────────────────────────────────────────────────────────────────────────────────
  const titleCard = titleCardFor({ registers, eyebrow: copy.eyebrow, title: copy.title, size: SIZE, eyebrowToDisplay: EYEBROW_TO_DISPLAY });
  const sources = copy.source.flatMap((form) => {
    try {
      return [sourceCreditFor({ registers, forms: [form], size: SIZE, k, ...CREDIT_ONE_LINE })];
    } catch {
      return [];
    }
  });
  if (!sources.length) throw new Error(`${id}: no form of the source holds one line`);
  registers.source = sources[0].register;
  const { counters, ...key } = keyFor({ registers, k, counters: copy.counterSteps, breaks: copy.breaks, missingLabel: copy.missingLabel });

  // ── colours ───────────────────────────────────────────────────────────────────────────────────────────
  const { ground, accent } = direction;
  const { muted } = deriveFurniture(ground);
  const sea = cellAt(m.whole.grid, ...m.whole.projected.atlantic);
  const walk = (colour, on, min = TEXT_CONTRAST_MIN) => {
    const walked = adjustToContrast(colour, on, min);
    if (!walked) throw new Error(`${id}: no variant of ${colour} reads ${min}:1 on ${on}`);
    return walked;
  };
  const colours = {
    ground,
    sea,
    classFills: mapPlan.fills,
    land: mapPlan.tints.land,
    accent: walk(accent, ground),
    text: { eyebrow: walk(registers.eyebrow.fill, ground), title: walk(registers.display.fill, ground), counter: walk(accent, sea), key: walk(muted, sea), source: walk(muted, sea) },
    // A map word stands in a halo of the ground, so its ink is measured against that: the accent to 7:1 for the subject,
    // the muted ink to 4.5:1 for a neighbour.
    name: { odd: walk(accent, ground, 7), neighbour: walk(muted, ground) },
  };
  const strokes = { border: (direction.stroke?.hairline ?? 0.6) * k, rule: (direction.stroke?.rule ?? 1) * k };

  // ── the credit, then the panel: on the open sea of the whole map, in both pictures it is seen over ────────
  const isLand = (c) => !near(c, sea);
  const insideMargins = (b) => b.x >= inset && b.y >= vInset && b.x + b.width <= frame.width - inset && b.y + b.height <= frame.height - vInset;
  const air = GAP * registers.axis.lead;
  let credit = null;
  search: for (const form of sources)
    for (let y = vInset; y + form.height <= frame.height - vInset; y += PANEL_STEP / 4)
      for (let x = inset; x + form.width <= frame.width - inset; x += PANEL_STEP) {
        const box = { x, y, width: form.width, height: form.height };
        if (shareOf(m.whole.grid, box, isLand) === 0) {
          credit = { form, box };
          break search;
        }
      }
  if (!credit) throw new Error(`${id}: no one-line form of the source finds open sea on the whole map`);
  const panelFits = (b) => insideMargins(b) && !touches(b, credit.box, air) && ["whole", "whole2010"].every((p) => shareOf(m[p].grid, b, isLand) <= PANEL_LAND);
  const under = { x: credit.box.x, y: credit.box.y + credit.box.height + air + 1e-6, width: key.width, height: key.height };
  let panelBox = panelFits(under) ? under : null;
  if (!panelBox)
    search: for (let y = frame.height - vInset - key.height; y >= vInset; y -= PANEL_STEP)
      for (let x = inset; x + key.width <= frame.width - inset; x += PANEL_STEP) {
        const b = { x, y, width: key.width, height: key.height };
        if (panelFits(b)) {
          panelBox = b;
          break search;
        }
      }
  if (!panelBox) throw new Error(`${id}: no place seats the ${key.width}×${key.height} panel over at most ${PANEL_LAND * 100} % land`);

  // ── the names: the close-up's with their gauges, and Poland's once the map is whole again ──────────────
  const gaugeOf = (p, n) => {
    if (n.camera !== "closeUp") return { ...p, gauge: null };
    const descent = p.height - p.baseline - p.textX;
    const y = p.baseline + descent + GAUGE.gap * registers.axis.lead;
    const gauge = { x: p.textX, y, width: GAUGE.width * registers.axis.lead, height: GAUGE.height * registers.axis.lead, from: n.from / 100, to: n.to / 100, notch: HALF / 100 };
    return { ...p, width: Math.max(p.width, gauge.width + 2 * p.textX), height: y + gauge.height + p.textX, gauge };
  };
  const pills = copy.names.map((n) => {
    const r = registers[n.slot];
    const halo = haloOf(r, k);
    return gaugeOf({ ...n, register: n.slot, halo, ...pillOf(n.text, r, halo / 2) }, n);
  });
  const measureOf = (camera) => (camera === "closeUp" ? m.closeUp : m.whole);
  const seatOf = (camera, iso) => {
    const at = measureOf(camera).projected[iso];
    if (!at) throw new Error(`${id}: no measured seat for ${iso}`);
    return { x: at[0], y: at[1] };
  };
  const leaderGap = LEADER_GAP * registers.axis.lead;
  const inStage = (b) => b.x >= air && b.y >= air && b.x + b.width <= frame.width - air && b.y + b.height <= frame.height - air;
  const seatedOrLed = (b, s) => offSeat(b, s) === 0 || s.x < b.x - leaderGap || s.x > b.x + b.width + leaderGap || s.y < b.y - leaderGap || s.y > b.y + b.height + leaderGap;
  const placed = {};
  const centred = (p, s) => ({ x: s.x - p.width / 2, y: s.y - p.height / 2, width: p.width, height: p.height });

  // The close-up: Poland centred on its seat; each neighbour over its seat or led to it, clear of Poland's word, the
  // leader not crossing it; the order of the neighbours that keeps them nearest their seats wins.
  const odd = pills.find((p) => p.camera === "closeUp" && p.role === "odd");
  const oddBox = centred(odd, seatOf("closeUp", SUBJECT));
  if (!inStage(oddBox)) throw new Error(`${id}: Poland's close-up word leaves the stage`);
  placed[odd.key] = oddBox;
  const leaderClear = (b, s, avoid) => {
    const to = { x: Math.min(Math.max(s.x, b.x), b.x + b.width), y: Math.min(Math.max(s.y, b.y), b.y + b.height) };
    for (let i = 0; i <= 32; i++) if (touches({ x: s.x + ((to.x - s.x) * i) / 32, y: s.y + ((to.y - s.y) * i) / 32, width: 0, height: 0 }, avoid, 0)) return false;
    return true;
  };
  const candidates = pills
    .filter((p) => p.camera === "closeUp" && p.role !== "odd")
    .map((p) => {
      const s = seatOf("closeUp", p.iso);
      const reach = LED_REACH * p.height;
      const positions = [];
      for (let y = s.y - p.height - reach; y <= s.y + reach; y += CLOSE_STEP)
        for (let x = s.x - p.width - reach; x <= s.x + reach; x += CLOSE_STEP) {
          const b = { x, y, width: p.width, height: p.height };
          const off = offSeat(b, s);
          if (off > reach || !inStage(b) || touches(b, oddBox, air) || !seatedOrLed(b, s) || (off > 0 && !leaderClear(b, s, oddBox))) continue;
          positions.push({ b, off, moved: Math.hypot((x + p.width / 2 - s.x) / (p.width / 2), (y + p.height / 2 - s.y) / p.height) });
        }
      if (!positions.length) throw new Error(`${id}: no place within ${LED_REACH} heights of its seat holds ${p.text} on the close-up`);
      return { key: p.key, positions: positions.sort((u, v) => u.moved - v.moved) };
    });
  const orders = (list) => (list.length <= 1 ? [list] : list.flatMap((x, i) => orders([...list.slice(0, i), ...list.slice(i + 1)]).map((o) => [x, ...o])));
  let best = null;
  for (const order of orders(candidates)) {
    const boxes = [oddBox];
    const chosen = {};
    let cost = 0;
    for (const item of order) {
      const at = item.positions.find((c) => !boxes.some((b) => touches(c.b, b, air)));
      if (!at) {
        cost = Infinity;
        break;
      }
      boxes.push(at.b);
      chosen[item.key] = at.b;
      cost += at.moved;
    }
    if (cost < (best?.cost ?? Infinity)) best = { cost, chosen };
  }
  if (!best) throw new Error(`${id}: no order of the close-up's names places them all`);
  Object.assign(placed, best.chosen);

  // The whole map: Poland's word BESIDE its outline — a word across its own outline is struck through by it — east of
  // it first, then west, below, above; the side nearest the seat that stays inside the stage and clear of the panel
  // and the credit wins.
  const overview = pills.find((p) => p.camera === "overview");
  {
    const s = seatOf("overview", SUBJECT);
    const sw = seatOf("overview", "subjectSW");
    const ne = seatOf("overview", "subjectNE");
    const extent = { x: sw.x, y: ne.y, width: ne.x - sw.x, height: sw.y - ne.y };
    const sides = [
      { ...overview, x: extent.x + extent.width + air, y: s.y - overview.height / 2 },
      { ...overview, x: extent.x - air - overview.width, y: s.y - overview.height / 2 },
      { ...overview, x: s.x - overview.width / 2, y: extent.y + extent.height + air },
      { ...overview, x: s.x - overview.width / 2, y: extent.y - air - overview.height },
    ].map((b) => ({ x: b.x, y: b.y, width: overview.width, height: overview.height }));
    const at = sides.find((b) => inStage(b) && !touches(b, panelBox, air) && !touches(b, credit.box, air)) ?? null;
    if (!at) throw new Error(`${id}: no place near Poland's seat holds its word on the whole map`);
    placed[overview.key] = at;
  }

  const names = pills.map((p) => {
    const b = placed[p.key];
    const s = seatOf(p.camera, p.iso);
    const ink = p.role === "odd" ? colours.name.odd : colours.name.neighbour;
    const leader = p.role === "odd" || offSeat(b, s) === 0 ? null : { from: s, to: { x: Math.min(Math.max(s.x, b.x), b.x + b.width), y: Math.min(Math.max(s.y, b.y), b.y + b.height) }, dot: LEADER_DOT * registers.axis.lead };
    return { key: p.key, iso: p.iso, role: p.role, camera: p.camera, register: p.register, text: p.text, from: p.from, to: p.to, series: p.series, textWidth: p.textWidth, width: p.width, height: p.height, textX: p.textX, baseline: p.baseline, halo: p.halo, gauge: p.gauge, x: b.x, y: b.y, ink, leader };
  });

  const props = {
    frame,
    stage,
    registers: Object.fromEntries(DRAWN_REGISTERS.map((name) => [name, registers[name]])),
    titleCard,
    source: { ...credit.form, at: { x: credit.box.x, y: credit.box.y } },
    panel: { ...key, counters, cursorBorne: BREAKS.indexOf(HALF), at: { x: panelBox.x, y: panelBox.y } },
    colours,
    strokes,
    names,
    cameras,
    mapPlan,
    states,
    yearCount: YEARS.length,
    timing: COAL_VIDEO_TIMING,
  };
  return { id, direction, props, report: { k, titleForm: titleCard.form, titleSize: titleCard.register.fontSize, sourceText: credit.form.lines[0].text, panel: panelBox, credit: credit.box } };
}
