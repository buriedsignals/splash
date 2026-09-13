/**
 * The world's CO₂ shared out between its six largest emitters, 2000 and 2023, drawn THROUGH the design base as
 * a donut and CHOREOGRAPHED by the scroll. The `pie and donut` type in the scrolly format: the subject of
 * `static-donut-world-co2-share` — the United States and China swapped shares while the whole grew by half —
 * told with the gestures a scroll can make (`scrolly/references/directed-type-choreography.md`): one ring for
 * the world, its arcs turning from 2000 to 2023, the ring growing with the world's tonnes, the country the
 * growth hides, and the ring broken into the static plate's six.
 *
 * THE STATIC PLATE'S RULES ARE THE FLOOR: one full turn is 100 % of the world on every ring; the earlier state
 * a tint of the accent where it separates from the accent beside it, the neutral where it does not; the tonnes
 * printed with the shares, because a share that shrinks is not a number that falls.
 *
 * `donut-drive.mjs` builds and moves every mark in the reader's pixels. What is rendered here is the last
 * card's picture — the six rings — for a reader without a script.
 */

import type { CSSProperties } from "react";
import {
  adjustToContrast,
  contrast,
  mix,
  NON_TEXT_CONTRAST_MIN,
  TEXT_CONTRAST_MIN,
} from "#shared/chart-beat/colour.mjs";

export type Country = {
  code: string;
  name: string;
  shareBefore: number;
  shareAfter: number;
  gtBefore: number;
  gtAfter: number;
};
type Style = Record<string, string | number>;

export function DirectedDonutScrolly({
  countries,
  subject,
  pair,
  trap,
  years,
  worldBefore,
  worldAfter,
  words,
  alt,
  regs,
  ground,
  accent,
  ink,
  muted,
}: {
  countries: Country[];
  subject: string;
  pair: string[];
  trap: string;
  years: [string, string];
  worldBefore: number;
  worldAfter: number;
  words: {
    unit: string;
    worldNote: string;
    trapNote: string;
    splitNote: string;
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
  const accentFill =
    adjustToContrast(accent, ground, NON_TEXT_CONTRAST_MIN) ?? accent;
  const accentInk =
    adjustToContrast(accent, ground, TEXT_CONTRAST_MIN) ?? accent;
  const inkOnGround = adjustToContrast(ink, ground, TEXT_CONTRAST_MIN) ?? ink;
  const mutedInk = adjustToContrast(muted, ground, TEXT_CONTRAST_MIN) ?? muted;
  /** The static plate's past: a tint of the accent when it clears the ground and separates from the accent,
   *  the neutral otherwise. */
  const tint = mix(accent, ground, 0.62);
  const past =
    contrast(tint, ground) >= NON_TEXT_CONTRAST_MIN &&
    contrast(tint, accent) >= 1.5
      ? tint
      : (adjustToContrast(
          mix(ground, ink, 0.35),
          ground,
          NON_TEXT_CONTRAST_MIN,
        ) ?? mix(ground, ink, 0.5));
  /** On the world's ring the six are told apart by their names, not by hue: the subject in the accent, the
   *  other country the headline names in a deep neutral, the other four in a light one, the rest of the world
   *  in the track's own tone. */
  const second =
    adjustToContrast(mix(ground, ink, 0.62), ground, NON_TEXT_CONTRAST_MIN) ??
    ink;
  const other =
    adjustToContrast(mix(ground, ink, 0.34), ground, NON_TEXT_CONTRAST_MIN) ??
    mix(ground, ink, 0.5);
  const track = mix(ground, ink, 0.09);
  const slot: CSSProperties = {
    gridArea: "1 / 1",
    justifySelf: "end",
    textAlign: "right",
  };
  const one = (v: number) => v.toFixed(1).replace(".", ",");

  return (
    <div
      role="img"
      aria-label={alt}
      data-donut={JSON.stringify({
        countries,
        subject,
        pair,
        trap,
        years,
        worldBefore,
        worldAfter,
        regs: { annot: regs.annot, value: regs.value, axis: regs.axis },
        colours: {
          accent: accentFill,
          accentInk,
          ink: inkOnGround,
          muted: mutedInk,
          past,
          second,
          other,
          track,
        },
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
        <span data-part="unit" data-template={words.unit} style={{ ...regs.axis, color: mutedInk, fontWeight: 700 }}>
          {words.unit.replace("{year}", years[1])}
        </span>
        <span style={{ display: "grid", marginLeft: "auto" }}>
          <span
            data-part="world-note"
            style={{ ...regs.value, ...slot, color: inkOnGround, opacity: 0 }}
          >
            {words.worldNote}
          </span>
          <span
            data-part="trap-note"
            style={{ ...regs.value, ...slot, color: inkOnGround, opacity: 0 }}
          >
            {words.trapNote}
          </span>
          <span
            data-part="split-note"
            style={{ ...regs.axis, ...slot, color: mutedInk }}
          >
            {words.splitNote}
          </span>
        </span>
      </div>

      {/* The faces the drawn labels are set in, carried in the markup so the page embeds them: every mark and
          word on the stage is built by the script, which the font embedding cannot read. */}
      <span aria-hidden="true" style={{ position: "absolute", width: 0, height: 0, overflow: "hidden" }}>
        <span style={{ ...regs.annot }}>{countries.map((c) => c.name).join(" ")}</span>
        <span style={{ ...regs.annot, fontWeight: 700 }}>{countries.map((c) => c.name).join(" ")}</span>
        <span style={{ ...regs.value }}>{"0123456789,% puis Gt"}</span>
        <span style={{ ...regs.axis }}>{`${years.join(" ")} · 0123456789, Gt`}</span>
      </span>
      <div data-part="stage" style={{ position: "relative", minHeight: 0 }}>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 1200 320"
          preserveAspectRatio="xMidYMid meet"
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
          }}
        >
          {countries.map((country, i) => {
            const cx = 100 + i * 200;
            const arc = (share: number, r: number) => {
              const a = (Math.min(share, 99.99) / 100) * 2 * Math.PI;
              return `M ${cx} ${120 - r} A ${r} ${r} 0 ${share > 50 ? 1 : 0} 1 ${cx + Math.sin(a) * r} ${120 - Math.cos(a) * r}`;
            };
            return (
              <g key={country.code}>
                <circle
                  cx={cx}
                  cy={120}
                  r={80}
                  fill="none"
                  stroke={track}
                  strokeWidth={14}
                />
                <circle
                  cx={cx}
                  cy={120}
                  r={62}
                  fill="none"
                  stroke={track}
                  strokeWidth={14}
                />
                <path
                  d={arc(country.shareBefore, 80)}
                  fill="none"
                  stroke={past}
                  strokeWidth={14}
                />
                <path
                  d={arc(country.shareAfter, 62)}
                  fill="none"
                  stroke={accentFill}
                  strokeWidth={14}
                />
                <text
                  x={cx}
                  y={126}
                  textAnchor="middle"
                  fill={country.code === subject ? accentInk : inkOnGround}
                  style={{
                    fontFamily: String(regs.value.fontFamily),
                    fontSize: "20px",
                  }}
                >
                  {`${one(country.shareAfter)} %`}
                </text>
                <text
                  x={cx}
                  y={234}
                  textAnchor="middle"
                  fill={country.code === subject ? accentInk : inkOnGround}
                  style={{
                    fontFamily: String(regs.annot.fontFamily),
                    fontSize: "20px",
                  }}
                >
                  {country.name}
                </text>
                <text
                  x={cx}
                  y={264}
                  textAnchor="middle"
                  fill={mutedInk}
                  style={{
                    fontFamily: String(regs.axis.fontFamily),
                    fontSize: "16px",
                  }}
                >
                  {`${years[0]} · ${one(country.gtBefore)} Gt`}
                </text>
                <text
                  x={cx}
                  y={288}
                  textAnchor="middle"
                  fill={mutedInk}
                  style={{
                    fontFamily: String(regs.axis.fontFamily),
                    fontSize: "16px",
                  }}
                >
                  {`${years[1]} · ${one(country.gtAfter)} Gt`}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
