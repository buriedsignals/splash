/**
 * Six electricity mixes in 2024, drawn THROUGH the design base as a diverging stacked bar and CHOREOGRAPHED
 * by the scroll. The `diverging stacked bar` type in the scrolly format: the subject of
 * `static-diverging-stacked-electricity` — nuclear holds the centre, and in France it outweighs fossil and
 * renewables put together — told with the gestures a scroll can make
 * (`scrolly/references/directed-type-choreography.md`): plain 100 % bars first, then each slid until its
 * nuclear straddles the axis, each camp read on its own, France's two camps laid end to end under its nuclear.
 *
 * THE STATIC PLATE'S RULES ARE THE FLOOR: fossil left, renewables right, nuclear straddling the centre; one
 * ramp per side deepening outward (fossil toward the ink, renewables toward the accent); the neutral lighter
 * than either ramp's first step and achromatic; totals outside the bar, at its ends.
 *
 * Every mark is placed by `diverging-stack-drive.mjs` in the reader's pixels on each paint; what is rendered
 * here is the last card's picture in percentages, for a reader without a script.
 */

import type { CSSProperties } from "react";
import {
  adjustToContrast,
  contrast,
  mix,
  TEXT_CONTRAST_MIN,
} from "#shared/chart-beat/colour.mjs";

const CENTRE_MIN = 1.6;

export type Segment = {
  key: string;
  label: string;
  value: number;
  side: "left" | "centre" | "right";
  step: number;
};
export type Row = {
  code: string;
  name: string;
  fossil: number;
  nuclear: number;
  renewable: number;
  segments: Segment[];
};
type Style = Record<string, string | number>;

export function DirectedDivergingStackScrolly({
  rows,
  subject,
  leaningLeft,
  leaningRight,
  legend,
  words,
  ticks,
  alt,
  regs,
  stroke,
  ground,
  accent,
  ink,
  muted,
}: {
  rows: Row[];
  subject: string;
  leaningLeft: string;
  leaningRight: string;
  legend: {
    left: { name: string; levels: string[] };
    centre: string;
    right: { name: string; levels: string[] };
  };
  words: {
    unit: string;
    leftNote: string;
    rightNote: string;
    compareNote: string;
    format: Record<string, string>;
  };
  ticks: { stack: number[]; diverging: number[] };
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
  const leftLevels = legend.left.levels.length;
  const rightLevels = legend.right.levels.length;
  const leftFill = (i: number) =>
    mix(
      mix(muted, ground, 0.2),
      ink,
      (leftLevels > 1 ? i / (leftLevels - 1) : 0.5) * 0.6,
    );
  const rightFill = (i: number) =>
    mix(
      mix(accent, ground, 0.7),
      accent,
      rightLevels > 1 ? i / (rightLevels - 1) : 0.5,
    );
  /** The static plate's neutral is 0.14 of the ink: on a light ground a pale mass, on `nocturne`'s navy a
   *  near-black one the eye loses against the page. Floored at CENTRE_MIN against the ground. */
  let centreDose = 0.14;
  while (contrast(mix(ground, ink, centreDose), ground) < CENTRE_MIN && centreDose < 0.6) centreDose += 0.01;
  const centreFill = mix(ground, ink, centreDose);
  const fillOf = (s: Segment) =>
    s.side === "left"
      ? leftFill(s.step)
      : s.side === "right"
        ? rightFill(s.step)
        : centreFill;
  const accentInk =
    adjustToContrast(accent, ground, TEXT_CONTRAST_MIN) ?? accent;
  const mutedInk = adjustToContrast(muted, ground, TEXT_CONTRAST_MIN) ?? muted;
  const inkOnGround = adjustToContrast(ink, ground, TEXT_CONTRAST_MIN) ?? ink;
  const rule = stroke.rule ?? 1;
  const abs = (extra: CSSProperties): CSSProperties => ({
    position: "absolute",
    ...extra,
  });
  const L = Math.max(...rows.map((r) => r.fossil + r.nuclear / 2));
  const R = Math.max(...rows.map((r) => r.renewable + r.nuclear / 2));
  const x = (v: number) => `${20 + ((v + L) / (L + R)) * 72}%`;
  const slot: CSSProperties = {
    gridArea: "1 / 1",
    justifySelf: "end",
    textAlign: "right",
  };
  const swatch = (fill: string) => (
    <span
      style={{
        display: "inline-block",
        width: "14px",
        height: "10px",
        flex: "none",
        background: fill,
      }}
    />
  );

  return (
    <div
      role="img"
      aria-label={alt}
      data-diverging-stack={JSON.stringify({
        rows,
        subject,
        leaningLeft,
        leaningRight,
        colours: { accentInk, inkOnGround, mutedInk },
      })}
      style={{
        position: "absolute",
        inset: 0,
        background: ground,
        display: "grid",
        gridTemplateRows: "auto minmax(0, 1fr) auto auto",
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
        <span style={{ ...regs.axis, color: mutedInk, fontWeight: 700 }}>
          {words.unit}
        </span>
        <span style={{ display: "grid", marginLeft: "auto" }}>
          <span
            data-part="left-note"
            style={{ ...regs.value, ...slot, color: inkOnGround, opacity: 0 }}
          >
            {words.leftNote}
          </span>
          <span
            data-part="right-note"
            style={{ ...regs.value, ...slot, color: inkOnGround, opacity: 0 }}
          >
            {words.rightNote}
          </span>
          <span
            data-part="compare-note"
            style={{ ...regs.value, ...slot, color: accentInk, opacity: 0 }}
          >
            {words.compareNote}
          </span>
        </span>
      </div>

      <div data-part="stage" style={{ position: "relative", minHeight: 0 }}>
        <div
          data-part="axis"
          style={abs({
            top: 0,
            bottom: 0,
            width: `${rule}px`,
            left: x(0),
            background: inkOnGround,
          })}
        />
        {rows.map((r, i) => {
          const isSubject = r.code === subject;
          let cursor = -(r.fossil + r.nuclear / 2);
          return (
            <div
              key={r.code}
              data-row={r.code}
              style={abs({
                left: 0,
                right: 0,
                top: `${(i / rows.length) * 100}%`,
                height: `${100 / rows.length}%`,
              })}
            >
              <span
                data-part="name"
                style={abs({
                  ...regs.axis,
                  left: 0,
                  width: "12%",
                  top: "50%",
                  transform: "translateY(-50%)",
                  textAlign: "right",
                  whiteSpace: "nowrap",
                  color: isSubject ? accentInk : inkOnGround,
                })}
              >
                {r.name}
              </span>
              {r.segments.map((s) => {
                const left = x(cursor);
                cursor += s.value;
                return (
                  <div
                    key={s.key}
                    data-segment={s.key}
                    data-side={s.side}
                    style={abs({
                      top: "22%",
                      height: "56%",
                      left,
                      width: `${(s.value / (L + R)) * 72}%`,
                      background: fillOf(s),
                    })}
                  />
                );
              })}
              <span
                data-part="total-left"
                style={abs({
                  ...regs.value,
                  top: "50%",
                  right: `calc(100% - ${x(-(r.fossil + r.nuclear / 2))} + 6px)`,
                  transform: "translateY(-50%)",
                  whiteSpace: "nowrap",
                  color: mutedInk,
                })}
              >
                {words.format[`${r.code}:fossil`]}
              </span>
              <span
                data-part="total-right"
                style={abs({
                  ...regs.value,
                  top: "50%",
                  left: `calc(${x(r.renewable + r.nuclear / 2)} + 6px)`,
                  transform: "translateY(-50%)",
                  whiteSpace: "nowrap",
                  color: isSubject ? accentInk : mutedInk,
                })}
              >
                {words.format[`${r.code}:renewable`]}
              </span>
              <span
                data-part="total-centre"
                style={abs({
                  ...regs.value,
                  top: "50%",
                  left: x(0),
                  transform: "translate(-50%, -50%)",
                  whiteSpace: "nowrap",
                  color: inkOnGround,
                  opacity: 0,
                })}
              >
                {words.format[`${r.code}:nuclear`]}
              </span>
              <span
                data-part="total-sides"
                style={abs({
                  ...regs.value,
                  top: "50%",
                  left: 0,
                  whiteSpace: "nowrap",
                  color: accentInk,
                  opacity: 0,
                })}
              >
                {words.format[`${r.code}:sides`]}
              </span>
            </div>
          );
        })}
      </div>

      <div data-part="ticks" style={{ position: "relative", height: "1.5em" }}>
        {(["stack", "diverging"] as const).flatMap((set) =>
          ticks[set].map((t) => (
            <span
              key={`${set}${t}`}
              data-tick={t}
              data-set={set}
              style={abs({
                ...regs.axis,
                top: 0,
                left: set === "diverging" ? x(t) : 0,
                transform: "translateX(-50%)",
                whiteSpace: "nowrap",
                color: mutedInk,
                opacity: set === "diverging" ? 1 : 0,
              })}
            >
              {`${Math.abs(t)}`}
            </span>
          )),
        )}
      </div>

      <div
        data-part="legend"
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: "4px 18px",
        }}
      >
        {[
          {
            name: legend.left.name,
            items: legend.left.levels.map((l, i) => ({
              label: l,
              fill: leftFill(i),
            })),
          },
          { name: null, items: [{ label: legend.centre, fill: centreFill }] },
          {
            name: legend.right.name,
            items: legend.right.levels.map((l, i) => ({
              label: l,
              fill: rightFill(i),
            })),
          },
        ].map((group, g) => (
          <span
            key={`g${g}`}
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              gap: "2px 8px",
            }}
          >
            {group.name && (
              <span style={{ ...regs.axis, color: mutedInk, fontWeight: 700 }}>
                {group.name}
              </span>
            )}
            {group.items.map((item) => (
              <span
                key={item.label}
                style={{
                  ...regs.axis,
                  color: mutedInk,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                {swatch(item.fill)}
                {item.label}
              </span>
            ))}
          </span>
        ))}
      </div>
    </div>
  );
}
