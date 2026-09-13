// EVERYTHING ONE DIRECTION'S RENDER IS HANDED, BUILT IN BUN — the words, the rows, the colours, the map's
// shapes, the two cameras, every name's pill placed in each, and the states. The runner renders what this
// returns; the tests read the same object, so what is asserted is what is drawn.
//
// Runs in Bun only.

import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { adjustToContrast, TEXT_CONTRAST_MIN } from "#shared/chart-beat/colour.mjs";
import { deriveFurniture } from "#shared/chart-beat/render-still.mjs";
import { sizeFor } from "#shared/chart-video/sizes.mjs";
import { readDirection } from "#shared/design-base/read-direction.mjs";
import { registerOf } from "#shared/design-base/register.mjs";
import { resolveDirectionFamilies } from "#shared/design-base/resolve-families.mjs";
import { plateTints, WATER_HUE } from "#shared/map-beat/tints.mjs";
import { videoRegistersOf } from "../../skills/map-beat/scripts/video-registers.mjs";
import { loadSubject, rampFor } from "../static-choropleth-europe-lowcarbon/beat.mjs";
import { CLIP_MARGIN, FRAME, unmeasuredNeighboursOf, videoGeometry } from "./geometry.mjs";
import { layoutFor, pillOf, SLOT_REGISTERS, widthOf } from "./layout.mjs";
import { closeUpViewBox, overviewViewBox, placePills, toStage } from "./scene.mjs";
import { statesFor } from "./states.mjs";
import { CHOROPLETH_VIDEO_TIMING } from "./timing-contract.ts";
import { measureTextBand } from "#shared/chart-beat/render-still.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
export const ROOT = join(HERE, "..", "..");
export const DIRECTIONS = join(ROOT, "docs", "design-base", "directions");
export const SIZE = "landscape";
export const REGISTER_NAMES = ["display", "eyebrow", "body", "annot", "value", "axis"];
/** The registers the composition draws with — `body` is resolved for the ladder's factor, never drawn. */
export const DRAWN_REGISTERS = ["display", "eyebrow", "value", "axis", "annot"];
const NB = " ";
/** The air a pill keeps from another pill and from the stage's edge, × the axis lead. */
const PILL_GAP = 0.25;
/** Points sampled along a sea name's box, per row, to find land under it. */
const SEA_SAMPLES = 24;
/** The side, in stage pixels, of the cells a pill's cover of other countries is counted on. */
const OWNER_CELL = 8;
/** The order names are placed in, per camera: the subject, the claim, its neighbours, the absence. */
const ROLE_PRIORITY = ["odd", "top", "neighbour", "missing"];
/** A cell of a NAMED country's land hidden under another country's name counts this many times: a word
 *  set on France reads as naming France, so « Suisse » steps beside France's name rather than over France,
 *  and at the close-up the neighbours' names sit around Albania rather than on it. */
const NAMED_COVER = 4;
/** The side, in stage pixels, of the cells the panel's cover of land is counted on. */
const PANEL_CELL = 16;
/** The step, in stage pixels, of the positions the panel is tried at. */
const PANEL_STEP = 20;

// ── the subject, its geometry and its words ─────────────────────────────────────────────────────────────

export function loadBeat() {
  const subject = loadSubject({ dir: join(HERE, "..", "static-choropleth-europe-lowcarbon") });
  const geometry = videoGeometry(subject);
  const states = statesFor(subject, geometry);
  return { subject, geometry, states, copy: copyOf(subject) };
}

export function copyOf(subject) {
  const { value, above, neighbours, unreported, ODD_ONE, FLOOR, BREAKS, french } = subject;
  const pct = (v) => `${Math.round(v)}${NB}%`;
  const topSix = above.filter((r) => r.iso !== ODD_ONE).map((r) => r.iso);
  const kosovo = unmeasuredNeighboursOf(subject, ODD_ONE);
  if (kosovo.length !== 1 || kosovo[0].name !== "Kosovo")
    throw new Error(`the close-up names one unmeasured neighbour, Kosovo; the rings give ${JSON.stringify(kosovo)}`);
  const oddText = `${french(ODD_ONE)} · ${pct(value.get(ODD_ONE).lowCarbon)}`;
  return {
    eyebrow: "Énergie · Europe",
    /** The scrolly's own three forms (`render-directions-scrolly.mjs`). */
    title: [
      `Sept pays européens dépassent ${FLOOR}${NB}% d’électricité bas-carbone — six au nord-ouest, et l’Albanie`,
      `Le bas-carbone européen est au nord-ouest — et en Albanie`,
      `Le bas-carbone européen, et son exception`,
    ],
    /** THE FLOOR'S STEPS: every reporting country, then how many stand at or above each borne in turn — the
     *  counter the cursor steps through (BRIEF.md). The last one is the claim. */
    /** THE END CARD'S CLAIM, stated once its evidence has been shown — longest form first. */
    claim: [
      `Sept pays dépassent ${FLOOR}${NB}% d’électricité bas-carbone : six au nord-ouest, et l’Albanie, dont les ${neighbours.length} voisins mesurés sont tous sous ${subject.NEIGHBOUR_CEILING}${NB}%.`,
      `Sept pays dépassent ${FLOOR}${NB}% : six au nord-ouest, et l’Albanie.`,
    ],
    counterSteps: [
      `${value.size} pays`,
      ...BREAKS.map((b) => `${[...value.values()].filter((v) => v.lowCarbon >= b).length} pays au-dessus de ${b}${NB}%`),
    ],
    breaks: BREAKS.map((b) => `${b}${NB}%`),
    unit: "part bas-carbone de la production",
    missingLabel: "donnée non rapportée",
    source: [
      "Source : Ember, Energy Institute – Statistical Review of World Energy (2025), via Our World in Data · contours Natural Earth 50 m",
      "Source : Ember, Energy Institute (2025), via Our World in Data · contours Natural Earth 50 m",
      "Source : Ember, Energy Institute, via Our World in Data · Natural Earth",
    ],
    names: [
      ...topSix.map((iso) => ({ key: `top:${iso}`, seat: iso, role: "top", camera: "overview", text: french(iso), slot: "name", accent: true })),
      { key: `odd:${ODD_ONE}`, seat: ODD_ONE, role: "odd", camera: "overview", text: oddText, slot: "name", accent: true },
      { key: `missing:${unreported[0].iso}`, seat: unreported[0].iso, role: "missing", camera: "overview", text: `${french(unreported[0].iso)} · donnée non rapportée`, slot: "name", accent: false },
      { key: `close:${ODD_ONE}`, seat: ODD_ONE, role: "odd", camera: "closeUp", text: oddText, slot: "oddName", accent: true },
      ...neighbours.map((iso) => ({ key: `neighbour:${iso}`, seat: iso, role: "neighbour", camera: "closeUp", text: `${french(iso)} · ${pct(value.get(iso).lowCarbon)}`, slot: "name", accent: false })),
      { key: `neighbour:${kosovo[0].key}`, seat: kosovo[0].key, role: "neighbour", camera: "closeUp", text: "Kosovo, hors données", slot: "name", accent: false },
    ],
    /** The scrolly's three seas, at their declared centres. */
    waters: [
      { key: "water:north", text: "Mer du Nord", lon: 3.0, lat: 56.5 },
      { key: "water:med", text: "Méditerranée", lon: 15.0, lat: 36.0 },
      { key: "water:baltic", text: "Baltique", lon: 19.5, lat: 58.0 },
    ],
  };
}

/** The words each register sets — the families are resolved on these, not on the still's copy. */
export function textPerRegisterOf(copy) {
  const bySlot = (slot) => copy.names.filter((n) => n.slot === slot).map((n) => n.text);
  return {
    display: [...copy.title, ...copy.claim].join(" "),
    eyebrow: copy.eyebrow,
    body: copy.source.join(" "),
    annot: copy.waters.map((w) => w.text).join(" "),
    value: `${copy.counterSteps.join(" ")} 0123456789 ${bySlot("oddName").join(" ")}`,
    axis: [...bySlot("name"), ...copy.breaks, copy.unit, copy.missingLabel, ...copy.source].join(" "),
  };
}

// ── one direction ──────────────────────────────────────────────────────────────────────────────────────

const ringsOf = (path) =>
  path
    .split("Z")
    .filter(Boolean)
    .map((ring) => ring.replace(/^M/, "").split("L").map((p) => p.split(" ").map(Number)));
function insideRing(ring, x, y) {
  let hit = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) hit = !hit;
  }
  return hit;
}

const faceOf = (r) => ({ fontSize: r.fontSize, fontWeight: r.fontWeight, fontFamily: r.fontFamily, fontStyle: r.fontStyle === "italic" ? "italic" : "normal" });

export function buildDirection(id, { subject, geometry, states, copy }) {
  const direction = resolveDirectionFamilies(readDirection(join(DIRECTIONS, `${id}.md`)), textPerRegisterOf(copy));
  const resolved = Object.fromEntries(REGISTER_NAMES.map((name) => [name, registerOf(direction, name)]));
  const scaled = videoRegistersOf(resolved, SIZE);
  const layout = layoutFor({ registers: scaled, copy, size: SIZE });
  const registers = layout.registers;
  const k = scaled.axis.fontSize / resolved.axis.fontSize;
  const { stage } = layout;
  const gap = PILL_GAP * registers.axis.lead;

  // ── colours, every one from the direction ─────────────────────────────────────────────────────────────
  const { ground, accent } = direction;
  const { ink, muted, grid } = deriveFurniture(ground);
  const tints = plateTints(direction);
  const ramp = rampFor(direction, subject);
  const onGround = (colour) => {
    const walked = adjustToContrast(colour, ground, TEXT_CONTRAST_MIN);
    if (!walked) throw new Error(`no variant of ${colour} reads on ${ground}`);
    return walked;
  };
  const colours = {
    ground,
    sea: tints.water,
    land: tints.land,
    border: grid,
    classFills: Array.from({ length: subject.BREAKS.length + 1 }, (_, i) => ramp.classFill(i)),
    missingFill: ramp.missingFill,
    ring: onGround(accent),
    text: {
      eyebrow: onGround(registers.eyebrow.fill),
      title: onGround(registers.display.fill),
      counter: onGround(accent),
      key: onGround(muted),
      source: onGround(muted),
      nameAccent: onGround(accent),
      nameInk: onGround(ink),
      water: adjustToContrast(WATER_HUE, tints.water, TEXT_CONTRAST_MIN) ?? onGround(ink),
    },
  };

  // ── shapes ─────────────────────────────────────────────────────────────────────────────────────────
  const seven = new Set(subject.above.map((r) => r.iso));
  const study = new Set(subject.studySet);
  const shapes = geometry.shapes.map((s) => {
    const v = subject.value.get(s.iso);
    return {
      key: s.iso,
      path: s.path,
      studied: study.has(s.iso),
      classIndex: v ? ramp.classOf(v.lowCarbon) : null,
      kept: seven.has(s.iso),
      fill: !study.has(s.iso) ? colours.land : v ? colours.land : colours.missingFill,
    };
  });
  const shapeOf = (key) => {
    const shape = geometry.shapes.find((s) => s.iso === key);
    if (!shape) throw new Error(`${key} is named but has no drawn shape`);
    return shape;
  };

  // ── names: pills, the two cameras, and every pill placed once per camera ─────────────────────────────
  const pills = copy.names.map((n) => ({
    ...n,
    register: SLOT_REGISTERS[n.slot],
    ...pillOf(n.text, registers[SLOT_REGISTERS[n.slot]]),
    seatAt: shapeOf(n.seat).seat,
    reach: Math.max(shapeOf(n.seat).box.w, shapeOf(n.seat).box.h),
  }));
  const odd = shapeOf(subject.ODD_ONE);
  const ringRadius = Math.max(odd.box.w, odd.box.h) / 2;
  const strokes = { border: (direction.stroke?.hairline ?? 0.6) * k, ring: (direction.stroke?.rule ?? 1) * k };
  const cameras = {
    overview: overviewViewBox(FRAME, stage),
    closeUp: closeUpViewBox(
      stage,
      odd.seat,
      pills.filter((p) => p.camera === "closeUp").map((p) => ({ seat: p.seatAt, width: p.width, height: p.height })),
      gap,
    ),
  };
  // ── the panel: seated where it covers the least land at the overview ─────────────────────────────────────
  // The story runs on the whole frame, so the count and the key sit OVER the map; the place is measured, not
  // chosen: every position on a `PANEL_STEP` grid inside the margins is tried, and the one whose box covers the
  // fewest cells of land under the overview camera wins (ties: lower, then further left — the Atlantic's side).
  const allRings = geometry.shapes.map((sh) => ({ box: sh.box, rings: ringsOf(sh.path) }));
  const landAt = (vb, sx, sy) => {
    const x = vb.x + (sx / stage.width) * vb.w;
    const y = vb.y + (sy / stage.height) * vb.h;
    return allRings.some((sh) => x >= sh.box.x && x <= sh.box.x + sh.box.w && y >= sh.box.y && y <= sh.box.y + sh.box.h && sh.rings.some((ring) => insideRing(ring, x, y)));
  };
  const landCols = Math.ceil(stage.width / PANEL_CELL);
  const landRows = Math.ceil(stage.height / PANEL_CELL);
  const land = new Uint8Array(landCols * landRows);
  for (let j = 0; j < landRows; j++)
    for (let i = 0; i < landCols; i++) land[j * landCols + i] = landAt(cameras.overview, (i + 0.5) * PANEL_CELL, (j + 0.5) * PANEL_CELL) ? 1 : 0;
  const landShare = (box) => {
    let covered = 0;
    let total = 0;
    for (let j = Math.floor(box.y / PANEL_CELL); j < Math.ceil((box.y + box.height) / PANEL_CELL); j++)
      for (let i = Math.floor(box.x / PANEL_CELL); i < Math.ceil((box.x + box.width) / PANEL_CELL); i++) {
        total++;
        covered += land[j * landCols + i] ?? 0;
      }
    return total ? covered / total : 0;
  };
  const { inset, vInset, panel: panelLayout } = layout;
  let panelAt = null;
  for (let y = stage.height - vInset - panelLayout.height; y >= vInset; y -= PANEL_STEP)
    for (let x = inset; x + panelLayout.width <= stage.width - inset; x += PANEL_STEP) {
      const share = landShare({ x, y, width: panelLayout.width, height: panelLayout.height });
      if (!panelAt || share < panelAt.share - 1e-9) panelAt = { x, y, share };
    }
  if (!panelAt) throw new Error(`a ${panelLayout.width}×${panelLayout.height} panel does not fit inside the margins`);
  const panelBox = { x: panelAt.x, y: panelAt.y, width: panelLayout.width, height: panelLayout.height };

  /** WHICH COUNTRY IS UNDER EACH CELL of the stage, per camera — so a pill can prefer the sea, context land
   *  or its own country over a neighbour whose class it would hide. */
  const ownerOf = (camera) => {
    const vb = cameras[camera];
    const cols = Math.ceil(stage.width / OWNER_CELL);
    const rows = Math.ceil(stage.height / OWNER_CELL);
    const grid = new Array(cols * rows).fill(null);
    const studied = geometry.shapes
      .filter((sh) => study.has(sh.iso))
      .map((sh) => ({ iso: sh.iso, box: sh.box, rings: ringsOf(sh.path) }));
    for (let j = 0; j < rows; j++)
      for (let i = 0; i < cols; i++) {
        const x = vb.x + (((i + 0.5) * OWNER_CELL) / stage.width) * vb.w;
        const y = vb.y + (((j + 0.5) * OWNER_CELL) / stage.height) * vb.h;
        const hit = studied.find((sh) => x >= sh.box.x && x <= sh.box.x + sh.box.w && y >= sh.box.y && y <= sh.box.y + sh.box.h && sh.rings.some((r) => insideRing(r, x, y)));
        grid[j * cols + i] = hit ? hit.iso : null;
      }
    return { grid, cols, rows };
  };
  const coverFor = (camera) => {
    const { grid, cols, rows } = ownerOf(camera);
    const named = new Set(pills.filter((p) => p.camera === camera).map((p) => p.seat));
    return (box, key) => {
      const pill = pills.find((p) => p.key === key);
      const own = pill.seat;
      let covered = 0;
      let total = 0;
      for (let j = Math.max(0, Math.floor(box.y / OWNER_CELL)); j < Math.min(rows, Math.ceil((box.y + box.height) / OWNER_CELL)); j++)
        for (let i = Math.max(0, Math.floor(box.x / OWNER_CELL)); i < Math.min(cols, Math.ceil((box.x + box.width) / OWNER_CELL)); i++) {
          total++;
          const owner = grid[j * cols + i];
          if (owner !== null && owner !== own) covered += named.has(owner) ? NAMED_COVER : 1;
        }
      return total ? covered / total : 0;
    };
  };
  /** Albania's own box, in stage pixels under a camera. */
  const subjectBoxAt = (vb) => {
    const a = toStage(vb, stage, { x: odd.box.x, y: odd.box.y });
    const b = toStage(vb, stage, { x: odd.box.x + odd.box.w, y: odd.box.y + odd.box.h });
    return { x: a.x, y: a.y, width: b.x - a.x, height: b.y - a.y };
  };
  /** Albania's ring, in stage pixels under a camera — the obstacle its own overview name steps beside. */
  const ringPxAt = (vb) => (ringRadius / vb.w) * stage.width + strokes.ring;
  const placed = {};
  for (const camera of ["overview", "closeUp"]) {
    const items = pills
      .filter((p) => p.camera === camera)
      // PRIORITY: Albania first — the centre of the close-up, the side of its own ring at the overview; then
      // the names the claim is about before the one it is not (the six before Ukraine); within a role the
      // larger country keeps its seat and the smaller one steps clear, a small country's pill already
      // reaching past its borders.
      .sort((a, b) => ROLE_PRIORITY.indexOf(a.role) - ROLE_PRIORITY.indexOf(b.role) || b.reach - a.reach)
      .map((p) => {
        const at = toStage(cameras[camera], stage, p.seatAt);
        // At the close-up no other country's name may sit on Albania: the shot is there to show it.
        const avoid = camera === "closeUp" && p.role !== "odd" ? [subjectBoxAt(cameras.closeUp)] : [];
        const slack = camera === "overview" && p.role === "odd" ? ringPxAt(cameras.overview) : 0;
        return { key: p.key, cx: at.x, cy: at.y, width: p.width, height: p.height, avoid, slack };
      });
    // At the overview the ring is smaller than Albania's own pill: a pill centred on the seat would hide the
    // ring entirely, so the ring is kept clear and the name steps beside it. At the close-up the ring
    // encloses Albania's name, as in the scrolly.
    const ringAt = toStage(cameras.overview, stage, odd.seat);
    const ringPx = (ringRadius / cameras.overview.w) * stage.width + strokes.ring;
    const obstacles = camera === "overview" ? [{ x: ringAt.x - ringPx, y: ringAt.y - ringPx, width: 2 * ringPx, height: 2 * ringPx }, panelBox] : [];
    // COVER IS WEIGHED AT THE OVERVIEW ONLY. There a name is wider than most countries and has to choose what
    // it hides; in the close-up every country is larger than its name, and the seat itself is the place —
    // weighing cover there walked « Macédoine du Nord » off North Macedonia onto the sea past Albania.
    Object.assign(placed, placePills(items, stage, gap, camera === "overview" ? { obstacles, cover: coverFor(camera) } : { obstacles }));
  }
  const names = pills.map(({ seatAt, slot, reach, ...p }) => ({ ...p, seat: { ...toStage(cameras[p.camera], stage, seatAt) }, ...placed[p.key] }));

  // ── seas: at the overview only, and only where the whole word lies over sea and no name touches it ─────
  // The scrolly's 12 px sea names sat in open water; at the video's size the same word at the same centre
  // can run onto land, and a sea's name written across Denmark names the wrong thing.
  const rings = geometry.shapes.flatMap((sh) => ringsOf(sh.path));
  const onLand = (x, y) => rings.some((ring) => insideRing(ring, x, y));
  const overSea = (box) => {
    const vb = cameras.overview;
    for (let i = 0; i <= SEA_SAMPLES; i++)
      for (let j = 0; j <= 2; j++) {
        const sx = box.x + (box.width * i) / SEA_SAMPLES;
        const sy = box.y + (box.height * j) / 2;
        if (onLand(vb.x + (sx / stage.width) * vb.w, vb.y + (sy / stage.height) * vb.h)) return false;
      }
    return true;
  };
  const annot = registers.annot;
  const waters = copy.waters
    .map((w) => {
      const text = w.text;
      const width = widthOf(text, annot);
      const band = measureTextBand(text, faceOf(annot));
      const [ux, uy] = geometry.project([w.lon, w.lat]);
      const at = toStage(cameras.overview, stage, { x: ux, y: uy });
      return { key: w.key, text, width, x: at.x - width / 2, y: at.y + (band.ascent - band.descent) / 2, box: { x: at.x - width / 2, y: at.y - band.ascent, width, height: band.ascent + band.descent } };
    })
    .filter(({ box }) => {
      const touches = names
        .filter((n) => n.camera === "overview")
        .some((n) => box.x < n.x + n.width + gap && n.x < box.x + box.width + gap && box.y < n.y + n.height + gap && n.y < box.y + box.height + gap);
      const inside = box.x >= gap && box.y >= gap && box.x + box.width <= stage.width - gap && box.y + box.height <= stage.height - gap;
      const underPanel = box.x < panelBox.x + panelBox.width + gap && panelBox.x < box.x + box.width + gap && box.y < panelBox.y + panelBox.height + gap && panelBox.y < box.y + box.height + gap;
      return inside && !touches && !underPanel && overSea(box);
    });

  const strokeScale = sizeFor(SIZE).typeScale;
  const props = {
    frame: layout.frame,
    stage,
    registers: Object.fromEntries(DRAWN_REGISTERS.map((name) => [name, registers[name]])),
    titleCard: layout.titleCard,
    endCard: layout.endCard,
    panel: { ...panelLayout, at: { x: panelBox.x, y: panelBox.y } },
    colours,
    strokes,
    seaBox: { x: -CLIP_MARGIN.x, y: -CLIP_MARGIN.y, w: FRAME.width + 2 * CLIP_MARGIN.x, h: FRAME.height + 2 * CLIP_MARGIN.y },
    shapes,
    ring: { cx: odd.seat.x, cy: odd.seat.y, r: ringRadius },
    subjectBox: odd.box,
    names,
    waters: waters.map(({ box, ...w }) => w),
    cameras,
    states,
    timing: CHOROPLETH_VIDEO_TIMING,
  };
  return { id, direction, layout, props, report: { k, strokeScale, titleForm: layout.titleCard.form, titleSize: layout.titleCard.register.fontSize, titleLines: layout.titleCard.title.length, claimForm: layout.endCard.form, sourceForm: layout.endCard.source.form, stage, panel: panelBox, panelLand: panelAt.share, droppedWaters: copy.waters.length - waters.length } };
}
