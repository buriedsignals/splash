/**
 * The ten largest CO₂ emitters of 2024, as columns, drawn THROUGH the design base and revealed by the
 * scroll. The `bar and column` type in the scrolly format: the plate of `static-bar-top-emitters-2024`,
 * its words and its rules, read one element at a time.
 *
 * THE STATIC PLATE'S RULES, KEPT:
 *   - `every-bar-labelled-lets-the-axis-go` — every column prints its own number, so no value axis
 *     and no gridline; the zero baseline is the only rule.
 *   - `accent-marks-the-thread` / `context-in-neutral-at-the-subject-scale` — the subject in the
 *     direction's accent, the nine others one muted step off the ground.
 *   - `the-set-a-claim-adds-up-is-drawn-as-a-set` — the countries the headline adds together are
 *     bracketed, their sum is printed on the bracket, and the rule at the subject's level stops where
 *     the set stops.
 *   - names are never rotated and never wider than the column they name; two lines at most.
 *
 * WHAT THE FLUID FRAME ADDS: A SECOND ORIENTATION. Ten columns on a phone are thirty pixels wide, and
 * "Indonésie" does not fit under thirty pixels in any direction's annotation face. The static rule
 * forbids both answers a chart usually reaches for — rotating the name or cutting it. So the same
 * marks are also drawn as ROWS (name, bar, value; the rule vertical, the bracket beside the set), and
 * `bar-drive.mjs` shows whichever orientation lets every name fit, measured in the reader's own
 * pixels. The columns are what is rendered, and what a reader without a script gets.
 */

import type { CSSProperties } from "react";
import {
  adjustToContrast,
  TEXT_CONTRAST_MIN,
} from "#shared/chart-beat/colour.mjs";

export type Column = { name: string; value: number; label: string };
type Style = Record<string, string | number>;

/** The band scale of the static plate, as fractions of the plot's width: paddingInner 0.28,
 *  paddingOuter 0.06. */
function bands(n: number) {
  const inner = 0.28;
  const outer = 0.06;
  const step = 1 / (n - inner + 2 * outer);
  const width = step * (1 - inner);
  return { start: (i: number) => step * (outer + i), width, step };
}

export function DirectedColumnsScrolly({
  rows,
  subject,
  comparison,
  comparisonNote,
  alt,
  regs,
  pad,
  stroke,
  ground,
  accent,
  ink,
  muted,
}: {
  rows: Column[];
  subject: string;
  comparison: string[];
  comparisonNote: string;
  alt: string;
  regs: Record<
    "display" | "eyebrow" | "body" | "axis" | "annot" | "value",
    Style
  >;
  pad: number;
  stroke: { rule?: number };
  ground: string;
  accent: string;
  ink: string;
  muted: string;
}) {
  const subjectIndex = rows.findIndex((r) => r.name === subject);
  if (subjectIndex !== 0)
    throw new Error(`the subject ${subject} is not the first, tallest column`);
  const setIdx = rows
    .map((r, i) => (comparison.includes(r.name) ? i : -1))
    .filter((i) => i >= 0);
  if (setIdx.length < 2)
    throw new Error("the set the headline adds up needs at least two columns");
  for (let k = 1; k < setIdx.length; k++)
    if (setIdx[k] !== setIdx[k - 1] + 1)
      throw new Error("the set the headline adds up is not contiguous");

  const max = rows[0].value;
  /** The tallest column reaches the top of the plot; the headroom above it is the height of its own
   *  value label, in pixels of the value register, not a fraction of the frame. */
  const headroomPx = Math.ceil(
    Number.parseFloat(String(regs.value.fontSize)) * 1.9,
  );
  const share = (v: number) => v / max;
  const b = bands(rows.length);
  const pct = (f: number) => `${f * 100}%`;
  const accentInk =
    adjustToContrast(accent, ground, TEXT_CONTRAST_MIN) ?? accent;
  const mutedInk = adjustToContrast(muted, ground, TEXT_CONTRAST_MIN) ?? muted;
  const inkOnGround = adjustToContrast(ink, ground, TEXT_CONTRAST_MIN) ?? ink;
  const rule = stroke.rule ?? 1;
  const first = setIdx[0];
  const last = setIdx[setIdx.length - 1];

  const abs = (extra: CSSProperties): CSSProperties => ({
    position: "absolute",
    ...extra,
  });
  const nameStyle = (i: number): CSSProperties => ({
    ...regs.annot,
    color: i === 0 ? inkOnGround : mutedInk,
    fontWeight: i === 0 ? 700 : (regs.annot.fontWeight as number),
  });
  const valueStyle = (i: number): CSSProperties => ({
    ...regs.value,
    color: i === 0 ? accentInk : mutedInk,
    fontWeight: i === 0 ? 700 : (regs.value.fontWeight as number),
    whiteSpace: "nowrap",
  });

  return (
    <div
      role="img"
      aria-label={alt}
      style={{
        position: "absolute",
        inset: 0,
        background: ground,
        padding: `clamp(12px, 3vh, ${pad * 0.6}px) clamp(16px, 5vw, ${pad}px)`,
      }}
    >
      {/* ── COLUMNS ─────────────────────────────────────────────────────────────────────────── */}
      <div
        data-orient="columns"
        style={{
          position: "absolute",
          inset: `clamp(12px, 3vh, ${pad * 0.6}px) clamp(16px, 5vw, ${pad}px)`,
          display: "grid",
          gridTemplateRows: "minmax(0, 1fr) auto",
        }}
      >
        <div
          data-part="plot"
          style={{
            position: "relative",
            minHeight: 0,
            marginTop: `${headroomPx}px`,
          }}
        >
          {rows.map((r, i) => (
            <div
              key={`c${r.name}`}
              data-part="bar"
              style={abs({
                left: pct(b.start(i)),
                width: pct(b.width),
                bottom: 0,
                height: pct(share(r.value)),
                background: i === 0 ? accent : muted,
                transformOrigin: "bottom",
              })}
            />
          ))}
          {rows.map((r, i) => (
            <span
              key={`v${r.name}`}
              data-part="value"
              style={abs({
                ...valueStyle(i),
                left: pct(b.start(i) + b.width / 2),
                bottom: pct(share(r.value)),
                transform: "translate(-50%, -6px)",
              })}
            >
              {r.label}
            </span>
          ))}
          <div
            data-part="rule"
            style={abs({
              left: pct(b.start(0)),
              width: pct(b.start(last) + b.width - b.start(0)),
              bottom: pct(share(max)),
              borderTop: `${rule}px dashed ${accent}`,
              transformOrigin: "left",
            })}
          />
          <div
            data-part="bracket"
            style={abs({
              left: pct(b.start(first)),
              width: pct(b.start(last) + b.width - b.start(first)),
              bottom: `calc(${pct(share(max))} - 22px)`,
              height: "6px",
              borderLeft: `${rule}px solid ${accent}`,
              borderRight: `${rule}px solid ${accent}`,
              borderBottom: `${rule}px solid ${accent}`,
            })}
          />
          <span
            data-part="note"
            style={abs({
              ...regs.annot,
              color: accentInk,
              left: pct((b.start(first) + b.start(last) + b.width) / 2),
              bottom: `calc(${pct(share(max))} - 26px)`,
              transform: "translate(-50%, 100%)",
              whiteSpace: "nowrap",
            })}
          >
            {comparisonNote}
          </span>
          <div
            style={abs({
              left: 0,
              right: 0,
              bottom: 0,
              borderTop: `${rule}px solid ${ink}`,
            })}
          />
        </div>
        <div style={{ position: "relative", height: "3em", marginTop: "8px" }}>
          {rows.map((r, i) => (
            <span
              key={`n${r.name}`}
              data-part="name"
              style={abs({
                ...nameStyle(i),
                left: pct(b.start(i) - (b.step - b.width) / 2),
                width: pct(b.step),
                top: 0,
                textAlign: "center",
                lineHeight: 1.2,
              })}
            >
              {r.name}
            </span>
          ))}
        </div>
      </div>

      {/* ── ROWS: the same marks, for a frame too narrow to name ten columns ───────────────────── */}
      <div
        data-orient="rows"
        style={{
          position: "absolute",
          inset: `clamp(12px, 3vh, ${pad * 0.6}px) clamp(16px, 5vw, ${pad}px)`,
          // Not `hidden`: an inline `display` beats the attribute's own rule. The driver sets it.
          display: "none",
          gridTemplateColumns: "max-content minmax(0, 1fr)",
          columnGap: "10px",
          // Ten rows at most 52px each, centred: tall enough for the name, never stretched into slabs.
          gridTemplateRows: `repeat(${rows.length}, minmax(0, 52px))`,
          alignContent: "center",
          rowGap: "0",
        }}
      >
        {rows.map((r, i) => [
          <span
            key={`rn${r.name}`}
            data-part="name"
            style={{
              ...nameStyle(i),
              gridColumn: 1,
              gridRow: i + 1,
              textAlign: "right",
              alignSelf: "center",
              whiteSpace: "nowrap",
              padding: "5px 0",
            }}
          >
            {r.name}
          </span>,
          <div
            key={`rb${r.name}`}
            data-part="track"
            data-index={i}
            style={{
              position: "relative",
              alignSelf: "stretch",
              gridColumn: 2,
              gridRow: i + 1,
            }}
          >
            <div
              data-part="bar"
              style={abs({
                left: 0,
                top: "22%",
                bottom: "22%",
                width: pct(share(r.value) * 0.78),
                background: i === 0 ? accent : muted,
                transformOrigin: "left",
              })}
            />
            <span
              data-part="value"
              style={abs({
                ...valueStyle(i),
                left: `calc(${pct(share(r.value) * 0.78)} + 6px)`,
                top: "50%",
                transform: "translateY(-50%)",
              })}
            >
              {r.label}
            </span>
          </div>,
        ])}
        <div
          data-part="rule"
          style={{
            gridColumn: 2,
            gridRow: `1 / ${last + 2}`,
            position: "relative",
            pointerEvents: "none",
          }}
        >
          <div
            style={abs({
              left: "78%",
              top: 0,
              bottom: 0,
              borderLeft: `${rule}px dashed ${accent}`,
              transformOrigin: "top",
            })}
          />
        </div>
        <div
          data-part="bracket"
          style={{
            gridColumn: 2,
            gridRow: `${first + 1} / ${last + 2}`,
            position: "relative",
            pointerEvents: "none",
          }}
        >
          <div
            style={abs({
              left: `${share(rows[first].value) * 78 + 12}%`,
              top: "4px",
              bottom: "4px",
              width: "6px",
              borderTop: `${rule}px solid ${accent}`,
              borderRight: `${rule}px solid ${accent}`,
              borderBottom: `${rule}px solid ${accent}`,
            })}
          />
        </div>
        <span
          data-part="note"
          style={{
            ...regs.annot,
            color: accentInk,
            gridColumn: 2,
            gridRow: `${first + 1} / ${last + 2}`,
            alignSelf: "center",
            marginLeft: `calc(${share(rows[first].value) * 78 + 12}% + 14px)`,
            // A CHIP OF THE GROUND, so the rule at the subject's length passes BEHIND the note rather
            // than through its words — squeezed between bracket and rule it came out one word a line.
            // It never runs past the track's own right edge.
            maxWidth: `min(12em, calc(${100 - (share(rows[first].value) * 78 + 12)}% - 18px))`,
            background: ground,
            padding: "2px 4px",
            position: "relative",
            zIndex: 1,
            pointerEvents: "none",
          }}
        >
          {comparisonNote}
        </span>
      </div>
    </div>
  );
}
