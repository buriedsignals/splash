/**
 * A bar-and-column scrolly whose staging is the beat's own `gestures`: one bar per drawn row on one value scale from
 * zero, names in a left column, a value written after each bar, and every gesture's marks — the accent, a ring, the
 * rows stepping back, a bracket's spine and figure, a compare's copy, a reference rule — laid out in the reader's
 * pixels on each paint by the drive (`applyGestureState`, gesture-scrolly.mjs). What is rendered here is the closing
 * card's picture for a reader without a script: the same rows on the same scale, every gesture's note written.
 *
 * THE STATIC PLATE'S RULES ARE THE FLOOR: one value scale from zero for every card; names never rotated or cut (they
 * wrap); the accent only on what a gesture marks.
 */

import type { CSSProperties } from "react";
import {
  adjustToContrast,
  mix,
  TEXT_CONTRAST_MIN,
} from "#shared/chart-beat/colour.mjs";

type Style = Record<string, string | number>;
export type Row = { name: string; value: number; label: string };
export type PlanItem = {
  k: number;
  do: string;
  own: number[];
  value?: number;
  label?: string;
  members?: number[];
  whole?: boolean;
  steps?: string[];
  noteText?: string;
};
/** The closing card's picture, for the no-JS still: rows in their last order, their emphasis, the scale. */
export type Still = {
  order: number[];
  accent: boolean[];
  back: boolean[];
  lo: number;
  hi: number;
  copies: { row: number; value: number; label: string }[];
};

export function GestureBarScrolly({
  rows,
  seen,
  rank,
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
  rows: Row[];
  /** per drawn row, the first gesture that acts on it (-1 for none) */
  seen: number[];
  /** per drawn row, its rank among the drawn rows (0 = largest) */
  rank: number[];
  reveal: boolean;
  rest: string | null;
  plan: PlanItem[];
  /** per gesture, the note its card's header reads ("" for none) */
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
  const bar = mix(ground, ink, 0.55);
  const copyFill = mix(ground, ink, 0.25);
  const halo = `0 0 2px ${ground}, 0 0 3px ${ground}, 0 0 4px ${ground}`;
  const abs = (extra: CSSProperties): CSSProperties => ({
    position: "absolute",
    left: 0,
    top: 0,
    whiteSpace: "nowrap",
    ...extra,
  });

  // THE CLOSING CARD'S PICTURE WITHOUT A SCRIPT. The drive lays out every mark in the reader's pixels, so with no
  // script the SVG's rects have no geometry. A <noscript> stylesheet hides the drive's layer and shows a static grid
  // of the same rows on the same scale from zero, the rows a gesture marked in the accent, every note written.
  const span = still.hi - still.lo || 1;
  // Room on the left for the value of a negative bar, which is written before it.
  const room = rows.some((r) => r.value < 0) ? 14 : 0;
  const pct = (v: number) => room + ((v - still.lo) / span) * (82 - room);
  const writtenNotes = notes.filter((t) => t.trim());
  const noScript =
    `[data-gbar] [data-part="stage"] > :not([data-part="still"]) { display: none !important; }` +
    `[data-gbar] [data-part="still"] { display: flex !important; }`;
  const slot: CSSProperties = {
    gridArea: "1 / 1",
    justifySelf: "end",
    textAlign: "right",
  };

  return (
    <div
      role="img"
      aria-label={alt}
      data-gbar={JSON.stringify({
        rows: rows.map((r, i) => ({
          v: Math.round(r.value * 1e6) / 1e6,
          rank: rank[i],
          seen: seen[i],
        })),
        reveal,
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
        <span style={{ ...regs.axis, color: mutedInk, fontWeight: 700 }}>
          {unit}
        </span>
        <span style={{ display: "grid", marginLeft: "auto" }}>
          {plan.map((p, j) => (
            <span
              key={p.k}
              data-note={p.k}
              style={{ ...regs.value, ...slot, color: accentInk, opacity: 0 }}
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
          <div
            style={{
              flex: "1 1 auto",
              minHeight: 0,
              display: "grid",
              gridTemplateColumns: "minmax(0, max-content) minmax(0, 1fr)",
              gridAutoRows: "minmax(0, 1fr)",
              alignItems: "center",
              columnGap: "12px",
            }}
          >
            {still.order.map((i) => {
              const r = rows[i];
              const strong = still.accent[i];
              const colour = strong ? accentInk : inkOnGround;
              const from = pct(Math.min(0, r.value));
              const to = pct(Math.max(0, r.value));
              const copies = still.copies.filter((c) => c.row === i);
              return (
                <div key={i} style={{ display: "contents" }}>
                  <span
                    style={{
                      ...regs.annot,
                      color: colour,
                      fontWeight: strong ? 700 : regs.annot.fontWeight,
                      textAlign: "right",
                      opacity: still.back[i] ? 0.4 : 1,
                    }}
                  >
                    {r.name}
                  </span>
                  <span
                    style={{
                      position: "relative",
                      height: "100%",
                      opacity: still.back[i] ? 0.4 : 1,
                    }}
                  >
                    <span
                      style={{
                        position: "absolute",
                        left: `${pct(0)}%`,
                        top: 0,
                        bottom: 0,
                        borderLeft: `1px solid ${mutedInk}`,
                      }}
                    />
                    <span
                      style={{
                        position: "absolute",
                        left: `${from}%`,
                        width: `${to - from}%`,
                        top: "19%",
                        height: "62%",
                        maxHeight: "36px",
                        background: strong ? accent : bar,
                      }}
                    />
                    {copies.map((c, m) => (
                      <span
                        key={m}
                        style={{
                          position: "absolute",
                          left: `${pct(Math.min(0, c.value))}%`,
                          width: `${Math.abs(pct(c.value) - pct(0))}%`,
                          top: "50%",
                          height: "31%",
                          background: copyFill,
                          outline: `1px dashed ${inkOnGround}`,
                        }}
                      />
                    ))}
                    <span
                      style={{
                        ...regs.value,
                        position: "absolute",
                        top: "50%",
                        transform:
                          r.value < 0
                            ? "translate(calc(-100% - 6px), -50%)"
                            : "translate(6px, -50%)",
                        left: `${r.value < 0 ? from : Math.max(to, ...copies.map((c) => pct(c.value)))}%`,
                        color: colour,
                        fontWeight: 700,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {r.label}
                      {copies.map((c) => ` · ${c.label}`).join("")}
                    </span>
                  </span>
                </div>
              );
            })}
            {rest ? (
              <span
                style={{
                  ...regs.annot,
                  color: mutedInk,
                  gridColumn: "1 / -1",
                }}
              >
                {rest}
              </span>
            ) : null}
          </div>
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
          {rows.map((r, i) => (
            <g key={i}>
              <rect data-bar={i} fill={bar} />
              <rect data-accent={i} fill={accent} opacity={0} />
              <path
                data-cut={i}
                fill="none"
                stroke={ground}
                strokeWidth={2.5}
                opacity={0}
              />
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
          <line data-part="baseline" stroke={mutedInk} strokeWidth={1} />
          {plan.map((p) =>
            p.do === "compare" ? (
              <g key={p.k}>
                <rect
                  data-copy={p.k}
                  fill={copyFill}
                  stroke={inkOnGround}
                  strokeWidth={1}
                  strokeDasharray="3 2"
                  opacity={0}
                />
                <line
                  data-tick={p.k}
                  stroke={inkOnGround}
                  strokeWidth={1.5}
                  opacity={0}
                />
              </g>
            ) : p.do === "bracket" ? (
              <g key={p.k}>
                <line
                  data-spine={p.k}
                  stroke={inkOnGround}
                  strokeWidth={1.5}
                  opacity={0}
                />
                {[...(p.members ?? []), ...(p.whole && rest ? [-1] : [])].map(
                  (m, t) => (
                    <line
                      key={t}
                      data-mtick={p.k}
                      stroke={
                        m === p.own[0] && p.whole ? accentInk : inkOnGround
                      }
                      strokeWidth={1.5}
                      opacity={0}
                    />
                  ),
                )}
              </g>
            ) : p.do === "reference" ? (
              <line
                key={p.k}
                data-rule={p.k}
                stroke={accentInk}
                strokeWidth={1.2}
                strokeDasharray="4 3"
                opacity={0}
              />
            ) : null,
          )}
        </svg>

        {rows.map((r, i) => (
          <div key={i}>
            <span
              data-name={i}
              style={abs({
                ...regs.annot,
                color: inkOnGround,
                textAlign: "right",
                lineHeight: 1.15,
              })}
            >
              {r.name}
            </span>
            <span
              data-value={i}
              style={abs({
                ...regs.value,
                color: inkOnGround,
                fontWeight: 700,
                textShadow: halo,
              })}
            >
              {r.label}
            </span>
          </div>
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
