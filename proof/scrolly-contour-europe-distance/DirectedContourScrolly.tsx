/**
 * Europe measured from the sea, drawn THROUGH the design base as a contour map and CHOREOGRAPHED by the
 * scroll. The `contour / isoline` type in the scrolly format: the subject of `static-contour-europe-distance`
 * — half of Europe within 132 km of the sea, no point farther than 682 — told with the gestures a scroll can
 * make (`scrolly/references/directed-type-choreography.md`): a fill sweeps inland from every coast, each
 * line is left where the sweep passed it, the camera closes onto the last point to be reached.
 *
 * THE STATIC PLATE'S RULES ARE THE FLOOR: the sea is the bare ground and the land one step off it; the land
 * outside the measurement fainter still; no border stroked, not even a coastline; each line in a tone floored
 * against the land it sits on, and carrying its own number on itself, never laid across another line; the
 * summit spot-marked with its own number.
 *
 * THE LAYERS. The stage's own background is the study land; the swept fill is a canvas over it; one SVG on
 * top paints the sea (the frame minus every land ring), the land outside the measurement, the lines, the
 * summit and the numbers. So the fill, whose cells are 6 km squares, is cut by the vector coastline and
 * never shows a staircase on the water.
 *
 * What is rendered here is the last card's picture; `contour-drive.mjs` moves the camera, sweeps the fill and
 * seats the numbers in the reader's own pixels.
 */

import type { CSSProperties } from "react";
import {
  adjustToContrast,
  contrast,
  mix,
  NON_TEXT_CONTRAST_MIN,
  TEXT_CONTRAST_MIN,
} from "#shared/chart-beat/colour.mjs";
import { SEA_LAND_MIN } from "#shared/map-beat/tints.mjs";

type Style = Record<string, string | number>;

export function DirectedContourScrolly({
  field,
  levels,
  medianLevel,
  zoomBox,
  count,
  unit,
  outsideLabel,
  alt,
  regs,
  stroke,
  ground,
  accent,
  ink,
  muted,
}: {
  field: {
    width: number;
    height: number;
    unitsPerKm: number;
    deepest: number;
    summit: [number, number];
    within: number[];
    shapes: { study: string[]; other: string[] };
    lines: { level: number; d: string }[];
    seats: number[][][];
    seatHalfWidths: number[];
    raster: {
      x: number;
      y: number;
      w: number;
      h: number;
      cols: number;
      rows: number;
      stepKm: number;
      data: string;
    };
  };
  levels: { level: number; label: string }[];
  medianLevel: number;
  zoomBox: { x: number; y: number; w: number; h: number };
  count: string;
  unit: string;
  outsideLabel: string;
  alt: string;
  regs: Record<
    "display" | "eyebrow" | "body" | "axis" | "annot" | "value",
    Style
  >;
  stroke: { rule?: number; hairline?: number };
  ground: string;
  accent: string;
  ink: string;
  muted: string;
}) {
  const { width, height } = field;
  /** The static plate's land step (0.085 of the ink) is a floor, not a dose: on `nocturne`'s navy it leaves
   *  the land at 1.1:1 against the sea, and the coast this whole field is measured from stops reading. The
   *  dose rises until the coast clears `SEA_LAND_MIN`; the land outside the measurement takes half of it. */
  let dose = 0.085;
  while (contrast(mix(ground, ink, dose), ground) < SEA_LAND_MIN && dose < 0.4) dose += 0.005;
  if (contrast(mix(ground, ink, dose), ground) < SEA_LAND_MIN)
    throw new Error(`no step of the ink separates land from sea by ${SEA_LAND_MIN}:1 on ${ground}`);
  const land = mix(ground, ink, dose);
  const outside = mix(ground, ink, dose / 2);
  /** The swept fill: a tint of the accent, the lines and numbers floored against it as well as the land. */
  const tint = mix(land, accent, 0.22);
  const floorOn = (colour: string, floor: number, what: string) => {
    let c = colour;
    for (const bg of [land, tint]) {
      if (contrast(c, bg) >= floor) continue;
      const lifted = adjustToContrast(c, bg, floor);
      if (!lifted)
        throw new Error(
          `${what} cannot be told from ${bg}: nothing between it and the direction's poles clears ${floor}:1`,
        );
      c = lifted;
    }
    for (const bg of [land, tint])
      if (contrast(c, bg) < floor)
        throw new Error(
          `${what} clears ${floor}:1 on one of the land and the fill, not on both`,
        );
    return c;
  };
  const plain = levels.filter((l) => l.level !== medianLevel);
  const lineInk = new Map(
    levels.map((l) => [
      l.level,
      l.level === medianLevel
        ? floorOn(accent, NON_TEXT_CONTRAST_MIN, "the median line")
        : floorOn(
            mix(
              mix(ground, ink, 0.35),
              accent,
              plain.length > 1 ? plain.indexOf(l) / (plain.length - 1) : 1,
            ),
            NON_TEXT_CONTRAST_MIN,
            `the ${l.level} km line`,
          ),
    ]),
  );
  const textInk = floorOn(ink, TEXT_CONTRAST_MIN, "a line's number");
  const accentText = floorOn(accent, TEXT_CONTRAST_MIN, "the median's number");
  const rim = floorOn(accent, NON_TEXT_CONTRAST_MIN, "the sweep's front");
  const mutedInk = adjustToContrast(muted, ground, TEXT_CONTRAST_MIN) ?? muted;
  const inkOnGround = adjustToContrast(ink, ground, TEXT_CONTRAST_MIN) ?? ink;
  const hairline = stroke.hairline ?? 0.6;
  const rule = stroke.rule ?? 1;
  const abs = (extra: CSSProperties): CSSProperties => ({
    position: "absolute",
    ...extra,
  });
  const M = { x: 900, y: 500 };
  const frameRect = `M${-M.x} ${-M.y}H${width + M.x}V${height + M.y}H${-M.x}Z`;
  const axisPx = Number.parseFloat(String(regs.axis.fontSize));

  return (
    <div
      role="img"
      aria-label={alt}
      data-contour={JSON.stringify({
        width,
        height,
        zoomBox,
        unitsPerKm: field.unitsPerKm,
        deepest: field.deepest,
        summit: field.summit,
        within: field.within,
        levels: levels.map((l) => l.level),
        medianLevel,
        seats: field.seats,
        seatHalfWidths: field.seatHalfWidths,
        raster: field.raster,
        axisPx,
        colours: { tint, rim, land },
      })}
      style={{
        position: "absolute",
        inset: 0,
        background: ground,
        display: "grid",
        gridTemplateRows: "auto minmax(0, 1fr) auto",
        gridTemplateColumns: "minmax(0, 1fr)",
        rowGap: "10px",
        padding: `12px var(--prose-gutter, clamp(16px, 6vw, 56px))`,
      }}
    >
      <div
        data-part="count-row"
        style={{
          display: "flex",
          justifyContent: "flex-end",
          alignItems: "center",
          gap: "8px",
        }}
      >
        <span
          data-part="count-swatch"
          style={{
            display: "inline-block",
            width: "22px",
            height: "12px",
            flex: "none",
            background: tint,
            boxShadow: `inset 0 0 0 1px ${rim}`,
          }}
        />
        <span
          data-part="count"
          data-template={count}
          style={{ ...regs.value, color: inkOnGround }}
        >
          {count
            .replace(
              "{p}",
              String(Math.round(field.within[field.within.length - 1])),
            )
            .replace("{km}", String(Math.round(field.deepest)))}
        </span>
      </div>

      <div
        data-part="stage"
        style={{
          position: "relative",
          minHeight: 0,
          overflow: "hidden",
          background: land,
        }}
      >
        <canvas
          data-part="sweep"
          style={abs({ left: 0, top: 0, width: 0, height: 0, opacity: 0 })}
        />
        <svg
          data-part="field"
          xmlns="http://www.w3.org/2000/svg"
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="xMidYMid meet"
          style={abs({ inset: 0, width: "100%", height: "100%" })}
        >
          {/* The sea is the frame minus every land ring (even-odd), so a lake is water and the canvas under
              it shows only on land. */}
          <path
            data-part="sea"
            d={`${frameRect}${field.shapes.study.join("")}${field.shapes.other.join("")}`}
            fill={ground}
            fillRule="evenodd"
          />
          {field.shapes.other.map((d, i) => (
            <path key={`o${i}`} d={d} fill={outside} />
          ))}
          {levels.map((l, i) => (
            <path
              key={`l${l.level}`}
              data-level={l.level}
              d={field.lines[i].d}
              fill="none"
              stroke={lineInk.get(l.level)}
              strokeWidth={l.level === medianLevel ? rule * 2 : rule}
              strokeLinejoin="round"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
          ))}
          <g data-part="summit">
            <circle
              cx={field.summit[0]}
              cy={field.summit[1]}
              r={2.6}
              fill={accentText}
              data-r="2.6"
            />
            <circle
              cx={field.summit[0]}
              cy={field.summit[1]}
              r={5.2}
              fill="none"
              stroke={accentText}
              strokeWidth={hairline * 1.6}
              vectorEffect="non-scaling-stroke"
              data-r="5.2"
            />
          </g>
          {levels.map((l) =>
            [0, 1, 2].map((k) => (
              <text
                key={`t${l.level}-${k}`}
                data-label={l.level}
                textAnchor="middle"
                dominantBaseline="central"
                x={-9999}
                y={-9999}
                style={{
                  fontFamily: String(regs.axis.fontFamily),
                  fontWeight:
                    l.level === medianLevel
                      ? 700
                      : Number(regs.axis.fontWeight),
                  letterSpacing: String(regs.axis.letterSpacing ?? "normal"),
                  fontSize: `${axisPx}px`,
                  paintOrder: "stroke",
                  opacity: 0,
                }}
                fill={l.level === medianLevel ? accentText : textInk}
                stroke={land}
                strokeWidth={3.4}
                strokeLinejoin="round"
              >
                {l.label}
              </text>
            )),
          )}
          <text
            data-part="summit-label"
            dominantBaseline="central"
            x={field.summit[0] + 9}
            y={field.summit[1]}
            style={{
              fontFamily: String(regs.value.fontFamily),
              fontWeight: Number(regs.value.fontWeight),
              letterSpacing: String(regs.value.letterSpacing ?? "normal"),
              fontSize: `${Number.parseFloat(String(regs.value.fontSize))}px`,
              paintOrder: "stroke",
            }}
            fill={accentText}
            stroke={land}
            strokeWidth={3.4}
            strokeLinejoin="round"
          >
            {`${Math.round(field.deepest)} km`}
          </text>
        </svg>
      </div>

      <div
        data-part="key"
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: "4px 16px",
        }}
      >
        <span style={{ ...regs.axis, color: mutedInk, fontWeight: 700 }}>
          {unit}
        </span>
        <span
          style={{
            ...regs.axis,
            color: mutedInk,
            display: "flex",
            alignItems: "center",
            gap: "6px",
          }}
        >
          <span
            style={{
              display: "inline-block",
              width: "22px",
              height: "12px",
              flex: "none",
              background: outside,
              boxShadow: `inset 0 0 0 1px ${mix(ground, ink, 0.12)}`,
            }}
          />
          {outsideLabel}
        </span>
      </div>
    </div>
  );
}
