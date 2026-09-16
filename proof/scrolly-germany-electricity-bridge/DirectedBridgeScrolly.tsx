/**
 * Germany's electricity generation, 2015 to 2024, drawn THROUGH the design base as a waterfall and CHOREOGRAPHED
 * by the scroll. The `waterfall` type in the scrolly format: the subject of `static-germany-electricity-bridge` —
 * 143 TWh less, because the nuclear exit and the fossil fall outweigh the renewables build-out — told with the
 * gestures a scroll can make (`scrolly/references/directed-type-choreography.md`): the bridge built step by step,
 * the fossil step unfolded into its three fuels, the net change measured between the two totals.
 *
 * THE STATIC PLATE'S RULES ARE THE FLOOR: totals from zero in the muted ink, steps floating on the running total in
 * the direction's accent, a dotted connector at each step's level, the value on each bar's growing edge in ink,
 * never inside it; the bridge replayed before it is drawn.
 *
 * `bridge-drive.mjs` lays out every bar in the reader's pixels on each paint. What is rendered here is the last
 * card's picture in percentages, for a reader without a script.
 */

import type { CSSProperties } from "react";
import {
  adjustToContrast,
  mix,
  NON_TEXT_CONTRAST_MIN,
  TEXT_CONTRAST_MIN,
} from "#shared/chart-beat/colour.mjs";

export type Bar = {
  id: string;
  kind: "total" | "step" | "sub";
  from: number;
  to: number;
  value: string;
  label: string;
  short: string;
};
type Style = Record<string, string | number>;

export function DirectedBridgeScrolly({
  bars,
  max,
  ticks,
  words,
  alt,
  regs,
  stroke,
  ground,
  accent,
  ink,
  muted,
}: {
  bars: Bar[];
  max: number;
  ticks: number[];
  words: {
    unit: string;
    running: string;
    renNote: string;
    nucNote: string;
    fosNote: string;
    netNote: string;
    net: string;
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
}) {
  const stepFill =
    adjustToContrast(accent, ground, NON_TEXT_CONTRAST_MIN) ?? accent;
  const totalFill =
    adjustToContrast(muted, ground, NON_TEXT_CONTRAST_MIN) ?? muted;
  const accentInk =
    adjustToContrast(accent, ground, TEXT_CONTRAST_MIN) ?? accent;
  const inkOnGround = adjustToContrast(ink, ground, TEXT_CONTRAST_MIN) ?? ink;
  const mutedInk = adjustToContrast(muted, ground, TEXT_CONTRAST_MIN) ?? muted;
  const grid = mix(ground, ink, 0.1);
  const connector = mix(ground, ink, 0.4);
  const rule = stroke.rule ?? 1;
  const abs = (extra: CSSProperties): CSSProperties => ({
    position: "absolute",
    ...extra,
  });
  const slot: CSSProperties = {
    gridArea: "1 / 1",
    justifySelf: "end",
    textAlign: "right",
  };
  const pct = (v: number) => `${100 - (v / max) * 100}%`;

  return (
    <div
      role="img"
      aria-label={alt}
      data-bridge={JSON.stringify({
        bars: bars.map(({ id, kind, from, to }) => ({ id, kind, from, to })),
        max,
        colours: { accentInk, inkOnGround },
      })}
      style={{
        position: "absolute",
        inset: 0,
        background: ground,
        display: "grid",
        gridTemplateRows: "auto minmax(0, 1fr) auto",
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
            data-part="running"
            data-template={words.running}
            style={{ ...regs.value, ...slot, color: inkOnGround }}
          >
            {words.running.replace("{v}", "")}
          </span>
          {(["renNote", "nucNote", "fosNote", "netNote"] as const).map((k) => (
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
        {ticks.map((t) => (
          <div
            key={t}
            data-grid={t}
            style={abs({
              left: 0,
              right: 0,
              top: pct(t),
              height: 0,
              borderTop: `${rule}px solid ${t === 0 ? inkOnGround : grid}`,
            })}
          >
            <span
              data-tick={t}
              style={abs({
                ...regs.axis,
                left: 0,
                top: 0,
                transform: "translateY(-50%)",
                color: mutedInk,
                background: ground,
                paddingRight: "6px",
              })}
            >
              {t}
            </span>
          </div>
        ))}
        {bars.map((b, i) => (
          <div
            key={b.id}
            data-bar={b.id}
            style={abs({
              left: `${8 + (Math.min(i, 3) + (b.kind === "sub" ? 0 : 0)) * 18}%`,
              width: "10%",
              top: pct(Math.max(b.from, b.to)),
              height: `${(Math.abs(b.to - b.from) / max) * 100}%`,
              background: b.kind === "total" ? totalFill : stepFill,
              opacity: b.kind === "sub" ? 0 : 1,
            })}
          />
        ))}
        {bars.map((b) => (
          <div
            key={`c${b.id}`}
            data-connector={b.id}
            style={abs({
              height: 0,
              borderTop: `${rule}px dotted ${connector}`,
              opacity: 0,
            })}
          />
        ))}
        {bars.map((b) => (
          <span
            key={`v${b.id}`}
            data-value={b.id}
            style={abs({
              ...regs.value,
              whiteSpace: "nowrap",
              color: b.kind === "total" ? inkOnGround : accentInk,
              opacity: 0,
            })}
          >
            {b.value}
          </span>
        ))}
        <div
          data-part="net-line"
          style={abs({
            height: 0,
            borderTop: `${rule}px dashed ${inkOnGround}`,
            opacity: 0,
          })}
        />
        <div
          data-part="net-bracket"
          style={abs({
            width: "8px",
            borderTop: `${rule * 1.5}px solid ${inkOnGround}`,
            borderBottom: `${rule * 1.5}px solid ${inkOnGround}`,
            borderRight: `${rule * 1.5}px solid ${inkOnGround}`,
            opacity: 0,
          })}
        />
        <span
          data-part="net-label"
          style={abs({
            ...regs.value,
            whiteSpace: "nowrap",
            color: inkOnGround,
            fontWeight: 700,
            opacity: 0,
          })}
        >
          {words.net}
        </span>
      </div>

      <div
        data-part="categories"
        style={{ position: "relative", height: "2.8em" }}
      >
        {bars.map((b, i) => (
          <span
            key={b.id}
            data-category={b.id}
            data-full={b.label}
            data-short={b.short}
            style={abs({
              ...regs.axis,
              top: 0,
              left: `${13 + Math.min(i, 3) * 18}%`,
              transform: "translateX(-50%)",
              textAlign: "center",
              color: inkOnGround,
              opacity: b.kind === "sub" ? 0 : 1,
            })}
          >
            {b.label}
          </span>
        ))}
      </div>
    </div>
  );
}
