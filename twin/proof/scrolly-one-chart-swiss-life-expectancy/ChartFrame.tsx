/**
 * THE ONE CHART. Not one of four — the only picture this beat has, SSR'd once in its first state
 * and then driven by the reader's scroll through the other three.
 *
 * Three rules it keeps, inherited from `twin-scrolly/references/scrolly-discipline.md`:
 *
 *   1. **Fitted, never cropped.** A chart is evidence. The frame is an HTML box laid out in
 *      fractions of whatever box the graphic gives it; the SVG inside carries GEOMETRY ONLY and
 *      stretches (`preserveAspectRatio="none"`). An axis label cropped is not a cosmetic loss.
 *   2. **Geometry stretches; type does not.** Every word is HTML at a fixed pixel size positioned
 *      in fractions over the same box, so a 14px tick is 14px at 375px and at 1600px.
 *   3. **The drawing sits above `CONTENT_TOP`** — plot, ticks and annotations — a band this frame
 *      keeps clear at its own bottom. The CREDIT does not: it is anchored to the frame's own floor,
 *      inside that band, because since the vehicle's eighth correction nothing else goes there and
 *      a credit hovering above an empty band ran through the x-axis labels at 375x812.
 *
 * The credit sits at the BOTTOM of the visual (owner feedback B1.1: the credit belongs at the bottom
 * of the visual, never hanging under the header). Nothing is below it.
 *
 * No colour is named here. `ground`, `ink`, `muted` and `accent` are props, derived in node by
 * `render.mjs` from the answer recorded in `PALETTE.md` beside this beat.
 */

import type { CSSProperties } from "react";
import {
  PLOT,
  VIEWBOX,
  X_SLOTS,
  Y_SLOTS,
  annotationPlacement,
  chartGeometry,
  pct,
  toFrame,
} from "./chart-drive.mjs";
import type { Reading } from "./life-data.ts";

const FONT = "Helvetica, Arial, sans-serif";

export type ChartMark = { year: number; label: string };

export type ChartFrameProps = {
  readings: Reading[];
  /** The FIRST state — the one a reader with no JavaScript keeps for the whole beat. */
  state: Record<string, number>;
  marks: ChartMark[];
  bandLabel: string;
  unit: string;
  credit: string;
  ground: string;
  ink: string;
  muted: string;
  accent: string;
};

const tickStyle = (colour: string): CSSProperties => ({
  position: "absolute",
  fontFamily: FONT,
  fontSize: "14px",
  color: colour,
  whiteSpace: "nowrap",
});

export function ChartFrame({
  readings,
  state,
  marks,
  bandLabel,
  unit,
  credit,
  ground,
  ink,
  muted,
  accent,
}: ChartFrameProps) {
  const geometry = chartGeometry(readings, state, marks);
  const plotLeft = pct(PLOT.left);
  const plotTop = pct(PLOT.top);
  const plotWidth = pct(PLOT.right - PLOT.left);
  const plotHeight = pct(PLOT.bottom - PLOT.top);

  return (
    <div
      data-visual="one-chart"
      style={{
        position: "absolute",
        inset: 0,
        background: ground,
        overflow: "hidden",
      }}
    >
      {/* The unit, once, at the top of the y axis — never repeated on every tick. */}
      <div
        style={{
          ...tickStyle(muted),
          left: pct(0.02),
          top: pct(PLOT.top - 0.06),
        }}
      >
        {unit}
      </div>

      {/* The plot: geometry only, stretched. */}
      <div
        style={{
          position: "absolute",
          left: plotLeft,
          top: plotTop,
          width: plotWidth,
          height: plotHeight,
        }}
      >
        <svg
          viewBox={`0 0 ${VIEWBOX.width} ${VIEWBOX.height}`}
          preserveAspectRatio="none"
          style={{
            display: "block",
            width: "100%",
            height: "100%",
            overflow: "hidden",
          }}
        >
          <defs>
            <clipPath id="one-chart-plot">
              <rect x="0" y="0" width={VIEWBOX.width} height={VIEWBOX.height} />
            </clipPath>
          </defs>
          <g clipPath="url(#one-chart-plot)">
            <rect
              data-part="band"
              x={geometry.band.x}
              y="0"
              width={geometry.band.width}
              height={VIEWBOX.height}
              fill={accent}
              opacity={geometry.band.opacity}
              style={{ opacity: geometry.band.opacity }}
            />
            {geometry.yTicks.map((tick, i) => (
              <line
                key={`grid-${i}`}
                data-ygrid={i}
                x1="0"
                x2={VIEWBOX.width}
                y1={(1 - tick.at) * VIEWBOX.height}
                y2={(1 - tick.at) * VIEWBOX.height}
                stroke={muted}
                strokeWidth="1"
                vectorEffect="non-scaling-stroke"
                style={{ opacity: tick.visible * 0.28 }}
              />
            ))}
            <polyline
              data-part="base"
              points={geometry.base}
              fill="none"
              stroke={muted}
              strokeWidth="2.5"
              strokeLinejoin="round"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
            <polyline
              data-part="highlight"
              points={geometry.highlight}
              fill="none"
              stroke={accent}
              strokeWidth="4"
              strokeLinejoin="round"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
              style={{ opacity: geometry.hiOpacity }}
            />
          </g>
        </svg>
      </div>

      {/* The y ticks: fixed slots, rewritten in place, never added or removed. */}
      {geometry.yTicks.map((tick, i) => {
        const [, fy] = toFrame(0, (1 - tick.at) * VIEWBOX.height);
        return (
          <div
            key={`y-${i}`}
            data-ytick={i}
            style={{
              ...tickStyle(muted),
              left: pct(0.02),
              top: pct(fy),
              transform: "translateY(-50%)",
              opacity: tick.visible,
            }}
          >
            {tick.label}
          </div>
        );
      })}
      {Array.from({
        length: Math.max(0, Y_SLOTS - geometry.yTicks.length),
      }).map((_, i) => (
        <div
          key={`y-pad-${i}`}
          data-ytick={geometry.yTicks.length + i}
          style={{ ...tickStyle(muted), opacity: 0 }}
        />
      ))}

      {/* The x ticks, on the strip under the plot — still above CONTENT_TOP. */}
      {geometry.xTicks.map((tick, i) => {
        const [fx] = toFrame(tick.at * VIEWBOX.width, 0);
        return (
          <div
            key={`x-${i}`}
            data-xtick={i}
            style={{
              ...tickStyle(muted),
              left: pct(fx),
              top: pct(PLOT.bottom + 0.018),
              transform: "translateX(-50%)",
              opacity: tick.visible,
            }}
          >
            {tick.label}
          </div>
        );
      })}
      {Array.from({
        length: Math.max(0, X_SLOTS - geometry.xTicks.length),
      }).map((_, i) => (
        <div
          key={`x-pad-${i}`}
          data-xtick={geometry.xTicks.length + i}
          style={{ ...tickStyle(muted), opacity: 0 }}
        />
      ))}

      {/* The band's own label, above the plot, moving with the band. */}
      <div
        data-part="band-label"
        style={{
          ...tickStyle(ink),
          fontSize: "15px",
          left: pct(toFrame(geometry.band.x + geometry.band.width / 2, 0)[0]),
          top: pct(PLOT.top - 0.032),
          transform: "translateX(-50%)",
          opacity: geometry.band.labelOpacity,
        }}
      >
        {bandLabel}
      </div>

      {/* The marked points. HTML, never SVG circles: the plot stretches, so a circle inside it is
          an ellipse at every viewport but one — measured at 1600x900 as a 14x2px dash. */}
      {geometry.marks.map((mark, i) => {
        const [dx, dy] = toFrame(mark.x, mark.y);
        return (
          <div
            key={`dot-${i}`}
            data-mark={i}
            style={{
              position: "absolute",
              left: pct(dx),
              top: pct(dy),
              width: "11px",
              height: "11px",
              marginLeft: "-5.5px",
              marginTop: "-5.5px",
              borderRadius: "50%",
              background: accent,
              boxShadow: `0 0 0 2px ${ground}`,
              opacity: mark.opacity,
            }}
          />
        );
      })}

      {/* The two annotations. Each is pinned to its own mark and shares its opacity. */}
      {geometry.marks.map((mark, i) => {
        const place = annotationPlacement(mark.x, mark.y);
        return (
          <div
            key={`anno-${i}`}
            data-annotation={i}
            style={{
              ...tickStyle(ink),
              fontSize: "15px",
              fontWeight: 600,
              background: ground,
              padding: "1px 6px",
              borderRadius: "2px",
              left: place.left,
              top: place.top,
              transform: place.transform,
              opacity: mark.opacity,
            }}
          >
            {mark.label}
          </div>
        );
      })}

      {/* THE CREDIT, at the bottom of the visual — above the prose lane, below everything drawn. */}
      <div
        data-part="credit"
        style={{
          ...tickStyle(muted),
          fontSize: "12px",
          left: pct(0.02),
          right: pct(0.02),
          // Anchored from the BOTTOM, not the top: a `top` percentage is a fraction of a frame whose
          // height changes with the fixed header's own wrap at every width, so a credit that cleared
          // the lane at one width sat inside it at another. From the bottom a second line grows
          // upward, away from whatever is below.
          //
          // FROM THE FRAME'S OWN BOTTOM, not from the top of the prose lane — and that changed when
          // the vehicle's eighth correction gave the prose its own cell of the track. Nothing goes
          // in the lane any more, so a credit hovering above it is a credit floating in the middle
          // of a white band; worse, at 375x812 the graphic is only 361px tall, the lane takes 130 of
          // them, and a two-line credit pushed up out of the lane ran straight THROUGH the x-axis
          // tick labels — 1880, 1900, 1920 and the rest, measured on the delivered file. At the
          // floor it is where this beat's own doc-comment always said it belonged, at every width.
          bottom: "8px",
          whiteSpace: "normal",
        }}
      >
        {credit}
      </div>
    </div>
  );
}
