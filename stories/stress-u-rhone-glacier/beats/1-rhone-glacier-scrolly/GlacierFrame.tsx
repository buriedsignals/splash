/**
 * THE ONE PICTURE. Not one of eight — the only visual this beat has, SSR'd once in its first state
 * and then driven by the reader's scroll through the other seven.
 *
 * Rules it keeps, from `scrolly/references/scrolly-discipline.md`:
 *
 *   1. **Fitted, never cropped.** A chart is evidence. The frame is an HTML box laid out in
 *      fractions of whatever box the graphic gives it; the SVG inside carries GEOMETRY ONLY and
 *      stretches (`preserveAspectRatio="none"`).
 *   2. **Geometry stretches; type does not.** Every word is HTML at a fixed pixel size positioned
 *      in fractions over the same box, so a 14px tick is 14px at 375px and at 1600px.
 *   3. **Nothing a reader needs sits alone in the card's stripe down the middle.** The axis
 *      furniture is in the gutters; the head readout is pinned to the top-left corner, outside the
 *      middle 70% at every width above the edge-to-edge regime change.
 *
 * No colour is named here. `ground`, `ink`, `muted` and `accent` are props, derived in node by
 * `render.mjs` from the answer recorded in the story's own `PALETTE.md`.
 */

import type { CSSProperties } from "react";
import { PLOT, VIEWBOX, glacierGeometry, pct, toFrame } from "./glacier-drive.mjs";
import type { Reading } from "./glacier-data.ts";

// The face this frame draws in. `scrolly` has no `useTypeface` and never reads the story's
// `TYPEFACE.md` — a gap this format's own SKILL.md names. The story's recorded answer
// (`TYPEFACE.md`, `family: "Helvetica, Arial, sans-serif"`, `origin: default`) happens to be this
// stack, so this beat's render and its record agree; that agreement is a coincidence of the answer,
// not a mechanism, and the hand-over says so.
const FONT = "Helvetica, Arial, sans-serif";

export type GlacierFrameProps = {
  readings: Reading[];
  /** The FIRST state — the one a reader with no JavaScript keeps for the whole beat. */
  state: Record<string, number>;
  unit: string;
  baselineLabel: string;
  pauseLabel: string;
  finalLabel: string;
  credit: string;
  ground: string;
  ink: string;
  muted: string;
  accent: string;
};

const typeStyle = (colour: string): CSSProperties => ({
  position: "absolute",
  fontFamily: FONT,
  fontSize: "14px",
  color: colour,
  whiteSpace: "nowrap",
});

export function GlacierFrame({
  readings,
  state,
  unit,
  baselineLabel,
  pauseLabel,
  finalLabel,
  credit,
  ground,
  ink,
  muted,
  accent,
}: GlacierFrameProps) {
  const geometry = glacierGeometry(readings, state);
  const plotLeft = pct(PLOT.left);
  const plotTop = pct(PLOT.top);
  const plotWidth = pct(PLOT.right - PLOT.left);
  const plotHeight = pct(PLOT.bottom - PLOT.top);
  const [headX, headY] = toFrame(geometry.head.x, geometry.head.y);

  const pauseMark = geometry.marks.find((m) => m.year === 2005) ?? geometry.marks[0];
  const [pauseX] = toFrame(pauseMark.x, pauseMark.y);
  const lastMark = geometry.marks[geometry.marks.length - 1];
  const [finalX, finalY] = toFrame(lastMark.x, lastMark.y);

  return (
    <div
      data-visual="rhone-glacier"
      style={{ position: "absolute", inset: 0, background: ground, overflow: "hidden" }}
    >
      {/* THE HEAD READOUT — the year and the reading the scroll has arrived at, pinned to the
          top-left gutter so the travelling card never cuts it in half. */}
      <div style={{ ...typeStyle(ink), left: pct(0.02), top: pct(0.015), whiteSpace: "nowrap" }}>
        <span
          data-part="head-year"
          style={{ fontSize: "34px", fontWeight: 700, letterSpacing: "-0.01em" }}
        >
          {Math.round(geometry.head.year)}
        </span>
        {/* The readout is INK, not the accent. `#1F6FB2` on this ground measures 3.34:1 — over the
            3:1 non-text floor a mark has to clear, and under the 4.5:1 a run of 18px text does.
            The accent carries the line and the shaded gap, which are marks; it does not set type
            here. */}
        <span
          data-part="head-value"
          style={{ fontSize: "18px", color: ink, marginLeft: "10px", fontWeight: 600 }}
        >
          {`${geometry.head.area.toFixed(2)} ${unit}`}
        </span>
      </div>

      {/* The plot: geometry only, stretched. */}
      <div
        style={{ position: "absolute", left: plotLeft, top: plotTop, width: plotWidth, height: plotHeight }}
      >
        <svg
          viewBox={`0 0 ${VIEWBOX.width} ${VIEWBOX.height}`}
          preserveAspectRatio="none"
          style={{ display: "block", width: "100%", height: "100%", overflow: "hidden" }}
        >
          <defs>
            <clipPath id="rhone-plot">
              <rect x="0" y="0" width={VIEWBOX.width} height={VIEWBOX.height} />
            </clipPath>
          </defs>
          <g clipPath="url(#rhone-plot)">
            {geometry.yTicks.map((tick, i) => (
              <line
                key={`grid-${i}`}
                x1="0"
                x2={VIEWBOX.width}
                y1={(1 - tick.at) * VIEWBOX.height}
                y2={(1 - tick.at) * VIEWBOX.height}
                stroke={muted}
                strokeWidth="1"
                vectorEffect="non-scaling-stroke"
                style={{ opacity: 0.3 }}
              />
            ))}
            {/* THE 1990 LEVEL. A decorative dash — it measures nothing, carries no pathLength and
                no dash offset, so it is not the screen-space reveal dash the guard refuses. */}
            <line
              data-part="baseline"
              x1="0"
              x2={VIEWBOX.width}
              y1={geometry.baselineY}
              y2={geometry.baselineY}
              stroke={ink}
              strokeWidth="1.5"
              strokeDasharray="7 6"
              strokeDashoffset="0"
              vectorEffect="non-scaling-stroke"
              style={{ opacity: 0.55 }}
            />
            {/* THE GAP — how much of the 1990 glacier is gone, at every year the reveal has
                reached. Its vertical extent is square kilometres, the y axis's own unit. */}
            <polygon
              data-part="gap"
              points={geometry.gap}
              fill={accent}
              stroke="none"
              style={{ opacity: geometry.gapOpacity }}
            />
            {/* The whole record, faint: the header states the claim in full, so nothing is held
                back — the reveal says where the reader is in it, not what happens next. */}
            <polyline
              data-part="ghost"
              points={geometry.ghost}
              fill="none"
              stroke={muted}
              strokeWidth="2"
              strokeLinejoin="round"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
              style={{ opacity: 0.5 }}
            />
            <polyline
              data-part="revealed"
              points={geometry.revealed}
              fill="none"
              stroke={accent}
              strokeWidth="4.5"
              strokeLinejoin="round"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
          </g>
        </svg>
      </div>

      {/* The eight measurement marks. HTML, never SVG circles: the plot stretches, so a circle
          inside it is an ellipse at every viewport but one. Each DECLARES whether the narrative has
          reached it. */}
      {geometry.marks.map((mark, i) => {
        const [dx, dy] = toFrame(mark.x, mark.y);
        return (
          <div
            key={`mark-${i}`}
            data-mark={i}
            data-state={mark.reached ? "reached" : "pending"}
            style={{
              position: "absolute",
              left: pct(dx),
              top: pct(dy),
              width: "12px",
              height: "12px",
              marginLeft: "-6px",
              marginTop: "-6px",
              borderRadius: "50%",
              background: mark.reached ? accent : muted,
              boxShadow: `0 0 0 2px ${ground}`,
              opacity: mark.reached ? 1 : 0.3,
            }}
          />
        );
      })}

      {/* The head dot, riding the line's own end. */}
      <div
        data-part="head-dot"
        style={{
          position: "absolute",
          left: pct(headX),
          top: pct(headY),
          width: "18px",
          height: "18px",
          marginLeft: "-9px",
          marginTop: "-9px",
          borderRadius: "50%",
          border: `3px solid ${accent}`,
          background: ground,
        }}
      />

      {/* The 1990 level, named at the right gutter — outside the card's own stripe at every width
          that has one. */}
      <div
        style={{
          ...typeStyle(ink),
          fontSize: "13px",
          right: pct(0.015),
          top: `calc(${pct(toFrame(0, geometry.baselineY)[1])} - 20px)`,
          textAlign: "right",
          opacity: 0.85,
        }}
      >
        {baselineLabel}
      </div>

      {/* The two callouts, each faded in by the step whose sentence names it. */}
      <div
        data-part="callout-pause"
        style={{
          ...typeStyle(ink),
          fontSize: "13px",
          left: pct(pauseX),
          top: pct(PLOT.top + 0.03),
          transform: "translateX(-50%)",
          background: ground,
          padding: "1px 6px",
          borderRadius: "2px",
          opacity: state.pauseOpacity,
        }}
      >
        {pauseLabel}
      </div>
      <div
        data-part="callout-final"
        style={{
          ...typeStyle(ink),
          fontSize: "15px",
          fontWeight: 700,
          left: pct(finalX),
          top: pct(finalY),
          transform: "translate(-100%, -170%)",
          background: ground,
          padding: "1px 6px",
          borderRadius: "2px",
          opacity: state.finalOpacity,
        }}
      >
        {finalLabel}
      </div>

      {/* The y ticks, in the left gutter. */}
      {geometry.yTicks.map((tick, i) => {
        const [, fy] = toFrame(0, (1 - tick.at) * VIEWBOX.height);
        return (
          <div
            key={`y-${i}`}
            style={{ ...typeStyle(muted), left: pct(0.005), top: pct(fy), transform: "translateY(-50%)" }}
          >
            {tick.label}
          </div>
        );
      })}

      {/* The x ticks, on the strip under the plot. */}
      {geometry.xTicks.map((tick, i) => {
        const [fx] = toFrame(tick.at * VIEWBOX.width, 0);
        return (
          <div
            key={`x-${i}`}
            style={{
              ...typeStyle(muted),
              fontSize: "13px",
              left: pct(fx),
              top: pct(PLOT.bottom + 0.02),
              transform: "translateX(-50%)",
            }}
          >
            {tick.label}
          </div>
        );
      })}

      {/* THE CREDIT, anchored to the frame's own floor. */}
      <div
        data-part="credit"
        style={{
          ...typeStyle(muted),
          fontSize: "12px",
          left: pct(0.02),
          right: pct(0.02),
          bottom: "8px",
          whiteSpace: "normal",
        }}
      >
        {credit}
      </div>
    </div>
  );
}
