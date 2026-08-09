/**
 * The web genre's small-multiples beat — "Poland's per-capita CO2 emissions have overtaken
 * Germany's, even as both have fallen sharply since their 1979-80 peaks." Four line panels
 * (Switzerland, France, Germany, Poland), one shared zero-based y-domain, one shared 1950-2024
 * x-domain — `small-multiples.md`'s one non-negotiable rule governs every dimension below.
 *
 * THIS IS THE FIRST WEB-GENRE SMALL-MULTIPLES BEAT. There is no static or interactive sibling to
 * adapt — the only existing beat of this claim is the VIDEO build
 * (`../more-small-multiples-co2-per-capita/`), read for its verified numbers and its panel-order
 * reasoning, never imported (a beat never imports another beat's files, doubly so across genres —
 * `twin-chart-web/SKILL.md`, "duplicate, do not link"). This file's own geometry
 * (`small-multiples-geometry.ts`) is a fresh, from-scratch reading of the same doctrine the video
 * beat's `panelGeometry` also reads, not a port of it.
 *
 * WHY INTERACTION EARNS ITS PLACE HERE MORE THAN ANYWHERE ELSE IN THIS TWIN: four panels of 75
 * annual readings each is 300 individual numbers, and a small-multiples panel is by definition
 * SMALLER than a single full-width chart — there is categorically less room per panel to print a
 * label than a single-panel beat has. The static/video genre can print at most one end-label and
 * one reference year per panel; every other one of the 300 readings is undiscoverable without
 * this genre. See `BRIEF.md`, "Interaction," for the full reasoning; this file only implements it.
 *
 * FOUR SVGs, not one, and FOUR independent `.hit-area`/`.pt` sets — the design call this beat's
 * own instructions left open ("4 hit-areas within one SVG, or 4 separate SVGs — your call").
 * Chosen: ONE `<svg class="chart">` per layout (matching the seed's own one-svg-per-layout shape,
 * and `render-web.mjs`'s CSS media query that toggles `svg.chart[data-layout=...]`), with FOUR
 * independent panels INSIDE it, each wrapped in its own `<g class="panel" data-panel="...">`
 * carrying its own `.hit-area` rect and its own 75 `.pt` circles. `small-multiples-interaction.mjs`
 * resolves a pointer or a keyboard step to the nearest reading WITHIN the enclosing `.panel`'s own
 * points array only — see that file's own header comment for why closures, not a shared array,
 * make cross-panel bleed structurally impossible rather than merely avoided by convention.
 *
 * Like `ChartWebSeed.tsx` and every other beat in this twin, this component never imports the
 * rasteriser: `ink`/`muted`/`grid`/`measure` are props, derived once in node by whichever runner
 * calls it (`render-web.mjs`, below).
 */

import {
  panelGeometry,
  panelOrigin,
  sharedXDomain,
  sharedYDomain,
  yTickValues,
  type Country,
} from "./small-multiples-geometry";

type Measure = (
  text: string,
  font: { fontSize: number; fontWeight?: number },
) => number;

/** Declared fresh, not imported from `ChartWebSeed.tsx` — the same "duplicate, do not link" ruling
 *  this genre's own doc-comments state everywhere else (no vendoring path a story could reach). */
export type WebLayout = {
  name: "desktop" | "narrow";
  width: number;
  pad: number;
  /** Panels per row. 2 on desktop (2x2 grid); 1 on narrow (stacked, one panel per row) — a
   *  narrow frame does not have the width for two side-by-side panels AND a legible left-column
   *  y-axis gutter at the same time, so it falls back to a single column instead of shrinking
   *  both panels illegibly. */
  cols: number;
  colGap: number;
  rowGap: number;
  title: { fontSize: number; fontWeight: number; lead: number };
  /** The unit/caveat line, printed ONCE here at the grid level — `small-multiples.md`'s own
   *  "repetition trap" rule: the unit is stated here, never re-printed per panel. */
  subtitle: { fontSize: number; fontWeight: number; lead: number };
  source: { fontSize: number; fontWeight: number; lead: number };
  panelLabel: { fontSize: number; fontWeight: number };
  axis: { fontSize: number };
  endLabel: { fontSize: number; fontWeight: number };
  /** How many y gridlines each panel asks for — the SAME hint for every panel, because they share
   *  one y-domain; there is no per-panel tick density to tune. */
  yTickHint: number;
  /** Each panel's own floor for usable plot height, identical across every panel regardless of
   *  row — `small-multiples.md`: "panel size... stay[s] identical too." The grid's total height is
   *  DERIVED from this (header block + rows * panelMinHeight + row gaps + bottomPad), never a
   *  fixed constant guessed to be tall enough — see this component's own height derivation below. */
  panelMinHeight: number;
  bottomPad: number;
};

const UNIT = "t CO2/capita";

/** Wrap on the measured width of the real string — the exact bug `web-discipline.md` names in its
 *  own header note (a source line clipped off the narrow layout's edge the first time this genre
 *  was actually driven). Duplicated from `ChartWebSeed.tsx`'s own `wrap`, not imported. */
function wrap(
  text: string,
  maxWidth: number,
  font: { fontSize: number; fontWeight: number },
  measure: Measure,
): string[] {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/)) {
    const trial = line ? `${line} ${word}` : word;
    if (line && measure(trial, font) > maxWidth) {
      lines.push(line);
      line = word;
    } else line = trial;
  }
  return line ? [...lines, line] : lines;
}

function fmt1(value: number): string {
  return value.toFixed(1);
}

export function SmallMultiplesCo2Web({
  countries,
  order,
  subject,
  title,
  caption,
  source,
  alt,
  ground,
  accent,
  ink,
  muted,
  grid,
  measure,
  layout,
}: {
  countries: Country[];
  /** Indices into `countries`, in render order (left-to-right, top-to-bottom) — the ranking the
   *  story wants the reader to read the panels in, not necessarily the array's own order. */
  order: number[];
  /** The country NAME that gets the accent treatment — matched against `country.name`, not a
   *  positional index, so the caller cannot silently accent the wrong panel if `order` changes. */
  subject: string;
  title: string;
  /** Printed once, at the grid level — states the unit and the shared-scale caveat so no panel
   *  has to (`small-multiples.md`'s "repetition trap"). */
  caption: string;
  source: string;
  alt: string;
  ground: string;
  accent: string;
  ink: string;
  muted: string;
  grid: string;
  measure: Measure;
  layout: WebLayout;
}) {
  if (countries.length !== 4)
    throw new Error(
      `this beat needs exactly 4 countries, got ${countries.length}`,
    );
  if (order.length !== countries.length)
    throw new Error(
      `order must list every country exactly once, got ${order.length} entries for ${countries.length} countries`,
    );

  const { width, pad, cols } = layout;

  // ── Header, laid out first — title, then the caption (unit + caveat, stated once), then the
  // source — because the grid starts where the header stops, same top-to-bottom rule the single-
  // panel seed uses.
  const titleLines = wrap(title, width - pad * 2, layout.title, measure);
  const titleBaseline = pad + layout.title.fontSize;
  const captionLines = wrap(caption, width - pad * 2, layout.subtitle, measure);
  const captionBaseline =
    titleBaseline +
    (titleLines.length - 1) * layout.title.lead +
    Math.round(layout.title.lead * 0.9);
  const sourceLines = wrap(source, width - pad * 2, layout.source, measure);
  const sourceBaseline =
    captionBaseline +
    (captionLines.length - 1) * layout.subtitle.lead +
    Math.round(layout.subtitle.lead * 1.1);
  const gridTop =
    sourceBaseline +
    (sourceLines.length - 1) * layout.source.lead +
    Math.round(layout.title.lead);

  // ── The grid's own height, DERIVED, not guessed: header block (fixed above) + N rows of
  // panels, each at the layout's own fixed floor, + row gaps between them + the bottom margin.
  // This is the small-multiples generalisation of `ChartWebSeed.tsx`'s single-panel derivation
  // (`plotTop + plotMinHeight + bottomPad`) — here there are `rows` panels stacked instead of one,
  // so the floor is multiplied by `rows` and `rows - 1` gaps are added between them. Never a fixed
  // height constant: a title that wraps to three lines at 360px pushes `gridTop` down, which pushes
  // every panel below it down with it, exactly the failure mode a hand-picked constant would risk.
  const rows = Math.ceil(countries.length / cols);
  const panelWidth = (width - pad * 2 - (cols - 1) * layout.colGap) / cols;
  const panelHeight = layout.panelMinHeight;
  const gridHeight = rows * panelHeight + (rows - 1) * layout.rowGap;
  const height = gridTop + gridHeight + layout.bottomPad;

  // ── The shared scale, computed once across all four countries — the rule this whole beat
  // exists to keep. Every panel below reads off this ONE domain; none fits its own.
  const xDomain = sharedXDomain(countries);
  const yDomain = sharedYDomain(countries);
  const yTicks = yTickValues(yDomain, layout.yTickHint);

  // ── Gutters reserved IDENTICALLY in every panel, whether or not that particular panel prints
  // the text the gutter is for — `small-multiples.md`: "position of the axis inside the panel
  // stay identical too, so panels are visually swappable except for the data itself." The left
  // gutter is measured against the widest y-tick label that will actually be drawn anywhere in
  // the grid (only the left column prints it, but every panel reserves the same width for it);
  // the top gutter holds the country-name label; the bottom gutter holds the shared x-tick years
  // (only the bottom row prints them).
  const leftGutter =
    10 + Math.max(...yTicks.map((v) => measure(String(v), layout.axis)));
  const topLabelGutter = layout.panelLabel.fontSize + 10;
  const bottomAxisGutter = layout.axis.fontSize + 14;
  const plotWidth = panelWidth - leftGutter;
  const plotHeight = panelHeight - topLabelGutter - bottomAxisGutter;

  const panels = order.map((countryIndex, slot) => {
    const country = countries[countryIndex];
    const origin = panelOrigin(slot, {
      pad,
      cols,
      panelWidth,
      panelHeight,
      colGap: layout.colGap,
      rowGap: layout.rowGap,
      gridTop,
    });
    const plotLeft = origin.left + leftGutter;
    const plotTop = origin.top + topLabelGutter;
    const g = panelGeometry(
      country.data,
      { left: plotLeft, top: plotTop, width: plotWidth, height: plotHeight },
      xDomain,
      yDomain,
    );
    const isLeftCol = slot % cols === 0;
    const isBottomRow = Math.floor(slot / cols) === rows - 1;
    const isSubject = country.name === subject;
    return { country, slot, origin, isLeftCol, isBottomRow, isSubject, ...g };
  });

  if (!panels.some((p) => p.isSubject))
    throw new Error(
      `subject ${JSON.stringify(subject)} does not match any country name in ${countries.map((c) => c.name).join(", ")}`,
    );

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="chart"
      data-layout={layout.name}
      fontFamily="Helvetica, Arial, sans-serif"
    >
      {/* No root role="img" — the same one deliberate departure `ChartWebSeed.tsx` takes from the
          static genre's accessibility pattern: this SVG has children (300 points across four
          panels) that need their own names, which role="img" would flatten and silence. */}
      <desc>{alt}</desc>
      <rect x={0} y={0} width={width} height={height} fill={ground} />

      {titleLines.map((line, i) => (
        <text
          key={line}
          x={pad}
          y={titleBaseline + i * layout.title.lead}
          fill={ink}
          fontSize={layout.title.fontSize}
          fontWeight={layout.title.fontWeight}
        >
          {line}
        </text>
      ))}
      {captionLines.map((line, i) => (
        <text
          key={line}
          x={pad}
          y={captionBaseline + i * layout.subtitle.lead}
          fill={muted}
          fontSize={layout.subtitle.fontSize}
        >
          {line}
        </text>
      ))}
      {sourceLines.map((line, i) => (
        <text
          key={line}
          x={pad}
          y={sourceBaseline + i * layout.source.lead}
          fill={muted}
          fontSize={layout.source.fontSize}
        >
          {line}
        </text>
      ))}

      {panels.map((p) => {
        const lineColour = p.isSubject ? accent : ink;
        const end = p.points[p.points.length - 1];
        const endLabel = `${fmt1(end.value)} ${UNIT}`;

        return (
          <g key={p.country.name} className="panel" data-panel={p.country.name}>
            {/* Panel furniture: shared gridlines (drawn in every panel — a visual reference, not
                repeated TEXT, so `small-multiples.md`'s repetition trap does not apply to it),
                tick VALUES only on the left column, x-tick years only on the bottom row — the
                shared axis is stated once at the grid's own edge, never repeated per panel. */}
            {yTicks.map((v) => {
              const ty =
                p.plot.bottom -
                (p.plot.bottom - p.plot.top) *
                  ((v - yDomain[0]) / (yDomain[1] - yDomain[0]));
              return (
                <g key={v}>
                  <line
                    x1={p.plot.left}
                    x2={p.plot.right}
                    y1={ty}
                    y2={ty}
                    stroke={grid}
                    strokeWidth={1}
                  />
                  {p.isLeftCol && (
                    <text
                      x={p.plot.left - 8}
                      y={ty + 4}
                      fill={muted}
                      fontSize={layout.axis.fontSize}
                      textAnchor="end"
                    >
                      {v}
                    </text>
                  )}
                </g>
              );
            })}
            {p.isBottomRow &&
              [xDomain[0], xDomain[1]].map((yr) => (
                <text
                  key={yr}
                  x={yr === xDomain[0] ? p.plot.left : p.plot.right}
                  y={p.plot.bottom + bottomAxisGutter - 4}
                  fill={muted}
                  fontSize={layout.axis.fontSize}
                  textAnchor={yr === xDomain[0] ? "start" : "end"}
                >
                  {yr}
                </text>
              ))}
            <rect
              x={p.plot.left}
              y={p.plot.top}
              width={p.plot.right - p.plot.left}
              height={p.plot.bottom - p.plot.top}
              fill="none"
              stroke={grid}
              strokeWidth={1}
            />
            {/* The panel's own category name — the ONLY thing each panel carries beyond the
                shared axis/unit, per `small-multiples.md`. Accented ink when this is the
                subject panel, so a reader can tell which one Poland is at a glance, no
                interaction required. */}
            <text
              x={p.plot.left}
              y={p.origin.top + layout.panelLabel.fontSize}
              fill={p.isSubject ? accent : ink}
              fontSize={layout.panelLabel.fontSize}
              fontWeight={p.isSubject ? 700 : layout.panelLabel.fontWeight}
            >
              {p.country.name}
            </text>

            <path
              d={p.path}
              fill="none"
              stroke={lineColour}
              strokeWidth={p.isSubject ? 2.5 : 1.75}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            <circle
              cx={end.x}
              cy={end.y}
              r={p.isSubject ? 4 : 3}
              fill={lineColour}
            />
            {/* A stroke halo, same colour as the ground, behind the end label — this panel is
                narrow enough that the line's own last few segments (which curve close to the
                endpoint, unlike a full-width single-panel beat with room to spare) can pass
                directly under a right-anchored label sitting just above the dot. The same
                "opaque backing so text stays legible over what's under it" reasoning
                `web-discipline.md` grants the `#tooltip` box, applied to a label instead of a
                box, at build time rather than as a CSS rule. */}
            <text
              x={end.x}
              y={end.y - 14}
              fill={lineColour}
              fontSize={layout.endLabel.fontSize}
              fontWeight={layout.endLabel.fontWeight}
              textAnchor="end"
              stroke={ground}
              strokeWidth={5}
              strokeLinejoin="round"
              paintOrder="stroke"
            >
              {endLabel}
            </text>

            {/* This panel's own interaction layer — invisible at rest, wired by
                `small-multiples-interaction.mjs` to hover/tap/keyboard, scoped to THIS panel's
                own points only (see this file's own doc-comment, and that script's, for how). */}
            {p.points.map((pt) => (
              <circle
                key={pt.year}
                className="pt"
                cx={pt.x}
                cy={pt.y}
                r={5}
                fill="transparent"
                stroke="none"
                tabIndex={0}
                role="img"
                aria-label={`${p.country.name}, ${pt.year}: ${fmt1(pt.value)} ${UNIT}`}
                data-year={pt.year}
                data-detail={`${p.country.name}, ${pt.year}: ${fmt1(pt.value)} ${UNIT}`}
              />
            ))}
            <rect
              className="hit-area"
              data-panel={p.country.name}
              x={p.plot.left}
              y={p.plot.top}
              width={p.plot.right - p.plot.left}
              height={p.plot.bottom - p.plot.top}
              fill="transparent"
              pointerEvents="all"
            />
          </g>
        );
      })}
    </svg>
  );
}

export const DESKTOP_LAYOUT: WebLayout = {
  name: "desktop",
  width: 900,
  pad: 40,
  cols: 2,
  colGap: 40,
  rowGap: 44,
  title: { fontSize: 24, fontWeight: 700, lead: 30 },
  subtitle: { fontSize: 14, fontWeight: 400, lead: 19 },
  source: { fontSize: 13, fontWeight: 400, lead: 18 },
  panelLabel: { fontSize: 15, fontWeight: 700 },
  axis: { fontSize: 12 },
  endLabel: { fontSize: 13, fontWeight: 600 },
  yTickHint: 4,
  panelMinHeight: 190,
  bottomPad: 20,
};

export const NARROW_LAYOUT: WebLayout = {
  name: "narrow",
  width: 360,
  pad: 20,
  cols: 1,
  colGap: 0,
  rowGap: 26,
  title: { fontSize: 18, fontWeight: 700, lead: 24 },
  subtitle: { fontSize: 12, fontWeight: 400, lead: 17 },
  source: { fontSize: 11, fontWeight: 400, lead: 15 },
  panelLabel: { fontSize: 13, fontWeight: 700 },
  axis: { fontSize: 10 },
  endLabel: { fontSize: 11, fontWeight: 600 },
  yTickHint: 3,
  panelMinHeight: 140,
  bottomPad: 20,
};

export const LAYOUTS: WebLayout[] = [DESKTOP_LAYOUT, NARROW_LAYOUT];
