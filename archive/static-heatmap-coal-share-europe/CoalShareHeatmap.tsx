/**
 * Beat: coal's share of electricity in the twelve most coal-dependent countries of the EU-27 plus
 * the UK, 2010-2024, as a heatmap.
 *
 * Written fresh from `ChartSeed.tsx`'s shape against `references/types/heatmap.md`. The type's
 * whole quantitative channel is colour, so this component's real subject is the ramp, and three
 * of the sheet's rules are implemented as MEASUREMENTS rather than as intentions:
 *
 * 1. **Sequential, luminance-monotonic.** The ramp runs between two stops derived from the
 *    newsroom's own ground and accent — no hue is named here. `assertRampIsReadable` samples it
 *    and throws if luminance ever moves back on itself.
 * 2. **Every stop clears 3:1 against the real ground.** The sheet's accessibility trap is a
 *    ramp's pale end fading into the canvas — "a cell that blends into the ground it's drawn on
 *    has failed before a reader even gets to read its value". The pale stop is therefore not the
 *    ground: it is the lightest mix toward the accent that still measures 3:1 against the actual
 *    ground handed in, computed, not picked.
 * 3. **A value label inside a cell takes its colour from that cell's own fill**, by measuring
 *    both poles against that exact fill and using whichever is higher — never a luminance
 *    threshold standing in for a measurement (`bar-and-column.md`'s trap, which applies verbatim
 *    to any label sitting on a coloured mark).
 *
 * Only the first and last year columns carry printed values. 180 numbers would be a table; two
 * columns is the pair the claim is about, and the pattern in between is what the grid is for.
 */

import {
  contrast,
  deriveFurniture,
  measureText,
  FONT_FAMILY,
} from "#shared/chart-beat/render-still.mjs";

export type Row = {
  country: string;
  readings: { year: number; value: number }[];
};

const FRAME = { width: 900, height: 760 };
const PAD = 40;
const TITLE = { fontSize: 24, fontWeight: 700, lead: 30 };
const SUBTITLE = { fontSize: 15, fontWeight: 400, lead: 20 };
const SOURCE = { fontSize: 14, fontWeight: 400 };
const ROW_LABEL = { fontSize: 13, fontWeight: 400 };
const YEAR_LABEL = { fontSize: 11, fontWeight: 400 };
const CELL_LABEL = { fontSize: 11, fontWeight: 700 };
const LEGEND = { fontSize: 12, fontWeight: 400, width: 320, height: 12 };
/** WCAG 2.2 SC 1.4.11: a cell is a shape, not prose, so the floor is the non-text one. */
const NON_TEXT_CONTRAST_MIN = 3;
/** The hairline of ground left between cells, so the eye reads discrete cells, not a smear. */
const CELL_GAP = 1.5;

const HEX = /^#[0-9a-fA-F]{6}$/;

function channels(hex: string): number[] {
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
}

/** Straight line between two colours in sRGB. Duplicated here rather than imported across a skill
 *  boundary — this project's own rule, and `render-still.mjs` does not export it. */
function mix(from: string, to: string, ratio: number): string {
  const target = channels(to);
  return (
    "#" +
    channels(from)
      .map((v, i) =>
        Math.round(v + (target[i] - v) * ratio)
          .toString(16)
          .padStart(2, "0"),
      )
      .join("")
  );
}

/**
 * The pale end of the ramp: the LIGHTEST mix from the ground toward the accent that still measures
 * at least 3:1 against that ground.
 *
 * Not the ground itself, and not a fixed tint. `heatmap.md`'s accessibility trap is precisely the
 * ramp that fades toward its own canvas at the low end — "pale" and "dark background" pull in the
 * same direction — and the concrete floor it names is 3:1 against the real background colour, not
 * an assumed white.
 */
export function paleStop(
  ground: string,
  accent: string,
  floor = NON_TEXT_CONTRAST_MIN,
): string {
  if (!HEX.test(ground) || !HEX.test(accent))
    throw new Error(
      `ground and accent must be #rrggbb, got ${ground} / ${accent}`,
    );
  if (contrast(accent, ground) < floor)
    throw new Error(
      `accent ${accent} measures ${contrast(accent, ground).toFixed(2)}:1 against ground ${ground}, ` +
        `under the ${floor}:1 non-text floor — no ramp between them can clear it either`,
    );
  for (let step = 1; step <= 100; step++) {
    const candidate = mix(ground, accent, step / 100);
    if (contrast(candidate, ground) >= floor) return candidate;
  }
  // Unreachable: step 100 IS the accent, already checked above.
  throw new Error(`no stop between ${ground} and ${accent} clears ${floor}:1`);
}

/** Sample the ramp and prove the two properties the type depends on, rather than asserting them
 *  in a comment: luminance moves in ONE direction only, and every stop clears the non-text floor
 *  against the ground it is really drawn on. */
export function assertRampIsReadable(
  ramp: (t: number) => string,
  ground: string,
  samples = 21,
): void {
  const stops = Array.from({ length: samples }, (_, i) =>
    ramp(i / (samples - 1)),
  );
  const ratios = stops.map((s) => contrast(s, ground));
  const failing = ratios.findIndex((r) => r < NON_TEXT_CONTRAST_MIN);
  if (failing >= 0)
    throw new Error(
      `ramp stop ${stops[failing]} measures ${ratios[failing].toFixed(2)}:1 against ${ground}, ` +
        `under the ${NON_TEXT_CONTRAST_MIN}:1 non-text floor`,
    );
  // Contrast against a fixed ground is a monotonic function of the stop's own luminance, so a
  // monotonic ratio sequence IS a monotonic luminance ramp — checked on the numbers, in one
  // direction, never dipping back.
  for (let i = 1; i < ratios.length; i++) {
    if (ratios[i] < ratios[i - 1] - 1e-9)
      throw new Error(
        `ramp is not monotonic: stop ${i} (${stops[i]}, ${ratios[i].toFixed(2)}:1) is lighter than ` +
          `stop ${i - 1} (${stops[i - 1]}, ${ratios[i - 1].toFixed(2)}:1)`,
      );
  }
}

/** Ink or ground-pole, whichever MEASURES higher against this exact fill. A luminance threshold
 *  standing in for a measurement is the documented way white text ends up on a mid-toned fill at
 *  well under 4.5:1. */
export function labelOn(fill: string): string {
  return contrast("#000000", fill) >= contrast("#FFFFFF", fill)
    ? "#000000"
    : "#FFFFFF";
}

/** Pure geometry: rows and years to cell rectangles. Knows no colour, no font and no label. */
export function heatmapGeometry(
  rows: Row[],
  years: number[],
  {
    left,
    top,
    right,
    bottom,
  }: { left: number; top: number; right: number; bottom: number },
) {
  const cellWidth = (right - left) / years.length;
  const cellHeight = (bottom - top) / rows.length;
  const cells = rows.flatMap((row, r) =>
    row.readings.map((reading) => ({
      country: row.country,
      year: reading.year,
      value: reading.value,
      x: left + years.indexOf(reading.year) * cellWidth,
      y: top + r * cellHeight,
      width: cellWidth,
      height: cellHeight,
    })),
  );
  return {
    cells,
    cellWidth,
    cellHeight,
    rowCentres: rows.map((_, r) => top + (r + 0.5) * cellHeight),
  };
}

/** Wrap on the measured width of the real string, never on a character count. */
function wrap(
  text: string,
  maxWidth: number,
  font: { fontSize: number; fontWeight: number },
): string[] {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/)) {
    const trial = line ? `${line} ${word}` : word;
    if (line && measureText(trial, font) > maxWidth) {
      lines.push(line);
      line = word;
    } else line = trial;
  }
  return line ? [...lines, line] : lines;
}

/**
 * Where a value sits on the ramp, 0 to 1 — the **square root** of its share of the maximum, not
 * the share itself.
 *
 * This was a linear position, and the first render is why it is not. `heatmap.md`'s
 * accessibility floor puts the palest usable stop at 3:1 against the ground, which on a white
 * ground leaves the ramp about 90 of 255 grey levels to work with; spend those linearly across a
 * domain running to 87% when three quarters of the real readings sit under 25%, and every one of
 * those readings lands in the same near-identical grey. The rendered grid was a flat slab: the
 * United Kingdom's fall from 28% to 0.7% — a 98% collapse, the beat's own steepest — was invisible.
 *
 * A square root spreads the readings that actually exist across the whole ramp. It is monotonic,
 * so nothing about the type's one failure mode changes: a bigger share is still a darker cell,
 * always. What it costs is proportionality — a cell twice as dark is no longer twice the value —
 * and that cost is paid in the open, by a legend whose own tick spacing is visibly uneven and by
 * a subtitle that says so. The alternative considered and rejected was hand-chosen bins, which
 * would have made a country crossing an edge flip a whole shade for a rounding's worth of change.
 */
export function rampPosition(value: number, maxValue: number): number {
  if (!(maxValue > 0))
    throw new Error(`maxValue must be positive, got ${maxValue}`);
  return Math.sqrt(Math.min(1, Math.max(0, value / maxValue)));
}

export function formatCell(v: number): string {
  return v >= 10 ? String(Math.round(v)) : v.toFixed(1);
}

export function CoalShareHeatmap({
  rows,
  title,
  subtitle,
  source,
  alt,
  ground,
  accent,
  unit,
}: {
  /** Already ordered by the caller — `heatmap.md` asks for rows ordered deliberately so real
   *  clusters read as blocks instead of scattering across a randomly-ordered grid. */
  rows: Row[];
  title: string;
  subtitle: string;
  source: string;
  alt: string;
  ground: string;
  accent: string;
  /** Printed once, on the legend's top end — not on 180 cells. */
  unit: string;
}) {
  if (rows.length < 3)
    throw new Error(
      `a heatmap beat needs at least three rows, got ${rows.length}`,
    );
  const shapes = new Set(
    rows.map((r) => r.readings.map((x) => x.year).join(",")),
  );
  if (shapes.size !== 1)
    throw new Error(
      "every row must cover exactly the same years — a heatmap with ragged rows is a table",
    );

  const { ink, muted } = deriveFurniture(ground);
  const { width, height } = FRAME;
  const years = rows[0].readings.map((r) => r.year);
  const maxValue = Math.max(
    ...rows.flatMap((r) => r.readings.map((x) => x.value)),
  );

  const pale = paleStop(ground, accent);
  // ONE ramp function, used by the cells and by the legend gradient alike. Two interpolators —
  // d3's colour scale for the cells, a hand-mixed one for the legend — would be a legend that does
  // not describe the grid beside it. `contrast()` also needs #rrggbb, which d3's colour
  // interpolation does not return.
  // The DEEP end is not the accent itself but the accent carried a third of the way to the ink
  // `deriveFurniture` already derived from this ground. No new hue is named — this is the same
  // derivation `deriveFurniture` performs for `muted`, applied at the other end.
  //
  // It is here because the pale end is pinned: `heatmap.md`'s 3:1 floor puts the lightest usable
  // stop at a solid mid-grey on a white ground, which leaves the ramp only about 90 of 255 levels
  // to spend. Stopping at the accent as well made the whole grid read as one slab — verified by
  // looking at the render, twice, before this line existed. Reaching past the accent buys back
  // roughly a third more range at the end that is free to move.
  const deep = mix(accent, ink, 0.35);
  const ramp = (t: number) => mix(pale, deep, Math.min(1, Math.max(0, t)));
  const colourAt = (value: number) => ramp(rampPosition(value, maxValue));
  assertRampIsReadable(ramp, ground);

  const titleLines = wrap(title, width - PAD * 2, TITLE);
  const titleBaseline = PAD + TITLE.fontSize;
  const subtitleTop = titleBaseline + (titleLines.length - 1) * TITLE.lead + 26;
  const subtitleLines = wrap(subtitle, width - PAD * 2, SUBTITLE);
  // THE SOURCE SITS ON THE FRAME'S OWN BOTTOM MARGIN — `height - PAD`, the same inset the title
  // hangs off at the top, on the same x. See chart-beat/references/static-discipline.md,
  // "The source on the frame's bottom margin".
  const sourceBaseline = height - PAD;

  // The legend keeps the air it always had above it, measured from the LAST HEADER line rather
  // than from the source, which is no longer in the header.
  const legendTop = subtitleTop + (subtitleLines.length - 1) * SUBTITLE.lead + 22;
  const legendLabelBaseline = legendTop + LEGEND.height + 15;
  const yearLabelBaseline = legendLabelBaseline + 30;

  // Measured from the widest country name that will really be drawn, never a constant — a fixed
  // gutter is how "United Kingdom" becomes "United Kingdo…" the day the dataset changes.
  const rowLabelGutter =
    Math.max(...rows.map((r) => measureText(r.country, ROW_LABEL))) + 12;

  const gridBox = {
    left: PAD + rowLabelGutter,
    top: yearLabelBaseline + 10,
    right: width - PAD,
    // The grid used to run to the frame's floor. The credit owns that margin now, so the grid's
    // last row ends above the credit's ink instead.
    bottom: sourceBaseline - SOURCE.fontSize - 12,
  };
  const { cells, cellWidth, rowCentres } = heatmapGeometry(
    rows,
    years,
    gridBox,
  );

  const labelledYears = new Set([years[0], years[years.length - 1]]);

  // A printed value is prose, so its floor is 4.5:1 against the cell it sits on — checked on the
  // fills that will really be drawn, not argued for. The arithmetic says this can never fail (the
  // worst possible fill for its own better pole is L = 0.1791, where that pole still measures
  // 4.58:1), which is exactly why it is worth asserting: a future ramp change that broke it would
  // otherwise ship a chart nobody could read, silently.
  for (const cell of cells) {
    if (!labelledYears.has(cell.year)) continue;
    const fill = colourAt(cell.value);
    const ratio = contrast(labelOn(fill), fill);
    if (ratio < 4.5)
      throw new Error(
        `${cell.country} ${cell.year}: value label measures ${ratio.toFixed(2)}:1 on its own cell ${fill}`,
      );
  }
  // The legend's ticks are placed on the SAME square-rooted position the cells use, so their
  // uneven spacing is the scale's non-linearity shown rather than described. Round landmarks
  // inside the observed range, plus the observed maximum itself so the dark end is named.
  const legendTicks = [0, 5, 10, 25, 50]
    .filter((v) => v < maxValue)
    .concat([maxValue]);
  const legendX = (value: number) =>
    PAD + rampPosition(value, maxValue) * LEGEND.width;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      fontFamily={FONT_FAMILY}
    >
      <desc>{alt}</desc>
      <defs>
        <linearGradient id="coal-ramp" x1="0" x2="1" y1="0" y2="0">
          {Array.from({ length: 11 }, (_, i) => i / 10).map((t) => (
            <stop key={t} offset={`${t * 100}%`} stopColor={ramp(t)} />
          ))}
        </linearGradient>
      </defs>
      <rect x={0} y={0} width={width} height={height} fill={ground} />

      {titleLines.map((line, i) => (
        <text
          key={line}
          x={PAD}
          y={titleBaseline + i * TITLE.lead}
          fill={ink}
          fontSize={TITLE.fontSize}
          fontWeight={TITLE.fontWeight}
        >
          {line}
        </text>
      ))}
      {subtitleLines.map((line, i) => (
        <text
          key={line}
          x={PAD}
          y={subtitleTop + i * SUBTITLE.lead}
          fill={muted}
          fontSize={SUBTITLE.fontSize}
        >
          {line}
        </text>
      ))}
      <text x={PAD} y={sourceBaseline} fill={muted} fontSize={SOURCE.fontSize}>
        {source}
      </text>

      {/* Colour without a key is not decoded, it is admired (`heatmap.md`). The legend states both
          ends of the ramp and the unit, once. */}
      <rect
        x={PAD}
        y={legendTop}
        width={LEGEND.width}
        height={LEGEND.height}
        fill="url(#coal-ramp)"
      />
      {legendTicks.map((tick) => (
        <line
          key={`tick-${tick}`}
          x1={legendX(tick)}
          x2={legendX(tick)}
          y1={legendTop + LEGEND.height}
          y2={legendTop + LEGEND.height + 4}
          stroke={muted}
          strokeWidth={1}
        />
      ))}
      {legendTicks.map((tick, i) => (
        <text
          key={tick}
          x={legendX(tick)}
          y={legendLabelBaseline}
          fill={muted}
          fontSize={LEGEND.fontSize}
          textAnchor={
            i === 0 ? "start" : i === legendTicks.length - 1 ? "end" : "middle"
          }
        >
          {i === legendTicks.length - 1
            ? `${Math.round(tick)}${unit}`
            : Math.round(tick)}
        </text>
      ))}

      {years.map((year) =>
        labelledYears.has(year) ? (
          <text
            key={year}
            x={gridBox.left + (years.indexOf(year) + 0.5) * cellWidth}
            y={yearLabelBaseline}
            fill={ink}
            fontSize={YEAR_LABEL.fontSize}
            fontWeight={700}
            textAnchor="middle"
          >
            {year}
          </text>
        ) : (
          <text
            key={year}
            x={gridBox.left + (years.indexOf(year) + 0.5) * cellWidth}
            y={yearLabelBaseline}
            fill={muted}
            fontSize={YEAR_LABEL.fontSize}
            textAnchor="middle"
          >
            {String(year).slice(2)}
          </text>
        ),
      )}

      {rows.map((row, r) => (
        <text
          key={row.country}
          x={gridBox.left - 10}
          y={rowCentres[r] + 4}
          fill={ink}
          fontSize={ROW_LABEL.fontSize}
          textAnchor="end"
        >
          {row.country}
        </text>
      ))}

      {cells.map((cell) => {
        const fill = colourAt(cell.value);
        return (
          <g key={`${cell.country}-${cell.year}`}>
            <rect
              x={cell.x + CELL_GAP / 2}
              y={cell.y + CELL_GAP / 2}
              width={cell.width - CELL_GAP}
              height={cell.height - CELL_GAP}
              fill={fill}
            />
            {labelledYears.has(cell.year) && (
              <text
                x={cell.x + cell.width / 2}
                y={cell.y + cell.height / 2 + 4}
                fill={labelOn(fill)}
                fontSize={CELL_LABEL.fontSize}
                fontWeight={CELL_LABEL.fontWeight}
                textAnchor="middle"
              >
                {formatCell(cell.value)}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
