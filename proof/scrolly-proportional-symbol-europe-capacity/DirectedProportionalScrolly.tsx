/**
 * Europe's low-carbon power stations, one hollow circle each sized by capacity, drawn THROUGH the design base as a
 * proportional symbol map and CHOREOGRAPHED by the scroll. The `proportional symbol` type in the scrolly format: the
 * subject of `static-proportional-symbol-europe-capacity` — a hundredth of the sites carries a third of the power or
 * more — told with the gestures a scroll can make (`scrolly/references/directed-type-choreography.md`): the stations
 * arriving largest first while a counter keeps their share of the sites and of the power, nuclear isolated, the field
 * filled to all 8,900 until it closes, then the static plate's cut.
 *
 * THE STATIC PLATE'S RULES ARE THE FLOOR: area proportional to capacity, the radius on a square root and the key's
 * circles computed by the same function; hollow circles, so a large one never erases the small ones under it; the
 * basemap gives up its contrast; the cut is printed on the plate with its reason.
 *
 * `symbol-drive.mjs` paints the map on a canvas in the reader's pixels. What is rendered here is the last card's
 * picture as an SVG, for a reader without a script.
 */

import type { CSSProperties } from "react";
import {
  adjustToContrast,
  mix,
  NON_TEXT_CONTRAST_MIN,
  TEXT_CONTRAST_MIN,
} from "#shared/chart-beat/colour.mjs";

type Style = Record<string, string | number>;
type Box = { x: number; y: number; w: number; h: number };

export function DirectedProportionalScrolly({
  width,
  height,
  land,
  stations,
  subjectFuel,
  cumulative,
  threshold,
  europeBox,
  zoomBox,
  largest,
  sizes,
  tints,
  words,
  alt,
  regs,
  ground,
  accent,
  ink,
  muted,
}: {
  width: number;
  height: number;
  land: string;
  /** [x, y, fuel index, capacity in MW], largest first */
  stations: [number, number, number, number][];
  subjectFuel: number;
  /** running share of the capacity, in %, after each station largest first */
  cumulative: number[];
  threshold: number;
  europeBox: Box;
  zoomBox: Box;
  largest: string;
  sizes: { mw: number; label: string }[];
  tints: { water: string; land: string };
  words: {
    unit: string;
    counter: string;
    subjectNote: string;
    cutNote: string;
    circleIs: string;
    cut: string;
    total: string;
  };
  alt: string;
  regs: Record<
    "display" | "eyebrow" | "body" | "axis" | "annot" | "value",
    Style
  >;
  ground: string;
  accent: string;
  ink: string;
  muted: string;
}) {
  const { water, land: landFill } = tints;
  const coast = mix(landFill, ink, 0.12);
  const circle =
    adjustToContrast(accent, landFill, NON_TEXT_CONTRAST_MIN) ?? accent;
  const subject = adjustToContrast(ink, landFill, TEXT_CONTRAST_MIN) ?? ink;
  const accentInk =
    adjustToContrast(accent, ground, TEXT_CONTRAST_MIN) ?? accent;
  const inkOnGround = adjustToContrast(ink, ground, TEXT_CONTRAST_MIN) ?? ink;
  const mutedInk = adjustToContrast(muted, ground, TEXT_CONTRAST_MIN) ?? muted;
  const slot: CSSProperties = {
    gridArea: "1 / 1",
    justifySelf: "end",
    textAlign: "right",
  };
  const keyItem: CSSProperties = {
    ...regs.axis,
    color: mutedInk,
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
  };
  const maxMw = stations[0][3];
  const staticR = (mw: number) => 14 * Math.sqrt(mw / maxMw);

  return (
    <div
      role="img"
      aria-label={alt}
      data-symbols={JSON.stringify({
        width,
        height,
        land,
        stations,
        subjectFuel,
        cumulative,
        threshold,
        europeBox,
        zoomBox,
        colours: { water, land: landFill, coast, circle, subject },
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
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "space-between",
          alignItems: "baseline",
          gap: "4px 16px",
        }}
      >
        <span style={{ ...regs.axis, color: mutedInk, fontWeight: 700 }}>
          {words.unit}
        </span>
        <span style={{ display: "grid", marginLeft: "auto" }}>
          <span
            data-part="counter"
            data-template={words.counter}
            style={{ ...regs.value, ...slot, color: inkOnGround, opacity: 0 }}
          >
            {words.total}
          </span>
          <span
            data-part="subject-note"
            style={{ ...regs.value, ...slot, color: accentInk, opacity: 0 }}
          >
            {words.subjectNote}
          </span>
          <span
            data-part="cut-note"
            style={{ ...regs.value, ...slot, color: accentInk }}
          >
            {words.cutNote}
          </span>
        </span>
      </div>

      <div
        data-part="stage"
        style={{
          position: "relative",
          minHeight: 0,
          overflow: "hidden",
          background: water,
        }}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="xMidYMid slice"
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
          }}
        >
          <path
            d={land}
            fill={landFill}
            fillRule="evenodd"
            stroke={coast}
            strokeWidth={0.6}
          />
          {stations
            .filter((s) => s[3] >= threshold)
            .map((s, i) => (
              <circle
                key={i}
                cx={s[0]}
                cy={s[1]}
                r={staticR(s[3])}
                fill="none"
                stroke={circle}
                strokeWidth={s[2] === subjectFuel ? 1.4 : 0.9}
              />
            ))}
        </svg>
        <canvas
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
          }}
        />
        <span
          data-part="largest"
          style={{
            ...regs.annot,
            position: "absolute",
            left: 0,
            top: 0,
            color: inkOnGround,
            whiteSpace: "nowrap",
            textShadow: `0 0 2px ${landFill}, 0 0 3px ${landFill}, 0 0 4px ${landFill}`,
            opacity: 0,
          }}
        >
          {largest}
        </span>
      </div>

      <div style={{ display: "grid", gap: "4px" }}>
        <span
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "4px 14px",
            alignItems: "center",
          }}
        >
          <span style={keyItem}>{words.circleIs}</span>
          {sizes.map((s) => (
            <span key={s.mw} style={keyItem}>
              <span
                data-mw={s.mw}
                style={{
                  display: "inline-block",
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  boxShadow: `inset 0 0 0 1.5px ${circle}`,
                }}
              />
              {s.label}
            </span>
          ))}
        </span>
        <span data-part="cut" style={{ ...regs.axis, color: mutedInk }}>
          {words.cut}
        </span>
      </div>
    </div>
  );
}
