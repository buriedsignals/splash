/**
 * Europe's installed low-carbon capacity, drawn THROUGH the design base as a treemap and CHOREOGRAPHED by the scroll.
 * The `treemap` type in the scrolly format: the subject of `static-treemap-europe-capacity` — water and the atom still
 * carry 77 %, but ten countries have tipped to wind and solar — told with the gestures a scroll can make
 * (`scrolly/references/directed-type-choreography.md`): one block divided into its fuels, re-divided into countries,
 * the tipped countries taking the accent, the largest country opened into its own fuels.
 *
 * THE STATIC PLATE'S RULES ARE THE FLOOR: squarified cells; every cell carries its own number, value then subject then
 * basis, giving them up in the reverse order; the accent marks the thread (wind and solar), never the maximum; the
 * remainder split along the thread; installed capacity, not output, said in the source.
 *
 * `treemap-drive.mjs` lays out every cell in the reader's pixels on each paint. What is rendered here is the country
 * layout in percentages, for a reader without a script.
 */

import type { CSSProperties } from "react";
import {
  adjustToContrast,
  contrast,
  mix,
  TEXT_CONTRAST_MIN,
} from "#shared/chart-beat/colour.mjs";
import { squarify } from "./treemap-drive.mjs";

export type Cell = {
  key: string;
  mw: number;
  value: string;
  name: string;
  basis: string;
  thread: boolean;
};
type Style = Record<string, string | number>;

export const NOTES = [
  "blockNote",
  "fuelNote",
  "landNote",
  "tippedNote",
  "openNote",
  "readNote",
] as const;

export function DirectedTreemapScrolly({
  block,
  fuels,
  lands,
  inside,
  opens,
  words,
  alt,
  regs,
  ground,
  accent,
  ink,
  muted,
}: {
  block: Cell;
  fuels: Cell[];
  lands: Cell[];
  inside: Cell[];
  opens: string;
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
  const field = mix(ground, ink, 0.1);
  const thread = accent;
  const legibleOn = (fill: string) =>
    contrast(ink, fill) >= contrast(ground, fill) ? ink : ground;
  const accentInk =
    adjustToContrast(accent, ground, TEXT_CONTRAST_MIN) ?? accent;
  const mutedInk = adjustToContrast(muted, ground, TEXT_CONTRAST_MIN) ?? muted;
  const slot: CSSProperties = {
    gridArea: "1 / 1",
    justifySelf: "end",
    textAlign: "right",
  };
  const pct = squarify(
    lands.map((l) => l.mw),
    0,
    0,
    100,
    100,
  );

  const cell = (
    group: string,
    c: Cell,
    fill: string,
    initial?: { x: number; y: number; w: number; h: number },
  ) => (
    <div
      key={`${group}:${c.key}`}
      data-cell={`${group}:${c.key}`}
      style={{
        position: "absolute",
        left: initial ? `${initial.x}%` : 0,
        top: initial ? `${initial.y}%` : 0,
        width: initial ? `${initial.w}%` : 0,
        height: initial ? `${initial.h}%` : 0,
        boxSizing: "border-box",
        overflow: "hidden",
        padding: "4px 6px",
        background: fill,
        color: legibleOn(fill),
        boxShadow: `inset 0 0 0 1px ${ground}`,
        opacity: initial ? 1 : 0,
      }}
    >
      <span
        data-part="value"
        style={{
          ...regs.value,
          display: "block",
          width: "max-content",
          whiteSpace: "nowrap",
          color: "inherit",
          fontWeight: 700,
        }}
      >
        {c.value}
      </span>
      <span
        data-part="name"
        style={{
          ...regs.annot,
          display: "block",
          width: "max-content",
          whiteSpace: "nowrap",
          color: "inherit",
          fontWeight: c.thread ? 700 : regs.annot.fontWeight,
        }}
      >
        {c.name}
      </span>
      <span
        data-part="basis"
        style={{
          ...regs.axis,
          display: "block",
          width: "max-content",
          whiteSpace: "nowrap",
          color: "inherit",
          opacity: 0.78,
        }}
      >
        {c.basis}
      </span>
    </div>
  );

  return (
    <div
      role="img"
      aria-label={alt}
      data-treemap={JSON.stringify({
        block: { key: block.key, mw: block.mw },
        fuels: fuels.map(({ key, mw, thread: t }) => ({ key, mw, thread: t })),
        lands: lands.map(({ key, mw, thread: t }) => ({ key, mw, tipped: t })),
        inside: inside.map(({ key, mw, thread: t }) => ({
          key,
          mw,
          thread: t,
        })),
        opens,
        field,
        thread,
        onField: legibleOn(field),
        onThread: legibleOn(thread),
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
        {cell("block", block, field)}
        {fuels.map((f) => cell("fuel", f, f.thread ? thread : field))}
        {lands.map((l, i) =>
          cell("land", l, l.thread ? thread : field, pct[i]),
        )}
        {inside.map((f) => cell("inside", f, f.thread ? thread : field))}
      </div>
    </div>
  );
}
