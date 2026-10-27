/**
 * THE STACK FAMILY'S WEB PAGE — stacked-bar, diverging-stacked-bar-likert and waterfall-bridge as variants of one
 * drawing (`variant`), staged by the story's own `gestures` (`gesture-stack-web.mjs`) on the family's geometry
 * (`gesture-family-stack.mjs`). The drawing is GestureStackStatic's — one ramp of the accent for a stacked bar's parts,
 * two ramps and a neutral for a Likert's sides, increase / decrease / level inks for a bridge, every word set on the
 * ground — and the interaction is the bar web kit's (`web/bar-and-column.gestures/GestureBarWeb.tsx`):
 *
 * ONE PLATE PER STATE. The page the reader lands on is the RESTING plate (every resting gesture at once). Each further
 * gesture is one reader control owning one plate — the resting state plus that gesture — drawn whole at build time and
 * revealed by its radio (`:checked` / `:has()`, no script), so a pointer is always answered by the segment drawn where
 * it points. Every plate stands on one value axis (the family never rescales). Every segment answers a pointer, tap or
 * key with its value, its share of its bar and its bar's total (ask-a-mark). Text lives in HTML over the viewBox, the
 * strokes do not scale.
 */
import {
  adjustToContrast,
  contrast,
  mix,
  NON_TEXT_CONTRAST_MIN,
  TEXT_CONTRAST_MIN,
} from "#shared/chart-beat/colour.mjs";
import { figureVars, webRegisters } from "#shared/design-base/web.mjs";
import { skillScriptFrom } from "#shared/design-base/skill-script.mjs";
const { controlChromeCss } = await import(
  skillScriptFrom(
    import.meta.dirname,
    "chart-web",
    "assets",
    "control-chrome.ts",
  )
);

export const FRAME = {
  width: 900,
  minHeight: 280,
  pitch: 30,
  maxBar: 22,
  bridgeHeight: 340,
};
const SCOPE = ".chart-figure";
/** A segment narrower than this (viewBox units) prints no figure inside itself: it answers a pointer instead. */
const INSIDE_UNITS = 64;
const pct = (v: number, extent: number) => (v / extent) * 100;

type State = {
  order: string[];
  accent: string[];
  rings: string[];
  stepBack: string[];
  brackets: {
    index: number;
    segs: string[];
    span: string[];
    bars: string[];
    whole: boolean;
    value: number;
    note?: string;
  }[];
  copies: {
    index: number;
    onto: string[];
    bars: string[];
    of: string[];
    from: number;
    to: number;
    value: number;
  }[];
  references: { index: number; value: number; note?: string }[];
  count: { value: number; text: string } | null;
};
export type Control = {
  index: number;
  do: string;
  atom: string;
  legend: string;
  chip: string;
  announce: string;
  note: string;
  plate: State;
  total?: number;
  value?: number;
};

type Rect = {
  key: string;
  x: number;
  y: number;
  w: number;
  h: number;
  fill: string;
  ring: boolean;
  back: boolean;
  mark?: string;
};
type Label = {
  text: string;
  x: number;
  y: number;
  anchor: "after" | "before" | "centre" | "above";
  accent?: boolean;
  muted?: boolean;
  /** The fill a centred figure sits on: its ink is measured against it. */
  on?: string;
};
type Path = { d: string; dash?: boolean };

export function GestureStackWeb(props: {
  variant: "stacked-bar" | "diverging-stacked-bar-likert" | "waterfall-bridge";
  stack: any;
  resting: State;
  controls: Control[];
  details: Map<string, string> | Record<string, string>;
  format: (v: number) => string;
  restLabel: string;
  restNotes: string[];
  gutterPx: number;
  keyItems: { label: string; fill: string }[];
  sideNames?: { left?: string; right?: string };
  decreaseInk?: string;
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
  grid: string;
}) {
  const {
    variant,
    stack,
    resting,
    controls,
    format,
    restLabel,
    restNotes,
    gutterPx,
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
    grid,
  } = props;
  const details =
    props.details instanceof Map
      ? props.details
      : new Map(Object.entries(props.details));
  const regs = webRegisters(direction, { ink: { ink, muted, accent } });
  const rowsLayout = variant !== "waterfall-bridge";
  const W = FRAME.width;
  const names: string[] = stack.names;
  const H = rowsLayout
    ? Math.max(names.length * FRAME.pitch, FRAME.minHeight)
    : FRAME.bridgeHeight;
  const F = (v: number) => String(format(v));

  const accentInk =
    contrast(accent, ground) >= TEXT_CONTRAST_MIN
      ? accent
      : (adjustToContrast(ink, ground, TEXT_CONTRAST_MIN) ?? ink);
  const labelInk = adjustToContrast(ink, ground, TEXT_CONTRAST_MIN) ?? ink;
  const mutedInk = adjustToContrast(muted, ground, TEXT_CONTRAST_MIN) ?? muted;
  const copyFill =
    adjustToContrast(mix(ground, ink, 0.72), ground, NON_TEXT_CONTRAST_MIN) ??
    mix(ground, ink, 0.72);
  const ruleInk = mix(ground, ink, 0.75);
  const activeOf = (fill: string) => {
    const toward = mix(fill, ink, 0.3);
    return contrast(toward, fill) >= 1.12 ? toward : mix(fill, ground, 0.4);
  };

  const fillOf = (bar: string, part: string): string => {
    const parts: string[] = stack.parts;
    if (variant === "stacked-bar") {
      const i = parts.indexOf(part);
      const t = parts.length === 1 ? 0 : 1 - i / (parts.length - 1);
      return mix(accent, ground, 0.62 * t);
    }
    if (variant === "diverging-stacked-bar-likert") {
      const side = stack.sideOf(part);
      if (side === "centre") return mix(ground, ink, 0.14);
      const list: string[] = side === "left" ? stack.left : stack.right;
      const t = (list.indexOf(part) + 1) / list.length;
      return side === "left"
        ? mix(mix(muted, ground, 0.2), ink, t * 0.6)
        : mix(mix(accent, ground, 0.7), accent, t);
    }
    if (names.indexOf(bar) === 0) return muted;
    return stack.valueOf(bar, bar) >= 0
      ? accent
      : (props.decreaseInk ?? mix(ink, ground, 0.35));
  };

  // ── one value axis for every plate: the data, every copy and every reference any state draws ──────────────────
  const states = [resting, ...controls.map((c) => c.plate)];
  const [d0, d1] = stack.domain as [number, number];
  const ends = states.flatMap((s) => [
    ...s.copies.map((c) => c.to),
    ...s.references.map((r) => r.value),
  ]);
  let lo = Math.min(d0, ...ends);
  let hi = Math.max(d1, ...ends);
  if (variant === "diverging-stacked-bar-likert") {
    const m = Math.max(-lo, hi) * 1.22;
    [lo, hi] = [-m, m];
  } else if (rowsLayout) hi = hi + (hi - lo) * 0.16;
  else hi = hi + (hi - lo) * (states.some((s) => s.brackets.length) ? 0.45 : 0.2);
  const x = (v: number) => ((v - lo) / (hi - lo)) * W;

  // Bridge columns.
  const cols = rowsLayout ? [] : [...names, stack.closing?.name];
  const slot = rowsLayout ? 0 : W / cols.length;
  const colW = slot * 0.6;
  const xCol = (i: number) => i * slot + (slot - colW) / 2;
  const yB = (v: number) =>
    H - ((v - Math.min(0, lo)) / (hi - Math.min(0, lo))) * H;

  type Plate = {
    id: number;
    state: State;
    rects: Rect[];
    labels: Label[];
    paths: Path[];
    hits: { mark: string; cx: number; cy: number }[];
    slotOf: Map<string, number>;
  };
  const markKey = new Map<string, string>(
    stack.marks.map((m: any, k: number) => [m.name, `s${k + 1}`]),
  );

  function plateOf(id: number, s: State): Plate {
    const rects: Rect[] = [];
    const labels: Label[] = [];
    const paths: Path[] = [];
    const hits: { mark: string; cx: number; cy: number }[] = [];
    const slotOf = new Map(s.order.map((b, i) => [b, i]));
    const back = new Set(s.stepBack.filter((b) => !s.accent.includes(b)));
    if (rowsLayout) {
      const ROW = H / s.order.length;
      const barH = Math.min(ROW * 0.62, FRAME.maxBar);
      const yTop = (b: string) => slotOf.get(b)! * ROW + (ROW - barH) / 2;
      const mid = (b: string) => slotOf.get(b)! * ROW + ROW / 2;
      for (const b of s.order) {
        const segs: string[] = stack
          .partsOf(b)
          .map((p: string) => stack.markName(b, p));
        for (const p of stack.partsOf(b)) {
          const m = stack.markName(b, p);
          const [f, t] = stack.segment(b, p);
          const fill = fillOf(b, p);
          rects.push({
            key: m,
            mark: m,
            x: x(f),
            y: yTop(b),
            w: x(t) - x(f),
            h: barH,
            fill,
            ring: s.rings.includes(m),
            back: back.has(b),
          });
          hits.push({ mark: m, cx: (x(f) + x(t)) / 2, cy: mid(b) });
          if (x(t) - x(f) >= INSIDE_UNITS)
            labels.push({
              text: F(Math.abs(stack.valueOf(b, p))),
              x: (x(f) + x(t)) / 2,
              y: mid(b),
              anchor: "centre",
              muted: back.has(b),
              on: fill,
            });
        }
        const [f, t] = stack.unit(segs).extent;
        if (s.rings.includes(b))
          rects.push({
            key: `ring-${b}`,
            x: x(f),
            y: yTop(b) - 2,
            w: x(t) - x(f),
            h: barH + 4,
            fill: "none",
            ring: true,
            back: false,
          });
        if (variant === "stacked-bar")
          labels.push({
            text: F(stack.whole(b)),
            x: x(t),
            y: mid(b),
            anchor: "after",
            accent: s.accent.includes(b),
            muted: back.has(b),
          });
        else {
          labels.push({
            text: F(stack.sideTotal(b, "left")),
            x: x(f),
            y: mid(b),
            anchor: "before",
            accent: s.accent.includes(b),
            muted: back.has(b),
          });
          labels.push({
            text: F(stack.sideTotal(b, "right")),
            x: x(t),
            y: mid(b),
            anchor: "after",
            accent: s.accent.includes(b),
            muted: back.has(b),
          });
        }
      }
      for (const c of s.copies) {
        const b = c.bars[0];
        if (!slotOf.has(b)) continue;
        const y = yTop(b) + barH + 2;
        rects.push({
          key: `copy-${c.index}`,
          x: x(c.from),
          y,
          w: Math.max(0.5, x(c.to) - x(c.from)),
          h: Math.max(3, (ROW - barH) / 2 - 3),
          fill: copyFill,
          ring: false,
          back: false,
        });
        labels.push({
          text: F(c.value),
          x: x(c.to),
          y: y + 2,
          anchor: "after",
        });
      }
      for (const k of s.brackets) {
        if (k.bars.length === 1) {
          const b = k.bars[0];
          const [f, t] = stack.unit(k.whole ? k.span : k.segs).extent;
          const y = yTop(b) - 3;
          paths.push({ d: `M${x(f)},${y + 3}V${y}H${x(t)}V${y + 3}` });
        } else {
          const ys = k.bars.map((b) => slotOf.get(b)!).sort((a, b) => a - b);
          const right = Math.max(
            ...k.bars.map((b) =>
              x(
                stack.unit(
                  stack.partsOf(b).map((p: string) => stack.markName(b, p)),
                ).extent[1],
              ),
            ),
          );
          const sx = Math.min(W - 4, right + 46);
          const [ya, yb] = [ys[0] * ROW + 4, (ys.at(-1)! + 1) * ROW - 4];
          paths.push({ d: `M${sx - 6},${ya}H${sx}V${yb}H${sx - 6}` });
          labels.push({
            text: `= ${F(k.value)}`,
            x: sx,
            y: (ya + yb) / 2,
            anchor: "after",
            accent: true,
          });
        }
      }
      for (const r of s.references)
        paths.push({ d: `M${x(r.value)},0V${H}`, dash: true });
    } else {
      cols.forEach((b, i) => {
        const closing = i === cols.length - 1;
        const v = closing ? stack.closing.value : stack.valueOf(b, b);
        const [f, t] = closing
          ? [Math.min(0, v), Math.max(0, v)]
          : stack.segment(b, b);
        const fill = closing ? muted : fillOf(b, b);
        const ringed = s.rings.includes(b) || s.accent.includes(b);
        rects.push({
          key: b,
          mark: closing ? "closing" : b,
          x: xCol(i),
          y: yB(t),
          w: colW,
          h: yB(f) - yB(t),
          fill,
          ring: ringed,
          back: back.has(b),
        });
        hits.push({
          mark: closing ? `closing` : b,
          cx: xCol(i) + colW / 2,
          cy: (yB(f) + yB(t)) / 2,
        });
        labels.push({
          text:
            i === 0 || closing
              ? F(v)
              : `${v >= 0 ? "+" : "−"}${F(Math.abs(v))}`,
          x: xCol(i) + colW / 2,
          y: yB(t),
          anchor: "above",
          accent: ringed,
          muted: back.has(b),
        });
        if (!closing) {
          const level = stack.levelAfter(b);
          paths.push({
            d: `M${xCol(i) + colW},${yB(level)}H${xCol(i + 1)}`,
            dash: true,
          });
        }
      });
      for (const c of s.copies) {
        const i = names.indexOf(stack.barOf(c.onto[0]));
        if (i < 0) continue;
        const v = stack.valueOf(names[i], names[i]);
        const [f, t] = stack.segment(names[i], names[i]);
        const s0 = v >= 0 ? f : t;
        const end = v >= 0 ? s0 + Math.abs(c.value) : s0 - Math.abs(c.value);
        rects.push({
          key: `copy-${c.index}`,
          x: xCol(i) + colW + 3,
          y: Math.min(yB(s0), yB(end)),
          w: Math.max(6, slot * 0.1),
          h: Math.abs(yB(s0) - yB(end)),
          fill: copyFill,
          ring: false,
          back: false,
        });
      }
      for (const k of s.brackets) {
        const idx = k.segs
          .map((m) => names.indexOf(stack.barOf(m)))
          .filter((i) => i >= 0);
        if (!idx.length) continue;
        const [a, b] = [Math.min(...idx), Math.max(...idx)];
        const top =
          Math.min(
            ...names.slice(a, b + 1).map((n) => yB(stack.segment(n, n)[1])),
          ) - 34;
        paths.push({
          d: `M${xCol(a)},${top + 6}V${top}H${xCol(b) + colW}V${top + 6}`,
        });
        labels.push({
          text: `= ${F(k.value)}`,
          x: (xCol(a) + xCol(b) + colW) / 2,
          y: top,
          anchor: "above",
          accent: true,
        });
      }
      for (const r of s.references)
        paths.push({ d: `M0,${yB(r.value)}H${W}`, dash: true });
    }
    return { id, state: s, rects, labels, paths, hits, slotOf };
  }
  const plates = states.map((s, i) => plateOf(i, s));

  const plateCss = [
    `${SCOPE} [data-plate]:not([data-plate="0"]) { display: none; }`,
    `${SCOPE} .chart-plot { --y-gutter: ${rowsLayout ? gutterPx : 0}px; }`,
    `${SCOPE} .chart-plot .gesture-layer { position: relative; pointer-events: none; }`,
    `${SCOPE} .gesture-controls { flex: 0 0 auto; display: flex; flex-wrap: wrap; align-items: center; gap: 0 28px; margin-top: 4px; }`,
    `${SCOPE} .gesture-controls > fieldset { flex: 0 1 auto; max-width: 100%; }`,
    `${SCOPE} .gesture-notes { flex: 0 0 auto; display: grid; }`,
    `${SCOPE} .gesture-notes > div { grid-area: 1 / 1; align-self: start; }`,
    `${SCOPE} .gw-note { visibility: hidden; }`,
    `${SCOPE} .chart-rest-notes { margin: 4px 0 0; }`,
    `${SCOPE} .stack-key { display: flex; flex-wrap: wrap; gap: 2px 16px; margin: 4px 0 2px; }`,
    `${SCOPE} .stack-key i { display: inline-block; width: 0.7em; height: 0.7em; margin-right: 5px; vertical-align: baseline; }`,
    `${SCOPE} .chart-plot .x-axis .axis-label.x { white-space: normal; text-align: center; width: ${Math.floor(pct(slot, W))}%; line-height: 1.1; }`,
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

  const transformOf = (a: Label["anchor"]) =>
    a === "centre"
      ? "translate(-50%, -50%)"
      : a === "before"
        ? "translate(calc(-100% - 6px), -50%)"
        : a === "above"
          ? "translate(-50%, calc(-100% - 4px))"
          : "translate(6px, -50%)";

  const drawPlate = (p: Plate) => {
    const key = (m: string) => `p${p.id}-${markKey.get(m) ?? "closing"}`;
    const layerClass = p.id === 0 ? "overlay" : "gesture-layer";
    const ROW = rowsLayout ? H / p.state.order.length : 0;
    return [
      rowsLayout ? (
        <div className="y-axis" data-plate={p.id} key={`y${p.id}`}>
          {p.state.order.map((b) => (
            <span
              key={b}
              className="axis-label y"
              style={{
                ...regs.axis,
                color: p.state.accent.includes(b)
                  ? accentInk
                  : (regs.axis.color as string),
                fontWeight:
                  p.state.accent.includes(b) || p.state.rings.includes(b)
                    ? 700
                    : regs.axis.fontWeight,
                top: `${pct(p.slotOf.get(b)! * ROW + ROW / 2, H)}%`,
              }}
            >
              {b}
            </span>
          ))}
        </div>
      ) : null,
      <svg
        key={`s${p.id}`}
        role="group"
        aria-label={title}
        xmlns="http://www.w3.org/2000/svg"
        className="chart"
        data-hit="cell"
        data-plate={p.id}
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
      >
        <desc>{alt}</desc>
        <rect x={0} y={0} width={W} height={H} fill={ground} />
        {(rowsLayout ? [x(0)] : []).map((u) => (
          <line
            key="zero"
            x1={u}
            x2={u}
            y1={0}
            y2={H}
            stroke={ruleInk}
            strokeWidth={1}
            vectorEffect="non-scaling-stroke"
          />
        ))}
        {!rowsLayout && (
          <line
            x1={0}
            x2={W}
            y1={yB(0)}
            y2={yB(0)}
            stroke={grid}
            strokeWidth={1}
            vectorEffect="non-scaling-stroke"
          />
        )}
        {p.rects.map((r, i) => (
          <rect
            key={`${r.key}-${i}`}
            data-mark={r.mark ? key(r.mark) : undefined}
            x={r.x}
            y={r.y}
            width={Math.max(r.w, 0.01)}
            height={Math.max(r.h, 0.01)}
            fill={r.fill}
            opacity={r.back ? 0.3 : 1}
            stroke={r.ring ? labelInk : r.mark ? ground : "none"}
            strokeWidth={r.ring ? 1.5 : r.mark ? 1 : 0}
            vectorEffect="non-scaling-stroke"
            style={
              r.fill !== "none"
                ? { ["--mark-active" as string]: activeOf(r.fill) }
                : undefined
            }
          />
        ))}
        {p.paths.map((d, i) => (
          <path
            key={`path${i}`}
            d={d.d}
            fill="none"
            stroke={d.dash ? mutedInk : labelInk}
            strokeWidth={d.dash ? 1 : 1.3}
            strokeDasharray={d.dash ? "3 3" : undefined}
            vectorEffect="non-scaling-stroke"
          />
        ))}
        {p.hits.map((h) => {
          const detail = details.get(h.mark) ?? h.mark;
          return (
            <circle
              key={h.mark}
              className="pt"
              cx={h.cx}
              cy={h.cy}
              r={6}
              fill="transparent"
              stroke="none"
              tabIndex={0}
              role="img"
              data-mark-ref={key(h.mark)}
              aria-label={detail}
              data-detail={detail}
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
        data-plate={p.id}
        key={`l${p.id}`}
      >
        {p.labels.map((l, i) => (
          <span
            key={i}
            className="end-label"
            style={{
              ...regs.value,
              ...(l.anchor === "centre" ? { background: "transparent" } : {}),
              color: l.on ? (adjustToContrast(ink, l.on, TEXT_CONTRAST_MIN) ?? labelInk) : l.accent ? accentInk : l.muted ? mutedInk : labelInk,
              left: `${pct(l.x, W).toFixed(3)}%`,
              top: `${pct(l.y, H).toFixed(3)}%`,
              transform: transformOf(l.anchor),
            }}
          >
            {l.text}
          </span>
        ))}
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
        ["--grid" as string]: grid,
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

      {props.keyItems.length || unit || props.sideNames ? (
        <p className="stack-key" style={{ ...regs.axis }}>
          {props.sideNames?.left ? (
            <span
              style={{ color: mutedInk }}
            >{`< ${props.sideNames.left}`}</span>
          ) : null}
          {props.sideNames?.right ? (
            <span
              style={{ color: mutedInk }}
            >{`${props.sideNames.right} >`}</span>
          ) : null}
          {props.keyItems.map((k) => (
            <span
              key={k.label}
              style={{
                color:
                  adjustToContrast(k.fill, ground, TEXT_CONTRAST_MIN) ??
                  labelInk,
                fontWeight: 700,
              }}
            >
              <i style={{ background: k.fill }} />
              {k.label}
            </span>
          ))}
          {unit ? <span style={{ color: mutedInk }}>{unit}</span> : null}
        </p>
      ) : null}
      <div
        className="chart-plot"
        style={{
          ["--x-axis-h" as string]: rowsLayout ? "0px" : "34px",
          aspectRatio: `${W + (rowsLayout ? gutterPx : 0)} / ${H + (rowsLayout ? 0 : 34)}`,
        }}
      >
        {plates.flatMap(drawPlate)}
        {!rowsLayout ? (
          <div className="x-axis">
            {cols.map((b, i) => (
              <span
                key={b}
                className="axis-label x"
                style={{
                  ...regs.axis,
                  left: `${pct(xCol(i) + colW / 2, W)}%`,
                  color: resting.rings.includes(b) ? accentInk : mutedInk,
                }}
              >
                {b}
              </span>
            ))}
          </div>
        ) : null}
      </div>
      <p className="chart-source" style={{ ...regs.body, margin: "6px 0 0" }}>
        {source}
      </p>
    </figure>
  );
}
