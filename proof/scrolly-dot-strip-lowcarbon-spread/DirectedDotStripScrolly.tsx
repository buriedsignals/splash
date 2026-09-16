/**
 * Sixteen European countries pinned on a strip — the low-carbon share of their own electricity — drawn THROUGH
 * the design base as a dot strip and CHOREOGRAPHED by the scroll. The `dot strip` type in the scrolly format:
 * the subject of `static-dot-strip-lowcarbon-spread` — the floor rose 30 points, the ceiling 2 — told with the
 * gestures a scroll can make (`scrolly/references/directed-type-choreography.md`): one strip whose pins slide
 * from 2000 to 2024, the floor, the ceiling and the spread read on it, then the static plate's two strips.
 *
 * THE STATIC PLATE'S RULES ARE THE FLOOR: a ruled axis, not a bare line; each mark a pin with its code in a chip
 * on a stem; colour belongs to the entity, not to the state; both strips on one scale; the subject in the
 * accent.
 *
 * `dot-strip-drive.mjs` places every mark in the reader's pixels on each paint. What is rendered here is a
 * rough 2024 strip in percentages, for a reader without a script.
 */

import type { CSSProperties } from "react";
import {
  adjustToContrast,
  contrast,
  mix,
  TEXT_CONTRAST_MIN,
} from "#shared/chart-beat/colour.mjs";

export type Mark = {
  code: string;
  name: string;
  before: number;
  after: number;
};
type Style = Record<string, string | number>;

export function DirectedDotStripScrolly({
  marks,
  subject,
  ceiling,
  years,
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
  marks: Mark[];
  subject: string;
  ceiling: string;
  years: [string, string];
  ticks: number[];
  words: {
    unit: string;
    figures: { key: string; label: string; value: string }[];
    splitNote: string;
    floorTrail: string;
    ceilTrail: string;
    spreadBefore: string;
    spreadAfter: string;
    medianLabel: string;
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
  const rail = mix(ground, ink, 0.12);
  const tickInk = mix(ground, ink, 0.3);
  const chipFill = mix(ground, ink, 0.13);
  const leader = mix(ground, ink, 0.3);
  const legibleOn = (fill: string) =>
    contrast(ink, fill) >= contrast(ground, fill) ? ink : ground;
  const accentInk =
    adjustToContrast(accent, ground, TEXT_CONTRAST_MIN) ?? accent;
  const mutedInk = adjustToContrast(muted, ground, TEXT_CONTRAST_MIN) ?? muted;
  const inkOnGround = adjustToContrast(ink, ground, TEXT_CONTRAST_MIN) ?? ink;
  const hairline = stroke.hairline ?? 0.6;
  const rule = stroke.rule ?? 1;
  const abs = (extra: CSSProperties): CSSProperties => ({
    position: "absolute",
    left: 0,
    top: 0,
    ...extra,
  });
  const slot: CSSProperties = {
    gridArea: "1 / 1",
    justifySelf: "end",
    textAlign: "right",
  };
  const chip = (m: Mark, strip: "main" | "top") => {
    const isSubject = m.code === subject;
    return (
      <span
        key={`${strip}${m.code}`}
        data-chip={m.code}
        data-strip={strip}
        style={abs({
          ...regs.value,
          left: `${m.after}%`,
          transform: "translateX(-50%)",
          whiteSpace: "nowrap",
          padding: "1px 5px",
          borderRadius: "3px",
          background: isSubject ? accent : chipFill,
          color: isSubject ? legibleOn(accent) : inkOnGround,
          fontWeight: isSubject ? 700 : regs.axis.fontWeight,
          opacity: strip === "top" ? 0 : 1,
        })}
      >
        {m.code}
      </span>
    );
  };

  return (
    <div
      role="img"
      aria-label={alt}
      data-strip-chart={JSON.stringify({
        marks,
        subject,
        ceiling,
        years,
        ticks,
        colours: { accent, accentInk, chipFill, inkOnGround },
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
        <span style={{ ...regs.axis, color: mutedInk, fontWeight: 700 }}>
          {words.unit}
        </span>
        <span style={{ display: "grid", marginLeft: "auto" }}>
          <span
            data-part="split-note"
            style={{ ...regs.axis, ...slot, color: mutedInk }}
          >
            {words.splitNote}
          </span>
        </span>
      </div>

      <div data-part="stage" style={{ position: "relative", minHeight: 0 }}>
        {/* The card's reading as one large figure in the top of the stage, where the card never rests: the strip
            is a thin form, and the band above it was bare. */}
        {words.figures.map((f) => (
          <div key={f.key} data-figure={f.key} style={abs({ opacity: 0, maxWidth: "60%" })}>
            <div style={{ ...regs.axis, color: mutedInk, fontWeight: 700 }}>{f.label}</div>
            <div data-figure-value={f.key} data-template={f.value} style={{ ...regs.display, color: f.key === "floor" || f.key === "ceil" ? accentInk : inkOnGround, whiteSpace: "nowrap" }}>
              {f.value.replace("{v}", "")}
            </div>
          </div>
        ))}
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
          {(["main", "top"] as const).map((strip) => (
            <g key={strip} data-rail-group={strip}>
              <rect data-rail={strip} fill={rail} />
              {Array.from({ length: 21 }, (_, i) => (
                <line
                  key={i}
                  data-tick={i * 5}
                  data-strip={strip}
                  stroke={tickInk}
                  strokeWidth={i % 4 === 0 ? rule : hairline}
                />
              ))}
            </g>
          ))}
          {marks.map((m) => (
            <g key={m.code} data-mark={m.code}>
              <line
                data-leader={m.code}
                stroke={leader}
                strokeWidth={hairline}
                strokeDasharray="3 3"
              />
              <line
                data-ghost={m.code}
                stroke={m.code === subject ? accentInk : tickInk}
                strokeWidth={rule * 1.5}
              />
              <line
                data-trail={m.code}
                stroke={accentInk}
                strokeWidth={rule * 3}
                strokeLinecap="round"
              />
              <line
                data-stem={m.code}
                data-strip="main"
                stroke={m.code === subject ? accentInk : leader}
                strokeWidth={rule}
              />
              <line
                data-stem={m.code}
                data-strip="top"
                stroke={m.code === subject ? accentInk : leader}
                strokeWidth={rule}
              />
            </g>
          ))}
          <path
            data-bracket="before"
            fill="none"
            stroke={mutedInk}
            strokeWidth={rule}
            strokeDasharray="4 3"
          />
          <path
            data-bracket="after"
            fill="none"
            stroke={inkOnGround}
            strokeWidth={rule * 1.5}
          />
          <line
            data-part="median"
            stroke={inkOnGround}
            strokeWidth={rule * 1.5}
          />
        </svg>

        {marks.map((m) => chip(m, "main"))}
        {marks.map((m) => chip(m, "top"))}
        {(["main", "top"] as const).flatMap((strip) =>
          ticks.map((t) => (
            <span
              key={`${strip}${t}`}
              data-ticklabel={t}
              data-strip={strip}
              style={abs({
                ...regs.axis,
                left: `${t}%`,
                transform: "translateX(-50%)",
                color: mutedInk,
                whiteSpace: "nowrap",
              })}
            >
              {t}
            </span>
          )),
        )}
        <span
          data-year="main"
          style={abs({ ...regs.axis, color: inkOnGround, fontWeight: 700 })}
        >
          {years[1]}
        </span>
        <span
          data-year="top"
          style={abs({
            ...regs.axis,
            color: inkOnGround,
            fontWeight: 700,
            opacity: 0,
          })}
        >
          {years[0]}
        </span>
        <span
          data-trail-label={subject}
          style={abs({
            ...regs.value,
            color: accentInk,
            whiteSpace: "nowrap",
            opacity: 0,
          })}
        >
          {words.floorTrail}
        </span>
        <span
          data-trail-label={ceiling}
          style={abs({
            ...regs.value,
            color: accentInk,
            whiteSpace: "nowrap",
            opacity: 0,
          })}
        >
          {words.ceilTrail}
        </span>
        <span
          data-bracket-label="before"
          style={abs({
            ...regs.axis,
            color: mutedInk,
            whiteSpace: "nowrap",
            opacity: 0,
          })}
        >
          {words.spreadBefore}
        </span>
        <span
          data-bracket-label="after"
          style={abs({
            ...regs.axis,
            color: inkOnGround,
            fontWeight: 700,
            whiteSpace: "nowrap",
            opacity: 0,
          })}
        >
          {words.spreadAfter}
        </span>
        <span
          data-part="median-label"
          data-template={words.medianLabel}
          style={abs({
            ...regs.axis,
            color: inkOnGround,
            whiteSpace: "nowrap",
            opacity: 0,
          })}
        >
          {words.medianLabel.replace("{v}", "")}
        </span>
      </div>
    </div>
  );
}
