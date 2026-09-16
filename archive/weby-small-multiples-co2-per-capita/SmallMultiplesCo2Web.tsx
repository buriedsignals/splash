/**
 * The web beat of "Poland's per-capita CO2 emissions have overtaken Germany's, even as both have
 * fallen sharply since their 1979-80 peaks" — four small line panels on ONE shared, zero-based
 * scale. Coordinates come from `./small-multiples-geometry.ts`. Read
 * `chart-web/references/web-discipline.md` and
 * `chart-beat/references/types/small-multiples.md` before changing this file.
 *
 * MIGRATED TO THE FLUID FRAME (`web-discipline.md`, "Responsive behaviour", second build). This
 * beat used to ship two pre-rendered rungs — a 900px 2x2 grid and a 360px single column, swapped by
 * a media query, both drawn as one big SVG with every word inside it. That is overturned. There is
 * now ONE `WebFrame`: a real CSS grid of four `.panel` boxes, each holding its OWN small `<svg>`
 * that carries GEOMETRY ONLY — not one `<text>` element anywhere. Every word (title, caption,
 * source, each panel's country name, each panel's y ticks and end year labels, each end value) is
 * plain HTML at a FIXED pixel size. Geometry stretches; type does not.
 *
 * FOUR PANELS, TWO COLUMNS, ALWAYS. The grid is `repeat(2, minmax(0, 1fr))` at every width rather
 * than an `auto-fit` that rewraps. That is deliberate and it is not a rung: nothing is
 * pre-rendered twice and no media query exists: the same four panels stretch continuously, two
 * across, from 375px to 3440px. A wrapping grid was tried on paper and rejected for a reason the
 * type sheet states outright (`small-multiples.md`: "panel size, aspect ratio, and the position of
 * the axis inside the panel stay identical too, so panels are visually swappable except for the
 * data itself") — under `auto-fit` the row count changes with the viewport, which changes which
 * panel is in "the left column", which is the only thing the two-rung build used to decide where
 * the y-axis numbers were printed. A layout whose axis moves as the reader resizes is worse than a
 * narrow panel.
 *
 * SO EVERY PANEL PRINTS ITS OWN Y TICKS, where the two-rung build printed them only in the left
 * column and the x years only in the bottom row. That is not the repetition trap
 * (`small-multiples.md` names printing "the full axis title, the unit, and the source line on every
 * single panel" — the unit is still stated ONCE, in the caption). It is the rule directly above it:
 * identical axis position in every panel, so the panels really are swappable. Four short numbers
 * per panel is the price.
 *
 * WHY EACH PANEL GETS ITS OWN `<svg>` rather than one SVG holding all four: the fluid frame's whole
 * mechanism is `preserveAspectRatio="none"` stretching a `viewBox` to fill a CSS box. One SVG
 * spanning four panels would have to carry the gutters and gaps BETWEEN panels inside that
 * viewBox, so they would stretch with the geometry — and the gaps and gutters are furniture, which
 * this format keeps at a fixed pixel size. Four boxes in a CSS grid put the gaps where CSS can hold
 * them fixed and let each panel's own geometry stretch inside its own cell.
 *
 * THE PLOT FLOOR. Height follows width through `aspect-ratio`, which at 375px leaves each panel
 * about 45px of line. `.chart-plot` carries an inline `min-height`, this beat's own version of the
 * format's `PLOT_FLOOR_PX`, so a phone gets short panels rather than illegible ones.
 *
 * NUMBER LOCALE. This beat's words are English and its `<html lang>` is patched to `en`, so its
 * figures are English: `formatTonnes` prints `12.4` with a decimal POINT. There is no `fr` in this
 * beat and no formatter named for a locale it does not produce. The same function writes the end
 * label, the `aria-label` and the tooltip, so the frame and the prose cannot disagree.
 *
 * INTERACTION — scoped PER PANEL, never one array of points spanning more than one panel. Four
 * independent lines share one x-domain, so an svg-wide nearest-by-x would resolve a pointer over
 * Poland's 1973 reading against whichever other panel's 1973 point happened to sit marginally
 * closer. Each panel owns its own `<svg>`, its own `.hit-area` and its own 75 `.pt` circles, and
 * `./small-multiples-interaction.mjs` wires each inside its own closure — cross-panel bleed is
 * impossible by construction, not avoided by convention.
 *
 * This component never imports the rasteriser: `ink`/`muted`/`grid`/`measure` are props, derived
 * once in node by whatever runner calls it.
 */

import {
  panelGeometry,
  sharedXDomain,
  sharedYDomain,
  yTickValues,
  type Country,
} from "./small-multiples-geometry";

const UNIT = "t CO2/capita";
/** Panels per row, at every width — see this file's own doc-comment. */
const COLS = 2;
/** The end-point dot's own radius, in CSS pixels. It is an HTML element, not an SVG `<circle>`:
 *  inside a `preserveAspectRatio="none"` viewBox a circle is scaled per axis, and these panels are
 *  wide and short, so a circle reads as a flat oval on a laptop. */
const END_DOT_PX = 4;
/** The plot grid's height floor in CSS pixels — see this file's own doc-comment. */
const MIN_PLOT_PX = 300;
/** The x-range's own inset inside each panel's `viewBox`, in canonical SVG user units. Two reasons,
 *  the second found by driving: the end dot would otherwise sit exactly on the `viewBox` edge and be
 *  clipped in half; and the pointer-resolving `.hit-area` rect ends at that same edge, so a hover
 *  landing on the FINAL reading's own centre fell one pixel outside it and answered with nothing —
 *  4 of 300 readings dead, at all three widths, and only the driver's per-reading sweep found them.
 *  The hit-area now covers the whole panel box and the line is inset inside it. */
const PANEL_INSET = 6;

type Measure = (
  text: string,
  font: { fontSize: number; fontWeight?: number },
) => number;

/** `WebFrame` is declared here, duplicated rather than imported from `ChartWebSeed.tsx` — the same
 *  "duplicate, do not link" ruling that file states. Fields are this beat's own shape: ONE panel's
 *  canonical geometry plus the fixed furniture rows around it, repeated four times by CSS. */
export type WebFrame = {
  /** ONE panel's plot rectangle, in SVG user units — proportions only, never a rendered pixel cap.
   *  Four of these tile the grid; each stretches to fill its own cell. */
  panelWidth: number;
  panelHeight: number;
  /** Fixed CSS pixel rows inside every panel: the country-name row above the plot, and the
   *  end-year row below it. Identical in all four, so the panels stay swappable. */
  panelLabelPx: number;
  xAxisRowPx: number;
  /** Fixed CSS pixel gap between panels, both directions. Furniture, so it never stretches. */
  gapPx: number;
  title: { fontSize: number; fontWeight: number };
  subtitle: { fontSize: number };
  source: { fontSize: number };
  axis: { fontSize: number };
  panelLabel: { fontSize: number; fontWeight: number };
  endLabel: { fontSize: number; fontWeight: number };
  /** How many y gridlines every panel asks for — the SAME hint for all four, because they share one
   *  y-domain. Decided ONCE, at the canonical size, never re-derived as the frame stretches. */
  yTickHint: number;
};

export const FRAME: WebFrame = {
  panelWidth: 380,
  panelHeight: 170,
  panelLabelPx: 22,
  xAxisRowPx: 18,
  gapPx: 22,
  title: { fontSize: 22, fontWeight: 700 },
  subtitle: { fontSize: 13 },
  source: { fontSize: 12 },
  axis: { fontSize: 11 },
  panelLabel: { fontSize: 14, fontWeight: 700 },
  endLabel: { fontSize: 12, fontWeight: 600 },
  yTickHint: 4,
};

/** Tonnes to one decimal — English, matching this beat's own declared language. Named for what it
 *  returns, not for a locale. */
export function formatTonnes(value: number): string {
  return value.toFixed(1);
}

/** `value / total` as a percentage, one decimal — puts an HTML label on the exact spot the SVG
 *  geometry it annotates was drawn at, as a fraction of the SAME box, so it tracks the stretch. */
function pct(value: number, total: number): number {
  return total === 0 ? 0 : Math.round((value / total) * 1000) / 10;
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
  frame,
}: {
  countries: Country[];
  /** Indices into `countries`, in render order (left-to-right, top-to-bottom) — the ranking the
   *  story wants the reader to read the panels in, not necessarily the array's own order. */
  order: number[];
  /** The country NAME that gets the accent treatment — matched against `country.name`, not a
   *  positional index, so the caller cannot silently accent the wrong panel if `order` changes. */
  subject: string;
  title: string;
  /** Printed once, at the grid level — states the unit and the shared-scale caveat so no panel has
   *  to (`small-multiples.md`'s repetition trap). */
  caption: string;
  source: string;
  alt: string;
  ground: string;
  accent: string;
  ink: string;
  muted: string;
  grid: string;
  measure: Measure;
  frame: WebFrame;
}) {
  if (countries.length !== 4)
    throw new Error(
      `this beat needs exactly 4 countries, got ${countries.length}`,
    );
  if (order.length !== countries.length)
    throw new Error(
      `order must list every country exactly once, got ${order.length} entries for ${countries.length} countries`,
    );

  // The shared scale, computed once across all four countries — the rule this whole beat exists to
  // keep. Every panel reads off this ONE domain; none fits its own.
  const xDomain = sharedXDomain(countries);
  const yDomain = sharedYDomain(countries);
  const yTicks = yTickValues(yDomain, frame.yTickHint);

  // The one gutter this beat measures, from the widest tick label that will actually be drawn at
  // its own fixed font size — identical in every panel, so the plot rectangles stay identical too.
  const yGutterPx =
    8 + Math.max(...yTicks.map((v) => measure(String(v), frame.axis)));

  const panels = order.map((countryIndex, slot) => {
    const country = countries[countryIndex];
    const g = panelGeometry(
      country.data,
      {
        left: PANEL_INSET,
        top: 0,
        width: frame.panelWidth - PANEL_INSET * 2,
        height: frame.panelHeight,
      },
      xDomain,
      yDomain,
    );
    return { country, slot, isSubject: country.name === subject, ...g };
  });

  if (!panels.some((p) => p.isSubject))
    throw new Error(
      `subject ${JSON.stringify(subject)} does not match any country name in ${countries.map((c) => c.name).join(", ")}`,
    );

  const rows = Math.ceil(countries.length / COLS);
  const totalWidth =
    COLS * (yGutterPx + frame.panelWidth) + (COLS - 1) * frame.gapPx;
  const totalHeight =
    rows * (frame.panelLabelPx + frame.panelHeight + frame.xAxisRowPx) +
    (rows - 1) * frame.gapPx;

  return (
    <figure
      className="chart-figure"
      style={{
        ["--ground" as string]: ground,
        ["--accent" as string]: accent,
        ["--ink" as string]: ink,
        ["--muted" as string]: muted,
        // Fixed CSS pixel type sizes, threaded as custom properties. None of these ever changes
        // with a viewBox's width — that is the whole point of the redesign.
        ["--title-size" as string]: `${frame.title.fontSize}px`,
        ["--title-weight" as string]: frame.title.fontWeight,
        ["--subtitle-size" as string]: `${frame.subtitle.fontSize}px`,
        ["--source-size" as string]: `${frame.source.fontSize}px`,
        ["--axis-size" as string]: `${frame.axis.fontSize}px`,
        ["--label-size" as string]: `${frame.endLabel.fontSize}px`,
        ["--label-weight" as string]: frame.endLabel.fontWeight,
        ["--note-size" as string]: `${frame.axis.fontSize}px`,
        ["--panel-label-size" as string]: `${frame.panelLabel.fontSize}px`,
        ["--panel-label-weight" as string]: frame.panelLabel.fontWeight,
      }}
    >
      <div className="chart-header">
        <h2 className="chart-title">{title}</h2>
        <p className="chart-caveat">{caption}</p>
      </div>

      <div
        className="chart-plot small-multiples"
        style={{
          ["--y-gutter" as string]: `${yGutterPx}px`,
          ["--panel-label-h" as string]: `${frame.panelLabelPx}px`,
          ["--x-axis-h" as string]: `${frame.xAxisRowPx}px`,
          ["--panel-gap" as string]: `${frame.gapPx}px`,
          ["--cols" as string]: COLS,
          aspectRatio: `${totalWidth} / ${totalHeight}`,
          minHeight: `${MIN_PLOT_PX}px`,
        }}
      >
        {/* The alt text lives on the grid, once, rather than on any one panel's `<svg>` — it
            describes all four. `role="img"` is NOT set anywhere in this beat: it would flatten the
            300 individually-named readings below into one opaque image (`web-discipline.md`, "One
            deliberate departure from the static format's accessibility pattern"). */}
        <p className="visually-hidden">{alt}</p>

        {panels.map((p) => {
          const lineColour = p.isSubject ? accent : ink;
          const end = p.points[p.points.length - 1];
          return (
            <div
              className={`panel${p.isSubject ? " subject" : ""}`}
              key={p.country.name}
              data-panel={p.country.name}
            >
              {/* The panel's own category name — the ONLY thing each panel carries beyond the
                  shared axis and unit (`small-multiples.md`). Accented when this is the subject, so
                  a reader can tell which panel is Poland at a glance, no interaction required. */}
              <span
                className="panel-name"
                style={{ color: p.isSubject ? accent : ink }}
              >
                {p.country.name}
              </span>

              <div className="panel-y">
                {yTicks.map((v) => (
                  <span
                    key={v}
                    className="axis-label y"
                    style={{
                      top: `${pct(
                        p.plot.bottom -
                          (p.plot.bottom - p.plot.top) *
                            ((v - yDomain[0]) / (yDomain[1] - yDomain[0])),
                        frame.panelHeight,
                      )}%`,
                    }}
                  >
                    {v}
                  </span>
                ))}
              </div>

              {/* GEOMETRY ONLY — no `<text>`. Its own viewBox, its own stretch, its own cell. */}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="panel-chart"
                viewBox={`0 0 ${frame.panelWidth} ${frame.panelHeight}`}
                preserveAspectRatio="none"
              >
                <rect
                  x={0}
                  y={0}
                  width={frame.panelWidth}
                  height={frame.panelHeight}
                  fill={ground}
                />
                {yTicks.map((v) => {
                  const ty =
                    p.plot.bottom -
                    (p.plot.bottom - p.plot.top) *
                      ((v - yDomain[0]) / (yDomain[1] - yDomain[0]));
                  return (
                    <line
                      key={v}
                      x1={0}
                      x2={frame.panelWidth}
                      y1={ty}
                      y2={ty}
                      stroke={grid}
                      strokeWidth={1}
                      vectorEffect="non-scaling-stroke"
                    />
                  );
                })}
                <rect
                  x={0}
                  y={0}
                  width={frame.panelWidth}
                  height={frame.panelHeight}
                  fill="none"
                  stroke={grid}
                  strokeWidth={1}
                  vectorEffect="non-scaling-stroke"
                />
                <path
                  d={p.path}
                  fill="none"
                  stroke={lineColour}
                  strokeWidth={p.isSubject ? 2.5 : 1.75}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  vectorEffect="non-scaling-stroke"
                />

                {/* This panel's own interaction layer — invisible at rest, wired by
                    `small-multiples-interaction.mjs` inside this panel's own closure. Every reading
                    carries its own `tabIndex`, `aria-label` and `data-detail`, baked in at build
                    time, so the no-JS page is still keyboard-reachable reading by reading with the
                    script absent entirely. */}
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
                    aria-label={`${p.country.name}, ${pt.year}: ${formatTonnes(pt.value)} ${UNIT}`}
                    data-year={pt.year}
                    data-detail={`${p.country.name}, ${pt.year}: ${formatTonnes(pt.value)} ${UNIT}`}
                  />
                ))}
                <rect
                  className="hit-area"
                  data-panel={p.country.name}
                  x={0}
                  y={0}
                  width={frame.panelWidth}
                  height={frame.panelHeight}
                  fill="transparent"
                  pointerEvents="all"
                />
              </svg>

              {/* HTML overlay, same cell as this panel's `<svg>`. `aria-hidden`: the end value is
                  already carried by that reading's own `aria-label` above. The end dot is HTML for
                  the reason `END_DOT_PX` states. The label carries a `--ground` chip: these panels
                  are short enough that the line's own last segments pass directly under it. */}
              <div className="panel-overlay" aria-hidden="true">
                <span
                  className="end-dot"
                  style={{
                    left: `${pct(end.x, frame.panelWidth)}%`,
                    top: `${pct(end.y, frame.panelHeight)}%`,
                    width: `${END_DOT_PX * 2}px`,
                    height: `${END_DOT_PX * 2}px`,
                    background: lineColour,
                  }}
                />
                <span
                  className="panel-end-label"
                  style={{
                    left: `${pct(end.x, frame.panelWidth)}%`,
                    top: `${pct(end.y, frame.panelHeight)}%`,
                    color: lineColour,
                  }}
                >
                  {formatTonnes(end.value)}
                </span>
              </div>

              {/* The shared x-axis, at each panel's own edge: the first and last year of the one
                  domain all four share. Identical position in every panel. */}
              <div className="panel-x">
                <span className="axis-label x start">{xDomain[0]}</span>
                <span className="axis-label x end">{xDomain[1]}</span>
              </div>
            </div>
          );
        })}
      </div>

      <p className="chart-source">{source}</p>
    </figure>
  );
}
