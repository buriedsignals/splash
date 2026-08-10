/**
 * The video genre of "Poland emits more than double Sweden's per-capita CO2" — 8 seconds, 30fps.
 *
 * The plate and the parts come from the same bake the still draws (`bake.mjs`), and the classes,
 * the ramp and the scale come from the same `geo-choropleth.ts`. What this file adds is the one
 * thing a still cannot have: an ORDER. Every window in that order derives from `timing.ts`; there
 * is no frame literal below.
 *
 * Nothing here derives a furniture colour either — `deriveFurniture` sits beside a native
 * rasteriser that no browser bundle can load, so `render.mjs` calls it in node and passes
 * ink/muted/grid in as props. One implementation of the colour rule, two genres.
 *
 * ── THERE IS NO `const FRAME` HERE ANY MORE, AND NO `MAP = 620` EITHER ───────────────────────
 *
 * They used to read `{ width: 1080, height: 1080 }` and `620`, and `Root.tsx` registered ONE
 * composition with the same two numbers typed a second time, so a journalist who pinned `landscape`
 * at gate 2c had no composition to render at all. The frame is now `sizeFor(size)`'s — the VIDEO
 * table's, not the static one's, because a landscape video is watched on a phone turned sideways
 * (~800 dp) where the static's article-column floor of 26 px would be too small — and the map's box
 * comes from `mapStageBox`, which keeps the committed plate's own aspect at every size.
 *
 * ── WHAT THE VIDEO TABLE COSTS THIS BEAT, MEASURED ──────────────────────────────────────────
 *
 * This beat was tuned at 1080 x 1080 with its smallest type at 17 px, which is 5.7 CSS px on the
 * 360 dp phone a social video is watched on — roughly HALF the landscape row's 30 px floor. Raising
 * it to the floor is the whole point of the migration, and it costs height: at landscape the title
 * alone takes 280 px of the 830 px band. It still leaves a real map. At square and portrait it does
 * not, and this file refuses there with the arithmetic rather than drawing a strip.
 */

import { Fragment } from "react";
import {
  AbsoluteFill,
  Easing,
  Img,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
// A story consumes the root it lives in — `#shared/*`, not a relative path into a skill.
import {
  frameInsetFor,
  sizeFor,
  stageFor,
} from "#shared/chart-video/sizes.mjs";
import {
  lonSpanOf,
  mapStageBox,
  typeScaleFor,
} from "#shared/map-beat/stage.mjs";
import { REMOVAL_LADDER } from "#shared/chart-beat/type-at-size.mjs";
import {
  binIndexLowerInclusive,
  en,
  pathFromParts,
  revealOrder,
  scalePosition,
  subjectLabelAnchor,
  subjectLabelHostWidth,
  type BakedShape,
  type JoinedRow,
} from "./geo-choropleth.ts";
import { CHOROPLETH_TIMING, progressOf, type BeatTiming } from "./timing.ts";

/**
 * THE BEAT'S OWN TUNING, REBASED TO THE 900-WIDE CONVENTION THE TABLE MULTIPLIES.
 *
 * `sizes.mjs` publishes `typeScale` as a multiplier over a beat's 900 x 560 base tokens, so a beat
 * carrying its 1080-frame tuning as the base would be scaled twice. Every number below is this
 * beat's committed 1080 value x 900/1080, rounded to a whole point — the same picture, expressed in
 * the units the table speaks. The smallest is 14, comfortably over the seed's 12, so
 * `typeScaleFor` returns the row's own default and no token needs a multiplier of its own.
 *
 * And EVERY spacing number is in here, not only the fonts. The probe measured what happens
 * otherwise: eleven bare literals in one beat's layout arithmetic collided a title into a subtitle
 * at 1920 x 1080. `PAD` is the one exception, because a frame's margin is proportional to the
 * CANVAS and not to the type (`frameInsetFor`, and `sizes.mjs` states the split).
 */
const BASE = {
  TITLE: { fontSize: 32, fontWeight: 700, lead: 40 },
  SOURCE: { fontSize: 16, fontWeight: 400, lead: 20 },
  CAPTION: { fontSize: 15, fontWeight: 600 },
  TICK: { fontSize: 14, fontWeight: 400 },
  MARKER: { fontSize: 14, fontWeight: 600 },
  MARKER_VALUE: { fontSize: 18, fontWeight: 700 },
  NOTE: { fontSize: 14, fontWeight: 400, lead: 18 },
  SUBJECT_LABEL: { fontSize: 18, fontWeight: 700 },
  GUTTER: 33,
  BAR_WIDTH: 22,
  BAR_HEIGHT: 250,
  TICK_LABEL_GAP: 10,
  TICK_BASELINE_NUDGE: 5,
  MARKER_GAP: 12,
  MARKER_TEXT_GAP: 16,
  MARKER_NAME_LIFT: 3,
  MARKER_VALUE_DROP: 17,
  MARKER_ARROW_LENGTH: 9,
  MARKER_ARROW_HALF: 5,
  BLOCK_AIR: 16,
  CAPTION_TO_BAR: 18,
  BAR_TO_CAVEAT: 34,
  NO_DATA_GAP: 18,
  NO_DATA_TILE: 8,
  NO_DATA_SWATCH: { width: 20, height: 14, lift: 11, textX: 28 },
  PENDING_TILE: 8,
  PENDING_DOT: 1.1,
  /** Drawn widths, not plate widths: each is divided by the plate scale at the mark, so what is
   *  written here is what a viewer sees, and it has to grow with the frame like everything else. */
  SHAPE_STROKE: 0.7,
  SUBJECT_HALO_STROKE: 4.2,
  SUBJECT_STROKE: 2.2,
  SUBJECT_LABEL_HALO: 4.2,
};

/** The smallest token this beat draws. `typeScaleFor` never returns less than the row's default. */
const SMALLEST_BASE_TOKEN = Math.min(
  BASE.TICK.fontSize,
  BASE.MARKER.fontSize,
  BASE.NOTE.fontSize,
);

/**
 * Helvetica's cap height, 717/1000 em, from Adobe's own AFM for the face this beat draws in (Arial,
 * the substitute, is 716). It puts a name's OPTICAL centre on a point rather than its baseline.
 * `dominant-baseline="central"` would say the same thing declaratively and is not used, because the
 * still sibling rasterises through resvg and this one through Chrome, and a name that centred
 * differently in the two would be a defect nobody could see in either one alone.
 */
const CAP_HEIGHT_EM = 0.717;

const FONT_FAMILY = "Helvetica, Arial, sans-serif";

function tokens(typeScale: number) {
  const sp = (v: number) => Math.round(v * typeScale);
  const f = <T extends { fontSize: number; lead?: number }>(tok: T) => ({
    ...tok,
    fontSize: sp(tok.fontSize),
    ...(tok.lead === undefined ? {} : { lead: sp(tok.lead) }),
  });
  return {
    sp,
    TITLE: f(BASE.TITLE) as typeof BASE.TITLE,
    SOURCE: f(BASE.SOURCE) as typeof BASE.SOURCE,
    CAPTION: f(BASE.CAPTION) as typeof BASE.CAPTION,
    TICK: f(BASE.TICK) as typeof BASE.TICK,
    MARKER: f(BASE.MARKER) as typeof BASE.MARKER,
    MARKER_VALUE: f(BASE.MARKER_VALUE) as typeof BASE.MARKER_VALUE,
    NOTE: f(BASE.NOTE) as typeof BASE.NOTE,
    SUBJECT_LABEL: f(BASE.SUBJECT_LABEL) as typeof BASE.SUBJECT_LABEL,
  };
}

export type ChoroplethVideoProps = {
  geometry: {
    frame: { width: number; height: number };
    frameCorners: { west: number; north: number; east: number; south: number };
    shapes: BakedShape[];
    anchors: Record<string, [number, number]>;
  };
  plate: string;
  rows: JoinedRow[];
  breaks: number[];
  ramp: string[];
  title: string;
  source: string;
  basemapCredit: string;
  legendCaption: string;
  caveat: string;
  noDataLabel: string;
  ground: string;
  accent: string;
  ink: string;
  muted: string;
  subject: string;
  subjectLabel: string;
  subjectValue: number;
  comparisonLabel: string;
  comparisonValue: number;
  /** The export size gate 2c pinned, read from `BRIEF.md` by `render.mjs` and by `Root.tsx`. */
  size: string;
  timing?: BeatTiming;
};

/**
 * How far region `index` of `count` has arrived, given the reveal's own progress.
 *
 * The regions are handed their windows in the order the caller sorted them — lowest value first
 * (`geo-discipline.md` rule 10) — and the windows overlap, so the field darkens continuously
 * rather than blinking one country at a time. Clamped at both ends: an unclamped window keeps
 * moving after its event, and the hold would not be still.
 */
export function arrivalProgress(
  index: number,
  count: number,
  reveal: number,
): number {
  const WINDOW = 0.16;
  const start = count <= 1 ? 0 : (index / (count - 1)) * (1 - WINDOW);
  return Math.max(0, Math.min(1, (reveal - start) / WINDOW));
}

let measuringContext: CanvasRenderingContext2D | null | undefined;
export function measureText(
  text: string,
  { fontSize, fontWeight = 400 }: { fontSize: number; fontWeight?: number },
): number {
  if (!text) return 0;
  if (measuringContext === undefined)
    measuringContext =
      typeof document === "undefined"
        ? null
        : document.createElement("canvas").getContext("2d");
  if (!measuringContext) return text.length * fontSize * 0.5;
  measuringContext.font = `${fontWeight} ${fontSize}px ${FONT_FAMILY}`;
  return measuringContext.measureText(text).width;
}

export function wrap(
  text: string,
  maxWidth: number,
  font: { fontSize: number; fontWeight: number },
): string[] {
  const lines: string[] = [];
  let current = "";
  for (const word of text.split(/\s+/)) {
    const trial = current ? `${current} ${word}` : word;
    if (current && measureText(trial, font) > maxWidth) {
      lines.push(current);
      current = word;
    } else current = trial;
  }
  return current ? [...lines, current] : lines;
}

/**
 * WHICH RUNGS OF THE SHARED LADDER THIS BEAT CAN ACTUALLY TAKE, as a sentence for the refusal.
 *
 * The ladder is shared data (`type-at-size.mjs`), and it is written for charts: most of its rungs
 * remove something this beat does not have. A refusal that just said "run the ladder" would be
 * advice; this walks the rungs and says, for each, what it removes HERE — because a rung that
 * fires silently is a decision nobody took, and a rung that CANNOT fire is the reason the last one
 * is reached.
 */
function ladderForThisBeat(): string {
  const held: Record<string, string> = {
    R0: "not a band-scale chart — a map has no twin form to transpose into",
    R1: "no axis title: a choropleth's unit is stated in the legend caption, which is the key itself",
    R2: "fewer ticks frees no band height — the class bar's floor is set by the number of CLASSES, not the number of labels",
    R3: "no standfirst to shorten: this beat's only prose below the title is the caveat",
    R4: "one annotation, the subject's own name on its own shape — it is drawn INSIDE the map box and frees no band height",
    R5: "documented no-op",
    R7: "no standfirst to remove",
    R8: "reclassifying would shorten the legend, which is in the COLUMN beside the map, not in the band the title is taking",
  };
  return REMOVAL_LADDER.filter((rung) => held[rung.rung])
    .map(
      (rung) =>
        `  ${rung.rung} (${rung.what.split(";")[0]}) — ${held[rung.rung]}`,
    )
    .join("\n");
}

export function ChoroplethVideo({
  geometry,
  plate,
  rows,
  breaks,
  ramp,
  title,
  source,
  basemapCredit,
  legendCaption,
  caveat,
  noDataLabel,
  ground,
  accent,
  ink,
  muted,
  subject,
  subjectLabel,
  subjectValue,
  comparisonLabel,
  comparisonValue,
  size,
  timing = CHOROPLETH_TIMING,
}: ChoroplethVideoProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const row = sizeFor(size);
  const FRAME = { width: row.width, height: row.height };
  const PAD = frameInsetFor(size);
  const T = tokens(typeScaleFor(row, SMALLEST_BASE_TOKEN));
  const sp = T.sp;
  const GUTTER = sp(BASE.GUTTER);

  // THE BAND, not the frame. Where the platform reserves part of the frame — portrait alone today —
  // everything a viewer has to read lives inside it, because content outside it is at risk of being
  // COVERED by the platform's own caption, buttons and progress bar, and no clipping counter can
  // see that.
  const band = stageFor(size);
  const top = band.top + PAD;
  const contentWidth = FRAME.width - PAD * 2;

  // ── The credit: a strip across the foot of the frame, at the full content width ─────────────
  // Measured FIRST, so everything else is laid out in what is left above it. `sourceBottom` names
  // the BAND's bottom rather than the frame's, deliberately: at portrait the platform covers the
  // frame's last 672 px, so a credit pinned to the frame's floor is a credit nobody can read — and
  // a covered credit is an attribution failure, not a cosmetic one. Where no band is reserved,
  // `band.top + band.height` IS the frame's height.
  const sourceText = `${source} · ${basemapCredit}`;
  const sourceLines = wrap(sourceText, contentWidth, T.SOURCE);
  const sourceBottom = band.top + band.height - PAD;
  const sourceTop = sourceBottom - (sourceLines.length - 1) * T.SOURCE.lead;
  const bottom = sourceTop - T.SOURCE.fontSize - sp(BASE.BLOCK_AIR);
  const contentHeight = bottom - top;

  // ── The caveat: the strip directly above the credit, also at the full content width ─────────
  // It is here rather than in the column beside the map, and the landscape render is what decided
  // it: in a 1160px column the same sentence wraps to two lines and, with the legend above it,
  // asked for 512px of a 460px band — the beat refused itself. Across 1750px it is ONE line, and
  // the band that gives back is what the map is drawn in. A choropleth's caveat is a wide sentence
  // and a narrow column is not where it belongs.
  const caveatLines = wrap(caveat, contentWidth, T.NOTE);
  const caveatBottom = bottom;
  const caveatTop = caveatBottom - (caveatLines.length - 1) * T.NOTE.lead;
  const caveatInkTop = caveatTop - T.NOTE.fontSize;

  // ── The title: full content width, at the top. It is furniture — it says what the viewer is
  // looking at, and a video whose first seconds carry no title has no poster frame ──────────────
  const titleLines = wrap(title, contentWidth, T.TITLE);
  const titleTop = top + T.TITLE.fontSize;
  const titleBlock = T.TITLE.fontSize + (titleLines.length - 1) * T.TITLE.lead;
  const middleTop =
    titleTop + (titleLines.length - 1) * T.TITLE.lead + sp(BASE.BLOCK_AIR);
  const middleBottom = caveatInkTop - sp(BASE.BLOCK_AIR);
  const middleHeight = middleBottom - middleTop;

  const value = new Map(rows.map((r) => [r.key, r.value]));
  const anyNoData = rows.some((r) => r.value === null);
  const markers = [
    { label: comparisonLabel, value: comparisonValue, colour: ink },
    { label: subjectLabel, value: subjectValue, colour: accent },
  ];

  // The legend's own width, measured in the fonts it is drawn in: a tick label stands to the bar's
  // right and a marker's name and value stand end-anchored to its left.
  const BAR_WIDTH = sp(BASE.BAR_WIDTH);
  const widestTick = Math.max(
    ...[0, ...breaks].map((tick) => measureText(en(tick, 0), T.TICK)),
  );
  const widestMarker = Math.max(
    ...markers.flatMap(({ label, value: v }) => [
      measureText(label, T.MARKER),
      measureText(en(v, 1), T.MARKER_VALUE),
    ]),
  );
  const tickReserve = Math.ceil(
    widestTick + sp(BASE.TICK_LABEL_GAP) + sp(BASE.BLOCK_AIR),
  );
  const markerReserve = Math.ceil(
    widestMarker + sp(BASE.MARKER_GAP) + sp(BASE.MARKER_TEXT_GAP),
  );
  const legendRowWidth = markerReserve + BAR_WIDTH + tickReserve;
  // A class bar is a SCALE: six classes have to be told apart and six ticks read beside them, so
  // its floor is a tick PITCH that clears the tick's own line — 1.25 x the type, a normal line
  // height, over labels that are single short numerals — and not a fraction of the frame.
  const minBarHeight = ramp.length * Math.round(T.TICK.fontSize * 1.25);
  const legendBlockMin =
    T.CAPTION.fontSize + sp(BASE.CAPTION_TO_BAR) + minBarHeight;

  // ── R9, STATED, WITH THE ARITHMETIC ─────────────────────────────────────────────────────────
  //
  // TWO FLOORS, both derived from this beat's own furniture rather than typed as a fraction of the
  // frame, and the second one is the one the render found:
  //
  //  1. The map is never given more stage height than its geography can fill, and never less than
  //     its own KEY is tall — a map smaller than the scale it is read against is a map whose
  //     classes cannot be compared to it (`map-quake-density` states the same floor).
  //  2. THE SUBJECT'S NAME HAS TO FIT INSIDE THE SUBJECT. This beat centres the name on the shape
  //     (B6.10), so a name wider than the shape does not name it, it hides it — and what it hides
  //     on a choropleth is the DATA, because the subject's own shade is what the legend's two
  //     markers point at. See `subjectLabelHostWidth` for what the first landscape render measured.
  const subjectShapeForFloor = geometry.shapes.find(
    (shape) => shape.key === subject,
  );
  if (!subjectShapeForFloor)
    throw new Error(`no shape for the subject ${subject}`);
  const subjectPlateWidth = subjectLabelHostWidth(subjectShapeForFloor);
  const subjectNameWidth = measureText(subjectLabel, T.SUBJECT_LABEL);
  const minMapForName = Math.ceil(
    (subjectNameWidth * geometry.frame.width) / subjectPlateWidth,
  );
  const mapAtThisBand = Math.min(contentWidth, middleHeight);
  if (middleHeight < legendBlockMin || mapAtThisBand < minMapForName) {
    const caveatBlockAtFull =
      T.NOTE.fontSize + (caveatLines.length - 1) * T.NOTE.lead;
    const sourceBlock =
      T.SOURCE.fontSize + (sourceLines.length - 1) * T.SOURCE.lead;
    const bandHeight = band.height - PAD * 2;
    throw new Error(
      `mapgen-choropleth-video (video) cannot be drawn at ${size} (${FRAME.width}x${FRAME.height}).\n` +
        `THE WORDS. At ${size} the legibility floor is ${row.minTypePx}px — a ${FRAME.width}px ` +
        `frame watched at ${size === "landscape" ? 900 : 360} CSS px — and that is what makes them ` +
        `this tall: the title wraps to ${titleLines.length} lines and takes ${titleBlock}px of the ` +
        `${bandHeight}px band, the credit ${sourceLines.length} lines and ${sourceBlock}px, the ` +
        `caveat ${caveatBlockAtFull}px. That leaves ${middleHeight}px of band, so the square plate ` +
        `is drawn ${mapAtThisBand}px wide.\n` +
        `THE MAP THAT LEAVES. Its own legend is ${legendBlockMin}px tall` +
        (middleHeight < legendBlockMin
          ? ` — taller than the band itself, and a map smaller than the scale it is read against is not a map.\n`
          : `, which the band clears.\n`) +
        // Only stated where there is a band to draw in at all: below zero the shape has no width
        // to compare a name against, and a ratio against a negative number is not a reading.
        (mapAtThisBand > 0 && mapAtThisBand < minMapForName
          ? `But "${subjectLabel}" measures ${Math.round(subjectNameWidth)}px at the ` +
            `${T.SUBJECT_LABEL.fontSize}px this size's floor puts it at, against a subject drawn ` +
            `${Math.round((subjectPlateWidth * mapAtThisBand) / geometry.frame.width)}px wide — ` +
            `${((subjectNameWidth * geometry.frame.width) / (subjectPlateWidth * mapAtThisBand)).toFixed(2)}x ` +
            `the shape's own width. The name and its halo would cover the subject's class colour ` +
            `and its neighbours', and that colour is the evidence the two legend markers point at. ` +
            `The name fits inside the shape from a ${minMapForName}px map; this band gives ` +
            `${mapAtThisBand}px.\n`
          : ``) +
        `THE LADDER WAS RUN, and no rung above R9 fires on this beat:\n` +
        `${ladderForThisBeat()}\n` +
        `R4 is the only one that touches the name, and it does not reach this: dropping the ` +
        `annotation frees no BAND height — the name is drawn inside the map box — so the plate is ` +
        `still ${mapAtThisBand}px, and the beat's own alt says the subject is "outlined and named". ` +
        `Even with the caveat AND the whole legend removed, the title and the credit alone take ` +
        `${titleBlock + sourceBlock}px of the ${bandHeight}px band. Nothing in the ladder makes ` +
        `type smaller.\n` +
        `THE STATIC GENRE OF THIS BEAT SHIPS AT LANDSCAPE, from the same data and the same camera: ` +
        `its own words are set at the static floor (26px, an article column) instead of this one, ` +
        `which leaves it an 846px map. The video does not ship.`,
    );
  }

  const stage = mapStageBox({
    availableWidth: contentWidth,
    availableHeight: middleHeight,
    plateFrame: geometry.frame,
    studyLonSpanDeg: lonSpanOf(geometry),
  });
  const MAP = stage.width;
  const MAP_H = stage.height;

  // ── THE FIGURE — the plate and its key — IS CENTRED IN WHAT THE WORDS LEFT ──────────────────
  //
  // The plate is square over 59° of longitude, so at a landscape frame it is bound by HEIGHT, and
  // `mapStageBox` reports the leftover as `spareWidthPx`: 1282 px of it at 1920 x 1080. The key
  // takes what it measures and no more, and the pair is then centred in the row, so the spare falls
  // as margin on both sides rather than as one hole against the right rail. Giving the column ALL
  // the leftover width — which is what "the column is what is left" would do — is how a 65 px bar
  // ends up alone in the middle of a 1282 px field.
  const figureWidth = MAP + GUTTER + legendRowWidth;
  if (figureWidth > contentWidth)
    throw new Error(
      `the plate and its key do not fit side by side at ${size}: a ${MAP}px plate, a ${GUTTER}px ` +
        `gutter and a ${legendRowWidth}px key are ${figureWidth}px of ${contentWidth}px.`,
    );
  const MAP_X = PAD + Math.round((contentWidth - figureWidth) / 2);
  const MAP_Y = middleTop;
  const scale = MAP / geometry.frame.width;
  const COLUMN = { x: MAP_X + MAP + GUTTER, width: legendRowWidth };

  const noDataY = middleBottom - sp(BASE.NO_DATA_GAP);

  // The legend hangs off the top of the column, level with the plate's own top edge, and the bar
  // takes the height the plate beside it has — one figure, one height — so the slack a bigger frame
  // opens lands in ONE place, under the pair, where it reads as air rather than as a missing block.
  const captionY = middleTop + T.CAPTION.fontSize;
  const barTop = captionY + sp(BASE.CAPTION_TO_BAR);
  const legendFloor = anyNoData ? noDataY : middleBottom;
  const barAvailable = legendFloor - barTop;
  if (barAvailable < minBarHeight)
    throw new Error(
      `the column does not fit at ${size}: the legend starts at ${barTop} and the band ends at ` +
        `${legendFloor}, leaving ${barAvailable}px for a class bar whose own floor is ` +
        `${minBarHeight}px (${ramp.length} classes at a ${T.TICK.fontSize}px tick).`,
    );
  const barHeight = Math.min(barAvailable, sp(BASE.BAR_HEIGHT));
  const barBottom = barTop + barHeight;
  const barX = COLUMN.x + markerReserve;
  const atValue = (v: number) =>
    barBottom - scalePosition(v, breaks) * barHeight;

  const order = revealOrder(rows);
  const rank = new Map(order.map((key, index) => [key, index]));

  const subjectShape = geometry.shapes.find((shape) => shape.key === subject);
  if (!subjectShape) throw new Error(`no shape for the subject ${subject}`);
  // The subject's name is centred on the subject's own shape (B6.10). `geometry.anchors.label` —
  // two degrees typed into `bake.mjs` and hand-nudged east — is no longer read: see
  // `subjectLabelAnchor`'s own doc-comment for what it measured and why.
  const labelAt = subjectLabelAnchor(subjectShape);

  // ── The edit. Six windows, every one read off the contract.
  const establish = progressOf(frame, timing.establish);
  const reference = progressOf(frame, timing.reference);
  const reveal = progressOf(frame, timing.reveal);
  const conclusion = progressOf(frame, timing.conclusion);

  // Furniture — the basemap, the empty scale — comes up once, together, then never moves again.
  const furniture = interpolate(establish, [0, 1], [0, 1], {
    easing: Easing.out(Easing.cubic),
  });

  const referenceOpacity = interpolate(reference, [0, 1], [0, 1], {
    easing: Easing.out(Easing.cubic),
  });
  const conclusionOpacity = interpolate(conclusion, [0, 1], [0, 1], {
    easing: Easing.out(Easing.cubic),
  });

  // The subject lands as its own event, after its own fill is already on screen. Critically damped:
  // a ring that overshoots is, for those frames, drawn around more country than exists.
  const subjectSpring = spring({
    frame: frame - timing.subject.start,
    fps,
    config: { damping: 200, stiffness: 120, mass: 0.7 },
  });

  const shownMarkers = [
    { ...markers[0]!, opacity: referenceOpacity },
    { ...markers[1]!, opacity: conclusionOpacity },
  ];

  return (
    <AbsoluteFill style={{ backgroundColor: ground, fontFamily: FONT_FAMILY }}>
      {/* The plate is an IMAGE, not a map. Remotion's <Img> holds the frame until it has decoded,
          which a raw <image href> inside the svg would not. */}
      <Img
        src={plate}
        style={{
          position: "absolute",
          left: MAP_X,
          top: MAP_Y,
          width: MAP,
          height: MAP_H,
          opacity: furniture,
        }}
      />
      <svg
        width={FRAME.width}
        height={FRAME.height}
        viewBox={`0 0 ${FRAME.width} ${FRAME.height}`}
        style={{ position: "absolute", left: 0, top: 0 }}
      >
        <defs>
          <pattern
            id="no-data"
            width={sp(BASE.NO_DATA_TILE)}
            height={sp(BASE.NO_DATA_TILE)}
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(45)"
          >
            <rect
              width={sp(BASE.NO_DATA_TILE)}
              height={sp(BASE.NO_DATA_TILE)}
              fill={ground}
            />
            <line
              x1={0}
              y1={0}
              x2={0}
              y2={sp(BASE.NO_DATA_TILE)}
              stroke={muted}
              strokeWidth={sp(2)}
            />
          </pattern>
          {/* A country that has not yet reached its own window in the reveal must not read as a
              value — an opacity fade from nothing lets the near-white basemap show through, which
              reads LIGHTER than the lightest filled class: for several frames the map would state
              the opposite of the data. This is a SEPARATE mark from "no-data" (dots, not a diagonal
              hatch) because it means a different thing: "not drawn yet", not "the source is silent
              about this shape" — reusing the no-data hatch here would say the wrong thing on every
              frame before a country's turn arrives. */}
          <pattern
            id="pending"
            width={sp(BASE.PENDING_TILE)}
            height={sp(BASE.PENDING_TILE)}
            patternUnits="userSpaceOnUse"
          >
            <rect
              width={sp(BASE.PENDING_TILE)}
              height={sp(BASE.PENDING_TILE)}
              fill={ground}
            />
            <circle
              cx={sp(BASE.PENDING_TILE) / 2}
              cy={sp(BASE.PENDING_TILE) / 2}
              r={sp(BASE.PENDING_DOT)}
              fill={muted}
            />
          </pattern>
          <clipPath id="plate-clip">
            <rect x={MAP_X} y={MAP_Y} width={MAP} height={MAP_H} />
          </clipPath>
        </defs>

        {/* ── The field, arriving lowest value first. Gated on `furniture`, the same signal the
              plate <Img> is on, so frame 0 — the poster frame — carries the title and the source
              and NOTHING else. Ungated, every country's "pending" dot texture was painted at full
              opacity on a white ground at 0:00, before the basemap it sits on had appeared: a map
              of dashes with no title, no source and no land. ─────────────────────────────────── */}
        <g clipPath="url(#plate-clip)" opacity={furniture}>
          <g transform={`translate(${MAP_X},${MAP_Y}) scale(${scale})`}>
            {geometry.shapes.map((shape) => {
              const v = value.get(shape.key);
              const arrived = arrivalProgress(
                rank.get(shape.key) ?? 0,
                order.length,
                reveal,
              );
              const d = pathFromParts(shape.parts);
              const stroke = {
                stroke: ground,
                strokeWidth: sp(BASE.SHAPE_STROKE) / scale,
                strokeLinejoin: "round" as const,
              };

              if (v === null || v === undefined) {
                // No-data: unchanged. It arrives first in the order (rule 10) and its own hatch
                // already reads as "outside the scale". Never triggered on this beat's complete
                // join — kept because the field's `.map` must handle every shape uniformly, not
                // because this beat expects it to fire.
                if (arrived <= 0) return null;
                return (
                  <path
                    key={shape.key}
                    d={d}
                    fill="url(#no-data)"
                    fillRule="evenodd"
                    {...stroke}
                    opacity={arrived}
                  />
                );
              }

              // A value-bearing shape is opaque from its first frame and drawn ONCE: it holds the
              // "pending" dots — visibly not a shade the ramp could have produced — until its own
              // window opens, then CUTS to its true colour. Never translucent against the basemap,
              // so it never reads lighter than the lightest filled class
              // (`map-beat/SKILL.md:194-203`).
              const trueFill = ramp[binIndexLowerInclusive(v, breaks)];
              return (
                <path
                  key={shape.key}
                  d={d}
                  fill={arrived >= 1 ? trueFill : "url(#pending)"}
                  fillRule="evenodd"
                  {...stroke}
                />
              );
            })}

            {/* The accent, and only the accent, marks the subject — after its own fill exists. */}
            {subjectSpring > 0 ? (
              <g opacity={subjectSpring}>
                <path
                  d={pathFromParts(subjectShape.parts)}
                  fill="none"
                  stroke={ground}
                  strokeWidth={sp(BASE.SUBJECT_HALO_STROKE) / scale}
                  strokeLinejoin="round"
                />
                <path
                  d={pathFromParts(subjectShape.parts)}
                  fill="none"
                  stroke={accent}
                  strokeWidth={sp(BASE.SUBJECT_STROKE) / scale}
                  strokeLinejoin="round"
                />
              </g>
            ) : null}
          </g>

          {subjectSpring > 0 ? (
            <g
              transform={`translate(${MAP_X + labelAt[0] * scale},${MAP_Y + labelAt[1] * scale + (T.SUBJECT_LABEL.fontSize * CAP_HEIGHT_EM) / 2})`}
              opacity={subjectSpring}
            >
              <text
                textAnchor="middle"
                fontSize={T.SUBJECT_LABEL.fontSize}
                fontWeight={T.SUBJECT_LABEL.fontWeight}
                stroke={ground}
                strokeWidth={sp(BASE.SUBJECT_LABEL_HALO)}
                strokeLinejoin="round"
                fill="none"
              >
                {subjectLabel}
              </text>
              <text
                textAnchor="middle"
                fontSize={T.SUBJECT_LABEL.fontSize}
                fontWeight={T.SUBJECT_LABEL.fontWeight}
                fill={accent}
              >
                {subjectLabel}
              </text>
            </g>
          ) : null}
        </g>

        {/* ── The title and the credit: full opacity from frame 0, never gated on `establish`,
              whose progress at frame 0 is exactly 0. They say what the viewer is looking at, and
              they are what makes the poster frame a frame rather than a blank. ──────────────── */}
        {titleLines.map((line, i) => (
          <text
            key={line}
            x={PAD}
            y={titleTop + i * T.TITLE.lead}
            fill={ink}
            fontSize={T.TITLE.fontSize}
            fontWeight={T.TITLE.fontWeight}
          >
            {line}
          </text>
        ))}
        {sourceLines.map((line, i) => (
          <text
            key={line}
            x={PAD}
            y={sourceTop + i * T.SOURCE.lead}
            fill={muted}
            fontSize={T.SOURCE.fontSize}
          >
            {line}
          </text>
        ))}

        {/* ── The rest of the furniture — the legend, its caption and the caveat — belongs to the
              field and comes up with it. ───────────────────────────────────────────────────── */}
        <g opacity={furniture}>
          <text
            x={COLUMN.x}
            y={captionY}
            fill={muted}
            fontSize={T.CAPTION.fontSize}
            fontWeight={T.CAPTION.fontWeight}
          >
            {legendCaption}
          </text>
          {ramp.map((shade, i) => (
            <rect
              key={shade}
              x={barX}
              y={barBottom - ((i + 1) * barHeight) / ramp.length}
              width={BAR_WIDTH}
              height={barHeight / ramp.length}
              fill={shade}
            />
          ))}
          {[0, ...breaks].map((tick, i) => (
            <text
              key={tick}
              x={barX + BAR_WIDTH + sp(BASE.TICK_LABEL_GAP)}
              y={
                barBottom -
                (i * barHeight) / ramp.length +
                sp(BASE.TICK_BASELINE_NUDGE)
              }
              fill={muted}
              fontSize={T.TICK.fontSize}
            >
              {en(tick, 0)}
            </text>
          ))}

          {anyNoData ? (
            <g transform={`translate(${COLUMN.x},${noDataY})`}>
              <rect
                x={0}
                y={-sp(BASE.NO_DATA_SWATCH.lift)}
                width={sp(BASE.NO_DATA_SWATCH.width)}
                height={sp(BASE.NO_DATA_SWATCH.height)}
                fill="url(#no-data)"
                stroke={muted}
                strokeWidth={sp(0.6)}
              />
              <text
                x={sp(BASE.NO_DATA_SWATCH.textX)}
                y={0}
                fill={muted}
                fontSize={T.TICK.fontSize}
              >
                {noDataLabel}
              </text>
            </g>
          ) : null}
          {caveatLines.map((line, i) => (
            <text
              key={line}
              x={PAD}
              y={caveatTop + i * T.NOTE.lead}
              fill={muted}
              fontSize={T.NOTE.fontSize}
            >
              {line}
            </text>
          ))}
        </g>

        {/* ── The two marks the argument is made of. The comparison (Sweden) arrives BEFORE the
              evidence and is left alone to be read; the subject's (Poland) own value only after
              the subject has landed. */}
        {shownMarkers.map(({ label, value: v, colour, opacity }) =>
          opacity > 0 ? (
            <g
              key={label}
              transform={`translate(${barX - sp(BASE.MARKER_GAP)},${atValue(v)})`}
              opacity={opacity}
            >
              <path
                d={`M0 0L${-sp(BASE.MARKER_ARROW_LENGTH)} ${-sp(BASE.MARKER_ARROW_HALF)}L${-sp(BASE.MARKER_ARROW_LENGTH)} ${sp(BASE.MARKER_ARROW_HALF)}Z`}
                fill={colour}
              />
              <text
                x={-sp(BASE.MARKER_TEXT_GAP)}
                y={-sp(BASE.MARKER_NAME_LIFT)}
                textAnchor="end"
                fill={colour}
                fontSize={T.MARKER.fontSize}
                fontWeight={T.MARKER.fontWeight}
              >
                {label}
              </text>
              <text
                x={-sp(BASE.MARKER_TEXT_GAP)}
                y={sp(BASE.MARKER_VALUE_DROP)}
                textAnchor="end"
                fill={colour}
                fontSize={T.MARKER_VALUE.fontSize}
                fontWeight={T.MARKER_VALUE.fontWeight}
              >
                {en(v, 1)}
              </text>
            </g>
          ) : null,
        )}
      </svg>
    </AbsoluteFill>
  );
}
