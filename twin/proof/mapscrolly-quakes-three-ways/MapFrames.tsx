/**
 * The FOUR map frames this beat steps through — the same 14,057 earthquakes and the same baked
 * camera, drawn four different ways: raw dots, hexagons shaded by COUNT, proportional symbols for
 * the largest events, and the same hexagons shaded by their STRONGEST event.
 *
 * Two decisions here depart from the vehicle's own seed, and both are deliberate.
 *
 * **1. The map is FITTED, not COVER-cropped.** `scrolly-discipline.md` says scenery is cropped and
 * evidence is fitted, and files a basemap under scenery. That is right for a locator, whose plate is
 * a backdrop for one marked point. It is wrong here: this plate carries 14,057 data marks spread
 * from Chile to Kamchatka, and COVER at a phone's aspect (0.46 against the plate's 1.61) would show
 * about a quarter of the world's width — cropping away most of the events the beat counts. So the
 * plate is fitted (`preserveAspectRatio="xMidYMid meet"`), which is also what
 * `mapmore-scrolly-danube` chose, for the same reason, after its own last badge was cropped off.
 *
 * **2. It is fitted into the WHOLE frame.** It used to be fitted into the top `CONTENT_TOP` of the
 * graphic, so that every dot, hexagon and symbol sat above a band reserved for a prose panel parked
 * at the bottom. The ninth correction of the vehicle puts the prose card back OVER the visual and
 * lets it travel the whole height, so no band can be reserved from it (see
 * `twin-scrolly/references/scrolly-discipline.md`, "What the card covers") — and a band reserved
 * from nothing is 28% of every frame spent on bare ground. Fitted into the frame, the plate is
 * larger at every viewport and still whole, because FIT never crops.
 *
 * **No text is drawn on the map.** Type inside the SVG would scale with the plate — 15px on a
 * desktop is 6px on a phone — so every word on these frames is HTML at a fixed pixel size, and the
 * only HTML that can be placed without knowing where the fitted plate landed is the legend, which
 * sits in the frame's own corner. Everything the reader needs to name is named in the step's prose,
 * and the cells the prose names are RINGED in the accent, which is the rule that closes the gap
 * this project logged against a sibling beat: a highlighted hexagon with nothing said about it.
 */

import type { ReactNode } from "react";
import { hexCorners } from "./geo-hex.ts";
import type { QuakeCell, QuakeFacts } from "./quake-encodings.ts";
import { classOf, energyRadius } from "./quake-encodings.ts";

const FONT = "Helvetica, Arial, sans-serif";
const pct = (v: number) => `${(v * 100).toFixed(3)}%`;

export type Furniture = {
  ground: string;
  ink: string;
  muted: string;
  accent: string;
};

type Frame = { width: number; height: number };

function hexPath(cell: { cx: number; cy: number }, size: number) {
  return (
    hexCorners(cell.cx, cell.cy, size)
      .map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`)
      .join("") + "Z"
  );
}

/**
 * The shell every frame shares: the plate fitted into the content band, and a legend in the corner
 * below it. `children` is the mark layer, in PLATE coordinates.
 */
function PlateFrame({
  plate,
  frame,
  ground,
  legend,
  children,
}: {
  plate: string;
  frame: Frame;
  ground: string;
  legend?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: ground,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
        }}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox={`0 0 ${frame.width} ${frame.height}`}
          preserveAspectRatio="xMidYMid meet"
          style={{ width: "100%", height: "100%", display: "block" }}
        >
          <image
            href={plate}
            x={0}
            y={0}
            width={frame.width}
            height={frame.height}
          />
          {children}
        </svg>
      </div>
      {legend}
    </div>
  );
}

/**
 * The legend: HTML at a fixed pixel size, anchored to the FRAME's own TOP-left corner — never to
 * the plate, whose position inside the band depends on the viewport's aspect and is not knowable at
 * render time.
 *
 * **Top-left, because bottom-left collided.** Sitting just above what used to be the prose lane, it
 * was inside the pinned panel's own box at 375×812 — measured, 36 collisions across the sampled
 * positions. Top-left is bare ground at narrow widths (the fitted plate is letterboxed vertically)
 * and the Bering Sea and the Arctic at wide ones, which is the emptiest corner this camera has —
 * and it is also OUTSIDE the travelling card's own centred stripe at every width, which is the
 * placement rule the ninth correction replaced the lane with.
 */
function Legend({
  title,
  ramp,
  labels,
  ink,
  muted,
  ground,
}: {
  title: string;
  ramp: string[];
  labels: string[];
  ink: string;
  muted: string;
  ground: string;
}) {
  return (
    <div
      style={{
        position: "absolute",
        left: "14px",
        top: "12px",
        fontFamily: FONT,
        background: ground,
        padding: "6px 8px",
        borderRadius: "3px",
      }}
    >
      <div style={{ fontSize: "13px", color: ink, marginBottom: "4px" }}>
        {title}
      </div>
      <div style={{ display: "flex", gap: "2px" }}>
        {ramp.map((c, i) => (
          <div
            key={i}
            style={{ width: "34px", height: "11px", background: c }}
          />
        ))}
      </div>
      <div style={{ display: "flex", gap: "2px" }}>
        {labels.map((l, i) => (
          <div
            key={i}
            style={{
              width: "34px",
              fontSize: "11px",
              color: muted,
              textAlign: "center",
            }}
          >
            {l}
          </div>
        ))}
      </div>
    </div>
  );
}

// ===== 1. Every event, one dot. =====

/**
 * All 14,057 projected events, as one `<path>`.
 *
 * **Why one path and not 14,057 `<circle>`s.** This file is delivered inline in a self-contained
 * HTML, so the mark layer's own byte weight is the reader's download. Written as circles it is
 * about 480 kB; written as zero-length subpaths (`M x y h0`) with a round line cap it is about
 * 240 kB, and every mark is still a perfect ROUND dot exactly `strokeWidth` across — a zero-length
 * subpath with `stroke-linecap: round` renders as a dot, which is what that cap is specified to do.
 *
 * Overplotting is not hidden: at this scale the dense rims saturate into a solid shape, and that is
 * exactly the limitation the step's own prose states before the next step fixes it.
 */
export function DotFrame({
  plate,
  frame,
  points,
  ground,
  accent,
}: Furniture & {
  plate: string;
  frame: Frame;
  points: { px: number; py: number }[];
}) {
  const d = points
    .map((p) => `M${p.px.toFixed(1)} ${p.py.toFixed(1)}h0`)
    .join("");
  return (
    <PlateFrame plate={plate} frame={frame} ground={ground}>
      <path
        d={d}
        stroke={accent}
        strokeWidth={2.6}
        strokeLinecap="round"
        strokeOpacity={0.55}
        fill="none"
      />
    </PlateFrame>
  );
}

// ===== 2. The same events, binned — shaded by COUNT. =====

export function HexCountFrame({
  plate,
  frame,
  facts,
  ramp,
  legendLabels,
  ringed,
  ground,
  ink,
  muted,
  accent,
}: Furniture & {
  plate: string;
  frame: Frame;
  facts: QuakeFacts;
  ramp: string[];
  legendLabels: string[];
  ringed: QuakeCell[];
}) {
  return (
    <PlateFrame
      plate={plate}
      frame={frame}
      ground={ground}
      legend={
        <Legend
          title="earthquakes per hexagon"
          ramp={ramp}
          labels={legendLabels}
          ink={ink}
          muted={muted}
          ground={ground}
        />
      }
    >
      {facts.cells.map((c) => (
        <path
          key={c.key}
          d={hexPath(c, facts.hexSize)}
          fill={ramp[classOf(c.count, facts.countBreaks)]}
          fillOpacity={0.85}
          stroke={ground}
          strokeWidth={0.4}
        />
      ))}
      {/* The ring is drawn twice — a ground-coloured halo under an accent stroke — so it reads
          against the darkest cell in the ramp as well as the lightest. */}
      {ringed.map((c) => (
        <g key={`ring-${c.key}`}>
          <path
            d={hexPath(c, facts.hexSize)}
            fill="none"
            stroke={ground}
            strokeWidth={7}
          />
          <path
            d={hexPath(c, facts.hexSize)}
            fill="none"
            stroke={accent}
            strokeWidth={3.5}
          />
        </g>
      ))}
    </PlateFrame>
  );
}

// ===== 3. Only the largest events, sized by the energy their magnitude implies. =====

export function SymbolFrame({
  plate,
  frame,
  facts,
  maxRadius,
  ground,
  accent,
  ink,
}: Furniture & {
  plate: string;
  frame: Frame;
  facts: QuakeFacts;
  maxRadius: number;
}) {
  // Largest drawn LAST would bury the small ones under it; smallest last keeps every circle's own
  // outline visible where two overlap, which is the readability complaint this project has already
  // logged against a proportional-symbol beat.
  const drawn = [...facts.bigEvents].sort((a, b) => b.point.mag - a.point.mag);
  return (
    <PlateFrame plate={plate} frame={frame} ground={ground}>
      {drawn.map((e, i) => (
        <circle
          key={`${e.px}-${e.py}-${i}`}
          cx={e.px}
          cy={e.py}
          r={energyRadius(e.point.mag, facts.maxMag, maxRadius)}
          fill={accent}
          fillOpacity={0.55}
          stroke={ink}
          strokeWidth={0.9}
        />
      ))}
    </PlateFrame>
  );
}

// ===== 4. The same hexagons, shaded by their STRONGEST event. =====

export function HexStrengthFrame({
  plate,
  frame,
  facts,
  ramp,
  legendLabels,
  ringed,
  ground,
  ink,
  muted,
  accent,
}: Furniture & {
  plate: string;
  frame: Frame;
  facts: QuakeFacts;
  ramp: string[];
  legendLabels: string[];
  ringed: QuakeCell[];
}) {
  return (
    <PlateFrame
      plate={plate}
      frame={frame}
      ground={ground}
      legend={
        <Legend
          title="strongest event in the hexagon"
          ramp={ramp}
          labels={legendLabels}
          ink={ink}
          muted={muted}
          ground={ground}
        />
      }
    >
      {facts.cells.map((c) => (
        <path
          key={c.key}
          d={hexPath(c, facts.hexSize)}
          fill={ramp[classOf(c.maxMag, facts.magBreaks)]}
          fillOpacity={0.85}
          stroke={ground}
          strokeWidth={0.4}
        />
      ))}
      {/* The ring is drawn twice — a ground-coloured halo under an accent stroke — so it reads
          against the darkest cell in the ramp as well as the lightest. */}
      {ringed.map((c) => (
        <g key={`ring-${c.key}`}>
          <path
            d={hexPath(c, facts.hexSize)}
            fill="none"
            stroke={ground}
            strokeWidth={7}
          />
          <path
            d={hexPath(c, facts.hexSize)}
            fill="none"
            stroke={accent}
            strokeWidth={3.5}
          />
        </g>
      ))}
    </PlateFrame>
  );
}
