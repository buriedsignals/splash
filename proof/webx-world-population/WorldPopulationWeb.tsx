/**
 * The web beat of "World population passed 8 billion in 2022" — the interactive genre.
 *
 * SECOND BUILD, migrated to the genre's FLUID FRAME (`chart-web/assets/ChartWebSeed.tsx`,
 * `references/web-discipline.md` "Responsive behaviour"). Its first build SSR'd two pre-rendered
 * rungs (900px and 360px) swapped by a media query; the owner overturned that in favour of one
 * continuously-adaptive frame, and `renderWeb` no longer accepts a `layouts` array. The split that
 * makes a continuous fill safe: the `<svg>` below draws GEOMETRY ONLY — not one `<text>` element —
 * and every word (title, caveat, source, axis labels, the crossing and end labels) is plain HTML
 * positioned by `%` over the same grid cell at a FIXED pixel `font-size`. Geometry stretches; type
 * does not.
 *
 * Written for a DIFFERENT mark family from the seed's line: a filled area, zero-anchored
 * (`references/types/area.md`'s own non-negotiable — the fill's AREA is what a reader measures, so
 * unlike a line the value axis always includes zero). Not imported from the static sibling
 * `proof/static-world-population/WorldPopulationArea.tsx`, which bakes its words into SVG `<text>`
 * and reaches for `#shared/chart-beat/render-still.mjs` directly.
 *
 * What hover/tap/keyboard-focus adds: the frame prints the axis in billions to one decimal, plus
 * the crossing and end labels. None of the 224 individual annual readings between 1800 and 2023 has
 * an exact printed value — hover, tap or keyboard focus on any point answers the exact population
 * for that year, to the nearest person as OWID reports it, not the billion-scale rounding the axis
 * and end label use.
 */

import {
  ENTRANCE_EASING,
  LABEL_FADE_MS,
  WEB_ENTRANCE,
  atProgress,
  endOf,
  entranceClipId,
  entranceLayer,
} from "../../skills/chart-web/assets/entrance.ts";
import {
  chartGeometry,
  xTickValues,
  billions,
  formatInteger,
  type Reading,
} from "./population-geometry";

type Measure = (
  text: string,
  font: { fontSize: number; fontWeight?: number },
) => number;

/** Declared here, not imported from the skill's seed — same "duplicate, do not link" reasoning
 *  `ChartWebSeed.tsx`'s own doc-comment gives: a compile-time-only type has no `#shared/*`
 *  vendoring path a story could import it from. */
export type WebFrame = {
  /** The plot rectangle's own canonical proportions, in SVG user units. NOT a rendered pixel size
   *  and NOT a cap: the `<svg>` is stretched (`preserveAspectRatio="none"`) to fill whatever box
   *  the grid gives it. This pair fixes the shape that box grows along, and nothing else. */
  width: number;
  height: number;
  /** Fixed CSS pixel row below the plot for the x-axis year labels — a grid track, not part of the
   *  `viewBox`, so its type never scales with it. */
  xAxisRowPx: number;
  title: { fontSize: number; fontWeight: number };
  subtitle: { fontSize: number; fontWeight: number };
  source: { fontSize: number; fontWeight: number };
  axis: { fontSize: number };
  label: { fontSize: number; fontWeight: number };
  note: { fontSize: number };
  yTickHint: number;
  xTickHint: number;
};

/** This beat's own frame. Squarer than the seed's 820x380: the plot's height follows its width
 *  through `aspect-ratio`, so a flatter canonical box buys a taller chart at 1600px and a strip at
 *  375px. Measured at 375px — a 293px-wide plot — this ratio draws 165px of plot where the seed's
 *  own would draw 133px. */
export const FRAME: WebFrame = {
  width: 760,
  height: 400,
  xAxisRowPx: 26,
  title: { fontSize: 24, fontWeight: 700 },
  subtitle: { fontSize: 14, fontWeight: 400 },
  source: { fontSize: 13, fontWeight: 400 },
  axis: { fontSize: 12 },
  label: { fontSize: 14, fontWeight: 600 },
  note: { fontSize: 12 },
  yTickHint: 5,
  xTickHint: 6,
};

/** Enough canonical units to clear the largest circle this frame draws (`.pt`'s r=5) so the last
 *  reading's own mark is never half-clipped against the `viewBox` edge. Only the x-axis is inset:
 *  the area's own baseline must sit exactly on the bottom of the box, because a fill floating a few
 *  units above its own zero is a lie about the encoding this type depends on. */
const POINT_INSET = 6;

function pct(value: number, total: number): number {
  return total === 0 ? 0 : Math.round((value / total) * 1000) / 10;
}

/** Which way a label positioned at fraction `f` of the frame's width must hang so it stays inside
 *  the frame. Fluid-safe by construction: a clamp computed in canonical units would be right at one
 *  container width and wrong at every other — which is exactly what the two-rung design hid. The
 *  1805 crossing sits five years into a 224-year span, so this label hangs right from its own point
 *  rather than centring off the left edge. */
function anchorAt(f: number): string {
  if (f < 0.15) return "translateX(0)";
  if (f > 0.85) return "translateX(-100%)";
  return "translateX(-50%)";
}

export function WorldPopulationWeb({
  data,
  title,
  limits,
  source,
  alt,
  ground,
  accent,
  crossing,
  ink,
  muted,
  grid,
  measure,
  frame,
}: {
  data: Reading[];
  title: string;
  limits: string;
  source: string;
  alt: string;
  ground: string;
  accent: string;
  /** The year population first crossed 1 billion, found by the runner from the data, not typed from
   *  memory — a muted marker, silent about its own value. */
  crossing: { year: number; label: string };
  /** Derived from `ground` by `deriveFurniture` in the node runner that calls this component. */
  ink: string;
  muted: string;
  grid: string;
  measure: Measure;
  frame: WebFrame;
}) {
  if (data.length < 2)
    throw new Error(
      `an area beat needs at least two readings, got ${data.length}`,
    );

  const last = data[data.length - 1];
  const endLabel = `${last.year} · ${billions(last.population)} billion`;

  const { points, areaPath, linePath, y } = chartGeometry(data, {
    width: frame.width,
    height: frame.height,
    padding: { top: POINT_INSET, right: POINT_INSET, bottom: 0, left: 0 },
  });

  const tickValues = y.ticks(frame.yTickHint);
  const topValue = Math.max(...tickValues);
  const tickLabels = tickValues.map((v) =>
    v === topValue ? `${billions(v)} B` : billions(v),
  );
  const yGutterPx =
    10 + Math.max(...tickLabels.map((l) => measure(l, frame.axis)));

  const crossingPoint = points.find((p) => p.year === crossing.year);
  const end = points[points.length - 1];
  const xTicks = xTickValues(
    data.map((d) => d.year),
    frame.xTickHint,
  );

  // ── THE ENTRANCE. The five events of `chart-web/assets/entrance.ts`, in the video's own order.
  //
  // WHAT THIS BEAT DECIDED, and one of the calls is not the obvious one.
  //
  //   - THE REFERENCE IS THE ZERO BASELINE. This beat has no dashed rule to borrow — its sibling
  //     line beats measure a claim against a past level, and this one does not. But an area is a
  //     STOCK accumulated above zero (`references/types/area.md`: the fill IS the claim), so the
  //     baseline is not decoration here, it is the level every reading is measured from, and this
  //     component already draws it differently from the other gridlines (`muted`, not `grid`). It
  //     is laid down alone, left to right, before the fill grows off it. Leaving `reference` empty
  //     and folding the baseline into the furniture would have been the lazy reading, and it would
  //     have made the entrance a four-event one with a gap where its argument's floor belongs.
  //   - THE SUBJECT is the 2023 reading, the top of that accumulation, and the conclusion is its
  //     own value in words. The headline claim is "passed 8 billion in 2022"; 2023 is where the
  //     series and the printed value stand.
  //   - THE 1805 CROSSING MARKER is a note on a READING, so its delay is DERIVED — the wipe's head
  //     reaching that reading's own x, plus the video's own 0.06-of-the-reveal lag. 1805 is five
  //     years into a 224-year series, so it arrives almost as soon as the reveal starts, which is
  //     the correct answer and not a mistimed one: the head really does pass it there.
  //
  // The reveal is linear because the x axis IS time, and the fill and the stroke are uncovered by
  // the SAME clip, so the area never leads or trails its own outline.
  const revealHeadAt = (atX: number) =>
    atProgress(WEB_ENTRANCE.reveal, atX / frame.width);
  const furnitureLayer = () =>
    entranceLayer("establish", "fade", {
      delay: WEB_ENTRANCE.establish.start,
      duration: WEB_ENTRANCE.establish.duration,
      ease: ENTRANCE_EASING.ARRIVE,
    });
  const baselineLayer = entranceLayer("reference", "wipe", {
    delay: WEB_ENTRANCE.reference.start,
    duration: WEB_ENTRANCE.reference.duration,
    ease: ENTRANCE_EASING.ARRIVE,
  });
  const revealLayer = entranceLayer("reveal", "wipe", {
    delay: WEB_ENTRANCE.reveal.start,
    duration: WEB_ENTRANCE.reveal.duration,
    ease: ENTRANCE_EASING.LINEAR,
  });
  const crossingMarkLayer = crossingPoint
    ? entranceLayer("reveal", "fade", {
        delay: revealHeadAt(crossingPoint.x),
        duration: LABEL_FADE_MS,
        ease: ENTRANCE_EASING.ARRIVE,
      })
    : null;
  const crossingLabelLayer = crossingPoint
    ? entranceLayer("reveal", "fade", {
        delay:
          revealHeadAt(crossingPoint.x) + 0.06 * WEB_ENTRANCE.reveal.duration,
        duration: LABEL_FADE_MS,
        ease: ENTRANCE_EASING.ARRIVE,
      })
    : null;
  const subjectLayer = entranceLayer("subject", "land", {
    delay: WEB_ENTRANCE.subject.start,
    duration: WEB_ENTRANCE.subject.duration,
    ease: ENTRANCE_EASING.ARRIVE,
  });
  const conclusionLayer = entranceLayer("conclusion", "fade", {
    delay: WEB_ENTRANCE.conclusion.start,
    duration: WEB_ENTRANCE.conclusion.duration,
    ease: ENTRANCE_EASING.ARRIVE,
  });
  // Unique per beat: two of these files can land in one article and `url(#id)` takes the FIRST
  // match in document order, so a shared id would make one figure's entrance drive the other's clip.
  const revealClipId = entranceClipId(title);
  const lastDerivedEnd = crossingLabelLayer
    ? revealHeadAt(crossingPoint!.x) +
      0.06 * WEB_ENTRANCE.reveal.duration +
      LABEL_FADE_MS
    : 0;
  if (lastDerivedEnd > endOf(WEB_ENTRANCE.conclusion))
    throw new Error(
      `the crossing label's derived arrival ends at ${Math.round(lastDerivedEnd)}ms, after the ` +
        `conclusion at ${endOf(WEB_ENTRANCE.conclusion)}ms — a note would appear after the ` +
        `sentence that closes the argument`,
    );

  return (
    <figure
      className="chart-figure"
      style={{
        ["--ground" as string]: ground,
        ["--accent" as string]: accent,
        ["--ink" as string]: ink,
        ["--muted" as string]: muted,
        ["--title-size" as string]: `${frame.title.fontSize}px`,
        ["--title-weight" as string]: frame.title.fontWeight,
        ["--subtitle-size" as string]: `${frame.subtitle.fontSize}px`,
        ["--source-size" as string]: `${frame.source.fontSize}px`,
        ["--axis-size" as string]: `${frame.axis.fontSize}px`,
        ["--label-size" as string]: `${frame.label.fontSize}px`,
        ["--label-weight" as string]: frame.label.fontWeight,
        ["--note-size" as string]: `${frame.note.fontSize}px`,
      }}
    >
      <div
        className="chart-header"
        {...furnitureLayer().attrs}
        style={furnitureLayer().vars}
      >
        <h2 className="chart-title">{title}</h2>
        <p className="chart-caveat">{limits}</p>
      </div>

      <div
        className="chart-plot"
        style={{
          ["--y-gutter" as string]: `${yGutterPx}px`,
          ["--x-axis-h" as string]: `${frame.xAxisRowPx}px`,
          aspectRatio: `${yGutterPx + frame.width} / ${frame.height + frame.xAxisRowPx}`,
        }}
      >
        <div
          className="y-axis"
          {...furnitureLayer().attrs}
          style={furnitureLayer().vars}
        >
          {tickValues.map((value, i) => (
            <span
              key={value}
              className="axis-label y"
              style={{ top: `${pct(y(value), frame.height)}%`, color: muted }}
            >
              {tickLabels[i]}
            </span>
          ))}
        </div>

        {/* GEOMETRY ONLY — no `<text>`. */}
        <svg
          // Named `group`, not `img` — see the note in `SlopeWeb.tsx`: the root used to come back
          // from Chrome's AX tree as `SvgRoot` with `name: ""`, and `group` names it without
          // raising the ARIA children-presentational question `img` raises.
          role="group"
          aria-label={title}
          xmlns="http://www.w3.org/2000/svg"
          className="chart"
          viewBox={`0 0 ${frame.width} ${frame.height}`}
          preserveAspectRatio="none"
          fontFamily="Helvetica, Arial, sans-serif"
        >
          <desc>{alt}</desc>
          <rect
            x={0}
            y={0}
            width={frame.width}
            height={frame.height}
            fill={ground}
          />

          {/* The regular gridlines are FURNITURE and arrive with the axis labels beside them, on ONE
              clock. THE ZERO LINE IS NOT AMONG THEM — see the entrance's own note above: it is the
              level this stock is measured from, so it is the reference and it is drawn below. */}
          <g {...furnitureLayer().attrs} style={furnitureLayer().vars}>
            {tickValues.map((value) =>
              value === 0 ? null : (
                <line
                  key={value}
                  x1={0}
                  x2={frame.width}
                  y1={y(value)}
                  y2={y(value)}
                  stroke={grid}
                  strokeWidth={1}
                  vectorEffect="non-scaling-stroke"
                />
              ),
            )}
          </g>

          {/* THE REFERENCE — the baseline, laid down left to right before any evidence, `scaleX`
              from its own `x1` of 0. */}
          {tickValues.includes(0) && (
            <line
              {...baselineLayer.attrs}
              style={baselineLayer.vars}
              x1={0}
              x2={frame.width}
              y1={y(0)}
              y2={y(0)}
              stroke={muted}
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
            />
          )}

          {/* THE REVEAL. The fill IS the claim — a stock accumulated over time, read as an area
              (`references/types/area.md`) — and it is uncovered left to right by a clip whose rect
              grows from x=0, the same picture frame for frame as the video's `drawnSoFar`. The fill
              and the stroke share ONE clip, so the area never leads or trails its own outline.
              ONLY THE VISIBLE MARKS ARE CLIPPED: the `.pt` targets and the `.hit-area` below stay
              outside it, so hover, tap and keyboard answer for all 224 readings from the first
              millisecond. */}
          <defs>
            <clipPath id={revealClipId}>
              <rect
                {...revealLayer.attrs}
                style={revealLayer.vars}
                x={0}
                y={0}
                width={frame.width}
                height={frame.height}
              />
            </clipPath>
          </defs>
          <g clipPath={`url(#${revealClipId})`}>
            <path d={areaPath} fill={accent} fillOpacity={0.18} />
            <path
              d={linePath}
              fill="none"
              stroke={accent}
              strokeWidth={2.5}
              strokeLinejoin="round"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
          </g>

          {/* The crossing MARK sits OUTSIDE the reveal's clip and fades in at the instant the head
              passes its own x — a circle uncovered by a vertical wipe would arrive as two
              half-moons, which is a head's look on a stroke and nothing's look on a dot. */}
          {crossingPoint && crossingMarkLayer && (
            <circle
              {...crossingMarkLayer.attrs}
              style={crossingMarkLayer.vars}
              cx={crossingPoint.x}
              cy={crossingPoint.y}
              r={3}
              fill={muted}
            />
          )}
          {/* THE SUBJECT, landing as its own event once the fill has reached it. Drawn at (0, 0)
              inside a `<g>` carrying the translate, so `transform: scale()` grows it about its own
              centre with no `transform-origin` percentage and no `transform-box` question. */}
          <g transform={`translate(${end.x} ${end.y})`}>
            <circle
              {...subjectLayer.attrs}
              style={subjectLayer.vars}
              cx={0}
              cy={0}
              r={4}
              fill={accent}
            />
          </g>

          {/* Interaction layer: every one of the 224 annual readings is `tabIndex={0}` with its own
              `aria-label`/`data-detail` baked in at build time — reachable with the script absent
              entirely. `assets/interaction.mjs` (unmodified) wires hover/tap/keyboard via
              nearest-x resolution over the shared `.hit-area`. */}
          {points.map((p) => (
            <circle
              key={p.year}
              className="pt"
              cx={p.x}
              cy={p.y}
              r={5}
              fill="transparent"
              stroke="none"
              tabIndex={0}
              role="img"
              aria-label={`${p.year}: ${formatInteger(p.population)} people`}
              data-year={p.year}
              data-detail={`${p.year} · ${formatInteger(p.population)}`}
            />
          ))}
          <rect
            className="hit-area"
            x={0}
            y={0}
            width={frame.width}
            height={frame.height}
            fill="transparent"
            pointerEvents="all"
          />
        </svg>

        {/* HTML overlay — the same grid cell as the `<svg>`. Never toggled by the script: the
            crossing marker's label and the end label are the argument, already stated. */}
        <div className="overlay" aria-hidden="true">
          {crossingPoint && crossingLabelLayer && (
            <span
              {...crossingLabelLayer.attrs}
              className="note"
              style={{
                ...crossingLabelLayer.vars,
                left: `${pct(crossingPoint.x, frame.width)}%`,
                top: `${pct(crossingPoint.y, frame.height)}%`,
                transform: `${anchorAt(crossingPoint.x / frame.width)} translateY(-100%) translateY(-10px)`,
                color: muted,
              }}
            >
              {crossing.label}
            </span>
          )}
          <span
            {...conclusionLayer.attrs}
            className="end-label"
            style={{
              ...conclusionLayer.vars,
              left: `${pct(end.x, frame.width)}%`,
              top: `${pct(end.y, frame.height)}%`,
              color: accent,
            }}
          >
            {endLabel}
          </span>
        </div>

        <div
          className="x-axis"
          {...furnitureLayer().attrs}
          style={furnitureLayer().vars}
        >
          {xTicks.map((year) => {
            const p = points.find((pt) => pt.year === year);
            if (!p) return null;
            return (
              <span
                key={year}
                className="axis-label x"
                style={{ left: `${pct(p.x, frame.width)}%`, color: muted }}
              >
                {year}
              </span>
            );
          })}
        </div>
      </div>

      <p
        className="chart-source"
        {...furnitureLayer().attrs}
        style={furnitureLayer().vars}
      >
        {source}
      </p>
    </figure>
  );
}
