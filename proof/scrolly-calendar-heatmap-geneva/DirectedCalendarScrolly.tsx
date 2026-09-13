/**
 * Geneva's 2024, one cell per day, drawn THROUGH the design base and CHOREOGRAPHED by the scroll. The
 * `calendar heatmap` type in the scrolly format: the subject of `static-calendar-heatmap-geneva`, from
 * its data, claims and colour rules, told with the gestures a scroll can make
 * (`scrolly/references/directed-type-choreography.md`):
 *
 *   reveal in order — the year fills day by day;
 *   filter          — the days under 20 °C step back to a neutral;
 *   zoom + trace    — July and August grow to fill the frame, print their values, and the streak
 *                     outlines itself while a counter climbs to 31;
 *   compare         — back to the year, each month's mean drawn beside its row, August against July;
 *   name            — the hottest and the coldest day ringed and labelled.
 *
 * THE STATIC PLATE'S RULES ARE THE FLOOR: one hue cluster in six equal-count bins, each break printed in
 * °C; the impossible dates drawn as missing, outside the ramp; the streak outlined in the ink, in the
 * gutter, over a halo of the ground.
 *
 * EVERYTHING IS PLACED ON THE GRID. The counter, the two names, the outlines and the monthly means are
 * grid items on the lines of the cells they belong to, so they follow a zoom that is itself nothing but
 * row heights changing — no transform scales a word. What is rendered here is the last card's picture,
 * which is what a reader without a script gets; `calendar-drive.mjs` paints every other state.
 */

import type { CSSProperties } from "react";
import {
  adjustToContrast,
  mix,
  TEXT_CONTRAST_MIN,
} from "#shared/chart-beat/colour.mjs";

export type Day = {
  index: number;
  month: number;
  day: number;
  value: number;
  label: string;
};
export type Run = { month: number; from: number; to: number };
export type Named = { month: number; day: number; text: string };
type Style = Record<string, string | number>;

/** The two months the zoom opens: the ones the streak crosses. */
export const FOCUS_ATTRIBUTE = "data-focus";

export function DirectedCalendarScrolly({
  days,
  months,
  breaks,
  threshold,
  runs,
  counterSuffix,
  streakLength,
  means,
  meansLabel,
  warmest,
  hot,
  cold,
  keyLabel,
  missingLabel,
  format,
  alt,
  regs,
  pad,
  stroke,
  ground,
  accent,
  ink,
  muted,
  grid,
}: {
  days: Day[];
  months: string[];
  breaks: number[];
  threshold: number;
  runs: Run[];
  counterSuffix: string;
  streakLength: number;
  means: { value: number; label: string }[];
  meansLabel: string;
  warmest: number;
  hot: Named;
  cold: Named;
  keyLabel: string;
  missingLabel: string;
  format: (v: number) => string;
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
  grid: string;
}) {
  const cold0 = mix(accent, ground, 0.88);
  const warm = mix(accent, ink, 0.25);
  const bins = breaks.length + 1;
  const bin = (value: number) => breaks.filter((b) => value >= b).length;
  const rampFill = (index: number) =>
    mix(cold0, warm, bins > 1 ? index / (bins - 1) : 0.5);
  const missingFill = mix(ground, ink, 0.06);
  /** The neutral a filtered day steps back to: darker than a missing date, so a day is still a day. */
  const filteredFill = mix(ground, ink, 0.13);
  const mutedInk = adjustToContrast(muted, ground, TEXT_CONTRAST_MIN) ?? muted;
  const inkOnGround = adjustToContrast(ink, ground, TEXT_CONTRAST_MIN) ?? ink;
  const accentInk =
    adjustToContrast(accent, ground, TEXT_CONTRAST_MIN) ?? accent;
  const byDate = new Map(days.map((d) => [`${d.month}-${d.day}`, d]));
  const daysInMonth = (month: number) => new Date(2024, month + 1, 0).getDate();
  const hairline = stroke.hairline ?? 0.6;
  const rule = stroke.rule ?? 1;
  const gap = "clamp(1px, 0.25vw, 3px)";
  const focus = new Set(runs.map((r) => r.month));
  const maxMean = Math.max(...means.map((m) => m.value));
  if (Math.min(...means.map((m) => m.value)) < 0)
    throw new Error(
      "a monthly mean below zero cannot be drawn as a bar from zero",
    );
  const axisStyle: CSSProperties = {
    ...regs.axis,
    color: mutedInk,
    whiteSpace: "nowrap",
  };
  const chip: CSSProperties = {
    background: ground,
    padding: "1px 4px",
    whiteSpace: "nowrap",
    zIndex: 2,
    pointerEvents: "none",
  };
  const lastCol = 33;

  return (
    <div
      role="img"
      aria-label={alt}
      style={{
        position: "absolute",
        inset: 0,
        background: ground,
        padding: `clamp(12px, 3vh, ${pad * 0.6}px) var(--prose-gutter, clamp(16px, 6vw, 56px))`,
        display: "grid",
        gridTemplateRows: "minmax(0, 1fr) auto",
        rowGap: "12px",
      }}
    >
      <div
        data-part="calendar"
        style={{
          display: "grid",
          gridTemplateColumns: `max-content repeat(31, minmax(0, 1fr)) min(110px, 14%)`,
          gridTemplateRows: `auto repeat(12, minmax(0, 40px))`,
          gap,
          alignContent: "center",
          minHeight: 0,
          position: "relative",
        }}
      >
        {[1, 5, 10, 15, 20, 25, 31].map((day) => (
          <span
            key={`d${day}`}
            data-part="tick"
            style={{
              ...axisStyle,
              gridColumn: day + 1,
              gridRow: 1,
              justifySelf: "center",
              paddingBottom: "4px",
            }}
          >
            {day}
          </span>
        ))}
        <span
          data-part="mean"
          style={{
            ...axisStyle,
            gridColumn: lastCol,
            gridRow: 1,
            justifySelf: "start",
            paddingLeft: "8px",
            overflow: "hidden",
          }}
        >
          {meansLabel}
        </span>

        {months.map((name, month) => (
          <span
            key={name}
            data-month={month}
            {...(focus.has(month) ? { [FOCUS_ATTRIBUTE]: "" } : {})}
            style={{
              ...axisStyle,
              gridColumn: 1,
              gridRow: month + 2,
              alignSelf: "center",
              justifySelf: "end",
              paddingRight: "6px",
            }}
          >
            {name}
          </span>
        ))}

        {months.flatMap((_, month) =>
          Array.from({ length: 31 }, (_, i) => i + 1).map((day) => {
            const reading = byDate.get(`${month}-${day}`);
            const exists = day <= daysInMonth(month);
            if (!reading && exists)
              throw new Error(`no reading for ${month + 1}/${day}`);
            return (
              <div
                key={`${month}-${day}`}
                data-month={month}
                {...(focus.has(month) ? { [FOCUS_ATTRIBUTE]: "" } : {})}
                style={{
                  gridColumn: day + 1,
                  gridRow: month + 2,
                  position: "relative",
                  overflow: "hidden",
                  background: reading ? ground : missingFill,
                  boxShadow: `inset 0 0 0 ${hairline}px ${grid}`,
                }}
              >
                {reading && (
                  <div
                    data-cell
                    data-index={reading.index}
                    style={{
                      position: "absolute",
                      inset: 0,
                      background: rampFill(bin(reading.value)),
                      boxShadow: `inset 0 0 0 ${hairline}px ${grid}`,
                    }}
                  >
                    {reading.value < threshold && (
                      <div
                        data-cold
                        style={{
                          position: "absolute",
                          inset: 0,
                          background: filteredFill,
                          opacity: 0,
                        }}
                      />
                    )}
                    {focus.has(month) && (
                      <span
                        data-value
                        style={{
                          ...regs.axis,
                          position: "absolute",
                          left: "50%",
                          top: "50%",
                          transform: "translate(-50%, -50%)",
                          whiteSpace: "nowrap",
                          opacity: 0,
                          // The zoom opens with the filter on, so a day under the threshold is read on
                          // the neutral, not on its bin: white on that neutral measured unreadable.
                          color:
                            reading.value < threshold ||
                            bin(reading.value) < bins / 2
                              ? inkOnGround
                              : ground,
                        }}
                      >
                        {reading.label}
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          }),
        )}

        {runs.map((run) => (
          <div
            key={`run${run.month}`}
            data-part="run"
            data-days={run.to - run.from + 1}
            style={{
              gridColumn: `${run.from + 1} / ${run.to + 2}`,
              gridRow: run.month + 2,
              margin: `calc(-1 * ${gap})`,
              border: `${rule * 2}px solid ${ink}`,
              boxShadow: `0 0 0 ${rule * 1.5}px ${ground}, inset 0 0 0 ${rule * 1.5}px ${ground}`,
              pointerEvents: "none",
              zIndex: 1,
            }}
          />
        ))}
        <span
          data-part="counter"
          data-suffix={counterSuffix}
          data-total={streakLength}
          style={{
            ...regs.value,
            ...chip,
            color: accentInk,
            gridColumn: `${runs[0].from + 1} / ${lastCol}`,
            gridRow: runs[0].month + 2,
            alignSelf: "start",
            justifySelf: "start",
            transform: "translateY(calc(-100% - 8px))",
            opacity: 0,
          }}
        >
          {`${streakLength} ${counterSuffix}`}
        </span>

        {means.map((m, month) => (
          <div
            key={`m${month}`}
            data-part="mean"
            data-month={month}
            {...(focus.has(month) ? { [FOCUS_ATTRIBUTE]: "" } : {})}
            style={{
              gridColumn: lastCol,
              gridRow: month + 2,
              display: "grid",
              gridTemplateColumns: "minmax(0, 1fr) auto",
              alignItems: "center",
              gap: "4px",
              paddingLeft: "8px",
              overflow: "hidden",
            }}
          >
            <div style={{ height: "46%", position: "relative" }}>
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  top: 0,
                  bottom: 0,
                  width: `${(m.value / maxMean) * 100}%`,
                  background:
                    month === warmest ? accent : mix(ground, ink, 0.3),
                }}
              />
            </div>
            <span
              style={{
                ...regs.value,
                whiteSpace: "nowrap",
                color:
                  month === warmest
                    ? accentInk
                    : focus.has(month)
                      ? inkOnGround
                      : mutedInk,
                fontWeight: focus.has(month) ? 700 : regs.value.fontWeight,
              }}
            >
              {m.label}
            </span>
          </div>
        ))}

        {[
          { named: hot, which: "hot", side: "above" },
          { named: cold, which: "cold", side: "below" },
        ].flatMap(({ named, which, side }) => [
          <div
            key={`ring-${which}`}
            data-part="extreme"
            style={{
              gridColumn: named.day + 1,
              gridRow: named.month + 2,
              margin: `calc(-2 * ${gap})`,
              border: `${rule * 2}px solid ${ink}`,
              boxShadow: `0 0 0 ${rule * 1.5}px ${ground}`,
              zIndex: 2,
              pointerEvents: "none",
            }}
          />,
          <span
            key={`label-${which}`}
            data-part="extreme"
            data-label
            style={{
              ...regs.annot,
              ...chip,
              color: inkOnGround,
              gridColumn: named.day + 1,
              gridRow: named.month + 2,
              justifySelf: "center",
              alignSelf: side === "above" ? "start" : "end",
              transform:
                side === "above"
                  ? "translateY(calc(-100% - 6px))"
                  : "translateY(calc(100% + 6px))",
            }}
          >
            {named.text}
          </span>,
        ])}
      </div>

      <div
        data-part="key"
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "flex-start",
          gap: "6px 16px",
          paddingLeft: "2px",
        }}
      >
        <div
          style={{
            position: "relative",
            display: "grid",
            gridTemplateColumns: `repeat(${bins}, 28px)`,
            gap: "2px",
            paddingBottom: "1.5em",
          }}
        >
          {Array.from({ length: bins }, (_, i) => (
            <div
              key={`k${i}`}
              style={{
                position: "relative",
                height: "12px",
                background: rampFill(i),
                boxShadow: `inset 0 0 0 ${hairline}px ${grid}`,
              }}
            >
              {i < breaks.length && (
                <span
                  style={{
                    ...axisStyle,
                    position: "absolute",
                    left: "100%",
                    top: "14px",
                    transform: "translateX(-50%)",
                  }}
                >
                  {format(breaks[i])}
                </span>
              )}
            </div>
          ))}
        </div>
        <div style={{ display: "grid", gap: "4px" }}>
          <span style={axisStyle}>{keyLabel}</span>
          <span
            style={{
              ...axisStyle,
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <span
              style={{
                display: "inline-block",
                width: "28px",
                height: "12px",
                background: missingFill,
                boxShadow: `inset 0 0 0 ${hairline}px ${grid}`,
              }}
            />
            {missingLabel}
          </span>
        </div>
      </div>
    </div>
  );
}
