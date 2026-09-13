/**
 * Europe's low-carbon power stations, one dot each, drawn THROUGH the design base as a dot density map and
 * CHOREOGRAPHED by the scroll. The `dot density` type in the scrolly format: the subject of
 * `static-dot-density-europe-stations` — 72 nuclear sites among 8,900 stations, a third of the capacity — told
 * with the gestures a scroll can make (`scrolly/references/directed-type-choreography.md`): the stations
 * arriving fuel by fuel, the nuclear sites ringed, the same dots going from a count to a weight, the camera
 * closing on the country with most of the sites.
 *
 * THE STATIC PLATE'S RULES ARE THE FLOOR: one dot is one station, at its own coordinates; one hue for the field,
 * the subject ringed rather than recoloured; the basemap gives up its contrast; the database's limit stated
 * beside the key.
 *
 * `dot-drive.mjs` paints the map on a canvas in the reader's pixels. What is rendered here is the last card's
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

export function DirectedDotDensityScrolly({
  width,
  height,
  land,
  stations,
  fuels,
  arrival,
  subjectFuel,
  zoomBox,
  europeBox,
  sizes,
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
  /** [x, y, fuel index, capacity in MW] */
  stations: [number, number, number, number][];
  fuels: string[];
  arrival: number[];
  subjectFuel: number;
  zoomBox: { x: number; y: number; w: number; h: number };
  europeBox: { x: number; y: number; w: number; h: number };
  sizes: { mw: number; label: string }[];
  words: {
    unit: string;
    count: string;
    subjectNote: string;
    weightNote: string;
    zoomNote: string;
    dotIs: string;
    subjectIs: string;
    weightIs: string;
    limit: string;
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
  /** The static render's own plate tints: the land a step toward the ink, the water a trace of the accent — the
   *  marks all sit on land, so the land reads as figure and the sea as ground. */
  const water = mix(ground, accent, 0.09);
  const landFill = mix(ground, ink, 0.16);
  const coast = mix(ground, ink, 0.26);
  const dot =
    adjustToContrast(accent, landFill, NON_TEXT_CONTRAST_MIN) ?? accent;
  const subject =
    adjustToContrast(mix(accent, ink, 0.35), landFill, NON_TEXT_CONTRAST_MIN) ??
    ink;
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

  return (
    <div
      role="img"
      aria-label={alt}
      data-dots={JSON.stringify({
        width,
        height,
        land,
        stations,
        fuels,
        arrival,
        subjectFuel,
        zoomBox,
        europeBox,
        colours: { water, land: landFill, coast, dot, subject },
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
            data-part="count"
            data-template={words.count}
            style={{ ...regs.value, ...slot, color: inkOnGround, opacity: 0 }}
          >
            {words.count.replace("{n}", "")}
          </span>
          <span
            data-part="subject-note"
            style={{ ...regs.value, ...slot, color: accentInk }}
          >
            {words.subjectNote}
          </span>
          <span
            data-part="weight-note"
            style={{ ...regs.value, ...slot, color: accentInk, opacity: 0 }}
          >
            {words.weightNote}
          </span>
          <span
            data-part="zoom-note"
            style={{ ...regs.value, ...slot, color: accentInk, opacity: 0 }}
          >
            {words.zoomNote}
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
          <path
            d={stations
              .filter((s) => s[2] !== subjectFuel)
              .map((s) => `M${s[0]} ${s[1]}h1.4v1.4h-1.4z`)
              .join("")}
            fill={dot}
          />
          {stations
            .filter((s) => s[2] === subjectFuel)
            .map((s, i) => (
              <circle
                key={i}
                cx={s[0]}
                cy={s[1]}
                r={3.5}
                fill="none"
                stroke={subject}
                strokeWidth={1}
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
      </div>

      <div style={{ display: "grid", gap: "4px" }}>
        <div style={{ display: "grid" }}>
          <span
            data-part="key-count"
            style={{
              gridArea: "1 / 1",
              display: "flex",
              flexWrap: "wrap",
              gap: "4px 18px",
              alignItems: "center",
            }}
          >
            <span style={keyItem}>
              <span
                style={{
                  display: "inline-block",
                  width: "4px",
                  height: "4px",
                  borderRadius: "50%",
                  background: dot,
                }}
              />
              {words.dotIs}
            </span>
            <span style={{ ...keyItem, color: accentInk }}>
              <span
                style={{
                  display: "inline-block",
                  width: "9px",
                  height: "9px",
                  borderRadius: "50%",
                  boxShadow: `inset 0 0 0 1.2px ${subject}`,
                }}
              />
              {words.subjectIs}
            </span>
          </span>
          <span
            data-part="key-weight"
            style={{
              gridArea: "1 / 1",
              display: "flex",
              flexWrap: "wrap",
              gap: "4px 14px",
              alignItems: "center",
              opacity: 0,
            }}
          >
            <span style={keyItem}>{words.weightIs}</span>
            {sizes.map((s) => (
              <span key={s.mw} style={keyItem}>
                <span
                  data-mw={s.mw}
                  style={{
                    display: "inline-block",
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    background: dot,
                    opacity: 0.6,
                  }}
                />
                {s.label}
              </span>
            ))}
          </span>
        </div>
        <span style={{ ...regs.axis, color: mutedInk }}>{words.limit}</span>
      </div>
    </div>
  );
}
