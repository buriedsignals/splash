/**
 * One square, one country: the forty European countries that report 2024 generation, sorted by the
 * low-carbon share of their electricity — drawn as a pictogram THROUGH the design base and delivered
 * as an interactive page.
 *
 * `a-quantity-is-made-countable-by-drawing-its-units` — the whole reason to spend forty squares
 * rather than three bars is that a reader can COUNT them. So the squares are the unit, the three
 * blocks are separated by a gap wide enough to count across, and every block prints its own count.
 *
 * `a-countable-field-is-paired-with-its-own-figure` — a field of marks a reader is invited to count
 * is also given the number, because counting forty squares is a check, not a task.
 *
 * WHAT THE WEB ADDS. A pictogram deliberately throws away the value: one square is one country,
 * whatever its share, and that flattening is the point — it makes "how many" visible where a bar
 * chart makes "how much" visible. Every square here gives the value back on demand: the country, its
 * exact low-carbon share, its rank among the forty, and which block it is in.
 */

import { mix, adjustToContrast, contrast, TEXT_CONTRAST_MIN, NON_TEXT_CONTRAST_MIN } from "#shared/chart-beat/colour.mjs";
import { webRegisters, figureVars } from "#shared/design-base/web.mjs";

const CELL = 34;
const GAP = 5;
const BLOCK_GAP = 26;

export type Square = { code: string; name: string; block: number; detail: string };
export type Block = { key: string; heading: string; count: number };

export function DirectedPictogramWeb({
  squares,
  blocks,
  columns,
  title,
  eyebrow,
  caveat,
  source,
  alt,
  reading,
  direction,
  ground,
  accent,
  ink,
  muted,
  grid,
}: {
  squares: Square[];
  blocks: Block[];
  columns: number;
  title: string;
  eyebrow: string;
  caveat: string;
  source: string;
  alt: string;
  reading: string;
  direction: any;
  ground: string;
  accent: string;
  ink: string;
  muted: string;
  grid: string;
}) {
  const regs = webRegisters(direction, { ink: { ink, muted, accent } });

  let low = mix(ground, ink, 0.3);
  if (contrast(low, ground) < NON_TEXT_CONTRAST_MIN)
    low = adjustToContrast(low, ground, NON_TEXT_CONTRAST_MIN) ?? low;
  let middle = mix(accent, ground, 0.55);
  if (contrast(middle, ground) < NON_TEXT_CONTRAST_MIN)
    middle = adjustToContrast(middle, ground, NON_TEXT_CONTRAST_MIN) ?? middle;
  const tone = [accent, middle, low];
  const label = adjustToContrast(ink, ground, TEXT_CONTRAST_MIN) ?? ink;

  // Each block is its own grid of `columns`, stacked with a gap wide enough to count across.
  const rowsFor = (n: number) => Math.ceil(n / columns);
  const blockTop: number[] = [];
  let cursor = 0;
  for (const b of blocks) {
    blockTop.push(cursor);
    cursor += rowsFor(b.count) * (CELL + GAP) + BLOCK_GAP;
  }
  const width = columns * (CELL + GAP) - GAP;
  const height = cursor - BLOCK_GAP;

  const seat = (s: Square, indexInBlock: number) => ({
    x: (indexInBlock % columns) * (CELL + GAP),
    y: blockTop[s.block] + Math.floor(indexInBlock / columns) * (CELL + GAP),
  });

  const counters: number[] = blocks.map(() => 0);
  const placed = squares.map((s) => {
    const i = counters[s.block];
    counters[s.block] += 1;
    return { ...s, ...seat(s, i) };
  });

  const pctW = (v: number) => (v / width) * 100;
  const pctH = (v: number) => (v / height) * 100;

  return (
    <figure
      className="chart-figure"
      style={{
        ["--ground" as string]: ground,
        ["--accent" as string]: accent,
        ["--ink" as string]: ink,
        ["--muted" as string]: muted,
        ...figureVars(regs),
      }}
    >
      <div className="chart-header">
        <p className="chart-eyebrow" style={{ ...regs.eyebrow, margin: "0 0 6px" }}>{eyebrow}</p>
        <h2 className="chart-title" style={{ ...regs.display, margin: "0 0 6px" }}>{title}</h2>
        <p className="chart-caveat" style={{ ...regs.body, margin: 0 }}>{caveat}</p>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "0 16px", margin: "12px 0 4px", flex: "0 0 auto" }}>
        {blocks.map((b, i) => (
          <span key={b.key} style={{ ...regs.axis, display: "inline-flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 14, height: 14, background: tone[i], display: "inline-block", borderRadius: 3 }} />
            {b.heading}
          </span>
        ))}
      </div>

      <div
        className="chart-plot"
        style={{
          ["--y-gutter" as string]: "0px",
          ["--x-axis-h" as string]: "0px",
          aspectRatio: `${width} / ${height}`,
        }}
      >
        <div className="y-axis" />
        <svg
          role="group"
          aria-label={title}
          xmlns="http://www.w3.org/2000/svg"
          className="chart"
          data-hit="cell"
          viewBox={`0 0 ${width} ${height}`}
          // THE ONE BEAT IN THIS BASE THAT DOES NOT STRETCH, AND THE REASON IS THE FORM ITSELF. The
          // fluid frame's `preserveAspectRatio="none"` is right when the geometry IS the reading:
          // a line read at a shallower angle is still the same series. Here the geometry is a UNIT
          // — one square, one country — and a stretched square is no longer a unit a reader counts,
          // it is a brick. Measured on the first render, where the window-fit rule shortened the
          // plot and every square came out half as tall as it was wide.
          preserveAspectRatio="xMidYMid meet"
        >
          <desc>{alt}</desc>
          <rect x={0} y={0} width={width} height={height} fill={ground} />

          {placed.map((s) => (
            <rect
              key={s.code}
              x={s.x}
              y={s.y}
              width={CELL}
              height={CELL}
              rx={3}
              fill={tone[s.block]}
            />
          ))}

          {placed.map((s) => (
            <circle
              key={`hit-${s.code}`}
              className="pt"
              cx={s.x + CELL / 2}
              cy={s.y + CELL / 2}
              r={CELL / 2}
              fill="transparent"
              stroke="none"
              tabIndex={0}
              role="img"
              aria-label={s.detail}
              data-detail={s.detail}
            />
          ))}
          <rect className="hit-area" x={0} y={0} width={width} height={height} fill="transparent" pointerEvents="all" />
        </svg>

        {/* NO OVERLAY HEADINGS. A block's name has to sit above its own first row, and a viewBox
            offset reserved for it shrinks with the geometry while the type does not — at 375px the
            heading lifts clean out of the plot. The three blocks are named in the key above instead,
            where the type and the swatch are both fixed. */}
        <div className="overlay" aria-hidden="true" />
        <div className="x-axis" />
      </div>

      <p className="chart-reading" style={{ ...regs.body, margin: "14px 0 0" }}>{reading}</p>
      <p className="chart-source" style={{ ...regs.body, margin: "6px 0 0" }}>{source}</p>
    </figure>
  );
}
