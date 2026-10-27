/**
 * The Cell-grid family's SCROLLY visual (craft/gestures/GRAMMAR.md F7): one component, two variants — `heatmap-matrix`
 * (rows × columns) and `calendar-heatmap` (twelve months × 31 days) — staged by the story's own `gestures`, one card
 * each, the scroll interpolating between their states (`applyCellState`, gesture-cell-scrolly.mjs).
 *
 * The grid is an SVG drawn once, stretched to the stage (cells are geometry; every word is HTML at a fixed CSS size);
 * every gesture's marks are laid out at build time and the drive only sets opacities and moves row groups. What is
 * rendered here IS the closing card's picture, so a reader without a script gets it whole: every row in its last order,
 * every outline, every cutoff, nothing stepped back.
 *
 * Doctrine kept from the per-type kits: one hue stepped between the ground and the accent, its classes printed in the
 * data's units; the hue is the SCALE, so emphasis is an outline (the accent for a highlight, the ink for a ring or a
 * run, over a ground halo) and a step back is the cell washed toward the ground.
 */

import {
  adjustToContrast,
  mix,
  TEXT_CONTRAST_MIN,
} from "#shared/chart-beat/colour.mjs";
import { outlineOf } from "./gesture-family-cell.mjs";

type Style = Record<string, string | number>;
type Cell = { id: number; r: number; c: number; value: number; bin: number };
type Mark = {
  k: number;
  kind: "accent" | "ring" | "run" | "cutoff" | "compare";
  cells: number[];
  a?: number;
  b?: number;
};

export function GestureCellScrolly({
  variant,
  cells,
  rowLabels,
  colLabels,
  colTicks,
  bins,
  marks,
  filters,
  closingOrder,
  notes,
  unit,
  alt,
  regs,
  ground,
  accent,
  ink,
  muted,
}: {
  variant: "heatmap-matrix" | "calendar-heatmap";
  cells: Cell[];
  rowLabels: string[];
  colLabels: string[];
  colTicks: number[];
  bins: { label: string }[];
  marks: Mark[];
  filters: { k: number; kept: number[] }[];
  /** The rows' slots on the closing card (a reorder's end state), as row indices in slot order. */
  closingOrder: number[];
  /** Per gesture, the note its card's header reads ("" for none). */
  notes: string[];
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
  const CW = variant === "calendar-heatmap" ? 26 : 74;
  const CH = variant === "calendar-heatmap" ? 22 : 28;
  const W = colLabels.length * CW;
  const H = rowLabels.length * CH;
  const ramp = bins.map((_, i) =>
    mix(ground, accent, 0.1 + (i / Math.max(1, bins.length - 1)) * 0.9),
  );
  const edge = mix(ground, ink, 0.22);
  const missing = mix(ground, ink, 0.06);
  const accentInk =
    adjustToContrast(accent, ground, TEXT_CONTRAST_MIN) ?? accent;
  const inkOnGround = adjustToContrast(ink, ground, TEXT_CONTRAST_MIN) ?? ink;
  const mutedInk = adjustToContrast(muted, ground, TEXT_CONTRAST_MIN) ?? muted;
  const byId = new Map(cells.map((c) => [c.id, c]));
  const slotOf = new Map(closingOrder.map((r, s) => [r, s]));
  // Reading order for a reveal: row by row in the drawn order, then column by column (a calendar: date order).
  const reading = [...cells].sort(
    (a, b) => slotOf.get(a.r)! - slotOf.get(b.r)! || a.c - b.c,
  );
  const order = Object.fromEntries(reading.map((c, i) => [c.id, i]));
  // Rows move only when a reorder is staged: then every mark is drawn row by row, inside its row's group, so it moves
  // with its row; otherwise a block of rows is one outline.
  const moves = closingOrder.some((r, s) => r !== s);
  const restOrder = rowLabels.map((_, r) => r);

  const outline = (m: Mark, key: string, r?: number) => {
    const ids =
      r === undefined ? m.cells : m.cells.filter((i) => byId.get(i)?.r === r);
    const rects = outlineOf(
      ids.map((i) => byId.get(i)).filter(Boolean),
      r === undefined ? restOrder : [r],
    );
    const colour = m.kind === "accent" ? accentInk : inkOnGround;
    return rects.map((o: any, j: number) => {
      const box = {
        x: o.c0 * CW,
        y: r === undefined ? o.r0 * CH : 0,
        width: (o.c1 - o.c0 + 1) * CW,
        height: (o.r1 - o.r0 + 1) * CH,
      };
      return (
        <g key={`${key}-${j}`} data-g={m.k}>
          <rect
            {...box}
            fill="none"
            stroke={ground}
            strokeWidth={5}
            vectorEffect="non-scaling-stroke"
          />
          <rect
            {...box}
            fill="none"
            stroke={colour}
            strokeWidth={2}
            strokeDasharray={m.kind === "ring" ? "5 3" : undefined}
            vectorEffect="non-scaling-stroke"
          />
        </g>
      );
    });
  };
  // The accent is drawn last, over a run or a ring that shares its cells: the subject keeps its colour.
  const outlined = marks
    .filter((m) => m.kind === "accent" || m.kind === "ring" || m.kind === "run")
    .sort((x, y) => y.cells.length - x.cells.length || (x.kind === "accent" ? 1 : 0) - (y.kind === "accent" ? 1 : 0));

  return (
    <div
      role="img"
      aria-label={alt}
      data-gcell={JSON.stringify({
        pitch: CH,
        rows: rowLabels.length,
        filters,
        order,
      })}
      style={{
        position: "absolute",
        inset: 0,
        background: ground,
        display: "grid",
        gridTemplateRows: "auto auto minmax(0, 1fr)",
        gridTemplateColumns: "minmax(0, 1fr)",
        rowGap: "8px",
        padding: `12px var(--prose-gutter, clamp(16px, 6vw, 56px))`,
      }}
    >
      <div style={{ display: "grid" }}>
        {notes.map((t, k) => (
          <span
            key={k}
            data-note={k}
            style={{
              ...regs.value,
              gridArea: "1 / 1",
              color: accentInk,
              opacity: k === notes.length - 1 ? 1 : 0,
            }}
          >
            {t}
          </span>
        ))}
      </div>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: "2px 10px",
        }}
      >
        {bins.map((b, i) => (
          <span
            key={b.label}
            style={{
              ...regs.axis,
              color: mutedInk,
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            <span
              style={{
                width: 12,
                height: 12,
                background: ramp[i],
                display: "inline-block",
                border: `1px solid ${edge}`,
              }}
            />
            {b.label}
          </span>
        ))}
        {unit ? (
          <span style={{ ...regs.axis, color: mutedInk }}>{unit}</span>
        ) : null}
      </div>
      <div
        style={{
          minHeight: 0,
          display: "grid",
          gridTemplateColumns: "max-content minmax(0, 1fr)",
          gridTemplateRows: "minmax(0, 1fr) auto",
          columnGap: "8px",
        }}
      >
        <div style={{ position: "relative", gridArea: "1 / 1" }}>
          <div
            style={{ visibility: "hidden", display: "grid" }}
            aria-hidden="true"
          >
            {rowLabels.map((l) => (
              <span
                key={l}
                style={{
                  ...regs.axis,
                  fontWeight: 700,
                  height: 0,
                  overflow: "visible",
                  whiteSpace: "nowrap",
                }}
              >
                {l}
              </span>
            ))}
          </div>
          {rowLabels.map((l, r) => (
            <span
              key={l}
              data-row-label={r}
              style={{
                ...regs.axis,
                color: inkOnGround,
                position: "absolute",
                right: 0,
                top: `${(((slotOf.get(r)! + 0.5) / rowLabels.length) * 100).toFixed(3)}%`,
                transform: "translateY(-50%)",
                whiteSpace: "nowrap",
              }}
            >
              {l}
            </span>
          ))}
        </div>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          style={{
            gridArea: "1 / 2",
            width: "100%",
            height: "100%",
            display: "block",
          }}
          aria-hidden="true"
        >
          <rect x={0} y={0} width={W} height={H} fill={ground} />
          {rowLabels.map((_, r) => (
            <g
              key={`row${r}`}
              data-row={r}
              transform={`translate(0 ${slotOf.get(r)! * CH})`}
            >
              {colLabels.map((_, c) => (
                <rect
                  key={`seat${c}`}
                  x={c * CW}
                  y={0}
                  width={CW}
                  height={CH}
                  fill={missing}
                  stroke={edge}
                  strokeWidth={0.6}
                  vectorEffect="non-scaling-stroke"
                />
              ))}
              {cells
                .filter((c) => c.r === r)
                .map((c) => (
                  <rect
                    key={`c${c.id}`}
                    data-cell={c.id}
                    x={c.c * CW}
                    y={0}
                    width={CW}
                    height={CH}
                    fill={ramp[c.bin]}
                    stroke={edge}
                    strokeWidth={0.6}
                    vectorEffect="non-scaling-stroke"
                  />
                ))}
              {marks
                .filter((m) => m.kind === "cutoff")
                .map((m) => (
                  <g key={`cut${m.k}`} data-g={m.k}>
                    {m.cells
                      .map((i) => byId.get(i)!)
                      .filter((c) => c && c.r === r)
                      .map((c) => (
                        <ellipse
                          key={c.id}
                          cx={c.c * CW + CW / 2}
                          cy={CH / 2}
                          rx={Math.min(CW, CH) * 0.13}
                          ry={Math.min(CW, CH) * 0.13}
                          fill={inkOnGround}
                          stroke={ground}
                          strokeWidth={1}
                          vectorEffect="non-scaling-stroke"
                        />
                      ))}
                  </g>
                ))}
              {moves
                ? outlined.flatMap((m) => outline(m, `o${m.k}-r${r}`, r))
                : null}
              {marks
                .filter((m) => m.kind === "compare")
                .flatMap((m) =>
                  [m.a!, m.b!].map((id, j) => {
                    const c = byId.get(id)!;
                    if (c.r !== r) return null;
                    return (
                      <g key={`cmp${m.k}-${j}`} data-g={m.k}>
                        <rect
                          x={c.c * CW}
                          y={0}
                          width={CW}
                          height={CH}
                          fill="none"
                          stroke={ground}
                          strokeWidth={5}
                          vectorEffect="non-scaling-stroke"
                        />
                        <rect
                          x={c.c * CW}
                          y={0}
                          width={CW}
                          height={CH}
                          fill="none"
                          stroke={j === 0 ? accentInk : inkOnGround}
                          strokeWidth={2}
                          vectorEffect="non-scaling-stroke"
                        />
                      </g>
                    );
                  }),
                )}
            </g>
          ))}
          {moves ? null : outlined.flatMap((m) => outline(m, `o${m.k}`))}
          {moves
            ? null
            : marks
                .filter((m) => m.kind === "compare")
                .map((m) => {
                  const a = byId.get(m.a!)!;
                  const b = byId.get(m.b!)!;
                  const pa = { x: a.c * CW + CW / 2, y: a.r * CH + CH / 2 };
                  const pb = { x: b.c * CW + CW / 2, y: b.r * CH + CH / 2 };
                  return (
                    <g key={`line${m.k}`} data-g={m.k}>
                      <line
                        x1={pa.x}
                        y1={pa.y}
                        x2={pb.x}
                        y2={pb.y}
                        stroke={ground}
                        strokeWidth={4}
                        vectorEffect="non-scaling-stroke"
                      />
                      <line
                        x1={pa.x}
                        y1={pa.y}
                        x2={pb.x}
                        y2={pb.y}
                        stroke={inkOnGround}
                        strokeWidth={1.2}
                        vectorEffect="non-scaling-stroke"
                      />
                    </g>
                  );
                })}
        </svg>
        <div
          style={{ gridArea: "2 / 2", position: "relative", height: "1.6em" }}
        >
          {colLabels.map((l, c) =>
            colTicks.includes(c) ? (
              <span
                key={c}
                style={{
                  ...regs.axis,
                  color: mutedInk,
                  position: "absolute",
                  left: `${(((c + 0.5) / colLabels.length) * 100).toFixed(3)}%`,
                  top: 0,
                  transform: "translateX(-50%)",
                  whiteSpace: "nowrap",
                }}
              >
                {l}
              </span>
            ) : null,
          )}
        </div>
      </div>
    </div>
  );
}
