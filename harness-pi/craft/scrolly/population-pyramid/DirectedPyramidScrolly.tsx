/**
 * Switzerland's resident population by five-year age band and sex, 2023, drawn THROUGH the design base as a population
 * pyramid and CHOREOGRAPHED by the scroll. The `population pyramid` type in the scrolly format: the subject of
 * `static-swiss-age-pyramid` — women outnumber men from 60-64 on — told with the gestures a scroll can make
 * (`scrolly/references/directed-type-choreography.md`): each side built band by band, every band turned into its own
 * difference so the tipping point can be seen, the crossing marked, the oldest bands measured as a ratio.
 *
 * THE STATIC PLATE'S RULES ARE THE FLOOR: bands in their natural order, youngest at the bottom, never sorted by value;
 * one shared, mirrored, zero-anchored scale; the sexes told apart by side, and by the direction's accent against its
 * muted step.
 *
 * `pyramid-drive.mjs` lays out every band in the reader's pixels on each paint. What is rendered here is the last
 * card's picture, for a reader without a script.
 */

import type { CSSProperties } from "react";
import {
  adjustToContrast,
  TEXT_CONTRAST_MIN,
} from "#shared/chart-beat/colour.mjs";

export type Band = {
  band: string;
  male: number;
  female: number;
  ratioText: string;
  diffText: string;
};
type Style = Record<string, string | number>;

export const NOTES = [
  "menNote",
  "womenNote",
  "diffNote",
  "crossNote",
  "oldNote",
  "totalNote",
] as const;

export function DirectedPyramidScrolly({
  bands,
  crossing,
  oldest,
  ticks,
  diffTicks,
  words,
  alt,
  regs,
  ground,
  accent,
  ink,
  muted,
  grid,
}: {
  bands: Band[];
  crossing: string;
  oldest: string[];
  ticks: { value: number; text: string }[];
  diffTicks: { value: number; text: string }[];
  words: Record<
    | (typeof NOTES)[number]
    | "men"
    | "women"
    | "crossLabel"
    | "menSurplus"
    | "womenSurplus",
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
  const accentInk =
    adjustToContrast(accent, ground, TEXT_CONTRAST_MIN) ?? accent;
  const mutedInk = adjustToContrast(muted, ground, TEXT_CONTRAST_MIN) ?? muted;
  const inkOnGround = adjustToContrast(ink, ground, TEXT_CONTRAST_MIN) ?? ink;
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
  // THE LAST CARD'S PICTURE WITHOUT A SCRIPT (kit addition). The drive lays out every bar in the
  // reader's pixels, so with no script the bars have no geometry and every age and tick sits at the
  // stage's top-left corner, overprinted. A <noscript> stylesheet hides the drive's layer and shows
  // the plain pyramid in a grid: one row per band (the youngest at the foot), the left half in the
  // accent, both halves on the same scale from zero, the ages in the centre gutter, the ticks below.
  const maxPop = Math.max(...bands.flatMap((b) => [b.male, b.female]));
  const pctOf = (v: number) => `${(v / maxPop) * 100}%`;
  const stillTicks = ticks.filter((t) => t.value <= maxPop);
  const noScript =
    `[data-pyramid] [data-part="stage"] > :not([data-part="still"]) { display: none !important; }` +
    `[data-pyramid] [data-part="still"] { display: grid !important; }`;

  return (
    <div
      role="img"
      aria-label={alt}
      data-pyramid={JSON.stringify({
        bands: bands.map(({ band, male, female }) => ({ band, male, female })),
        crossing,
        oldest,
        ticks: ticks.map((t) => t.value),
        diffTicks: diffTicks.map((t) => t.value),
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
          {words.totalNote}
        </span>
        <span style={{ display: "grid", marginLeft: "auto" }}>
          {NOTES.filter((k) => k !== "totalNote").map((k) => (
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

      <noscript
        style={{ display: "none" }}
        dangerouslySetInnerHTML={{ __html: `<style>${noScript}</style>` }}
      />
      <div data-part="stage" style={{ position: "relative", minHeight: 0 }}>
        <div
          data-part="still"
          style={{
            display: "none",
            position: "absolute",
            inset: 0,
            gridTemplateColumns: "minmax(0, 1fr) max-content minmax(0, 1fr)",
            gridTemplateRows: `auto repeat(${bands.length}, minmax(0, 1fr)) auto`,
            columnGap: "8px",
            alignItems: "center",
          }}
        >
          <span style={{ ...regs.annot, color: accentInk, fontWeight: 700, justifySelf: "center", gridRow: 1, gridColumn: 1 }}>{words.men}</span>
          <span style={{ ...regs.annot, color: mutedInk, fontWeight: 700, justifySelf: "center", gridRow: 1, gridColumn: 3 }}>{words.women}</span>
          {[...bands].reverse().map((b, i) => (
            <div key={b.band} style={{ display: "contents" }}>
              <div style={{ gridRow: i + 2, gridColumn: 1, height: "80%", display: "flex", justifyContent: "flex-end" }}>
                <div style={{ width: pctOf(b.male), background: accent }} />
              </div>
              <span style={{ ...regs.annot, color: mutedInk, gridRow: i + 2, gridColumn: 2, textAlign: "center", whiteSpace: "nowrap" }}>{b.band}</span>
              <div style={{ gridRow: i + 2, gridColumn: 3, height: "80%", display: "flex" }}>
                <div style={{ width: pctOf(b.female), background: muted }} />
              </div>
            </div>
          ))}
          {[1, 3].map((col) => (
            <div key={col} style={{ gridRow: bands.length + 2, gridColumn: col, position: "relative", height: "1.4em" }}>
              {stillTicks.map((t) => (
                <span key={t.value} style={abs({ ...regs.axis, color: mutedInk, top: "4px", left: col === 3 ? pctOf(t.value) : `calc(100% - ${pctOf(t.value)})`, transform: "translateX(-50%)" })}>
                  {t.text}
                </span>
              ))}
            </div>
          ))}
        </div>
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
          {ticks.map((t) => (
            <g key={`t${t.value}`} data-grid={t.value}>
              <line data-side="left" stroke={grid} strokeWidth={1} />
              <line data-side="right" stroke={grid} strokeWidth={1} />
            </g>
          ))}
          {diffTicks.map((t) => (
            <g key={`d${t.value}`} data-diff-grid={t.value}>
              <line data-side="left" stroke={grid} strokeWidth={1} />
              <line data-side="right" stroke={grid} strokeWidth={1} />
            </g>
          ))}
          {bands.map((b) => (
            <g key={b.band} data-band={b.band}>
              <rect data-part="male" fill={accent} />
              <rect data-part="female" fill={muted} />
            </g>
          ))}
          <line
            data-part="cross"
            stroke={inkOnGround}
            strokeWidth={1.4}
            opacity={0}
          />
        </svg>

        <span
          data-part="men"
          style={abs({ ...regs.annot, color: accentInk, fontWeight: 700 })}
        >
          {words.men}
        </span>
        <span
          data-part="women"
          style={abs({ ...regs.annot, color: mutedInk, fontWeight: 700 })}
        >
          {words.women}
        </span>
        <span
          data-part="men-surplus"
          style={abs({
            ...regs.axis,
            color: accentInk,
            fontWeight: 700,
            opacity: 0,
          })}
        >
          {words.menSurplus}
        </span>
        <span
          data-part="women-surplus"
          style={abs({
            ...regs.axis,
            color: mutedInk,
            fontWeight: 700,
            opacity: 0,
          })}
        >
          {words.womenSurplus}
        </span>
        {bands.map((b) => (
          <div key={b.band}>
            <span
              data-age={b.band}
              style={abs({ ...regs.annot, color: mutedInk })}
            >
              {b.band}
            </span>
            <span
              data-ratio={b.band}
              style={abs({
                ...regs.value,
                color: inkOnGround,
                fontWeight: 700,
                textShadow: halo,
                opacity: 0,
              })}
            >
              {b.ratioText}
            </span>
            <span
              data-diff={b.band}
              style={abs({
                ...regs.value,
                color: inkOnGround,
                fontWeight: 700,
                textShadow: halo,
                opacity: 0,
              })}
            >
              {b.diffText}
            </span>
          </div>
        ))}
        {ticks.map((t) => (
          <div key={`tl${t.value}`}>
            <span
              data-tick={`left:${t.value}`}
              style={abs({ ...regs.axis, color: mutedInk })}
            >
              {t.text}
            </span>
            <span
              data-tick={`right:${t.value}`}
              style={abs({ ...regs.axis, color: mutedInk })}
            >
              {t.text}
            </span>
          </div>
        ))}
        {diffTicks.map((t) => (
          <div key={`dl${t.value}`}>
            <span
              data-diff-tick={`left:${t.value}`}
              style={abs({ ...regs.axis, color: mutedInk, opacity: 0 })}
            >
              {t.text}
            </span>
            <span
              data-diff-tick={`right:${t.value}`}
              style={abs({ ...regs.axis, color: mutedInk, opacity: 0 })}
            >
              {t.text}
            </span>
          </div>
        ))}
        <span
          data-part="cross-label"
          style={abs({
            ...regs.annot,
            color: inkOnGround,
            fontWeight: 700,
            textShadow: halo,
            opacity: 0,
          })}
        >
          {words.crossLabel}
        </span>
      </div>
    </div>
  );
}
