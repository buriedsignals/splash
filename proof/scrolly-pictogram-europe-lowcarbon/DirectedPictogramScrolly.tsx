/**
 * Forty European countries, one square each, drawn THROUGH the design base as a unit grid and CHOREOGRAPHED by the
 * scroll. The `pictogram` type in the scrolly format: the subject of `static-pictogram-europe-lowcarbon` — sixteen
 * countries above 75 % low-carbon electricity, eighteen below 60 %, six in between — told with the gestures a scroll
 * can make (`scrolly/references/directed-type-choreography.md`): every square set down at its own share on an axis, two
 * floors drawn, then the squares leaving the axis to be counted in three blocks.
 *
 * THE STATIC PLATE'S RULES ARE THE FLOOR: one square is one country, never a quantity; each block prints its own count,
 * in countries; the fill is a class of one ramp between the direction's own poles, its breaks in a key; the country
 * with no reading is not drawn, and the key says so.
 *
 * `pictogram-drive.mjs` lays out every square in the reader's pixels on each paint. What is rendered here is the last
 * card's picture, for a reader without a script.
 */

import type { CSSProperties } from "react";
import {
  adjustToContrast,
  mix,
  TEXT_CONTRAST_MIN,
} from "#shared/chart-beat/colour.mjs";

export type Unit = {
  key: string;
  label: string;
  share: number;
  classIndex: number;
  block: number;
};
export type Block = { name: string; count: number; thread: boolean };
type Style = Record<string, string | number>;

export const NOTES = [
  "spanNote",
  "floorNote",
  "countNote",
  "middleNote",
  "endsNote",
] as const;

export function DirectedPictogramScrolly({
  units,
  blocks,
  breaks,
  ticks,
  floors,
  words,
  alt,
  regs,
  ground,
  accent,
  ink,
  muted,
  grid,
}: {
  units: Unit[];
  blocks: Block[];
  breaks: string[];
  ticks: { value: number; text: string }[];
  floors: { value: number; text: string }[];
  words: Record<
    | (typeof NOTES)[number]
    | "absenceNote"
    | "unitIs"
    | "lowEnd"
    | "highEnd"
    | "middleNames",
    string
  >;
  alt: string;
  regs: Record<
    "display" | "eyebrow" | "body" | "axis" | "annot" | "value",
    Style
  >;
  ground: string;
  accent: string;
  ink: string;
  muted: string;
  grid: string;
}) {
  /** One hue, five classes, lightness falling the whole way — the static plate's ramp. */
  const low = mix(accent, ground, 0.9);
  const high = mix(accent, ink, 0.3);
  const classCount = breaks.length + 1;
  const classFill = (i: number) => mix(low, high, i / (classCount - 1));
  const neutral = mix(accent, ground, 0.5);
  const accentInk =
    adjustToContrast(accent, ground, TEXT_CONTRAST_MIN) ?? accent;
  const mutedInk = adjustToContrast(muted, ground, TEXT_CONTRAST_MIN) ?? muted;
  const abs = (extra: CSSProperties): CSSProperties => ({
    position: "absolute",
    left: 0,
    top: 0,
    whiteSpace: "nowrap",
    ...extra,
  });
  const slot: CSSProperties = {
    gridArea: "1 / 1",
    justifySelf: "end",
    textAlign: "right",
  };
  const rule = mix(ground, ink, 0.45);

  return (
    <div
      role="img"
      aria-label={alt}
      data-pictogram={JSON.stringify({
        units: units.map(({ key, share, block }) => ({ key, share, block })),
        blockCount: blocks.length,
        ticks: ticks.map((t) => t.value),
        floors: floors.map((f) => f.value),
        fills: units.map((u) => classFill(u.classIndex)),
        neutral,
        notes: NOTES,
      })}
      style={{
        position: "absolute",
        inset: 0,
        background: ground,
        display: "grid",
        gridTemplateRows: "auto minmax(0, 1fr)",
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
          {words.unitIs}
        </span>
        <span style={{ display: "grid", marginLeft: "auto" }}>
          {NOTES.map((k) => (
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

      <div data-part="stage" style={{ position: "relative", minHeight: 0 }}>
        <div
          data-part="axis"
          style={abs({
            height: "0px",
            borderTop: `1px solid ${rule}`,
            opacity: 0,
          })}
        />
        {ticks.map((t) => (
          <span
            key={t.text}
            data-tick={t.value}
            style={abs({ ...regs.axis, color: mutedInk, opacity: 0 })}
          >
            {t.text}
          </span>
        ))}
        {floors.map((f) => (
          <div key={f.text} data-floor={f.value}>
            <div
              data-part="floor-rule"
              style={abs({
                width: "0px",
                borderLeft: `1.5px dashed ${accentInk}`,
                opacity: 0,
              })}
            />
            <span
              data-part="floor-label"
              style={abs({
                ...regs.axis,
                color: accentInk,
                fontWeight: 700,
                opacity: 0,
              })}
            >
              {f.text}
            </span>
          </div>
        ))}
        <span
          data-part="low-end"
          style={abs({ ...regs.annot, color: mutedInk, opacity: 0 })}
        >
          {words.lowEnd}
        </span>
        <span
          data-part="high-end"
          style={abs({ ...regs.annot, color: mutedInk, opacity: 0 })}
        >
          {words.highEnd}
        </span>

        {units.map((u) => (
          <div
            key={u.key}
            data-unit={u.key}
            style={abs({
              background: classFill(u.classIndex),
              boxShadow: `inset 0 0 0 1px ${grid}`,
              width: "20px",
              height: "20px",
            })}
          />
        ))}

        {blocks.map((b, i) => (
          <span
            key={b.name}
            data-block-label={i}
            style={abs({
              ...regs.annot,
              color: b.thread ? accentInk : mutedInk,
              whiteSpace: "normal",
              opacity: 0,
            })}
          >
            <span
              style={{
                ...regs.value,
                color: b.thread ? accentInk : mutedInk,
                fontWeight: 700,
                marginRight: "0.45em",
              }}
            >
              {b.count}
            </span>
            {b.name}
          </span>
        ))}
        <span
          data-part="middle-names"
          style={abs({
            ...regs.annot,
            color: inkOr(ink, ground),
            whiteSpace: "normal",
            opacity: 0,
          })}
        >
          {words.middleNames}
        </span>

        <div
          data-part="key"
          style={abs({
            display: "flex",
            alignItems: "flex-start",
            gap: "12px",
            opacity: 0,
          })}
        >
          <div style={{ display: "flex" }}>
            {Array.from({ length: classCount }, (_, i) => (
              <div key={i} style={{ position: "relative", width: "40px" }}>
                <div
                  style={{
                    height: "10px",
                    marginRight: "1px",
                    background: classFill(i),
                    boxShadow: `inset 0 0 0 1px ${grid}`,
                  }}
                />
                {i > 0 && (
                  <span
                    style={{
                      ...regs.axis,
                      position: "absolute",
                      left: 0,
                      top: "12px",
                      transform: "translateX(-50%)",
                      whiteSpace: "nowrap",
                      color:
                        adjustToContrast(
                          classFill(i),
                          ground,
                          TEXT_CONTRAST_MIN,
                        ) ?? mutedInk,
                    }}
                  >
                    {breaks[i - 1]}
                  </span>
                )}
              </div>
            ))}
          </div>
          <span
            data-part="absence"
            style={{ ...regs.axis, color: mutedInk, whiteSpace: "normal" }}
          >
            {words.absenceNote}
          </span>
        </div>
      </div>
    </div>
  );
}

function inkOr(ink: string, ground: string) {
  return adjustToContrast(ink, ground, TEXT_CONTRAST_MIN) ?? ink;
}
