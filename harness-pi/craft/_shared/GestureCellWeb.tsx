/**
 * The Cell-grid family's WEB page (craft/gestures/GRAMMAR.md F7): one component, two variants — `heatmap-matrix` (rows ×
 * columns, the drawing of web/heatmap-matrix/DirectedHeatmapWeb.tsx) and `calendar-heatmap` (twelve months × 31 days,
 * as web/calendar-heatmap/DirectedCalendarWeb.tsx draws it) — staged by the story's own `gestures`.
 *
 * ONE PLATE PER STATE, as the bar gesture page draws them (GestureBarWeb.tsx): the page the reader lands on is the
 * RESTING plate, every resting gesture drawn at once; each further gesture is one reader control owning one plate of its
 * own — the resting picture plus that gesture — revealed by its radio (`:checked` / `:has()`, no script). A reorder's
 * plate draws its rows in their new order, so every cell is answered by the cell it is drawn as.
 *
 * Doctrine kept from the per-type kits: one hue stepped between the ground and the accent, monotone in lightness, its
 * classes printed in the data's units; the hue is the SCALE, so no gesture recolours a cell — emphasis is an outline (the
 * accent for a highlight, the ink for a ring or a run, over a ground halo), a step back is the cell washed toward the
 * ground, a cutoff is a dot on every cell past it. Every cell answers hover, tap and Tab with its exact value.
 */

import {
  adjustToContrast,
  contrast,
  mix,
  TEXT_CONTRAST_MIN,
} from "#shared/chart-beat/colour.mjs";
import { figureVars, webRegisters } from "#shared/design-base/web.mjs";
import { skillScriptFrom } from "#shared/design-base/skill-script.mjs";
import { outlineOf } from "./gesture-family-cell.mjs";

const { controlChromeCss } = await import(
  skillScriptFrom(
    import.meta.dirname,
    "chart-web",
    "assets",
    "control-chrome.ts",
  )
);

const SCOPE = ".chart-figure";
const MARK_ACTIVE_STEP = 0.3;
const MARK_ACTIVE_MIN_STEP = 1.12;
const pct = (value: number, extent: number) => (value / extent) * 100;

type Cell = {
  id: number;
  r: number;
  c: number;
  value: number;
  bin: number;
  detail: string;
};
type Picture = {
  order: number[];
  outlines: Array<{ index: number; kind: string; cells: number[] }>;
  back: number[];
  cutoffs: Array<{ index: number; value: number; cells: number[] }>;
  compares: Array<{ index: number; a: number; b: number }>;
};

export function GestureCellWeb({
  variant,
  cells,
  rowLabels,
  colLabels,
  colShort,
  colTicks,
  bins,
  resting,
  controls,
  restLabel,
  restNotes,
  title,
  eyebrow,
  caveat,
  reading,
  source,
  unit,
  alt,
  direction,
  ground,
  accent,
  ink,
  muted,
}: {
  variant: "heatmap-matrix" | "calendar-heatmap";
  cells: Cell[];
  rowLabels: string[];
  colLabels: string[];
  /** The columns' short forms, printed instead on a narrow page (absent: the full label everywhere). */
  colShort?: string[];
  /** The columns that print their label (a calendar prints 1, 5, 10 … 31). */
  colTicks: number[];
  bins: { label: string }[];
  resting: Picture;
  controls: Array<{
    do: string;
    legend: string;
    chip: string;
    note: string;
    announce: string;
    picture: Picture;
  }>;
  restLabel: string;
  restNotes: Array<{ text: string; accent: boolean }>;
  title: string;
  eyebrow: string;
  caveat: string;
  reading: string;
  source: string;
  unit: string;
  alt: string;
  direction: any;
  ground: string;
  accent: string;
  ink: string;
  muted: string;
}) {
  const regs = webRegisters(direction, { ink: { ink, muted, accent } });
  const calendar = variant === "calendar-heatmap";
  const CELL_W = calendar
    ? 26
    : Math.max(48, Math.min(84, 760 / colLabels.length));
  const CELL_H = calendar ? 22 : 28;
  const GUTTER = calendar ? 96 : 140;
  const W = colLabels.length * CELL_W;
  const H = rowLabels.length * CELL_H;
  const ramp = bins.map((_, i) =>
    mix(ground, accent, 0.1 + (i / Math.max(1, bins.length - 1)) * 0.9),
  );
  const cellEdge = mix(ground, ink, 0.22);
  const missing = mix(ground, ink, 0.06);
  const accentInk =
    adjustToContrast(accent, ground, TEXT_CONTRAST_MIN) ?? accent;
  const labelInk = adjustToContrast(ink, ground, TEXT_CONTRAST_MIN) ?? ink;
  const hoverOf = (fill: string) => {
    const lifted = mix(fill, ink, MARK_ACTIVE_STEP);
    const step = contrast(lifted, fill);
    if (step < MARK_ACTIVE_MIN_STEP)
      throw new Error(
        `a cell lifts only ${step.toFixed(3)}:1 under the pointer, under the ${MARK_ACTIVE_MIN_STEP}:1 floor`,
      );
    return lifted;
  };
  const byId = new Map(cells.map((c) => [c.id, c]));
  const plates = [resting, ...controls.map((c) => c.picture)];

  const plateCss = [
    `${SCOPE} [data-plate]:not([data-plate="0"]) { display: none; }`,
    `${SCOPE} .chart-plot { --y-gutter: ${GUTTER}px; }`,
    `${SCOPE} .chart-plot .gesture-layer { position: relative; pointer-events: none; }`,
    `${SCOPE} .gesture-controls { flex: 0 0 auto; display: flex; flex-wrap: wrap; align-items: center; gap: 0 28px; margin-top: 4px; }`,
    `${SCOPE} .gesture-controls > fieldset { flex: 0 1 auto; max-width: 100%; }`,
    `${SCOPE} .gesture-notes { flex: 0 0 auto; display: grid; }`,
    `${SCOPE} .gesture-notes > div { grid-area: 1 / 1; align-self: start; }`,
    `${SCOPE} .gw-note { visibility: hidden; }`,
    `${SCOPE} .chart-rest-notes { margin: 4px 0 0; }`,
    `${SCOPE} .x-short { display: none; }`,
    // On a phone the reading line is spent first, as the static ladder spends it: the key and the controls stay.
    `@media (max-width: 640px) { ${SCOPE} .x-long { display: none; } ${SCOPE} .x-short { display: inline; } ${SCOPE} .chart-reading { display: none; } }`,
    `${SCOPE} .chart-key { display: flex; flex-wrap: wrap; align-items: center; gap: 0 12px; margin: 6px 0 4px; flex: 0 0 auto; }`,
    ...controls.flatMap((_, k) => {
      const on = `${SCOPE}:has(#gesture-${k + 1}-on:checked)`;
      return [
        `${on} [data-plate] { display: none; }`,
        `${on} [data-plate="${k + 1}"] { display: block; }`,
        `${on} .gw-note { visibility: hidden; }`,
        `${on} [data-gesture-${k + 1}-note="on"] { visibility: visible; }`,
      ];
    }),
    ...controls.map((_, k) =>
      controlChromeCss({
        scope: SCOPE,
        name: `gesture-${k + 1}`,
        margin: "2px 0 0",
      }),
    ),
  ].join("\n");

  const drawPlate = (p: Picture, id: number) => {
    const slotOf = new Map(p.order.map((r, s) => [r, s]));
    const back = new Set(p.back);
    const key = (c: Cell) => `p${id}-c${c.id}`;
    const xy = (c: Cell) => ({
      x: c.c * CELL_W,
      y: (slotOf.get(c.r) ?? 0) * CELL_H,
    });
    const accentRows = new Set(
      p.outlines
        .filter((o) => o.kind === "accent")
        .flatMap((o) => o.cells.map((i) => byId.get(i)?.r)),
    );
    const rects = (ids: number[]) =>
      outlineOf(ids.map((i) => byId.get(i)).filter(Boolean), p.order).map(
        (o: any) => ({
          x: o.c0 * CELL_W,
          y: o.r0 * CELL_H,
          width: (o.c1 - o.c0 + 1) * CELL_W,
          height: (o.r1 - o.r0 + 1) * CELL_H,
        }),
      );
    const layerClass = id === 0 ? "overlay" : "gesture-layer";
    return [
      <div
        className="y-axis"
        data-plate={id}
        key={`y${id}`}
        style={{ pointerEvents: "none" }}
      >
        {p.order.map((r, s) => (
          <span
            key={r}
            className="axis-label y"
            style={{
              ...regs.axis,
              top: `${pct(s * CELL_H + CELL_H / 2, H)}%`,
              color: accentRows.has(r)
                ? accentInk
                : (regs.axis.color as string),
              fontWeight: accentRows.has(r) ? 700 : regs.axis.fontWeight,
            }}
          >
            {rowLabels[r]}
          </span>
        ))}
      </div>,
      <svg
        key={`s${id}`}
        role="group"
        aria-label={title}
        xmlns="http://www.w3.org/2000/svg"
        className="chart"
        data-hit="cell"
        data-plate={id}
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
      >
        <desc>{alt}</desc>
        <rect x={0} y={0} width={W} height={H} fill={ground} />
        {rowLabels.map((_, r) =>
          colLabels.map((_, c) => (
            <rect
              key={`seat-${r}-${c}`}
              x={c * CELL_W}
              y={r * CELL_H}
              width={CELL_W}
              height={CELL_H}
              fill={missing}
              stroke={cellEdge}
              strokeWidth={0.6}
              vectorEffect="non-scaling-stroke"
            />
          )),
        )}
        {cells.map((c) => {
          const fill = back.has(c.id)
            ? mix(ramp[c.bin], ground, 0.75)
            : ramp[c.bin];
          const { x, y } = xy(c);
          return (
            <rect
              key={key(c)}
              data-mark={key(c)}
              x={x}
              y={y}
              width={CELL_W}
              height={CELL_H}
              fill={fill}
              stroke={cellEdge}
              strokeWidth={0.6}
              vectorEffect="non-scaling-stroke"
              style={{ ["--mark-active" as string]: hoverOf(fill) }}
            />
          );
        })}
        {p.cutoffs.flatMap((cut) =>
          cut.cells.map((i) => {
            const c = byId.get(i);
            if (!c) return null;
            const { x, y } = xy(c);
            return (
              <circle
                key={`cut${cut.index}-${i}`}
                cx={x + CELL_W / 2}
                cy={y + CELL_H / 2}
                r={Math.min(CELL_W, CELL_H) * 0.13}
                fill={ink}
                stroke={ground}
                strokeWidth={1}
                vectorEffect="non-scaling-stroke"
              />
            );
          }),
        )}
        {[...p.outlines].sort((x, y) => y.cells.length - x.cells.length || (x.kind === "accent" ? 1 : 0) - (y.kind === "accent" ? 1 : 0)).flatMap((o) =>
          rects(o.cells).map((r: any, j: number) => (
            <g key={`o${o.index}-${j}`}>
              <rect
                {...r}
                fill="none"
                stroke={ground}
                strokeWidth={5}
                vectorEffect="non-scaling-stroke"
              />
              <rect
                {...r}
                fill="none"
                stroke={o.kind === "accent" ? accentInk : labelInk}
                strokeWidth={2}
                strokeDasharray={o.kind === "ring" ? "5 3" : undefined}
                vectorEffect="non-scaling-stroke"
              />
            </g>
          )),
        )}
        {p.compares.map((cmp) => {
          const a = byId.get(cmp.a)!;
          const b = byId.get(cmp.b)!;
          const pa = xy(a);
          const pb = xy(b);
          return (
            <g key={`cmp${cmp.index}`}>
              {[pa, pb].map((q, j) => (
                <g key={j}>
                  <rect
                    x={q.x}
                    y={q.y}
                    width={CELL_W}
                    height={CELL_H}
                    fill="none"
                    stroke={ground}
                    strokeWidth={5}
                    vectorEffect="non-scaling-stroke"
                  />
                  <rect
                    x={q.x}
                    y={q.y}
                    width={CELL_W}
                    height={CELL_H}
                    fill="none"
                    stroke={j === 0 ? accentInk : labelInk}
                    strokeWidth={2}
                    vectorEffect="non-scaling-stroke"
                  />
                </g>
              ))}
              <line
                x1={pa.x + CELL_W / 2}
                y1={pa.y + CELL_H / 2}
                x2={pb.x + CELL_W / 2}
                y2={pb.y + CELL_H / 2}
                stroke={ground}
                strokeWidth={4}
                vectorEffect="non-scaling-stroke"
              />
              <line
                x1={pa.x + CELL_W / 2}
                y1={pa.y + CELL_H / 2}
                x2={pb.x + CELL_W / 2}
                y2={pb.y + CELL_H / 2}
                stroke={labelInk}
                strokeWidth={1.2}
                vectorEffect="non-scaling-stroke"
              />
            </g>
          );
        })}
        {cells.map((c) => {
          const { x, y } = xy(c);
          return (
            <circle
              key={`hit-${key(c)}`}
              className="pt"
              data-mark-ref={key(c)}
              cx={x + CELL_W / 2}
              cy={y + CELL_H / 2}
              r={Math.min(CELL_W, CELL_H) / 2 - 1}
              fill="transparent"
              stroke="none"
              tabIndex={0}
              role="img"
              aria-label={c.detail}
              data-detail={c.detail}
            />
          );
        })}
        <rect
          className="hit-area"
          x={0}
          y={0}
          width={W}
          height={H}
          fill="transparent"
          pointerEvents="all"
        />
      </svg>,
      <div
        className={layerClass}
        aria-hidden="true"
        data-plate={id}
        key={`l${id}`}
      />,
    ];
  };

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
      <style dangerouslySetInnerHTML={{ __html: plateCss }} />
      <div className="chart-header">
        <p
          className="chart-eyebrow"
          style={{ ...regs.eyebrow, margin: "0 0 6px" }}
        >
          {eyebrow}
        </p>
        <h2
          className="chart-title"
          style={{ ...regs.display, margin: "0 0 6px" }}
        >
          {title}
        </h2>
        <p className="chart-caveat" style={{ ...regs.body, margin: 0 }}>
          {caveat}
        </p>
        {restNotes.length ? (
          <p className="chart-rest-notes" style={{ ...regs.body }}>
            {restNotes.map((n, i) => (
              <span
                key={i}
                style={{
                  color: n.accent ? accentInk : undefined,
                  fontWeight: n.accent ? 700 : undefined,
                }}
              >
                {i ? " · " : ""}
                {n.text}
              </span>
            ))}
          </p>
        ) : null}
      </div>

      <div className="gesture-controls">
        {controls.map((c, k) => (
          <fieldset className={`chart-gesture-${k + 1}`} key={k}>
            <legend>{c.legend}</legend>
            <div className="options">
              <label>
                <input
                  id={`gesture-${k + 1}-rest`}
                  type="radio"
                  name={`gesture-${k + 1}`}
                  value="rest"
                  aria-label={restLabel}
                  defaultChecked
                />
                {restLabel}
              </label>
              <label>
                <input
                  id={`gesture-${k + 1}-on`}
                  type="radio"
                  name={`gesture-${k + 1}`}
                  value="on"
                  aria-label={c.announce}
                />
                {c.chip}
              </label>
            </div>
          </fieldset>
        ))}
      </div>
      <div className="gesture-notes">
        {controls.map((c, k) => (
          <div className={`gesture-${k + 1}-notes`} role="status" key={k}>
            <p
              {...{ [`data-gesture-${k + 1}-note`]: "on" }}
              className="gw-note"
              style={{ ...regs.body, margin: 0 }}
            >
              {c.note}
            </p>
          </div>
        ))}
      </div>

      <div className="chart-key">
        {bins.map((b, i) => (
          <span
            key={b.label}
            style={{
              ...regs.axis,
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
            }}
          >
            <span
              style={{
                width: 14,
                height: 14,
                background: ramp[i],
                display: "inline-block",
                borderRadius: 2,
                border: `1px solid ${cellEdge}`,
              }}
            />
            {b.label}
          </span>
        ))}
        {unit ? <span style={{ ...regs.axis }}>{unit}</span> : null}
      </div>

      <div
        className="chart-plot"
        style={{
          ["--x-axis-h" as string]: "28px",
          aspectRatio: `${W + GUTTER} / ${H + 28}`,
        }}
      >
        {plates.flatMap((p, id) => drawPlate(p, id))}
        <div className="x-axis">
          {colLabels.map((label, c) =>
            colTicks.includes(c) ? (
              <span
                key={c}
                className="axis-label x"
                style={{
                  ...regs.axis,
                  left: `${pct(c * CELL_W + CELL_W / 2, W)}%`,
                  whiteSpace: "normal",
                  lineHeight: 1.05,
                  maxWidth: `${calendar ? 6 : (CELL_W / W) * 100}%`,
                  textAlign: "center",
                }}
              >
                {colShort?.[c] && colShort[c] !== label ? (
                  <>
                    <span className="x-long">{label}</span>
                    <span className="x-short">{colShort[c]}</span>
                  </>
                ) : (
                  label
                )}
              </span>
            ) : null,
          )}
        </div>
      </div>

      {reading ? (
        <p
          className="chart-reading"
          style={{ ...regs.body, margin: "6px 0 0" }}
        >
          {reading}
        </p>
      ) : null}
      <p className="chart-source" style={{ ...regs.body, margin: "6px 0 0" }}>
        {source}
      </p>
    </figure>
  );
}
