/**
 * The ONE frame this beat steps through eight times — a single horizontal progress track for the
 * shipment's own reading at each checkpoint, from 0 to the record's own maximum. Every step hands
 * this same component a different `reading`; the picture that comes out is a function of that
 * reading ALONE — never of which step number called it.
 *
 * That is deliberate, and it is the whole point of this beat: the article states that three of the
 * scanner's own eight readings are the SAME reading, logged once per shift rather than once per
 * container. An honest encoding of "where the shipment reads, right now" therefore has to draw the
 * SAME picture for those three checkpoints — a marker keyed to the STEP NUMBER instead would move
 * every time regardless of what the sensor actually said, which would be a beat about steps, not
 * about a shipment's own progress.
 *
 * Two rules inherited from `scrolly/references/scrolly-discipline.md` ("Two kinds of frame: scenery
 * is cropped, evidence is fitted") and its sibling `ChartFrames.tsx` in this same tree:
 *   1. Geometry (the track, the filled bar) is SVG, `preserveAspectRatio="none"`, and stretches.
 *   2. Every word and every DOT is HTML at a fixed CSS pixel size — a circle in a stretched SVG is
 *      an ellipse at every viewport but one.
 */

import type { CSSProperties } from "react";
import type { Reading } from "./checkpoint-data.ts";

export const VIEWBOX = { width: 1000, height: 300 } as const;

/** The track's own box, in fractions of the frame — a band clear of the header/prose card's own
 *  travelling stripe (the axis furniture and the readout both sit in the left/right gutters and
 *  above/below the track, never in the centred column a travelling card crosses). */
export const TRACK = {
  left: 0.08,
  right: 0.92,
  y: 0.62,
} as const;

const FONT = "Helvetica, Arial, sans-serif";
const pct = (v: number) => `${(v * 100).toFixed(3)}%`;

type Furniture = {
  ground: string;
  ink: string;
  muted: string;
  grid: string;
  accent: string;
};

function Label({
  style,
  children,
}: {
  style: CSSProperties;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        position: "absolute",
        fontFamily: FONT,
        whiteSpace: "nowrap",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/** Nice round ticks for the axis — every 20 units up to the record's own ceiling, rounded up to the
 *  next multiple of 20 so the axis never clips the highest reading. */
function niceTicks(maxValue: number): number[] {
  const ceiling = Math.ceil(maxValue / 20) * 20;
  const ticks: number[] = [];
  for (let v = 0; v <= ceiling; v += 20) ticks.push(v);
  return ticks;
}

export function CheckpointFrame({
  reading,
  maxValue,
  ground,
  ink,
  muted,
  grid,
  accent,
}: Furniture & { reading: Reading; maxValue: number }) {
  const ceiling = Math.ceil(maxValue / 20) * 20;
  const ticks = niceTicks(maxValue);
  const at = (v: number) =>
    TRACK.left + (v / ceiling) * (TRACK.right - TRACK.left);
  const trackY = TRACK.y * VIEWBOX.height;
  // FINDING 4 (round-two stress): measured against every delivered scrolly under proof/, this
  // frame's own ink covered roughly 3.6% of a 1440x900 frame at a 22px bar — thinner than every
  // other chart-track scrolly measured (2.2%-7.1%) and far below an image/diagram track (22%-28%),
  // for the same reason all of them read thin: a chart-track frame draws a single stat annotated in
  // otherwise-empty space, the same shape `assets/ScrollySeed.tsx`'s own `ChartFrame` draws at
  // 2.2%. Doubled here, within this frame's own room: the axis label row sits at TRACK.y + 0.12
  // (36 viewbox px below centre), so a bar can grow to 52px before its own tick marks (barHeight/2
  // + 10) reach that row — 44px leaves a safe 4px clear.
  const barHeight = 44;
  const fraction = at(reading.value);
  const trackX0 = TRACK.left * VIEWBOX.width;
  const trackX1 = TRACK.right * VIEWBOX.width;
  const barX1 = fraction * VIEWBOX.width;

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: ground,
        overflow: "hidden",
      }}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox={`0 0 ${VIEWBOX.width} ${VIEWBOX.height}`}
        preserveAspectRatio="none"
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          display: "block",
        }}
      >
        {/* The empty track, full length, drawn first so the filled bar sits over it. */}
        <rect
          x={trackX0}
          y={trackY - barHeight / 2}
          width={trackX1 - trackX0}
          height={barHeight}
          fill="none"
          stroke={grid}
          strokeWidth={2}
        />
        {/* Tick marks, one per nice value — geometry only; their own labels are HTML below. */}
        {ticks.map((tick) => (
          <line
            key={tick}
            x1={at(tick) * VIEWBOX.width}
            x2={at(tick) * VIEWBOX.width}
            y1={trackY - barHeight / 2 - 10}
            y2={trackY + barHeight / 2 + 10}
            stroke={grid}
            strokeWidth={1}
          />
        ))}
        {/* The filled bar: from the start of the track to THIS reading's own value. Zero-width and
            invisible at the departure reading (value 0), which is honest — nothing has moved yet. */}
        {barX1 > trackX0 ? (
          <rect
            x={trackX0}
            y={trackY - barHeight / 2}
            width={barX1 - trackX0}
            height={barHeight}
            fill={accent}
          />
        ) : null}
      </svg>

      {/* The marker: an HTML dot at the reading's own position, fixed CSS pixel size at every
          viewport (rule 2 above). */}
      <div
        style={{
          position: "absolute",
          left: pct(fraction),
          top: pct(TRACK.y),
          width: "26px",
          height: "26px",
          marginLeft: "-13px",
          marginTop: "-13px",
          borderRadius: "50%",
          background: accent,
          border: `2px solid ${ground}`,
        }}
      />

      {/* Axis labels — one per tick, HTML, fixed pixel size, in the gutter below the track. */}
      {ticks.map((tick) => (
        <Label
          key={tick}
          style={{
            left: pct(at(tick)),
            top: pct(TRACK.y + 0.12),
            transform: "translateX(-50%)",
            fontSize: "13px",
            color: muted,
          }}
        >
          {tick}
        </Label>
      ))}
      <Label
        style={{
          left: pct(TRACK.left),
          top: pct(TRACK.y + 0.22),
          fontSize: "13px",
          color: muted,
        }}
      >
        Recorded reading
      </Label>

      {/* The big readout — the checkpoint's own label and its own reading, the two fields this
          frame's whole picture is a function of. Positioned above the track, clear of the card's
          own centred stripe at every width (it spans the frame's own gutters, not the middle). */}
      <Label
        style={{
          left: pct(TRACK.left),
          top: pct(TRACK.y - 0.34),
          fontSize: "28px",
          fontWeight: 700,
          color: ink,
        }}
      >
        {reading.label}
      </Label>
      <Label
        style={{
          left: pct(TRACK.left),
          top: pct(TRACK.y - 0.2),
          fontSize: "18px",
          color: accent,
        }}
      >
        {`reading: ${reading.value}`}
      </Label>
    </div>
  );
}
