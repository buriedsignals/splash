/**
 * THE TIME-SERIES GESTURE PLATE — one still for every type of the family (prop `variant`): a line, an area (stacked
 * when several series), a streamgraph or a bump chart, with the beat's composed gestures drawn on it
 * (`gesture-time-static.mjs`). Forked from the per-type kits' doctrine (`static/line/DirectedLine.tsx`,
 * `static/area-and-stacked-area/DirectedArea.tsx`, `static/streamgraph/DirectedStreamgraph.tsx`,
 * `static/bump-ranking-over-time/DirectedBump.tsx`), their fixed staging replaced by the gestures:
 *
 *   - registers from the run's direction, furniture derived from the ground, ONE accent: the claim's series;
 *   - a line's value axis is fitted (it carries a rate), an area stands on zero, a stream has no value axis (its
 *     quantities are written), a bump runs rank 1 at the top;
 *   - every series labelled directly at its end, in its own ink, no legend;
 *   - a gap is drawn as a gap: the line breaks and a dotted bridge marks it, a stack is hatched there, and the gap's
 *     words are written once on the plate.
 *
 * Positions are computed here; nothing about the story is. Every word is laid from one baseline and stepped by its
 * register's lead, and every note is nudged clear of the others before it is drawn.
 */

import { adjustToContrast, deriveFurniture, measureText, NON_TEXT_CONTRAST_MIN, TEXT_CONTRAST_MIN } from "#shared/chart-beat/render-still.mjs";
import { mix } from "#shared/chart-beat/colour.mjs";
import { applyCase } from "#shared/chart-beat/registers.mjs";
import {
  EYEBROW_TO_DISPLAY,
  gapOf,
  leadOf,
  registerOf,
} from "#shared/design-base/register.mjs";
import { niceTicks } from "./gesture-family-time.mjs";

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
export type TimePlate = {
  accent: string;
  rings: string[];
  back: string[];
  points: { k: number; at: At; text: string; ring: boolean }[];
  levels: { k: number; a: At; b: At; text?: string }[];
  copies: { k: number; a: At; b: At; text?: string }[];
  crossings: {
    k: number;
    series: string[];
    crossings: { t: number; level: number; y: number }[];
    text?: string;
  }[];
  brackets: {
    k: number;
    from: number;
    to: number;
    layers: string[];
    sum: number;
    share: number;
    ofWhole: boolean;
    text?: string;
  }[];
  references: { k: number; value: number; text?: string }[];
  captions: { k: number; text: string }[];
};
export type TimeShape = {
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
  /** per series, its last drawn reading's printed value ("" for a bump) */
  lastValue: Record<string, string>;
};

type RegisterName = "display" | "eyebrow" | "body" | "axis" | "annot" | "value";
type Box = { left: number; right: number; top: number; bottom: number };

export function GestureTimeStatic({
  frame,
  shape,
  plate,
  format,
  title,
  limits,
  source,
  alt,
  eyebrow,
  unit,
  direction,
}: {
  frame: { width: number; height: number };
  shape: TimeShape;
  plate: TimePlate;
  format: (v: number) => string;
  title: string | string[];
  limits: string | string[];
  source: string;
  alt: string;
  eyebrow: string;
  unit: string;
  direction: any;
}) {
  const { width: W, height: H } = frame;
  const PAD = direction.pad ?? 40;
  const { ink, muted, grid } = deriveFurniture(direction.ground);
  const ground = direction.ground;
  const reg = (name: RegisterName) => registerOf(direction, name);
  const R = {
    display: reg("display"),
    eyebrow: reg("eyebrow"),
    body: reg("body"),
    axis: reg("axis"),
    annot: reg("annot"),
    value: reg("value"),
  };
  const set = (text: string, r: any) => applyCase(String(text), r.transform);
  const widthOf = (text: string, r: any) =>
    measureText(set(text, r), {
      fontSize: r.fontSize,
      fontWeight: r.fontWeight,
      fontFamily: r.fontFamily,
      fontStyle: r.fontStyle,
    }) +
    (r.letterSpacing ?? 0) * Math.max(0, set(text, r).length - 1);
  const wrap = (text: string, r: any, max: number) => {
    const words = String(text).split(/\s+/).filter(Boolean);
    const lines: string[] = [];
    let line = "";
    for (const w of words) {
      const next = line ? `${line} ${w}` : w;
      if (line && widthOf(next, r) > max) {
        lines.push(line);
        line = w;
      } else line = next;
    }
    if (line) lines.push(line);
    return lines;
  };
  const pickForm = (forms: string[], r: any, max: number, most: number) => {
    for (const f of forms) {
      const lines = wrap(f, r, max);
      if (lines.length <= most) return lines;
    }
    return wrap(forms.at(-1)!, r, max);
  };

  // Colours: the accent carries the claim's series; everything else is the ground's own furniture.
  const walk = (c: string, floor: number) =>
    adjustToContrast(c, ground, floor) ?? c;
  const accent = walk(direction.accent, NON_TEXT_CONTRAST_MIN);
  const accentInk = walk(direction.accent, TEXT_CONTRAST_MIN);
  const neutral = walk(mix(ground, ink, 0.42), NON_TEXT_CONTRAST_MIN);
  const neutralLight = mix(ground, ink, 0.24);
  const backInk = mix(ground, ink, 0.14);
  const labelInk = walk(ink, TEXT_CONTRAST_MIN);
  const mutedInk = walk(muted, TEXT_CONTRAST_MIN);
  const ringInk = walk(mix(ground, ink, 0.8), NON_TEXT_CONTRAST_MIN);
  const accentTint = mix(ground, direction.accent, 0.45);

  // ── the header and the footer, laid from one baseline each
  const inner = W - 2 * PAD;
  const titleLines = pickForm([title].flat().map(String), R.display, inner, 2);
  const standLines = pickForm([limits].flat().map(String), R.body, inner, 3);
  const sourceLines = wrap(source, R.body, inner).slice(0, 2);
  let y = PAD;
  const texts: {
    text: string;
    x: number;
    y: number;
    r: any;
    fill: string;
    anchor?: string;
    weight?: number;
  }[] = [];
  y += leadOf(R.eyebrow) * 0.8;
  texts.push({
    text: set(eyebrow, R.eyebrow),
    x: PAD,
    y,
    r: R.eyebrow,
    fill: walk(R.eyebrow.fill ?? direction.accent, TEXT_CONTRAST_MIN),
  });
  y += gapOf(R.eyebrow, EYEBROW_TO_DISPLAY) + leadOf(R.display) * 0.8;
  titleLines.forEach((l, i) =>
    texts.push({
      text: set(l, R.display),
      x: PAD,
      y: y + i * leadOf(R.display),
      r: R.display,
      fill: walk(R.display.fill ?? ink, TEXT_CONTRAST_MIN),
    }),
  );
  y += (titleLines.length - 1) * leadOf(R.display) + leadOf(R.body) * 1.1;
  standLines.forEach((l, i) =>
    texts.push({
      text: set(l, R.body),
      x: PAD,
      y: y + i * leadOf(R.body),
      r: R.body,
      fill: mutedInk,
    }),
  );
  y += (standLines.length - 1) * leadOf(R.body);
  const sourceTop = H - PAD - (sourceLines.length - 1) * leadOf(R.body);
  sourceLines.forEach((l, i) =>
    texts.push({
      text: set(l, R.body),
      x: PAD,
      y: sourceTop + i * leadOf(R.body),
      r: R.body,
      fill: mutedInk,
    }),
  );

  // ── the captions (notes no reading carries) sit above the plot, then the plot
  const captionLines = plate.captions.flatMap((c) =>
    wrap(c.text, R.annot, inner),
  );
  let plotTop = y + leadOf(R.body) * 1.2;
  captionLines.forEach((l, i) =>
    texts.push({
      text: set(l, R.annot),
      x: PAD,
      y: plotTop + leadOf(R.annot) * (0.8 + i),
      r: R.annot,
      fill: labelInk,
    }),
  );
  plotTop +=
    captionLines.length * leadOf(R.annot) +
    (unit && shape.variant !== "bump-ranking-over-time"
      ? leadOf(R.axis) * 1.4
      : leadOf(R.axis) * 0.6) +
    // A bracket's brace and figure stand above the plot, clear of the surface they measure.
    (plate.brackets.length ? leadOf(R.annot) * 1.3 : 0);
  const xAxisH = leadOf(R.axis) * 1.6;
  const plotBottom = sourceTop - leadOf(R.body) * 1.4 - xAxisH;

  const variant = shape.variant;
  const geometry = new Map(shape.geometry);
  const [lo, hi] = shape.domain;
  const yTicks =
    variant === "line" || variant === "area-and-stacked-area"
      ? niceTicks(lo, hi, 5)
      : [];
  const yLabel = (v: number) =>
    Number.isInteger(v) ? format(v).replace(/[.,]0+$/, "") : format(v);
  const leftGutter =
    variant === "bump-ranking-over-time"
      ? Math.max(
          ...Array.from({ length: shape.slots }, (_, i) =>
            widthOf(String(i + 1), R.axis),
          ),
        ) + 10
      : yTicks.length
        ? Math.max(...yTicks.map((t) => widthOf(yLabel(t), R.axis))) + 10
        : 0;

  // End labels: every series that has a reading at the end (a bump: those still in its slots), in its own ink.
  const lastOf = (s: string) =>
    [...(geometry.get(s) ?? [])].reverse().find((p) => !p.gap);
  const ends = shape.series
    .map((s) => {
      const p = lastOf(s);
      if (!p) return null;
      if (
        variant === "bump-ranking-over-time" &&
        p.t !== shape.t1 &&
        s !== plate.accent &&
        !plate.rings.includes(s)
      )
        return null;
      const text =
        variant === "bump-ranking-over-time"
          ? s
          : `${s} ${shape.lastValue[s] ?? ""}`.trim();
      return { s, p, text };
    })
    .filter(Boolean) as { s: string; p: Pt; text: string }[];
  const rightGutter = Math.min(
    inner * 0.34,
    Math.max(0, ...ends.map((e) => widthOf(e.text, R.annot))) + 12,
  );

  const plot = {
    left: PAD + leftGutter,
    right: W - PAD - rightGutter,
    top: plotTop,
    bottom: plotBottom,
  };
  const X = (t: number) =>
    plot.left +
    ((t - shape.t0) / (shape.t1 - shape.t0 || 1)) * (plot.right - plot.left);
  const Y = (v: number) =>
    plot.bottom - ((v - lo) / (hi - lo || 1)) * (plot.bottom - plot.top);
  const mid = (p: { y0: number; y1: number }) =>
    variant === "line" || variant === "bump-ranking-over-time"
      ? Y(p.y1)
      : Y((p.y0 + p.y1) / 2);
  const tip = (p: { y0: number; y1: number }) =>
    variant === "line" ||
    variant === "bump-ranking-over-time" ||
    shape.series.length === 1
      ? Y(p.y1)
      : mid(p);

  // ── the series
  const isBack = (s: string) => plate.back.includes(s);
  const colourOf = (s: string, i: number) =>
    s === plate.accent
      ? accent
      : isBack(s)
        ? backInk
        : variant === "line" || variant === "bump-ranking-over-time"
          ? neutral
          : i % 2
            ? neutralLight
            : neutral;
  const segments = (pts: Pt[]) => {
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
  const linePath = (run: Pt[]) =>
    run
      .map(
        (p, i) => `${i ? "L" : "M"}${X(p.t).toFixed(2)},${Y(p.y1).toFixed(2)}`,
      )
      .join("");
  const bandPath = (run: Pt[]) =>
    `${run.map((p, i) => `${i ? "L" : "M"}${X(p.t).toFixed(2)},${Y(p.y1).toFixed(2)}`).join("")}${[
      ...run,
    ]
      .reverse()
      .map((p) => `L${X(p.t).toFixed(2)},${Y(p.y0).toFixed(2)}`)
      .join("")}Z`;
  const brackets = plate.brackets;
  const bracketed = (s: string) => brackets.some((b) => b.layers.includes(s));
  const order = [...shape.series].sort(
    (a, b) =>
      Number(a === plate.accent) - Number(b === plate.accent) ||
      Number(plate.rings.includes(a)) - Number(plate.rings.includes(b)),
  );
  const marks: any[] = [];
  const clipDefs: any[] = [];
  brackets.forEach((b) => {
    clipDefs.push(
      <clipPath key={`clip${b.k}`} id={`bracket-${b.k}`}>
        <rect
          x={X(b.from)}
          y={plot.top - 2}
          width={Math.max(0.5, X(b.to) - X(b.from))}
          height={plot.bottom - plot.top + 4}
        />
      </clipPath>,
    );
  });
  order.forEach((s) => {
    const i = shape.series.indexOf(s);
    const pts = geometry.get(s) ?? [];
    const runs = segments(pts);
    const fill = colourOf(s, i);
    const ring = plate.rings.includes(s);
    if (variant === "line" || variant === "bump-ranking-over-time") {
      const strokeW =
        s === plate.accent
          ? (direction.stroke?.series ?? 2.5) * 1.2
          : ring
            ? 2
            : 1.4;
      for (const [j, run] of runs.entries())
        marks.push(
          <path
            key={`l${s}${j}`}
            d={linePath(run)}
            fill="none"
            stroke={ring ? ringInk : fill}
            strokeWidth={strokeW}
            strokeLinejoin="round"
            strokeLinecap="round"
          />,
        );
      if (variant === "bump-ranking-over-time")
        for (const [j, run] of runs.entries()) {
          const end = run.at(-1)!;
          if (end.t !== shape.t1)
            marks.push(
              <circle
                key={`x${s}${j}`}
                cx={X(end.t)}
                cy={Y(end.y1)}
                r={2.4}
                fill={ring ? ringInk : fill}
              />,
            );
        }
    } else {
      // A bracketed layer: the run the bracket spans in full, the rest of the layer in a lighter tint of its ink.
      const tinted = bracketed(s) && s === plate.accent;
      for (const [j, run] of runs.entries()) {
        marks.push(
          <path
            key={`a${s}${j}`}
            d={bandPath(run)}
            fill={tinted ? accentTint : fill}
            stroke={ground}
            strokeWidth={0.8}
          />,
        );
        if (tinted)
          for (const b of brackets)
            marks.push(
              <path
                key={`ab${s}${j}${b.k}`}
                d={bandPath(run)}
                fill={fill}
                clipPath={`url(#bracket-${b.k})`}
                stroke={ground}
                strokeWidth={0.8}
              />,
            );
        if (ring)
          marks.push(
            <path
              key={`ar${s}${j}`}
              d={bandPath(run)}
              fill="none"
              stroke={ringInk}
              strokeWidth={1.6}
            />,
          );
      }
    }
  });

  // ── the gaps: bridged and written once
  const gapMarks: any[] = [];
  let gapWords: { x: number; y: number } | null = null;
  for (const g of shape.gaps) {
    if (g.series === null) {
      gapMarks.push(
        <rect
          key={`gap${g.from}`}
          x={X(g.from)}
          y={plot.top}
          width={Math.max(1, X(g.to) - X(g.from))}
          height={plot.bottom - plot.top}
          fill={mix(ground, ink, 0.06)}
          stroke={mutedInk}
          strokeWidth={0.6}
          strokeDasharray="2 3"
        />,
      );
      gapWords ??= {
        x: (X(g.from) + X(g.to)) / 2,
        y: plot.top + leadOf(R.axis),
      };
    } else if (g.bridged) {
      const pts = geometry.get(g.series) ?? [];
      const a = pts.find((p) => p.t === g.from)!;
      const b = pts.find((p) => p.t === g.to)!;
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
        />,
      );
      gapWords ??= {
        x: (X(a.t) + X(b.t)) / 2,
        y: Math.min(Y(a.y1), Y(b.y1)) - leadOf(R.axis) * 0.8,
      };
    }
  }

  // ── the furniture: ticks, gridlines, the unit
  const furniture: any[] = [];
  for (const t of yTicks)
    furniture.push(
      <line
        key={`g${t}`}
        x1={plot.left}
        x2={plot.right}
        y1={Y(t)}
        y2={Y(t)}
        stroke={t === 0 ? mix(ground, ink, 0.5) : grid}
        strokeWidth={t === 0 ? 1 : (direction.stroke?.hairline ?? 0.6)}
      />,
    );
  yTicks.forEach((t) =>
    texts.push({
      text: yLabel(t),
      x: plot.left - 8,
      y: Y(t) + R.axis.fontSize * 0.35,
      r: R.axis,
      fill: mutedInk,
      anchor: "end",
    }),
  );
  if (variant === "bump-ranking-over-time")
    for (let r = 1; r <= shape.slots; r++)
      texts.push({
        text: String(r),
        x: plot.left - 8,
        y: Y(r) + R.axis.fontSize * 0.35,
        r: R.axis,
        fill: mutedInk,
        anchor: "end",
      });
  if (unit && variant !== "bump-ranking-over-time")
    texts.push({
      text: set(unit, R.axis),
      x: variant === "streamgraph" ? plot.left : PAD,
      y: plot.top - leadOf(R.axis) * 0.7,
      r: R.axis,
      fill: mutedInk,
    });
  const span = shape.t1 - shape.t0;
  let xTicks = niceTicks(
    shape.t0,
    shape.t1,
    Math.max(3, Math.min(8, Math.floor((plot.right - plot.left) / 90))),
  ).filter((t) => Number.isInteger(t) || span < 6);
  if (!xTicks.length) xTicks = [shape.t0, shape.t1];
  xTicks.forEach((t) => {
    furniture.push(
      <line
        key={`x${t}`}
        x1={X(t)}
        x2={X(t)}
        y1={plot.bottom}
        y2={plot.bottom + 4}
        stroke={mutedInk}
        strokeWidth={0.8}
      />,
    );
    texts.push({
      text: String(t),
      x: X(t),
      y: plot.bottom + leadOf(R.axis) * 1.2,
      r: R.axis,
      fill: mutedInk,
      anchor: "middle",
    });
  });
  furniture.push(
    <line
      key="base"
      x1={plot.left}
      x2={plot.right}
      y1={plot.bottom}
      y2={plot.bottom}
      stroke={mix(ground, ink, 0.5)}
      strokeWidth={1}
    />,
  );

  // ── the gestures' marks and words
  const overlay: any[] = [];
  type Note = {
    text: string;
    x: number;
    y: number;
    r: any;
    fill: string;
    anchor: "start" | "end";
    ax: number;
    ay: number;
    leader: boolean;
    /** placed where it must stand (a bracket's figure above its brace): never nudged */
    fixed?: boolean;
  };
  const notes: Note[] = [];
  const noteAt = (
    text: string,
    ax: number,
    ay: number,
    fill = labelInk,
    r = R.annot,
  ) => {
    const w = widthOf(text, r);
    const right = ax + 10 + w <= plot.right;
    notes.push({
      text,
      x: right ? ax + 10 : ax - 10,
      y: ay - 8,
      r,
      fill,
      anchor: right ? "start" : "end",
      ax,
      ay,
      leader: false,
    });
  };
  for (const ref of plate.references) {
    const yy = Y(ref.value);
    overlay.push(
      <line
        key={`ref${ref.k}`}
        x1={plot.left}
        x2={plot.right}
        y1={yy}
        y2={yy}
        stroke={labelInk}
        strokeWidth={direction.stroke?.rule ?? 1}
        strokeDasharray="5 4"
      />,
    );
    if (ref.text)
      notes.push({
        text: ref.text,
        x: plot.left + 6,
        y: yy - 6,
        r: R.annot,
        fill: labelInk,
        anchor: "start",
        ax: plot.left,
        ay: yy,
        leader: false,
      });
  }
  for (const l of plate.levels) {
    const yb = tip(l.b);
    const ya = tip(l.a);
    overlay.push(
      <line
        key={`lv${l.k}`}
        x1={X(l.b.t)}
        x2={X(l.a.t)}
        y1={yb}
        y2={yb}
        stroke={labelInk}
        strokeWidth={1}
        strokeDasharray="3 3"
      />,
    );
    overlay.push(
      <circle
        key={`lvb${l.k}`}
        cx={X(l.b.t)}
        cy={yb}
        r={4}
        fill={ground}
        stroke={labelInk}
        strokeWidth={1.4}
      />,
    );
    overlay.push(
      <line
        key={`lvt${l.k}`}
        x1={X(l.a.t)}
        x2={X(l.a.t)}
        y1={yb}
        y2={ya}
        stroke={accent}
        strokeWidth={2}
      />,
    );
    overlay.push(
      <circle key={`lva${l.k}`} cx={X(l.a.t)} cy={ya} r={4} fill={accent} />,
    );
    if (l.text) noteAt(l.text, X(l.a.t), Math.min(ya, yb));
  }
  for (const c of plate.copies) {
    const thick = Math.abs(Y(c.b.y1) - Y(c.b.y0));
    const x = X(c.a.t) + 5;
    overlay.push(
      <rect
        key={`cp${c.k}`}
        x={x}
        y={Y(c.a.y0) - thick}
        width={6}
        height={Math.max(1, thick)}
        fill={labelInk}
      />,
    );
    overlay.push(
      <rect
        key={`cpb${c.k}`}
        x={X(c.b.t) - 3}
        y={Y(c.b.y1)}
        width={6}
        height={Math.max(1, thick)}
        fill="none"
        stroke={labelInk}
        strokeWidth={1}
      />,
    );
    if (c.text) noteAt(c.text, x + 6, Y(c.a.y0) - thick);
  }
  for (const c of plate.crossings) {
    c.crossings.forEach((p, j) =>
      overlay.push(
        <circle
          key={`cr${c.k}${j}`}
          cx={X(p.t)}
          cy={
            variant === "line" || variant === "bump-ranking-over-time"
              ? Y(p.level)
              : Y(p.y)
          }
          r={6}
          fill="none"
          stroke={ringInk}
          strokeWidth={1.6}
        />,
      ),
    );
    const p = c.crossings[0];
    if (c.text && p)
      noteAt(
        c.text,
        X(p.t),
        variant === "line" || variant === "bump-ranking-over-time"
          ? Y(p.level)
          : Y(p.y),
      );
  }
  for (const p of plate.points) {
    const ax = X(p.at.t);
    const ay = tip(p.at);
    if (p.ring)
      overlay.push(
        <circle
          key={`rg${p.k}`}
          cx={ax}
          cy={ay}
          r={6}
          fill="none"
          stroke={ringInk}
          strokeWidth={1.6}
        />,
      );
    else
      overlay.push(
        <circle
          key={`pt${p.k}`}
          cx={ax}
          cy={ay}
          r={3}
          fill={p.at.series === plate.accent ? accent : labelInk}
        />,
      );
    noteAt(p.text, ax, ay, p.at.series === plate.accent ? accentInk : labelInk);
  }
  for (const b of brackets) {
    const by = plot.top - leadOf(R.annot) * 0.25;
    overlay.push(
      <path
        key={`br${b.k}`}
        d={`M${X(b.from)},${by + 7}V${by}H${X(b.to)}V${by + 7}`}
        fill="none"
        stroke={labelInk}
        strokeWidth={1.2}
      />,
    );
    const figure =
      b.text ??
      (b.ofWhole
        ? `${format(b.sum)} · ${b.share.toFixed(1)} %`
        : format(b.sum));
    notes.push({
      text: figure,
      x: (X(b.from) + X(b.to)) / 2,
      y: by - 5,
      r: R.annot,
      fill: labelInk,
      anchor: "start",
      ax: (X(b.from) + X(b.to)) / 2,
      ay: by,
      leader: false,
      fixed: true,
    });
    const n = notes.at(-1)!;
    const w = widthOf(figure, R.annot);
    n.x = Math.max(plot.left, Math.min(plot.right - w, n.x - w / 2));
  }
  if (gapWords)
    notes.push({
      text: shape.gapLabel,
      x: gapWords.x,
      y: gapWords.y,
      r: R.axis,
      fill: mutedInk,
      anchor: "start",
      ax: gapWords.x,
      ay: gapWords.y,
      leader: false,
    });

  // ── end labels at the right, then every note nudged clear of the others (one pass down, one up)
  const endLabels = ends
    .map((e) => ({
      ...e,
      y: tip(e.p) + R.annot.fontSize * 0.35,
      x: X(e.p.t) + 8,
    }))
    .sort((a, b) => a.y - b.y);
  const pitch = leadOf(R.annot) * 0.95;
  for (let i = 1; i < endLabels.length; i++)
    if (endLabels[i].y - endLabels[i - 1].y < pitch)
      endLabels[i].y = endLabels[i - 1].y + pitch;
  const maxY = plot.bottom + R.annot.fontSize * 0.35;
  if (endLabels.length && endLabels.at(-1)!.y > maxY) {
    endLabels[endLabels.length - 1].y = maxY;
    for (let i = endLabels.length - 2; i >= 0; i--)
      if (endLabels[i + 1].y - endLabels[i].y < pitch)
        endLabels[i].y = endLabels[i + 1].y - pitch;
  }
  const boxes: Box[] = endLabels.map((e) => ({
    left: e.x,
    right: e.x + widthOf(e.text, R.annot),
    top: e.y - R.annot.fontSize,
    bottom: e.y + R.annot.fontSize * 0.3,
  }));
  const boxOf = (n: Note): Box => {
    const w = widthOf(n.text, n.r);
    const left = n.anchor === "end" ? n.x - w : n.x;
    return {
      left,
      right: left + w,
      top: n.y - n.r.fontSize,
      bottom: n.y + n.r.fontSize * 0.3,
    };
  };
  const hit = (a: Box, b: Box) =>
    Math.min(a.right, b.right) - Math.max(a.left, b.left) > 0 &&
    Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 0;
  for (const n of notes.filter((x) => x.fixed)) boxes.push(boxOf(n));
  for (const n of notes.filter((x) => !x.fixed)) {
    const tries = [0, -1, 1, -2, 2, -3, 3, -4, 4, -5, 5, 6, -6, 7, -7, 8];
    const step = leadOf(n.r) * 0.9;
    const y0 = n.y;
    for (const k of tries) {
      n.y = Math.max(
        plot.top + n.r.fontSize,
        Math.min(plot.bottom - 2, y0 + k * step),
      );
      if (!boxes.some((b) => hit(b, boxOf(n)))) break;
    }
    n.leader = Math.abs(n.y - y0) > step * 1.5;
    boxes.push(boxOf(n));
  }

  const textEl = (
    t: {
      text: string;
      x: number;
      y: number;
      r: any;
      fill: string;
      anchor?: string;
    },
    key: string,
    weight?: number,
    halo = false,
  ) => (
    <text
      key={key}
      stroke={halo ? ground : undefined}
      strokeWidth={halo ? 4 : undefined}
      strokeLinejoin={halo ? "round" : undefined}
      paintOrder={halo ? "stroke" : undefined}
      x={t.x.toFixed(2)}
      y={t.y.toFixed(2)}
      fontFamily={t.r.fontFamily}
      fontSize={t.r.fontSize}
      fontWeight={weight ?? t.r.fontWeight}
      fontStyle={t.r.fontStyle}
      letterSpacing={t.r.letterSpacing}
      textAnchor={t.anchor ?? "start"}
      fill={t.fill}
    >
      {t.text}
    </text>
  );

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={W}
      height={H}
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label={alt}
    >
      <title>{alt}</title>
      <rect x={0} y={0} width={W} height={H} fill={ground} />
      <defs>{clipDefs}</defs>
      {furniture}
      {gapMarks}
      {marks}
      {overlay}
      {notes
        .filter((n) => n.leader)
        .map((n, i) => (
          <line
            key={`ld${i}`}
            x1={n.ax}
            y1={n.ay}
            x2={n.anchor === "start" ? n.x - 2 : n.x + 2}
            y2={n.y - n.r.fontSize * 0.35}
            stroke={mutedInk}
            strokeWidth={0.7}
          />
        ))}
      {texts.map((t, i) => textEl(t, `t${i}`))}
      {endLabels.map((e, i) =>
        textEl(
          {
            text: set(e.text, R.annot),
            x: e.x,
            y: e.y,
            r: R.annot,
            fill:
              e.s === plate.accent
                ? accentInk
                : isBack(e.s)
                  ? mutedInk
                  : labelInk,
          },
          `e${i}`,
          e.s === plate.accent ? 700 : undefined,
          true,
        ),
      )}
      {notes.map((n, i) =>
        textEl({ ...n, text: set(n.text, n.r) }, `n${i}`, undefined, true),
      )}
    </svg>
  );
}
