/**
 * Where Europe's largest low-carbon power station is, drawn THROUGH the design base as a locator map and CHOREOGRAPHED
 * by the scroll. The `locator` type in the scrolly format: the subject of `static-locator-zaporizhzhia` — Zaporizhzhia,
 * 6,000 MW, in the one European country whose 2024 generation is not reported — told with the gestures a scroll can
 * make (`scrolly/references/directed-type-choreography.md`): the largest stations across Europe, the country singled
 * out, the camera closing on the region, the three classes of place named, the station ringed.
 *
 * THE STATIC PLATE'S RULES ARE THE FLOOR: three classes of place, three treatments — countries in the axis register,
 * uppercased and tracked, in the muted ink; settlements in mixed case on an open dot; water in italic in the water
 * tint; the subject in the accent, ringed. The basemap gives up its contrast. Labels are pushed, never laid on another.
 *
 * `locator-drive.mjs` moves the camera and seats every label in the reader's pixels. What is rendered here is the last
 * card's picture, for a reader without a script.
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
export type Label = {
  id: string;
  kind: "area" | "place" | "water" | "station" | "subject";
  text: string;
  x: number;
  y: number;
  mw?: number;
};

export function DirectedLocatorScrolly({
  width,
  height,
  countries,
  subjectCountry,
  europeBox,
  zoomBox,
  stations,
  subject,
  labels,
  words,
  alt,
  regs,
  stroke,
  ground,
  accent,
  ink,
  muted,
  tints,
}: {
  width: number;
  height: number;
  countries: Record<string, string>;
  subjectCountry: string;
  europeBox: Box;
  zoomBox: Box;
  stations: { id: string; x: number; y: number; mw: number }[];
  subject: { x: number; y: number };
  labels: Label[];
  words: {
    unit: string;
    topNote: string;
    countryNote: string;
    zoomNote: string;
    subjectNote: string;
    limitNote: string;
  };
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
  tints: { water: string; land: string };
}) {
  const accentInk =
    adjustToContrast(accent, ground, TEXT_CONTRAST_MIN) ?? accent;
  const accentMark =
    adjustToContrast(accent, tints.land, NON_TEXT_CONTRAST_MIN) ?? accent;
  const mutedInk =
    adjustToContrast(muted, tints.land, TEXT_CONTRAST_MIN) ?? muted;
  const inkOnLand = adjustToContrast(ink, tints.land, TEXT_CONTRAST_MIN) ?? ink;
  const waterInk =
    adjustToContrast(mix(accent, ink, 0.2), tints.water, TEXT_CONTRAST_MIN) ??
    inkOnLand;
  const border = mix(tints.land, ink, 0.18);
  const unreported = mix(tints.land, ink, 0.07);
  const stationDot =
    adjustToContrast(
      mix(accent, ground, 0.3),
      tints.land,
      NON_TEXT_CONTRAST_MIN,
    ) ?? accent;
  const slot: CSSProperties = {
    gridArea: "1 / 1",
    justifySelf: "end",
    textAlign: "right",
  };
  const halo = `0 0 3px ${tints.land}, 0 0 3px ${tints.land}, 0 0 2px ${tints.land}`;
  const styleOf = (kind: Label["kind"]): CSSProperties => {
    if (kind === "area")
      return {
        ...regs.axis,
        color: mutedInk,
        textTransform: "uppercase",
        letterSpacing: "0.12em",
      };
    if (kind === "place")
      return { ...regs.annot, color: inkOnLand, fontStyle: "normal", textTransform: "none", letterSpacing: "normal" };
    if (kind === "water")
      return {
        ...regs.annot,
        color: waterInk,
        fontStyle: "italic",
        textShadow: "none",
        textTransform: "none",
        letterSpacing: "normal",
      };
    if (kind === "subject")
      return { ...regs.value, color: accentInk, fontWeight: 700, textTransform: "none" };
    return { ...regs.axis, color: inkOnLand };
  };

  return (
    <div
      role="img"
      aria-label={alt}
      data-locator={JSON.stringify({
        width,
        height,
        europeBox,
        zoomBox,
        stations,
        subject,
        labels: labels.map(({ id, kind, x, y, mw }) => ({ id, kind, x, y, mw })),
        subjectCountry,
      })}
      style={{
        position: "absolute",
        inset: 0,
        background: ground,
        display: "grid",
        gridTemplateRows: "auto minmax(0, 1fr)",
        gridTemplateColumns: "minmax(0, 1fr)",
        rowGap: "8px",
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
        <span
          style={{
            ...regs.axis,
            color: adjustToContrast(muted, ground, TEXT_CONTRAST_MIN) ?? muted,
            fontWeight: 700,
          }}
        >
          {words.unit}
        </span>
        <span style={{ display: "grid", marginLeft: "auto" }}>
          {(
            [
              "topNote",
              "countryNote",
              "zoomNote",
              "subjectNote",
              "limitNote",
            ] as const
          ).map((k) => (
            <span
              key={k}
              data-note={k}
              style={{ ...regs.value, ...slot, color: accentInk, opacity: 0 }}
            >
              {words[k]}
            </span>
          ))}
        </span>
      </div>

      <div
        data-part="stage"
        style={{
          position: "relative",
          minHeight: 0,
          overflow: "hidden",
          background: tints.water,
        }}
      >
        <svg
          data-part="field"
          xmlns="http://www.w3.org/2000/svg"
          viewBox={`${zoomBox.x} ${zoomBox.y} ${zoomBox.w} ${zoomBox.h}`}
          preserveAspectRatio="xMidYMid slice"
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
          }}
        >
          {Object.entries(countries).map(([iso, d]) => (
            <path
              key={iso}
              data-country={iso}
              d={d}
              fill={iso === subjectCountry ? unreported : tints.land}
              stroke={border}
              strokeWidth={stroke.hairline ?? 0.6}
              vectorEffect="non-scaling-stroke"
              fillRule="evenodd"
            />
          ))}
          <path
            data-part="country-outline"
            d={countries[subjectCountry]}
            fill="none"
            stroke={accentMark}
            strokeWidth={(stroke.rule ?? 1) * 1.8}
            vectorEffect="non-scaling-stroke"
            opacity={0}
          />
          {stations.map((s) => (
            <circle
              key={s.id}
              data-station={s.id}
              cx={s.x}
              cy={s.y}
              r={3}
              fill={stationDot}
              opacity={0}
            />
          ))}
          {labels
            .filter((l) => l.kind === "place")
            .map((l) => (
              <circle
                key={`d${l.id}`}
                data-place-dot={l.id}
                cx={l.x}
                cy={l.y}
                r={1.5}
                fill={tints.land}
                stroke={inkOnLand}
                strokeWidth={1.2}
                vectorEffect="non-scaling-stroke"
              />
            ))}
          <circle
            data-part="subject-dot"
            cx={subject.x}
            cy={subject.y}
            r={2}
            fill={accentMark}
          />
          <circle
            data-part="subject-ring"
            cx={subject.x}
            cy={subject.y}
            r={4}
            fill="none"
            stroke={accentMark}
            strokeWidth={2}
            vectorEffect="non-scaling-stroke"
          />
        </svg>
        {labels.map((l) => (
          <span
            key={l.id}
            data-label={l.id}
            data-kind={l.kind}
            style={{
              ...styleOf(l.kind),
              position: "absolute",
              left: 0,
              top: 0,
              whiteSpace: "nowrap",
              textShadow: l.kind === "water" ? "none" : halo,
            }}
          >
            {l.text}
          </span>
        ))}
      </div>
    </div>
  );
}
