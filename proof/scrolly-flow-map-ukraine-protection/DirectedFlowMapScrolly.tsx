/**
 * Ukrainians under temporary protection in Europe, drawn THROUGH the design base as a flow map and CHOREOGRAPHED
 * by the scroll. The `flow map` type in the scrolly format: the subject of `static-flow-map-ukraine-protection` —
 * 4.5 million people, half of them in Germany and Poland — told with the gestures a scroll can make
 * (`scrolly/references/directed-type-choreography.md`): the bands traced out of Ukraine one by one, largest first,
 * the share they carry counted, the countries too small for a band dotted.
 *
 * THE STATIC PLATE'S RULES ARE THE FLOOR: width is the quantity, and the key states the scale in people; the route
 * is schematic and the basemap furniture — land one step off the ground, the sea the bare ground, no borders; one
 * colour for the field, the subject at full accent and the rest a tint of it; a band whose destination is outside
 * the frame is counted, not drawn.
 *
 * `flow-drive.mjs` fits the camera and traces the bands in the reader's pixels. What is rendered here is the last
 * card's picture, every band whole, for a reader without a script.
 */

import type { CSSProperties } from "react";
import {
  adjustToContrast,
  contrast,
  mix,
  TEXT_CONTRAST_MIN,
} from "#shared/chart-beat/colour.mjs";
import { SEA_LAND_MIN } from "#shared/map-beat/tints.mjs";

export type Band = {
  code: string;
  name: string;
  people: number;
  seat: [number, number];
  d: string;
  subject: boolean;
  label: string;
};
type Style = Record<string, string | number>;

export function DirectedFlowMapScrolly({
  land,
  width,
  height,
  focus,
  origin,
  originName,
  originCode,
  bands,
  others,
  total,
  keySizes,
  words,
  alt,
  regs,
  ground,
  accent,
  ink,
  muted,
}: {
  land: string;
  width: number;
  height: number;
  focus: { x: number; y: number; w: number; h: number };
  origin: [number, number];
  originName: string;
  originCode: string;
  bands: Band[];
  others: { code: string; seat: [number, number] }[];
  total: number;
  keySizes: { people: number; label: string }[];
  words: {
    unit: string;
    totalNote: string;
    count: string;
    othersNote: string;
    drawnNote: string;
    othersKey: string;
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
  /** The land one step off the bare-ground sea: the static plate's 0.075 of the ink as a floor, raised until the
   *  coast clears `SEA_LAND_MIN` — on `nocturne`'s navy the floor alone does not. */
  let dose = 0.075;
  while (contrast(mix(ground, ink, dose), ground) < SEA_LAND_MIN && dose < 0.4)
    dose += 0.005;
  const landFill = mix(ground, ink, dose);
  const flow = mix(accent, ground, 0.38);
  const accentInk =
    adjustToContrast(accent, ground, TEXT_CONTRAST_MIN) ?? accent;
  const inkOnGround = adjustToContrast(ink, ground, TEXT_CONTRAST_MIN) ?? ink;
  const mutedInk = adjustToContrast(muted, ground, TEXT_CONTRAST_MIN) ?? muted;
  const slot: CSSProperties = {
    gridArea: "1 / 1",
    justifySelf: "end",
    textAlign: "right",
  };
  const halo = `0 0 3px ${landFill}, 0 0 3px ${landFill}, 0 0 2px ${landFill}`;

  return (
    <div
      role="img"
      aria-label={alt}
      data-flow={JSON.stringify({
        focus,
        origin,
        originCode,
        total,
        bands: bands.map(({ code, people, seat, subject }) => ({
          code,
          people,
          seat,
          subject,
        })),
        others,
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
            data-part="total-note"
            style={{ ...regs.value, ...slot, color: inkOnGround, opacity: 0 }}
          >
            {words.totalNote}
          </span>
          <span
            data-part="count"
            data-template={words.count}
            style={{ ...regs.value, ...slot, color: accentInk, opacity: 0 }}
          >
            {words.count.replace("{p}", "")}
          </span>
          <span
            data-part="others-note"
            style={{ ...regs.value, ...slot, color: inkOnGround }}
          >
            {words.othersNote}
          </span>
        </span>
      </div>

      <div
        data-part="stage"
        style={{
          position: "relative",
          minHeight: 0,
          overflow: "hidden",
          background: ground,
        }}
      >
        <svg
          data-part="field"
          xmlns="http://www.w3.org/2000/svg"
          viewBox={`${focus.x} ${focus.y} ${focus.w} ${focus.h}`}
          preserveAspectRatio="xMidYMid meet"
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
          }}
        >
          <path d={land} fill={landFill} fillRule="evenodd" />
          {others.map((o) => (
            <circle
              key={o.code}
              data-other={o.code}
              cx={o.seat[0]}
              cy={o.seat[1]}
              r={2.5}
              fill={flow}
            />
          ))}
          {bands.map((b) => (
            <path
              key={b.code}
              data-band={b.code}
              d={b.d}
              fill="none"
              stroke={b.subject ? accent : flow}
              strokeWidth={Math.max(1, (14 * b.people) / bands[0].people)}
              pathLength={1}
              strokeDasharray="1 1"
              strokeLinecap="butt"
            />
          ))}
          <circle
            data-part="node"
            cx={origin[0]}
            cy={origin[1]}
            r={16}
            fill={ground}
            stroke={inkOnGround}
            strokeWidth={1.5}
          />
        </svg>
        {bands.map((b) => (
          <span
            key={b.code}
            data-band-label={b.code}
            style={{
              ...regs.axis,
              position: "absolute",
              left: `${((b.seat[0] - focus.x) / focus.w) * 100}%`,
              top: `${((b.seat[1] - focus.y) / focus.h) * 100}%`,
              whiteSpace: "nowrap",
              color: b.subject ? accentInk : inkOnGround,
              textShadow: halo,
            }}
          >
            {b.label}
          </span>
        ))}
        <span
          data-part="node-label"
          style={{
            ...regs.value,
            position: "absolute",
            left: `${((origin[0] - focus.x) / focus.w) * 100}%`,
            top: `${((origin[1] - focus.y) / focus.h) * 100}%`,
            transform: "translate(-50%, -50%)",
            whiteSpace: "nowrap",
            color: inkOnGround,
            fontWeight: 700,
          }}
        >
          {originName}
        </span>
      </div>

      <div
        data-part="key"
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: "4px 18px",
        }}
      >
        {keySizes.map((k) => (
          <span
            key={k.people}
            style={{
              ...regs.axis,
              color: mutedInk,
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <span
              data-people={k.people}
              style={{
                display: "inline-block",
                width: "34px",
                height: "8px",
                background: flow,
              }}
            />
            {k.label}
          </span>
        ))}
        <span style={{ ...regs.axis, color: mutedInk }}>{words.drawnNote}</span>
        <span
          style={{
            ...regs.axis,
            color: mutedInk,
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
          }}
        >
          <span
            style={{
              display: "inline-block",
              width: "5px",
              height: "5px",
              borderRadius: "50%",
              background: flow,
            }}
          />
          {words.othersKey}
        </span>
      </div>
    </div>
  );
}
