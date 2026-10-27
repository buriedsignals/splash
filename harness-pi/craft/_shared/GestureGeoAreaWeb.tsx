/**
 * The AREA maps' gesture page — choropleth, tile cartogram, hex cartogram, dot density — as one component with a
 * `variant`, built on the chart-web contract the bar gesture page passes (GestureBarWeb.tsx): ONE PLATE PER STATE.
 * The page the reader lands on is the RESTING plate (every gesture that can rest together, as the static plate draws
 * them); each further gesture is one reader control owning one plate of its own — the resting picture plus that
 * gesture — drawn whole at build time and revealed by its radio (`:checked` / `:has()`, no script). A plate per
 * state, because `interaction.mjs` resolves a pointer off the hit points read once at init.
 *
 *   filter   the places it keeps hold their class colour, the others are washed toward the ground; nothing moves
 *   compare  the second place ringed in ink beside the accented subject, both named with their value
 *   zoom     the plate's camera (its viewBox) frames the zoomed places; the factor is printed in the control's note
 *
 * The geometry is ./gesture-geo-area-shapes.mjs (frozen shapes or designed grid — no live tiles, no MapTiler spend),
 * the colours ./GestureGeoAreaStatic.tsx's geoPalette, so a place looks the same as on the still. Every place answers
 * hover, tap and keyboard with its name, value, class and rank. Words are HTML at a fixed CSS size over the plot.
 */
import {
  adjustToContrast,
  contrast,
  mix,
  TEXT_CONTRAST_MIN,
} from "#shared/chart-beat/colour.mjs";
import { figureVars, webRegisters } from "#shared/design-base/web.mjs";
import { skillScriptFrom } from "#shared/design-base/skill-script.mjs";
import { geoPalette } from "./GestureGeoAreaStatic.tsx";
import { layoutCells, seatsBox } from "./gesture-geo-area-shapes.mjs";
import { classIndex } from "./gesture-family-geo.mjs";

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
const pct = (v: number, extent: number) => (v / extent) * 100;

export type WebState = {
  accent: string | null;
  rings: string[];
  named: string[];
  kept: string[] | null;
  floor: number | null;
  camera: string;
  focus: string[] | null;
};
export type WebControl = {
  legend: string;
  chip: string;
  announce: string;
  note: string;
  state: WebState;
  do: string;
};

export function GestureGeoAreaWeb({
  variant,
  rows,
  shapes,
  layoutGrid,
  points,
  breaks,
  format,
  frame,
  resting,
  controls,
  details,
  restLabel,
  restNotes,
  classLabels,
  missingLabel,
  title,
  eyebrow,
  caveat,
  source,
  unit,
  alt,
  direction,
  ground,
  accent,
  ink,
  muted,
}: {
  variant: string;
  rows: Array<{ key: string; name: string; value: number | null }>;
  shapes?: any;
  layoutGrid?: string[];
  points?: Array<{ lon: number; lat: number; key: string }>;
  breaks: number[];
  format: (v: number) => string;
  frame: { width: number; height: number };
  resting: WebState;
  controls: WebControl[];
  details: Record<string, string>;
  restLabel: string;
  restNotes: string[];
  classLabels: string[];
  missingLabel: string;
  title: string;
  eyebrow: string;
  caveat: string;
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
  const { width: W, height: H } = frame;
  const isDots = variant === "dot-density";
  const grids =
    variant === "cartogram-area-distortion-and-tile-cartogram" ||
    variant === "hex-grid-spatial-binning-and-hex-cartogram";
  const isShapes = !grids;
  const palette = geoPalette(direction, breaks.length + 1);
  const { classFill, backFill, missingFill, landFill, accentInk } = palette;
  const labelInk = adjustToContrast(ink, ground, TEXT_CONTRAST_MIN) ?? ink;
  const layout = layoutCells(variant, {
    rows,
    shapes,
    grid: layoutGrid,
    points,
    box: { x: 0, y: 0, width: W, height: H },
  });
  const klass = (v: number | null) =>
    v === null ? null : classIndex(v, breaks);
  const keyOf = new Map(
    layout.cells.map((c: any, i: number) => [c.key, `c${i + 1}`]),
  );
  const legibleOn = (fill: string) =>
    contrast(labelInk, fill) >= contrast(ground, fill) ? labelInk : ground;
  const activeOf = (fill: string) => mix(fill, ink, MARK_ACTIVE_STEP);
  // A dot map's group answers at its dot nearest the group's own mean.
  const seatOf = (c: any) => {
    if (!isDots) return c.seat;
    const mine = layout.dots.filter((d: any) => d.key === c.key);
    return mine.reduce(
      (b: any, d: any) =>
        Math.hypot(d.x - c.seat.x, d.y - c.seat.y) <
        Math.hypot(b.x - c.seat.x, b.y - c.seat.y)
          ? d
          : b,
      mine[0] ?? c.seat,
    );
  };

  /** The camera a state stands at: the whole map, or its close-up framed at the plot's own ratio. */
  const viewOf = (s: WebState) => {
    if (s.camera !== "closeUp" || !s.focus?.length)
      return { x: 0, y: 0, w: W, h: H };
    const b = seatsBox(layout.cells, s.focus, Math.max(W, H) * 0.08) ?? {
      x: 0,
      y: 0,
      width: W,
      height: H,
    };
    const k = Math.max(b.width / W, b.height / H, 0.12);
    const w = W * k;
    const h = H * k;
    return {
      x: b.x + b.width / 2 - w / 2,
      y: b.y + b.height / 2 - h / 2,
      w,
      h,
    };
  };

  const plates = [
    { id: 0, state: resting },
    ...controls.map((c, k) => ({ id: k + 1, state: c.state })),
  ];

  const css = [
    `${SCOPE} [data-plate]:not([data-plate="0"]) { display: none; }`,
    `${SCOPE} .chart-plot .gesture-layer { position: relative; pointer-events: none; }`,
    `${SCOPE} .gesture-controls { flex: 0 0 auto; display: flex; flex-wrap: wrap; align-items: center; gap: 0 28px; margin-top: 4px; }`,
    `${SCOPE} .gesture-controls > fieldset { flex: 0 1 auto; max-width: 100%; }`,
    `${SCOPE} .gesture-notes { flex: 0 0 auto; display: grid; }`,
    `${SCOPE} .gesture-notes > div { grid-area: 1 / 1; align-self: start; }`,
    `${SCOPE} .gw-note { visibility: hidden; }`,
    `${SCOPE} .chart-rest-notes { margin: 4px 0 0; }`,
    `${SCOPE} .geo-key { display: flex; flex-wrap: wrap; align-items: center; gap: 0 10px; margin: 6px 0 2px; flex: 0 0 auto; }`,
    `${SCOPE} .geo-word { position: absolute; transform: translate(-50%, -50%); white-space: nowrap; }`,
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

  const drawPlate = ({ id, state }: { id: number; state: WebState }) => {
    const v = viewOf(state);
    const mark = (key: string) => `p${id}-${keyOf.get(key)}`;
    const back = new Set(
      state.kept
        ? layout.cells
            .map((c: any) => c.key)
            .filter((k: string) => !state.kept!.includes(k))
        : [],
    );
    const fillOf = (c: any) => {
      const i = klass(c.value);
      if (i === null) return grids ? ground : missingFill;
      return back.has(c.key) ? backFill(i) : classFill(i);
    };
    const rule = Math.max(direction.stroke?.rule ?? 1, 1.2);
    const floorKeys =
      state.floor === null
        ? []
        : layout.cells
            .filter(
              (c: any) => c.value !== null && klass(c.value)! >= state.floor!,
            )
            .map((c: any) => c.key);
    const ringed = [
      ...state.rings
        .filter((k) => k !== state.accent)
        .map((k) => ({ k, colour: labelInk, w: rule * 1.2 })),
      ...(state.accent
        ? [{ k: state.accent, colour: accentInk, w: rule * 2 }]
        : []),
    ];
    const cellOf = (k: string) => layout.cells.find((c: any) => c.key === k);
    const ringR = (c: any) => Math.max(9, Math.min(26, c.size * 0.32));
    // Words over the plot: a grid prints every code in its cell; a shape map names only the named places.
    const toPct = (x: number, y: number) => ({
      left: `${pct(x - v.x, v.w).toFixed(3)}%`,
      top: `${pct(y - v.y, v.h).toFixed(3)}%`,
    });
    const inView = (x: number, y: number) =>
      x >= v.x && x <= v.x + v.w && y >= v.y && y <= v.y + v.h;
    const words: any[] = [];
    for (const c of layout.cells) {
      if (isDots) continue;
      const named = state.named.includes(c.key) || c.key === state.accent;
      if (!inView(c.seat.x, c.seat.y)) continue;
      if (grids) {
        const fill = fillOf(c);
        words.push(
          <span
            key={`w${c.key}`}
            className="geo-word"
            style={{
              ...regs.axis,
              ...toPct(c.seat.x, c.seat.y),
              color: legibleOn(fill),
              fontWeight: named ? 700 : regs.axis.fontWeight,
              textAlign: "center",
              lineHeight: 1.05,
            }}
          >
            {c.key}
            {named && c.value !== null ? (
              <>
                <br />
                {format(c.value)}
              </>
            ) : null}
          </span>,
        );
      } else if (named && c.value !== null) {
        words.push(
          <span
            key={`w${c.key}`}
            className="geo-word"
            style={{
              ...regs.annot,
              ...toPct(
                c.seat.x,
                c.seat.y + ringR(c) * (v.h / H) + 12 * (v.h / H),
              ),
              color: labelInk,
              fontWeight: 700,
              textShadow: `0 0 3px ${ground}, 0 0 3px ${ground}`,
            }}
          >
            {`${c.name} ${format(c.value)}`}
          </span>,
        );
      }
    }
    return [
      <svg
        key={`s${id}`}
        role="group"
        aria-label={title}
        xmlns="http://www.w3.org/2000/svg"
        className="chart"
        data-hit="cell"
        data-plate={id}
        viewBox={`${v.x.toFixed(2)} ${v.y.toFixed(2)} ${v.w.toFixed(2)} ${v.h.toFixed(2)}`}
        preserveAspectRatio="xMidYMid meet"
      >
        <desc>{alt}</desc>
        <rect x={v.x} y={v.y} width={v.w} height={v.h} fill={ground} />
        {layout.land.map((l: any, i: number) => (
          <path
            key={`l${i}`}
            d={l.d}
            fill={landFill}
            stroke={ground}
            strokeWidth={0.6}
            vectorEffect="non-scaling-stroke"
          />
        ))}
        {!isDots &&
          layout.cells.map((c: any) => {
            const fill = fillOf(c);
            return (
              <path
                key={c.key}
                data-mark={mark(c.key)}
                d={c.d}
                fill={fill}
                stroke={c.value === null && grids ? palette.mutedInk : ground}
                strokeWidth={isShapes ? 0.7 : rule}
                vectorEffect="non-scaling-stroke"
                style={{
                  ["--mark-active" as string]: activeOf(
                    fill === ground ? missingFill : fill,
                  ),
                }}
              />
            );
          })}
        {isDots &&
          layout.dots.map((d: any, i: number) => {
            const subject = d.key === state.accent;
            const stepped = back.has(d.key);
            const fill = stepped
              ? mix(muted, ground, 0.6)
              : subject
                ? ink
                : mix(muted, ground, 0.15);
            return (
              <circle
                key={`d${i}`}
                data-mark={mark(d.key)}
                cx={d.x.toFixed(1)}
                cy={d.y.toFixed(1)}
                r={subject ? 1.6 : 1.1}
                fill={fill}
                style={{ ["--mark-active" as string]: ink }}
              />
            );
          })}
        {isDots &&
          state.accent &&
          layout.dots
            .filter((d: any) => d.key === state.accent)
            .map((d: any, i: number) => (
              <circle
                key={`ra${i}`}
                cx={d.x.toFixed(1)}
                cy={d.y.toFixed(1)}
                r={4.2}
                fill="none"
                stroke={accentInk}
                strokeWidth={1.3}
                vectorEffect="non-scaling-stroke"
              />
            ))}
        {isDots &&
          state.rings
            .filter((k) => k !== state.accent)
            .flatMap((k) =>
              layout.dots
                .filter((d: any) => d.key === k)
                .map((d: any, i: number) => (
                  <circle
                    key={`rr${k}${i}`}
                    cx={d.x.toFixed(1)}
                    cy={d.y.toFixed(1)}
                    r={3.6}
                    fill="none"
                    stroke={labelInk}
                    strokeWidth={0.9}
                    vectorEffect="non-scaling-stroke"
                  />
                )),
            )}
        {!isDots &&
          floorKeys.map((k) => (
            <path
              key={`f${k}`}
              d={cellOf(k).d}
              fill="none"
              stroke={labelInk}
              strokeWidth={rule * 1.3}
              vectorEffect="non-scaling-stroke"
            />
          ))}
        {!isDots &&
          ringed.map(({ k, colour, w }) => {
            const c = cellOf(k);
            if (!c) return null;
            const shape = (stroke: string, width: number, key: string) =>
              isShapes ? (
                <circle
                  key={key}
                  cx={c.seat.x}
                  cy={c.seat.y}
                  r={ringR(c) * (v.h / H)}
                  fill="none"
                  stroke={stroke}
                  strokeWidth={width}
                  vectorEffect="non-scaling-stroke"
                />
              ) : (
                <path
                  key={key}
                  d={c.d}
                  fill="none"
                  stroke={stroke}
                  strokeWidth={width}
                  strokeLinejoin="round"
                  vectorEffect="non-scaling-stroke"
                />
              );
            return (
              <g key={`ring${k}`}>
                {colour === accentInk && shape(ground, w + rule * 2.4, `h${k}`)}
                {shape(colour, w, `r${k}`)}
              </g>
            );
          })}
        {layout.cells
          .filter((c: any) => c.value !== null && details[c.key])
          .map((c: any) => {
            const s = seatOf(c);
            return (
              <circle
                key={`pt${c.key}`}
                className="pt"
                cx={s.x}
                cy={s.y}
                r={Math.max(4, Math.min(14, (c.size || 12) / 3)) * (v.h / H)}
                fill="transparent"
                stroke="none"
                tabIndex={0}
                role="img"
                data-mark-ref={mark(c.key)}
                aria-label={details[c.key]}
                data-detail={details[c.key]}
              />
            );
          })}
        <rect
          className="hit-area"
          x={v.x}
          y={v.y}
          width={v.w}
          height={v.h}
          fill="transparent"
          pointerEvents="all"
        />
      </svg>,
      <div
        className={id === 0 ? "overlay" : "gesture-layer"}
        aria-hidden="true"
        data-plate={id}
        key={`l${id}`}
      >
        {words}
      </div>,
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
      <style dangerouslySetInnerHTML={{ __html: css }} />
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
              <span key={i}>
                {i ? " · " : ""}
                {n}
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
      {isDots ? (
        <p className="chart-unit" style={{ ...regs.axis, margin: "4px 0 2px" }}>
          {unit}
        </p>
      ) : (
        <div className="geo-key">
          <span style={{ ...regs.axis }}>{unit}</span>
          {classLabels.map((label, i) => (
            <span
              key={label}
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
                  background: classFill(i),
                  display: "inline-block",
                }}
              />
              {label}
            </span>
          ))}
          {rows.some((r) => r.value === null) ? (
            <span
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
                  background: grids ? "transparent" : missingFill,
                  border: grids ? `1px solid ${palette.mutedInk}` : undefined,
                  display: "inline-block",
                }}
              />
              {missingLabel}
            </span>
          ) : null}
        </div>
      )}
      <div
        className="chart-plot"
        style={{
          ["--y-gutter" as string]: "0px",
          ["--x-axis-h" as string]: "0px",
          aspectRatio: `${W} / ${H}`,
        }}
      >
        <div className="y-axis" />
        {plates.flatMap(drawPlate)}
        <div className="x-axis" />
      </div>
      <p className="chart-source" style={{ ...regs.body, margin: "6px 0 0" }}>
        {source}
      </p>
    </figure>
  );
}
