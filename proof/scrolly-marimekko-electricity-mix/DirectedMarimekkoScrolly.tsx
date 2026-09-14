/**
 * Six countries' electricity mixes, 2024, drawn THROUGH the design base as a marimekko and CHOREOGRAPHED by the scroll.
 * The `marimekko` type in the scrolly format: the subject of `static-marimekko-electricity-mix` — coal is 12 % of the
 * six, and nearly all of it sits in two columns — told with the gestures a scroll can make
 * (`scrolly/references/directed-type-choreography.md`): equal columns of percentages taking the width of their
 * production, so an area becomes a quantity; coal alone; the coal bands gathered into one column.
 *
 * THE STATIC PLATE'S RULES ARE THE FLOOR: width is a country's generation, height its mix; the bands stacked in family
 * order with one ramp of the accent, darkest at coal; the width dimension named; a share under 0.5 % drawn and not
 * numbered; the sources named once, in stacking order.
 *
 * `marimekko-drive.mjs` lays out every band in the reader's pixels on each paint. What is rendered here is the last
 * card's picture, for a reader without a script.
 */

import type { CSSProperties } from "react";
import {
  adjustToContrast,
  contrast,
  mix,
  TEXT_CONTRAST_MIN,
} from "#shared/chart-beat/colour.mjs";

export type Column = {
  trackedText: string;
  key: string;
  label: string;
  total: number;
  totalText: string;
  bands: { key: string; value: number; pct: string }[];
};
type Style = Record<string, string | number>;

export function DirectedMarimekkoScrolly({
  columns,
  sources,
  tracked,
  words,
  alt,
  regs,
  ground,
  accent,
  ink,
  muted,
}: {
  columns: Column[];
  sources: { key: string; label: string }[];
  tracked: string;
  words: {
    widthName: string;
    grandNote: string;
    trackedNote: string;
    stackNote: string;
    stackLabel: string;
    heightNote: string;
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
  const darkPole = mix(accent, ink, 0.62);
  const lightPole = mix(accent, ground, 0.74);
  const fillOf = (i: number) =>
    mix(darkPole, lightPole, i / Math.max(sources.length - 1, 1));
  const legibleOn = (fill: string) =>
    contrast(ink, fill) >= contrast(ground, fill) ? ink : ground;
  const accentInk =
    adjustToContrast(accent, ground, TEXT_CONTRAST_MIN) ?? accent;
  const mutedInk = adjustToContrast(muted, ground, TEXT_CONTRAST_MIN) ?? muted;
  const inkOnGround = adjustToContrast(ink, ground, TEXT_CONTRAST_MIN) ?? ink;
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
  const fills = sources.map((_, i) => fillOf(i));

  return (
    <div
      role="img"
      aria-label={alt}
      data-marimekko={JSON.stringify({
        columns: columns.map(({ key, total, bands }) => ({
          key,
          total,
          bands: bands.map(({ key: k, value }) => ({ key: k, value })),
        })),
        sources: sources.map((s) => s.key),
        tracked,
        fills,
        inks: fills.map(legibleOn),
        groundInk: inkOnGround,
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
        <span
          data-part="height-note"
          style={{ ...regs.axis, color: mutedInk, fontWeight: 700 }}
        >
          {words.heightNote}
        </span>
        <span style={{ display: "grid", marginLeft: "auto" }}>
          {(["grandNote", "trackedNote", "stackNote"] as const).map((k) => (
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
        {columns.map((c, ci) => (
          <div key={c.key} data-column={c.key}>
            <span
              data-part="name"
              style={abs({
                ...regs.annot,
                color: inkOnGround,
                whiteSpace: "nowrap",
                left: `${(ci / columns.length) * 80}%`,
              })}
            >
              {c.label}
            </span>
            {c.bands.map((b, bi) => (
              <div
                key={b.key}
                data-band={b.key}
                style={abs({
                  background: fills[bi],
                  left: `${(ci / columns.length) * 80}%`,
                  width: `${80 / columns.length - 1}%`,
                  top: `${10 + bi * 9}%`,
                  height: "9%",
                })}
              />
            ))}
            {c.bands.map((b, bi) => (
              <span
                key={`p${b.key}`}
                data-pct={b.key}
                style={abs({
                  ...regs.axis,
                  color: legibleOn(fills[bi]),
                  whiteSpace: "nowrap",
                  opacity: 0,
                })}
              >
                {b.pct}
              </span>
            ))}
            <span
              data-part="piece"
              style={abs({
                ...regs.value,
                color: legibleOn(fills[0]),
                whiteSpace: "nowrap",
                textAlign: "center",
                opacity: 0,
              })}
            >
              <span style={{ display: "block" }}>{c.label}</span>
              <span style={{ display: "block" }}>{c.trackedText}</span>
            </span>
            <span
              data-part="total"
              style={abs({
                ...regs.value,
                color: mutedInk,
                whiteSpace: "nowrap",
                opacity: 0,
              })}
            >
              {c.totalText}
            </span>
          </div>
        ))}
        {sources.map((s, i) => (
          <span
            key={s.key}
            data-source-label={s.key}
            style={abs({
              ...regs.annot,
              color: s.key === tracked ? inkOnGround : mutedInk,
              fontWeight: s.key === tracked ? 700 : regs.annot.fontWeight,
              whiteSpace: "nowrap",
              opacity: 0,
            })}
          >
            <span
              data-swatch
              style={{
                display: "inline-block",
                width: "10px",
                height: "10px",
                marginRight: "6px",
                background: fills[i],
                verticalAlign: "middle",
              }}
            />
            {s.label}
          </span>
        ))}
        <span
          data-part="stack-label"
          style={abs({
            ...regs.value,
            color: accentInk,
            whiteSpace: "nowrap",
            opacity: 0,
          })}
        >
          {words.stackLabel}
        </span>
        <span
          data-part="width-name"
          style={abs({
            ...regs.axis,
            color: mutedInk,
            whiteSpace: "nowrap",
            opacity: 0,
          })}
        >
          {words.widthName}
        </span>
      </div>
      <div
        data-part="legend"
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "2px 12px",
          opacity: 0,
        }}
      >
        {sources.map((s, i) => (
          <span
            key={s.key}
            style={{
              ...regs.annot,
              color: s.key === tracked ? inkOnGround : mutedInk,
              fontWeight: s.key === tracked ? 700 : regs.annot.fontWeight,
              whiteSpace: "nowrap",
            }}
          >
            <span
              style={{
                display: "inline-block",
                width: "10px",
                height: "10px",
                marginRight: "5px",
                background: fills[i],
                verticalAlign: "middle",
              }}
            />
            {s.label}
          </span>
        ))}
      </div>
    </div>
  );
}
