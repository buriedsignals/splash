/**
 * THE XY GESTURE KIT'S PLATE: a scatter (optionally bubbles) or a connected scatter, drawn by the beat's composed
 * gestures (`gesture-xy-static.mjs`) on the XY adapter's geometry (`gesture-family-xy.mjs`). Forked from the per-type
 * plates (`static/scatter-and-bubble/DirectedScatter.tsx`, `static/connected-scatter/DirectedConnectedScatter.tsx`):
 * registers through the design base, furniture derived from the ground, the axis name and its qualifier one size
 * apart by weight, labels placed through the arbiter so none sits on a mark — with their fixed staging (the break,
 * the subject's arc) replaced by what the gestures draw.
 *
 * WHAT IT DRAWS. Every point at its data position on two fitted axes (never pulled to zero). One accent: the subject's
 * mark (its whole path in a connected scatter); when no mark is the subject, the argument's rule takes it, as the
 * per-type scatter spends its accent on the break. Other highlighted or named marks are RINGED, never recoloured.
 * A filter steps the others back. A reference is a dashed rule on its axis with its note. A compare lays the two
 * legs between its points (the gap on x, the gap on y). A trace marks its path's steps with their keys.
 *
 * BUBBLES. A size on every mark is drawn as AREA (radius ∝ √size). The per-type kit refused bubbles because a floor
 * under the radius pinned most marks at one size while the caption claimed area; here a mark whose true radius falls
 * under the floor is drawn HOLLOW at the floor, and the key says so ("hollow: under N"), so no mark claims an area it
 * does not have.
 */

import {
  deriveFurniture,
  measureText,
  measureTextBand,
  adjustToContrast,
  TEXT_CONTRAST_MIN,
} from "#shared/chart-beat/render-still.mjs";
import { applyCase } from "#shared/chart-beat/registers.mjs";
import {
  EYEBROW_TO_DISPLAY,
  gapOf,
  leadOf,
  registerOf,
} from "#shared/design-base/register.mjs";
import { placeLabels } from "#shared/chart-beat/arbiter.mjs";
import { ticksOf } from "./gesture-family-xy.mjs";

const FRAME = { width: 960, height: 540 };
const R = 3.4;
const R_MAX = 22;
const R_FLOOR = 1.8;
const OPACITY = 0.55;

type Mark = {
  name: string;
  value: number;
  x: number;
  size?: number;
  key?: string;
  series?: string;
};

export function GestureXYStatic({
  frame,
  variant,
  xy,
  plate,
  format,
  xFormat,
  xTick,
  xName,
  xQualifier = "",
  yName,
  yQualifier = "",
  sizeName,
  sizeFormat,
  title,
  limits,
  source,
  alt,
  eyebrow,
  scope,
  direction,
  onDropped,
}: {
  frame?: { width: number; height: number };
  variant: "scatter-and-bubble" | "connected-scatter";
  xy: any;
  plate: any;
  format: (v: number) => string;
  xFormat: (v: number) => string;
  xTick?: (v: number) => string;
  xName: string;
  xQualifier?: string;
  yName: string;
  yQualifier?: string;
  sizeName?: string;
  sizeFormat?: (v: number) => string;
  title: string[];
  limits: string[];
  source: string;
  alt: string;
  eyebrow: string;
  scope?: string | null;
  direction: any;
  onDropped?: (ids: string[]) => void;
}) {
  const { width, height } = frame ?? FRAME;
  const { ink, muted, grid } = deriveFurniture(direction.ground);
  const PAD = direction.pad;
  const reg = (name: string) => registerOf(direction, name);
  const display = reg("display");
  const eyebrowReg = reg("eyebrow");
  const body = reg("body");
  const axis = reg("axis");
  const annot = reg("annot");
  const set = (text: string, r: { transform: string }) =>
    applyCase(text, r.transform);
  const sizeOf = (r: any) => ({
    fontSize: r.fontSize,
    fontWeight: r.fontWeight,
    fontFamily: r.fontFamily,
  });
  const widthOf = (text: string, r: any) =>
    measureText(text, sizeOf(r)) +
    Number(r.letterSpacing ?? 0) * Math.max(0, text.length - 1);
  const bandOf = (r: any) => measureTextBand("Hxpg1,", sizeOf(r));
  const wrap = (text: string, maxWidth: number, r: any): string[] => {
    const lines: string[] = [];
    let current = "";
    for (const word of text.split(/\s+/)) {
      const trial = current ? `${current} ${word}` : word;
      if (current && widthOf(trial, r) > maxWidth) {
        lines.push(current);
        current = word;
      } else current = trial;
    }
    if (current) lines.push(current);
    return lines;
  };
  const line = (r: any) => ({
    fontFamily: r.fontFamily,
    fontSize: r.fontSize,
    fontWeight: r.fontWeight,
    fontStyle: r.fontStyle,
    letterSpacing: r.letterSpacing,
    fill: r.fill,
  });
  const accentInk =
    adjustToContrast(direction.accent, direction.ground, TEXT_CONTRAST_MIN) ??
    ink;
  const labelInk =
    adjustToContrast(ink, direction.ground, TEXT_CONTRAST_MIN) ?? ink;
  const pic = plate.picture;
  const marks: Mark[] = xy.marks;
  const byName = new Map(marks.map((m) => [m.name, m]));
  const tick = xTick ?? xFormat;

  // ── header, source, the free notes row (notes of gestures that act on no single mark) ─────────────
  const SIZE =
    width > height ? "landscape" : width === height ? "square" : "portrait";
  const column = width - PAD * 2;
  const titleLead = leadOf(display);
  const bodyLead = leadOf(body);
  const annotLead = leadOf(annot);
  const sourceLines = wrap(set(source, body), column, body);
  const eyebrowBaseline = PAD + eyebrowReg.fontSize;
  const titleTop =
    eyebrowBaseline + gapOf(eyebrowReg, EYEBROW_TO_DISPLAY) + display.fontSize;
  const sourceTop = height - PAD - (sourceLines.length - 1) * bodyLead;
  const freeNotes = pic.notes
    .filter(
      (n: any) => n.mark === null && !pic.rules.some((r: any) => r.k === n.k),
    )
    .map((n: any) => n.text);
  const freeLines = freeNotes.length
    ? wrap(set(freeNotes.join(" · "), annot), column, annot)
    : [];
  const scopeLine = scope ? set(scope, axis) : null;

  const ticks = ticksOf(xy);
  const yTickText = ticks.y.map((t: number) => set(format(t), axis));
  const plotLeft =
    PAD + Math.max(...yTickText.map((t: string) => widthOf(t, axis))) + 12;
  const plotRight = width - PAD;
  const layoutFor = (ti: number, li: number) => {
    const titleLines = wrap(set(title[ti], display), column, display);
    const limitLines = li < 0 ? [] : wrap(set(limits[li], body), column, body);
    const titleBottom = titleTop + titleLines.length * titleLead;
    const limitsTop = titleBottom + gapOf(body, 0.4138);
    const afterLimits = limitLines.length
      ? limitsTop + limitLines.length * bodyLead
      : titleBottom;
    const freeTop = afterLimits + bandOf(annot).ascent * 0.5;
    const top =
      (freeLines.length
        ? freeTop + (freeLines.length - 1) * annotLead + bandOf(annot).descent
        : afterLimits) +
      gapOf(annot, 1.7143) +
      axis.fontSize * 1.4;
    const bottom =
      sourceTop -
      gapOf(body, 1.1034) -
      axis.fontSize * 3.4 -
      (scopeLine ? axis.fontSize * 1.4 : 0);
    return { titleLines, limitLines, limitsTop, freeTop, top, bottom };
  };
  const rungs: Array<[number, number]> = [];
  for (let t = 0; t < title.length; t++)
    for (let l = 0; l < limits.length; l++) rungs.push([t, l]);
  for (let t = 0; t < title.length; t++) rungs.push([t, -1]);
  const owed = SIZE === "landscape" ? 0 : height / 3;
  const tried = rungs.map(([t, l]) => layoutFor(t, l));
  const layout =
    tried.find((l) => l.bottom - l.top >= owed) ??
    tried.reduce((a, b) => (b.bottom - b.top > a.bottom - a.top ? b : a));
  const plot = {
    left: plotLeft,
    right: plotRight,
    top: layout.top,
    bottom: layout.bottom,
  };
  const W = plot.right - plot.left;
  const H = plot.bottom - plot.top;
  const X = (x: number) => plot.left + xy.u(x, pic.dom) * W;
  const Y = (y: number) => plot.bottom - xy.v(y, pic.dom) * H;
  const P = (name: string) => {
    const m = byName.get(name)!;
    return { x: X(m.x), y: Y(m.value) };
  };

  // ── sizes: area-true, hollow under the floor ───────────────────────────────────────────────
  const sized =
    variant === "scatter-and-bubble" &&
    marks.length > 0 &&
    marks.every((m) => m.size !== undefined);
  const maxSize = sized ? Math.max(...marks.map((m) => m.size!)) : 1;
  const rMax = Math.min(R_MAX, Math.min(W, H) * 0.06);
  const trueR = (m: Mark) => (sized ? rMax * Math.sqrt(m.size! / maxSize) : R);
  const radius = (m: Mark) => Math.max(trueR(m), sized ? R_FLOOR : R);
  const floored = (m: Mark) => sized && trueR(m) < R_FLOOR;
  const floorSize = maxSize * (R_FLOOR / rMax) ** 2;

  const alphaOf = (n: string) => 1 - 0.78 * (pic.back.get(n) ?? 0);
  const isAccent = (n: string) => (pic.accent.get(n) ?? 0) > 0.5;
  const isRing = (n: string) => (pic.ring.get(n) ?? 0) > 0.5;
  const ruleAccent = plate.ruleAccent;

  // ── paths (connected scatter) ──────────────────────────────────────────────────────────────
  const paths: Array<{ series: string; names: string[] }> =
    variant === "connected-scatter"
      ? [...xy.paths.entries()].map(([series, names]: [string, string[]]) => ({
          series,
          names,
        }))
      : [];
  const pathD = (names: string[]) => {
    const pts = names.map(P);
    if (pts.length === 2) {
      const [a, b] = pts;
      const mx = (a.x + b.x) / 2;
      const my = (a.y + b.y) / 2;
      const len = Math.hypot(b.x - a.x, b.y - a.y);
      const bow = Math.min(18, len * 0.12);
      // The bow bends toward the plot's centre, so an arc along an edge never leaves the plot.
      const side =
        (-(b.y - a.y) * ((plot.left + plot.right) / 2 - mx) + (b.x - a.x) * ((plot.top + plot.bottom) / 2 - my)) >= 0 ? 1 : -1;
      const nx = (side * -(b.y - a.y)) / (len || 1);
      const ny = (side * (b.x - a.x)) / (len || 1);
      return `M${a.x},${a.y} Q${mx + nx * bow},${my + ny * bow} ${b.x},${b.y}`;
    }
    return pts.map((p, i) => `${i ? "L" : "M"}${p.x},${p.y}`).join(" ");
  };

  // ── labels, through the arbiter ───────────────────────────────────────────────────────────
  const named = new Set<string>();
  const requests: any[] = [];
  const headOf = (n: string) => xy.pathOf(n).at(-1);
  for (const n of pic.notes) {
    if (!n.mark) continue;
    const m = byName.get(n.mark)!;
    const label = m.series ?? m.name;
    const text = n.text ?? `${label} · ${xFormat(m.x)} · ${format(m.value)}`;
    const at = P(n.mark);
    requests.push({
      id: `note-${n.k}`,
      treatment: "value-on-the-mark",
      text: set(text, annot),
      at,
      priority: 9,
      register: annot,
      accent: isAccent(n.mark),
    });
    named.add(headOf(n.mark));
  }
  const tagged = [
    ...new Set(
      [...pic.accent.keys(), ...pic.ring.keys()]
        .filter((n) => isAccent(n) || isRing(n))
        .map(headOf),
    ),
  ];
  for (const n of tagged) {
    if (named.has(n)) continue;
    const m = byName.get(n)!;
    requests.push({
      id: `name-${n}`,
      treatment: "value-on-the-mark",
      text: set(m.series ?? m.name, annot),
      at: P(n),
      priority: 7,
      register: annot,
      accent: isAccent(n),
    });
  }
  const ruleBoxes: any[] = [];
  for (const r of pic.rules) {
    const note = pic.notes.find(
      (n: any) => n.k === r.k && n.mark === null,
    )?.text;
    if (r.axis === "x") {
      const x = X(r.value);
      ruleBoxes.push({ x: x - 1, y: plot.top, width: 2, height: H });
      if (note)
        requests.push({
          id: `rule-${r.k}`,
          treatment: "the-target-is-named-on-the-line-that-draws-it",
          text: set(note, annot),
          at: {
            // Right of its rule where the plot has room, else left of it, ending on it.
            x:
              x + 6 + widthOf(set(note, annot), annot) <= plot.right
                ? x + 6 + widthOf(set(note, annot), annot) / 2
                : x - 6 - widthOf(set(note, annot), annot) / 2,
            y: plot.top + annot.fontSize,
          },
          anchors: ["above", "below"],
          priority: 10,
          register: annot,
          accent: ruleAccent,
        });
    } else {
      const y = Y(r.value);
      ruleBoxes.push({ x: plot.left, y: y - 1, width: W, height: 2 });
      if (note)
        requests.push({
          id: `rule-${r.k}`,
          treatment: "the-target-is-named-on-the-line-that-draws-it",
          text: set(note, annot),
          at: {
            x: plot.right - widthOf(set(note, annot), annot) / 2 - 4,
            y: y - 4,
          },
          anchors: ["above", "below"],
          priority: 10,
          register: annot,
          accent: ruleAccent,
        });
    }
  }
  for (const t of pic.traced) {
    const names = xy.paths.get(t.series) ?? [];
    for (const n of [names[0], names.at(-1)]) {
      const m = byName.get(n)!;
      requests.push({
        id: `key-${t.k}-${n}`,
        treatment: "value-on-the-mark",
        text: set(String(m.key), axis),
        at: P(n),
        priority: 5,
        register: axis,
        accent: false,
      });
    }
  }
  const avoid = [
    ...ruleBoxes,
    ...marks.map((m) => {
      const p = P(m.name);
      const r = radius(m);
      return { x: p.x - r, y: p.y - r, width: r * 2, height: r * 2 };
    }),
  ];
  const { placed, dropped } = placeLabels(
    requests.map(({ id, treatment, text, at, anchors, priority }) => ({
      id,
      treatment,
      text,
      at,
      anchors,
      priority,
    })),
    {
      frame: {
        left: PAD,
        top: plot.top - axis.fontSize * 1.2,
        right: width - PAD,
        bottom: plot.bottom,
      },
      measure: (text: string) => {
        const req = requests.find((r) => r.text === text)!;
        const b = bandOf(req.register);
        return {
          width: widthOf(text, req.register),
          height: b.ascent + b.descent,
        };
      },
      avoid,
    },
  );
  onDropped?.(dropped.map((d: any) => d.id));
  if (dropped.length) console.log(`  arbiter dropped ${dropped.length}: ${dropped.map((d: any) => `${d.id} (${d.why})`).join("; ")}`);
  const labelOf = new Map(requests.map((r) => [r.id, r]));

  const domX = pic.dom.x;
  const tickX = ticks.x.filter(
    (v: number) => xy.tx(v) >= domX[0] && xy.tx(v) <= domX[1],
  );
  const tickY = ticks.y.filter(
    (v: number) => v >= pic.dom.y[0] && v <= pic.dom.y[1],
  );
  const markFill = (n: string) => (isAccent(n) ? direction.accent : muted);
  const ruleInk = ruleAccent ? accentInk : labelInk;
  const keys =
    variant === "connected-scatter"
      ? [...new Set(marks.map((m) => m.key))]
      : [];

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={alt}
    >
      <rect x={0} y={0} width={width} height={height} fill={direction.ground} />
      <text x={PAD} y={eyebrowBaseline} {...line(eyebrowReg)}>
        {set(eyebrow, eyebrowReg)}
      </text>
      {layout.titleLines.map((l, i) => (
        <text
          key={`t${i}`}
          x={PAD}
          y={titleTop + i * titleLead}
          {...line(display)}
        >
          {l}
        </text>
      ))}
      {layout.limitLines.map((l, i) => (
        <text
          key={`l${i}`}
          x={PAD}
          y={layout.limitsTop + i * bodyLead}
          {...line(body)}
        >
          {l}
        </text>
      ))}
      {freeLines.map((l, i) => (
        <text
          key={`f${i}`}
          x={PAD}
          y={layout.freeTop + i * annotLead}
          {...line(annot)}
          fill={labelInk}
        >
          {l}
        </text>
      ))}
      {sourceLines.map((l, i) => (
        <text
          key={`s${i}`}
          x={PAD}
          y={sourceTop + i * bodyLead}
          {...line(body)}
        >
          {l}
        </text>
      ))}

      {tickY.map((t: number) => (
        <g key={`y${t}`}>
          <line
            x1={plot.left}
            x2={plot.right}
            y1={Y(t)}
            y2={Y(t)}
            stroke={grid}
            strokeWidth={direction.stroke.rule}
          />
          <text
            x={plot.left - 8}
            y={Y(t) + axis.fontSize * 0.35}
            textAnchor="end"
            {...line(axis)}
          >
            {set(format(t), axis)}
          </text>
        </g>
      ))}
      {tickX.map((t: number) => (
        <g key={`x${t}`}>
          <line
            x1={X(t)}
            x2={X(t)}
            y1={plot.top}
            y2={plot.bottom}
            stroke={grid}
            strokeWidth={direction.stroke.rule}
          />
          <text
            x={X(t)}
            y={plot.bottom + axis.fontSize * 1.7}
            textAnchor="middle"
            {...line(axis)}
          >
            {set(tick(t), axis)}
          </text>
        </g>
      ))}

      {pic.rules.map((r: any, i: number) =>
        r.axis === "x" ? (
          <line
            key={`r${i}`}
            x1={X(r.value)}
            x2={X(r.value)}
            y1={plot.top}
            y2={plot.bottom}
            stroke={ruleInk}
            strokeWidth={direction.stroke.series * 0.8}
            strokeDasharray="5 4"
          />
        ) : (
          <line
            key={`r${i}`}
            x1={plot.left}
            x2={plot.right}
            y1={Y(r.value)}
            y2={Y(r.value)}
            stroke={ruleInk}
            strokeWidth={direction.stroke.series * 0.8}
            strokeDasharray="5 4"
          />
        ),
      )}

      {/* Non-accent marks first, so the subject is never painted under the cloud. */}
      {paths
        .slice()
        .sort(
          (a, b) =>
            Number(isAccent(a.names.at(-1)!)) -
            Number(isAccent(b.names.at(-1)!)),
        )
        .map((p) => {
          const head = p.names.at(-1)!;
          const accent = isAccent(head);
          const traced = pic.traced.some((t: any) => t.series === p.series);
          const colour = accent ? direction.accent : muted;
          const a = alphaOf(head);
          return (
            <g key={p.series} opacity={a}>
              <path
                d={pathD(p.names)}
                fill="none"
                stroke={colour}
                strokeWidth={
                  accent || traced
                    ? direction.stroke.series
                    : direction.stroke.rule * 1.3
                }
                strokeDasharray={traced || accent ? undefined : "3 3"}
              />
              {p.names.slice(0, -1).map((n) => {
                const q = P(n);
                return (
                  <circle
                    key={n}
                    cx={q.x}
                    cy={q.y}
                    r={R}
                    fill={direction.ground}
                    stroke={colour}
                    strokeWidth={1.2}
                  />
                );
              })}
              <circle cx={P(head).x} cy={P(head).y} r={R + 0.6} fill={colour} />
              {isRing(head) && (
                <circle
                  cx={P(head).x}
                  cy={P(head).y}
                  r={R + 4}
                  fill="none"
                  stroke={labelInk}
                  strokeWidth={1.2}
                />
              )}
            </g>
          );
        })}
      {variant === "scatter-and-bubble" &&
        marks
          .slice()
          .sort(
            (a, b) =>
              Number(isAccent(a.name)) - Number(isAccent(b.name)) ||
              (b.size ?? 0) - (a.size ?? 0),
          )
          .map((m) => {
            const p = P(m.name);
            const accent = isAccent(m.name);
            const hollow = floored(m);
            return (
              <g key={m.name} opacity={alphaOf(m.name)}>
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={radius(m)}
                  fill={hollow ? "none" : markFill(m.name)}
                  fillOpacity={accent ? 0.95 : sized ? 0.35 : OPACITY}
                  stroke={sized || hollow ? markFill(m.name) : "none"}
                  strokeWidth={sized || hollow ? 0.8 : 0}
                />
                {isRing(m.name) && (
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={radius(m) + 3.5}
                    fill="none"
                    stroke={labelInk}
                    strokeWidth={1.2}
                  />
                )}
              </g>
            );
          })}

      {pic.compares.map((c: any) => {
        const a = P(c.a);
        const b = P(c.b);
        return (
          <g key={`c${c.k}`}>
            <line
              x1={a.x}
              x2={b.x}
              y1={a.y}
              y2={a.y}
              stroke={labelInk}
              strokeWidth={direction.stroke.rule * 1.2}
              strokeDasharray="2 3"
            />
            <line
              x1={b.x}
              x2={b.x}
              y1={a.y}
              y2={b.y}
              stroke={labelInk}
              strokeWidth={direction.stroke.rule * 1.2}
              strokeDasharray="2 3"
            />
          </g>
        );
      })}

      {placed.map((p: any) => {
        const req = labelOf.get(p.id)!;
        const r = req.register;
        const b = bandOf(r);
        return (
          <text
            key={p.id}
            x={p.box.x}
            y={p.box.y + b.ascent}
            {...line(r)}
            fill={req.accent ? accentInk : r === axis ? muted : labelInk}
          >
            {p.text}
          </text>
        );
      })}

      <text
        x={plot.left}
        y={plot.bottom + axis.fontSize * 3.1}
        {...line(axis)}
        fontWeight={Math.max(axis.fontWeight, 700)}
        fill={muted}
      >
        {set(xName, axis)}
        {xQualifier ? (
          <tspan fontWeight={400}>{` ${set(xQualifier, axis)}`}</tspan>
        ) : null}
      </text>
      <text
        x={PAD}
        y={plot.top - axis.fontSize * 1.2}
        {...line(axis)}
        fontWeight={Math.max(axis.fontWeight, 700)}
        fill={muted}
      >
        {set(yName, axis)}
        {yQualifier ? (
          <tspan fontWeight={400}>{` ${set(yQualifier, axis)}`}</tspan>
        ) : null}
      </text>
      {scopeLine ? (
        <text
          x={plot.left}
          y={plot.bottom + axis.fontSize * 4.5}
          {...line(axis)}
          fill={muted}
        >
          {scopeLine}
        </text>
      ) : null}

      {/* THE KEY, right-aligned on the x axis name's row: the size a bubble's area encodes, or a path's two ends. */}
      {sized && sizeName
        ? (() => {
            const big = set(
              `${sizeName} ${sizeFormat ? sizeFormat(maxSize) : maxSize}`,
              axis,
            );
            const small = set(
              `< ${sizeFormat ? sizeFormat(floorSize) : Math.round(floorSize)}`,
              axis,
            );
            const y = plot.bottom + axis.fontSize * 3.1;
            const anyFloored = marks.some(floored);
            const smallW = anyFloored
              ? widthOf(small, axis) + R_FLOOR * 2 + 16
              : 0;
            const bigW = widthOf(big, axis);
            const x0 = plot.right - bigW - smallW - rMax * 0.5 - 8;
            return (
              <g>
                <circle
                  cx={x0}
                  cy={y - axis.fontSize * 0.35}
                  r={Math.min(rMax * 0.5, axis.fontSize * 0.7)}
                  fill="none"
                  stroke={muted}
                  strokeWidth={0.8}
                />
                <text
                  x={x0 + axis.fontSize * 0.9}
                  y={y}
                  {...line(axis)}
                  fill={muted}
                >
                  {big}
                </text>
                {anyFloored ? (
                  <>
                    <circle
                      cx={plot.right - widthOf(small, axis) - R_FLOOR - 6}
                      cy={y - axis.fontSize * 0.35}
                      r={R_FLOOR}
                      fill="none"
                      stroke={muted}
                      strokeWidth={0.8}
                    />
                    <text
                      x={plot.right}
                      y={y}
                      textAnchor="end"
                      {...line(axis)}
                      fill={muted}
                    >
                      {small}
                    </text>
                  </>
                ) : null}
              </g>
            );
          })()
        : null}
      {keys.length > 1
        ? (() => {
            const first = set(String(keys[0]), axis);
            const last = set(String(keys.at(-1)), axis);
            const y = plot.bottom + axis.fontSize * 3.1;
            const lastW = widthOf(last, axis);
            const firstW = widthOf(first, axis);
            const xEnd = plot.right - lastW;
            const xDisc = xEnd - R - 6;
            const xRing = xDisc - 26;
            return (
              <g>
                <text
                  x={xRing - R - 6 - firstW}
                  y={y}
                  {...line(axis)}
                  fill={muted}
                >
                  {first}
                </text>
                <circle
                  cx={xRing}
                  cy={y - axis.fontSize * 0.35}
                  r={R}
                  fill={direction.ground}
                  stroke={muted}
                  strokeWidth={1.2}
                />
                <line
                  x1={xRing + R + 2}
                  x2={xDisc - R - 2}
                  y1={y - axis.fontSize * 0.35}
                  y2={y - axis.fontSize * 0.35}
                  stroke={muted}
                  strokeWidth={1}
                  strokeDasharray="3 3"
                />
                <circle
                  cx={xDisc}
                  cy={y - axis.fontSize * 0.35}
                  r={R + 0.6}
                  fill={muted}
                />
                <text x={xEnd} y={y} {...line(axis)} fill={muted}>
                  {last}
                </text>
              </g>
            );
          })()
        : null}
    </svg>
  );
}
