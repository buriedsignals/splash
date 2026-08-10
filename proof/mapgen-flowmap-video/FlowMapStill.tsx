/**
 * "The Danube touches ten countries on its way to the Black Sea, nine of them shown here" — the
 * STILL genre of this beat, whose other genre is a VIDEO. Rendered and looked at first, per this
 * project's own "look at the still before spending a video render" discipline — same claim, same
 * camera, same committed plate as `FlowMapVideo.tsx` draws.
 *
 * ── THERE IS NO `const FRAME` HERE ANY MORE, AND ITS ABSENCE IS THE POINT ─────────────────────
 *
 * It used to read `{ width: 1080, height: 900 }`, and `render-map.mjs` repeated the same two
 * numbers, so `renderStill` compared them against each other and they agreed by construction: a
 * journalist pinning a size at gate 2c reached nothing. The frame is now `sizeFor(size)`'s and
 * `size` is read out of this beat's own `BRIEF.md` front matter.
 *
 * ── AND THE MAP IS NOT LAID OUT LIKE A PLOT ──────────────────────────────────────────────────
 *
 * A chart clamps its plot into an aspect range measured for its type. A map has no plot rectangle:
 * what fixes its shape is the CAMERA, and this beat's camera is already frozen — the committed
 * plate is a raster whose bake fitted the study bounds, so the plate's own aspect (940 x 420,
 * 2.238:1 over 24.4 degrees of longitude — the flattest plate in this corpus) IS the shape this
 * geography takes. `mapStageBox` scales that aspect to whichever dimension binds first and hands
 * back what is left; the leftover goes to FURNITURE, never to a wider camera and never to a crop
 * (`skills/map-beat/assets/geo.ts`, the rule; `scripts/stage.mjs`, the arithmetic).
 *
 * A FLAT plate is short at any width, so at every size this beat's map is bound by HEIGHT and the
 * leftover lands on the WIDTH axis. That is what decides the arrangement, and the arrangement is
 * MEASURED rather than chosen per size: the caveat moves into the column the map's own flatness
 * leaves beside it when that column can hold it, and stacks underneath when it cannot. Measured at
 * landscape, moving it is worth 246 px of map height — 871 x 389 instead of 625 x 279.
 *
 * ── THE CREDIT IS A STRIP ACROSS THE FOOT OF THE FRAME ───────────────────────────────────────
 *
 * Not the last block of a column. `credit-anchors-to-the-frame-bottom.test.ts` guard C measures the
 * credit's own `<text y>` against the committed SVG's viewBox and requires it in the bottom eighth;
 * a credit wrapped inside a narrow column becomes three lines and its FIRST line lands above that
 * line, for a reason that has nothing to do with the credit. At the full content width it is one
 * block at the frame's foot, which is also where a reader looks for it.
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
  TERRITORY_FILL_OPACITY,
  compositeOverLand,
  numeralInk,
} from "./geo-flow.ts";

/**
 * THE 900x560 TUNING, KEPT AS THE BASE, WITH THE SIZE AS THE MULTIPLIER.
 *
 * Every spacing number goes through `sp`, not only the fonts — the probe measured what happens
 * otherwise: eleven bare literals in one beat's layout arithmetic collided a title into a subtitle
 * at 1920x1080. `PAD` is the one exception, because a frame's margin is proportional to the CANVAS
 * and not to the type (`frameInsetFor`, and `sizes.mjs` states the split).
 *
 * ONE NUMERAL TOKEN, RAISED FROM 9 TO 12. This beat used to draw the legend chip's order numeral at
 * 9 px against the map badge's 12 — and the size table derives every row's `typeScale` from a
 * smallest base token of TWELVE, so a beat carrying 9 misses every floor by construction and
 * `typeScaleFor` would have had to invent a 2.89 multiplier for the whole hierarchy to rescue it
 * (measured: that puts the title at 66 px and the furniture at 1024 px of a 910 px band — a refusal
 * caused by one small numeral). The numeral is the same numeral in both places, so it is now one
 * token at 12, and the chip's swatch grew to the badge's radius to hold it.
 */
const BASE = {
  TITLE: { fontSize: 23, fontWeight: 700, lead: 29 },
  SOURCE: { fontSize: 13.5, fontWeight: 400, lead: 17 },
  CAPTION: { fontSize: 13, fontWeight: 600 },
  NOTE: { fontSize: 12.5, fontWeight: 400, lead: 16 },
  LEGEND_LABEL: { fontSize: 13, fontWeight: 400 },
  NUMERAL: { fontSize: 12, fontWeight: 700 },
  BADGE_R: 11,
  BADGE_STROKE: 2,
  NUMERAL_DROP: 4,
  TERRITORY_STROKE: 1.4,
  ROUTE_HALO: 6,
  ROUTE_LINE: 3,
  // The key's swatch is its own token and SMALLER than the map badge's, measured rather than
  // inherited: at the badge's own radius the nine chips came to 1837px of a 1750px content width
  // and wrapped, orphaning "9 Ukraine" on a second row that cost the map 57px of height — the
  // whole key is one row at this radius and gap, with 57px to spare.
  CHIP_R: 9,
  CHIP_GAP: 14,
  CHIP_TEXT_GAP: 8,
  LEGEND_ROW: 26,
  LEGEND_TOP_AIR: 16,
  BLOCK_AIR: 16,
  GUTTER: 32,
};

/** The smallest token this beat draws. `typeScaleFor` puts it on the size's own legibility floor. */
const SMALLEST_BASE_TOKEN = BASE.NUMERAL.fontSize;

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
    NOTE: f(BASE.NOTE) as typeof BASE.NOTE,
    LEGEND_LABEL: f(BASE.LEGEND_LABEL) as typeof BASE.LEGEND_LABEL,
    NUMERAL: f(BASE.NUMERAL) as typeof BASE.NUMERAL,
  };
}

export type CrossingDrawn = {
  key: string;
  name: string;
  colour: string;
  order: number; // 1-based
  rings: [number, number][][];
  anchor: [number, number];
};

export type FlowMapStillProps = {
  geometry: {
    frame: { width: number; height: number };
    frameCorners: { west: number; north: number; east: number; south: number };
  };
  plate: string;
  crossings: CrossingDrawn[];
  route: [number, number][];
  accent: string;
  title: string;
  source: string;
  basemapCredit: string;
  caveat: string;
  alt: string;
  ground: string;
  ink: string;
  muted: string;
  /** The export size gate 2c pinned, read from `BRIEF.md` by `render-map.mjs`. */
  size: string;
  /** Every removal-ladder rung that FIRES is emitted with the render — a rung that fires silently
   *  is a decision nobody took (`type-at-size.mjs`, REMOVAL_LADDER's own header). */
  onRemoval?: (note: string) => void;
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

/** The rings, in FRAME pixels. Scaled here rather than by an SVG `scale()` transform, so every
 *  `font-size` and `stroke-width` in the markup is the number a reader actually gets — which is
 *  what `assertTypeFloor` reads, and it reads attributes, not the transforms above them. */
function ringPath(rings: [number, number][][], k: number): string {
  return rings
    .filter((ring) => ring.length >= 3)
    .map(
      (ring) =>
        "M" +
        ring
          .map(([x, y]) => `${(x * k).toFixed(1)} ${(y * k).toFixed(1)}`)
          .join("L") +
        "Z",
    )
    .join("");
}

function routePath(route: [number, number][], k: number): string {
  if (route.length < 2) return "";
  return (
    "M" +
    route
      .map(([x, y]) => `${(x * k).toFixed(1)} ${(y * k).toFixed(1)}`)
      .join("L")
  );
}

/** The last `n` sentences dropped from a note — R3's own operation, applied to the only prose block
 *  this beat carries that the ladder is allowed to touch. */
function withoutLastSentences(text: string, n: number): string {
  const parts = text.match(/[^.]+\.(?:\s|$)/g) ?? [text];
  return parts
    .slice(0, Math.max(1, parts.length - n))
    .join("")
    .trim();
}

export function FlowMapStill({
  geometry,
  plate,
  crossings,
  route,
  accent,
  title,
  source,
  basemapCredit,
  caveat,
  alt,
  ground,
  ink,
  muted,
  size,
  onRemoval,
}: FlowMapStillProps) {
  const row = sizeFor(size);
  const FRAME = { width: row.width, height: row.height };
  const PAD = frameInsetFor(size);
  const T = tokens(typeScaleFor(row, SMALLEST_BASE_TOKEN));
  const sp = T.sp;

  // THE BAND, not the frame. Where the platform reserves part of the frame — portrait alone today —
  // everything a reader has to read lives inside it, because content outside it is at risk of being
  // COVERED by the platform's own chrome and no clipping counter can see that.
  const band = stageFor(size);
  const top = band.top + PAD;
  const contentWidth = FRAME.width - PAD * 2;

  // ── The credit strip, first, because everything else is laid out above it ────────────────────
  // Spelled out rather than `= bottom`, so the anchor NAMES the frame's own height with a
  // subtraction — `credit-anchors-to-the-frame-bottom.test.ts` reads this expression.
  const sourceText = `${source} · ${basemapCredit}`;
  const sourceLines = wrap(sourceText, contentWidth, T.SOURCE);
  const sourceBottom = band.top + band.height - PAD;
  const sourceTop = sourceBottom - (sourceLines.length - 1) * T.SOURCE.lead;
  const contentBottom = sourceTop - T.SOURCE.fontSize - sp(BASE.BLOCK_AIR);

  // ── The header: the title, then the key. The key is part of the header — it says what the
  // numbers mean before the reader looks — so the slack a bigger frame opens lands in ONE place,
  // around the map, rather than as a hole under a floating legend.
  const titleLines = wrap(title, contentWidth, T.TITLE);
  const titleTop = top + T.TITLE.fontSize;
  const titleBottom = titleTop + (titleLines.length - 1) * T.TITLE.lead;
  const legendCaptionTop =
    titleBottom + sp(BASE.BLOCK_AIR) + T.CAPTION.fontSize;

  const BADGE_R = sp(BASE.BADGE_R);
  const CHIP_R = sp(BASE.CHIP_R);
  const chipWidth = (c: CrossingDrawn) =>
    CHIP_R * 2 + sp(BASE.CHIP_TEXT_GAP) + measureText(c.name, T.LEGEND_LABEL);
  const chips = crossings.map((c) => ({ crossing: c, width: chipWidth(c) }));
  const packed: { crossing: CrossingDrawn; width: number }[][] = [];
  {
    let line: typeof chips = [];
    let lineWidth = 0;
    for (const chip of chips) {
      if (
        line.length > 0 &&
        lineWidth + sp(BASE.CHIP_GAP) + chip.width > contentWidth
      ) {
        packed.push(line);
        line = [];
        lineWidth = 0;
      }
      if (line.length > 0) lineWidth += sp(BASE.CHIP_GAP);
      line.push(chip);
      lineWidth += chip.width;
    }
    if (line.length > 0) packed.push(line);
  }
  const legendRowsTop = legendCaptionTop + sp(BASE.LEGEND_TOP_AIR);
  const legendBottom = legendRowsTop + packed.length * sp(BASE.LEGEND_ROW);
  const bodyTop = legendBottom + sp(BASE.BLOCK_AIR);
  const bodyHeight = contentBottom - bodyTop;

  // ── THE FLOOR A MAP IS STILL A MAP AT, DERIVED FROM THIS BEAT'S OWN ARGUMENT ─────────────────
  //
  // The argument is nine numbered badges in crossing order. Two of them — Hungary and Croatia —
  // sit 77.0 px apart in the plate's own 940 px frame, and below the width at which those two
  // circles stop overlapping the picture cannot state the order it exists to state. So the floor is
  // that separation, read off the committed geometry rather than typed as a fraction of the frame.
  const anchorGapPx = closestAnchorGap(crossings);
  const badgeClear = BADGE_R * 2 + sp(BASE.BADGE_STROKE);
  const minMapWidth = Math.ceil(
    (geometry.frame.width * badgeClear) / anchorGapPx,
  );

  // ── THE ARRANGEMENT, AND THE REMOVAL LADDER, MEASURED ────────────────────────────────────────
  const lonSpan = lonSpanOf(geometry);
  const gutter = sp(BASE.GUTTER);
  type Arrangement = {
    stage: ReturnType<typeof mapStageBox>;
    caveatLines: string[];
    caveatBeside: boolean;
    caveatColumn: number;
  };
  const layoutWith = (note: string): Arrangement | null => {
    if (bodyHeight <= 0) return null;
    // First arrangement: the map takes the whole body height and the caveat takes the column this
    // flat plate's own shape leaves beside it.
    const beside = mapStageBox({
      availableWidth: contentWidth,
      availableHeight: bodyHeight,
      plateFrame: geometry.frame,
      studyLonSpanDeg: lonSpan,
    });
    const column = contentWidth - beside.width - gutter;
    if (note !== "") {
      const longestWord = Math.ceil(
        Math.max(...note.split(/\s+/).map((w) => measureText(w, T.NOTE))),
      );
      if (column >= longestWord) {
        const lines = wrap(note, column, T.NOTE);
        const block = T.NOTE.fontSize + (lines.length - 1) * T.NOTE.lead;
        if (block <= bodyHeight && beside.width >= minMapWidth)
          return {
            stage: beside,
            caveatLines: lines,
            caveatBeside: true,
            caveatColumn: column,
          };
      }
    } else if (beside.width >= minMapWidth)
      return {
        stage: beside,
        caveatLines: [],
        caveatBeside: true,
        caveatColumn: 0,
      };

    // Second arrangement: the caveat stacks under the map at the full width, and the map takes what
    // is left — the rule read from the other end, and the only order that can refuse honestly.
    const lines = note === "" ? [] : wrap(note, contentWidth, T.NOTE);
    const block =
      lines.length === 0
        ? 0
        : T.NOTE.fontSize +
          (lines.length - 1) * T.NOTE.lead +
          sp(BASE.BLOCK_AIR);
    const mapHeight = bodyHeight - block;
    if (mapHeight <= 0) return null;
    const stacked = mapStageBox({
      availableWidth: contentWidth,
      availableHeight: mapHeight,
      plateFrame: geometry.frame,
      studyLonSpanDeg: lonSpan,
    });
    if (stacked.width < minMapWidth) return null;
    return {
      stage: stacked,
      caveatLines: lines,
      caveatBeside: false,
      caveatColumn: contentWidth,
    };
  };

  // The ladder, in order, cheapest first — and only the rungs a MAP has. R0 (the twin form) is a
  // band-scale chart's; R1/R2 (axis title, ticks) and R4/R5 (annotations, the reference label) name
  // furniture this beat does not carry. What is left is R3, R7 and R9, and every rung is applied
  // speculatively and kept only if it actually recovered a map.
  const sentences = (caveat.match(/[^.]+\.(?:\s|$)/g) ?? [caveat]).length;
  const rungs: { rung: string; note: string; what: string }[] = [
    { rung: "-", note: caveat, what: "" },
    ...Array.from({ length: Math.max(0, sentences - 1) }, (_, i) => ({
      rung: "R3",
      note: withoutLastSentences(caveat, i + 1),
      what: `the caveat's last ${i + 1 === 1 ? "sentence" : `${i + 1} sentences`}`,
    })),
    { rung: "R7", note: "", what: "the caveat entirely" },
  ];
  let chosen: Arrangement | null = null;
  let chosenRung = rungs[0]!;
  for (const candidate of rungs) {
    const attempt = layoutWith(candidate.note);
    if (attempt) {
      chosen = attempt;
      chosenRung = candidate;
      break;
    }
  }

  if (!chosen) {
    // R9, stated, with the arithmetic that produced it.
    const fullCaveatLines = wrap(caveat, contentWidth, T.NOTE);
    const furniture =
      T.TITLE.fontSize +
      (titleLines.length - 1) * T.TITLE.lead +
      sp(BASE.BLOCK_AIR) +
      T.CAPTION.fontSize +
      sp(BASE.LEGEND_TOP_AIR) +
      packed.length * sp(BASE.LEGEND_ROW) +
      sp(BASE.BLOCK_AIR) +
      T.NOTE.fontSize +
      (fullCaveatLines.length - 1) * T.NOTE.lead +
      sp(BASE.BLOCK_AIR) +
      T.SOURCE.fontSize +
      (sourceLines.length - 1) * T.SOURCE.lead;
    throw new Error(
      `mapgen-flowmap-video (still) cannot be drawn at ${size} (${FRAME.width}x${FRAME.height}).\n` +
        `The band is ${band.height}px and the margin ${PAD}px each end, so there are ` +
        `${band.height - PAD * 2}px to spend. At the ${row.minTypePx}px legibility floor this ` +
        `beat's own words take ${furniture}px of it: title ${titleLines.length} lines at ` +
        `${T.TITLE.fontSize}px, key ${packed.length} row(s) of ${crossings.length} chips, caveat ` +
        `${fullCaveatLines.length} lines, credit ${sourceLines.length} lines — leaving ` +
        `${band.height - PAD * 2 - furniture}px for the map.\n` +
        `The ladder was run: R3 dropped the caveat down to one sentence and R7 dropped it entirely, ` +
        `and neither left a ${minMapWidth}px-wide map — the width at which this beat's two closest ` +
        `badges (Hungary and Croatia, ${anchorGapPx.toFixed(1)}px apart in a ` +
        `${geometry.frame.width}px plate) stop overlapping, which is the width below which the ` +
        `picture can no longer state the crossing order it exists to state.\n` +
        `Nothing in the ladder makes type smaller. It ships at landscape.`,
    );
  }
  if (chosenRung.rung !== "-")
    onRemoval?.(
      `${chosenRung.rung} fired at ${size}: ${chosenRung.what} was removed to leave a map ` +
        `${chosen.stage.width}px wide (floor ${minMapWidth}px).`,
    );

  const MAP_W = chosen.stage.width;
  const MAP_H = chosen.stage.height;
  const MAP_X = PAD;
  const MAP_Y = bodyTop;
  const k = MAP_W / geometry.frame.width;
  const caveatX = chosen.caveatBeside ? PAD + MAP_W + gutter : PAD;
  const caveatTop = chosen.caveatBeside
    ? bodyTop + T.NOTE.fontSize
    : bodyTop + MAP_H + sp(BASE.BLOCK_AIR) + T.NOTE.fontSize;

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
        <clipPath id="flow-plate-clip">
          <rect x={0} y={0} width={MAP_W} height={MAP_H} />
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

      {/* ── The key ─────────────────────────────────────────────────────────────────────── */}
      <text
        x={PAD}
        y={legendCaptionTop}
        fill={muted}
        fontSize={T.CAPTION.fontSize}
        fontWeight={T.CAPTION.fontWeight}
      >
        Territories crossed, in order —
      </text>
      {packed.map((line, ri) => {
        let x = PAD;
        const centre =
          legendRowsTop + ri * sp(BASE.LEGEND_ROW) + sp(BASE.LEGEND_ROW) / 2;
        return (
          <Fragment key={ri}>
            {line.map((chip) => {
              const swatch = compositeOverLand(chip.crossing.colour);
              const node = (
                <Fragment key={chip.crossing.key}>
                  <circle
                    cx={x + CHIP_R}
                    cy={centre}
                    r={CHIP_R}
                    fill={swatch}
                    stroke={chip.crossing.colour}
                    strokeWidth={sp(BASE.BADGE_STROKE)}
                  />
                  <text
                    x={x + CHIP_R}
                    y={centre + sp(BASE.NUMERAL_DROP)}
                    fill={numeralInk(swatch)}
                    fontSize={T.NUMERAL.fontSize}
                    fontWeight={T.NUMERAL.fontWeight}
                    textAnchor="middle"
                  >
                    {chip.crossing.order}
                  </text>
                  <text
                    x={x + CHIP_R * 2 + sp(BASE.CHIP_TEXT_GAP)}
                    y={centre + sp(BASE.NUMERAL_DROP)}
                    fill={muted}
                    fontSize={T.LEGEND_LABEL.fontSize}
                  >
                    {chip.crossing.name}
                  </text>
                </Fragment>
              );
              x += chip.width + sp(BASE.CHIP_GAP);
              return node;
            })}
          </Fragment>
        );
      })}

      {/* ── The map ─────────────────────────────────────────────────────────────────────── */}
      <g
        transform={`translate(${MAP_X},${MAP_Y})`}
        clipPath="url(#flow-plate-clip)"
      >
        <image href={plate} x={0} y={0} width={MAP_W} height={MAP_H} />

        {/* Each crossed territory: filled and outlined in its own cycling qualitative colour —
            computed, not hand-picked (see geo-flow.ts territoriesCrossed). */}
        {crossings.map((c) => (
          <path
            key={c.key}
            d={ringPath(c.rings, k)}
            fill={c.colour}
            fillOpacity={TERRITORY_FILL_OPACITY}
            stroke={c.colour}
            strokeWidth={sp(BASE.TERRITORY_STROKE)}
          />
        ))}

        {/* The route's own line: a `ground`-coloured halo first (legible over both fills and the
            water tint), then ONE accent colour on top — recorded in PALETTE.md at 3.01:1 against
            this ground, because the route is the only mark on this plate carrying the story. */}
        <path
          d={routePath(route, k)}
          fill="none"
          stroke={ground}
          strokeWidth={sp(BASE.ROUTE_HALO)}
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={0.85}
        />
        <path
          d={routePath(route, k)}
          fill="none"
          stroke={accent}
          strokeWidth={sp(BASE.ROUTE_LINE)}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Numbered badges, one per territory, anchored near where the route actually runs through
            it (geo-flow.ts pointOnFeature + routeBBoxWithin) — never a plain, possibly off-frame
            national centroid. */}
        {crossings.map((c) => (
          <g key={`badge-${c.key}`}>
            <circle
              cx={c.anchor[0] * k}
              cy={c.anchor[1] * k}
              r={BADGE_R}
              fill={c.colour}
              stroke={ground}
              strokeWidth={sp(BASE.BADGE_STROKE)}
            />
            <text
              x={c.anchor[0] * k}
              y={c.anchor[1] * k + sp(BASE.NUMERAL_DROP)}
              fill={numeralInk(c.colour)}
              fontSize={T.NUMERAL.fontSize}
              fontWeight={T.NUMERAL.fontWeight}
              textAnchor="middle"
            >
              {c.order}
            </text>
          </g>
        ))}
      </g>

      {chosen.caveatLines.map((line, i) => (
        <text
          key={line}
          x={caveatX}
          y={caveatTop + i * T.NOTE.lead}
          fill={muted}
          fontSize={T.NOTE.fontSize}
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
    </svg>
  );
}

/** The tightest pair of badge anchors, in the PLATE's own pixels — the quantity the map's minimum
 *  width is derived from. Read off the committed geometry the render was handed, never typed. */
export function closestAnchorGap(crossings: CrossingDrawn[]): number {
  let closest = Infinity;
  for (let i = 0; i < crossings.length; i++)
    for (let j = i + 1; j < crossings.length; j++) {
      const a = crossings[i]!.anchor;
      const b = crossings[j]!.anchor;
      closest = Math.min(closest, Math.hypot(a[0] - b[0], a[1] - b[1]));
    }
  if (!Number.isFinite(closest) || closest <= 0)
    throw new Error(
      `this beat draws ${crossings.length} numbered badges and no two of them are apart, so there ` +
        `is no width at which the crossing order can be read.`,
    );
  return closest;
}
