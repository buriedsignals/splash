/**
 * The web beat of "Switzerland's population bulges in middle age, not among the youngest" — a
 * population pyramid. Coordinates come from `./pyramid-geometry.ts`. Read
 * `twin-chart-web/references/web-discipline.md` and
 * `twin-chart-beat/references/types/population-pyramid.md` before changing this file.
 *
 * MIGRATED TO THE FLUID FRAME (`web-discipline.md`, "Responsive behaviour", second build). This
 * beat used to ship two pre-rendered rungs — a 900px `DESKTOP_LAYOUT` and a 360px `NARROW_LAYOUT`
 * swapped by a media query, everything drawn as `<text>` inside one SVG. That is overturned: ONE
 * `WebFrame`, SSR'd once; every word (title, caveat, source, legend, the 21 age-band labels, both
 * magnitude axes, the peak annotation) is plain HTML at a FIXED pixel size. Geometry stretches;
 * type does not.
 *
 * TWO SVGs AND A LABEL COLUMN — the shape this type forced, and the one real design decision in
 * this migration. A pyramid's age labels sit in a reserved gutter down the MIDDLE. The two-rung
 * build sized that gutter in SVG user units, which a fluid frame cannot do: the labels are now
 * fixed-pixel HTML while the `viewBox` stretches, so a gutter measured in user units is ~50px on a
 * laptop and ~20px on a phone while the label it must hold stays 24px wide either way — the label
 * would sit on top of the bars at exactly the width where there is least room for it. So the
 * gutter is a real CSS grid track (`--band-gutter`, measured in node from the widest age label at
 * its own fixed size) and the two halves of the mirror are two independent `<svg>`s in the tracks
 * either side of it. Each half stretches inside its own cell; the gutter never does. They stay a
 * true mirror because both `1fr` tracks are equal and both halves are drawn from ONE shared
 * magnitude scale (`pyramidGeometry` is called once, over the full mirrored width, and the right
 * half's coordinates are shifted by `HALF` — never a second scale that happens to look similar,
 * which `population-pyramid.md` names as this type's own cardinal error).
 *
 * THE HIT ROWS ARE HTML, NOT SVG RECTS. A band's hit target spans BOTH halves and the label gutter
 * between them, and no SVG rect can span two separate `<svg>` elements. Each band's target is a
 * `<div class="row-hit">` in a layer over all three tracks, positioned by the same `%` as the bars,
 * still `tabIndex={0}` with its own `aria-label` and `data-detail` baked in at build time — so the
 * no-JS page is keyboard-reachable band by band with the script absent entirely, exactly as before.
 *
 * THE ROW-HEIGHT FLOOR. Height follows width through `aspect-ratio`, which at 375px would put 21
 * bands about 8px apart — half the height of the 11px label each one has to hold. `.chart-plot`
 * carries an inline `min-height` of `bands x MIN_ROW_PX`, this beat's own version of the genre's
 * `PLOT_FLOOR_PX`.
 *
 * NUMBER LOCALE. This beat's words are English and its `<html lang>` is patched to `en`. Its
 * figures are English too and always were: `thousands` and `exactCount` both delegate to
 * `toLocaleString("en-US")`, so a band reads `144,800` with a comma grouping THOUSANDS, never a
 * French decimal comma. Neither function is named for a locale, and there is no `fr` in this beat.
 *
 * WHAT STAYS UNCONDITIONAL: the title, the caveat, the source, the legend, every bar, every age
 * label, both magnitude axes and the peak annotation. Interaction only ever adds each band's own
 * EXACT figures — the 42 numbers the static frame has no room to print — and only ever toggles a
 * `.row-hit`'s own class and the shared `#tooltip` (`web-discipline.md`, "What must not become
 * interactive").
 *
 * This component never imports the rasteriser: `ink`/`muted`/`grid`/`measure` are props, derived
 * once in node by whatever runner calls it.
 */

import {
  exactCount,
  pyramidGeometry,
  thousands,
  type Band,
} from "./pyramid-geometry";

/** The two sexes' own fixed hues — Okabe-Ito blue and vermillion. */
const COLOURS = { male: "#0072B2", female: "#D55E00" };
/** ONE half of the mirror, in canonical SVG user units. The full geometry is computed over
 *  `HALF * 2` with a zero-width central gutter (the gutter is a CSS track now, not user units), and
 *  the right half's coordinates are shifted back by this amount into its own `viewBox`. */
const HALF = 380;
/** The row-height floor, in CSS pixels — see this file's own doc-comment. */
const MIN_ROW_PX = 17;
/** Where the peak annotation's vertical leader stands, in canonical SVG user units from the left
 *  half's own edge — far enough in that its dashes are not flush against the frame, close enough
 *  that the label's own ground chip covers its top end. */
const LEADER_X = 6;

type Measure = (
  text: string,
  font: { fontSize: number; fontWeight?: number },
) => number;

/** `WebFrame` is declared here, duplicated rather than imported from `ChartWebSeed.tsx` — the same
 *  "duplicate, do not link" ruling that file states. Fields are this TYPE's own shape: a mirrored
 *  magnitude axis, a central label gutter, one row per age band. */
export type WebFrame = {
  /** ONE half of the mirror's canonical height, in SVG user units — proportions only, never a
   *  rendered pixel cap. Width comes from `HALF`. */
  height: number;
  /** Fixed CSS pixel row below the plot for both magnitude axes' tick labels. */
  xAxisRowPx: number;
  title: { fontSize: number; fontWeight: number };
  subtitle: { fontSize: number };
  source: { fontSize: number };
  legend: { fontSize: number; fontWeight: number };
  axis: { fontSize: number };
  bandLabel: { fontSize: number };
  note: { fontSize: number; fontWeight: number };
  /** Horizontal padding either side of the widest age-band label, inside the central gutter — the
   *  gutter's own width is MEASURED from the real label strings plus this padding, never a fixed
   *  guess, because a fixed number is exactly what clipped a label the first time this genre's own
   *  line beat was driven. */
  bandLabelPad: number;
  /** How many round ticks each mirrored half-axis is hinted to produce. Decided ONCE, at the
   *  canonical size — never re-derived as the frame stretches. */
  xTickHint: number;
};

export const FRAME: WebFrame = {
  height: 460,
  xAxisRowPx: 20,
  title: { fontSize: 24, fontWeight: 700 },
  subtitle: { fontSize: 13 },
  source: { fontSize: 12 },
  legend: { fontSize: 13, fontWeight: 600 },
  axis: { fontSize: 11 },
  bandLabel: { fontSize: 11 },
  note: { fontSize: 12, fontWeight: 700 },
  bandLabelPad: 10,
  xTickHint: 4,
};

/** `value / total` as a percentage, one decimal — puts an HTML label on the exact spot the SVG
 *  geometry it annotates was drawn at, as a fraction of the SAME box, so it tracks the stretch. */
function pct(value: number, total: number): number {
  return total === 0 ? 0 : Math.round((value / total) * 1000) / 10;
}

export function SwissAgePyramidWeb({
  bands,
  title,
  limits,
  source,
  alt,
  ground,
  accent,
  peakBand,
  peakLabel,
  ink,
  muted,
  grid,
  measure,
  frame,
}: {
  bands: Band[];
  title: string;
  limits: string;
  source: string;
  alt: string;
  ground: string;
  /** Nominal only — this beat carries no single semantic accent (the two sexes' own fixed hues
   *  carry the highlight), but `renderWeb`'s shared CSS shell always emits a `--accent` custom
   *  property, so a real, defined colour is supplied rather than leaving it `undefined`. Unused by
   *  any rule this beat's own CSS or markup writes. */
  accent: string;
  peakBand: string;
  peakLabel: string;
  ink: string;
  muted: string;
  grid: string;
  measure: Measure;
  frame: WebFrame;
}) {
  if (bands.length < 3)
    throw new Error(
      `a population pyramid beat needs at least three age bands, got ${bands.length}`,
    );

  // The central gutter, MEASURED from the widest age-band label that will actually be drawn in it,
  // at that label's own fixed font size, plus this frame's padding either side.
  const bandGutterPx =
    Math.max(...bands.map((b) => measure(b.ageBand, frame.bandLabel))) +
    frame.bandLabelPad * 2;

  // ONE geometry pass over the whole mirrored width, with a zero-width central gutter: the gutter
  // is a CSS track now, so it must not occupy user units. `centerX` therefore lands exactly on
  // `HALF`, which is the boundary between the two `<svg>`s.
  const { plot, centerX, bars, ticksLeft, ticksRight } = pyramidGeometry(
    bands,
    {
      width: HALF * 2,
      height: frame.height,
      padding: { top: 0, right: 0, bottom: 0, left: 0 },
      bandGutter: 0,
      xTickHint: frame.xTickHint,
    },
  );

  const peak = bars.find((b) => b.ageBand === peakBand);
  // Visual top-to-bottom order (oldest band at the top, per `pyramidGeometry`'s reversed domain) —
  // DOM/tab order for the hit rows follows this same order, so `ArrowUp`/`ArrowDown` in
  // `pyramid-interaction.mjs` moves focus the way a sighted reader expects.
  const rowsTopToBottom = [...bars].sort((a, b) => a.y - b.y);

  const totalWidth = HALF * 2 + bandGutterPx;
  const totalHeight = frame.height + frame.xAxisRowPx;

  return (
    <figure
      className="chart-figure"
      style={{
        ["--ground" as string]: ground,
        ["--accent" as string]: accent,
        ["--ink" as string]: ink,
        ["--muted" as string]: muted,
        ["--male" as string]: COLOURS.male,
        ["--female" as string]: COLOURS.female,
        // Fixed CSS pixel type sizes, threaded as custom properties. None of these ever changes
        // with a viewBox's width — that is the whole point of the redesign.
        ["--title-size" as string]: `${frame.title.fontSize}px`,
        ["--title-weight" as string]: frame.title.fontWeight,
        ["--subtitle-size" as string]: `${frame.subtitle.fontSize}px`,
        ["--source-size" as string]: `${frame.source.fontSize}px`,
        ["--axis-size" as string]: `${frame.axis.fontSize}px`,
        ["--label-size" as string]: `${frame.note.fontSize}px`,
        ["--label-weight" as string]: frame.note.fontWeight,
        ["--note-size" as string]: `${frame.note.fontSize}px`,
        ["--band-size" as string]: `${frame.bandLabel.fontSize}px`,
        ["--legend-size" as string]: `${frame.legend.fontSize}px`,
        ["--legend-weight" as string]: frame.legend.fontWeight,
      }}
    >
      <div className="chart-header">
        <h2 className="chart-title">{title}</h2>
        <p className="chart-caveat">{limits}</p>
      </div>

      {/* Load-bearing legend: the two hues are the only thing naming which side is which. Plain
          HTML, outside any overlay and NOT `aria-hidden`, because nothing else states it. */}
      <div className="chart-legend">
        <span className="legend-key">
          <span
            className="legend-swatch"
            style={{ background: COLOURS.male }}
          />
          Men
        </span>
        <span className="legend-key">
          <span
            className="legend-swatch"
            style={{ background: COLOURS.female }}
          />
          Women
        </span>
      </div>

      <div
        className="chart-plot pyramid"
        style={{
          ["--band-gutter" as string]: `${bandGutterPx}px`,
          ["--x-axis-h" as string]: `${frame.xAxisRowPx}px`,
          aspectRatio: `${totalWidth} / ${totalHeight}`,
          minHeight: `${bands.length * MIN_ROW_PX}px`,
        }}
      >
        <p className="visually-hidden">{alt}</p>

        {/* LEFT HALF — men. Geometry only, no `<text>`. Its own `viewBox` is the left half of the
            shared scale, so `male_.x` needs no shifting. */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="half left"
          viewBox={`0 0 ${HALF} ${frame.height}`}
          preserveAspectRatio="none"
        >
          <rect x={0} y={0} width={HALF} height={frame.height} fill={ground} />
          {ticksLeft.map((t) => (
            <line
              key={`l-${t.value}`}
              x1={t.x}
              x2={t.x}
              y1={plot.top}
              y2={plot.bottom}
              stroke={grid}
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
            />
          ))}
          {bars.map((b) => (
            <rect
              key={b.ageBand}
              x={b.male_.x}
              y={b.y}
              width={b.male_.width}
              height={b.height}
              fill={COLOURS.male}
            />
          ))}
          {/* The centre rule — drawn on the left half's own right edge, where the label gutter
              begins. */}
          <line
            x1={HALF}
            x2={HALF}
            y1={plot.top}
            y2={plot.bottom}
            stroke={muted}
            strokeWidth={1}
            vectorEffect="non-scaling-stroke"
          />
          {/* The peak annotation's own leader — an L, not a straight rule, and the bend is the
              whole point. The widest band is BY DEFINITION the bar with the least empty space
              beside it: at 1024px there were 60px between the frame edge and its own bar and the
              label needs 95px, and at 375px there were 6px. A label parked on that row therefore
              printed its ground chip straight through the bar above it — a white hole punched in
              the 60-64 men's bar, visible in the render at every width. So the label sits in the
              plot's top-left corner instead, where the oldest bands' bars are a percent of the
              half-width and nothing is ever drawn, and the leader runs down from it and then right
              into the peak bar. Unconditional — it is the argument, not a reveal
              (`web-discipline.md`, "What must not become interactive"). The LABEL itself is HTML,
              in the overlay below. */}
          {peak && (
            <path
              d={`M ${LEADER_X} 0 L ${LEADER_X} ${peak.centerLabelY} L ${peak.male_.x} ${peak.centerLabelY}`}
              fill="none"
              stroke={ink}
              strokeWidth={1}
              strokeDasharray="3 3"
              vectorEffect="non-scaling-stroke"
            />
          )}
        </svg>

        {/* The peak annotation's label — HTML at a fixed size, over the left half's own cell. */}
        <div className="overlay left" aria-hidden="true">
          {peak && (
            <span
              className="note peak-label"
              style={{ left: "0%", top: "0%", color: ink }}
            >
              {peakLabel}
            </span>
          )}
        </div>

        {/* The reserved central gutter: one age-band label per row, centred, at a FIXED pixel size
            that never tracks either half's stretch. Never printed over a bar — that is what the
            track is for. */}
        <div className="band-labels">
          {bars.map((b) => (
            <span
              key={b.ageBand}
              className="band-label"
              style={{ top: `${pct(b.centerLabelY, frame.height)}%` }}
            >
              {b.ageBand}
            </span>
          ))}
        </div>

        {/* RIGHT HALF — women. Same shared scale, coordinates shifted back into its own `viewBox`
            by `HALF`; never a second scale. */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="half right"
          viewBox={`0 0 ${HALF} ${frame.height}`}
          preserveAspectRatio="none"
        >
          <rect x={0} y={0} width={HALF} height={frame.height} fill={ground} />
          {ticksRight.map((t) => (
            <line
              key={`r-${t.value}`}
              x1={t.x - centerX}
              x2={t.x - centerX}
              y1={plot.top}
              y2={plot.bottom}
              stroke={grid}
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
            />
          ))}
          {bars.map((b) => (
            <rect
              key={b.ageBand}
              x={b.female_.x - centerX}
              y={b.y}
              width={b.female_.width}
              height={b.height}
              fill={COLOURS.female}
            />
          ))}
          <line
            x1={0}
            x2={0}
            y1={plot.top}
            y2={plot.bottom}
            stroke={muted}
            strokeWidth={1}
            vectorEffect="non-scaling-stroke"
          />
        </svg>

        {/* Tick labels on BOTH magnitude axes read as positive numbers — the left side is a group,
            not a negative quantity (`references/types/population-pyramid.md`). Both print the
            rounded thousands the static frame states unconditionally; each band's exact figure
            lives only in its own `data-detail`, on demand. */}
        <div className="x-axis left">
          {ticksLeft.map((t) => (
            <span
              key={`lx-${t.value}`}
              className="axis-label x"
              style={{ left: `${pct(t.x, HALF)}%` }}
            >
              {thousands(t.value)}
            </span>
          ))}
        </div>
        <div className="x-axis right">
          {ticksRight.map((t) => (
            <span
              key={`rx-${t.value}`}
              className="axis-label x"
              style={{ left: `${pct(t.x - centerX, HALF)}%` }}
            >
              {thousands(t.value)}
            </span>
          ))}
        </div>

        {/* Interaction layer — one hit row per AGE BAND (not per side), spanning both halves AND
            the label gutter between them, which is why these are HTML and not SVG rects: no rect
            can span two `<svg>` elements. Each row covers that band's own full slot
            (`hitY`/`hitHeight`, edge-to-edge with its neighbours, see `pyramid-geometry.ts`), is
            `tabIndex={0}`, and carries its own `aria-label`/`data-detail` baked in at build time —
            reachable by plain Tab with `pyramid-interaction.mjs` absent entirely. `data-detail`
            states BOTH sexes' EXACT figures for that band, the reading the static frame has no room
            to print for any of its 42 numbers. */}
        <div className="hit-rows">
          {rowsTopToBottom.map((b) => {
            const isPeak = b.ageBand === peakBand;
            const men = exactCount(b.male);
            const women = exactCount(b.female);
            const detail = `${b.ageBand}${isPeak ? " (widest band)" : ""}: men ${men} · women ${women}`;
            const ariaLabel = `Age ${b.ageBand}${isPeak ? ", the widest band" : ""}: ${men} men, ${women} women`;
            return (
              <div
                key={b.ageBand}
                className="row-hit"
                style={{
                  top: `${pct(b.hitY, frame.height)}%`,
                  height: `${pct(b.hitHeight, frame.height)}%`,
                }}
                tabIndex={0}
                role="img"
                aria-label={ariaLabel}
                data-band={b.ageBand}
                data-detail={detail}
              />
            );
          })}
        </div>
      </div>

      <p className="chart-source">{source}</p>
    </figure>
  );
}
