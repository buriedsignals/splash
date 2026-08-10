/**
 * The static genre of "More than half of this map's population lives in five countries" — one frame,
 * no order. A DOT-DENSITY beat: one dot per fixed number of people, scattered inside each country's
 * own polygon, so density reads as texture rather than one flat colour per region (which is what a
 * choropleth would draw instead). See `map-beat/references/types/dot-density.md`.
 *
 * ── THERE IS NO `const FRAME_WIDTH` HERE ANY MORE, AND ITS ABSENCE IS THE POINT ────────────────
 *
 * It used to read `920`, with a height this file DERIVED from the plate (`stillFrameHeight`, now
 * gone) and the render script called to ask what size to rasterise at. That derivation was a real
 * fix to a real defect — it closed 400 px of bare ground at the frame's foot — but it was a good
 * answer to the wrong question: it made the FRAME follow the plate, so a journalist pinning an
 * export size at gate 2c reached nothing at all. The frame is now `sizeFor(size)`'s, `size` is read
 * out of this beat's own `BRIEF.md`, and the plate is fitted INTO it.
 *
 * ── THE MAP IS NOT LAID OUT LIKE A PLOT ───────────────────────────────────────────────────────
 *
 * A chart clamps its plot into an aspect range measured for its type. A map has no plot rectangle:
 * what fixes its shape is the CAMERA, and this beat's camera is frozen — the committed plate is a
 * raster whose bake fitted the study bounds, so the plate's own aspect (860 x 760, 1.132:1) IS the
 * shape this geography takes. `mapStageBox` scales that aspect to whichever dimension binds first
 * and hands back what is left; the leftover goes to FURNITURE, never to a wider camera and never to
 * a crop (`skills/map-beat/assets/geo.ts`, the rule; `scripts/stage.mjs`, the arithmetic).
 *
 * ── AND A DOT IS AN AREA ENCODING, WHICH SURVIVES THE MOVE ONLY IF TWO THINGS DO ───────────────
 *
 * 1. **The dot radius.** A uniform enlargement scales the marks with the plate. Past `median gap /
 *    2` the typical pair of dots overlaps and the field reads as a wash — a choropleth nobody chose.
 *    `markRadiusCeilingPx` in `geo-dot.ts` is that ceiling, taken from the drawn field's own median
 *    nearest-neighbour distance; `assertDrawnDotsStillReadAsDots` re-measures it off the delivered
 *    markup afterwards.
 * 2. **The caveat's projection sentence.** One drawn pixel covers 4.3x more ground at this frame's
 *    67°N than at its 36°N, so the same people per square kilometre are drawn 4.3x more thinly in
 *    the north. `assertProjectionIsDisclosed` is called BEFORE the layout, because the temptation a
 *    fixed frame creates is to shorten the caveat until the column fits.
 */

import { Fragment } from "react";
import { FONT_FAMILY, measureText } from "./render-still.mjs";
import { frameInsetFor, sizeFor, stageFor } from "#shared/chart-beat/sizes.mjs";
import {
  lonSpanOf,
  mapStageBox,
  typeScaleFor,
} from "#shared/map-beat/stage.mjs";
import {
  MIN_DOT_RADIUS_PX,
  assertProjectionIsDisclosed,
  dotFieldFacts,
  markRadiusCeilingPx,
  pointInRings,
} from "./geo-dot";

/**
 * THE 920px TUNING, KEPT AS THE BASE, WITH THE SIZE AS THE MULTIPLIER.
 *
 * Every spacing number goes through `sp`, not only the fonts — the probe measured what happens
 * otherwise: eleven bare literals in one beat's layout arithmetic collided the title into the
 * subtitle at 1920x1080. `PAD` is the one exception, because a frame's margin is proportional to the
 * CANVAS and not to the type (`frameInsetFor`, and `sizes.mjs` states the split); `DOT_R` and
 * `COAST_STROKE` are the other two, and a different one — they are pieces of the PICTURE, so they
 * scale with the plate, not with the words.
 */
const BASE = {
  TITLE: { fontSize: 21, fontWeight: 700, lead: 27 },
  SOURCE: { fontSize: 13, fontWeight: 400, lead: 17 },
  DOT_KEY: { fontSize: 16, fontWeight: 700, lead: 20 },
  // 12, not the 11.5 this beat was tuned at. The size table derives every row's `typeScale` from a
  // smallest base token of 12 (`sizes.mjs`: "seed base tokens … smallest is 12"), so a beat carrying
  // 11.5 misses every floor by construction and `typeScaleFor` has to invent a bigger multiplier for
  // the WHOLE hierarchy to rescue one token. Raising the token is the smaller change and keeps the
  // beat inside the table's own arithmetic.
  NOTE: { fontSize: 12, fontWeight: 400, lead: 15 },
  COUNTRY_LABEL: { fontSize: 12.5, fontWeight: 700 },
  GUTTER: 32,
  /** Between the title and everything under it. */
  TITLE_TO_BODY: 16,
  /** Between the dot-value key and the study-area key. */
  STUDY_KEY_GAP: 26,
  /** Between the study-area key and the caveat block. */
  CAVEAT_GAP: 30,
  /** Between the last body block and the credit at the frame's foot. */
  SOURCE_GAP: 12,
  /** The air between the plate's bottom edge and the column, when they stack. */
  MAP_TO_KEY: 34,
  STUDY_SWATCH_W: 14,
  STUDY_SWATCH_H: 12,
  STUDY_SWATCH_DROP: 10,
  STUDY_TEXT_X: 22,
  /** The name plate behind a labelled country: its air, its height, its baseline drop. */
  LABEL_PLATE_AIR: 4,
  LABEL_PLATE_H: 16,
  LABEL_PLATE_TOP: 14,
  LABEL_BASELINE: 2,
};

/** A dot's radius on the 860px plate this beat was tuned at. It is a piece of the picture, so it
 *  scales with the PLATE — and is then capped by the field's own median gap, which is the only
 *  number that knows whether the dots have started to merge. */
const BASE_DOT_R = 1.15;
/** The seam between the study fill and the water. Part of the picture; scales with the plate. */
const COAST_STROKE = 0.6;

/** The smallest token this beat draws — the caveat and the study-area key. `typeScaleFor` puts it on
 *  the size's own legibility floor, which the table's default scale cannot do for a beat whose
 *  smallest token is under the seed's 12. */
const SMALLEST_BASE_TOKEN = BASE.NOTE.fontSize;

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
    DOT_KEY: f(BASE.DOT_KEY) as typeof BASE.DOT_KEY,
    NOTE: f(BASE.NOTE) as typeof BASE.NOTE,
    COUNTRY_LABEL: f(BASE.COUNTRY_LABEL) as typeof BASE.COUNTRY_LABEL,
  };
}

export type DotDensityStillProps = {
  geometry: {
    frame: { width: number; height: number };
    frameCorners: { west: number; north: number; east: number; south: number };
  };
  plate: string;
  shapes: { key: string; parts: [number, number][][][] }[];
  dots: { key: string; points: [number, number][] }[];
  labelled: { key: string; name: string; anchor: [number, number] }[];
  dotValue: number;
  totalPopulation: number;
  totalDots: number;
  title: string;
  source: string;
  basemapCredit: string;
  caveat: string;
  alt: string;
  ground: string;
  accent: string;
  /** The shade of `accent` that survives the study-area wash — see `dotInkThatReadsOn`. */
  dotInk: string;
  ink: string;
  muted: string;
  landTint: string;
  landTintOpacity: number;
  studySwatch: string;
  studyCount: number;
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

function ringPath(rings: [number, number][][]): string {
  return rings
    .filter((ring) => ring.length >= 3)
    .map(
      (ring) =>
        "M" +
        ring.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join("L") +
        "Z",
    )
    .join("");
}

export function DotDensityStill({
  geometry,
  plate,
  shapes,
  dots,
  labelled,
  dotValue,
  totalPopulation,
  totalDots,
  title,
  source,
  basemapCredit,
  caveat,
  alt,
  ground,
  dotInk,
  ink,
  muted,
  landTint,
  landTintOpacity,
  studySwatch,
  studyCount,
  size,
}: DotDensityStillProps) {
  const row = sizeFor(size);
  const FRAME = { width: row.width, height: row.height };
  const PAD = frameInsetFor(size);
  const T = tokens(typeScaleFor(row, SMALLEST_BASE_TOKEN));
  const sp = T.sp;
  const GUTTER = sp(BASE.GUTTER);

  // A dot drawn in a colour nobody derived is the defect this prop exists to prevent: the accent
  // straight off the palette measures 3.33:1 on this map's own study area (B6.13).
  if (!dotInk)
    throw new Error(
      "no dotInk was supplied — render.mjs derives it with dotInkThatReadsOn against the study " +
        "area's composited ground, and a dot map's dots cannot be drawn in an unmeasured colour",
    );

  // BEFORE THE LAYOUT, because the layout is what would be tempted to drop the sentence. See
  // `assertProjectionIsDisclosed`: at this camera the projection alone spreads a northern country's
  // dots over 4.3x more paper than a southern one's at the same people per square kilometre.
  assertProjectionIsDisclosed(geometry.frameCorners, caveat, {
    what: `mapmore-dot-population at ${size}`,
  });

  // THE BAND, not the frame. Where the platform reserves part of the frame — portrait alone today —
  // everything a reader has to read lives inside it, because content outside it is at risk of being
  // COVERED by the platform's own chrome and no clipping counter can see that.
  const band = stageFor(size);
  const top = band.top + PAD;
  const bottom = band.bottom - PAD;
  const contentWidth = FRAME.width - PAD * 2;
  const contentHeight = bottom - top;

  const sourceText = `${source} · ${basemapCredit}`;
  const dotKeyText = `● 1 dot = ${dotValue.toLocaleString("en-US")} people  —  ${totalDots.toLocaleString("en-US")} dots drawn for ${totalPopulation.toLocaleString("en-US")} people`;
  const studyKeyText = `Shaded: the ${studyCount} countries counted in that total. Unshaded land is outside this map — see the note below.`;
  const studyLonSpanDeg = lonSpanOf(geometry);

  // ── The two blocks that span the whole frame, top and bottom ─────────────────────────────────
  // The title spans it because it is the argument, and the credit because it belongs to the whole
  // graphic rather than to the column beside the map. Both are measured first, and what is left
  // between them is what the map and the rest of the words divide.
  const titleLines = wrap(title, contentWidth, T.TITLE);
  const titleTop = top + T.TITLE.fontSize;
  const titleBottom = titleTop + (titleLines.length - 1) * T.TITLE.lead;
  const sourceLines = wrap(sourceText, contentWidth, T.SOURCE);
  // THE SOURCE IS THE LAST LINE BEFORE THE BOTTOM MARGIN — the credit sits at the bottom of the
  // visual, the same place on every graphic this project ships, and it carries the basemap credit
  // with it, unsplit. It is the BAND's floor rather than the frame's: at portrait the platform covers
  // the frame's last 672px, and a credit pinned to a frame's floor is a credit nobody can read.
  // See map-beat/assets/Co2MapStill.tsx, which this is copied from.
  const sourceBottom = band.top + band.height - PAD;
  const sourceTop = sourceBottom - (sourceLines.length - 1) * T.SOURCE.lead;

  const bodyTop = titleBottom + sp(BASE.TITLE_TO_BODY);
  const bodyBottom = sourceTop - T.SOURCE.fontSize - sp(BASE.SOURCE_GAP);
  const bodyHeight = bodyBottom - bodyTop;

  // ── The column, measured ─────────────────────────────────────────────────────────────────────
  // Three blocks, read downward: the dot-value key (which turns a texture into a number and is drawn
  // at headline weight for it), the study-area key, and the caveat.
  const columnBlocks = (width: number) => {
    const dotKeyLines = wrap(dotKeyText, width, T.DOT_KEY);
    const studyKeyLines = wrap(
      studyKeyText,
      width - sp(BASE.STUDY_TEXT_X),
      T.NOTE,
    );
    const caveatLines = wrap(caveat, width, T.NOTE);
    const height =
      T.DOT_KEY.fontSize +
      (dotKeyLines.length - 1) * T.DOT_KEY.lead +
      sp(BASE.STUDY_KEY_GAP) +
      T.NOTE.fontSize +
      (studyKeyLines.length - 1) * T.NOTE.lead +
      sp(BASE.CAVEAT_GAP) +
      T.NOTE.fontSize +
      (caveatLines.length - 1) * T.NOTE.lead;
    return { dotKeyLines, studyKeyLines, caveatLines, height };
  };
  // The floor under the column is derived from the strings this beat actually draws, never typed as
  // a fraction: a word that cannot be broken and cannot fit is a word that runs off the frame, and
  // this beat's caveat carries "micro-territories" and "(Åland," — tokens with no break in them.
  const longestWord = (
    text: string,
    font: { fontSize: number; fontWeight: number },
  ) => Math.max(...text.split(/\s+/).map((w) => measureText(w, font)));
  const minColumn = Math.ceil(
    Math.max(
      longestWord(dotKeyText, T.DOT_KEY),
      longestWord(studyKeyText, T.NOTE) + sp(BASE.STUDY_TEXT_X),
      longestWord(caveat, T.NOTE),
    ),
  );

  // ── THE SMALLEST THE MAP MAY BE DRAWN, IN THIS BEAT'S OWN UNITS ──────────────────────────────
  //
  // Not a fraction of the frame and not the width of a word: a dot map stops being one when its own
  // dots stop being distinguishable, and that happens at a scale, not at a size. The field's median
  // nearest-neighbour gap on the plate fixes it — the ceiling `median * scale / 2` has to stay above
  // the 1 px a disc needs to survive a 1:1 rasterisation, so
  //
  //     scale >= 2 * MIN_DOT_RADIUS_PX / medianGapOnPlate.
  //
  // Below that there is no arrangement of furniture that saves the picture, so it is checked once
  // and quoted in the refusal.
  const platePoints = dots.flatMap((d) => d.points);
  const plateField = dotFieldFacts(platePoints, BASE_DOT_R);
  const minPlateScale =
    (2 * MIN_DOT_RADIUS_PX) / plateField.medianNearestNeighbourPx;
  const minMapWidth = Math.ceil(minPlateScale * geometry.frame.width);

  // THE NARROWEST COLUMN THIS BEAT'S OWN WORDS FIT IN, and the map takes everything else.
  //
  // Read from the other end this is "the biggest map whose leftover still holds the words", which is
  // the only order that can refuse honestly — a map sized first and furniture squeezed after is how
  // a caveat ends up off the frame with every counter green. The scan starts at the column the map
  // leaves when it takes the whole band's height (widening past that buys the column nothing but
  // costs the map), and steps by one spacing unit rather than one pixel: the wrap is a step function
  // of the width, and every evaluation measures every word in a 120-word caveat.
  const besideMap = mapStageBox({
    availableWidth: contentWidth,
    availableHeight: Math.max(bodyHeight, 1),
    plateFrame: geometry.frame,
    studyLonSpanDeg,
  });
  const STEP = sp(4);
  let chosen: {
    columnWidth: number;
    column: ReturnType<typeof columnBlocks>;
    stage: ReturnType<typeof mapStageBox>;
  } | null = null;
  if (bodyHeight > 0)
    for (
      let c = Math.max(minColumn, contentWidth - besideMap.width - GUTTER);
      contentWidth - GUTTER - c >= minMapWidth;
      c += STEP
    ) {
      const column = columnBlocks(c);
      if (column.height > bodyHeight) continue;
      const stage = mapStageBox({
        availableWidth: contentWidth - GUTTER - c,
        availableHeight: bodyHeight,
        plateFrame: geometry.frame,
        studyLonSpanDeg,
      });
      chosen = { columnWidth: c, column, stage };
      break;
    }

  if (!chosen) {
    // R9, stated, with the arithmetic of BOTH arrangements in it — because "it did not fit" is not a
    // result, and "would stacking it have worked?" is the first question a reader of this message
    // has. Stacked is this beat's own shipped arrangement at 920px, so it is the one to answer for.
    const besideColumn = columnBlocks(
      Math.max(minColumn, contentWidth - besideMap.width - GUTTER),
    );
    const stacked = columnBlocks(contentWidth);
    const stackedMapHeight = bodyHeight - stacked.height - sp(BASE.MAP_TO_KEY);
    throw new Error(
      `mapmore-dot-population cannot be drawn at ${size} (${FRAME.width}x${FRAME.height}).\n` +
        `The plate is ${geometry.frame.width}x${geometry.frame.height} over ` +
        `${studyLonSpanDeg.toFixed(0)}° of longitude, the title takes ${titleLines.length} lines ` +
        `and the credit ${sourceLines.length}, leaving a ${contentHeight}px band with ` +
        `${bodyHeight}px between them for the map and the words.\n` +
        `BESIDE the plate: the narrowest column this beat's own longest unbreakable word allows is ` +
        `${minColumn}px, and its three blocks take ${besideColumn.height}px of those ${bodyHeight}px ` +
        `(dot-value key ${besideColumn.dotKeyLines.length} lines, study-area key ` +
        `${besideColumn.studyKeyLines.length}, caveat ${besideColumn.caveatLines.length}); widening ` +
        `it until they fit leaves the plate under the ${minMapWidth}px its own dots need.\n` +
        `STACKED under the plate, which is how this beat shipped at 920px: the same blocks at the ` +
        `full ${contentWidth}px take ${stacked.height}px, leaving ${stackedMapHeight}px of map.\n` +
        `At ${size} the legibility floor is ${row.minTypePx}px, which is what makes the words this ` +
        `tall, and nothing in the removal ladder makes type smaller. The caveat cannot be shortened ` +
        `to fit either: it names the exclusions an absence would otherwise read as a zero, and it ` +
        `carries the projection sentence this map's own area encoding depends on.\n` +
        `It ships at landscape.`,
    );
  }

  const { columnWidth, column, stage } = chosen;
  const MAP = { width: stage.width, height: stage.height };
  // The plate sits against the left margin under the title, the column against the right. The
  // leftover height the geography cannot fill sits under the plate, where the credit already is.
  const MAP_X = PAD;
  const MAP_Y = bodyTop;
  const COLUMN = { x: PAD + MAP.width + GUTTER, width: columnWidth };

  // ONE NUMBER SCALES THE PLATE, THE COUNTRY OUTLINES AND THE DOT FIELD TOGETHER. `mapStageBox`
  // keeps the plate's aspect, so this is a uniform scale — a country's shape is its own, not a
  // stretched version of it.
  const plateScale = MAP.width / geometry.frame.width;

  // The dots, at the size the reader actually sees them. `dotFieldFacts` measures the DRAWN field:
  // the radius is the uniform-scale one, capped at half the field's own median gap, and refused
  // outright below the radius a disc needs to survive rasterisation.
  const drawnDots = dots.map((d) => ({
    key: d.key,
    points: d.points.map(
      ([x, y]) => [x * plateScale, y * plateScale] as [number, number],
    ),
  }));
  // A uniform scale multiplies every distance by the same number, so the drawn field's median gap is
  // the plate field's median gap times `plateScale` — exactly, not approximately. That is why this
  // does not run a second O(n²) pass over three thousand dots; the independent re-measurement is
  // `assertDrawnDotsStillReadAsDots`, which reads the delivered markup after the file is written.
  const field = {
    count: plateField.count,
    medianNearestNeighbourPx: plateField.medianNearestNeighbourPx * plateScale,
    radiusPx: markRadiusCeilingPx(
      plateField.medianNearestNeighbourPx * plateScale,
      BASE_DOT_R * plateScale,
    ),
  };
  if (field.radiusPx < MIN_DOT_RADIUS_PX)
    throw new Error(
      `mapmore-dot-population at ${size}: the plate is drawn ${MAP.width}px wide (x${plateScale.toFixed(3)} ` +
        `of its own ${geometry.frame.width}px), which puts ${field.count} dots a median ` +
        `${field.medianNearestNeighbourPx.toFixed(2)}px apart and admits a radius of only ` +
        `${field.radiusPx.toFixed(2)}px — under the ${MIN_DOT_RADIUS_PX}px a disc needs to read as a ` +
        `mark at all. A dot map whose dots cannot be seen has no encoding left.`,
    );
  const DOT_R = Number(field.radiusPx.toFixed(2));

  // ── WHERE EACH COUNTRY'S NAME STANDS, MEASURED AGAINST THE GROUND IT COVERS ─────────────────
  //
  // THE DEFECT THE BIGGER FRAME REVEALED, and nothing but looking at the render could see it. Each
  // name used to be drawn centred on its own country's dot centroid, which was safe at 920px
  // because the label was 12.5px and its plate about 80px wide. At the export size the type is on a
  // 26px floor, so the same plate is 2.3x wider — and a centroid is not a place. The first
  // 1920x1080 render put "Germany" half over the Netherlands and Belgium, and "Italy" over the
  // Ligurian Sea and the French border, touching no part of Italy at all: a name plate that names
  // the wrong ground, with every counter green, because a label's box was never measured against
  // anything but itself.
  //
  // So the position is DERIVED rather than taken from the centroid, over a ladder of candidates
  // spread across the country's own dot cloud. It is ONE OBJECTIVE UNDER ONE CONSTRAINT, and the
  // shape matters, because three other shapes were tried against this data and each broke a
  // different way:
  //
  //   THE OBJECTIVE — put as much of the plate as possible on the ground it names, sampled on a
  //   5 x 3 grid across the box. A direct label makes exactly one claim and this is it, so it is
  //   maximised rather than traded. Minimising hidden dots instead is the trap that produced the
  //   second and third bad renders: the sea hides nothing, so the ladder walks every name into it —
  //   "Germany" ended up in the German Bight, and Britain's fell to 2 samples of its own ground.
  //   A threshold ("stands on it if more than half") is the same trap with a gate in front of it.
  //
  //   THE CONSTRAINT — no plate may hide more than a SIXTH of the dots of a country it does not
  //   name. The plate is opaque, so over its own country it hides some of its own evidence, which
  //   every direct label on a dot map does and which is the price of labelling directly at all;
  //   over a NEIGHBOUR it erases evidence about ground the plate says nothing about, and past a
  //   sixth that stops reading as a label lying over a fill and starts reading as a gap in it.
  //   Measured on this data, both violations are real and both are extreme rather than marginal:
  //   the ground-first optimum for "Germany" erases 26 of the Netherlands' 90 dots (29 %, a bite out
  //   of the second-tightest fill on the map, which this beat's own alt text names), and for
  //   "United Kingdom" it erases 21 of Ireland's 27 (78 %). Under the constraint they fall to 16 of
  //   Poland's 184 (9 %) and 4 of Ireland's 27 (15 %).
  //
  // Ties break on the neighbour count and then on distance from the cloud's centre, so among equally
  // honest positions the name sits where the reader would look for it. No candidate may fall off the
  // plate or over an already-placed name. If the constraint excludes everything, the beat draws the
  // best unconstrained candidate rather than dropping a name it has promised in its title — a
  // dropped subject label is the worse failure, and this fallback is where a future data set would
  // announce itself.
  //
  // WHAT THIS DOES NOT FIX, stated rather than hidden: the five plates still erase 421 of the 2,996
  // dots, about 14 % of the field, because a name at a 26 px floor is 2.3x wider than the same name
  // at 12.5px and the plate under it is opaque for a measured reason (see the rect below). Only 22
  // of those 421 belong to a country the plate does not name. That is the type floor's own cost on
  // this beat, and whether a dot map at this size should label its subjects some other way is a
  // person's call, not a derivation's.
  /** No plate may erase more than this share of a country it does not name. */
  const MAX_NEIGHBOUR_SHARE = 1 / 6;
  const dotsByKey = new Map(drawnDots.map((d) => [d.key, d.points]));
  const partsByKey = new Map(shapes.map((s) => [s.key, s.parts]));
  const inBox = (
    p: [number, number],
    b: { x: number; y: number; width: number; height: number },
  ) =>
    p[0] >= b.x &&
    p[0] <= b.x + b.width &&
    p[1] >= b.y &&
    p[1] <= b.y + b.height;
  const takenBoxes: { x: number; y: number; width: number; height: number }[] =
    [];
  const nameplates = labelled.map((l) => {
    const textWidth = measureText(l.name, T.COUNTRY_LABEL);
    const width = textWidth + sp(BASE.LABEL_PLATE_AIR) * 2;
    const height = sp(BASE.LABEL_PLATE_H);
    const own = dotsByKey.get(l.key) ?? [];
    const otherClouds = drawnDots.filter((d) => d.key !== l.key);
    const anchor: [number, number] = [
      l.anchor[0] * plateScale,
      l.anchor[1] * plateScale,
    ];
    // The cloud's own extent is what the offsets are measured in, so a wide country's name may
    // travel further than a narrow one's and neither is a typed number of pixels.
    const spanX = own.length
      ? Math.max(...own.map((p) => p[0])) - Math.min(...own.map((p) => p[0]))
      : 0;
    const spanY = own.length
      ? Math.max(...own.map((p) => p[1])) - Math.min(...own.map((p) => p[1]))
      : 0;
    const parts = partsByKey.get(l.key) ?? [];
    // How much of the BOX stands on this country, on a 5 x 3 grid of its own area — the rings are
    // the bake's own, so a sample is divided back out of the drawn scale before it is tested.
    const groundUnder = (b: {
      x: number;
      y: number;
      width: number;
      height: number;
    }) => {
      let on = 0;
      for (const u of [0.1, 0.3, 0.5, 0.7, 0.9])
        for (const v of [0.25, 0.5, 0.75]) {
          const point: [number, number] = [
            (b.x + u * b.width) / plateScale,
            (b.y + v * b.height) / plateScale,
          ];
          if (parts.some((rings) => pointInRings(point, rings))) on += 1;
        }
      return on;
    };
    const fractions = [0, -0.1, 0.1, -0.2, 0.2, -0.3, 0.3];
    const candidates: {
      cx: number;
      cy: number;
      box: { x: number; y: number; width: number; height: number };
      onOwnGround: number;
      others: number;
      own: number;
      /** The worst share any single other country loses to this plate, and who loses it. */
      worstShare: number;
      worstLoser: string;
      away: number;
    }[] = [];
    for (const fx of fractions)
      for (const fy of fractions) {
        const cx = anchor[0] + fx * spanX;
        const cy = anchor[1] + fy * spanY;
        const box = {
          x: cx - width / 2,
          y: cy - sp(BASE.LABEL_PLATE_TOP),
          width,
          height,
        };
        if (
          box.x < 0 ||
          box.y < 0 ||
          box.x + box.width > MAP.width ||
          box.y + box.height > MAP.height
        )
          continue;
        if (
          takenBoxes.some(
            (t) =>
              box.x < t.x + t.width &&
              box.x + box.width > t.x &&
              box.y < t.y + t.height &&
              box.y + box.height > t.y,
          )
        )
          continue;
        // Per country, not in one heap: the constraint is about what any ONE neighbour loses, and a
        // heap would let a plate eat a small country whole as long as the total stayed low.
        let others = 0;
        let worstShare = 0;
        let worstLoser = "";
        for (const cloud of otherClouds) {
          const hit = cloud.points.filter((p) => inBox(p, box)).length;
          if (hit === 0) continue;
          others += hit;
          const share = hit / cloud.points.length;
          if (share > worstShare) {
            worstShare = share;
            worstLoser = `${cloud.key} ${hit}/${cloud.points.length}`;
          }
        }
        candidates.push({
          cx,
          cy,
          box,
          onOwnGround: groundUnder(box),
          others,
          own: own.filter((p) => inBox(p, box)).length,
          worstShare,
          worstLoser,
          away: Math.hypot(cx - anchor[0], cy - anchor[1]),
        });
      }
    if (candidates.length === 0)
      throw new Error(
        `at ${size} there is nowhere on the ${MAP.width}x${MAP.height} plate to stand ${l.name}'s ` +
          `name: its plate measures ${Math.round(width)}x${height}px at the ${T.COUNTRY_LABEL.fontSize}px ` +
          `floor and every position over its own dot cloud is off the plate or under another name. ` +
          `A dot map's subject countries are labelled directly or they are not its subject.`,
      );
    // The constraint first, as a filter, and the objective inside it. `sort` on a copy, so the
    // ladder above stays readable in the order it was generated.
    const legal = candidates.filter((c) => c.worstShare <= MAX_NEIGHBOUR_SHARE);
    const best = [...(legal.length > 0 ? legal : candidates)].sort(
      (a, b) =>
        b.onOwnGround - a.onOwnGround || a.others - b.others || a.away - b.away,
    )[0]!;
    takenBoxes.push(best.box);
    return { ...l, ...best, textWidth };
  });

  // ── The column's own vertical arithmetic, laid out from the TOP ─────────────────────────────
  // One anchor chain, downward. The locator beside this one was laid out from both ends and put a
  // 250px hole in its own middle at 1920x1080 — slack that lands between two blocks reads as a
  // missing block, and slack that lands at the foot of a column reads as the column ending.
  const dotKeyTop = bodyTop + T.DOT_KEY.fontSize;
  const dotKeyBottom =
    dotKeyTop + (column.dotKeyLines.length - 1) * T.DOT_KEY.lead;
  const studyKeyTop = dotKeyBottom + sp(BASE.STUDY_KEY_GAP) + T.NOTE.fontSize;
  const studyKeyBottom =
    studyKeyTop + (column.studyKeyLines.length - 1) * T.NOTE.lead;
  const caveatTop = studyKeyBottom + sp(BASE.CAVEAT_GAP) + T.NOTE.fontSize;
  const caveatBottom =
    caveatTop + (column.caveatLines.length - 1) * T.NOTE.lead;
  // A tripwire on the scan above rather than a second opinion about the layout: the scan already
  // proved the three blocks fit the band, so this fires only if the two derivations ever disagree.
  if (caveatBottom > bodyBottom)
    throw new Error(
      `the column does not fit at ${size}: the caveat ends at ${caveatBottom}, the body band at ${bodyBottom}.`,
    );

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
        <clipPath id="dot-plate-clip">
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

      {/* ── The map ─────────────────────────────────────────────────────────────────────── */}
      <g
        transform={`translate(${MAP_X},${MAP_Y})`}
        clipPath="url(#dot-plate-clip)"
      >
        <image href={plate} x={0} y={0} width={MAP.width} height={MAP.height} />

        {/* Every study country: a light neutral TINT and an outline, so a reader sees the region even
            where its own dot count is too small to read as texture (dot-density.md: distribution
            WITHIN a region, which needs the region's own edge to be visible in the first place).
            A tint, not an opaque fill, for two reasons measured in `geo-dot.ts`: it has to be far
            enough from the plate's unpainted land that "counted here" and "not in this map" are
            different colours, and it has to let the basemap's own water through, or every inland
            lake inside a study country is painted over as land.
            Drawn inside ONE scale group: the ring coordinates are the bake's own, and the seam
            between fill and water is part of the picture, so `COAST_STROKE` scales with it. */}
        <g transform={`scale(${plateScale})`}>
          {shapes.map((s) => (
            <path
              key={s.key}
              d={ringPath(s.parts.flat())}
              fill={landTint}
              fillOpacity={landTintOpacity}
              stroke={muted}
              strokeWidth={COAST_STROKE}
            />
          ))}
        </g>

        {/* One dot colour for every dot — this is a univariate map (dot-density.md: "A single-value
            map uses one dot colour for every dot") — and one dot RADIUS for every dot, or size would
            read as a second variable nobody encoded. Drawn at the scaled coordinates rather than
            inside the scale group above, because the radius is not the plate's to scale past the
            point where the field stops reading as dots. */}
        {drawnDots.map((d) => (
          <Fragment key={d.key}>
            {d.points.map((p, i) => (
              <circle
                key={i}
                cx={Number(p[0].toFixed(1))}
                cy={Number(p[1].toFixed(1))}
                r={DOT_R}
                fill={dotInk}
              />
            ))}
          </Fragment>
        ))}

        {/* The five countries the title's own claim names, labelled directly on their own dot
            cluster — never a value the scale does not contain, just the country's own name. */}
        {nameplates.map((l) => {
          const { cx, cy, box } = l;
          return (
            <g key={l.key}>
              {/* THE NAME PLATE IS OPAQUE. It used to be `opacity={0.82}`, which let 18% of whatever
                  it covered bleed through the words: measured, black on the dot ink showing through
                  a plate is 2.98:1, against the 4.5:1 a bold label owes. A plate exists to give a
                  name one background — a plate you can see the data through has not given it one. It
                  also made the label unmeasurable: `annotation-reads-over-what-it-crosses` skips any
                  fill under `opacity: 1` rather than guessing at a composite (its own blind spot 5),
                  so it read straight past this rect to the dots and reported the label as illegible.
                  Opaque, the same scan reads 21:1 and it is true. */}
              <rect
                x={box.x}
                y={box.y}
                width={box.width}
                height={box.height}
                fill={ground}
              />
              <text
                x={cx}
                y={cy - sp(BASE.LABEL_BASELINE)}
                fill={ink}
                fontSize={T.COUNTRY_LABEL.fontSize}
                fontWeight={T.COUNTRY_LABEL.fontWeight}
                textAnchor="middle"
              >
                {l.name}
              </text>
            </g>
          );
        })}
      </g>

      {/* ── The dot-value key — headline-level legibility, not a footer line (dot-density.md's own
           accessibility trap: this is the ONE piece of text that turns a texture into a number). ── */}
      {column.dotKeyLines.map((line, i) => (
        <text
          key={line}
          x={COLUMN.x}
          y={dotKeyTop + i * T.DOT_KEY.lead}
          fill={ink}
          fontSize={T.DOT_KEY.fontSize}
          fontWeight={T.DOT_KEY.fontWeight}
        >
          {line}
        </text>
      ))}

      {/* ── What the shading itself means. `geo-discipline.md` rule 7 asks a no-data colour to be
           NAMED in the legend rather than left to be inferred; the mirror of that rule is that a
           study-area shading has to be named too, or a reader is left to guess whether an unshaded
           country holds no people or was simply never counted. ── */}
      <rect
        x={COLUMN.x}
        y={studyKeyTop - sp(BASE.STUDY_SWATCH_DROP)}
        width={sp(BASE.STUDY_SWATCH_W)}
        height={sp(BASE.STUDY_SWATCH_H)}
        fill={studySwatch}
        stroke={muted}
        strokeWidth={COAST_STROKE}
      />
      {column.studyKeyLines.map((line, i) => (
        <text
          key={line}
          x={COLUMN.x + sp(BASE.STUDY_TEXT_X)}
          y={studyKeyTop + i * T.NOTE.lead}
          fill={muted}
          fontSize={T.NOTE.fontSize}
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
    </svg>
  );
}
