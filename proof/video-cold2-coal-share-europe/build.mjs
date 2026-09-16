// EVERYTHING ONE DIRECTION'S RENDER IS HANDED, BUILT IN BUN — the direction, its registers at the video's size, the
// live map's plan and cameras, the title card, the credit seated on the measured open sea, the colours floored, the
// states and the timing; and, in THE LAYOUT section, this beat's own overlay, placed on the map `measure.mjs`
// measured. The runner renders what `buildDirection` returns; the tests read the same object. A plan changed since
// its measurement is refused.
//
// THE DIRECTION IS COMPOSED FROM THE EDITORIAL SIDE, NOT PICKED FROM THE DEMO SET. `directionsFor` reads the
// newsroom's identity (the root's NEWSROOM.md), composes candidates with the design base (`composeDirections`) and
// returns the best one — exactly one. `candidates: N` returns the top N for the journalist to choose between;
// `filed: true` returns every filed direction, for a catalogue or demo proof only.
//
// Runs in Bun only.

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { adjustToContrast, mix, NON_TEXT_CONTRAST_MIN, TEXT_CONTRAST_MIN } from "#shared/chart-beat/colour.mjs";
import { deriveFurniture } from "#shared/chart-beat/render-still.mjs";
import { frameInsetFor, sizeFor } from "#shared/chart-video/sizes.mjs";
import { composeDirections, report as reportComposition } from "#shared/design-base/compose.mjs";
import { readDirection } from "#shared/design-base/read-direction.mjs";
import { EYEBROW_TO_DISPLAY, registerOf } from "#shared/design-base/register.mjs";
import { resolveDirectionFamilies } from "#shared/design-base/resolve-families.mjs";
import { isDeclinedProfile, parseNewsroom, validateNewsroom } from "../../skills/splash/scripts/newsroom.mjs";
import { applyCase } from "../../skills/map-beat/scripts/registers.mjs";
import { CREDIT_ONE_LINE, haloOf, keyFor, pillOf, sourceCreditFor, titleCardFor, verticalInsetFor, widthOf } from "../../skills/map-beat/scripts/shots.mjs";
import { videoRegistersOf } from "../../skills/map-beat/scripts/video-registers.mjs";
import { cellAt, offSeat, seatOnSea, touches } from "../../skills/map-beat/scripts/video-placement.mjs";
import { camerasOf, classFillsOf, mapPlanFor, SEATS, STAGE } from "./map-plan.mjs";
import { planDigestOf } from "./measure.mjs";
import { statesFor } from "./states.mjs";
import { assertClaim, BREAKS, loadSubject, NAME_FR, NEIGHBOURS, SUBJECT } from "./subject.mjs";
import { COLD2_COAL_SHARE_EUROPE_VIDEO_TIMING } from "./timing-contract.ts";

const HERE = import.meta.dir;
export const ROOT = join(HERE, "../..");
export const DIRECTIONS = join(ROOT, "docs", "design-base", "directions");
export const SIZE = "landscape";
export const REGISTER_NAMES = ["display", "eyebrow", "body", "annot", "value", "axis"];
/** The registers the overlay draws in — the six resolved ones, the map's `area` and `feature`, and the credit's. */
export const DRAWN_REGISTERS = ["display", "eyebrow", "value", "axis", "annot", "area", "feature", "source"];
/** The no-break space, written as its escape. */
export const NB = "\u00A0";
/** SCAFFOLD: how many ranked levels of evidence BRIEF.md names — the composer wants that many distinguishable voices. */
export const BEAT_FACTS = Object.freeze({ evidenceLevels: 3 });
/** The mark every scaffold placeholder in the copy carries; `assertWritten` refuses a render while one is left. */
export const SCAFFOLD_MARK = "SCAFFOLD";
/** Air between a word and anything else, × the axis lead; how far the credit's search steps, in pixels. */
const GAP = 0.25;
const CREDIT_STEP = Object.freeze({ x: 20, y: 5 });

export function loadBeat() {
  const subject = loadSubject();
  return { subject, states: statesFor(), copy: copyOf(subject), mapSeats: { ...SEATS } };
}

/** The words. */
export function copyOf(subject) {
  const { years, countries, aboveHalf } = subject;
  return {
    eyebrow: `Part du charbon dans l\u2019\u00E9lectricit\u00E9, ${years[0]}\u2013${years.at(-1)}`,
    /** The title's forms, longest first: the title card takes the first that holds its lines. */
    title: [
      "Le charbon a recul\u00E9 dans les douze pays qui en d\u00E9pendaient le plus. Seule la Pologne reste au-dessus de la moiti\u00E9",
      "Le charbon a recul\u00E9 partout. Seule la Pologne reste au-dessus de la moiti\u00E9",
    ],
    /** The credit's forms, longest first, each with the basemap's attribution: the longest that finds open sea wins. */
    source: [
      "Source\u00A0: Ember, via Our World in Data \u00B7 \u00A9 MapTiler \u00A9 OpenStreetMap",
      "Ember / OWID \u00B7 \u00A9 MapTiler \u00A9 OpenStreetMap",
    ],
    years: years.map(String),
    counts: aboveHalf.map((n) => `${n}${NB}pays${NB}\u2265${NB}50${NB}%`),
    bornes: BREAKS.map(String),
    unit: `%`,
    outside: "hors des 12",
    names: Object.fromEntries([SUBJECT, ...NEIGHBOURS].map((code) => [code, NAME_FR[code]])),
    shares: Object.fromEntries(countries.map((c) => [c.code, c.series.map((s) => `${Math.round(s)}${NB}%`)])),
  };
}

/** What each register sets on this beat — the faces are resolved to cover it. */
export function textPerRegisterOf(copy) {
  return {
    display: copy.title.join(" "),
    eyebrow: copy.eyebrow,
    body: copy.source.join(" "),
    annot: Object.values(copy.names).join(" "),
    value: `${copy.years.join(" ")} ${copy.counts.join(" ")} 0123456789%`,
    axis: `0123456789 % ${copy.outside} ${copy.source.join(" ")} ${Object.values(copy.names).join(" ")}`,
  };
}

/** Refuses a beat still carrying a scaffold placeholder: the copy, and the claim's assertions. */
export function assertWritten(beat) {
  if (JSON.stringify(beat.copy).includes(SCAFFOLD_MARK)) throw new Error(`the copy still carries ${SCAFFOLD_MARK} placeholders — write it (build.mjs, copyOf)`);
  assertClaim(beat.subject);
}

// ── the direction ─────────────────────────────────────────────────────────────────────────────────────────────

/** The newsroom's identity: its ground and primary accent, or null when it has none on record — and why. */
export function newsroomOf(root = ROOT) {
  const path = join(root, "NEWSROOM.md");
  if (!existsSync(path)) return { newsroom: null, note: "no NEWSROOM.md at the root: composed without a newsroom palette" };
  const profile = parseNewsroom(readFileSync(path, "utf8"));
  if (isDeclinedProfile(profile)) return { newsroom: null, note: "the newsroom declined a house profile: composed without a newsroom palette" };
  const errors = validateNewsroom(profile);
  if (errors.length) throw new Error(`NEWSROOM.md is not a complete profile (${errors.join("; ")}) — complete it, or record a decline`);
  return { newsroom: { ground: profile.ground, accent: profile.brandColor }, note: `composed for ${profile.name}: ground ${profile.ground}, accent ${profile.brandColor} (NEWSROOM.md)` };
}

export const filedDirections = () =>
  readdirSync(DIRECTIONS)
    .filter((f) => f.endsWith(".md"))
    .sort()
    .map((f) => readDirection(join(DIRECTIONS, f)));

const labelOf = (id) => id.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/**
 * The direction(s) this beat renders in, each `{ label, direction }`.
 *   default           ONE — the composer's best candidate for the newsroom and this beat's own text
 *   { candidates: N } the composer's top N, for the journalist to choose between
 *   { filed: true }   every filed demo direction — a catalogue or demo proof, never a production render
 */
export function directionsFor(beat, { candidates = 1, filed = false, root = ROOT } = {}) {
  const all = filedDirections();
  if (filed) return { directions: all.map((d) => ({ label: labelOf(d.id), direction: d })), composition: null, note: "every filed demo direction (--filed): a catalogue proof, not a production render" };
  if (!(Number.isInteger(candidates) && candidates >= 1)) throw new Error(`candidates is a count of at least 1, got ${JSON.stringify(candidates)}`);
  const { newsroom, note } = newsroomOf(root);
  const composition = composeDirections({ newsroom, filed: all, beat: BEAT_FACTS, textPerRegister: textPerRegisterOf(beat.copy), limit: Math.max(3, candidates) });
  if (!composition.offered.length) throw new Error(`no composed direction holds up for this beat:\n${reportComposition(composition, { beat: BEAT_FACTS })}`);
  const directions = composition.offered.slice(0, candidates).map((d) => ({ label: labelOf(d.id), direction: d }));
  return { directions, composition, note };
}

/** The runner's direction flags: `--candidates <N>` and `--filed` are opt-in, and exclusive; `--only <label>`. */
export function parseDirectionArgs(args) {
  const valueOf = (name) => {
    const i = args.indexOf(name);
    if (i === -1) return null;
    if (!args[i + 1] || args[i + 1].startsWith("--")) throw new Error(`${name} takes a value`);
    return args[i + 1];
  };
  const raw = valueOf("--candidates");
  if (raw !== null && !/^[1-9]\d*$/.test(raw)) throw new Error(`--candidates takes a count of at least 1, got ${JSON.stringify(raw)}`);
  const filed = args.includes("--filed");
  if (filed && raw !== null) throw new Error("--filed and --candidates are exclusive: --filed renders the demo directions, --candidates the composed ones");
  return { candidates: raw === null ? 1 : Number(raw), filed, only: valueOf("--only"), still: args.includes("--still"), look: valueOf("--look") };
}

// ── the measurement ───────────────────────────────────────────────────────────────────────────────────────────

export const MEASURED = join(HERE, "measured.json");
export function readMeasured() {
  if (!existsSync(MEASURED)) throw new Error("no measured.json beside the beat — run measure.mjs with the worktree's .env loaded");
  return JSON.parse(readFileSync(MEASURED, "utf8"));
}

/** The map's words at the video's size: `area` the axis tracked to at least 0.8 px of the still (× k), `feature` at 700. */
export function mapRegistersOf({ axis }, k) {
  const area = { ...axis, letterSpacing: Math.max(Number(axis.letterSpacing ?? 0), 0.8 * k) };
  return { area, feature: { ...area, fontWeight: 700 } };
}

// ── the build ─────────────────────────────────────────────────────────────────────────────────────────────────

/**
 * @param {{ label: string, direction: object }} entry  one of `directionsFor(beat).directions`
 * @param {{ measured?: any }} [options]  `measured: null` builds the plan and cameras only — what `measure.mjs` reads
 */
export function buildDirection({ label, direction: chosen }, { subject, states, copy }, { measured } = {}) {
  const direction = resolveDirectionFamilies(chosen, textPerRegisterOf(copy));
  const cameras = camerasOf();
  const mapPlan = mapPlanFor({ direction, subject, cameras });
  const classTable = Object.fromEntries(subject.countries.map((c) => [c.iso2, c.classes]));
  const yearCount = subject.years.length;
  const classCount = BREAKS.length + 1;
  if (measured === null) return { label, direction, props: { mapPlan, cameras, classTable, yearCount, classCount } };
  const measurement = measured ?? readMeasured();
  if (!measurement.cameras?.[label]) throw new Error(`${label}: not measured — run measure.mjs with the worktree's .env loaded`);
  if (measurement.planDigest?.[label] !== planDigestOf(mapPlan)) throw new Error(`${label}: the plan changed since it was measured — run measure.mjs again`);
  const m = measurement.cameras[label];

  const resolved = Object.fromEntries(REGISTER_NAMES.map((name) => [name, registerOf(direction, name)]));
  const scaled = videoRegistersOf(resolved, SIZE);
  const k = scaled.axis.fontSize / resolved.axis.fontSize;
  const registers = { ...scaled, ...mapRegistersOf(scaled, k) };
  const row = sizeFor(SIZE);
  for (const [name, r] of Object.entries(registers)) if (!(r.fontSize >= row.minTypePx)) throw new Error(`${label}: register ${name} is ${r.fontSize}px, under the ${row.minTypePx}px floor`);
  const frame = { width: row.width, height: row.height };
  const stage = { x: 0, y: 0, ...STAGE };
  const inset = frameInsetFor(SIZE);
  const vInset = verticalInsetFor(SIZE);
  const air = GAP * registers.axis.lead;
  /** A word as drawn: cased by its register, measured on the face the composition embeds. */
  const measure = (text, r) => {
    const cased = applyCase(text, r.transform);
    return { text: cased, width: widthOf(cased, r) };
  };

  // ── the shots every directed video shares: the title card from frame 0; the credit's one-line forms ──────────
  const titleCard = titleCardFor({ registers, eyebrow: copy.eyebrow, title: copy.title, size: SIZE, eyebrowToDisplay: EYEBROW_TO_DISPLAY });
  const sources = copy.source.flatMap((form) => {
    try {
      return [sourceCreditFor({ registers, forms: [form], size: SIZE, k, ...CREDIT_ONE_LINE })];
    } catch {
      return [];
    }
  });
  if (!sources.length) throw new Error(`${label}: no form of the source holds one line`);

  // ── colours: the sea is the plan's own water tint, what the dataviz style paints and the measure reads back ──
  const { ground, accent } = direction;
  const { ink, muted } = deriveFurniture(ground);
  const sea = mapPlan.tints.water;
  const walk = (colour, on, floor, what) => {
    const walked = adjustToContrast(colour, on, floor);
    if (!walked) throw new Error(`${label}: ${what} has no variant that reads at ${floor}:1 on ${on}`);
    return walked;
  };
  const colours = {
    ground,
    sea,
    land: mapPlan.tints.land,
    accent: walk(accent, ground, NON_TEXT_CONTRAST_MIN, "the accent"),
    text: {
      eyebrow: walk(registers.eyebrow.fill ?? accent, ground, TEXT_CONTRAST_MIN, "the eyebrow"),
      title: walk(registers.display.fill ?? ink, ground, TEXT_CONTRAST_MIN, "the title"),
      source: walk(muted, sea, TEXT_CONTRAST_MIN, "the credit"),
    },
    // SCAFFOLD: this beat's own colours, each walked to its floor on what it stands over.
  };
  const strokes = { border: (direction.stroke?.hairline ?? 0.6) * k, rule: (direction.stroke?.rule ?? 1) * k };

  // ── the credit: the longest one-line form that finds open sea on the whole map, anchored to the bottom ───────
  // Every form tried on its own, the lowest seat winning (the longer form on a tie): `seatOnSea` exhausts a long form
  // anywhere before a short one, which seats the long credit in mid-ocean rather than the short one at the bottom.
  const creditWithin = { x: inset, y: vInset, width: frame.width - 2 * inset, height: frame.height - 2 * vInset };
  const seated = sources
    .map((size, index) => seatOnSea({ grids: [m.whole.grid], sea, sizes: [size], within: creditWithin, step: CREDIT_STEP }) && { ...seatOnSea({ grids: [m.whole.grid], sea, sizes: [size], within: creditWithin, step: CREDIT_STEP }), index })
    .filter(Boolean)
    .sort((a, b) => b.box.y - a.box.y || a.index - b.index)[0];
  if (!seated) throw new Error(`${label}: no one-line form of the source finds open sea on the whole map`);
  const credit = sources[seated.index];
  registers.source = credit.register;

  // ════ THE LAYOUT ═════════════════════════════════════════════════════════════════════════════════════════════
  const within = { x: inset, y: vInset, width: frame.width - 2 * inset, height: frame.height - 2 * vInset };
  const creditBox = { ...seated.box };
  const inside = (box) => box.x >= within.x && box.y >= within.y && box.x + box.width <= within.x + within.width && box.y + box.height <= within.y + within.height;

  // The key: the year and the count over the class swatches, the land outside the twelve named. Seated on the whole
  // map's open sea, clear of the credit; it steps back while the camera holds the close-up, whose sea is too narrow.
  const key = keyFor({ registers, k, counters: [copy.years, copy.counts], breaks: copy.bornes.map((b) => `${b}${NB}${copy.unit}`), missingLabel: copy.outside });
  const keySeat = seatOnSea({ grids: [m.whole.grid], sea, sizes: [key], within, avoid: [creditBox], air, step: CREDIT_STEP });
  if (!keySeat) throw new Error(`${label}: the key finds no open sea on the whole map, clear of the credit`);
  const keyBox = keySeat.box;

  // The close-up: each name over a gauge (0–100 %, the half notched) with its share beside it, placed at its measured
  // seat — centred on it when clear, else beside it — clear of the key, of each other, inside the stage.
  const nameR = registers.feature;
  const shareR = registers.area;
  const gaugeWidth = Math.round(6 * shareR.fontSize);
  const gaugeHeight = Math.round(0.32 * shareR.fontSize);
  const shareWidest = Math.max(...Object.values(copy.shares).flat().map((t) => widthOf(applyCase(t, shareR.transform), shareR)));
  const closeUp = [SUBJECT, ...NEIGHBOURS].map((code) => {
    const name = pillOf(copy.names[code], nameR, 0);
    const share = pillOf(copy.shares[code][0], shareR, 0);
    const rowGap = 0.3 * nameR.lead;
    const width = Math.ceil(Math.max(name.width, gaugeWidth + air * 2 + shareWidest));
    const height = Math.ceil(name.height + rowGap + Math.max(share.height, gaugeHeight));
    const series = subject.countries.find((c) => c.code === code).series;
    return { code, name, share, rowGap, width, height, series, seat: m.closeUp.projected[code] };
  });
  // The close-up's year, seated on its own open sea (the Baltic), read by the gauges' replay.
  const clockR = registers.value;
  const clockWidth = Math.max(...copy.years.map((t) => widthOf(applyCase(t, clockR.transform), clockR)));
  const clockPill = pillOf(copy.years[0], clockR, 0);
  const clockSeat = seatOnSea({ grids: [m.closeUp.grid], sea, sizes: [{ width: Math.ceil(clockWidth * 1.02), height: clockPill.height }], within, air, step: CREDIT_STEP });
  if (!clockSeat) throw new Error(`${label}: the close-up's year finds no open sea`);
  const clock = { x: clockSeat.box.x, y: clockSeat.box.y + clockPill.baseline, widths: copy.years.map((t) => widthOf(applyCase(t, clockR.transform), clockR)), texts: copy.years.map((t) => applyCase(t, clockR.transform)) };
  const placed = [clockSeat.box];
  const names = closeUp.map((n) => {
    const [px, py] = n.seat;
    const candidates = [
      [px - n.width / 2, py - n.height / 2],
      [px - n.width / 2, py + air],
      [px - n.width / 2, py - n.height - air],
      [px - n.width - air, py - n.height / 2],
      [px + air, py - n.height / 2],
    ].map(([x, y]) => ({ x: Math.round(x), y: Math.round(y), width: n.width, height: n.height }));
    const box = candidates.find((c) => inside(c) && !placed.some((p) => touches(c, p, air)));
    if (!box) throw new Error(`${label}: no clear place for ${n.code}'s name and gauge near its seat on the close-up`);
    if (offSeat(box, { x: px, y: py }) > n.height) throw new Error(`${label}: ${n.code}'s name stands too far from its seat`);
    placed.push(box);
    const rowY = box.y + n.name.height + n.rowGap;
    const rowH = Math.max(n.share.height, gaugeHeight);
    return {
      code: n.code,
      box,
      name: { text: n.name.text, x: box.x, y: box.y + n.name.baseline, width: n.name.textWidth },
      gauge: { x: box.x, y: Math.round(rowY + (rowH - gaugeHeight) / 2), width: gaugeWidth, height: gaugeHeight, notch: 50 / 100 },
      shares: n.series.map((v, i) => ({ fill: v / 100, text: copy.shares[n.code][i] })),
      shareAt: { x: box.x + gaugeWidth + 2 * air, y: rowY + n.share.baseline },
      shareWidths: copy.shares[n.code].map((t) => widthOf(applyCase(t, shareR.transform), shareR)),
    };
  });

  // The ring's name on the whole map: Poland, east of its mainland box (the measured corners), level with its seat,
  // so the word never crosses the ring it names; clear of the key and the credit.
  const ringPill = pillOf(copy.names[SUBJECT], nameR, 0);
  const [, ry] = m.whole.projected[SUBJECT];
  const [eastX] = m.whole.projected[`${SUBJECT}_NE`];
  const ringBox = { x: Math.round(eastX + 2 * air), y: Math.round(ry - ringPill.height / 2), width: ringPill.width, height: ringPill.height };
  if (!inside(ringBox) || touches(ringBox, keyBox, air) || touches(ringBox, creditBox, air)) throw new Error(`${label}: Poland's name on the whole map leaves the stage or touches the key or the credit`);
  const ringName = { text: ringPill.text, x: ringBox.x, y: ringBox.y + ringPill.baseline, width: ringPill.textWidth };

  const fills = classFillsOf(direction);
  Object.assign(colours, {
    classFills: fills,
    ink: walk(ink, ground, TEXT_CONTRAST_MIN, "the ink"),
    track: mix(ground, ink, 0.3),
    gauge: walk(accent, ground, NON_TEXT_CONTRAST_MIN, "the gauge"),
    half: walk(accent, sea, TEXT_CONTRAST_MIN, "the half's borne"),
    keyText: walk(ink, sea, TEXT_CONTRAST_MIN, "the key's words"),
  });
  const layout = { legend: { ...key, at: { x: keyBox.x, y: keyBox.y }, halfIndex: BREAKS.indexOf(50) }, names, ringName, clock, classTable, yearCount, classCount };
  // ════ END OF THE LAYOUT ═══════════════════════════════════════════════════════════════════════════════════════

  const props = {
    frame,
    stage,
    registers: Object.fromEntries(DRAWN_REGISTERS.map((name) => [name, registers[name]])),
    titleCard,
    credit: { ...credit, at: { x: seated.box.x, y: seated.box.y } },
    colours,
    strokes,
    halo: haloOf(registers.value, k),
    cameras,
    mapPlan,
    ...layout,
    states,
    timing: COLD2_COAL_SHARE_EUROPE_VIDEO_TIMING,
  };
  return { label, direction, props, report: { k, titleForm: titleCard.form, titleSize: titleCard.register.fontSize, sourceText: credit.lines[0].text } };
}
