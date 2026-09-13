/**
 * Europe's low-carbon electricity, one equal tile per country, drawn THROUGH the design base. The
 * first `cartogram` component in this tree, and the fifth map beat.
 *
 * WHAT THIS FORM IS FOR, AND WHY THE PAIR WITH THE CHOROPLETH IS THE ARGUMENT.
 * On `proof/static-choropleth-europe-lowcarbon` the ink is proportional to TERRITORY: Russia's
 * 35.9 % covers a quarter of the frame and Malta's 15.5 % is a speck. Weighted by the area each
 * country occupies on that plate, Europe reads 44.9 % low-carbon; weighted by country, it reads
 * 65.1 %. **Both numbers are true and the choropleth can only show one of them.** A tile cartogram
 * gives every country the same tile, so the second reading becomes visible — and it keeps the rough
 * geography, which is what separates it from the unit grid beat, where the same countries are sorted
 * by value and the map is gone.
 *
 * THE LAYOUT IS DESIGNED, NOT DERIVED, and the plate says so. No algorithm placed these tiles; a
 * person did, to keep each country roughly where a reader expects it. That is a claim about a
 * drawing, not about the data, and it is the one thing on this plate a reader cannot check against
 * the source.
 *
 * `the-scale-is-stepped-not-continuous`, `the-key-prints-its-breaks-in-the-data-s-units`,
 * `the-key-names-its-classes-in-their-own-colours`, `a-missing-cell-is-drawn-as-missing` — as the
 * choropleth and the heatmap. One ramp between the direction's own poles, five classes, breaks in %,
 * and the country with no reading drawn in a neutral outside the ramp.
 */

import {
  deriveFurniture,
  measureText,
  measureTextBand,
  adjustToContrast,
  TEXT_CONTRAST_MIN,
} from "#shared/chart-beat/render-still.mjs";
import {
  mix,
  contrast,
  NON_TEXT_CONTRAST_MIN,
} from "#shared/chart-beat/colour.mjs";
import { applyCase } from "#shared/chart-beat/registers.mjs";
import {
  EYEBROW_TO_DISPLAY,
  gapOf,
  leadOf,
  registerOf,
} from "#shared/design-base/register.mjs";

/** 960 x 540 at scale 2 is the `landscape` this beat pins — 1920 x 1080. */
const FRAME = { width: 960, height: 540 };

type RegisterName = "display" | "eyebrow" | "body" | "axis" | "annot" | "value";

export type Tile = {
  iso: string;
  short: string;
  col: number;
  row: number;
  value: number | null;
  classIndex: number | null;
};

export function DirectedTileCartogram({
  tiles,
  cols,
  rows,
  breaks,
  missingLabel,
  unit,
  title,
  limits,
  reading,
  source,
  alt,
  eyebrow,
  direction,
  treatments,
  onLadder,
}: {
  tiles: Tile[];
  cols: number;
  rows: number;
  breaks: string[];
  missingLabel: string;
  unit: string;
  title: string[];
  limits: string[];
  reading: string[];
  source: string;
  alt: string;
  eyebrow: string;
  direction: any;
  treatments: string[];
  onLadder?: (note: string) => void;
}) {
  const { width, height } = FRAME;
  const { ink, muted, grid } = deriveFurniture(direction.ground);
  const PAD = direction.pad;
  const on = (id: string) => treatments.includes(id);

  const reg = (name: RegisterName) => registerOf(direction, name);
  const display = reg("display");
  const eyebrowReg = reg("eyebrow");
  const body = reg("body");
  const axis = reg("axis");
  const annot = reg("annot");

  const set = (text: string, r: { transform: string }) =>
    applyCase(text, r.transform);
  const sizeOf = (r: any) => ({
    fontSize: r.fontSize,
    fontWeight: r.fontWeight,
    fontFamily: r.fontFamily,
  });
  const widthCache = new Map<string, number>();
  const widthOf = (text: string, r: any) => {
    const key = `${r.fontFamily}|${r.fontSize}|${r.fontWeight}|${r.letterSpacing}|${text}`;
    let w = widthCache.get(key);
    if (w === undefined) {
      w =
        measureText(text, sizeOf(r)) +
        Number(r.letterSpacing ?? 0) * Math.max(0, text.length - 1);
      widthCache.set(key, w);
    }
    return w;
  };
  const bandOf = (r: any) => measureTextBand("Hxpg1,", sizeOf(r));

  const wrapCache = new Map<string, string[]>();
  function wrap(text: string, maxWidth: number, r: any): string[] {
    const key = `${r.fontFamily}|${r.fontSize}|${r.fontWeight}|${maxWidth}|${text}`;
    const hit = wrapCache.get(key);
    if (hit) return hit;
    const out: string[] = [];
    let current = "";
    for (const word of text.split(/\s+/)) {
      const trial = current ? `${current} ${word}` : word;
      if (current && widthOf(trial, r) > maxWidth) {
        out.push(current);
        current = word;
      } else current = trial;
    }
    if (current) out.push(current);
    wrapCache.set(key, out);
    return out;
  }

  const line = (r: any) => ({
    fontFamily: r.fontFamily,
    fontSize: r.fontSize,
    fontWeight: r.fontWeight,
    fontStyle: r.fontStyle,
    letterSpacing: r.letterSpacing,
    fill: r.fill,
  });
  const mutedInk = adjustToContrast(muted, direction.ground, TEXT_CONTRAST_MIN);
  const annotBand = bandOf(annot);
  const axisBand = bandOf(axis);

  /** A TILE IS A MARK ON THE GROUND, NOT A PATCH IN A MOSAIC. On the choropleth every country is
   *  bounded by its neighbours, so the palest class still reads as a shape. Here each tile floats
   *  in a gap of bare ground, and a fill that does not clear the non-text floor against that ground
   *  is not a pale class — it is an absent tile. The bottom of the ramp and the missing fill are
   *  both floored, and the plate refuses if the direction's own colours cannot reach the floor. */
  const floorAgainstGround = (colour: string, what: string) => {
    if (contrast(colour, direction.ground) >= NON_TEXT_CONTRAST_MIN) return colour;
    const lifted = adjustToContrast(
      colour,
      direction.ground,
      NON_TEXT_CONTRAST_MIN,
    );
    if (!lifted)
      throw new Error(
        `${what} cannot be told from the ground it sits on: nothing between it and the ` +
          `direction's poles clears ${NON_TEXT_CONTRAST_MIN}:1 against ${direction.ground}.`,
      );
    return lifted;
  };
  const low = floorAgainstGround(
    mix(direction.accent, direction.ground, 0.9),
    "the lowest class of the ramp",
  );
  const high = mix(direction.accent, ink, 0.3);
  const classCount = breaks.length + 1;
  const classFill = (i: number) =>
    mix(low, high, classCount > 1 ? i / (classCount - 1) : 0.5);
  /** MISSING IS DRAWN AS MISSING, AND THAT MEANS OUTSIDE THE RAMP — not merely beside it. A flat
   *  neutral floored against the ground lands, on a dark direction, on exactly the tone the lowest
   *  class already owns, and Ukraine reads as a low reading rather than as no reading. A tile with
   *  no fill and a dashed edge cannot be mistaken for a class, because no class is hollow. */
  const missingFill = direction.ground;
  const missingEdge = mutedInk;

  // ── the ladder ────────────────────────────────────────────────────────────
  const column = width - PAD * 2;
  const titleLead = leadOf(display);
  const bodyLead = leadOf(body);
  const annotLead = leadOf(annot);
  const keyRoom = axisBand.ascent * 2 + axisBand.descent + 14;

  const layoutFor = (t: number, l: number, r: number) => {
    const titleLines = wrap(set(title[t], display), column, display);
    const limitLines = wrap(set(limits[l], body), column, body);
    const readingLines =
      r < 0 ? [] : wrap(set(reading[r], annot), column, annot);
    const sourceLines = wrap(set(source, body), column, body);
    const eyebrowBaseline = PAD + eyebrowReg.fontSize;
    const titleTop =
      eyebrowBaseline + gapOf(eyebrowReg, EYEBROW_TO_DISPLAY) + display.fontSize;
    const limitsTop =
      titleTop + titleLines.length * titleLead + gapOf(body, 0.4828);
    const sourceTop = height - PAD - (sourceLines.length - 1) * bodyLead;
    const readingTop = readingLines.length
      ? sourceTop - bodyLead - readingLines.length * annotLead
      : sourceTop - bodyLead * 0.4;
    const top = limitsTop + limitLines.length * bodyLead + gapOf(body, 0.3448);
    const bottom = readingTop - gapOf(annot, 0.8571) - keyRoom;
    return {
      titleLines,
      limitLines,
      readingLines,
      sourceLines,
      eyebrowBaseline,
      titleTop,
      limitsTop,
      readingTop,
      sourceTop,
      top,
      bottom,
    };
  };

  /** THE TILE HAS TO HOLD ITS OWN NAME. That is the whole difference between a cartogram and a
   *  pattern: a reader has to be able to say which country a tile is, or the geography it preserves
   *  is decoration. The floor is the axis register's own band plus breath, and the plate refuses
   *  under it rather than shipping forty anonymous squares. */
  const tileOwes = axisBand.ascent + axisBand.descent + 6;

  const rungs: Array<{ title: number; limit: number; reading: number }> = [];
  for (let t = 0; t < title.length; t++)
    for (let l = 0; l < limits.length; l++) {
      for (let r = 0; r < reading.length; r++)
        rungs.push({ title: t, limit: l, reading: r });
      rungs.push({ title: t, limit: l, reading: -1 });
    }
  /** THE TILE IS AS NON-SQUARE AS THE GRID REQUIRES, which is ProPublica's own instruction from the
   *  record this form is filed against: "let the cell be as non-square as the data requires. A
   *  matrix is not a grid of squares; the row and column pitches answer to how many rows there are
   *  and how far the eye must travel."
   *
   *  Forcing squares bound a 12 x 9 grid by its NINE ROWS against a landscape plate's height, and
   *  every tile came out 15px wide — too narrow for a three-letter code, which the check below
   *  caught. The width answers to the columns, the height to the rows, and each is checked against
   *  what it has to carry. */
  const gapFor = (cw: number, ch: number) => Math.max(Math.min(cw, ch) * 0.12, 2);
  /** A TILE STAYS A TILE. ProPublica's licence to be non-square is a licence, not an obligation:
   *  stretched to the full column a 12-wide grid gives 69 x 17px tiles, and nine rows of 4:1
   *  lozenges read as stacked bar charts, not as a map. The width is capped against the height the
   *  rows actually afford, and the grid is centred in what is left. */
  const MAX_TILE_ASPECT = 2.5;
  const widestName = Math.max(...tiles.map((t) => widthOf(set(t.short, axis), axis)));
  let fits: {
    rung: (typeof rungs)[number];
    layout: ReturnType<typeof layoutFor>;
    cellW: number;
    cellH: number;
  } | null = null;
  let best = -Infinity;
  /** The floor is owed by the tile that is DRAWN, not by the pitch it sits on: the gap between two
   *  tiles carries no name. Measuring the pitch shipped a 15px tile against a 16.4px floor. */
  for (const rung of rungs) {
    const l = layoutFor(rung.title, rung.limit, rung.reading);
    const cellH = (l.bottom - l.top) / rows;
    const cellW = Math.min((width - PAD * 2) / cols, cellH * MAX_TILE_ASPECT);
    const g = gapFor(cellW, cellH);
    const drawnH = cellH - g;
    if (drawnH > best) best = drawnH;
    if (drawnH >= tileOwes && cellW - g - 2 >= widestName) {
      fits = { rung, layout: l, cellW, cellH };
      break;
    }
  }
  if (!fits)
    throw new Error(
      `a ${cols} x ${rows} tile grid gives each tile ${best.toFixed(1)}px of height, and at ` +
        `${MAX_TILE_ASPECT}:1 that is ${(best * MAX_TILE_ASPECT).toFixed(1)}px of width; a tile that ` +
        `must hold its own name owes ${tileOwes.toFixed(1)}px of height and ` +
        `${widestName.toFixed(1)}px of width. A cartogram nobody can read country by country is a ` +
        `pattern, not a map.`,
    );
  const { layout, cellW, cellH } = fits;
  const gap = gapFor(cellW, cellH);
  const sideW = cellW - gap;
  const sideH = cellH - gap;
  const gridW = cols * cellW - gap;
  const originX = PAD + (width - PAD * 2 - gridW) / 2;
  onLadder?.(
    `ladder: headline ${fits.rung.title + 1}, standfirst ${fits.rung.limit + 1}, reading ` +
      (fits.rung.reading < 0 ? "dropped" : `form ${fits.rung.reading + 1}`) +
      ` · ${tiles.length} tiles, ${sideW.toFixed(0)} x ${sideH.toFixed(0)}px, floor ${tileOwes.toFixed(1)}px`,
  );

  const tooWide = tiles.filter(
    (t) => widthOf(set(t.short, axis), axis) > sideW - 2,
  );
  if (tooWide.length)
    throw new Error(
      `${tooWide.length} tile names do not fit a ${sideW.toFixed(0)}px tile ` +
        `(${tooWide.map((t) => t.short).join(", ")}). Every tile carries its own name — give the ` +
        `beat shorter codes, or a coarser grid.`,
    );

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={alt}
    >
      <rect x={0} y={0} width={width} height={height} fill={direction.ground} />

      <text x={PAD} y={layout.eyebrowBaseline} {...line(eyebrowReg)}>
        {set(eyebrow, eyebrowReg)}
      </text>
      {layout.titleLines.map((l, i) => (
        <text
          key={l + i}
          x={PAD}
          y={layout.titleTop + i * titleLead}
          {...line(display)}
        >
          {l}
        </text>
      ))}
      {layout.limitLines.map((l, i) => (
        <text
          key={l + i}
          x={PAD}
          y={layout.limitsTop + i * bodyLead}
          {...line(body)}
        >
          {l}
        </text>
      ))}
      {layout.readingLines.map((l, i) => (
        <text
          key={`r${i}`}
          x={PAD}
          y={layout.readingTop + i * annotLead}
          {...line(annot)}
          fill={mutedInk}
        >
          {l}
        </text>
      ))}
      {layout.sourceLines.map((l, i) => (
        <text
          key={`s${i}`}
          x={PAD}
          y={layout.sourceTop + i * bodyLead}
          {...line(body)}
        >
          {l}
        </text>
      ))}

      {tiles.map((t) => {
        const x = originX + t.col * cellW;
        const y = layout.top + t.row * cellH;
        const fillOf =
          t.classIndex === null ? missingFill : classFill(t.classIndex);
        return (
          <g key={t.iso}>
            <rect
              x={x}
              y={y}
              width={sideW}
              height={sideH}
              fill={fillOf}
              stroke={t.classIndex === null ? missingEdge : grid}
              strokeWidth={direction.stroke.hairline}
              strokeDasharray={t.classIndex === null ? "3 2" : undefined}
            />
            <text
              x={x + sideW / 2}
              y={y + sideH / 2 + (axisBand.ascent - axisBand.descent) / 2}
              textAnchor="middle"
              {...line(axis)}
              fill={adjustToContrast(ink, fillOf, TEXT_CONTRAST_MIN)}
            >
              {set(t.short, axis)}
            </text>
          </g>
        );
      })}

      {on("the-scale-is-stepped-not-continuous") &&
        (() => {
          const swatchW = Math.max(cellW * 0.8, 34);
          const top = layout.bottom + 12;
          return (
            <g>
              {Array.from({ length: classCount }, (_, i) => (
                <g key={`key-${i}`}>
                  <rect
                    x={PAD + i * swatchW}
                    y={top}
                    width={swatchW - 1}
                    height={axisBand.ascent}
                    fill={classFill(i)}
                    stroke={grid}
                    strokeWidth={direction.stroke.hairline}
                  />
                  {i > 0 && (
                    <text
                      x={PAD + i * swatchW}
                      y={top + axisBand.ascent * 2 + 2}
                      textAnchor="middle"
                      {...line(axis)}
                      fill={adjustToContrast(
                        classFill(i),
                        direction.ground,
                        TEXT_CONTRAST_MIN,
                      )}
                    >
                      {set(breaks[i - 1], axis)}
                    </text>
                  )}
                </g>
              ))}
              <text
                x={PAD + classCount * swatchW + 10}
                y={top + axisBand.ascent}
                {...line(axis)}
                fill={mutedInk}
              >
                {set(unit, axis)}
              </text>
              <rect
                x={PAD + classCount * swatchW + 10}
                y={top + axisBand.ascent + 6}
                width={swatchW - 1}
                height={axisBand.ascent}
                fill={missingFill}
                stroke={missingEdge}
                strokeWidth={direction.stroke.hairline}
                strokeDasharray="3 2"
              />
              <text
                x={PAD + classCount * swatchW + 10 + swatchW + 6}
                y={top + axisBand.ascent * 2 + 4}
                {...line(axis)}
                fill={mutedInk}
              >
                {set(missingLabel, axis)}
              </text>
            </g>
          );
        })()}
    </svg>
  );
}
