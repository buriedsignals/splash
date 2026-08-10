/**
 * The static genre of "Where 2024's earthquakes clustered" — one frame, no order. A HEX-GRID beat:
 * raw epicentres binned into a regular tessellation so the eye reads density instead of an
 * unreadable smear of 14,000 overlapping dots. See `map-beat/references/types/hex-grid.md`.
 *
 * ── THERE IS NO `const FRAME_WIDTH` HERE ANY MORE, AND ITS ABSENCE IS THE POINT ────────────────
 *
 * It used to read `900`, with a height this file DERIVED from the plate (`stillFrameHeight`, now
 * gone) and the render script called to ask what size to rasterise at. That derivation was a good
 * answer to the wrong question: it made the FRAME follow the plate, so a journalist pinning an
 * export size at gate 2c reached nothing at all — the beat shipped whatever height its own caveat
 * happened to wrap to. The frame is now `sizeFor(size)`'s, `size` is read out of this beat's own
 * `BRIEF.md`, and the plate is fitted INTO it.
 *
 * ── WHICH MEANS THE PLATE IS NO LONGER DRAWN 1:1, AND THAT IS SAFE FOR EXACTLY ONE REASON ─────
 *
 * The old comment beside `MAP_X`/`MAP_Y` said the plate's box must be `geometry.frame` verbatim
 * "so the hex cells never need a scale transform that would also squash the hexagons into
 * ellipses". The hazard was real and the remedy was too strong: what turns a hexagon into an
 * ellipse is a NON-UNIFORM scale. `mapStageBox` keeps the plate's own aspect ratio at every size —
 * that is its whole contract, and it is `geo.ts`'s rule read at the frame — so one number scales
 * the plate, the cell centres and the cell radius together, and a hexagon stays a hexagon. The
 * assertion that guarantees it is `assertStageHonoursGeography`, inside `mapStageBox`.
 *
 * ── AND THE MAP IS NOT LAID OUT LIKE A PLOT ──────────────────────────────────────────────────
 *
 * A chart clamps its plot into an aspect range measured for its type. A map has no plot rectangle:
 * what fixes its shape is the CAMERA, and this beat's camera is frozen — the committed plate is a
 * raster whose bake fitted the study bounds, so the plate's own aspect IS the shape this geography
 * takes. The leftover goes to FURNITURE, never to a wider camera and never to a crop.
 *
 * Where the leftover LANDS is the one thing this beat had to work out for itself, because its plate
 * is WIDE (836x480, 1.742:1) inside frames that are wide too. Stacking the furniture above and
 * below the map — the arrangement the beat shipped at 900px — spends the frame's HEIGHT, and at
 * this aspect every pixel of height costs 1.74 pixels of the map's width. Measured at 1920x1080:
 * stacked, the furniture takes 364px of the 855px left above the credit and the map is 855x491; in
 * a column beside it the map is 1213x697 — 1.4x the width and 2.0x the area, from the same words at
 * the same legibility floor. So the furniture stands in a COLUMN beside the plate, and the column is
 * the narrowest one this beat's own words fit in, widened back to whatever the geography cannot use.
 */

import { Fragment } from "react";
import { FONT_FAMILY, measureText } from "./render-still.mjs";
import { frameInsetFor, sizeFor, stageFor } from "#shared/chart-beat/sizes.mjs";
import {
  lonSpanOf,
  mapStageBox,
  typeScaleFor,
} from "#shared/map-beat/stage.mjs";
import { binIndexUpperInclusive, hexCorners, type HexCell } from "./geo-hex";

/**
 * THE 900px TUNING, KEPT AS THE BASE, WITH THE SIZE AS THE MULTIPLIER.
 *
 * Every spacing number goes through `sp`, not only the fonts — the probe measured what happens
 * otherwise: eleven bare literals in one beat's layout arithmetic collided the title into the
 * subtitle at 1920x1080. `PAD` is the one exception, because a frame's margin is proportional to
 * the CANVAS and not to the type (`frameInsetFor`, and `sizes.mjs` states the split). The hex
 * geometry is the second exception and a different one: `HEX_STROKE` scales with the PLATE, not
 * with the type, because it is a seam between two pieces of the picture rather than a piece of
 * furniture.
 */
const BASE = {
  TITLE: { fontSize: 20, fontWeight: 700, lead: 26 },
  SOURCE: { fontSize: 13, fontWeight: 400, lead: 17 },
  CAPTION: { fontSize: 12, fontWeight: 600 },
  /** 11.5 AND 11 UNTIL THE MIGRATION, AND THAT WAS THE DEFECT RATHER THAN A TUNING. `sizes.mjs`
   *  derives every row's `typeScale` from a smallest base token of 12 — "seed base tokens: TITLE 26
   *  / LABEL 15 / SOURCE 14 / AXIS 13 / GAP_NOTE 12 <- smallest is 12" — so a beat carrying 11
   *  misses every row's floor BY CONSTRUCTION and can only be rescued by `typeScaleFor` inventing a
   *  bigger multiplier for the whole hierarchy. Raising the two tokens is the smaller change and
   *  keeps this beat inside the table's own arithmetic; it costs a hierarchy that had already
   *  collapsed anyway, since 12 / 11.5 / 11 all round to 26 at the landscape floor. */
  NOTE: { fontSize: 12, fontWeight: 400, lead: 15 },
  LEGEND_LABEL: { fontSize: 12, fontWeight: 400 },
  /** The one sentence the ringed cell is allowed to spend on the plate. Bold, because it has to
   *  hold its own against a shaded grid, and small, because the plate is the argument and this is a
   *  caption on it. */
  SUBJECT_NOTE: { fontSize: 13, fontWeight: 700 },
  GUTTER: 32,
  BLOCK_AIR: 16,
  /** Clear air between the map's bottom edge and its own key. */
  MAP_TO_LEGEND: 30,
  /** And between the credit strip at the frame's foot and everything above it. */
  CAVEAT_TO_SOURCE: 12,
  LEGEND_CAPTION_LEAD: 4,
  LEGEND_TOP_AIR: 10,
  LEGEND_SWATCH: 16,
  LEGEND_LABEL_GAP: 4,
  LEGEND_ITEM_GAP: 22,
  LEGEND_LABEL_DROP: 4,
  /** The hairline round a key swatch, and it is what makes the PALEST class visible at all on a
   *  white ground. Scaled UNROUNDED — `sp` rounds to integers so `measureText`'s cache keys stay
   *  stable, which is a reason about text and not about a sub-pixel stroke. */
  LEGEND_SWATCH_STROKE: 0.5,
  /** The air between the ringed hexagon and its own words. */
  SUBJECT_NOTE_GAP: 10,
  /** The leading of a caption that has wrapped — the same 13/17 ratio the credit carries. */
  SUBJECT_NOTE_LEAD: 17,
  SUBJECT_NOTE_HALO: 4,
  SUBJECT_NOTE_EDGE_AIR: 4,
  /** The accent ring is EMPHASIS, so it scales with the type and not with the plate: it has to read
   *  as a deliberate mark at every size, and at a plate scale under 1 a plate-scaled ring would
   *  thin out exactly where the map is smallest and the cell hardest to find. */
  SUBJECT_RING: 2,
};

/** The seam between two neighbouring cells — part of the PICTURE, so it scales with the plate. */
const HEX_STROKE = 0.6;
/** Cells are drawn a hair inside their own hexagon so the seam reads. A ratio, not a spacing. */
const HEX_INSET = 0.97;

/** The smallest token this beat draws. `typeScaleFor` would raise the row's default multiplier for
 *  a beat whose smallest token is under the seed's 12; this beat's is 12, so it answers the table's
 *  own scale and this call is the check rather than the correction. */
const SMALLEST_BASE_TOKEN = BASE.LEGEND_LABEL.fontSize;

/**
 * Helvetica's cap height, 717/1000 em, from Adobe's own AFM for the face this beat draws in (Arial,
 * the substitute, is 716). It centres a line of type on a point rather than hanging it from its
 * baseline. `dominant-baseline` is not used because resvg and Chrome do not agree on it and this
 * project draws the same beats in both.
 */
const CAP_HEIGHT_EM = 0.717;

function tokens(typeScale: number) {
  const sp = (v: number) => Math.round(v * typeScale);
  const f = <T extends { fontSize: number; lead?: number }>(tok: T) => ({
    ...tok,
    fontSize: sp(tok.fontSize),
    ...(tok.lead === undefined ? {} : { lead: sp(tok.lead) }),
  });
  return {
    sp,
    /** The same multiplier without the rounding, for the sub-pixel strokes. */
    hairline: (v: number) => v * typeScale,
    TITLE: f(BASE.TITLE) as typeof BASE.TITLE,
    SOURCE: f(BASE.SOURCE) as typeof BASE.SOURCE,
    CAPTION: f(BASE.CAPTION) as typeof BASE.CAPTION,
    NOTE: f(BASE.NOTE) as typeof BASE.NOTE,
    LEGEND_LABEL: f(BASE.LEGEND_LABEL) as typeof BASE.LEGEND_LABEL,
    SUBJECT_NOTE: f(BASE.SUBJECT_NOTE) as typeof BASE.SUBJECT_NOTE,
  };
}

export type HexGridStillProps = {
  geometry: {
    frame: { width: number; height: number };
    frameCorners: { west: number; north: number; east: number; south: number };
  };
  plate: string;
  cells: HexCell[];
  hexSize: number;
  breaks: number[];
  ramp: string[];
  title: string;
  source: string;
  basemapCredit: string;
  legendCaption: string;
  caveat: string;
  alt: string;
  ground: string;
  accent: string;
  ink: string;
  muted: string;
  subjectKey: string;
  /** What the emphasised cell IS. See `subjectNote`'s use below: the ring is a promise. */
  subjectNote: string;
  /** The export size gate 2c pinned, read from `BRIEF.md` by `render.mjs`. */
  size: string;
};

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

function classLabel(index: number, breaks: number[]): string {
  const lower = index === 0 ? 1 : breaks[index - 1]! + 1;
  const upper = index === breaks.length ? null : breaks[index];
  return upper === null
    ? `${lower}+`
    : lower === upper
      ? `${lower}`
      : `${lower}–${upper}`;
}

export function HexGridStill({
  geometry,
  plate,
  cells,
  hexSize,
  breaks,
  ramp,
  title,
  source,
  basemapCredit,
  legendCaption,
  caveat,
  alt,
  ground,
  accent,
  ink,
  muted,
  subjectKey,
  subjectNote,
  size,
}: HexGridStillProps) {
  const row = sizeFor(size);
  const FRAME = { width: row.width, height: row.height };
  const PAD = frameInsetFor(size);
  const T = tokens(typeScaleFor(row, SMALLEST_BASE_TOKEN));
  const sp = T.sp;
  const GUTTER = sp(BASE.GUTTER);

  // THE BAND, not the frame. Where the platform reserves part of the frame — portrait alone today —
  // everything a reader has to read lives inside it, because content outside it is at risk of being
  // COVERED by the platform's own chrome and no clipping counter can see that.
  const band = stageFor(size);
  const top = band.top + PAD;
  const contentWidth = FRAME.width - PAD * 2;

  const sourceText = `${source} · ${basemapCredit}`;
  const studyLonSpanDeg = lonSpanOf(geometry);

  // ── THE CREDIT IS A STRIP ACROSS THE FOOT OF THE FRAME, AT THE FULL CONTENT WIDTH ─────────────
  //
  // It used to be the last block of the text column, which is where a beat that lays its column out
  // from both ends naturally puts it — and at 900x560 that WAS the frame's foot, so nothing showed
  // the difference. A narrow column is what shows it: wrapped into the 472px column the first
  // migrated render gave it, the credit became five lines whose first landed at y=835 of 1080 —
  // the top of the bottom quarter, and
  // not the bottom eighth `credit-anchors-to-the-frame-bottom.test.ts` (Guard C) measures on the
  // committed SVG. At the full 1750px it is one line, on the margin, under everything it credits.
  //
  // The anchor is written out — `band.top + band.height - PAD` and not the `bottom` it equals —
  // because the guard READS this expression: a credit derived from anything above it is the defect
  // it exists to catch, and a bare local name it cannot resolve is indistinguishable from one. It
  // is also the honest anchor at portrait, where the platform covers the frame's last 672px and a
  // credit pinned to the FRAME's floor is a credit nobody can read.
  const sourceLines = wrap(sourceText, contentWidth, T.SOURCE);
  const sourceBottom = band.top + band.height - PAD;
  const sourceTop = sourceBottom - (sourceLines.length - 1) * T.SOURCE.lead;
  // Everything else lives above the strip. `contentHeight` is what the map and the column share.
  const contentBottom =
    sourceTop - T.SOURCE.fontSize - sp(BASE.CAVEAT_TO_SOURCE);
  const contentHeight = contentBottom - top;

  const subject = cells.find((c) => c.key === subjectKey);
  if (!subject) throw new Error(`no cell for the subject ${subjectKey}`);

  // ── The key, measured in the font it is drawn in ─────────────────────────────────────────────
  // The key stands UNDER the map and spans it, so its width is a floor on how narrow the plate may
  // be drawn: a map narrower than its own key is a map whose classes cannot be named beside it.
  const legendItems = ramp.map((shade, i) => {
    const label = classLabel(i, breaks);
    return {
      shade,
      label,
      width:
        sp(BASE.LEGEND_SWATCH) +
        sp(BASE.LEGEND_LABEL_GAP) +
        measureText(label, T.LEGEND_LABEL),
    };
  });
  const legendRowWidth = Math.ceil(
    legendItems.reduce((sum, item) => sum + item.width, 0) +
      sp(BASE.LEGEND_ITEM_GAP) * (legendItems.length - 1),
  );
  const legendBlockFor = (mapWidth: number) => {
    const lines = wrap(legendCaption, mapWidth, T.CAPTION);
    return {
      lines,
      height:
        lines.length * (T.CAPTION.fontSize + sp(BASE.LEGEND_CAPTION_LEAD)) +
        sp(BASE.LEGEND_TOP_AIR) +
        sp(BASE.LEGEND_SWATCH),
    };
  };

  // ── The column, measured. Title and caveat only — the credit is the strip below. ─────────────
  const columnBlocks = (width: number) => {
    const titleLines = wrap(title, width, T.TITLE);
    const caveatLines = wrap(caveat, width, T.NOTE);
    const height =
      T.TITLE.fontSize +
      (titleLines.length - 1) * T.TITLE.lead +
      sp(BASE.BLOCK_AIR) +
      T.NOTE.fontSize +
      (caveatLines.length - 1) * T.NOTE.lead;
    return { titleLines, caveatLines, height };
  };
  // The floor under the column is derived from the strings this beat actually draws, never typed as
  // a fraction: a word that cannot be broken and cannot fit is a word that runs off the frame.
  const longestWord = (
    text: string,
    font: { fontSize: number; fontWeight: number },
  ) => Math.max(...text.split(/\s+/).map((w) => measureText(w, font)));
  const minColumn = Math.ceil(
    Math.max(longestWord(title, T.TITLE), longestWord(caveat, T.NOTE)),
  );

  /**
   * The plate's box and its key inside a given width and height. The two are circular — the key's
   * caption wraps at the plate's width, and the plate's height is what is left after the key — so
   * it is iterated to a fixed point rather than computed once at the box width and hoped for.
   */
  const fitPicture = (boxWidth: number, availableHeight: number) => {
    let width = boxWidth;
    for (let pass = 0; pass < 4; pass++) {
      const legend = legendBlockFor(width);
      const mapAvailHeight =
        availableHeight - sp(BASE.MAP_TO_LEGEND) - legend.height;
      if (mapAvailHeight <= 0) return null;
      const stage = mapStageBox({
        availableWidth: boxWidth,
        availableHeight: mapAvailHeight,
        plateFrame: geometry.frame,
        studyLonSpanDeg,
      });
      if (stage.width === width) return { stage, legend };
      width = stage.width;
    }
    return null;
  };

  // THE NARROWEST COLUMN THIS BEAT'S OWN WORDS FIT IN, and the map takes everything else.
  //
  // Read from the other end this is "the biggest map whose leftover still holds the furniture",
  // which is the only order that can refuse honestly — a map sized first and furniture squeezed
  // after is how a credit ends up off the frame with every counter green. The scan is over the
  // column's width because the wrap is a STEP function of it: one pixel can cost a whole line, and
  // there is no closed form for two blocks wrapping at once.
  //
  // AND THE COLUMN THEN TAKES BACK WHATEVER THE GEOGRAPHY CANNOT USE. Below a certain column width
  // the plate stops being bound by width and starts being bound by height, so a narrower column
  // buys no more map — it only opens a gap nothing explains. The chosen column is therefore widened
  // to the plate's own drawn width, which can only reduce its line count, and the words are
  // re-wrapped at the width they are actually drawn at.
  let chosen: {
    columnWidth: number;
    column: ReturnType<typeof columnBlocks>;
    stage: ReturnType<typeof mapStageBox>;
    legend: ReturnType<typeof legendBlockFor>;
  } | null = null;
  for (let c = minColumn; c + GUTTER + legendRowWidth <= contentWidth; c++) {
    const fitted = fitPicture(contentWidth - GUTTER - c, contentHeight);
    if (!fitted) continue;
    if (fitted.stage.width < legendRowWidth) continue;
    const columnWidth = contentWidth - GUTTER - fitted.stage.width;
    const column = columnBlocks(columnWidth);
    if (column.height > contentHeight) continue;
    chosen = { columnWidth, column, ...fitted };
    break;
  }

  if (!chosen) {
    // R9, stated, with the arithmetic of BOTH arrangements in it — because "it did not fit" is not
    // a result and "the other layout would have" is the first question a reader of this message has.
    const widestBox = contentWidth - GUTTER - minColumn;
    const besideColumn = columnBlocks(minColumn);
    const stackedLegend = legendBlockFor(contentWidth);
    const stacked = columnBlocks(contentWidth);
    const stackedFurniture =
      stacked.height +
      sp(BASE.MAP_TO_LEGEND) +
      stackedLegend.height +
      sp(BASE.BLOCK_AIR);
    const stackedMapHeight = contentHeight - stackedFurniture;
    throw new Error(
      `map-quake-density cannot be drawn at ${size} (${FRAME.width}x${FRAME.height}).\n` +
        `The plate is ${geometry.frame.width}x${geometry.frame.height} over ` +
        `${studyLonSpanDeg.toFixed(0)}° of longitude, and at ${size} the legibility floor is ` +
        `${row.minTypePx}px, which is what makes the furniture this tall: title ` +
        `${besideColumn.titleLines.length} lines and caveat ${besideColumn.caveatLines.length} at ` +
        `the ${minColumn}px this beat's own longest unbreakable word needs, over a credit strip of ` +
        `${sourceLines.length} line(s) at the frame's foot.\n` +
        `BESIDE the plate: that narrowest column takes ${besideColumn.height}px of the ` +
        `${contentHeight}px left above the credit, and it leaves the plate ${widestBox}px against ` +
        `a five-class key that measures ${legendRowWidth}px — a map narrower than its own key ` +
        `cannot name its classes beside it.\n` +
        `STACKED above the column: the furniture takes ${stackedFurniture}px of that ` +
        `${contentHeight}px, leaving ${stackedMapHeight}px for the map.\n` +
        `Nothing in the removal ladder makes type smaller, and this beat's caveat is the sentence ` +
        `that keeps its own claim honest ("${firstClause(caveat)}"), so it is not a line to drop.\n` +
        `It ships at landscape.`,
    );
  }

  const { columnWidth, column, stage, legend } = chosen;
  const MAP = { width: stage.width, height: stage.height };
  // The whole picture — plate and key — is one block, and the leftover height the geography cannot
  // fill is split above and below it rather than piling up at one end.
  const pictureHeight = MAP.height + sp(BASE.MAP_TO_LEGEND) + legend.height;
  const MAP_X = PAD + columnWidth + GUTTER;
  const MAP_Y = top + Math.round((contentHeight - pictureHeight) / 2);

  // ONE NUMBER SCALES THE PLATE, THE CELL CENTRES AND THE CELL RADIUS TOGETHER. `mapStageBox` keeps
  // the plate's aspect, so this is a uniform scale and a hexagon stays a hexagon.
  const plateScale = MAP.width / geometry.frame.width;

  const COLUMN = { x: PAD, width: columnWidth };
  const titleTop = top + T.TITLE.fontSize;
  const titleBottom = titleTop + (column.titleLines.length - 1) * T.TITLE.lead;
  // The column is laid out from BOTH ends — title on the top margin, caveat on the foot of the
  // content area, just above the credit strip — so the slack a bigger frame opens lands in ONE
  // place, between them, where it reads as air rather than as a missing block. See
  // map-beat/assets/Co2MapStill.tsx, which this is copied from.
  const caveatBottom = contentBottom;
  const caveatTop =
    caveatBottom - (column.caveatLines.length - 1) * T.NOTE.lead;
  // The two halves that can meet. The scan above already proved they do not, so this is a tripwire
  // on the scan rather than a second opinion about the layout.
  if (caveatTop - T.NOTE.fontSize - sp(BASE.BLOCK_AIR) < titleBottom)
    throw new Error(
      `the column does not fit at ${size}: the title ends at ${titleBottom}, the caveat starts at ${caveatTop}.`,
    );

  // EMPHASIS IS A PROMISE, AND THIS IS WHERE IT IS KEPT (B6.16).
  //
  // The ring below spends this beat's one accent on a single hexagon out of 150. Before this, the
  // plate said nothing at all about which cell that was or why — its facts ("1,724 events",
  // "Fiji", "Tonga") reached only `<desc>`, so a screen-reader user was told and a sighted reader
  // was left with an orange outline and a question. The owner read it as odd, and it is: the rule
  // was already WRITTEN and already applied in a sibling of this very family
  // (`mapscrolly-quakes-three-ways/MapFrames.tsx`, "the cells the prose names are RINGED in the
  // accent") and it never travelled to the beat that has no prose to lean on.
  //
  // So the note is required, and it is required to CARRY THE CELL'S OWN NUMBER — a sentence that
  // did not would be a caption drifting away from the mark the moment the data moved.
  const subjectCount = subject.count.toLocaleString();
  if (!subjectNote.trim())
    throw new Error(
      `cell ${subjectKey} is ringed in the accent and nothing is said about it — a mark emphasised ` +
        `without a word on the plate is the reader's question with no answer (its own facts are in ` +
        `<desc>, which a sighted reader never sees). Pass subjectNote.`,
    );
  if (!subjectNote.includes(subjectCount))
    throw new Error(
      `the ringed cell holds ${subjectCount} events and its note does not say so: ${JSON.stringify(subjectNote)}. ` +
        `A caption on an emphasised mark states that mark's own number, or it is decoration.`,
    );

  // ── WHERE THE RINGED CELL'S WORDS STAND, AND WHY THE FRAME FORCED THIS TO BE DERIVED ─────────
  //
  // It used to be "right of the hexagon unless the plate has no room there, then left" — an edge
  // test, which is the only thing that can go wrong on a 836px plate. The bigger frame showed what
  // else can: at 1920x1080 the plate is drawn 1.45x and the one-line caption, still one line, laid
  // its halo straight across a cell of the TOP CLASS — 829 events, carved in two by a white band,
  // with every counter green because nothing was clipped and nothing ran off the plate.
  //
  // A caption crossing a cell is unavoidable on a tessellation: there is no empty ground to stand
  // in, only ocean the grid does not reach. What is avoidable is WHICH cells, and the beat's own
  // legend is the budget — no free parameter, no typed threshold:
  //
  //   1. the box must be whole on the plate;
  //   2. then: the LOWEST class the box crosses at all, so the darker a cell is, the harder the
  //      caption works to stand off it. `assertRampReads` calls the top class "the class carrying
  //      this map's argument" when it holds it to 3:1; this is that sentence as a placement rule;
  //   3. then: the declared order — right, left, above, below;
  //   4. then: the fewest lines.
  //
  // THE FORMS ARE THE NOTE'S OWN STRUCTURE, not a shrink and not a re-wrap at an invented width.
  // `render.mjs` emits two facts joined by a middot — "<count> events · <where>" — so the caption
  // breaks at its own separator or not at all. A width-driven wrap was tried first and measured
  // BETTER on cells crossed at four lines and five; it is not used, because "1,724 / events · /
  // Fiji and / Tonga" shreds a sentence into a ragged column and leaves a separator dangling at the
  // end of a line. Measured on this plate at 1920x1080: one line right crosses class 5 (the 829),
  // one line left class 4 (549), two lines right class 3 (59). Two lines right wins by rule 2.
  const subjectCx = subject.cx * plateScale;
  const subjectCy = subject.cy * plateScale;
  const subjectReach = hexSize * plateScale + sp(BASE.SUBJECT_NOTE_GAP);
  const edgeAir = sp(BASE.SUBJECT_NOTE_EDGE_AIR);
  const noteLead = sp(BASE.SUBJECT_NOTE_LEAD);
  const noteInk = measureText(subjectNote, T.SUBJECT_NOTE);
  const drawnR = hexSize * plateScale;
  /** Which class a crossed cell belongs to, 1-based; 0 when the box crosses nothing at all. */
  const classOf = (cell: HexCell) =>
    binIndexUpperInclusive(cell.count, breaks) + 1;

  type NotePlacement = {
    side: "right" | "left" | "above" | "below";
    lines: string[];
    anchor: "start" | "end" | "middle";
    x: number;
    firstBaseline: number;
    box: { x: number; y: number; width: number; height: number };
    worstClass: number;
    crossed: number;
  };
  const noteParts = subjectNote.split(/\s+·\s+/).filter((p) => p.trim());
  const noteForms =
    noteParts.length > 1 ? [[subjectNote], noteParts] : [[subjectNote]];
  const placements: NotePlacement[] = [];
  for (const lines of noteForms) {
    const w = Math.max(...lines.map((l) => measureText(l, T.SUBJECT_NOTE)));
    const h = (lines.length - 1) * noteLead + T.SUBJECT_NOTE.fontSize;
    const centred = Math.min(
      Math.max(subjectCx - w / 2, edgeAir),
      MAP.width - edgeAir - w,
    );
    const sides = [
      {
        side: "right" as const,
        anchor: "start" as const,
        x: subjectCx + subjectReach,
        bx: subjectCx + subjectReach,
        by: subjectCy - h / 2,
      },
      {
        side: "left" as const,
        anchor: "end" as const,
        x: subjectCx - subjectReach,
        bx: subjectCx - subjectReach - w,
        by: subjectCy - h / 2,
      },
      {
        side: "above" as const,
        anchor: "middle" as const,
        x: centred + w / 2,
        bx: centred,
        by: subjectCy - subjectReach - h,
      },
      {
        side: "below" as const,
        anchor: "middle" as const,
        x: centred + w / 2,
        bx: centred,
        by: subjectCy + subjectReach,
      },
    ];
    for (const s of sides) {
      const box = { x: s.bx, y: s.by, width: w, height: h };
      if (
        box.x < edgeAir ||
        box.y < 0 ||
        box.x + box.width > MAP.width - edgeAir ||
        box.y + box.height > MAP.height
      )
        continue;
      const crossed = cells.filter(
        (c) =>
          c.key !== subjectKey &&
          c.cx * plateScale + drawnR > box.x &&
          c.cx * plateScale - drawnR < box.x + box.width &&
          c.cy * plateScale + drawnR > box.y &&
          c.cy * plateScale - drawnR < box.y + box.height,
      );
      placements.push({
        side: s.side,
        lines,
        anchor: s.anchor,
        x: s.x,
        firstBaseline: box.y + T.SUBJECT_NOTE.fontSize * CAP_HEIGHT_EM,
        box,
        worstClass: crossed.length ? Math.max(...crossed.map(classOf)) : 0,
        crossed: crossed.length,
      });
    }
  }
  if (placements.length === 0)
    throw new Error(
      `the ringed cell's note ("${subjectNote}", ${noteInk.toFixed(0)}px at ` +
        `${T.SUBJECT_NOTE.fontSize}px) fits nowhere beside its own hexagon inside the ` +
        `${MAP.width}x${MAP.height} plate this ${size} frame gives it — the cell sits at ` +
        `x=${subjectCx.toFixed(0)}, y=${subjectCy.toFixed(0)}, and none of the four sides holds ` +
        `it whole either as one line or split at its own separator. Shorten the note; it must not ` +
        `be clipped, and the type does not go under the ${row.minTypePx}px floor.`,
    );
  const SIDE_ORDER = ["right", "left", "above", "below"];
  const notePlacement = placements.sort(
    (a, b) =>
      a.worstClass - b.worstClass ||
      SIDE_ORDER.indexOf(a.side) - SIDE_ORDER.indexOf(b.side) ||
      a.lines.length - b.lines.length ||
      a.crossed - b.crossed,
  )[0]!;

  const legendCaptionTop =
    MAP_Y + MAP.height + sp(BASE.MAP_TO_LEGEND) + T.CAPTION.fontSize;
  const swatchTop =
    MAP_Y +
    MAP.height +
    sp(BASE.MAP_TO_LEGEND) +
    legend.lines.length * (T.CAPTION.fontSize + sp(BASE.LEGEND_CAPTION_LEAD)) +
    sp(BASE.LEGEND_TOP_AIR);

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={FRAME.width}
      height={FRAME.height}
      viewBox={`0 0 ${FRAME.width} ${FRAME.height}`}
      fontFamily={FONT_FAMILY}
      role="img"
    >
      <desc>{alt}</desc>
      <defs>
        <clipPath id="plate-clip">
          <rect x={0} y={0} width={MAP.width} height={MAP.height} />
        </clipPath>
      </defs>

      <rect
        x={0}
        y={0}
        width={FRAME.width}
        height={FRAME.height}
        fill={ground}
      />

      {/* ── The column ──────────────────────────────────────────────────────────────────── */}
      {column.titleLines.map((line, i) => (
        <text
          key={line}
          x={COLUMN.x}
          y={titleTop + i * T.TITLE.lead}
          fill={ink}
          fontSize={T.TITLE.fontSize}
          fontWeight={T.TITLE.fontWeight}
        >
          {line}
        </text>
      ))}
      {column.caveatLines.map((line, i) => (
        <text
          key={line}
          x={COLUMN.x}
          y={caveatTop + i * T.NOTE.lead}
          fill={muted}
          fontSize={T.NOTE.fontSize}
        >
          {line}
        </text>
      ))}
      {/* ── The credit, across the foot of the frame, under everything it credits ────────── */}
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

      {/* ── The map ─────────────────────────────────────────────────────────────────────── */}
      <g transform={`translate(${MAP_X},${MAP_Y})`} clipPath="url(#plate-clip)">
        <image href={plate} x={0} y={0} width={MAP.width} height={MAP.height} />
        {cells.map((cell) => {
          const isSubject = cell.key === subjectKey;
          const fill = ramp[binIndexUpperInclusive(cell.count, breaks)]!;
          const corners = hexCorners(
            cell.cx * plateScale,
            cell.cy * plateScale,
            hexSize * plateScale * HEX_INSET,
          );
          const d = `M${corners.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join("L")}Z`;
          return (
            <path
              key={cell.key}
              d={d}
              fill={fill}
              stroke={isSubject ? accent : ground}
              strokeWidth={
                isSubject ? sp(BASE.SUBJECT_RING) : HEX_STROKE * plateScale
              }
            />
          );
        })}

        {/* The ringed cell's own words, on the plate, beside the mark they belong to. SIDE AND
            WRAP ARE BOTH DERIVED — see the ladder above, which scores the four sides and the
            note's own one-, two- and three-line forms against the cells each box would cross, and
            spends its first budget on never covering a cell of the class the argument is made
            with. Each line is drawn twice — a ground-coloured halo, then the ink — because the
            thing underneath is a raster basemap whose colour nothing in this tree can measure, and
            a halo is this corpus's own answer to that (see
            `annotation-reads-over-what-it-crosses.test.ts`, which exempts a haloed label from its
            strike check for the same reason). */}
        {notePlacement.lines.map((line, i) => (
          <Fragment key={line}>
            <text
              x={notePlacement.x}
              y={notePlacement.firstBaseline + i * noteLead}
              textAnchor={notePlacement.anchor}
              fontSize={T.SUBJECT_NOTE.fontSize}
              fontWeight={T.SUBJECT_NOTE.fontWeight}
              stroke={ground}
              strokeWidth={sp(BASE.SUBJECT_NOTE_HALO)}
              strokeLinejoin="round"
              fill="none"
            >
              {line}
            </text>
            <text
              x={notePlacement.x}
              y={notePlacement.firstBaseline + i * noteLead}
              textAnchor={notePlacement.anchor}
              fontSize={T.SUBJECT_NOTE.fontSize}
              fontWeight={T.SUBJECT_NOTE.fontWeight}
              fill={ink}
            >
              {line}
            </text>
          </Fragment>
        ))}
      </g>

      {/* ── The key: a horizontal row of swatches under the map, each with its own count range ── */}
      {legend.lines.map((line, i) => (
        <text
          key={line}
          x={MAP_X}
          y={
            legendCaptionTop +
            i * (T.CAPTION.fontSize + sp(BASE.LEGEND_CAPTION_LEAD))
          }
          fill={muted}
          fontSize={T.CAPTION.fontSize}
          fontWeight={T.CAPTION.fontWeight}
        >
          {line}
        </text>
      ))}
      {(() => {
        let x = MAP_X;
        return legendItems.map((item) => {
          const node = (
            <Fragment key={item.shade}>
              <rect
                x={x}
                y={swatchTop}
                width={sp(BASE.LEGEND_SWATCH)}
                height={sp(BASE.LEGEND_SWATCH)}
                fill={item.shade}
                stroke={muted}
                strokeWidth={T.hairline(BASE.LEGEND_SWATCH_STROKE)}
              />
              <text
                x={x + sp(BASE.LEGEND_SWATCH) + sp(BASE.LEGEND_LABEL_GAP)}
                y={
                  swatchTop +
                  sp(BASE.LEGEND_SWATCH) -
                  sp(BASE.LEGEND_LABEL_DROP)
                }
                fill={muted}
                fontSize={T.LEGEND_LABEL.fontSize}
              >
                {item.label}
              </text>
            </Fragment>
          );
          x += item.width + sp(BASE.LEGEND_ITEM_GAP);
          return node;
        });
      })()}
    </svg>
  );
}

/** The clause of the caveat a refusal quotes back, so the refusal names the sentence it will not
 *  drop rather than gesturing at "the caveat". Derived from the text it was handed. */
function firstClause(caveat: string): string {
  const sentence = caveat.split("—")[0]!.trim();
  return sentence.length > 90 ? `${sentence.slice(0, 87)}…` : sentence;
}
