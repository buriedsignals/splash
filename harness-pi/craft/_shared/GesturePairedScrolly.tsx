/**
 * A PAIRED-family scrolly (lollipop, grouped-bar, bullet, diverging-bar, population-pyramid — prop `variant`) whose
 * staging is the beat's own `gestures`: one band per key on ONE value scale from zero, up to two marks per band in
 * one hue at two tones (the family's SERIES_TONE), names in a left column (the pyramid: on its spine), a value at a
 * mark's tip, and every gesture's marks — the accent, a ring, the keys stepping back, a compare's copy, a bracket's
 * spine (pyramid), a reference rule — laid out in the reader's pixels on each paint by the drive
 * (`applyPairedState`, gesture-paired-scrolly.mjs). What is rendered here for a reader without a script is the
 * closing card's picture, drawn from the family adapter's geometry (`layoutPaired`), every note written.
 *
 * THE STATIC PLATE'S RULES ARE THE FLOOR: one value scale for every card; names never rotated or cut; the accent only
 * on what a gesture marks; furniture derived from the ground.
 */

import type { CSSProperties } from "react";
import {
  adjustToContrast,
  mix,
  TEXT_CONTRAST_MIN,
} from "#shared/chart-beat/colour.mjs";
import { layoutPaired, SERIES_TONE } from "./gesture-family-paired.mjs";

type Style = Record<string, string | number>;
export type Key = { name: string; seen: number; gap?: boolean };
export type Mark = {
  name: string;
  key: number;
  j: number;
  value: number;
  label: string;
};
export type PlanItem = {
  k: number;
  do: string;
  own: number[];
  value?: number;
  label?: string;
  members?: number[];
  whole?: boolean;
  steps?: string[];
};
/** The closing picture, for the no-JS still: the adapter's state over the drawn keys. */
export type Still = {
  order: string[];
  emphasis: Record<string, string>;
  copies: { onto: string; value: number }[];
  references: { value: number }[];
  lo: number;
  hi: number;
};

export function GesturePairedScrolly({
  variant,
  keys,
  marks,
  series,
  ceiling,
  reveal,
  rest,
  plan,
  notes,
  still,
  unit,
  alt,
  regs,
  ground,
  accent,
  ink,
  muted,
}: {
  variant: string;
  keys: Key[];
  marks: Mark[];
  series: string[];
  ceiling?: number;
  reveal: boolean;
  rest: string | null;
  plan: PlanItem[];
  notes: string[];
  still: Still;
  unit: string;
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
  const tones: number[] = (SERIES_TONE as Record<string, number[]>)[
    variant
  ] ?? [1, 0.5];
  // One hue at two tones: the neutral and the accent each taken toward the ground by the series' tone.
  const fillOf = (j: number) => mix(ground, ink, 0.2 + 0.45 * tones[j]);
  const accentOf = (j: number) => mix(ground, accent, 0.3 + 0.7 * tones[j]);
  const trackFill = mix(ground, ink, 0.08);
  const copyFill = mix(ground, ink, 0.18);
  const halo = `0 0 2px ${ground}, 0 0 3px ${ground}, 0 0 4px ${ground}`;
  const abs = (extra: CSSProperties): CSSProperties => ({
    position: "absolute",
    left: 0,
    top: 0,
    whiteSpace: "nowrap",
    ...extra,
  });
  const pyramid = variant === "population-pyramid";
  const bullet = variant === "bullet";
  const lollipop = variant === "lollipop";

  // ── the no-JS still: the closing picture through the adapter's own geometry, in a fixed viewBox ──────────────
  const VW = 1000;
  const nameW = pyramid ? 120 : 200;
  const VH = Math.max(320, keys.length * 34);
  const markRows = marks.map((m) => ({
    name: m.name,
    value: m.value,
    key: keys[m.key].name,
    j: m.j,
  }));
  const frame = pyramid
    ? { x: 20, y: 6, width: VW - 40, height: VH - 12, gutter: nameW }
    : { x: nameW + 10, y: 6, width: VW - nameW - 110, height: VH - 12 };
  const geo = layoutPaired({
    variant,
    keys: keys.map((k) => ({ name: k.name })),
    marks: markRows,
    series,
    state: {
      ...still,
      stepBack: [],
      notes: [],
      brackets: [],
      revealed: Infinity,
    },
    frame,
    domain: [still.lo, still.hi],
  });
  const writtenNotes = notes.filter((t) => t.trim());
  const noScript = `[data-gpair] [data-part="stage"] > :not([data-part="still"]) { display: none !important; } [data-gpair] [data-part="still"] { display: flex !important; }`;

  const stillSvg = (
    <svg
      viewBox={`0 0 ${VW} ${VH}`}
      preserveAspectRatio="xMidYMid meet"
      style={{ width: "100%", height: "100%" }}
    >
      {keys.map((k) => {
        const b = geo.bands.get(k.name);
        if (!b) return null;
        const strong = marks.some(
          (m) => m.key === keys.indexOf(k) && still.emphasis[m.name],
        );
        return (
          <text
            key={k.name}
            x={pyramid ? VW / 2 : nameW}
            y={b.y + b.h / 2 + 5}
            textAnchor={pyramid ? "middle" : "end"}
            fontSize={14}
            fill={strong ? accentInk : inkOnGround}
            fontWeight={strong ? 700 : 400}
            fontFamily={String(regs.annot.fontFamily ?? "sans-serif")}
          >
            {k.name}
          </text>
        );
      })}
      {bullet && ceiling !== undefined
        ? keys.map((k) => {
            const b = geo.bands.get(k.name);
            return b ? (
              <rect
                key={`t-${k.name}`}
                x={geo.xOf(0)}
                y={b.y + b.h * 0.11}
                width={geo.xOf(ceiling) - geo.xOf(0)}
                height={b.h * 0.78}
                fill={trackFill}
              />
            ) : null;
          })
        : null}
      {marks.map((m) => {
        const g = geo.marks.get(m.name);
        if (!g) return null;
        const on = still.emphasis[m.name] === "accent";
        const fill = on ? accentOf(m.j) : fillOf(m.j);
        return lollipop ? (
          <g key={m.name}>
            <rect
              x={g.x0}
              y={g.y + g.h / 2 - 1}
              width={g.x1 - g.x0}
              height={2}
              fill={fill}
            />
            <circle
              cx={g.tip.x}
              cy={g.y + g.h / 2}
              r={Math.min(6, g.h * 0.4)}
              fill={fill}
            />
          </g>
        ) : (
          <rect
            key={m.name}
            x={g.x0}
            y={g.y}
            width={g.x1 - g.x0}
            height={g.h}
            fill={fill}
          />
        );
      })}
      {still.copies.map((c, i) => {
        const g = geo.marks.get(c.onto);
        if (!g) return null;
        const end = geo.xOf(c.value, g.side);
        return (
          <rect
            key={`c${i}`}
            x={Math.min(g.base, end)}
            y={g.y + g.h / 2}
            width={Math.abs(end - g.base)}
            height={Math.max(2, g.h / 2)}
            fill={copyFill}
            stroke={inkOnGround}
            strokeDasharray="3 2"
          />
        );
      })}
      {(Array.isArray(geo.zero) ? geo.zero : [geo.zero]).map(
        (z: number, i: number) => (
          <line
            key={`z${i}`}
            x1={z}
            x2={z}
            y1={6}
            y2={VH - 6}
            stroke={mutedInk}
            strokeWidth={1}
          />
        ),
      )}
    </svg>
  );

  return (
    <div
      role="img"
      aria-label={alt}
      data-gpair={JSON.stringify({
        variant,
        ceiling: ceiling ?? still.hi,
        reveal,
        keys: keys.map((k) => ({ seen: k.seen })),
        marks: marks.map((m) => ({
          v: Math.round(m.value * 1e6) / 1e6,
          key: m.key,
          j: m.j,
          fill: fillOf(m.j),
          accentFill: accentOf(m.j),
        })),
        plan: plan.map(({ label: _label, ...p }) => p),
        colours: { ink: inkOnGround, accent: accentInk },
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
        <span
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "4px 14px",
            alignItems: "baseline",
          }}
        >
          {unit ? (
            <span style={{ ...regs.axis, color: mutedInk, fontWeight: 700 }}>
              {unit}
            </span>
          ) : null}
          {series.length === 2
            ? series.map((s, j) => (
                <span
                  key={s}
                  style={{
                    ...regs.axis,
                    color: mutedInk,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "5px",
                  }}
                >
                  <span
                    style={{
                      display: "inline-block",
                      width: "10px",
                      height: "10px",
                      background: fillOf(j),
                    }}
                  />
                  {s}
                </span>
              ))
            : null}
        </span>
        <span style={{ display: "grid", marginLeft: "auto" }}>
          {plan.map((p, j) => (
            <span
              key={p.k}
              data-note={p.k}
              style={{
                ...regs.value,
                gridArea: "1 / 1",
                justifySelf: "end",
                textAlign: "right",
                color: accentInk,
                opacity: 0,
              }}
            >
              {notes[j]}
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
            flexDirection: "column",
            gap: "8px",
          }}
        >
          <div style={{ flex: "1 1 auto", minHeight: 0 }}>{stillSvg}</div>
          {rest ? (
            <p style={{ ...regs.annot, color: mutedInk, margin: 0 }}>{rest}</p>
          ) : null}
          {writtenNotes.length ? (
            <p
              style={{
                ...regs.value,
                color: accentInk,
                margin: 0,
                flex: "0 0 auto",
              }}
            >
              {writtenNotes.join(" · ")}
            </p>
          ) : null}
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
          {bullet
            ? keys.map((_, i) => (
                <rect key={`t${i}`} data-track={i} fill={trackFill} />
              ))
            : null}
          {marks.map((m, i) => (
            <g key={i}>
              <rect data-bar={i} fill={fillOf(m.j)} />
              <rect data-accent={i} fill={accentOf(m.j)} opacity={0} />
              {lollipop ? <circle data-dot={i} fill={fillOf(m.j)} /> : null}
              <rect
                data-ring={i}
                fill="none"
                stroke={accentInk}
                strokeWidth={1.5}
                rx={3}
                opacity={0}
              />
            </g>
          ))}
          <line data-part="zero" stroke={mutedInk} strokeWidth={1} />
          {pyramid ? (
            <line data-part="zero" stroke={mutedInk} strokeWidth={1} />
          ) : null}
          {plan.map((p) =>
            p.do === "compare" ? (
              <rect
                key={p.k}
                data-copy={p.k}
                fill={copyFill}
                stroke={inkOnGround}
                strokeWidth={1}
                strokeDasharray="3 2"
                opacity={0}
              />
            ) : p.do === "bracket" ? (
              <g key={p.k}>
                <line
                  data-spine={p.k}
                  stroke={inkOnGround}
                  strokeWidth={1.5}
                  opacity={0}
                />
                {(p.members ?? []).map((_, t) => (
                  <line
                    key={t}
                    data-mtick={p.k}
                    stroke={inkOnGround}
                    strokeWidth={1.5}
                    opacity={0}
                  />
                ))}
              </g>
            ) : p.do === "reference" ? (
              <g key={p.k}>
                {(pyramid ? [0, 1] : [0]).map((t) => (
                  <line
                    key={t}
                    data-rule={p.k}
                    stroke={accentInk}
                    strokeWidth={1.2}
                    strokeDasharray="4 3"
                    opacity={0}
                  />
                ))}
              </g>
            ) : null,
          )}
        </svg>

        {keys.map((k, i) => (
          <div key={i}>
            <span
              data-name={i}
              style={abs({
                ...regs.annot,
                color: inkOnGround,
                textAlign: "right",
                lineHeight: 1.1,
              })}
            >
              {k.name}
            </span>
            {k.gap ? (
              <span
                data-gap={i}
                style={abs({ ...regs.annot, color: mutedInk })}
              >
                n/a
              </span>
            ) : null}
          </div>
        ))}
        {marks.map((m, i) => (
          <span
            key={i}
            data-value={i}
            style={abs({
              ...regs.value,
              color: inkOnGround,
              fontWeight: 700,
              textShadow: halo,
              opacity: 0,
            })}
          >
            {m.label}
          </span>
        ))}
        {rest ? (
          <span
            data-part="rest"
            style={abs({ ...regs.annot, color: mutedInk })}
          >
            {rest}
          </span>
        ) : null}
        {plan
          .filter((p) => p.label !== undefined)
          .map((p) => (
            <span
              key={p.k}
              data-label={p.k}
              style={abs({
                ...regs.value,
                color: p.do === "reference" ? accentInk : inkOnGround,
                fontWeight: 700,
                textShadow: halo,
                opacity: 0,
              })}
            >
              {p.label}
            </span>
          ))}
      </div>
    </div>
  );
}
