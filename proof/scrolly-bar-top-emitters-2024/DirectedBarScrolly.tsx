/**
 * The ten largest CO₂ emitters of 2024, drawn THROUGH the design base as bars and CHOREOGRAPHED by the scroll. The
 * `bar and column` type in the scrolly format: the subject of `static-bar-top-emitters-2024` — China emitted more than
 * the next five put together — told with the gestures a scroll can make
 * (`scrolly/references/directed-type-choreography.md`): every country a thin bar, the ten kept and the rest laid end to
 * end into one, the ten named, China, then the next five stacked against it.
 *
 * THE STATIC PLATE'S RULES ARE THE FLOOR: one value scale from zero for every picture (a length encoding); names never
 * rotated or cut, so the bars run in rows; the subject alone in the accent.
 *
 * `bar-drive.mjs` lays out every bar in the reader's pixels on each paint. What is rendered here is the last card's
 * picture, for a reader without a script.
 */

import type { CSSProperties } from "react";
import {
  adjustToContrast,
  mix,
  TEXT_CONTRAST_MIN,
} from "#shared/chart-beat/colour.mjs";

type Style = Record<string, string | number>;
export type Top = { key: string; name: string; value: number; label: string };

export const NOTES = [
  "tailNote",
  "restNote",
  "rankNote",
  "subjectNote",
  "stackNote",
  "readNote",
] as const;

export function DirectedBarScrolly({
  top,
  tail,
  stackCount,
  restName,
  restLabel,
  stackName,
  stackLabel,
  words,
  alt,
  regs,
  ground,
  accent,
  ink,
  muted,
}: {
  top: Top[];
  /** every other country's value, largest first */
  tail: number[];
  stackCount: number;
  restName: string;
  restLabel: string;
  stackName: string;
  stackLabel: string;
  words: Record<(typeof NOTES)[number] | "unit", string>;
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
  const accentInk =
    adjustToContrast(accent, ground, TEXT_CONTRAST_MIN) ?? accent;
  const mutedInk = adjustToContrast(muted, ground, TEXT_CONTRAST_MIN) ?? muted;
  const inkOnGround = adjustToContrast(ink, ground, TEXT_CONTRAST_MIN) ?? ink;
  const bar = mix(ground, ink, 0.55);
  const restBar = mix(ground, ink, 0.3);
  const halo = `0 0 2px ${ground}, 0 0 3px ${ground}, 0 0 4px ${ground}`;
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

  return (
    <div
      role="img"
      aria-label={alt}
      data-bar={JSON.stringify({
        top: top.map((t) => Math.round(t.value * 1e4) / 1e4),
        tail: tail.map((v) => Math.round(v * 1e6) / 1e6),
        stackCount,
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
          <line data-part="baseline" stroke={mutedInk} strokeWidth={1} />
          {tail.map((_, j) => (
            <rect key={j} data-tail={j} fill={restBar} />
          ))}
          <rect data-part="rest" fill={restBar} />
          {top.map((t, i) => (
            <rect
              key={t.key}
              data-top={i}
              fill={bar}
              stroke={ground}
              strokeWidth={0}
            />
          ))}
          <rect data-part="subject" fill={accent} />
          <line
            data-part="rule"
            stroke={accentInk}
            strokeWidth={1.2}
            strokeDasharray="3 3"
            opacity={0}
          />
        </svg>

        {top.map((t, i) => (
          <div key={t.key}>
            <span
              data-name={i}
              style={abs({
                ...regs.annot,
                color: i === 0 ? accentInk : inkOnGround,
                fontWeight: i === 0 ? 700 : regs.annot.fontWeight,
              })}
            >
              {t.name}
            </span>
            <span
              data-value={i}
              style={abs({
                ...regs.value,
                color: i === 0 ? accentInk : inkOnGround,
                fontWeight: 700,
                textShadow: halo,
              })}
            >
              {t.label}
            </span>
          </div>
        ))}
        <span
          data-part="rest-name"
          style={abs({ ...regs.annot, color: mutedInk })}
        >
          {restName}
        </span>
        <span
          data-part="rest-value"
          style={abs({ ...regs.value, color: mutedInk, fontWeight: 700 })}
        >
          {restLabel}
        </span>
        <span
          data-part="stack-name"
          style={abs({
            ...regs.annot,
            color: inkOnGround,
            fontWeight: 700,
            opacity: 0,
          })}
        >
          {stackName}
        </span>
        <span
          data-part="stack-value"
          style={abs({
            ...regs.value,
            color: inkOnGround,
            fontWeight: 700,
            textShadow: halo,
            opacity: 0,
          })}
        >
          {stackLabel}
        </span>
      </div>
    </div>
  );
}
