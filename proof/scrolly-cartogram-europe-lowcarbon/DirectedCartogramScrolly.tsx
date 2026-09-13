/**
 * Europe's low-carbon electricity, drawn THROUGH the design base as a map that becomes a cartogram under
 * the reader's scroll. The `cartogram` type in the scrolly format: the subject of
 * `static-cartogram-europe-lowcarbon` — the country mean against the area-weighted mean — told with the
 * gesture its claim is about (`scrolly/references/directed-type-choreography.md`): every country starts
 * as its territory and ends as one equal tile.
 *
 * THE STATIC PLATE'S RULES ARE THE FLOOR: one ramp between the direction's own poles in five classes with
 * breaks in %; the lowest class and every tile floored against the ground; the country with no reading
 * hollow with a dashed edge, outside the ramp; every tile carries its own name; the layout is designed,
 * not derived, and said to be.
 *
 * ONE COORDINATE SPACE. The map and the tile grid share the SVG's viewBox (`cartogram-geometry.mjs`), and
 * it is fitted uniformly — a country is never stretched on one axis. Each country is a group holding its
 * shape and a rect drawn in the shape's own box; `cartogram-drive.mjs` moves the group from that box onto
 * its tile, fading the shape into the rect. Names are HTML, placed on the tiles in the reader's pixels.
 * What is rendered here is the last card's picture, which is what a reader without a script gets.
 */

import type { CSSProperties } from "react";
import {
  adjustToContrast,
  contrast,
  mix,
  NON_TEXT_CONTRAST_MIN,
  TEXT_CONTRAST_MIN,
} from "#shared/chart-beat/colour.mjs";

export type Country = {
  iso: string;
  path: string;
  box: { x: number; y: number; w: number; h: number };
  tile: { x: number; y: number; w: number; h: number };
  value: number | null;
  classIndex: number | null;
};
type Style = Record<string, string | number>;

export function DirectedCartogramScrolly({
  countries,
  context,
  seaFill,
  width,
  height,
  breaks,
  unit,
  missingLabel,
  subject,
  subjectNote,
  byArea,
  byCountry,
  missingNote,
  alt,
  regs,
  pad,
  stroke,
  ground,
  accent,
  ink,
  muted,
}: {
  countries: Country[];
  context: string[];
  seaFill: string;
  width: number;
  height: number;
  breaks: string[];
  unit: string;
  missingLabel: string;
  subject: string;
  subjectNote: string;
  byArea: { template: string; value: number };
  byCountry: { template: string; value: number };
  missingNote: string;
  alt: string;
  regs: Record<
    "display" | "eyebrow" | "body" | "axis" | "annot" | "value",
    Style
  >;
  pad: number;
  stroke: { rule?: number; hairline?: number };
  ground: string;
  accent: string;
  ink: string;
  muted: string;
}) {
  const floor = (colour: string, what: string) => {
    if (contrast(colour, ground) >= NON_TEXT_CONTRAST_MIN) return colour;
    const lifted = adjustToContrast(colour, ground, NON_TEXT_CONTRAST_MIN);
    if (!lifted)
      throw new Error(
        `${what} cannot be told from the ground: nothing clears ${NON_TEXT_CONTRAST_MIN}:1 against ${ground}`,
      );
    return lifted;
  };
  const low = floor(mix(accent, ground, 0.9), "the lowest class of the ramp");
  const high = mix(accent, ink, 0.3);
  const classCount = breaks.length + 1;
  const classFill = (i: number) =>
    mix(low, high, classCount > 1 ? i / (classCount - 1) : 0.5);
  /** The tile a class has not reached yet: one neutral, floored, so an equal tile still reads as a country. */
  const neutral = floor(mix(ground, ink, 0.22), "the neutral tile");
  const contextFill = mix(ground, ink, 0.07);
  const mutedInk = adjustToContrast(muted, ground, TEXT_CONTRAST_MIN) ?? muted;
  const accentInk =
    adjustToContrast(accent, ground, TEXT_CONTRAST_MIN) ?? accent;
  const inkOnGround = adjustToContrast(ink, ground, TEXT_CONTRAST_MIN) ?? ink;
  const hairline = stroke.hairline ?? 0.6;
  const abs = (extra: CSSProperties): CSSProperties => ({
    position: "absolute",
    ...extra,
  });
  const chip: CSSProperties = {
    background: ground,
    padding: "1px 5px",
    whiteSpace: "nowrap",
  };
  if (!countries.some((c) => c.iso === subject))
    throw new Error(`the subject ${subject} has no tile`);

  return (
    <div
      role="img"
      aria-label={alt}
      data-cartogram={JSON.stringify({
        width,
        height,
        subject,
        countries: countries.map(({ iso, box, tile, classIndex }) => ({
          iso,
          box,
          tile,
          classIndex,
        })),
        fills: {
          classes: Array.from({ length: classCount }, (_, i) => classFill(i)),
          neutral,
        },
        ink: { dark: inkOnGround, light: ground },
      })}
      style={{
        position: "absolute",
        inset: 0,
        background: ground,
        display: "grid",
        gridTemplateRows: "auto minmax(0, 1fr) auto",
        rowGap: "10px",
        // The page's own side gutter — the header's — so the map's edges line up with the title's.
        padding: `clamp(12px, 3vh, ${pad * 0.6}px) var(--prose-gutter, clamp(16px, 6vw, 56px))`,
      }}
    >
      <div
        data-part="count-panel"
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "4px 24px",
          justifyContent: "flex-end",
        }}
      >
        {[
          { part: "by-area", counter: byArea },
          { part: "by-country", counter: byCountry },
        ].map(({ part, counter }) => (
          <span
            key={part}
            data-part={part}
            data-template={counter.template}
            data-value={counter.value}
            style={{
              ...regs.value,
              color: part === "by-country" ? accentInk : inkOnGround,
              whiteSpace: "nowrap",

            }}
          >
            {counter.template.replace(
              "{n}",
              counter.value.toFixed(1).replace(".", ","),
            )}
          </span>
        ))}
      </div>

      {/* THE MAP FILLS ITS ROW, gutter to gutter (`cartogram-drive.mjs`, `fitViewBox`). */}
      <div data-part="stage" style={{ position: "relative", minHeight: 0, overflow: "hidden" }}>
        <svg
          data-part="field"
          xmlns="http://www.w3.org/2000/svg"
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="xMidYMid meet"
          style={abs({ inset: 0, width: "100%", height: "100%" })}
        >
          <defs>
            <clipPath id="cartogram-window">
              <rect x={-890} y={-490} width={width + 1780} height={height + 980} />
            </clipPath>
          </defs>
          <g clipPath="url(#cartogram-window)">
            {/* The map's sea, in the tint the sibling plates are baked in; it gives way to the ground as the
                countries become tiles, which float on the ground as on the static plate. */}
            <rect data-part="sea" x={-890} y={-490} width={width + 1780} height={height + 980} fill={seaFill} />
            <g data-part="context" style={{ opacity: 0 }}>
              {context.map((d, i) => (
                <path
                  key={`k${i}`}
                  d={d}
                  fill={contextFill}
                  stroke={ground}
                  strokeWidth={hairline}
                  vectorEffect="non-scaling-stroke"
                />
              ))}
            </g>
            {countries.map((c) => {
              const missing = c.value === null;
              const fill = missing ? ground : classFill(c.classIndex ?? 0);
              // The rect is drawn in the shape's own box; at the end of the morph that box IS the tile.
              return (
                <g
                  key={c.iso}
                  data-country={c.iso}
                  transform={`translate(${c.tile.x - c.box.x * (c.tile.w / c.box.w)} ${c.tile.y - c.box.y * (c.tile.h / c.box.h)}) scale(${c.tile.w / c.box.w} ${c.tile.h / c.box.h})`}
                >
                  <path
                    data-part="shape"
                    d={c.path}
                    fill={fill}
                    stroke={missing ? mutedInk : ground}
                    strokeWidth={missing ? 1 : hairline}
                    strokeDasharray={missing ? "3 2" : undefined}
                    vectorEffect="non-scaling-stroke"
                    style={{ opacity: 0 }}
                  />
                  <rect
                    data-part="tile"
                    x={c.box.x}
                    y={c.box.y}
                    width={c.box.w}
                    height={c.box.h}
                    fill={fill}
                    stroke={missing ? mutedInk : "none"}
                    strokeWidth={missing ? 1 : 0}
                    strokeDasharray={missing ? "4 3" : undefined}
                    vectorEffect="non-scaling-stroke"
                  />
                </g>
              );
            })}
          </g>
        </svg>

        {countries.map((c) => (
          <span
            key={`n${c.iso}`}
            data-name={c.iso}
            style={abs({
              ...regs.axis,
              left: 0,
              top: 0,
              transform: "translate(-50%, -50%)",
              whiteSpace: "nowrap",
              color:
                c.value === null
                  ? mutedInk
                  : (c.classIndex ?? 0) >= classCount / 2
                    ? ground
                    : inkOnGround,
            })}
          >
            {c.iso}
          </span>
        ))}
        <span
          data-part="subject-note"
          style={abs({
            ...regs.annot,
            ...chip,
            color: inkOnGround,
            left: 0,
            top: 0,
            opacity: 0,
          })}
        >
          {subjectNote}
        </span>
        <span
          data-part="missing-note"
          style={abs({
            ...regs.annot,
            ...chip,
            color: inkOnGround,
            left: 0,
            top: 0,
            opacity: 0,
          })}
        >
          {missingNote}
        </span>
      </div>

      <div
        data-part="key"
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "flex-start",
          gap: "6px 16px",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${classCount}, 34px)`,
            gap: "2px",
            paddingBottom: "1.5em",
            position: "relative",
          }}
        >
          {Array.from({ length: classCount }, (_, i) => (
            <div
              key={`c${i}`}
              data-class-swatch={i}
              style={{
                position: "relative",
                height: "12px",
                background: classFill(i),
              }}
            >
              {i < breaks.length && (
                <span
                  style={{
                    ...regs.axis,
                    color: mutedInk,
                    position: "absolute",
                    left: "100%",
                    top: "14px",
                    transform: "translateX(-50%)",
                    whiteSpace: "nowrap",
                  }}
                >
                  {breaks[i]}
                </span>
              )}
            </div>
          ))}
        </div>
        <div style={{ display: "grid", gap: "4px" }}>
          <span style={{ ...regs.axis, color: mutedInk }}>{unit}</span>
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
                width: "34px",
                height: "12px",
                border: `1px dashed ${mutedInk}`,
              }}
            />
            {missingLabel}
          </span>
        </div>
      </div>
    </div>
  );
}
