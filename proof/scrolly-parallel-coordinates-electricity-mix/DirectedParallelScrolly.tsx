/**
 * Sixteen European electricity mixes, 2024, drawn THROUGH the design base as parallel coordinates and CHOREOGRAPHED by
 * the scroll. The `parallel coordinates` type in the scrolly format: the subject of
 * `static-parallel-coordinates-electricity-mix` — five countries above 25 % nuclear, ten above 20 % wind, two doing
 * both — told with the gestures a scroll can make (`scrolly/references/directed-type-choreography.md`): one axis, then
 * its neighbour and the lines between them, the crossing measured, the rest of the mix unfolded axis by axis.
 *
 * THE STATIC PLATE'S RULES ARE THE FLOOR: every axis keeps its own scale and prints its own ceiling, the zero drawn once;
 * only adjacent axes are compared, so nuclear sits beside wind; colour is the derived category (the countries clearing
 * both floors), never the value; every line named once, at the axis where its own value is highest, and a name never
 * crosses a rail that is not its own.
 *
 * `parallel-drive.mjs` lays out every rail, line and name in the reader's pixels on each paint. What is rendered here
 * is the last card's picture, for a reader without a script.
 */

import type { CSSProperties } from "react";
import {
  adjustToContrast,
  contrast,
  mix,
  NON_TEXT_CONTRAST_MIN,
  TEXT_CONTRAST_MIN,
} from "#shared/chart-beat/colour.mjs";

export type Axis = {
  name: string;
  ceiling: number;
  floor: number | null;
  floorText: string;
};
export type Line = {
  code: string;
  name: string;
  values: number[];
  valueTexts: string[];
  thread: boolean;
};
type Style = Record<string, string | number>;

export const NOTES = [
  "nuclearNote",
  "windNote",
  "bothNote",
  "scaleNote",
  "fossilNote",
  "threadNote",
] as const;

export function DirectedParallelScrolly({
  axes,
  lines,
  words,
  alt,
  regs,
  stroke,
  ground,
  accent,
  ink,
  muted,
}: {
  axes: Axis[];
  lines: Line[];
  words: Record<(typeof NOTES)[number] | "unit", string>;
  alt: string;
  regs: Record<
    "display" | "eyebrow" | "body" | "axis" | "annot" | "value",
    Style
  >;
  stroke: { rule?: number };
  ground: string;
  accent: string;
  ink: string;
  muted: string;
}) {
  const rule = stroke.rule ?? 1;
  /** The field is a tint of the accent, lifted until fourteen lines can be told from the ground. */
  let field = mix(accent, ground, 0.55);
  if (contrast(field, ground) < NON_TEXT_CONTRAST_MIN)
    field =
      adjustToContrast(field, ground, NON_TEXT_CONTRAST_MIN) ??
      mix(accent, ground, 0.3);
  const railInk = mix(ground, ink, 0.35);
  const accentInk =
    adjustToContrast(accent, ground, TEXT_CONTRAST_MIN) ?? accent;
  const mutedInk = adjustToContrast(muted, ground, TEXT_CONTRAST_MIN) ?? muted;
  const halo = `0 0 2px ${ground}, 0 0 2px ${ground}, 0 0 3px ${ground}, 0 0 4px ${ground}`;
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
  const nameStyle = (l: Line): CSSProperties =>
    abs({
      ...regs.axis,
      color: l.thread ? accentInk : mutedInk,
      fontWeight: l.thread ? 700 : regs.axis.fontWeight,
      textShadow: halo,
      opacity: 0,
    });

  return (
    <div
      role="img"
      aria-label={alt}
      data-parallel={JSON.stringify({
        axes: axes.map((a) => ({ ceiling: a.ceiling, floor: a.floor })),
        lines: lines.map((l) => ({
          code: l.code,
          values: l.values,
          thread: l.thread,
        })),
        field,
        accent,
        rule,
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
          {words.unit}
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
        <svg
          data-part="field"
          xmlns="http://www.w3.org/2000/svg"
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            overflow: "visible",
          }}
        >
          {axes.map((a, i) => (
            <line
              key={a.name}
              data-rail={i}
              stroke={railInk}
              strokeWidth={rule}
            />
          ))}
          {lines
            .filter((l) => !l.thread)
            .concat(lines.filter((l) => l.thread))
            .map((l) => (
              <path
                key={l.code}
                data-line={l.code}
                fill="none"
                stroke={l.thread ? accent : field}
                strokeWidth={l.thread ? rule * 2.2 : rule}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            ))}
          {lines.map((l) =>
            axes.map((_, i) => (
              <circle
                key={`${l.code}${i}`}
                data-dot={`${l.code}:${i}`}
                r={3}
                fill={field}
                opacity={0}
              />
            )),
          )}
          {axes.map((a, i) =>
            a.floor === null ? null : (
              <line
                key={`f${a.name}`}
                data-floor={i}
                stroke={accentInk}
                strokeWidth={rule * 1.5}
                strokeDasharray="3 2"
                opacity={0}
              />
            ),
          )}
        </svg>

        {axes.map((a, i) => (
          <span
            key={`n${a.name}`}
            data-axis-name={i}
            style={abs({ ...regs.axis, color: mutedInk, fontWeight: 700 })}
          >
            {a.name}
          </span>
        ))}
        {axes.map((a, i) => (
          <span
            key={`c${a.name}`}
            data-ceiling={i}
            style={abs({ ...regs.axis, color: mutedInk })}
          >
            {`${a.ceiling} %`}
          </span>
        ))}
        <span data-part="zero" style={abs({ ...regs.axis, color: mutedInk })}>
          0
        </span>
        {axes.map((a, i) =>
          a.floor === null ? null : (
            <span
              key={`fl${a.name}`}
              data-floor-label={i}
              style={abs({
                ...regs.axis,
                color: accentInk,
                fontWeight: 700,
                textShadow: halo,
                opacity: 0,
              })}
            >
              {a.floorText}
            </span>
          ),
        )}
        {lines.map((l) =>
          (["n", "w", "seat"] as const).map((k) => (
            <span
              key={`${l.code}${k}`}
              data-name={`${l.code}:${k}`}
              style={nameStyle(l)}
            >
              {l.name}
            </span>
          )),
        )}
        {lines
          .filter((l) => l.thread)
          .map((l) =>
            l.valueTexts.map((t, i) => (
              <span
                key={`${l.code}v${i}`}
                data-value={`${l.code}:${i}`}
                style={abs({
                  ...regs.value,
                  color: accentInk,
                  textShadow: halo,
                  opacity: 0,
                })}
              >
                {t}
              </span>
            )),
          )}
      </div>
    </div>
  );
}
