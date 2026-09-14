// EVERYTHING ONE DIRECTION'S RENDER IS HANDED, BUILT IN BUN — the words, the rows, the colours, the map's
// shapes, the two cameras, every name's pill placed in each, and the states. The runner renders what this
// returns; the tests read the same object, so what is asserted is what is drawn.
//
// Runs in Bun only.

import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { adjustToContrast, contrast, TEXT_CONTRAST_MIN } from "#shared/chart-beat/colour.mjs";
import { deriveFurniture } from "#shared/chart-beat/render-still.mjs";
import { sizeFor } from "#shared/chart-video/sizes.mjs";
import { readDirection } from "#shared/design-base/read-direction.mjs";
import { registerOf } from "#shared/design-base/register.mjs";
import { resolveDirectionFamilies } from "#shared/design-base/resolve-families.mjs";
import { plateTints, WATER_HUE } from "#shared/map-beat/tints.mjs";
import { videoRegistersOf } from "../../skills/map-beat/scripts/video-registers.mjs";
import { copyOf as stillCopyOf, loadSubject, rampFor } from "../static-choropleth-europe-lowcarbon/beat.mjs";
import { CLIP_MARGIN, FRAME, unmeasuredNeighboursOf, videoGeometry } from "./geometry.mjs";
import { haloOf, layoutFor, mapRegistersOf, pillOf, SLOT_REGISTERS, widthOf } from "./layout.mjs";
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
export const DRAWN_REGISTERS = ["display", "eyebrow", "value", "axis", "area", "feature", "closeFeature", "water", "source"];
const NB = " ";
/** The air a pill keeps from another pill and from the stage's edge, × the axis lead. */
const PILL_GAP = 0.25;
/** Points sampled along a sea name's box, per row, to find land under it. */
const SEA_SAMPLES = 24;
/** The side, in stage pixels, of the cells a pill's cover of other countries is counted on. */
const OWNER_CELL = 8;
/** The order names are placed in, per camera: the subject, the claim, its neighbours, the absence, the context. */
const ROLE_PRIORITY = ["odd", "top", "neighbour", "missing", "context"];
/** A sea's name is searched on rings around its declared centre: this many rings, each this × the axis lead
 *  further out, at `SEA_ANGLES` angles — two and a half leads at most. Further, the word leaves its sea: the
 *  first search walked « Mer Baltique » into the Norwegian Sea and « Médit. » onto the Black Sea. */
const SEA_RINGS = 10;
const SEA_RING_STEP = 0.25;
const SEA_ANGLES = 16;
/** A cell of a NAMED country's land hidden under another country's name counts this many times: a word
 *  set on France reads as naming France, so « Suisse » steps beside France's name rather than over France,
 *  and at the close-up the neighbours' names sit around Albania rather than on it. */
const NAMED_COVER = 4;
/** The share of its box over land the source may take — a coast's pixel, not a country. */
const SOURCE_LAND = 0.03;
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
  const { value, above, neighbours, unreported, ranked, ODD_ONE, FLOOR, BREAKS, french } = subject;
  const still = stillCopyOf(subject);
  const upper = (text) => text.toUpperCase();
  const pct = (v) => `${Math.round(v)}${NB}%`;
  const topSix = above.filter((r) => r.iso !== ODD_ONE).map((r) => r.iso);
  const kosovo = unmeasuredNeighboursOf(subject, ODD_ONE);
  if (kosovo.length !== 1 || kosovo[0].name !== "Kosovo")
    throw new Error(`the close-up names one unmeasured neighbour, Kosovo; the rings give ${JSON.stringify(kosovo)}`);
  const oddText = upper(`${french(ODD_ONE)} · ${pct(value.get(ODD_ONE).lowCarbon)}`);
  return {
    eyebrow: "Énergie · Europe",
    /** The scrolly's two shorter forms: the title card is read in a second and a half, and the story shows the rest. */
    title: [`Le bas-carbone européen est au nord-ouest — et en Albanie`, `Le bas-carbone européen, et son exception`],
    /** THE FLOOR'S STEPS: every reporting country, then how many stand at or above each borne in turn — the count
     *  alone; the cursor on the bornes says which share it is above. The last one is the claim, and it stays. */
    counterSteps: [`${value.size} pays`, ...BREAKS.map((b) => `${[...value.values()].filter((v) => v.lowCarbon >= b).length} pays`)],
    breaks: BREAKS.map((b) => `${b}${NB}%`),
    missingLabel: "sans donnée",
    source: [
      "Source : Ember, Energy Institute – Statistical Review of World Energy (2025), via Our World in Data · contours Natural Earth 50 m",
      "Source : Ember, Energy Institute (2025), via Our World in Data · contours Natural Earth 50 m",
      "Source : Ember, Energy Institute, via Our World in Data · Natural Earth",
    ].map((form) => form.replace(" · ", `${NB}· `)),
    /** THE STILL'S ANATOMY: the seven the claim is about set as features, every other name as an area,
     *  uppercased; the three lowest shares named as the still names them. `klass` picks the ink's floor. */
    names: [
      ...topSix.map((iso) => ({ key: `top:${iso}`, seat: iso, role: "top", camera: "overview", text: upper(french(iso)), slot: "featureName", klass: "feature" })),
      // At the overview the names are the still's: the country alone — the share was counted at the close-up, and
      // « donnée non rapportée » is the key's own swatch.
      { key: `odd:${ODD_ONE}`, seat: ODD_ONE, role: "odd", camera: "overview", text: upper(french(ODD_ONE)), slot: "featureName", klass: "feature" },
      ...ranked.slice(-3).map((r) => ({ key: `context:${r.iso}`, seat: r.iso, role: "context", camera: "overview", text: upper(french(r.iso)), slot: "name", klass: "area" })),
      { key: `close:${ODD_ONE}`, seat: ODD_ONE, role: "odd", camera: "closeUp", text: oddText, slot: "oddName", klass: "feature" },
      ...neighbours.map((iso) => ({ key: `neighbour:${iso}`, seat: iso, role: "neighbour", camera: "closeUp", text: upper(`${french(iso)} · ${pct(value.get(iso).lowCarbon)}`), slot: "name", klass: "area" })),
      { key: `neighbour:${kosovo[0].key}`, seat: kosovo[0].key, role: "neighbour", camera: "closeUp", text: upper("Kosovo, hors données"), slot: "name", klass: "area" },
    ],
    /** The still's three seas, each with its ladder of forms, at their declared centres. */
    // An abbreviation (« Mer du N. ») is the printed plate's last resort; a frame watched from across a room
    // names the sea in full or not at all.
    //
    // THE STILL'S THREE SEAS, AND THE WATERS THE VIDEO'S CAMERA ADDS. The still crops Europe to its plate and names
    // the three seas that crop can carry; the video's overview runs edge to edge over the whole camera window, and
    // the open water it shows — the Atlantic, the Norwegian Sea, the Black Sea — is where a name has room. Each is
    // declared at its own centre; the search keeps it there or drops it.
    waters: [
      ...still.waters.map((w, i) => ({ key: `water:${i}`, forms: w.forms.filter((f) => !f.endsWith(".")), lon: w.lon, lat: w.lat })),
      { key: "water:atlantic", forms: ["Océan Atlantique", "Atlantique"], lon: -17.0, lat: 56.0 },
      { key: "water:norwegian", forms: ["Mer de Norvège"], lon: 1.0, lat: 67.0 },
      { key: "water:black", forms: ["Mer Noire"], lon: 34.0, lat: 43.3 },
    ],
  };
}

/** The words each register sets — the families are resolved on these, not on the still's copy. */
export function textPerRegisterOf(copy) {
  const bySlot = (slot) => copy.names.filter((n) => n.slot === slot).map((n) => n.text);
  return {
    display: copy.title.join(" "),
    eyebrow: copy.eyebrow,
    body: copy.source.join(" "),
    annot: copy.waters.flatMap((w) => w.forms).join(" "),
    value: `${copy.counterSteps.join(" ")} 0123456789 ${bySlot("oddName").join(" ")}`,
    axis: [...bySlot("name"), ...bySlot("featureName"), ...copy.waters.flatMap((w) => w.forms), ...copy.breaks, copy.missingLabel, ...copy.source].join(" "),
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
  const k = scaled.axis.fontSize / resolved.axis.fontSize;
  const layout = layoutFor({ registers: { ...scaled, ...mapRegistersOf(scaled, k) }, copy, size: SIZE, k });
  const registers = layout.registers;
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
      // The count and the key stand on the sea, in their halo.
      counter: adjustToContrast(accent, tints.water, TEXT_CONTRAST_MIN) ?? onGround(accent),
      key: adjustToContrast(muted, tints.water, TEXT_CONTRAST_MIN) ?? onGround(muted),
      source: adjustToContrast(muted, tints.water, TEXT_CONTRAST_MIN) ?? onGround(muted),
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
  // A map word has no pill: its box is the word and the halo's reach around it.
  const pills = copy.names.map((n) => ({
    ...n,
    register: SLOT_REGISTERS[n.slot],
    halo: haloOf(registers[SLOT_REGISTERS[n.slot]], k),
    ...pillOf(n.text, registers[SLOT_REGISTERS[n.slot]], haloOf(registers[SLOT_REGISTERS[n.slot]], k) / 2),
    seatAt: shapeOf(n.seat).seat,
    reach: Math.max(shapeOf(n.seat).box.w, shapeOf(n.seat).box.h),
  }));
  const odd = shapeOf(subject.ODD_ONE);
  const ringRadius = Math.max(odd.box.w, odd.box.h) / 2;
  const strokes = { border: (direction.stroke?.hairline ?? 0.6) * k, ring: (direction.stroke?.rule ?? 1) * k };
  // THE CLOSE-UP FRAMES WHAT IT SHOWS: Albania's ring and the neighbours' names, centred on their extent — the
  // ring whole, each name as wide as it is drawn around its seat — not Albania at the centre with half the shot
  // given to the Adriatic. The names' width in map units depends on the scale, and the scale on the centre, so the
  // centre is found by a few rounds of the two.
  const ringR = Math.max(odd.box.w, odd.box.h) / 2;
  const closePills = pills.filter((p) => p.camera === "closeUp");
  const closeItems = [
    // Air: each name keeps half the frame's margin beyond its pill, the ring the whole margin.
    ...closePills.map((p) => ({ seat: p.seatAt, width: p.width + layout.inset, height: p.height + layout.vInset })),
    ...[-ringR, ringR].flatMap((dx) => [-ringR, ringR].map((dy) => ({ seat: { x: odd.seat.x + dx, y: odd.seat.y + dy }, width: 2 * layout.inset, height: 2 * layout.vInset }))),
  ];
  const extentAt = (vb) => {
    const perPx = vb.w / stage.width;
    const xs = [odd.seat.x - ringR, odd.seat.x + ringR, ...closePills.flatMap((p) => [p.seatAt.x - (p.width / 2) * perPx, p.seatAt.x + (p.width / 2) * perPx])];
    const ys = [odd.seat.y - ringR, odd.seat.y + ringR, ...closePills.flatMap((p) => [p.seatAt.y - (p.height / 2) * perPx, p.seatAt.y + (p.height / 2) * perPx])];
    return { x: (Math.min(...xs) + Math.max(...xs)) / 2, y: (Math.min(...ys) + Math.max(...ys)) / 2 };
  };
  let closeUpCamera = closeUpViewBox(stage, odd.seat, closeItems, gap);
  for (let round = 0; round < 6; round++) closeUpCamera = closeUpViewBox(stage, extentAt(closeUpCamera), closeItems, gap);
  const cameras = {
    overview: overviewViewBox(FRAME, stage),
    closeUp: closeUpCamera,
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
  /** The seven's own land, which the panel may never cover: nocturne's larger panel first sat over Iceland. */
  const sevenRings = geometry.shapes.filter((sh) => seven.has(sh.iso)).map((sh) => ({ box: sh.box, rings: ringsOf(sh.path) }));
  const coversSeven = (box) => {
    const vb = cameras.overview;
    for (let sy = box.y; sy <= box.y + box.height; sy += PANEL_CELL / 2)
      for (let sx = box.x; sx <= box.x + box.width; sx += PANEL_CELL / 2) {
        const x = vb.x + (sx / stage.width) * vb.w;
        const y = vb.y + (sy / stage.height) * vb.h;
        if (sevenRings.some((sh) => x >= sh.box.x && x <= sh.box.x + sh.box.w && y >= sh.box.y && y <= sh.box.y + sh.box.h && sh.rings.some((r) => insideRing(r, x, y)))) return true;
      }
    return false;
  };
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
      if (panelAt && share >= panelAt.share - 1e-9) continue;
      if (coversSeven({ x, y, width: panelLayout.width, height: panelLayout.height })) continue;
      panelAt = { x, y, share };
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
  // ── a map word's ink, measured against the cell it lands on, in every state it is shown in ─────────────────
  // The still's rule (`rampFor().inkFor`): the halo is struck in the colour of the cell under the word's centre,
  // and the ink walked to 7:1 for a feature, 4.5:1 for an area, against that cell. A video changes the cell
  // under a word — the floor steps a neighbour back to bare land — so the one ink is measured against the cell
  // in every state the name is shown in; the halo follows the cell frame by frame (`ChoroplethFrame.tsx`).
  const shapeByKey = new Map(shapes.map((sh) => [sh.key, sh]));
  const everyRing = geometry.shapes.map((sh) => ({ key: sh.iso, box: sh.box, rings: ringsOf(sh.path) }));
  /** The country under a stage point — every shape, context land included: a word over Kosovo is on land, not on
   *  the sea — measured on its rings rather than read off a grid's cell. */
  const ownerExact = (camera, sx, sy) => {
    const vb = cameras[camera];
    const x = vb.x + (sx / stage.width) * vb.w;
    const y = vb.y + (sy / stage.height) * vb.h;
    return everyRing.find((sh) => x >= sh.box.x && x <= sh.box.x + sh.box.w && y >= sh.box.y && y <= sh.box.y + sh.box.h && sh.rings.some((r) => insideRing(r, x, y)))?.key ?? null;
  };
  /** The colour under a country at the end of a state: `classes` every class in, `filtered` the floor at 94 %. */
  const cellColour = (owner, state) => {
    if (owner === null) return colours.sea;
    const sh = shapeByKey.get(owner);
    if (sh.classIndex === null) return sh.fill;
    return state === "filtered" && !sh.kept ? colours.land : colours.classFills[sh.classIndex];
  };
  /** The states each role is seen in (states.mjs): the six at the floor and at the close; the rest with every class in. */
  const STATES_SEEN = { top: ["filtered", "classes"], odd: ["classes"], missing: ["classes"], context: ["classes"], neighbour: ["classes"] };
  const floorOf = (klass) => (klass === "feature" ? 7 : TEXT_CONTRAST_MIN);
  const inkOn = (klass, cells) => {
    const base = klass === "feature" ? accent : muted;
    for (const cell of cells) {
      const ink = adjustToContrast(base, cell, floorOf(klass));
      if (ink && cells.every((c) => contrast(ink, c) >= floorOf(klass) - 1e-9)) return ink;
    }
    return null;
  };
  /** THE STILL'S LEADER RULE (`placementsFor`): a word either lies WHOLLY inside its own country — both ends,
   *  both quarters and the middle of its line — or leaves the country's seat far enough for a leader to be seen.
   *  A word half over its country and half over a neighbour, with no leader, names the neighbour: « MOLDAVIE » set
   *  across Romania. Albania's names are exempt — the ring says which country they name. */
  const LEADER_GAP = 0.3; // × axis lead
  const ringsBySeat = new Map(geometry.shapes.map((sh) => [sh.iso, ringsOf(sh.path)]));
  const seatedOrLed = (camera, key, box) => {
    const p = pills.find((q) => q.key === key);
    if (p.role === "odd") return true;
    const vb = cameras[camera];
    const own = ringsBySeat.get(p.seat);
    const cy = box.y + box.height / 2;
    // The line's ends a tenth in: a coastline's fjord under the last letter's edge is not the word leaving its country.
    const reach = (0.9 * (box.width - p.halo)) / 2;
    const whole = [0, -reach / 2, reach / 2, -reach, reach].every((dx) => {
      const x = vb.x + ((box.x + box.width / 2 + dx) / stage.width) * vb.w;
      const y = vb.y + (cy / stage.height) * vb.h;
      return own.some((ring) => insideRing(ring, x, y));
    });
    if (whole) return true;
    const seat = toStage(vb, stage, p.seatAt);
    const g = LEADER_GAP * registers.axis.lead;
    return seat.x < box.x - g || seat.x > box.x + box.width + g || seat.y < box.y - g || seat.y > box.y + box.height + g;
  };
  /** The ink a name would take with its box at `box`, or null when none reads on the cell under its centre. */
  // A WORD IS READ ON EVERY CELL IT CROSSES, not only the one under its centre: a close-up name straddling
  // Kosovo's dark fill and Serbia's light one was set in an ink that vanished over half of it. So the ink is
  // measured against the cells under nine points along the word's line, in every state it is seen in.
  const WORD_SAMPLES = 9;
  const inkAt = (camera, key, box) => {
    const p = pills.find((q) => q.key === key);
    const cy = box.y + box.height / 2;
    const owner = ownerExact(camera, box.x + box.width / 2, cy);
    const crossed = new Set([owner]);
    // Albania's name is the exception, as it is for the leader: set over its own fill inside the ring, its halo is that fill.
    // The line is the one `seatedOrLed` reads: its ends a tenth in, where the halo already carries the last letter.
    const half = (0.9 * (box.width - p.halo)) / 2;
    if (p.role !== "odd") for (let i = 0; i < WORD_SAMPLES; i++) crossed.add(ownerExact(camera, box.x + box.width / 2 - half + (2 * half * i) / (WORD_SAMPLES - 1), cy));
    const cells = [...new Set([...crossed].flatMap((o) => STATES_SEEN[p.role].map((state) => cellColour(o, state))))];
    return { owner, cells, ink: inkOn(p.klass, cells) };
  };
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
        const beside = p.role === "odd" ? 0 : LEADER_GAP * registers.axis.lead + 1e-3;
        return { key: p.key, cx: at.x, cy: at.y, width: p.width, height: p.height, avoid, slack, beside };
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
    const allowed = (box, key) => inkAt(camera, key, box).ink !== null && seatedOrLed(camera, key, box);
    if (camera === "overview") {
      Object.assign(placed, placePills(items, stage, gap, { obstacles, cover: coverFor(camera), allowed }));
      continue;
    }
    // THE CLOSE-UP'S NEIGHBOURS ARE PLACED IN THE ORDER THAT KEEPS THEM NEAREST THEIR SEATS. Four names crowd the
    // top of the shot; placed largest first, Montenegro took the place above Kosovo and Kosovo's name was led
    // across the whole of Montenegro. Every order of the names after Albania's is tried — twenty-four — and the
    // one whose names stand the least total distance off their seats wins.
    const [first, ...rest] = items;
    const orders = (list) => (list.length <= 1 ? [list] : list.flatMap((x, i) => orders([...list.slice(0, i), ...list.slice(i + 1)]).map((o) => [x, ...o])));
    let best = null;
    for (const order of orders(rest)) {
      let result;
      try {
        result = placePills([first, ...order], stage, gap, { obstacles, allowed });
      } catch {
        continue;
      }
      const off = order.reduce((sum, it) => {
        const b = result[it.key];
        return sum + Math.hypot(Math.max(b.x - it.cx, 0, it.cx - b.x - it.width), Math.max(b.y - it.cy, 0, it.cy - b.y - it.height));
      }, 0);
      if (!best || off < best.off - 1e-9) best = { off, result };
    }
    if (!best) throw new Error("no order of the close-up's names places them all");
    Object.assign(placed, best.result);
  }
  /** A LEADER, AS THE STILL DRAWS ONE: a word set beside its country rather than over it says which country it
   *  names with a line from the country's seat — a dot on the seat — to the word's box. Albania's overview name
   *  leads from its ring instead, and no dot is set inside the ring. */
  const LEADER_DOT = 0.1; // × axis lead, the dot's radius
  const leaderOf = (p, at, seat) => {
    const box = { x: at.x, y: at.y, width: p.width, height: p.height };
    if (seat.x >= box.x && seat.x <= box.x + box.width && seat.y >= box.y && seat.y <= box.y + box.height) return null;
    const to = { x: Math.min(Math.max(seat.x, box.x), box.x + box.width), y: Math.min(Math.max(seat.y, box.y), box.y + box.height) };
    const ringed = p.camera === "overview" && p.role === "odd";
    const length = Math.hypot(to.x - seat.x, to.y - seat.y);
    const ringPx = ringPxAt(cameras.overview);
    if (ringed && length <= ringPx) return null;
    const from = ringed ? { x: seat.x + ((to.x - seat.x) * ringPx) / length, y: seat.y + ((to.y - seat.y) * ringPx) / length } : seat;
    return { from, to, dot: ringed ? 0 : LEADER_DOT * registers.axis.lead };
  };
  const names = pills.map(({ seatAt, slot, reach, klass, ...p }) => {
    const at = placed[p.key];
    const { owner, cells, ink } = inkAt(p.camera, p.key, { ...at, width: p.width, height: p.height });
    if (!ink) throw new Error(`${p.text} lands on ${owner ?? "the sea"}, where no ${klass} ink reaches ${floorOf(klass)}:1 against ${cells.join(" and ")}`);
    const seat = toStage(cameras[p.camera], stage, seatAt);
    return { ...p, klass, seat, ...at, ink, onKey: owner, leader: leaderOf(p, at, seat) };
  });

  // ── seas: at the overview, searched in open water around their declared centres ─────────────────────────
  // The still names its seas where its camera can carry them, form by form (`placementsFor`); here the word is
  // tried on rings around its centre, the longest form first, and kept where the whole word lies over sea,
  // inside the frame's margins, clear of every name, the panel and the seas already set.
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
  const touches = (a, b) => a.x < b.x + b.width + gap && b.x < a.x + a.width + gap && a.y < b.y + b.height + gap && b.y < a.y + a.height + gap;
  const water = registers.water;
  const waterHalo = haloOf(water, k, "water");
  const taken = [...names.filter((n) => n.camera === "overview"), panelBox];
  const waters = [];
  for (const w of copy.waters) {
    const [ux, uy] = geometry.project([w.lon, w.lat]);
    const centre = toStage(cameras.overview, stage, { x: ux, y: uy });
    let found = null;
    for (const text of w.forms) {
      const width = widthOf(text, water);
      const band = measureTextBand(text, faceOf(water));
      const candidates = [{ x: centre.x, y: centre.y, d: 0 }];
      for (let r = 1; r <= SEA_RINGS; r++)
        for (let a = 0; a < SEA_ANGLES; a++) {
          const t = (a / SEA_ANGLES) * 2 * Math.PI;
          const d = r * SEA_RING_STEP * registers.axis.lead;
          candidates.push({ x: centre.x + d * Math.cos(t), y: centre.y + d * Math.sin(t), d });
        }
      for (const c of candidates) {
        const box = { x: c.x - width / 2 - waterHalo / 2, y: c.y - band.ascent - waterHalo / 2, width: width + waterHalo, height: band.ascent + band.descent + waterHalo };
        const inside = box.x >= inset && box.y >= vInset && box.x + box.width <= stage.width - inset && box.y + box.height <= stage.height - vInset;
        if (!inside || taken.some((t) => touches(box, t)) || !overSea(box)) continue;
        found = { key: w.key, text, width, x: c.x - width / 2, y: c.y, box };
        break;
      }
      if (found) break;
    }
    if (found) {
      waters.push(found);
      taken.push(found.box);
    }
  }

  // ── the source: set small on the sea at the overview, where the video ends ────────────────────────────────
  // A credit sits in a corner, not in open water mid-frame: the positions are tried from the bottom margin up, and
  // from the left margin rightwards, and the first that lies over almost no land (`SOURCE_LAND`) and touches no
  // name, no sea's name and not the panel wins.
  let sourceSeat = null;
  const sourceBox = { width: layout.source.width, height: layout.source.height };
  search: for (let y = stage.height - vInset - sourceBox.height; y >= vInset; y -= PANEL_STEP)
    for (let x = inset; x + sourceBox.width <= stage.width - inset; x += PANEL_STEP) {
      const box = { x, y, ...sourceBox };
      if (taken.some((t) => touches(box, t))) continue;
      const share = landShare(box);
      if (share <= SOURCE_LAND) {
        sourceSeat = { x, y, share };
        break search;
      }
    }
  if (!sourceSeat) throw new Error(`a ${sourceBox.width}×${sourceBox.height} source finds no place on the overview`);
  const sourceAt = { x: sourceSeat.x, y: sourceSeat.y };

  const strokeScale = sizeFor(SIZE).typeScale;
  const props = {
    frame: layout.frame,
    stage,
    /** The frame's margins — what the seas are held inside. */
    layoutInset: { x: inset, y: vInset },
    registers: Object.fromEntries(DRAWN_REGISTERS.map((name) => [name, registers[name]])),
    titleCard: layout.titleCard,
    source: { ...layout.source, at: sourceAt },
    panel: { ...panelLayout, at: { x: panelBox.x, y: panelBox.y } },
    colours,
    strokes,
    seaBox: { x: -CLIP_MARGIN.x, y: -CLIP_MARGIN.y, w: FRAME.width + 2 * CLIP_MARGIN.x, h: FRAME.height + 2 * CLIP_MARGIN.y },
    shapes,
    ring: { cx: odd.seat.x, cy: odd.seat.y, r: ringRadius },
    subjectBox: odd.box,
    names,
    waters: waters.map(({ box, ...w }) => w),
    halos: { water: waterHalo },
    /** Every close-up name's seat, in map units — what the close-up camera frames. */
    closeUpSeats: Object.fromEntries(pills.filter((p) => p.camera === "closeUp").map((p) => [p.key, p.seatAt])),
    cameras,
    states,
    timing: CHOROPLETH_VIDEO_TIMING,
  };
  return { id, direction, layout, props, report: { k, strokeScale, titleForm: layout.titleCard.form, titleSize: layout.titleCard.register.fontSize, titleLines: layout.titleCard.title.length, sourceForm: layout.source.form, stage, panel: panelBox, panelLand: panelAt.share, sourceLand: sourceSeat.share, waters: waters.map((w) => w.text), droppedWaters: copy.waters.length - waters.length } };
}
