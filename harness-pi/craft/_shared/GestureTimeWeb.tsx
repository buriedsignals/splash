/**
 * A Time-series beat whose staging is the story's own `gestures`, delivered as an interactive page — one component for
 * every type of the family (prop `variant`): a line, an area (stacked when several series), a streamgraph or a bump
 * chart. Forked from the per-type web kits' doctrine (`web/line/DirectedLineWeb.tsx` and its siblings): a line's value
 * axis fitted, an area on zero, a stream with no value axis, a bump with rank 1 on top; one accent on the claim's
 * series; every series labelled at its end; every word in HTML over the drawing; every reading answers a pointer.
 *
 * ONE PLATE PER STATE, as `GestureBarWeb.tsx` draws them: the RESTING plate (every gesture that rests, drawn at once)
 * and one plate per control (the resting picture plus that gesture), each revealed by its radio with `:checked` /
 * `:has()` and no script. A plate per state because `interaction.mjs` resolves a pointer off the hit points' cx/cy read
 * once at init: on its own plate every reading is answered where it is drawn.
 *
 *   compare  level: the earlier reading's level laid across to the later one, the gap drawn; copy: the earlier band's
 *            thickness laid beside the later band; crossing: every solved crossing ringed
 *   bracket  the run of time tinted, a bracket above it, its sum and share printed
 *   filter   the other series leave; the frame does not move
 *   zoom     the time axis enlarged onto the window (the value axis never moves), the factor in the chip
 *   trace    the series drawn to the playhead, what came after stepping back behind it
 *
 * A gap is drawn as a gap on every plate: a line breaks and a dotted bridge marks it, a stack is hatched there.
 */

import {
  adjustToContrast,
  assertLegible,
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

export const FRAME = { width: 900, height: 400, xAxisRowPx: 28 };
const SCOPE = ".chart-figure";

type Pt = { t: number; key: string; y0: number; y1: number; gap: boolean };
type At = {
  name: string;
  series: string;
  t: number;
  key: string;
  value: number;
  y0: number;
  y1: number;
};
export type Reading = {
  name: string;
  series: string;
  t: number;
  y0: number;
  y1: number;
  detail: string;
};
export type TimeWebShape = {
  variant:
    "line" | "area-and-stacked-area" | "streamgraph" | "bump-ranking-over-time";
  series: string[];
  geometry: [string, Pt[]][];
  gaps: {
    series: string | null;
    from: number;
    to: number;
    keys: string[];
    bridged: boolean;
  }[];
  gapLabel: string;
  domain: [number, number];
  t0: number;
  t1: number;
  slots: number;
};
export type TimeControl = {
  index: number;
  do: string;
  legend: string;
  chip: string;
  announce: string;
  note: string;
  kind?: string;
  a?: At;
  b?: At;
  crossings?: { t: number; level: number; y: number }[];
  from?: number;
  to?: number;
  layers?: string[];
  figure?: string;
  keep?: string[];
  window?: [number, number];
  traced?: string[];
};
type Resting = {
  rings: string[];
  points: { k: number; at: At; text: string; ring: boolean }[];
  references: { k: number; value: number; text?: string }[];
};

const pct = (value: number, extent: number) => (value / extent) * 100;

export function GestureTimeWeb({
  variant,
  shape,
  readings,
  accentSeries,
  resting,
  controls,
  endLabels,
  yTicks,
  xTicksOf,
  endGutterPx,
  gutterPx,
  restLabel,
  restNotes,
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
}: {
  variant: string;
  shape: TimeWebShape;
  readings: Reading[];
  accentSeries: string;
  resting: Resting;
  controls: TimeControl[];
  /** per series, its end label and the y (in value units) it is spread to */
  endLabels: { series: string; text: string; y: number }[];
  yTicks: { value: number; label: string }[];
  /** the x ticks for a window [t0, t1] */
  xTicksOf: Record<string, { t: number; label: string }[]>;
  endGutterPx: number;
  gutterPx: number;
  restLabel: string;
  restNotes: string[];
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
  const regs = webRegisters(direction, { ink: { ink, muted, accent } });
  const W = FRAME.width;
  const H = FRAME.height;
  const geometry = new Map(shape.geometry);
  const [lo, hi] = shape.domain;
  const lineLike = variant === "line" || variant === "bump-ranking-over-time";
  const single = shape.series.length === 1;

  assertLegible(accent, ground, {
    role: "mark",
    where: `${direction.id ?? "this direction"}'s accent`,
  });
  const accentInk =
    adjustToContrast(accent, ground, TEXT_CONTRAST_MIN) ?? accent;
  const neutral =
    adjustToContrast(mix(ground, ink, 0.42), ground, NON_TEXT_CONTRAST_MIN) ??
    mix(ground, ink, 0.42);
  const neutralLight = mix(ground, ink, 0.24);
  const backInk = mix(ground, ink, 0.12);
  const labelInk = adjustToContrast(ink, ground, TEXT_CONTRAST_MIN) ?? ink;
  const mutedInk = adjustToContrast(muted, ground, TEXT_CONTRAST_MIN) ?? muted;
  const ringInk =
    adjustToContrast(mix(ground, ink, 0.8), ground, NON_TEXT_CONTRAST_MIN) ??
    ink;
  const accentTint = mix(ground, accent, 0.45);

  // A stack's words are written above its silhouette, never over a band: the plot keeps headroom for them.
  const stackedShape = !lineLike;
  const top = stackedShape ? hi + (hi - lo) * 0.22 : hi;
  const Y = (v: number) => H - ((v - lo) / (top - lo || 1)) * H;
  const tipOf = (p: { y0: number; y1: number }) =>
    lineLike || single ? Y(p.y1) : Y((p.y0 + p.y1) / 2);
  const fillOf = (s: string, i: number, back: boolean) =>
    back
      ? backInk
      : s === accentSeries
        ? accent
        : lineLike
          ? neutral
          : i % 2
            ? neutralLight
            : neutral;

  type Plate = {
    id: number;
    win: [number, number];
    hide: Set<string>;
    trace: { series: Set<string>; t: number } | null;
    control: TimeControl | null;
  };

  const interp = (pts: Pt[], t: number): Pt | null => {
    for (let i = 0; i + 1 < pts.length; i++) {
      const [p, q] = [pts[i], pts[i + 1]];
      if (p.t <= t && t <= q.t && !p.gap && !q.gap) {
        const u = (t - p.t) / (q.t - p.t || 1);
        return {
          t,
          key: p.key,
          y0: p.y0 + (q.y0 - p.y0) * u,
          y1: p.y1 + (q.y1 - p.y1) * u,
          gap: false,
        };
      }
    }
    return null;
  };
  const runsOf = (pts: Pt[]) => {
    const out: Pt[][] = [];
    let run: Pt[] = [];
    for (const p of pts) {
      if (p.gap) {
        if (run.length) out.push(run);
        run = [];
      } else run.push(p);
    }
    if (run.length) out.push(run);
    return out;
  };

  const drawPlate = (p: Plate) => {
    const [w0, w1] = p.win;
    const X = (t: number) => ((t - w0) / (w1 - w0 || 1)) * W;
    const linePath = (run: Pt[]) =>
      run
        .map(
          (q, i) =>
            `${i ? "L" : "M"}${X(q.t).toFixed(2)},${Y(q.y1).toFixed(2)}`,
        )
        .join("");
    const bandPath = (run: Pt[]) =>
      `${run.map((q, i) => `${i ? "L" : "M"}${X(q.t).toFixed(2)},${Y(q.y1).toFixed(2)}`).join("")}${[
        ...run,
      ]
        .reverse()
        .map((q) => `L${X(q.t).toFixed(2)},${Y(q.y0).toFixed(2)}`)
        .join("")}Z`;
    const c = p.control;
    const bracket = c?.do === "bracket" ? c : null;
    const marks: any[] = [];
    const order = [...shape.series].sort(
      (a, b) =>
        Number(a === accentSeries) - Number(b === accentSeries) ||
        Number(resting.rings.includes(a)) - Number(resting.rings.includes(b)),
    );
    order.forEach((s) => {
      if (p.hide.has(s)) return;
      const i = shape.series.indexOf(s);
      const pts = geometry.get(s) ?? [];
      const ring = resting.rings.includes(s);
      const traced = p.trace?.series.has(s) ? p.trace.t : null;
      const pieces: { run: Pt[]; back: boolean }[] = [];
      for (const run of runsOf(pts)) {
        if (traced === null) pieces.push({ run, back: false });
        else {
          const cut = interp(run, traced);
          const before = run.filter((q) => q.t <= traced);
          const after = run.filter((q) => q.t >= traced);
          if (before.length)
            pieces.push({
              run: cut && before.at(-1)!.t < traced ? [...before, cut] : before,
              back: false,
            });
          if (after.length)
            pieces.push({
              run: cut && after[0].t > traced ? [cut, ...after] : after,
              back: true,
            });
        }
      }
      pieces.forEach(({ run, back }, j) => {
        const fill = fillOf(s, i, back);
        if (lineLike) {
          const sw =
            s === accentSeries && !back
              ? (direction.stroke?.series ?? 2.5) * 1.1
              : ring
                ? 2
                : 1.4;
          marks.push(
            <path
              key={`l${s}${j}`}
              d={linePath(run)}
              fill="none"
              stroke={ring && !back ? ringInk : fill}
              strokeWidth={sw}
              strokeLinejoin="round"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />,
          );
        } else {
          const tinted =
            bracket && s === accentSeries && bracket.layers!.includes(s);
          marks.push(
            <path
              key={`a${s}${j}`}
              d={bandPath(run)}
              fill={tinted ? accentTint : fill}
              stroke={ground}
              strokeWidth={0.8}
              vectorEffect="non-scaling-stroke"
            />,
          );
          if (tinted)
            marks.push(
              <path
                key={`ab${s}${j}`}
                d={bandPath(run)}
                fill={fill}
                clipPath={`url(#br-${p.id})`}
                stroke={ground}
                strokeWidth={0.8}
                vectorEffect="non-scaling-stroke"
              />,
            );
          if (ring && !back)
            marks.push(
              <path
                key={`ar${s}${j}`}
                d={bandPath(run)}
                fill="none"
                stroke={ringInk}
                strokeWidth={1.6}
                vectorEffect="non-scaling-stroke"
              />,
            );
        }
      });
    });

    const gapMarks: any[] = [];
    let gapAt: { x: number; y: number } | null = null;
    for (const g of shape.gaps) {
      if (g.series === null) {
        gapMarks.push(
          <rect
            key={`gap${g.from}`}
            x={X(g.from)}
            y={0}
            width={Math.max(1, X(g.to) - X(g.from))}
            height={H}
            fill={mix(ground, ink, 0.06)}
            stroke={mutedInk}
            strokeWidth={0.6}
            strokeDasharray="2 3"
            vectorEffect="non-scaling-stroke"
          />,
        );
        gapAt ??= { x: (X(g.from) + X(g.to)) / 2, y: 18 };
      } else if (g.bridged && !p.hide.has(g.series)) {
        const pts = geometry.get(g.series) ?? [];
        const a = pts.find((q) => q.t === g.from)!;
        const b = pts.find((q) => q.t === g.to)!;
        gapMarks.push(
          <line
            key={`gap${g.series}${g.from}`}
            x1={X(a.t)}
            x2={X(b.t)}
            y1={Y(a.y1)}
            y2={Y(b.y1)}
            stroke={mutedInk}
            strokeWidth={1.2}
            strokeDasharray="1.5 3"
            vectorEffect="non-scaling-stroke"
          />,
        );
        gapAt ??= {
          x: (X(a.t) + X(b.t)) / 2,
          y: Math.min(Y(a.y1), Y(b.y1)) - 14,
        };
      }
    }

    // Gesture marks (SVG) and their words (HTML), resting first, then the control's own.
    const overlay: any[] = [];
    const words: {
      text: string;
      x: number;
      y: number;
      fill: string;
      ref?: boolean;
    }[] = [];
    for (const r of resting.references) {
      overlay.push(
        <line
          key={`ref${r.k}`}
          x1={0}
          x2={W}
          y1={Y(r.value)}
          y2={Y(r.value)}
          stroke={labelInk}
          strokeWidth={1}
          strokeDasharray="5 4"
          vectorEffect="non-scaling-stroke"
        />,
      );
      if (r.text)
        words.push({
          text: r.text,
          x: 6,
          y: Y(r.value),
          fill: labelInk,
          ref: true,
        });
    }
    const inWin = (t: number) => t >= w0 - 1e-9 && t <= w1 + 1e-9;
    for (const q of resting.points) {
      if (p.hide.has(q.at.series) || !inWin(q.at.t)) continue;
      const ax = X(q.at.t);
      const ay = tipOf(q.at);
      overlay.push(
        <circle
          key={`rp${q.k}`}
          cx={ax}
          cy={ay}
          r={q.ring ? 6 : 3}
          fill={
            q.ring ? "none" : q.at.series === accentSeries ? accent : labelInk
          }
          stroke={q.ring ? ringInk : "none"}
          strokeWidth={1.6}
          vectorEffect="non-scaling-stroke"
        />,
      );
      words.push({
        text: q.text,
        x: ax,
        y: ay,
        fill: q.at.series === accentSeries ? accentInk : labelInk,
      });
    }
    const restingWords = words.length;
    if (c?.do === "compare" && (c.kind === "level" || c.kind === "copy")) {
      const { a, b } = c as Required<TimeControl>;
      if (c.kind === "level") {
        const [ya, yb] = [tipOf(a), tipOf(b)];
        overlay.push(
          <line
            key="lv"
            x1={X(b.t)}
            x2={X(a.t)}
            y1={yb}
            y2={yb}
            stroke={labelInk}
            strokeWidth={1}
            strokeDasharray="3 3"
            vectorEffect="non-scaling-stroke"
          />,
        );
        overlay.push(
          <circle
            key="lvb"
            cx={X(b.t)}
            cy={yb}
            r={4}
            fill={ground}
            stroke={labelInk}
            strokeWidth={1.4}
            vectorEffect="non-scaling-stroke"
          />,
        );
        overlay.push(
          <line
            key="lvt"
            x1={X(a.t)}
            x2={X(a.t)}
            y1={yb}
            y2={ya}
            stroke={accent}
            strokeWidth={2.5}
            vectorEffect="non-scaling-stroke"
          />,
        );
        overlay.push(
          <circle key="lva" cx={X(a.t)} cy={ya} r={4} fill={accent} />,
        );
        words.push({
          text: c.figure!,
          x: X(a.t),
          y: Math.min(ya, yb),
          fill: labelInk,
        });
      } else {
        const thick = Math.abs(Y(b.y1) - Y(b.y0));
        overlay.push(
          <rect
            key="cp"
            x={X(a.t) + 4}
            y={Y(a.y0) - thick}
            width={7}
            height={Math.max(1, thick)}
            fill={labelInk}
          />,
        );
        overlay.push(
          <rect
            key="cpb"
            x={X(b.t) - 3.5}
            y={Y(b.y1)}
            width={7}
            height={Math.max(1, thick)}
            fill="none"
            stroke={labelInk}
            strokeWidth={1}
            vectorEffect="non-scaling-stroke"
          />,
        );
        words.push({
          text: c.figure!,
          x: X(a.t) + 11,
          y: Y(a.y0) - thick,
          fill: labelInk,
        });
      }
    }
    if (c?.do === "compare" && c.kind === "crossing") {
      c.crossings!.forEach((q, j) =>
        overlay.push(
          <circle
            key={`cr${j}`}
            cx={X(q.t)}
            cy={lineLike ? Y(q.level) : Y(q.y)}
            r={7}
            fill="none"
            stroke={ringInk}
            strokeWidth={1.8}
            vectorEffect="non-scaling-stroke"
          />,
        ),
      );
      const q = c.crossings![0];
      if (q)
        words.push({
          text: c.figure!,
          x: X(q.t),
          y: lineLike ? Y(q.level) : Y(q.y),
          fill: labelInk,
        });
    }
    if (bracket) {
      overlay.push(
        <path
          key="br"
          d={`M${X(bracket.from!)},10V3H${X(bracket.to!)}V10`}
          fill="none"
          stroke={labelInk}
          strokeWidth={1.2}
          vectorEffect="non-scaling-stroke"
        />,
      );
      words.push({
        text: bracket.figure!,
        x: (X(bracket.from!) + X(bracket.to!)) / 2,
        y: 26,
        fill: labelInk,
      });
    }
    if (p.trace)
      overlay.push(
        <line
          key="ph"
          x1={X(p.trace.t)}
          x2={X(p.trace.t)}
          y1={0}
          y2={H}
          stroke={labelInk}
          strokeWidth={1}
          strokeDasharray="4 3"
          vectorEffect="non-scaling-stroke"
        />,
      );
    if (p.trace && c?.figure)
      words.push({ text: c.figure, x: X(p.trace.t), y: 18, fill: labelInk });
    if (gapAt)
      words.push({
        text: shape.gapLabel,
        x: gapAt.x,
        y: gapAt.y,
        fill: mutedInk,
      });

    // On a stack, every word moves up to the silhouette's top at its time, a leader back to its mark.
    if (stackedShape)
      for (const w of words) {
        if (w.ref || w.text === shape.gapLabel) continue;
        // The label runs a stretch of the plot away from its anchor (right of it on the left half, left of it on
        // the right half): the silhouette's highest top over that stretch is what it must clear.
        const t = w0 + (w.x / W) * (w1 - w0);
        const reach = (w1 - w0) * 0.32 * (pct(w.x, W) > 58 ? -1 : 1);
        const ts = Array.from({ length: 13 }, (_, i) => t + (reach * i) / 12).filter((u) => u >= w0 && u <= w1);
        const tops = shape.series
          .filter((s) => !p.hide.has(s))
          .flatMap((s) => ts.map((u) => interp(geometry.get(s) ?? [], u)?.y1))
          .filter((v): v is number => Number.isFinite(v));
        if (!tops.length) continue;
        const y = Math.min(w.y, Y(Math.max(...tops)) - 6);
        if (w.y - y > 8)
          overlay.push(<line key={`ld${overlay.length}`} x1={w.x} x2={w.x} y1={w.y} y2={y} stroke={labelInk} strokeWidth={0.8} vectorEffect="non-scaling-stroke" />);
        w.y = y;
      }

    // A control's own words never sit on a resting note: near one, they climb one line above it.
    for (const w of words.slice(restingWords))
      for (const r of words.slice(0, restingWords))
        if (Math.abs(w.x - r.x) < W * 0.14 && Math.abs(w.y - r.y) < H * 0.08) w.y = r.y - H * 0.09;

    const shown = readings.filter((r) => !p.hide.has(r.series) && inWin(r.t));
    const ticks = xTicksOf[`${w0}-${w1}`] ?? [];
    const visible = (s: string) => !p.hide.has(s);
    return [
      <div
        className="y-axis"
        data-plate={p.id}
        key={`y${p.id}`}
        style={{ pointerEvents: "none" }}
      >
        {yTicks.map((t) => (
          <span
            key={t.value}
            className="axis-label y"
            style={{ ...regs.axis, top: `${pct(Y(t.value), H)}%` }}
          >
            {t.label}
          </span>
        ))}
      </div>,
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
        <defs>
          {bracket ? (
            <clipPath id={`br-${p.id}`}>
              <rect
                x={X(bracket.from!)}
                y={-2}
                width={Math.max(0.5, X(bracket.to!) - X(bracket.from!))}
                height={H + 4}
              />
            </clipPath>
          ) : null}
        </defs>
        <rect x={0} y={0} width={W} height={H} fill={ground} />
        {yTicks.map((t) => (
          <line
            key={`g${t.value}`}
            x1={0}
            x2={W}
            y1={Y(t.value)}
            y2={Y(t.value)}
            stroke={t.value === 0 ? mix(ground, ink, 0.5) : grid}
            strokeWidth={1}
            vectorEffect="non-scaling-stroke"
          />
        ))}
        {gapMarks}
        {marks}
        {overlay}
        {shown.map((r) => (
          <circle
            key={r.name}
            className="pt"
            cx={X(r.t)}
            cy={tipOf(r)}
            r={4}
            fill="transparent"
            stroke="none"
            tabIndex={0}
            role="img"
            aria-label={r.detail}
            data-detail={r.detail}
          />
        ))}
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
        className={p.id === 0 ? "overlay" : "gesture-layer"}
        aria-hidden="true"
        data-plate={p.id}
        key={`o${p.id}`}
      >
        {words.map((w, i) => {
          const right = pct(w.x, W) > 58;
          return (
            <span
              key={i}
              className={w.ref ? "note reference-label" : "note"}
              style={{
                ...regs.annot,
                color: w.fill,
                ...(right
                  ? { right: `calc(${(100 - pct(w.x, W)).toFixed(3)}% + 8px)` }
                  : { left: `calc(${pct(w.x, W).toFixed(3)}% + 8px)` }),
                top: `${pct(w.y, H).toFixed(3)}%`,
                transform: w.ref ? undefined : !stackedShape && pct(w.y, H) < 18 ? "translateY(25%)" : "translateY(-110%)",
              }}
            >
              {w.text}
            </span>
          );
        })}
      </div>,
      <div
        className="end-axis"
        data-plate={p.id}
        key={`e${p.id}`}
        style={{ pointerEvents: "none" }}
      >
        {endLabels
          .filter((e) => visible(e.series))
          .map((e) => (
            <span
              key={e.series}
              className="axis-label"
              style={{
                ...regs.annot,
                position: "absolute",
                left: "8px",
                top: `${pct(Y(e.y), H).toFixed(3)}%`,
                transform: "translateY(-50%)",
                whiteSpace: "nowrap",
                color: e.series === accentSeries ? accentInk : labelInk,
                fontWeight:
                  e.series === accentSeries
                    ? 700
                    : (regs.annot.fontWeight as any),
              }}
            >
              {e.text}
            </span>
          ))}
      </div>,
      <div className="x-axis" data-plate={p.id} key={`x${p.id}`}>
        {ticks.map((t) => (
          <span
            key={t.t}
            className="axis-label x"
            style={{ ...regs.axis, left: `${pct(X(t.t), W)}%` }}
          >
            {t.label}
          </span>
        ))}
      </div>,
    ];
  };

  const full: [number, number] = [shape.t0, shape.t1];
  const plates: Plate[] = [
    { id: 0, win: full, hide: new Set(), trace: null, control: null },
  ];
  controls.forEach((c, k) => {
    const id = k + 1;
    if (c.do === "filter")
      plates.push({
        id,
        win: full,
        hide: new Set(shape.series.filter((s) => !c.keep!.includes(s))),
        trace: null,
        control: c,
      });
    else if (c.do === "zoom")
      plates.push({
        id,
        win: c.window!,
        hide: new Set(),
        trace: null,
        control: c,
      });
    else if (c.do === "trace")
      plates.push({
        id,
        win: full,
        hide: new Set(),
        trace: { series: new Set(c.traced!), t: c.to! },
        control: c,
      });
    else
      plates.push({ id, win: full, hide: new Set(), trace: null, control: c });
  });

  const plateCss = [
    `${SCOPE} [data-plate]:not([data-plate="0"]) { display: none; }`,
    `${SCOPE} .chart-plot .gesture-layer { position: relative; pointer-events: none; }`,
    `${SCOPE} .gesture-controls { flex: 0 0 auto; display: flex; flex-wrap: wrap; align-items: center; gap: 0 28px; margin-top: 4px; }`,
    `${SCOPE} .gesture-controls > fieldset { flex: 0 1 auto; max-width: 100%; }`,
    `${SCOPE} .gesture-notes { flex: 0 0 auto; display: grid; }`,
    `${SCOPE} .gesture-notes > div { grid-area: 1 / 1; align-self: start; }`,
    `${SCOPE} .gw-note { visibility: hidden; }`,
    `${SCOPE} .chart-rest-notes { margin: 4px 0 0; }`,
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
            {restNotes.join(" · ")}
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

      {unit ? (
        <p className="chart-unit" style={{ ...regs.axis, margin: "4px 0 2px" }}>
          {unit}
        </p>
      ) : null}
      <div
        className="chart-plot"
        style={{
          ["--y-gutter" as string]: `${gutterPx}px`,
          ["--end-gutter" as string]: `${endGutterPx}px`,
          ["--x-axis-h" as string]: `${FRAME.xAxisRowPx}px`,
          aspectRatio: `${W + gutterPx + endGutterPx} / ${H + FRAME.xAxisRowPx}`,
        }}
      >
        {plates.flatMap(drawPlate)}
      </div>
      <p className="chart-source" style={{ ...regs.body, margin: "6px 0 0" }}>
        {source}
      </p>
    </figure>
  );
}
