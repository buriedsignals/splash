// The three frame components this beat's scrolly assembles: a CHART of the record, two
// PHOTOGRAPHS of the site, and a baked locator MAP. Three distinct `frameKind`s — which is what
// makes this a scrolly at all rather than one chart stepped by hand
// (`skills/scrolly/SKILL.md`, "How it works", item 1).
//
// No component here imports a rasteriser: `ground`/`ink`/`muted`/`grid`/`accent` arrive as props,
// derived once in node by the runner. No component knows about `.step-frame`, `active` or
// `aria-hidden` — those belong to the scaffold.
//
// THE COMPOSITION RULE EVERY FRAME HERE IS BUILT AGAINST. An opaque prose card travels up the
// middle of the frame, at most 70% of its width above 600px and the whole of it below. So nothing
// whose only copy a reader needs sits alone in that stripe, and nothing straddles its edge:
//   - the CHART is a horizontal bar chart precisely so that every word on it lives in one of the
//     two outer gutters — the year on the left, the two figures on the right — and never under the
//     card's own vertical edge at any width;
//   - each PHOTOGRAPH carries its year as an opaque chip in the top-left corner, outside the
//     stripe, because a reader meeting the second frame has to know which year they are looking at
//     even when the card has travelled past that row;
//   - the MAP's marker and label sit at the plate's own centre, which is inside the stripe — a
//     COVER-cropped frame has no placement outside the stripe at every width, so the label is put
//     INSIDE it deliberately and the card hides it whole rather than cutting it in half.

import type { CSSProperties } from "react";
import { group, type Facts, type Row } from "./kiln-data.ts";

/** The box-aspect range a full-bleed graphic is guaranteed readable across — a tall phone to an
 *  ultrawide desktop — and the safe sub-rectangle of a COVER-cropped viewBox that survives it.
 *  Copied from the vehicle's own seed rather than imported: nothing under a skill may be reached
 *  into from a beat, and these are placement constants, not machinery. */
export const ASPECT_ENVELOPE = { min: 0.42, max: 2.4 } as const;

export function safeBand(
  frame: { width: number; height: number },
  envelope: { min: number; max: number } = ASPECT_ENVELOPE,
  margin = 12,
): { x: [number, number]; y: [number, number] } {
  const visibleWidth = Math.min(frame.width, envelope.min * frame.height);
  const visibleHeight = Math.min(frame.width / envelope.max, frame.height);
  const cx = frame.width / 2;
  const cy = frame.height / 2;
  return {
    x: [cx - visibleWidth / 2 + margin, cx + visibleWidth / 2 - margin],
    y: [cy - visibleHeight / 2 + margin, cy + visibleHeight / 2 - margin],
  };
}

/** The chart frame's own layout, in fractions of whatever box it fills. The plot is the middle
 *  band; the two gutters are where every word lives. `right` stops well short of the frame's edge
 *  because the value column is type at a FIXED pixel size and a fraction reserves the wrong number
 *  of pixels at every width but one — so the column is `max()`-anchored, like the left gutter. */
export const CHART_LAYOUT = {
  plot: { top: 0.16, bottom: 0.93 },
  leftGutter: "max(58px, 11%)",
  rightGutter: "max(152px, 25%)",
  viewBox: { width: 1000, height: 500 },
} as const;

const TYPE = "Helvetica, Arial, sans-serif";

function text(style: CSSProperties, body: string, key: string) {
  return (
    <div key={key} style={{ position: "absolute", fontFamily: TYPE, whiteSpace: "nowrap", ...style }}>
      {body}
    </div>
  );
}

/**
 * The CHART track — the record, as one horizontal bar per observation.
 *
 * Bar LENGTH is the workforce; the kiln count travels beside it as a direct annotation rather than
 * as a second encoding, because a second length on the same row would be a comparison the article
 * never makes and a second axis is an anti-pattern. Geometry stretches
 * (`preserveAspectRatio="none"`); every word is HTML at a fixed pixel size over the same box.
 */
export function ChartFrame({
  facts,
  ground,
  ink,
  muted,
  grid,
  accent,
}: {
  facts: Facts;
  ground: string;
  ink: string;
  muted: string;
  grid: string;
  accent: string;
}) {
  const { plot, leftGutter, rightGutter, viewBox } = CHART_LAYOUT;
  const rows = facts.rows;
  const pct = (v: number) => `${(v * 100).toFixed(2)}%`;

  // The x domain is rounded UP to a round tick above the largest workforce, so the longest bar
  // stops inside the plot rather than on its own right edge — and the gridlines come from that
  // domain rather than from a list.
  const step = 500;
  const xMax = Math.ceil(facts.maxWorkers / step) * step;
  const gridLines = Array.from({ length: xMax / step + 1 }, (_, i) => i * step);

  const bandHeight = viewBox.height / rows.length;
  const barHeight = bandHeight * 0.56;
  const barY = (i: number) => i * bandHeight + (bandHeight - barHeight) / 2;
  const barW = (v: number) => (v / xMax) * viewBox.width;

  const rowCentre = (i: number) => plot.top + ((i + 0.5) / rows.length) * (plot.bottom - plot.top);
  const PLOT_LEFT = leftGutter;
  const PLOT_WIDTH = `calc(100% - ${leftGutter} - ${rightGutter})`;

  return (
    <div style={{ position: "absolute", inset: 0, background: ground, overflow: "hidden" }}>
      <div
        style={{
          position: "absolute",
          left: PLOT_LEFT,
          top: pct(plot.top),
          width: PLOT_WIDTH,
          height: pct(plot.bottom - plot.top),
        }}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox={`0 0 ${viewBox.width} ${viewBox.height}`}
          preserveAspectRatio="none"
          style={{ width: "100%", height: "100%", display: "block", overflow: "visible" }}
        >
          {gridLines.map((g) => (
            <line
              key={g}
              x1={barW(g)}
              x2={barW(g)}
              y1={0}
              y2={viewBox.height}
              stroke={g === 0 ? ink : grid}
              strokeWidth={g === 0 ? 2 : 1}
              vectorEffect="non-scaling-stroke"
            />
          ))}
          {rows.map((row, i) => (
            <rect
              key={row.year}
              x={0}
              y={barY(i)}
              width={Math.max(barW(row.workers), 2)}
              height={barHeight}
              fill={accent}
              opacity={i === 0 || i === rows.length - 1 ? 1 : 0.55}
            />
          ))}
        </svg>
      </div>

      {/* The unit, at a fixed inset above the plot — never at `left: 0`, which slices the first
          glyph against the frame's own edge. */}
      {text(
        { left: "12px", top: `calc(${pct(plot.top)} - 30px)`, fontSize: "15px", color: muted },
        "workers on the site",
        "unit",
      )}
      {text(
        { right: "12px", top: `calc(${pct(plot.top)} - 30px)`, fontSize: "15px", color: muted, textAlign: "right" },
        "workers \u00b7 kilns firing",
        "unit-right",
      )}

      {/* THE LEFT GUTTER — the year. Axis furniture, and outside the card's stripe at every width. */}
      {rows.map((row, i) =>
        text(
          {
            left: 0,
            top: `calc(${pct(rowCentre(i))} - 10px)`,
            width: `calc(${leftGutter} - 12px)`,
            textAlign: "right",
            fontSize: "17px",
            fontWeight: i === 0 || i === rows.length - 1 ? 700 : 400,
            color: i === 0 || i === rows.length - 1 ? ink : muted,
          },
          String(row.year),
          `year-${row.year}`,
        ),
      )}

      {/* THE RIGHT GUTTER — the two figures, direct annotation rather than a second encoding. */}
      {rows.map((row, i) =>
        text(
          {
            right: "12px",
            top: `calc(${pct(rowCentre(i))} - 10px)`,
            textAlign: "right",
            fontSize: "16px",
            fontWeight: i === 0 || i === rows.length - 1 ? 700 : 400,
            color: i === 0 || i === rows.length - 1 ? ink : muted,
          },
          `${group(row.workers)} · ${group(row.kilns)}`,
          `value-${row.year}`,
        ),
      )}
    </div>
  );
}

/**
 * A PHOTOGRAPH track. CONTAINED, never cover-cropped: a journalist's photograph is a document and a
 * silent crop changes what it shows. What fills the other axis is the render's own `ground`, which
 * `.scrolly-frame`'s own background already paints.
 *
 * `alt=""` because `renderScrolly` wraps every frame `aria-hidden` whatever kind it is, so a
 * meaningful `alt` here would reach no screen reader; the argument is carried by the prose and by
 * the unconditional source line. The `title` carries the same words for a sighted reader hovering,
 * and the frame's own year chip carries them visibly.
 */
export function PhotoFrame({
  src,
  natural,
  year,
  describe,
  ground,
  ink,
}: {
  src: string;
  /** The photograph's OWN pixel size, read from the file by the runner — never assumed, because
   *  every placement below is expressed in the picture's own coordinates. */
  natural: { width: number; height: number };
  year: number;
  describe: string;
  ground: string;
  ink: string;
}) {
  // THE PICTURE IS FITTED, NEVER CROPPED, and the year chip has to land ON it rather than in
  // whichever letterbox band the frame's aspect happens to open. An `<img>` with
  // `object-fit: contain` gets the first half and makes the second impossible: nothing in CSS
  // knows where the painted box ended up. An SVG with the picture's own viewBox and
  // `preserveAspectRatio="xMidYMid meet"` gets both — `meet` IS contain, and a mark placed in
  // viewBox units travels with the picture. Measured: the flex-shrink-wrap version of this frame
  // rendered the photograph 1600x1067 inside an 817px frame and cropped 250px of it, which is the
  // exact defect the contain rule exists to prevent — found by looking at the render.
  const { width, height } = natural;
  const scale = height / 640;
  const pad = Math.round(9 * scale);
  const fontSize = Math.round(21 * scale);
  const chipWidth = Math.round(fontSize * 0.62 * String(year).length + pad * 2);
  const chipHeight = Math.round(fontSize * 1.5 + pad);

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="xMidYMid meet"
      style={{ width: "100%", height: "100%", display: "block", background: ground }}
      role="presentation"
    >
      <title>{describe}</title>
      <image href={src} x={0} y={0} width={width} height={height} />
      <rect x={0} y={0} width={chipWidth} height={chipHeight} fill={ground} />
      <text
        x={pad}
        y={Math.round(chipHeight - fontSize * 0.45)}
        fill={ink}
        fontSize={fontSize}
        fontWeight={700}
        fontFamily={TYPE}
      >
        {String(year)}
      </text>
    </svg>
  );
}

/**
 * The MAP track — the plate baked once by `bake-plate.mjs`, embedded as a data URI, so the
 * delivered file makes no network request and carries no MapTiler key. COVER-cropped, because a
 * basemap is scenery; the marker and its label sit inside the plate's own `safeBand`, which the
 * bake's centre-and-zoom camera makes trivially true.
 */
export function MapFrame({
  plate,
  frame,
  site,
  ground,
  ink,
  accent,
}: {
  plate: string;
  frame: { width: number; height: number };
  site: { px: number; py: number; label: string };
  ground: string;
  ink: string;
  accent: string;
}) {
  const safe = safeBand(frame);
  const clamp = (v: number, [lo, hi]: [number, number]) => Math.max(lo, Math.min(hi, v));
  const cx = clamp(site.px, safe.x);
  const cy = clamp(site.py, safe.y);
  const labelY = clamp(cy - 28, safe.y);
  const dotR = Math.max(7, Math.round(frame.width / 90));

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={frame.width}
      height={frame.height}
      viewBox={`0 0 ${frame.width} ${frame.height}`}
      preserveAspectRatio="xMidYMid slice"
      style={{ width: "100%", height: "100%", display: "block" }}
    >
      <image href={plate} x={0} y={0} width={frame.width} height={frame.height} />
      {/* The halo is wider than a ring around the dot: the basemap keeps its own place labels (a
          locator's whole job is answering "where is this"), so the toponym AT the site sits under
          the beat's own marker and its tail showed as a stray glyph beside the dot — found by
          looking at the render, invisible to every assertion. Opaque ground, not a tint, for the
          same reason the prose card is opaque. */}
      <circle cx={cx} cy={cy} r={dotR + 18} fill={ground} />
      <circle cx={cx} cy={cy} r={dotR} fill={accent} stroke={ink} strokeWidth={2} />
      <text
        x={cx}
        y={labelY}
        fill={ink}
        fontSize={24}
        fontWeight={700}
        textAnchor="middle"
        stroke={ground}
        strokeWidth={5}
        paintOrder="stroke"
        fontFamily={TYPE}
      >
        {site.label}
      </text>
    </svg>
  );
}

export type { Row };
